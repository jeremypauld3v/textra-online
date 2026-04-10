import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { executeCombat, executeGathering, getDepthTier } from "../services/combatEngine.js";
import { consumableService } from "../services/consumableService.js";
import { craftingService } from "../services/craftingService.js";
import { dungeonService } from "../services/dungeonService.js";
import { equipmentService } from "../services/equipmentService.js";
import { gameDataManager } from "../services/gameDataManager.js";
import { marketService } from "../services/marketService.js";
import { ENCOUNTER_INTERVAL, travelQueue } from "../services/travelQueue.js";
export async function gameRoutes(server) {
    // GET /api/game/metadata
    // Returns all world templates (Items, Zones) to drive the UI.
    // Publicly accessible to allow app sync on launch.
    server.get("/metadata", async (request, reply) => {
        try {
            const items = await gameDataManager.getAllItems();
            return reply.send({ items });
        }
        catch (err) {
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
        }
        catch (err) {
            server.log.error(`JWT Verification Failed: ${err.message}`);
            reply.status(401).send({ error: "Unauthorized", message: err.message });
        }
    });
    // GET /api/game/status
    server.get("/status", async (request, reply) => {
        const { characterId } = request.user;
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
            const combatStats = await equipmentService.getCharacterCombatStats(characterId);
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
                    locationName: character.currentDepth === 0
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
        }
        catch (err) {
            server.log.error(err);
            return reply.status(500).send({ error: "Failed to fetch status" });
        }
    });
    // POST /api/game/travel
    // Now handles directional movement: OUT, IN, CAMP
    server.post("/travel", async (request, reply) => {
        const { characterId } = request.user;
        const { direction } = request.body;
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
            if (direction === "OUT")
                newStatus = "TRAVELING_OUT";
            else if (direction === "IN")
                newStatus = "TRAVELING_IN";
            else if (direction === "CAMP")
                newStatus = "CAMPING";
            // Update character state
            await prisma.character.update({
                where: { id: characterId },
                data: {
                    actionStatus: newStatus,
                    lastPulseAt: new Date(),
                },
            });
            // Start/Refresh Pulse logic via the queue
            await travelQueue.add("pulse", { characterId }, {
                delay: 1000,
                jobId: `pulse-${characterId}`, // 🛡️ Deduplicate to prevent "ghost" pulses
                removeOnComplete: true,
                removeOnFail: true,
            });
            return reply.send({
                success: true,
                message: `Now venturing ${direction === "OUT" ? "deeper" : direction === "IN" ? "homeward" : "into camp"}`,
                status: newStatus,
            });
        }
        catch (err) {
            server.log.error(err);
            return reply
                .status(500)
                .send({ error: "Failed to update travel direction" });
        }
    });
    // POST /api/game/resolve-encounter
    server.post("/resolve-encounter", async (request, reply) => {
        const { characterId } = request.user;
        const { action } = request.body;
        try {
            const character = await prisma.character.findUnique({
                where: { id: characterId },
            });
            if (!character || !character.pendingEncounter) {
                return reply.status(400).send({ error: "No pending encounter found" });
            }
            const encounter = character.pendingEncounter;
            if (action === "enter_dungeon" && encounter.type === "DUNGEON") {
                const result = await dungeonService.enterDungeon(characterId);
                return reply.send(result);
            }
            if (action === "skip") {
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
                    await travelQueue.add("pulse", { characterId }, { delay: ENCOUNTER_INTERVAL * 1000 });
                }
                return reply.send({
                    success: true,
                    message: "Encounter skipped. Resuming journey.",
                });
            }
            if (action === "attack" && encounter.type === "PVE") {
                const result = await executeCombat(character, encounter);
                // Resume Pulse if still alive and supposed to be moving
                if (result.updatedChar.hp > 0 &&
                    result.updatedChar.actionStatus !== "IDLE") {
                    await travelQueue.add("pulse", { characterId }, { delay: ENCOUNTER_INTERVAL * 1000 });
                }
                return reply.send(result);
            }
            if (action === "gather" && encounter.type === "GATHERING") {
                const result = await executeGathering(character, encounter);
                // Resume Pulse
                if (result.updatedChar.actionStatus !== "IDLE") {
                    await travelQueue.add("pulse", { characterId }, { delay: ENCOUNTER_INTERVAL * 1000 });
                }
                return reply.send(result);
            }
            return reply
                .status(400)
                .send({ error: "Invalid action for this encounter type" });
        }
        catch (err) {
            server.log.error(err);
            return reply.status(500).send({ error: "Failed to resolve encounter" });
        }
    });
    // POST /api/game/stats/allocate
    server.post("/stats/allocate", async (request, reply) => {
        const { characterId } = request.user;
        const { stat } = request.body;
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
        }
        catch (err) {
            server.log.error(err);
            return reply.status(500).send({ error: "Failed to allocate stat" });
        }
    });
    // GET /api/game/inventory
    server.get("/inventory", async (request, reply) => {
        const { characterId } = request.user;
        try {
            const items = await prisma.inventoryItem.findMany({
                where: { characterId },
            });
            return reply.send({ inventory: items });
        }
        catch (err) {
            server.log.error(err);
            return reply.status(500).send({ error: "Failed to fetch inventory" });
        }
    });
    /**
     * 🗡️ Equip Item
     */
    server.post("/equip", async (request, reply) => {
        const { characterId } = request.user;
        const { inventoryItemId } = request.body;
        try {
            await equipmentService.equipItem(characterId, inventoryItemId);
            return reply.send({ success: true, message: "Item equipped!" });
        }
        catch (e) {
            return reply.status(400).send({ error: e.message });
        }
    });
    /**
     * 🚶 Unequip Item
     */
    server.post("/unequip", async (request, reply) => {
        const { characterId } = request.user;
        const { slot } = request.body;
        try {
            await equipmentService.unequipItem(characterId, slot);
            return reply.send({ success: true, message: "Item unequipped!" });
        }
        catch (e) {
            return reply.status(400).send({ error: e.message });
        }
    });
    /**
     * 🧪 Use Consumable Item
     */
    server.post("/use-item", async (request, reply) => {
        const { characterId } = request.user;
        const { inventoryItemId } = request.body;
        try {
            const result = await consumableService.useItem(characterId, inventoryItemId);
            return reply.send(result);
        }
        catch (e) {
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
        }
        catch (e) {
            return reply.status(500).send({ error: "Failed to fetch recipes" });
        }
    });
    /**
     * ⚒️ Craft Item
     */
    server.post("/craft", async (request, reply) => {
        const { characterId } = request.user;
        const { recipeId } = request.body;
        try {
            const result = await craftingService.craftItem(characterId, recipeId);
            return reply.send(result);
        }
        catch (e) {
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
        }
        catch (e) {
            return reply.status(500).send({ error: "Failed to fetch market" });
        }
    });
    /**
     * 🏷️ Sell Item on Market
     */
    server.post("/market/list", async (request, reply) => {
        const { characterId } = request.user;
        const { inventoryItemId, quantity, price } = request.body;
        try {
            const result = await marketService.listItem(characterId, inventoryItemId, quantity, price);
            return reply.send({ success: true, listing: result });
        }
        catch (e) {
            return reply.status(400).send({ error: e.message });
        }
    });
    /**
     * 🛍️ Buy Item from Market
     */
    server.post("/market/buy", async (request, reply) => {
        const { characterId } = request.user;
        const { listingId } = request.body;
        try {
            const result = await marketService.buyItem(characterId, listingId);
            return reply.send(result);
        }
        catch (e) {
            return reply.status(400).send({ error: e.message });
        }
    });
    /**
     * ❌ Cancel Marketplace Listing
     */
    server.post("/market/cancel", async (request, reply) => {
        const { characterId } = request.user;
        const { listingId } = request.body;
        try {
            const result = await marketService.cancelListing(characterId, listingId);
            return reply.send(result);
        }
        catch (e) {
            return reply.status(400).send({ error: e.message });
        }
    });
    /**
     * 🏰 Fight in Dungeon Floor
     */
    server.post("/dungeon/fight", async (request, reply) => {
        const { characterId } = request.user;
        try {
            const result = await dungeonService.fightFloor(characterId);
            return reply.send(result);
        }
        catch (e) {
            return reply.status(400).send({ error: e.message });
        }
    });
}
//# sourceMappingURL=game.js.map