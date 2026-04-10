import { Prisma } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { executeCombat, executeGathering, getDepthTier } from "../services/combatEngine.js";
import { consumableService } from "../services/consumableService.js";
import { craftingService } from "../services/craftingService.js";
import { dungeonService } from "../services/dungeonService.js";
import { equipmentService } from "../services/equipmentService.js";
import { gameDataManager } from "../services/gameDataManager.js";
import { marketService } from "../services/marketService.js";
import { ENCOUNTER_INTERVAL, travelQueue, addTravelJob } from "../services/travelQueue.js";

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
      reply.status(401).send({ error: "Unauthorized", message: err.message });
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
        return reply.status(404).send({ error: "Character not found" });
      }

      // Fetch Equipped Item Details
      const [weapon, chest, helmet, boots] = await Promise.all([
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
      ]);

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
      const tier = getDepthTier(depth);

      return reply.send({
        character: {
          ...characterData,
          ...combatStats,
          dungeonState,
          locationName:
            character.currentDepth === 0
              ? "Valoria City"
              : `${character.currentDepth}km from City`,
          isSafe: character.currentDepth < 200,
          rankName: tier.name,
          dangerLevel: tier.dangerMult.toFixed(1) + "x",
          expBonus: Math.round((tier.expMult - 1) * 100 + (Math.floor(depth / 50) * 5)),
          lootBonus: Math.round((tier.lootMult - 1) * 100 + (Math.floor(depth / 50) * 2)),
          gold: character.gold,
          equippedWeapon: weapon,
          equippedChest: chest,
          equippedHelmet: helmet,
          equippedBoots: boots,
        },
        latestBattles,
      });
    } catch (err) {
      server.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch status" });
    }
  });

  // GET /api/game/friends
  server.get("/friends", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    try {
      const friendships = await prisma.friendship.findMany({
        where: {
          OR: [{ characterId }, { friendId: characterId }],
        },
        include: {
          character: true,
          friend: true,
        },
      });

      // Map to a clean list of friends (the other person in the relation)
      const friends = friendships.map((f: any) => {
        const isMeInitiator = f.characterId === characterId;
        const other = isMeInitiator ? f.friend : f.character;
        return {
          id: other.id,
          userId: other.userId,
          name: other.name,
          level: other.level,
        };
      });

      return reply.send({ friends });
    } catch (err) {
      server.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch friends" });
    }
  });

  // GET /api/game/chat/world
  server.get("/chat/world", async (request, reply) => {
    try {
      const messages = await (prisma as any).chatMessage.findMany({
        where: { type: "WORLD" },
        take: 100,
        orderBy: { timestamp: "desc" },
        include: { fromCharacter: true }
      });

      // Reverse to show oldest first in UI
      const formatted = messages.reverse().map((m: any) => ({
        id: m.id,
        userId: m.fromCharacter.userId,
        characterName: m.fromCharacter.name,
        message: m.content,
        timestamp: m.timestamp.toISOString()
      }));

      return reply.send({ messages: formatted });
    } catch (err) {
      server.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch world chat history" });
    }
  });

  // GET /api/game/chat/private/:targetUserId
  server.get("/chat/private/:targetUserId", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { targetUserId } = request.params as { targetUserId: string };

    try {
      const targetChar = await prisma.character.findFirst({ where: { userId: targetUserId } });
      if (!targetChar) return reply.status(404).send({ error: "Target player not found" });

      const messages = await (prisma as any).chatMessage.findMany({
        where: {
          type: "PRIVATE",
          OR: [
            { fromCharacterId: characterId, toCharacterId: targetChar.id },
            { fromCharacterId: targetChar.id, toCharacterId: characterId },
          ]
        },
        take: 50,
        orderBy: { timestamp: "desc" },
        include: { fromCharacter: true }
      });

      const formatted = messages.reverse().map((m: any) => ({
        fromUserId: m.fromCharacter.userId,
        fromCharacterName: m.fromCharacter.name,
        message: m.content,
        timestamp: m.timestamp.toISOString()
      }));

      return reply.send({ messages: formatted });
    } catch (err) {
      server.log.error(err);
      return reply.status(500).send({ error: "Failed to fetch private chat history" });
    }
  });

  // POST /api/game/friends/add
  server.post("/friends/add", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { targetName } = request.body as { targetName: string };

    if (!targetName) return reply.status(400).send({ error: "Name required" });

    try {
      const targetChar = await prisma.character.findUnique({
        where: { name: targetName },
      });

      if (!targetChar) return reply.status(404).send({ error: "Player not found" });
      if (targetChar.id === characterId) return reply.status(400).send({ error: "Cannot add yourself" });

      // Check existing
      const existing = await prisma.friendship.findFirst({
        where: {
          OR: [
            { characterId, friendId: targetChar.id },
            { characterId: targetChar.id, friendId: characterId },
          ],
        },
      });

      if (existing) return reply.status(400).send({ error: "Already friends" });

      await prisma.friendship.create({
        data: {
          characterId,
          friendId: targetChar.id,
        },
      });

      return reply.send({ success: true, message: "Friend added!" });
    } catch (err) {
      server.log.error(err);
      return reply.status(500).send({ error: "Failed to add friend" });
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
        return reply.status(404).send({ error: "Character not found" });
      }

      if (character.hp <= 0) {
        return reply
          .status(400)
          .send({ error: "You are dead. Wait to revive." });
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
        return reply.status(400).send({ error: "No pending encounter found" });
      }

      const encounter: any = character.pendingEncounter;

      if (action === "enter_dungeon" && encounter.type === "DUNGEON") {
        const result = await dungeonService.enterDungeon(characterId);
        return reply.send(result);
      }

      if (action === "skip") {
        if (encounter.type === "PVP") {
           // FLEE MECHANIC
           const stats = await equipmentService.getCharacterCombatStats(characterId);
           const fleeChance = Math.min(0.8, (stats.agi / 20)); // Base scaling
           if (Math.random() < fleeChance) {
              await prisma.character.update({
                where: { id: characterId },
                data: { actionStatus: character.previousStatus || "IDLE", pendingEncounter: Prisma.DbNull }
              });
              // Resume pulse if traveling
              if (character.previousStatus?.startsWith("TRAVELING")) await addTravelJob(characterId);
              
              return reply.send({ success: true, message: "You successfully escaped the ambush!" });
           } else {
              return reply.send({ success: false, message: "Flee failed! You are cornered." });
           }
        }

        const previousStatus = character.previousStatus || "IDLE";

        await prisma.character.update({
          where: { id: characterId },
          data: {
            actionStatus: previousStatus,
            previousStatus: null,
            pendingEncounter: Prisma.DbNull,
          },
        });

        // Resume Pulse recursion
        if (previousStatus !== "IDLE") {
          await travelQueue.add(
            "pulse",
            { characterId },
            { delay: ENCOUNTER_INTERVAL * 1000 },
          );
        }

        return reply.send({
          success: true,
          message: "Encounter skipped. Resuming journey.",
        });
      }

      if (action === "attack" && encounter.type === "PVE") {
        const result = await executeCombat(character, encounter);

        // Resume Pulse if still alive and supposed to be moving
        if (
          result.updatedChar.hp > 0 &&
          result.updatedChar.actionStatus !== "IDLE"
        ) {
          await travelQueue.add(
            "pulse",
            { characterId },
            { delay: ENCOUNTER_INTERVAL * 1000 },
          );
        }

        return reply.send(result);
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

  // POST /api/game/stats/allocate
  server.post("/stats/allocate", async (request, reply) => {
    const { characterId } = request.user as { characterId: string };
    const { stat } = request.body as {
      stat: "str" | "agi" | "dex" | "luk" | "int";
    };

    if (!["str", "agi", "dex", "luk", "int"].includes(stat)) {
      return reply.status(400).send({ error: "Invalid stat type" });
    }

    try {
      const character = await prisma.character.findUnique({
        where: { id: characterId },
      });

      if (!character) {
        return reply.status(404).send({ error: "Character not found" });
      }

      if (character.statPoints <= 0) {
        return reply.status(400).send({ error: "No stat points available" });
      }

      const updatedCharacter = await prisma.character.update({
        where: { id: characterId },
        data: {
          [stat]: { increment: 1 },
          statPoints: { decrement: 1 },
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
      slot: "WEAPON" | "CHEST" | "HELMET" | "BOOTS";
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
    const { listingId } = request.body as { listingId: string };

    try {
      const result = await marketService.buyItem(characterId, listingId);
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
}
