import { prisma } from "../lib/prisma.js";
import { equipmentService } from "./equipmentService.js";
import { Prisma } from "@prisma/client";
import type { Character } from "@prisma/client";
import { addTravelJob } from "./travelQueue.js";
import { inventoryService } from "./inventoryService.js";
import { gameDataManager } from "./gameDataManager.js";
import { GAME_BALANCE } from "../constants/gameBalance.js";
import { resolveLootRolls } from "./combatEngine.js";

/**
 * 🏰 DungeonService
 * Handles dungeon encounters — enter, fight rooms, treasure, boss.
 * Per README §4.3: No escape once inside. HP resets after each room.
 */
export class DungeonService {

  /**
   * Generate a dungeon encounter for the travel pulse
   */
  async generateDungeonEncounter(character: Character) {
    const dungeons = await prisma.dungeonTemplate.findMany({
      where: {
        minDepth: { lte: character.currentDepth },
        OR: [
          { maxDepth: null },
          { maxDepth: { gte: character.currentDepth } }
        ],
        minLevel: { lte: character.level },
        monsters: {
          some: { isBoss: true }
        }
      },
      include: {
        _count: {
          select: { monsters: true }
        }
      },
      orderBy: { minDepth: "desc" }
    });

    // Pick the most relevant dungeon that is also valid (has a boss and at least one regular mob)
    const validDungeons = dungeons.filter(d => d._count.monsters > 1);
    
    if (validDungeons.length === 0) return null;

    const dungeon = validDungeons[0];
    if (!dungeon) return null;

    return {
      type: "DUNGEON" as const,
      name: dungeon.name,
      description: dungeon.description,
      dungeonId: dungeon.id,
      floorCount: dungeon.floorCount,
      minLevel: dungeon.minLevel
    };
  }

  /**
   * Enter a dungeon — locks the player in
   */
  async enterDungeon(characterId: string) {
    const character = await prisma.character.findUnique({
      where: { id: characterId }
    });

    if (!character || !character.pendingEncounter) {
      throw new Error("No dungeon encounter pending");
    }

    const encounter: any = character.pendingEncounter;
    if (encounter.type !== "DUNGEON") {
      throw new Error("Pending encounter is not a dungeon");
    }

    // Fetch the full dungeon template
    const dungeon = await prisma.dungeonTemplate.findUnique({
      where: { id: encounter.dungeonId }
    });

    if (!dungeon) throw new Error("Dungeon not found");

    // Build the dungeon instance with all floors
    const depth = character.currentDepth;
    const hpMult = Math.min(GAME_BALANCE.MAX_SCALING_MULTIPLIER, (1 + (depth / GAME_BALANCE.HP_SCALING_DIVISOR)) * GAME_BALANCE.DUNGEON_HP_MULT);
    const statMult = Math.min(GAME_BALANCE.MAX_SCALING_MULTIPLIER, (1 + (depth / GAME_BALANCE.STAT_SCALING_DIVISOR)) * GAME_BALANCE.DUNGEON_STAT_MULT);
    const expMult = (1 + (depth / GAME_BALANCE.EXP_SCALING_DIVISOR)) * GAME_BALANCE.DUNGEON_EXP_MULT * dungeon.expMultiplier;

    const { regular, boss } = await gameDataManager.getDungeonMonsters(dungeon.id);
    
    if (!boss || regular.length === 0) {
      throw new Error("This dungeon is currently being renovated by the architects (Incomplete configuration).");
    }

    let pool = regular;
    const floors: any[] = [];
    for (let i = 1; i <= dungeon.floorCount; i++) {
      // 🎲 Roll for Special Room (Trap or Shrine)
      const specialRoll = Math.random();
      if (specialRoll < GAME_BALANCE.DUNGEON_TRAP_CHANCE) { // Trap
        floors.push({ type: "TRAP", floor: floors.length + 1, cleared: false, name: "Spike Trap", damagePct: GAME_BALANCE.DUNGEON_TRAP_DAMAGE_PCT });
      } else if (specialRoll < GAME_BALANCE.DUNGEON_TRAP_CHANCE + GAME_BALANCE.DUNGEON_SHRINE_CHANCE) { // Shrine
        floors.push({ type: "SHRINE", floor: floors.length + 1, cleared: false, name: "Ancient Shrine", healPct: GAME_BALANCE.DUNGEON_SHRINE_HEAL_PCT });
      }

      // 🎁 Check for treasure room before this floor
      if (i > 1 && Math.random() < dungeon.treasureChance) {
        floors.push({ type: "TREASURE", floor: floors.length + 1, cleared: false });
      }

      // Scale mob stats by floor number + depth multiplier
      const mTemplate = pool[Math.floor(Math.random() * pool.length)];
      const floorHp = Math.floor(mTemplate.hp * hpMult * (1 + (i * 0.1))) + (character.level * GAME_BALANCE.MONSTER_LEVEL_HP_BONUS);
      
      floors.push({
        type: "MOB",
        floor: floors.length + 1,
        cleared: false,
        monsterId: mTemplate.id,
        name: mTemplate.name,
        hp: floorHp,
        maxHp: floorHp,
        attack: Math.floor(mTemplate.attack * statMult * (1 + (i * 0.05))) + Math.floor(character.level * GAME_BALANCE.MONSTER_LEVEL_STAT_BONUS),
        defense: Math.floor(mTemplate.defense * statMult * (1 + (i * 0.05))) + Math.floor(character.level * GAME_BALANCE.MONSTER_LEVEL_STAT_BONUS),
        expReward: Math.floor(mTemplate.expReward * expMult * (1 + (i * 0.1)))
      });
    }

    // Add boss as final floor
    if (boss) {
      const bossHp = Math.floor(boss.hp * hpMult) + (character.level * GAME_BALANCE.MONSTER_LEVEL_HP_BONUS);
      floors.push({
        type: "BOSS",
        floor: floors.length + 1,
        cleared: false,
        monsterId: boss.id,
        name: boss.name,
        hp: bossHp,
        maxHp: bossHp,
        attack: Math.floor(boss.attack * statMult) + Math.floor(character.level * 1.5),
        defense: Math.floor(boss.defense * statMult) + Math.floor(character.level * 1.2),
        expReward: Math.floor(boss.expReward * expMult)
      });
    }

    const dungeonInstance = {
      templateId: dungeon.id,
      name: dungeon.name,
      lootMultiplier: dungeon.lootMultiplier,
      expMultiplier: dungeon.expMultiplier,
      totalFloors: floors.length,
      floors
    };

    // Lock character into dungeon
    await prisma.character.update({
      where: { id: characterId },
      data: {
        actionStatus: "IN_DUNGEON",
        dungeonProgress: 0,
        dungeonData: dungeonInstance as any,
        pendingEncounter: Prisma.DbNull,
        hp: character.maxHp // Full heal on entry
      }
    });

    return {
      success: true,
      dungeon: dungeonInstance,
      currentFloor: floors[0],
      message: `You descend into ${dungeon.name}...`
    };
  }

  /**
   * Fight the current dungeon floor
   */
  async fightFloor(characterId: string) {
    const character = await prisma.character.findUnique({
      where: { id: characterId }
    });

    if (!character || character.actionStatus !== "IN_DUNGEON" || !character.dungeonData) {
      throw new Error("Not currently in a dungeon");
    }

    const dungeon: any = character.dungeonData;
    const floorIndex = character.dungeonProgress || 0;
    const floor = dungeon.floors[floorIndex];

    if (!floor) throw new Error("No floor to fight");

    // 🏺 Handle Shrine (Heal)
    if (floor.type === "SHRINE") {
      const healAmount = Math.floor(character.maxHp * floor.healPct);
      const nextHp = Math.min(character.maxHp, character.hp + healAmount);
      
      dungeon.floors[floorIndex].cleared = true;
      const nextIndex = floorIndex + 1;
      const dungeonComplete = nextIndex >= dungeon.floors.length;

      await prisma.character.update({
        where: { id: characterId },
        data: {
          hp: nextHp,
          dungeonProgress: dungeonComplete ? null : nextIndex,
          dungeonData: dungeonComplete ? Prisma.DbNull : (dungeon as any),
          actionStatus: dungeonComplete ? (character.previousStatus || "IDLE") : "IN_DUNGEON"
        }
      });
      return { type: "SHRINE", message: `You prayed at the shrine. Restored ${healAmount} HP.`, nextFloor: dungeonComplete ? null : dungeon.floors[nextIndex] };
    }

    // 🕸️ Handle Trap (Damage)
    if (floor.type === "TRAP") {
      const damage = Math.floor(character.maxHp * floor.damagePct);
      const nextHp = Math.max(1, character.hp - damage); // Trap won't kill, leaves 1hp minimum

      dungeon.floors[floorIndex].cleared = true;
      const nextIndex = floorIndex + 1;
      const dungeonComplete = nextIndex >= dungeon.floors.length;

      await prisma.character.update({
        where: { id: characterId },
        data: {
          hp: nextHp,
          dungeonProgress: dungeonComplete ? null : nextIndex,
          dungeonData: dungeonComplete ? Prisma.DbNull : (dungeon as any),
          actionStatus: dungeonComplete ? (character.previousStatus || "IDLE") : "IN_DUNGEON"
        }
      });
      return { type: "TRAP", message: `You triggered a spike trap! Lost ${damage} HP.`, nextFloor: dungeonComplete ? null : dungeon.floors[nextIndex] };
    }

    // Handle treasure rooms
    if (floor.type === "TREASURE") {
      const treasureItems = ["IRON_ORE", "TIN_ORE", "T1_FIBER", "POTION_S"];
      const lootCode = treasureItems[Math.floor(Math.random() * treasureItems.length)] as string;
      const qty = Math.floor(Math.random() * 3) + 1;

      let lootWarning = "";
      try {
        await inventoryService.addItem(characterId, lootCode, qty);
      } catch (e: any) {
        lootWarning = ` (Loot lost: ${e.message})`;
      }

      // Mark floor cleared, advance
      dungeon.floors[floorIndex].cleared = true;
      const nextIndex = floorIndex + 1;
      const dungeonComplete = nextIndex >= dungeon.floors.length;

      await prisma.character.update({
        where: { id: characterId },
        data: {
          dungeonProgress: dungeonComplete ? null : nextIndex,
          dungeonData: dungeonComplete ? Prisma.DbNull : (dungeon as any),
          actionStatus: dungeonComplete ? (character.previousStatus || "IDLE") : "IN_DUNGEON",
          hp: character.maxHp // HP reset after each room
        }
      });

      const template = await gameDataManager.getItem(lootCode);

      return {
        type: "TREASURE",
        lootedItems: lootWarning ? [] : [{ 
          itemCode: lootCode, 
          quantity: qty,
          name: template?.name || lootCode,
          emoji: template?.emoji || "📦",
          rarityId: template?.rarityId || "COMMON"
        }],
        nextFloor: dungeonComplete ? null : dungeon.floors[nextIndex],
        floorIndex: dungeonComplete ? null : nextIndex,
        totalFloors: dungeon.totalFloors,
        message: `You found a treasure chest! +${qty}x ${lootCode}${lootWarning}`
      };
    }

    // Combat (MOB or BOSS)
    const stats = await equipmentService.getCharacterCombatStats(characterId);
    let playerHp = character.hp;
    let enemyHp = floor.hp;
    const combatLog: any[] = [];
    let turn = 1;

    while (playerHp > 0 && enemyHp > 0 && turn <= 100) {
      // Player attacks
      let pDmg = Math.max(1, Math.floor(stats.atk - floor.defense + (Math.random() * 4)));
      const isCrit = Math.random() < (character.luk * 0.02);
      if (isCrit) pDmg *= 2;
      enemyHp -= pDmg;
      combatLog.push({ turn, attacker: "Player", damage: pDmg, message: `You strike ${floor.name} for ${pDmg}!${isCrit ? ' CRIT!' : ''}` });

      if (enemyHp <= 0) break;

      // Enemy attacks
      let eDmg = Math.max(1, Math.floor(floor.attack - stats.def + (Math.random() * 3)));
      const dodged = Math.random() < (stats.agi * 0.015);
      if (dodged) {
        combatLog.push({ turn, attacker: "Enemy", damage: 0, message: `${floor.name} attacks but you dodge!` });
      } else {
        playerHp -= eDmg;
        combatLog.push({ turn, attacker: "Enemy", damage: eDmg, message: `${floor.name} hits you for ${eDmg}!` });
      }
      turn++;
    }

    const isWin = playerHp > 0;

    if (!isWin) {
      // Death Penalty: Ejected to City
      await prisma.character.update({
        where: { id: characterId },
        data: {
          hp: character.maxHp,
          currentDepth: 0,
          actionStatus: "IDLE",
          previousStatus: null,
          dungeonProgress: null,
          dungeonData: Prisma.DbNull
        }
      });

      await prisma.battleLog.create({
        data: {
          characterId,
          enemyName: `[Dungeon] ${floor.name}`,
          isWin: false,
          expGained: 0,
          logDetails: combatLog as any
        }
      });

      return { 
        type: "COMBAT", 
        isWin: false, 
        log: { 
          logDetails: combatLog, 
          enemyName: `[Dungeon] ${floor.name}` 
        }, 
        message: `You were defeated by ${floor.name}. Ejected from the dungeon.` 
      };
    }

    // Win — award exp, advance floor
    const expGained = floor.expReward || 0;
    let newLevel = character.level;
    let newExp = character.exp + expGained;
    let levelGain = 0;
    while (newExp >= newLevel * 100) {
      newExp -= newLevel * 100;
      newLevel++;
      levelGain++;
    }

    dungeon.floors[floorIndex].cleared = true;
    const nextIndex = floorIndex + 1;
    const dungeonComplete = nextIndex >= dungeon.floors.length;

    // Loot on kill
    const loot: any[] = [];
    let lootWarning = "";

    // 1. Roll for standard mob loot if applicable
    if (floor.monsterId) {
      const monsterTemplate = await gameDataManager.getMonster(floor.name);
      if (monsterTemplate && monsterTemplate.lootTable) {
        const stats = await equipmentService.getCharacterCombatStats(characterId);
        const rolledLoot = await resolveLootRolls(character, stats, monsterTemplate.lootTable, dungeon.lootMultiplier || 1.0);
        
        for (const item of rolledLoot) {
          try {
            await inventoryService.addItem(characterId, item.itemCode, item.quantity);
            const template = await gameDataManager.getItem(item.itemCode);
            loot.push({
              itemCode: item.itemCode,
              quantity: item.quantity,
              name: template?.name || item.itemCode,
              emoji: template?.emoji || "📦",
              rarityId: template?.rarityId || "COMMON"
            });
          } catch (e: any) {
            lootWarning += ` (Loot lost: ${e.message})`;
          }
        }
      }
    }

    const nextMaxHp = character.maxHp + (levelGain * 10);
    const nextHp = nextMaxHp; // HP full reset after each room (per README)
    const nextStatus = dungeonComplete ? (character.previousStatus || "IDLE") : "IN_DUNGEON";

    await prisma.character.update({
      where: { id: characterId },
      data: {
        hp: nextHp,
        exp: newExp,
        level: newLevel,
        statPoints: { increment: levelGain * 5 },
        maxHp: nextMaxHp,
        dungeonProgress: dungeonComplete ? null : nextIndex,
        dungeonData: dungeonComplete ? Prisma.DbNull : (dungeon as any),
        actionStatus: nextStatus,
        previousStatus: dungeonComplete ? null : character.previousStatus
      }
    });

    // 🚀 Resumption Logic: If dungeon complete and was traveling, resume pulse
    if (dungeonComplete && (nextStatus === "TRAVELING_OUT" || nextStatus === "TRAVELING_IN")) {
      await addTravelJob(characterId);
    }

    await prisma.battleLog.create({
      data: {
        characterId,
        enemyName: `[Dungeon] ${floor.name}`,
        isWin: true,
        expGained,
        logDetails: combatLog as any
      }
    });

    return {
      type: "COMBAT",
      isWin: true,
      log: { 
        logDetails: combatLog, 
        enemyName: `[Dungeon] ${floor.name}` 
      },
      experienceGained: expGained,
      goldGained: 0,
      lootedItems: loot,
      dungeonComplete,
      nextFloor: dungeonComplete ? null : dungeon.floors[nextIndex],
      floorIndex: dungeonComplete ? null : nextIndex,
      totalFloors: dungeon.totalFloors,
      message: dungeonComplete
        ? `You defeated ${floor.name} and conquered the dungeon!${lootWarning}`
        : `You defeated ${floor.name}! HP restored. Advancing to next room...${lootWarning}`
    };
  }

  /**
   * Get current dungeon state for the UI
   */
  async getDungeonState(characterId: string) {
    const character = await prisma.character.findUnique({
      where: { id: characterId }
    });

    if (!character || character.actionStatus !== "IN_DUNGEON" || !character.dungeonData) {
      return null;
    }

    const dungeon: any = character.dungeonData;
    const floorIndex = character.dungeonProgress || 0;

    return {
      name: dungeon.name,
      currentFloor: dungeon.floors[floorIndex],
      floorIndex,
      totalFloors: dungeon.totalFloors,
      hp: character.hp,
      maxHp: character.maxHp
    };
  }
}

export const dungeonService = new DungeonService();
