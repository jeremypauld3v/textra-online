import { Queue, Worker, Job } from "bullmq";
import { Redis } from "ioredis";
import { prisma } from "../lib/prisma.js";
import { gameDataManager } from "./gameDataManager.js";
import { generatePVEEncounter, generateGatheringEncounter } from "./combatEngine.js";
import { dungeonService } from "./dungeonService.js";
import { Prisma } from "@prisma/client";
import { GAME_BALANCE } from "../constants/gameBalance.js";
const connection = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
});
import { getIO } from "../socket.js";
import { getCharacterStatusPayload } from "./characterService.js";
/**
 * ⚔️ REAL-TIME PVP MATCHMAKING
 */
async function rollPvPEncounter(characterId, depth) {
    if (depth < GAME_BALANCE.SAFE_ZONE_LIMIT)
        return null; // Attacker must be in danger zone
    // Search Redis for nearby players
    const nearbyIds = await connection.zrangebyscore("players_depth", depth - GAME_BALANCE.PVP_SEARCH_RADIUS, depth + GAME_BALANCE.PVP_SEARCH_RADIUS);
    const targets = nearbyIds.filter(id => id !== characterId);
    if (targets.length === 0)
        return null;
    const targetId = targets[Math.floor(Math.random() * targets.length)];
    const targetChar = await prisma.character.findUnique({
        where: { id: targetId },
        select: { id: true, name: true, hp: true, maxHp: true, level: true, userId: true, actionStatus: true, pendingEncounter: true, currentDepth: true }
    });
    // Target must ALSO be in danger zone (>= 200km), not in encounter, and have no pending encounter
    if (!targetChar ||
        targetChar.hp <= 0 ||
        targetChar.actionStatus === "ENCOUNTER" ||
        targetChar.pendingEncounter !== null ||
        targetChar.currentDepth < GAME_BALANCE.SAFE_ZONE_LIMIT // ← safe zone protection
    )
        return null;
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
export const ENCOUNTER_INTERVAL = GAME_BALANCE.ENCOUNTER_INTERVAL; // Exported for use in game routes
/**
 * 🎲 DISTANCE-SCALED ENCOUNTER ROLLS
 * Safe Zone (< 200km) vs Danger Zone (>= 200km).
 */
async function rollPulseEncounter(character) {
    const depth = character.currentDepth;
    // Scaling Math:
    // Valoria (0): 30%
    // 2000km: 50%
    // Cap at 50%
    const spawnChance = Math.min(GAME_BALANCE.MAX_SPAWN_CHANCE, GAME_BALANCE.BASE_SPAWN_CHANCE + (depth / GAME_BALANCE.SPAWN_CHANCE_DEPTH_SCALER));
    const roll = Math.random();
    if (roll > spawnChance)
        return null;
    // Type Logic
    const typeRoll = Math.random();
    // Safe Zone: Mostly Gathering, Very Rarely weak PVE
    if (depth < GAME_BALANCE.SAFE_ZONE_LIMIT) {
        if (typeRoll < GAME_BALANCE.GATHERING_CHANCE_SAFE)
            return await generateGatheringEncounter(character);
        return await generatePVEEncounter(character);
    }
    // Danger Zone (>= 200km): PvP, Monsters, Dungeons
    // (PVP check happens in game routes or real-time loop, here we roll AI encounters)
    if (typeRoll < GAME_BALANCE.DUNGEON_ENCOUNTER_CHANCE) {
        const dungeon = await dungeonService.generateDungeonEncounter(character);
        if (dungeon)
            return dungeon;
    }
    if (typeRoll < GAME_BALANCE.GATHERING_CHANCE_DANGER + GAME_BALANCE.DUNGEON_ENCOUNTER_CHANCE)
        return await generateGatheringEncounter(character);
    return await generatePVEEncounter(character);
}
export const travelWorker = new Worker(travelQueueName, async (job) => {
    const { characterId } = job.data;
    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character)
        return;
    if (character.isPaused) {
        console.log(`⏸️ ${character.name} is paused. Skipping pulse.`);
        return { success: true, paused: true };
    }
    console.log(`Pulse for ${character.name} [${character.actionStatus}] at ${character.currentDepth}km`);
    // 🏥 Town Regen (Math.max(0, depth) ensures city logic at 0)
    if (character.currentDepth === 0 && (character.hp < character.maxHp || character.energy < character.maxEnergy)) {
        await prisma.character.update({
            where: { id: characterId },
            data: { hp: character.maxHp, energy: character.maxEnergy }
        });
        character.hp = character.maxHp;
        character.energy = character.maxEnergy;
        console.log(`[REGEN] ${character.name} healed to full in Valoria City`);
    }
    // ⛺ Camp Regen
    if (character.actionStatus === "CAMPING") {
        if (character.hp < character.maxHp || character.energy < character.maxEnergy) {
            const newHp = Math.min(character.maxHp, character.hp + Math.max(1, Math.floor(character.maxHp * 0.05)));
            const newEnergy = Math.min(character.maxEnergy, character.energy + 5);
            await prisma.character.update({
                where: { id: characterId },
                data: { hp: newHp, energy: newEnergy }
            });
            character.hp = newHp;
            character.energy = newEnergy;
        }
    }
    // ❤️ Passive HP Regen + ⚡ Move Speed from gear
    let gearStats = null;
    try {
        const { equipmentService } = await import("./equipmentService.js");
        gearStats = await equipmentService.getCharacterCombatStats(characterId);
        if (gearStats?.hpRegen > 0 && character.hp < character.maxHp) {
            const regen = Math.max(1, Math.floor((character.maxHp * gearStats.hpRegen) / 100));
            const newHp = Math.min(character.maxHp, character.hp + regen);
            await prisma.character.update({ where: { id: characterId }, data: { hp: newHp } });
            character.hp = newHp;
        }
    }
    catch { }
    // 📍 ALWAYS UPDATE REAL-TIME LOCATION (For PvP Matchmaking & Social)
    // We keep players in Redis even if they are in an ENCOUNTER,
    // rollPvPEncounter will handle the status check.
    if (character.actionStatus !== "IDLE") {
        await connection.zadd("players_depth", character.currentDepth, characterId);
    }
    else {
        await connection.zrem("players_depth", characterId);
    }
    // 1. Check for PVP Encounter (If in Danger Zone — 5% chance per pulse to keep it rare)
    if (character.currentDepth >= GAME_BALANCE.SAFE_ZONE_LIMIT &&
        Math.random() < GAME_BALANCE.PVP_AMBUSH_CHANCE &&
        (character.actionStatus === "TRAVELING_OUT" || character.actionStatus === "TRAVELING_IN")) {
        const pvpEncounter = await rollPvPEncounter(characterId, character.currentDepth);
        if (pvpEncounter) {
            console.log(`⚔️ PvP AMBUSH: ${character.name} spotted ${pvpEncounter.name}`);
            // ONLY Player 2 (the one who triggered the encounter) gets the PVP modal.
            // Player 1 is left untouched — they keep traveling until Player 2 presses "Attack",
            // which then sends PVP_INCOMING to Player 1 via the game route.
            await prisma.character.update({
                where: { id: characterId },
                data: { actionStatus: "ENCOUNTER", pendingEncounter: pvpEncounter, previousStatus: character.actionStatus }
            });
            // Notify ONLY Player 2 (the initiator) — Player 1 finds out when attacked
            const io = getIO();
            io.to(`user:${character.userId}`).emit("pvp_ambush", pvpEncounter);
            return { success: true, encounterFound: true, type: "PVP" };
        }
        // 🌐 Social Immersion: Broadcast nearby count
        const totalNearby = (await connection.zrangebyscore("players_depth", character.currentDepth - GAME_BALANCE.NEARBY_BROADCAST_RADIUS, character.currentDepth + GAME_BALANCE.NEARBY_BROADCAST_RADIUS)).length;
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
                    pendingEncounter: encounter
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
        if (character.energy <= 0) {
            nextStatus = "CAMPING"; // Force camp if exhausted
            console.log(`🏕️ ${character.name} is exhausted and forced to camp.`);
            getIO().to(`user:${character.userId}`).emit("exhaustion_forced_camp", { message: "You are too exhausted to continue. Setting up camp..." });
        }
        else {
            nextDepth += GAME_BALANCE.TRAVEL_OUT_DISTANCE;
            await prisma.character.update({ where: { id: characterId }, data: { energy: { decrement: 1 } } });
        }
    }
    else if (character.actionStatus === "TRAVELING_IN") {
        if (character.energy <= 0) {
            nextStatus = "CAMPING";
            console.log(`🏕️ ${character.name} is exhausted and forced to camp.`);
            getIO().to(`user:${character.userId}`).emit("exhaustion_forced_camp", { message: "You are too exhausted to continue. Setting up camp..." });
        }
        else {
            nextDepth = Math.max(0, character.currentDepth - GAME_BALANCE.TRAVEL_IN_DISTANCE); // Returning is 2x faster
            await prisma.character.update({ where: { id: characterId }, data: { energy: { decrement: 1 } } });
            if (nextDepth === 0) {
                nextStatus = "IDLE";
                console.log(`${character.name} returned to Valoria City.`);
            }
        }
    }
    // Update character state if changed
    if (nextDepth !== character.currentDepth || nextStatus !== character.actionStatus) {
        await prisma.character.update({
            where: { id: characterId },
            data: {
                currentDepth: nextDepth,
                actionStatus: nextStatus,
                lastPulseAt: new Date()
            }
        });
    }
    // 🚀 Queue next pulse ONLY if still active (Traveling or Camping)
    // If in ENCOUNTER or IDLE, recursion stops until manually resumed.
    const isMoving = nextStatus === "TRAVELING_OUT" || nextStatus === "TRAVELING_IN";
    const isCamping = nextStatus === "CAMPING";
    if (isMoving || isCamping) {
        // ⚡ Move speed reduces pulse interval (capped at 50% reduction)
        const speedMult = gearStats?.moveSpeed ? Math.max(0.5, 1 - gearStats.moveSpeed / 100) : 1;
        await travelQueue.add("pulse", { characterId }, {
            delay: ENCOUNTER_INTERVAL * 1000 * speedMult,
            removeOnComplete: true,
            removeOnFail: true
        });
    }
    else if (nextStatus === "IDLE") {
        await connection.zrem("players_depth", characterId);
    }
    // Broadcast real-time update to the client socket
    try {
        const payload = await getCharacterStatusPayload(characterId);
        getIO().to(`user:${character.userId}`).emit("character_updated", payload);
    }
    catch (err) {
        console.error(`Failed to emit character_updated socket event: ${err.message}`);
    }
    return { success: true, encounterFound: false };
}, { connection });
export const addTravelJob = async (characterId) => {
    await travelQueue.add("pulse", { characterId }, {
        delay: ENCOUNTER_INTERVAL * 1000,
        jobId: `pulse-${characterId}`, // 🛡️ Ensure only one
        removeOnComplete: true,
        removeOnFail: true
    });
};
travelWorker.on("completed", (job, res) => {
    // Silent tracking
});
travelWorker.on("failed", (job, err) => {
    console.error(`Pulse failed for ${job?.data?.characterId}: ${err.message}`);
});
//# sourceMappingURL=travelQueue.js.map