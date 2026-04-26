import { reforgeService } from "../services/reforgeService.js";
import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { executeCombat, executeGathering, getDepthTier, resolvePvpCombat } from "../services/combatEngine.js";
import { consumableService } from "../services/consumableService.js";
import { craftingService } from "../services/craftingService.js";
import { dungeonService } from "../services/dungeonService.js";
import { equipmentService } from "../services/equipmentService.js";
import { gameDataManager } from "../services/gameDataManager.js";
import { marketService } from "../services/marketService.js";
import { ENCOUNTER_INTERVAL, travelQueue, addTravelJob } from "../services/travelQueue.js";
import { getIO } from "../socket.js";
import { BACKEND_MESSAGES, GAME_BALANCE } from "../constants/gameBalance.js";

export async function gameRoutes(server: FastifyInstance) {
  // GET /api/game/metadata
  // Returns all world templates (Items, Zones) to drive the UI.
  // Publicly accessible to allow app sync on launch.
  server.get("/metadata", async (request, reply) => {
    try {
      const items = await gameDataManager.getAllItems();
      return reply.send({ items });
    } catch (err) {
      server.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch metadata" });
    }
  });

  // All subsequent game routes require a valid JWT token
  server.addHook("onRequest", async (request, reply) => {
    // Skip auth for metadata and preflight OPTIONS requests
    if (request.method === "OPTIONS" || request.url.includes("/metadata"))
      return;

    try {
      await request.jwtVerify();
    } catch (err: any) {
      server.log.error(`JWT Verification Failed: ${err.message}`);
      reply.status(401).send({ error: BACKEND_MESSAGES.UNAUTHORIZED, message: err.message });
    }
  });

  // GET /api/game/status
  server.get("/status", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };

    if (!characterId) {
      return reply
        .status(400)
        .send({ error: "No character associated with this account" });
    }

    try {
      const character = await prisma.character.findUnique({
        where: { id: characterId },
        include: {
          battleLogs: {
            orderBy: { createdAt: "desc" },
            take: 5, // Return more logs for the list
          },
        },
      });

      if (!character) {
        return reply.status(404).send({ error: BACKEND_MESSAGES.CHARACTER_NOT_FOUND });
      }

      // Fetch Equipped Item Details
      const gearResults = await Promise.all([
        character.equippedWeaponId
          ? prisma.inventoryItem.findUnique({
              where: { id: character.equippedWeaponId },
              include: { template: true },
            })
          : null,
        character.equippedChestId
          ? prisma.inventoryItem.findUnique({
              where: { id: character.equippedChestId },
              include: { template: true },
            })
          : null,
        character.equippedHelmetId
          ? prisma.inventoryItem.findUnique({
              where: { id: character.equippedHelmetId },
              include: { template: true },
            })
          : null,
        character.equippedBootsId
          ? prisma.inventoryItem.findUnique({
              where: { id: character.equippedBootsId },
              include: { template: true },
            })
          : null,
        character.equippedGlovesId
          ? prisma.inventoryItem.findUnique({
              where: { id: character.equippedGlovesId },
              include: { template: true },
            })
          : null,
        character.equippedCapeId
          ? prisma.inventoryItem.findUnique({
              where: { id: character.equippedCapeId },
              include: { template: true },
            })
          : null,
        character.equippedNecklaceId
          ? prisma.inventoryItem.findUnique({
              where: { id: character.equippedNecklaceId },
              include: { template: true },
            })
          : null,
        character.equippedRing1Id
          ? prisma.inventoryItem.findUnique({
              where: { id: character.equippedRing1Id },
              include: { template: true },
            })
          : null,
        character.equippedRing2Id
          ? prisma.inventoryItem.findUnique({
              where: { id: character.equippedRing2Id },
              include: { template: true },
            })
          : null,
      ]);

      const [weapon, chest, helmet, boots, gloves, cape, necklace, ring1, ring2] = gearResults;

      // Prune character from nested logs to prevent any potential circularity
      const latestBattles = character.battleLogs.map((log) => ({
        ...log,
        character: undefined, // Ensure no back-reference
      }));

      // Return a clean version of character without the nested array
      const characterData = { ...character, battleLogs: undefined };

      // Get Combat Stats (Base + Gear)
      const combatStats =
        await equipmentService.getCharacterCombatStats(characterId);

      // Get Dungeon State if applicable
      const dungeonState = await dungeonService.getDungeonState(characterId);

      // Calculate Depth Tier & Rewards
      const depth = character.currentDepth;
      const tier = await getDepthTier(depth);

      return reply.send({
        character: {
          ...characterData,
          ...combatStats,
          maxEnergy: combatStats.maxEnergy, // Override with calculated value
          dungeonState,
          locationName:
            character.currentDepth === 0
              ? "Valoria City"
              : tier.name || `${character.currentDepth}km from City`,
          isSafe: character.currentDepth < 200, // Keep 200km limit for now or check if tier name contains 'Safe'
          rankName: tier.name,
          dangerLevel: tier.dangerMult.toFixed(1) + "x",
          expBonus: Math.round((tier.expMult - 1) * 100 + (Math.floor(depth / 50) * 5)),
          lootBonus: Math.round((tier.lootMult - 1) * 100 + (Math.floor(depth / 50) * 2)),
          gold: character.gold,
          equippedWeapon: weapon,
          equippedChest: chest,
          equippedHelmet: helmet,
          equippedBoots: boots,
          equippedGloves: gloves,
          equippedCape: cape,
          equippedNecklace: necklace,
          equippedRing1: ring1,
          equippedRing2: ring2,
        },
        latestBattles,
      });
    } catch (err) {
      server.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch status" });
    }
  });

  // POST /api/game/travel
  // Now handles directional movement: OUT, IN, CAMP
  server.post("/travel", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { direction } = request.body as { direction: "OUT" | "IN" | "CAMP" };

    if (!direction) {
      return reply.status(400).send({ error: "Direction required" });
    }

    try {
      const character = await prisma.character.findUnique({
        where: { id: characterId },
      });

      if (!character) {
        return reply.status(404).send({ error: BACKEND_MESSAGES.CHARACTER_NOT_FOUND });
      }

      if (character.hp <= 0) {
        return reply
          .status(400)
          .send({ error: BACKEND_MESSAGES.DEAD_REMAIN });
      }

      let newStatus = "IDLE";
      if (direction === "OUT") newStatus = "TRAVELING_OUT";
      else if (direction === "IN") newStatus = "TRAVELING_IN";
      else if (direction === "CAMP") newStatus = "CAMPING";

      // Update character state
      await prisma.character.update({
        where: { id: characterId },
        data: {
          actionStatus: newStatus,
          lastPulseAt: new Date(),
        },
      });

      // Start/Refresh Pulse logic via the queue
      await travelQueue.add(
        "pulse",
        { characterId },
        {
          delay: 1000,
          jobId: `pulse-${characterId}`, // 🛡️ Deduplicate to prevent "ghost" pulses
          removeOnComplete: true,
          removeOnFail: true,
        },
      );

      return reply.send({
        success: true,
        message: `Now venturing ${direction === "OUT" ? "deeper" : direction === "IN" ? "homeward" : "into camp"}`,
        status: newStatus,
      });
    } catch (err) {
      server.log.error(err);
      return reply
        .status(500)
        .send({ error: "Failed to update travel direction" });
    }
  });

  // POST /api/game/travel/pause
  server.post("/travel/pause", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { paused } = request.body as { paused: boolean };

    try {
      const char = await prisma.character.update({
        where: { id: characterId },
        data: { isPaused: paused }
      });

      if (!paused && (char.actionStatus === "TRAVELING_OUT" || char.actionStatus === "TRAVELING_IN" || char.actionStatus === "CAMPING")) {
        await addTravelJob(characterId);
      }

      return reply.send({ success: true, isPaused: char.isPaused });
    } catch (err) {
      return reply.status(500).send({ error: "Failed to toggle pause" });
    }
  });

  // POST /api/game/resolve-encounter
  server.post("/resolve-encounter", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { action } = request.body as {
      action: "attack" | "skip" | "gather" | "enter_dungeon";
    };

    try {
      const character = await prisma.character.findUnique({
        where: { id: characterId },
      });

      if (!character || !character.pendingEncounter) {
        return reply.status(400).send({ error: BACKEND_MESSAGES.NO_PENDING_ENCOUNTER });
      }

      const encounter: any = character.pendingEncounter;

      if (action === "enter_dungeon" && encounter.type === "DUNGEON") {
        const result = await dungeonService.enterDungeon(characterId);
        return reply.send(result);
      }

      if (action === "skip") {
        if (encounter.type === "PVP_WAITING") {
           return reply.status(400).send({ error: "Waiting for opponent response..." });
        }

        // 🏃 FLEE — works for Player 2 (PVP) and Player 1 (PVP_INCOMING)
        if (encounter.type === "PVP" || encounter.type === "PVP_INCOMING") {
           const stats = await equipmentService.getCharacterCombatStats(characterId);
           const fleeChance = Math.min(GAME_BALANCE.PVP_FLEE_CHANCE_CAP, (stats.agi / GAME_BALANCE.PVP_FLEE_AGI_DIVISOR));
           if (Math.random() < fleeChance) {
              await prisma.character.update({
                where: { id: characterId },
                data: { actionStatus: character.previousStatus || "IDLE", pendingEncounter: Prisma.DbNull, previousStatus: null }
              });
              if (character.previousStatus?.startsWith("TRAVELING")) await addTravelJob(characterId);

              // If Player 1 fled, also clear Player 2's PVP_WAITING encounter
              if (encounter.type === "PVP_INCOMING" && encounter.targetId) {
                const p2 = await prisma.character.findUnique({ where: { id: encounter.targetId } });
                if (p2) {
                  const resumeStatus = (p2.previousStatus as string) || "IDLE";
                  await prisma.character.update({
                    where: { id: encounter.targetId },
                    data: { actionStatus: resumeStatus, pendingEncounter: Prisma.DbNull, previousStatus: null }
                  });
                  if (resumeStatus.startsWith("TRAVELING")) await addTravelJob(encounter.targetId);
                }
                const io = getIO();
                if (encounter.targetUserId) {
                  io.to(`user:${encounter.targetUserId}`).emit("pvp_fled", { message: `${character.name} escaped!` });
                }
              }

              return reply.send({ success: true, message: "You successfully escaped!" });
           } else {
              return reply.send({ success: false, message: "Flee failed! You are cornered." });
           }
        }

        const previousStatus = character.previousStatus || "IDLE";
        await prisma.character.update({
          where: { id: characterId },
          data: { actionStatus: previousStatus, previousStatus: null, pendingEncounter: Prisma.DbNull },
        });
        if (previousStatus !== "IDLE") {
          await travelQueue.add("pulse", { characterId }, { delay: ENCOUNTER_INTERVAL * 1000 });
        }
        return reply.send({ success: true, message: BACKEND_MESSAGES.ENCOUNTER_SKIPPED });
      }

      if (action === "attack" && encounter.type === "PVE") {
        const result = await executeCombat(character, encounter);
        if (result.updatedChar.hp > 0 && result.updatedChar.actionStatus !== "IDLE") {
          await travelQueue.add("pulse", { characterId }, { delay: ENCOUNTER_INTERVAL * 1000 });
        }
        return reply.send(result);
      }

      // ⚔️ STEP 1: Player 2 presses "Fight" on their PVP encounter
      // → Transition to WAITING state, push incoming notification to Player 1
      if (action === "attack" && encounter.type === "PVP") {
        const targetChar = await prisma.character.findUnique({
          where: { id: encounter.targetId },
          select: { id: true, hp: true, maxHp: true, userId: true, actionStatus: true }
        });

        // Target became unavailable (race condition - now in an encounter)
        if (!targetChar || targetChar.actionStatus === "ENCOUNTER") {
          await prisma.character.update({
            where: { id: characterId },
            data: { actionStatus: character.previousStatus || "IDLE", pendingEncounter: Prisma.DbNull, previousStatus: null }
          });
          if (character.previousStatus?.startsWith("TRAVELING")) await addTravelJob(characterId);
          return reply.send({ success: false, message: "Target is no longer available." });
        }

        // Update Player 2 → PVP_WAITING (remains in encounter modal)
        const waitingEncounter = { ...encounter, type: "PVP_WAITING" };
        await prisma.character.update({
          where: { id: characterId },
          data: { pendingEncounter: waitingEncounter as any }
        });

        // Set Player 1 → PVP_INCOMING encounter
        await prisma.character.update({
          where: { id: encounter.targetId },
          data: {
            actionStatus: "ENCOUNTER",
            previousStatus: targetChar.actionStatus,
            pendingEncounter: {
              type: "PVP_INCOMING",
              targetId: characterId,
              targetUserId: character.userId,
              name: character.name,
              hp: character.hp,
              maxHp: character.maxHp,
              level: character.level
            } as any
          }
        });

        // Notify Player 1 via socket → they see a "You've been attacked!" modal
        const io = getIO();
        io.to(`user:${encounter.targetUserId}`).emit("pvp_incoming", {
          attackerName: character.name,
          attackerUserId: character.userId,
        });

        return reply.send({ success: true, pending: true, message: `⚔️ Attack sent! Waiting for ${encounter.name}...` });
      }

      // ⚔️ STEP 2a: Player 1 presses "Fight" on PVP_INCOMING
      // ⚔️ STEP 2b: Player 2's AFK auto-fight on PVP_WAITING
      // → Resolve combat and push live autobattler to BOTH players
      if (action === "attack" && (encounter.type === "PVP_INCOMING" || encounter.type === "PVP_WAITING")) {
        // Determine who is the original attacker (Player 2) and who is defender (Player 1)
        const isP1Resolving = encounter.type === "PVP_INCOMING";
        const p2CharId = isP1Resolving ? encounter.targetId : characterId;
        const p1CharId = isP1Resolving ? characterId : encounter.targetId;
        const p2UserId = isP1Resolving ? encounter.targetUserId : character.userId;
        const p1UserId = isP1Resolving ? character.userId : encounter.targetUserId;

        // Race condition guard: verify both players are still in their PVP encounter states
        const p2State = await prisma.character.findUnique({ where: { id: p2CharId }, select: { pendingEncounter: true, previousStatus: true } });
        const p1State = await prisma.character.findUnique({ where: { id: p1CharId }, select: { pendingEncounter: true, previousStatus: true } });
        const p2Enc = p2State?.pendingEncounter as any;
        const p1Enc = p1State?.pendingEncounter as any;

        if (!p2Enc || !p1Enc || !["PVP_WAITING", "PVP"].includes(p2Enc.type) || !["PVP_INCOMING"].includes(p1Enc.type)) {
          // Already resolved by the other player — just refresh
          return reply.send({ success: true, alreadyResolved: true });
        }

        // resolvePvpCombat(attackerId=P2, defenderId=P1) — P2 is original initiator
        const combatResult = await resolvePvpCombat(p2CharId, p1CharId);

        // Build autobattler payloads for each player's perspective
        const p2Payload = {
          log: combatResult.log,
          playerName: combatResult.attackerName,            // P2 is "player" on their screen
          enemyName: combatResult.defenderName,
          startPlayerHp: combatResult.attackerStartHp,
          startMaxPlayerHp: combatResult.attackerMaxHp,
          startEnemyHp: combatResult.defenderStartHp,
          startMaxEnemyHp: combatResult.defenderMaxHp,
          isWin: combatResult.isWin,                        // P2's perspective (true = P2 won)
          goldStolen: combatResult.goldStolen,
          lootedItems: combatResult.isWin ? combatResult.lootedItems : [],
          experienceGained: 0,
          goldGained: combatResult.isWin ? combatResult.goldStolen : 0,
        };
        const p1Payload = {
          log: combatResult.log,
          playerName: combatResult.defenderName,            // P1 is "player" on their screen
          enemyName: combatResult.attackerName,
          startPlayerHp: combatResult.defenderStartHp,
          startMaxPlayerHp: combatResult.defenderMaxHp,
          startEnemyHp: combatResult.attackerStartHp,
          startMaxEnemyHp: combatResult.attackerMaxHp,
          isWin: !combatResult.isWin,                       // P1's perspective (true = P1 won)
          goldStolen: combatResult.goldStolen,
          lootedItems: !combatResult.isWin ? combatResult.lootedItems : [],
          experienceGained: 0,
          goldGained: !combatResult.isWin ? combatResult.goldStolen : 0,
        };

        // Emit to the OTHER player via socket (the resolver gets it via the route response)
        const io = getIO();
        if (isP1Resolving) {
          io.to(`user:${p2UserId}`).emit("pvp_battle_start", p2Payload); // P2 receives
        } else {
          io.to(`user:${p1UserId}`).emit("pvp_battle_start", p1Payload); // P1 receives
        }

        // Resume travel for the winner
        const winnerCharId = combatResult.isWin ? p2CharId : p1CharId;
        const winnerPrevStatus = combatResult.isWin ? (p2State?.previousStatus as string) : (p1State?.previousStatus as string);
        if (winnerPrevStatus?.startsWith("TRAVELING")) {
          await prisma.character.update({ where: { id: winnerCharId }, data: { actionStatus: winnerPrevStatus } });
          await addTravelJob(winnerCharId);
        }

        // Return this player's perspective
        return reply.send(isP1Resolving ? p1Payload : p2Payload);
      }

      if (action === "gather" && encounter.type === "GATHERING") {
        const result = await executeGathering(character, encounter);

        // Resume Pulse
        if (result.updatedChar.actionStatus !== "IDLE") {
          await travelQueue.add(
            "pulse",
            { characterId },
            { delay: ENCOUNTER_INTERVAL * 1000 },
          );
        }

        return reply.send(result);
      }

      return reply
        .status(400)
        .send({ error: "Invalid action for this encounter type" });
    } catch (err) {
      server.log.error(err);
      return reply.status(500).send({ error: "Failed to resolve encounter" });
    }
  });

  server.post("/stats/allocate", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { stat, amount = 1 } = request.body as {
      stat: "str" | "agi" | "dex" | "luk" | "int";
      amount?: number;
    };

    if (!["str", "agi", "dex", "luk", "int"].includes(stat)) {
      return reply.status(400).send({ error: "Invalid stat type" });
    }

    if (amount <= 0) {
      return reply.status(400).send({ error: "Invalid amount" });
    }

    try {
      const character = await prisma.character.findUnique({
        where: { id: characterId },
      });

      if (!character) {
        return reply.status(404).send({ error: BACKEND_MESSAGES.CHARACTER_NOT_FOUND });
      }

      if (character.statPoints < amount) {
        return reply.status(400).send({ error: "Not enough stat points available" });
      }

      const updatedCharacter = await prisma.character.update({
        where: { id: characterId },
        data: {
          [stat]: { increment: amount },
          statPoints: { decrement: amount },
        },
      });

      return reply.send({ success: true, character: updatedCharacter });
    } catch (err) {
      server.log.error(err);
      return reply.status(500).send({ error: "Failed to allocate stat" });
    }
  });

  // GET /api/game/inventory
  server.get("/inventory", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };

    try {
      const character = await prisma.character.findUnique({
         where: { id: characterId },
         select: {
            equippedWeaponId: true,
            equippedChestId: true,
            equippedHelmetId: true,
            equippedBootsId: true,
            equippedGlovesId: true,
            equippedCapeId: true,
            equippedNecklaceId: true,
            equippedRing1Id: true,
            equippedRing2Id: true,
         }
      });

      const items = await prisma.inventoryItem.findMany({
        where: { characterId },
      });

      return reply.send({ 
         inventory: items,
         equipment: character
      });
    } catch (err) {
      server.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch inventory" });
    }
  });

  /**
   * 🗡️ Equip Item
   */
  server.post("/equip", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { inventoryItemId } = request.body as { inventoryItemId: string };

    try {
      await equipmentService.equipItem(characterId, inventoryItemId);
      return reply.send({ success: true, message: "Item equipped!" });
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  /**
   * 🚶 Unequip Item
   */
  server.post("/unequip", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { slot } = request.body as {
      slot: "WEAPON" | "CHEST" | "HELMET" | "BOOTS" | "GLOVES" | "CAPE" | "NECKLACE" | "RING1" | "RING2";
    };

    try {
      await equipmentService.unequipItem(characterId, slot);
      return reply.send({ success: true, message: "Item unequipped!" });
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  /**
   * 🧪 Use Consumable Item
   */
  server.post("/use-item", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { inventoryItemId } = request.body as { inventoryItemId: string };

    try {
      const result = await consumableService.useItem(
        characterId,
        inventoryItemId,
      );
      return reply.send(result);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  /**
   * 🎲 Reforge Item Stats
   */
  server.post("/reforge", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { inventoryItemId } = request.body as { inventoryItemId: string };

    try {
      const result = await reforgeService.reforgeItem(characterId, inventoryItemId);
      return reply.send({ success: true, item: result });
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  /**
   * ⚒️ Get Crafting Recipes
   */
  server.get("/recipes", async (request, reply) => {
    try {
      const recipes = await craftingService.getRecipes();
      return reply.send({ recipes });
    } catch (e: any) {
      return reply.status(500).send({ error: "Failed to fetch recipes" });
    }
  });

  /**
   * ⚒️ Craft Item
   */
  server.post("/craft", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { recipeId } = request.body as { recipeId: string };

    try {
      const result = await craftingService.craftItem(characterId, recipeId);
      return reply.send(result);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  /**
   * 🛒 Get Marketplace Listings
   */
  server.get("/market", async (request, reply) => {
    try {
      const listings = await marketService.getListings();
      return reply.send({ listings });
    } catch (e: any) {
      return reply.status(500).send({ error: "Failed to fetch market" });
    }
  });

  /**
   * 🏷️ Sell Item on Market
   */
  server.post("/market/list", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { inventoryItemId, quantity, price } = request.body as {
      inventoryItemId: string;
      quantity: number;
      price: number;
    };

    try {
      const result = await marketService.listItem(
        characterId,
        inventoryItemId,
        quantity,
        price,
      );
      return reply.send({ success: true, listing: result });
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  /**
   * 🛍️ Buy Item from Market
   */
  server.post("/market/buy", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { listingId, quantity } = request.body as { listingId: string; quantity: number };

    try {
      const result = await marketService.buyItem(characterId, listingId, quantity);
      return reply.send(result);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  /**
   * ❌ Cancel Marketplace Listing
   */
  server.post("/market/cancel", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { listingId } = request.body as { listingId: string };

    try {
      const result = await marketService.cancelListing(characterId, listingId);
      return reply.send(result);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  /**
   * 🏰 Fight in Dungeon Floor
   */
  server.post("/dungeon/fight", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };

    try {
      const result = await dungeonService.fightFloor(characterId);
      return reply.send(result);
    } catch (e: any) {
      return reply.status(400).send({ error: e.message });
    }
  });

  /**
   * 👥 Friends System
   */
  server.get("/friends", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    try {
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [{ characterId: characterId }, { friendId: characterId }],
        },
        include: {
          character: {
            select: { id: true, name: true, level: true, actionStatus: true, userId: true },
          },
          friend: {
            select: { id: true, name: true, level: true, actionStatus: true, userId: true },
          },
        },
      });

      const friends = friendships
        .filter((f) => f.status === "ACCEPTED")
        .map((f) => {
          const isInitiator = f.characterId === characterId;
          return isInitiator ? f.friend : f.character;
        });

      const pending = friendships
        .filter((f) => f.status === "PENDING" && f.friendId === characterId)
        .map((f) => f.character);

      const outgoing = friendships
        .filter((f) => f.status === "PENDING" && f.characterId === characterId)
        .map((f) => f.friend);

      return reply.send({ friends, pending, outgoing });
    } catch (e: any) {
      return reply.status(500).send({ error: "Failed to fetch friends" });
    }
  });

  server.post("/friends/add", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { targetName } = request.body as { targetName: string };
    try {
      const target = await prisma.character.findUnique({ where: { name: targetName } });
      if (!target) return reply.status(404).send({ error: "Character not found" });
      if (target.id === characterId)
        return reply.status(400).send({ error: "Cannot add yourself" });

      const char = await prisma.character.findUnique({ where: { id: characterId } });

      const existing = await prisma.friendship.findFirst({
        where: {
          OR: [
            { characterId, friendId: target.id },
            { characterId: target.id, friendId: characterId },
          ],
        },
      });

      if (existing) {
        if (existing.status === "ACCEPTED") return reply.status(400).send({ error: "Already friends" });
        if (existing.status === "PENDING") {
          if (existing.friendId === characterId) {
            // Auto-accept if they already sent us a request
            await prisma.friendship.update({ where: { id: existing.id }, data: { status: "ACCEPTED" } });
            const io = getIO();
            if (io && char) {
              io.to(`user:${target.userId}`).emit("friend_request_accepted", { 
                friendName: char.name, 
                friendUserId: char.userId 
              });
            }
            return reply.send({ success: true, message: "Friend request auto-accepted!" });
          }
          return reply.status(400).send({ error: "Friend request already pending" });
        }
      }

      await prisma.friendship.create({
        data: { characterId, friendId: target.id, status: "PENDING" },
      });

      // Notify target via socket
      const io = getIO();
      if (io && char) {
        io.to(`user:${target.userId}`).emit("friend_request_received", {
          fromName: char.name,
          fromUserId: char.userId,
        });
      }

      return reply.send({ success: true, message: "Friend request sent" });
    } catch (e: any) {
      return reply.status(500).send({ error: "Failed to add friend" });
    }
  });

  server.post("/friends/accept", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { targetUserId } = request.body as { targetUserId: string }; // targetUserId here is actually characterId

    try {
      const friendship = await prisma.friendship.findFirst({
        where: { characterId: targetUserId, friendId: characterId, status: "PENDING" },
      });
      if (!friendship) return reply.status(404).send({ error: "Friend request not found" });

      await prisma.friendship.update({
        where: { id: friendship.id },
        data: { status: "ACCEPTED" },
      });

      const io = getIO();
      const me = await prisma.character.findUnique({ where: { id: characterId } });
      const target = await prisma.character.findUnique({ where: { id: targetUserId } });
      if (io && me && target) {
        io.to(`user:${target.userId}`).emit("friend_request_accepted", {
          friendName: me.name,
          friendUserId: me.userId,
        });
      }

      return reply.send({ success: true, message: "Friend request accepted" });
    } catch (e: any) {
      return reply.status(500).send({ error: "Failed to accept friend" });
    }
  });

  server.post("/friends/remove", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { targetUserId } = request.body as { targetUserId: string };
    try {
      await prisma.friendship.deleteMany({
        where: {
          OR: [
            { characterId, friendId: targetUserId },
            { characterId: targetUserId, friendId: characterId },
          ],
        },
      });
      return reply.send({ success: true, message: "Friend removed" });
    } catch (e: any) {
      return reply.status(500).send({ error: "Failed to remove friend" });
    }
  });

  /**
   * 💬 Chat History
   */
  server.get("/chat/world", async (request, reply) => {
    try {
      const messages = await prisma.chatMessage.findMany({
        where: { type: "WORLD" },
        orderBy: { timestamp: "desc" },
        take: 50,
        include: { fromCharacter: { select: { id: true, name: true, userId: true } } },
      });

      return reply.send({
        messages: messages.reverse().map((m) => ({
          senderId: m.fromCharacterId,
          senderName: m.fromCharacter.name,
          senderUserId: m.fromCharacter.userId,
          message: m.content,
          createdAt: m.timestamp,
          channel: "global",
        })),
      });
    } catch (e: any) {
      return reply.status(500).send({ error: "Failed to fetch chat history" });
    }
  });

  server.get("/chat/trade", async (request, reply) => {
    try {
      const messages = await prisma.chatMessage.findMany({
        where: { type: "TRADE" },
        orderBy: { timestamp: "desc" },
        take: 50,
        include: { fromCharacter: { select: { id: true, name: true, userId: true } } },
      });

      return reply.send({
        messages: messages.reverse().map((m) => ({
          senderId: m.fromCharacterId,
          senderName: m.fromCharacter.name,
          senderUserId: m.fromCharacter.userId,
          message: m.content,
          createdAt: m.timestamp,
          channel: "trade",
        })),
      });
    } catch (e: any) {
      return reply.status(500).send({ error: "Failed to fetch trade chat history" });
    }
  });

  server.get("/chat/private/recent", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    try {
      const messages = await prisma.chatMessage.findMany({
        where: {
          type: "PRIVATE",
          OR: [
            { fromCharacterId: characterId },
            { toCharacterId: characterId },
          ],
        },
        orderBy: { timestamp: "desc" },
        include: {
          fromCharacter: { select: { id: true, name: true, level: true } },
          toCharacter: { select: { id: true, name: true, level: true } },
        },
      });

      const partnersMap = new Map();
      messages.forEach((m) => {
        const isFromMe = m.fromCharacterId === characterId;
        const partner = isFromMe ? m.toCharacter : m.fromCharacter;
        const partnerId = isFromMe ? m.toCharacterId : m.fromCharacterId;

        if (!partnerId || !partner) return;

        if (!partnersMap.has(partnerId)) {
          partnersMap.set(partnerId, {
            ...partner,
            lastMessageAt: m.timestamp,
            lastMessage: m.content,
            hasUnread: !isFromMe && !m.isRead,
          });
        } else if (!isFromMe && !m.isRead) {
          // If we already have the partner, but this message is also unread
          partnersMap.get(partnerId).hasUnread = true;
        }
      });

      // Sort by lastMessageAt descending
      const partners = Array.from(partnersMap.values()).sort(
        (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
      );

      return reply.send({ partners });
    } catch (e: any) {
      console.error(e);
      return reply.status(500).send({ error: "Failed to fetch recent partners" });
    }
  });

  server.get("/chat/private/:targetUserId", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { targetUserId } = request.params as { targetUserId: string };
    try {
      // Mark as read
      await prisma.chatMessage.updateMany({
        where: {
          fromCharacterId: targetUserId,
          toCharacterId: characterId,
          type: "PRIVATE",
          isRead: false,
        },
        data: { isRead: true },
      });

      const messages = await prisma.chatMessage.findMany({
        where: {
          type: "PRIVATE",
          OR: [
            { fromCharacterId: characterId, toCharacterId: targetUserId },
            { fromCharacterId: targetUserId, toCharacterId: characterId },
          ],
        },
        orderBy: { timestamp: "desc" },
        take: 50,
        include: { fromCharacter: { select: { id: true, name: true, userId: true } } },
      });

      return reply.send({
        messages: messages.reverse().map((m) => ({
          senderId: m.fromCharacterId,
          senderName: m.fromCharacter.name,
          senderUserId: m.fromCharacter.userId,
          recipientId: m.toCharacterId,
          message: m.content,
          createdAt: m.timestamp,
          channel: "whispers",
        })),
      });
    } catch (e: any) {
      return reply.status(500).send({ error: "Failed to fetch private chat" });
    }
  });

  server.post("/chat/private/clear", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { targetUserId } = request.body as { targetUserId: string };
    try {
      await prisma.chatMessage.deleteMany({
        where: {
          type: "PRIVATE",
          OR: [
            { fromCharacterId: characterId, toCharacterId: targetUserId },
            { fromCharacterId: targetUserId, toCharacterId: characterId },
          ],
        },
      });
      return reply.send({ success: true });
    } catch (e: any) {
      return reply.status(500).send({ error: "Failed to clear chat" });
    }
  });
}
