import { prisma } from "../lib/prisma.js";
import { gameDataManager } from "../services/gameDataManager.js";
import { GAME_BALANCE } from "../constants/gameBalance.js";
import { zoneService } from "../services/zoneService.js";
import { inventoryService } from "../services/inventoryService.js";
import { getIO } from "../socket.js";
export async function adminRoutes(server) {
    // Authentication hook for all admin routes
    server.addHook("onRequest", async (request, reply) => {
        try {
            await request.jwtVerify();
            const userId = request.user.userId;
            const user = await prisma.user.findUnique({ where: { id: userId } });
            if (!user || !user.isAdmin) {
                return reply.status(403).send({ error: "Admin access required" });
            }
        }
        catch (err) {
            return reply.status(401).send({ error: "Unauthorized" });
        }
    });
    // --- Dashboard Stats ---
    server.get("/dashboard", async () => {
        const [userCount, charCount, itemTemplateCount, marketListingCount, zoneCount] = await Promise.all([
            prisma.user.count(),
            prisma.character.count(),
            prisma.itemTemplate.count(),
            prisma.marketListing.count(),
            prisma.zone.count(),
        ]);
        return { userCount, charCount, itemTemplateCount, marketListingCount, zoneCount };
    });
    // --- Items ---
    server.get("/items", async () => {
        return await prisma.itemTemplate.findMany({ include: { rarity: true }, orderBy: { code: "asc" } });
    });
    server.post("/items", async (request) => {
        const { rarity, ...data } = request.body;
        const item = await prisma.itemTemplate.create({ data });
        await gameDataManager.initialize(true);
        return item;
    });
    server.put("/items/:code", async (request) => {
        const { code } = request.params;
        const { rarity, ...data } = request.body;
        const item = await prisma.itemTemplate.update({
            where: { code },
            data
        });
        await gameDataManager.initialize(true);
        return item;
    });
    server.delete("/items/:code", async (request) => {
        const { code } = request.params;
        await prisma.itemTemplate.delete({ where: { code } });
        await gameDataManager.initialize(true);
        return { success: true };
    });
    // --- Players ---
    server.get("/players", async () => {
        return await prisma.character.findMany({
            include: { user: { select: { email: true } } },
            orderBy: { level: "desc" },
        });
    });
    server.get("/players/:id", async (request) => {
        const { id } = request.params;
        return await prisma.character.findUnique({
            where: { id },
            include: {
                inventory: { include: { template: true } }
            }
        });
    });
    server.put("/players/:id", async (request) => {
        const { id } = request.params;
        const data = request.body;
        // Explicitly whitelist updateable fields to avoid Prisma errors on nested objects like 'user'
        const updateData = {
            level: data.level,
            exp: data.exp,
            str: data.str,
            agi: data.agi,
            dex: data.dex,
            luk: data.luk,
            int: data.int,
            hp: data.hp,
            maxHp: data.maxHp,
            gold: data.gold,
            statPoints: data.statPoints,
            currentDepth: data.currentDepth,
        };
        const updated = await prisma.character.update({
            where: { id },
            data: updateData,
        });
        return updated;
    });
    server.post("/players/:id/inventory", async (request) => {
        const { id } = request.params;
        const { itemCode, quantity } = request.body;
        return await inventoryService.addItem(id, itemCode, quantity || 1);
    });
    server.delete("/players/:id/inventory/:itemId", async (request) => {
        const { id, itemId } = request.params;
        await prisma.inventoryItem.delete({
            where: {
                id: itemId,
                characterId: id
            }
        });
        return { success: true };
    });
    server.delete("/players/:id/inventory", async (request) => {
        const { id } = request.params;
        const { itemIds } = request.body;
        if (!Array.isArray(itemIds)) {
            throw new Error("itemIds must be an array");
        }
        await prisma.inventoryItem.deleteMany({
            where: {
                characterId: id,
                id: { in: itemIds }
            }
        });
        return { success: true };
    });
    // --- Monsters ---
    server.get("/monsters", async () => {
        return await prisma.monsterTemplate.findMany({
            include: { lootTable: { include: { item: true } } },
            orderBy: { minDepth: "asc" },
        });
    });
    server.post("/monsters", async (request, reply) => {
        const data = request.body;
        const { lootTable, ...rest } = data;
        if (data.isBoss && data.dungeonId) {
            const existingBoss = await prisma.monsterTemplate.findFirst({
                where: { dungeonId: data.dungeonId, isBoss: true }
            });
            if (existingBoss) {
                return reply.status(400).send({ error: `This dungeon already has a boss assigned (${existingBoss.name}).` });
            }
        }
        const monster = await prisma.monsterTemplate.create({
            data: {
                ...rest,
                lootTable: lootTable && lootTable.length > 0 ? {
                    create: lootTable.map((l) => ({
                        itemCode: l.itemCode,
                        chance: parseFloat(l.chance),
                        minQuantity: parseInt(l.minQuantity) || 1,
                        maxQuantity: parseInt(l.maxQuantity) || 1
                    }))
                } : undefined
            }
        });
        await gameDataManager.initialize();
        return monster;
    });
    server.put("/monsters/:id", async (request, reply) => {
        const { id } = request.params;
        const data = request.body;
        if (data.isBoss && data.dungeonId) {
            const existingBoss = await prisma.monsterTemplate.findFirst({
                where: {
                    dungeonId: data.dungeonId,
                    isBoss: true,
                    id: { not: id }
                }
            });
            if (existingBoss) {
                return reply.status(400).send({ error: `This dungeon already has a boss assigned (${existingBoss.name}).` });
            }
        }
        const monster = await prisma.$transaction(async (tx) => {
            // 1. Update basic stats
            const updated = await tx.monsterTemplate.update({
                where: { id },
                data: {
                    name: data.name,
                    hp: data.hp,
                    attack: data.attack,
                    defense: data.defense,
                    expReward: data.expReward,
                    goldReward: data.goldReward,
                    minGoldMult: data.minGoldMult,
                    maxGoldMult: data.maxGoldMult,
                    minDepth: data.minDepth,
                    isBoss: data.isBoss,
                    dungeonId: data.dungeonId,
                }
            });
            // 2. Handle Loot Table (Replace Strategy)
            if (data.lootTable) {
                // Delete all current loot
                await tx.lootTable.deleteMany({ where: { monsterTemplateId: id } });
                // Create new loot entries
                if (data.lootTable.length > 0) {
                    await tx.lootTable.createMany({
                        data: data.lootTable.map((l) => ({
                            monsterTemplateId: id,
                            itemCode: l.itemCode,
                            chance: parseFloat(l.chance),
                            minQuantity: parseInt(l.minQuantity) || 1,
                            maxQuantity: parseInt(l.maxQuantity) || 1
                        }))
                    });
                }
            }
            return updated;
        });
        await gameDataManager.initialize(true);
        return monster;
    });
    server.delete("/monsters/:id", async (request) => {
        const { id } = request.params;
        await prisma.monsterTemplate.delete({ where: { id } });
        await gameDataManager.initialize(true);
        return { success: true };
    });
    // --- Resource Nodes ---
    server.get("/resource-nodes", async () => {
        return await prisma.resourceNodeTemplate.findMany({
            include: { lootTable: { include: { item: true } } },
            orderBy: { name: "asc" },
        });
    });
    server.post("/resource-nodes", async (request) => {
        const data = request.body;
        const { lootTable, ...rest } = data;
        const node = await prisma.resourceNodeTemplate.create({
            data: {
                ...rest,
                lootTable: lootTable && lootTable.length > 0 ? {
                    create: lootTable.map((l) => ({
                        itemCode: l.itemCode,
                        chance: parseFloat(l.chance),
                        minQuantity: parseInt(l.minQuantity) || 1,
                        maxQuantity: parseInt(l.maxQuantity) || 1
                    }))
                } : undefined
            }
        });
        await gameDataManager.initialize(true);
        return node;
    });
    server.put("/resource-nodes/:id", async (request) => {
        const { id } = request.params;
        const data = request.body;
        const node = await prisma.$transaction(async (tx) => {
            const updated = await tx.resourceNodeTemplate.update({
                where: { id },
                data: {
                    name: data.name,
                    type: data.type,
                    icon: data.icon,
                    baseHp: data.baseHp,
                    xpReward: data.xpReward,
                }
            });
            if (data.lootTable) {
                await tx.lootTable.deleteMany({ where: { resourceNodeTemplateId: id } });
                if (data.lootTable.length > 0) {
                    await tx.lootTable.createMany({
                        data: data.lootTable.map((l) => ({
                            resourceNodeTemplateId: id,
                            itemCode: l.itemCode,
                            chance: parseFloat(l.chance),
                            minQuantity: parseInt(l.minQuantity) || 1,
                            maxQuantity: parseInt(l.maxQuantity) || 1
                        }))
                    });
                }
            }
            return updated;
        });
        await gameDataManager.initialize(true);
        return node;
    });
    server.delete("/resource-nodes/:id", async (request) => {
        const { id } = request.params;
        await prisma.resourceNodeTemplate.delete({ where: { id } });
        await gameDataManager.initialize(true);
        return { success: true };
    });
    // --- Dungeons ---
    server.get("/dungeons", async () => {
        return await prisma.dungeonTemplate.findMany();
    });
    server.post("/dungeons", async (request) => {
        const data = request.body;
        return await prisma.dungeonTemplate.create({
            data: {
                name: data.name,
                description: data.description,
                minDepth: data.minDepth,
                maxDepth: data.maxDepth,
                minLevel: data.minLevel,
                floorCount: data.floorCount,
                lootMultiplier: data.lootMultiplier,
                expMultiplier: data.expMultiplier,
                treasureChance: data.treasureChance,
            }
        });
    });
    server.put("/dungeons/:id", async (request) => {
        const { id } = request.params;
        const data = request.body;
        return await prisma.dungeonTemplate.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                minDepth: data.minDepth,
                maxDepth: data.maxDepth,
                minLevel: data.minLevel,
                floorCount: data.floorCount,
                lootMultiplier: data.lootMultiplier,
                expMultiplier: data.expMultiplier,
                treasureChance: data.treasureChance,
            }
        });
    });
    server.delete("/dungeons/:id", async (request) => {
        const { id } = request.params;
        await prisma.dungeonTemplate.delete({ where: { id } });
        return { success: true };
    });
    // --- Marketplace ---
    server.get("/market", async () => {
        return await prisma.marketListing.findMany({
            include: { template: true, seller: { select: { name: true } } }
        });
    });
    server.delete("/market/:id", async (request) => {
        const { id } = request.params;
        await prisma.marketListing.delete({ where: { id } });
        return { success: true };
    });
    // --- Recipes ---
    server.get("/recipes", async () => {
        return await prisma.craftingRecipe.findMany({
            include: {
                resultItem: true,
                ingredients: {
                    include: { item: true }
                }
            }
        });
    });
    server.post("/recipes", async (request) => {
        const data = request.body;
        const { ingredients, ...rest } = data;
        const recipe = await prisma.craftingRecipe.create({
            data: {
                ...rest,
                ingredients: {
                    create: ingredients.map((ing) => ({
                        itemCode: ing.itemCode,
                        quantity: parseInt(ing.quantity) || 1
                    }))
                }
            },
            include: { resultItem: true, ingredients: { include: { item: true } } }
        });
        return recipe;
    });
    server.put("/recipes/:id", async (request) => {
        const { id } = request.params;
        const data = request.body;
        const { ingredients, ...rest } = data;
        const recipe = await prisma.$transaction(async (tx) => {
            const updated = await tx.craftingRecipe.update({
                where: { id },
                data: rest
            });
            await tx.recipeIngredient.deleteMany({ where: { recipeId: id } });
            if (ingredients && ingredients.length > 0) {
                await tx.recipeIngredient.createMany({
                    data: ingredients.map((ing) => ({
                        recipeId: id,
                        itemCode: ing.itemCode,
                        quantity: parseInt(ing.quantity) || 1
                    }))
                });
            }
            return await tx.craftingRecipe.findUnique({
                where: { id },
                include: { resultItem: true, ingredients: { include: { item: true } } }
            });
        });
        return recipe;
    });
    server.delete("/recipes/:id", async (request) => {
        const { id } = request.params;
        await prisma.recipeIngredient.deleteMany({ where: { recipeId: id } });
        await prisma.craftingRecipe.delete({ where: { id } });
        return { success: true };
    });
    // --- Global Broadcast ---
    server.post("/broadcast", async (request) => {
        const { message } = request.body;
        const io = getIO();
        io.emit("chat_broadcast", {
            userId: "SYSTEM",
            characterName: "[SYSTEM]",
            message: message,
            timestamp: new Date().toISOString()
        });
        return { success: true };
    });
    // --- Config ---
    server.get("/config", async () => {
        return { current: GAME_BALANCE };
    });
    // --- Zones ---
    server.get("/zones", async () => {
        return await zoneService.getAllZones();
    });
    server.post("/zones", async (request) => {
        const data = request.body;
        return await zoneService.createZone(data);
    });
    server.put("/zones/:id", async (request) => {
        const { id } = request.params;
        const data = request.body;
        return await zoneService.updateZone(id, data);
    });
    server.delete("/zones/:id", async (request) => {
        const { id } = request.params;
        await zoneService.deleteZone(id);
        return { success: true };
    });
}
//# sourceMappingURL=admin.js.map