import { prisma } from "../lib/prisma.js";
import { gameDataManager } from "../services/gameDataManager.js";
import { GAME_BALANCE } from "../constants/gameBalance.js";
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
        const [userCount, charCount, itemTemplateCount, marketListingCount] = await Promise.all([
            prisma.user.count(),
            prisma.character.count(),
            prisma.itemTemplate.count(),
            prisma.marketListing.count(),
        ]);
        return { userCount, charCount, itemTemplateCount, marketListingCount };
    });
    // --- Items ---
    server.get("/items", async () => {
        return await prisma.itemTemplate.findMany({ include: { rarity: true }, orderBy: { code: "asc" } });
    });
    server.post("/items", async (request) => {
        const data = request.body;
        const item = await prisma.itemTemplate.create({ data });
        await gameDataManager.initialize();
        return item;
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
    // --- Monsters ---
    server.get("/monsters", async () => {
        return await prisma.monsterTemplate.findMany({
            include: { lootTable: { include: { item: true } } },
            orderBy: { minDepth: "asc" },
        });
    });
    server.post("/monsters", async (request) => {
        const data = request.body;
        const { lootTable, ...rest } = data;
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
    server.put("/monsters/:id", async (request) => {
        const { id } = request.params;
        const data = request.body;
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
                    minDepth: data.minDepth,
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
        await gameDataManager.initialize();
        return monster;
    });
    server.delete("/monsters/:id", async (request) => {
        const { id } = request.params;
        await prisma.monsterTemplate.delete({ where: { id } });
        await gameDataManager.initialize();
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
                bossName: data.bossName,
                bossHp: data.bossHp,
                bossAttack: data.bossAttack,
                bossDefense: data.bossDefense,
                bossExpReward: data.bossExpReward,
                treasureChance: data.treasureChance,
                lootItemCode: data.lootItemCode,
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
                bossName: data.bossName,
                bossHp: data.bossHp,
                bossAttack: data.bossAttack,
                bossDefense: data.bossDefense,
                bossExpReward: data.bossExpReward,
                treasureChance: data.treasureChance,
                lootItemCode: data.lootItemCode,
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
}
//# sourceMappingURL=admin.js.map