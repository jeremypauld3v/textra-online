import { prisma } from "../lib/prisma.js";
import { equipmentService } from "./equipmentService.js";
import { dungeonService } from "./dungeonService.js";
import { getDepthTier } from "./combatEngine.js";

export async function getCharacterStatusPayload(characterId: string) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    include: {
      battleLogs: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!character) {
    throw new Error("Character not found");
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

  // Prune character from nested logs to prevent circular references
  const latestBattles = character.battleLogs.map((log) => ({
    ...log,
    character: undefined,
  }));

  // Return a clean version of character without the nested array
  const characterData = { ...character, battleLogs: undefined };

  // Get Combat Stats (Base + Gear)
  const combatStats = await equipmentService.getCharacterCombatStats(characterId);

  // Get Dungeon State if applicable
  const dungeonState = await dungeonService.getDungeonState(characterId);

  // Calculate Depth Tier & Rewards
  const depth = character.currentDepth;
  const tier = await getDepthTier(depth);
  const depthExpBonus = Math.round((tier.expMult - 1) * 100 + (Math.floor(depth / 50) * 5));

  return {
    character: {
      ...characterData,
      ...combatStats,
      maxEnergy: combatStats.maxEnergy,
      dungeonState,
      locationName:
        character.currentDepth === 0
          ? "Valoria City"
          : tier.name || `${character.currentDepth}km from City`,
      isSafe: character.currentDepth < 200,
      rankName: tier.name,
      dangerLevel: tier.dangerMult.toFixed(1) + "x",
      expBonus: depthExpBonus,
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
  };
}
