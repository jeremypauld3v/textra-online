import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { gameDataManager } from "../services/gameDataManager.js";
import { GAME_BALANCE } from "../constants/gameBalance.js";
import { zoneService } from "../services/zoneService.js";
import { inventoryService } from "../services/inventoryService.js";
import { getIO } from "../socket.js";

export async function adminRoutes(server: FastifyInstance) {
  // Authentication hook for all admin routes
  server.addHook("onRequest", async (request, reply) => {
    try {
      await request.jwtVerify();
      const userId = (request.user as any).userId;
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user || !user.isAdmin) {
        return reply.status(403).send({ error: "Admin access required" });
      }
    } catch (err) {
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
    const data = request.body as any;
    const item = await prisma.itemTemplate.create({ data });
    await gameDataManager.initialize(true);
    return item;
  });

  server.put("/items/:code", async (request) => {
    const { code } = request.params as any;
    const data = request.body as any;
    const item = await prisma.itemTemplate.update({
      where: { code },
      data
    });
    await gameDataManager.initialize(true);
    return item;
  });

  server.delete("/items/:code", async (request) => {
    const { code } = request.params as any;
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
    const { id } = request.params as any;
    return await prisma.character.findUnique({
      where: { id },
      include: { 
        inventory: { include: { template: true } }
      }
    });
  });

  server.put("/players/:id", async (request) => {
    const { id } = request.params as any;
    const data = request.body as any;
    
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
    const { id } = request.params as any;
    const { itemCode, quantity } = request.body as any;
    
    return await inventoryService.addItem(id, itemCode, quantity || 1);
  });

  server.delete("/players/:id/inventory/:itemId", async (request) => {
    const { id, itemId } = request.params as any;
    
    await prisma.inventoryItem.delete({
      where: { 
        id: itemId,
        characterId: id
      }
    });
    
    return { success: true };
  });

  server.delete("/players/:id/inventory", async (request) => {
    const { id } = request.params as any;
    const { itemIds } = request.body as any;

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

  server.post("/monsters", async (request) => {
    const data = request.body as any;
    const { lootTable, ...rest } = data;
    const monster = await prisma.monsterTemplate.create({
      data: {
        ...rest,
        lootTable: lootTable && lootTable.length > 0 ? {
          create: lootTable.map((l: any) => ({
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
    const { id } = request.params as any;
    const data = request.body as any;

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
            data: data.lootTable.map((l: any) => ({
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
    const { id } = request.params as any;
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
    const data = request.body as any;
    const { lootTable, ...rest } = data;
    const node = await prisma.resourceNodeTemplate.create({
      data: {
        ...rest,
        lootTable: lootTable && lootTable.length > 0 ? {
          create: lootTable.map((l: any) => ({
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
    const { id } = request.params as any;
    const data = request.body as any;

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
            data: data.lootTable.map((l: any) => ({
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
    const { id } = request.params as any;
    await prisma.resourceNodeTemplate.delete({ where: { id } });
    await gameDataManager.initialize(true);
    return { success: true };
  });

  // --- Dungeons ---
  server.get("/dungeons", async () => {
    return await prisma.dungeonTemplate.findMany();
  });

  server.post("/dungeons", async (request) => {
    const data = request.body as any;
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
    const { id } = request.params as any;
    const data = request.body as any;
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
    const { id } = request.params as any;
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
    const { id } = request.params as any;
    await prisma.marketListing.delete({ where: { id } });
    return { success: true };
  });

  // --- Global Broadcast ---
  server.post("/broadcast", async (request) => {
    const { message } = request.body as any;
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
    const data = request.body as any;
    return await zoneService.createZone(data);
  });

  server.put("/zones/:id", async (request) => {
    const { id } = request.params as any;
    const data = request.body as any;
    return await zoneService.updateZone(id, data);
  });

  server.delete("/zones/:id", async (request) => {
    const { id } = request.params as any;
    await zoneService.deleteZone(id);
    return { success: true };
  });
}
