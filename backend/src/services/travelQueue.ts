import { Queue, Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "../lib/prisma.js";
import { gameDataManager } from "./gameDataManager.js";
import { generatePVEEncounter, generateGatheringEncounter } from "./combatEngine.js";
import { dungeonService } from "./dungeonService.js";
import { Prisma } from "@prisma/client";

const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
});

import { getIO } from "../socket.js";

/**
 * ⚔️ REAL-TIME PVP MATCHMAKING
 */
async function rollPvPEncounter(characterId: string, depth: number) {
  if (depth < 200) return null; // Safe Zone check

  // Search Redis for nearby players (+/- 10km)
  const nearbyIds = await connection.zrangebyscore("players_depth", depth - 10, depth + 10);
  
  // Filter out self and pick a random target
  const targets = nearbyIds.filter(id => id !== characterId);
  if (targets.length === 0) return null;

  const targetId = targets[Math.floor(Math.random() * targets.length)];
  
  // Fetch target details from DB
  const targetChar = await prisma.character.findUnique({
    where: { id: targetId as string },
    select: { id: true, name: true, hp: true, maxHp: true, level: true, userId: true }
  });

  if (!targetChar || targetChar.hp <= 0) return null;

  return {
    type: "PVP",
    targetId: targetChar.id,
    targetUserId: targetChar.userId,
    name: targetChar.name,
    level: targetChar.level,
    hp: targetChar.hp,
    maxHp: targetChar.maxHp
  };
}

export const travelQueueName = "TravelQueue";
export const travelQueue = new Queue(travelQueueName, { connection });

export const ENCOUNTER_INTERVAL = 10; // Exported for use in game routes

/**
 * 🎲 DISTANCE-SCALED ENCOUNTER ROLLS
 * Safe Zone (< 200km) vs Danger Zone (>= 200km).
 */
async function rollPulseEncounter(character: any) {
  const depth = character.currentDepth;
  
  // Scaling Math:
  // Valoria (0): 30%
  // 400km: 50%
  // Cap at 50%
  const spawnChance = Math.min(0.5, 0.3 + (depth / 2000));

  const roll = Math.random();
  if (roll > spawnChance) return null;

  // Type Logic
  const typeRoll = Math.random();
  
  // Safe Zone: Mostly Gathering, Very Rarely weak PVE
  if (depth < 200) {
    if (typeRoll < 0.8) return await generateGatheringEncounter(character);
    return await generatePVEEncounter(character);
  }

  // Danger Zone (>= 200km): PvP, Monsters, Dungeons
  // (PVP check happens in game routes or real-time loop, here we roll AI encounters)
  if (typeRoll < 0.15) {
    const dungeon = await dungeonService.generateDungeonEncounter(character as any);
    if (dungeon) return dungeon;
  }
  
  if (typeRoll < 0.7) return await generatePVEEncounter(character);
  return await generateGatheringEncounter(character);
}

export const travelWorker = new Worker(
  travelQueueName,
  async (job: Job) => {
    const { characterId } = job.data;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) return;

    console.log(`Pulse for ${character.name} [${character.actionStatus}] at ${character.currentDepth}km`);

    // 🏥 Town Regen (Math.max(0, depth) ensures city logic at 0)
    if (character.currentDepth === 0 && character.hp < character.maxHp) {
      await prisma.character.update({
        where: { id: characterId },
        data: { hp: character.maxHp }
      });
      character.hp = character.maxHp;
      console.log(`[REGEN] ${character.name} healed to full in Valoria City`);
    }

    // 1. Check for PVP Encounter (If in Danger Zone)
    if (character.currentDepth >= 200 && (character.actionStatus === "TRAVELING_OUT" || character.actionStatus === "TRAVELING_IN")) {
       const pvpEncounter = await rollPvPEncounter(characterId, character.currentDepth);
       if (pvpEncounter) {
          console.log(`⚔️ PvP AMBUSH: ${character.name} vs ${pvpEncounter.name}`);
          
          await prisma.character.update({
             where: { id: characterId },
             data: { actionStatus: "ENCOUNTER", pendingEncounter: pvpEncounter as any, previousStatus: character.actionStatus }
          });

          // Also set target to encounter state
          await prisma.character.update({
             where: { id: pvpEncounter.targetId },
             data: { actionStatus: "ENCOUNTER", pendingEncounter: { type: "PVP", name: character.name, targetId: characterId, targetUserId: character.userId, hp: character.hp, maxHp: character.maxHp }, previousStatus: "IDLE" }
          });

          // Notify Both via Sockets
          const io = getIO();
          io.to(`user:${character.userId}`).emit("pvp_ambush", pvpEncounter);
          io.to(`user:${pvpEncounter.targetUserId}`).emit("pvp_ambush", { type: "PVP", name: character.name, targetId: characterId, targetUserId: character.userId, hp: character.hp, maxHp: character.maxHp });

          return { success: true, encounterFound: true, type: "PVP" };
       }

       // 🌐 Social Immersion: Broadcast nearby count
       const totalNearby = (await connection.zrangebyscore("players_depth", character.currentDepth - 10, character.currentDepth + 10)).length;
       const io = getIO();
       io.to(`user:${character.userId}`).emit("zone_update", { nearbyCount: Math.max(0, totalNearby - 1) });
    }

    // 2. Process Routine AI Encounter Pulse (Only if not already in PvP)
    if (character.actionStatus !== "IDLE" && character.actionStatus !== "ENCOUNTER") {
        const encounter = await rollPulseEncounter(character);

        if (encounter) {
            await prisma.character.update({
                where: { id: characterId },
                data: {
                    previousStatus: character.actionStatus,
                    actionStatus: "ENCOUNTER",
                    pendingEncounter: encounter as any
                }
            });
            console.log(`Encounter triggered for ${character.name}: ${encounter.name} at ${character.currentDepth}km`);
            return { success: true, encounterFound: true };
        }
    }

    // 2. Handle Directional Movement
    let nextDepth = character.currentDepth;
    let nextStatus = character.actionStatus;

    if (character.actionStatus === "TRAVELING_OUT") {
      nextDepth += 5;
    } else if (character.actionStatus === "TRAVELING_IN") {
      nextDepth = Math.max(0, character.currentDepth - 10); // Returning is 2x faster
      if (nextDepth === 0) {
        nextStatus = "IDLE";
        console.log(`${character.name} returned to Valoria City.`);
      }
    }

    // Update Depth
    if (nextDepth !== character.currentDepth || nextStatus !== character.actionStatus) {
      await prisma.character.update({
        where: { id: characterId },
        data: {
          currentDepth: nextDepth,
          actionStatus: nextStatus,
          lastPulseAt: new Date()
        }
      });

      // 📍 UPDATE REAL-TIME LOCATION (For PvP Matching)
      if (nextStatus !== "IDLE" && nextStatus !== "ENCOUNTER") {
        await connection.zadd("players_depth", nextDepth, characterId);
      } else {
        await connection.zrem("players_depth", characterId);
      }
    }

    // 🚀 Queue next pulse ONLY if still active (Traveling or Camping)
    // If in ENCOUNTER or IDLE, recursion stops until manually resumed.
    const isMoving = nextStatus === "TRAVELING_OUT" || nextStatus === "TRAVELING_IN";
    const isCamping = nextStatus === "CAMPING";

    if (isMoving || isCamping) {
       await travelQueue.add(
         "pulse", 
         { characterId }, 
         { 
           delay: ENCOUNTER_INTERVAL * 1000,
           removeOnComplete: true,
           removeOnFail: true
         }
       );
    }

    return { success: true, encounterFound: false };
  },
  { connection }
);

export const addTravelJob = async (characterId: string) => {
  await travelQueue.add(
    "pulse", 
    { characterId }, 
    { 
      delay: ENCOUNTER_INTERVAL * 1000,
      jobId: `pulse-${characterId}`, // 🛡️ Ensure only one
      removeOnComplete: true,
      removeOnFail: true
    }
  );
};

travelWorker.on("completed", (job, res) => {
  // Silent tracking
});

travelWorker.on("failed", (job, err) => {
  console.error(`Pulse failed for ${job?.data?.characterId}: ${err.message}`);
});
