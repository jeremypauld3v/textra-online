import { prisma } from "../lib/prisma.js";
import { equipmentService } from "./equipmentService.js";
import { Prisma } from "@prisma/client";
import { addTravelJob } from "./travelQueue.js";
/**
 * 🏰 DungeonService
 * Handles dungeon encounters — enter, fight rooms, treasure, boss.
 * Per README §4.3: No escape once inside. HP resets after each room.
 */
export class DungeonService {
    /**
     * Generate a dungeon encounter for the travel pulse
     */
    async generateDungeonEncounter(character) {
        const dungeon = await prisma.dungeonTemplate.findFirst({
            where: {
                minDepth: { lte: character.currentDepth },
                OR: [
                    { maxDepth: null },
                    { maxDepth: { gte: character.currentDepth } }
                ],
                minLevel: { lte: character.level }
            },
            orderBy: { minDepth: "desc" }
        });
        if (!dungeon)
            return null;
        return {
            type: "DUNGEON",
            name: dungeon.name,
            description: dungeon.description,
            dungeonId: dungeon.id,
            floorCount: dungeon.floorCount,
            bossName: dungeon.bossName,
            minLevel: dungeon.minLevel
        };
    }
    /**
     * Enter a dungeon — locks the player in
     */
    async enterDungeon(characterId) {
        const character = await prisma.character.findUnique({
            where: { id: characterId }
        });
        if (!character || !character.pendingEncounter) {
            throw new Error("No dungeon encounter pending");
        }
        const encounter = character.pendingEncounter;
        if (encounter.type !== "DUNGEON") {
            throw new Error("Pending encounter is not a dungeon");
        }
        // Fetch the full dungeon template
        const dungeon = await prisma.dungeonTemplate.findUnique({
            where: { id: encounter.dungeonId }
        });
        if (!dungeon)
            throw new Error("Dungeon not found");
        // Build the dungeon instance with all floors
        const depth = character.currentDepth;
        const hpMult = 1 + (depth / 200);
        const statMult = 1 + (depth / 250);
        const expMult = 1 + (depth / 150);
        const floors = [];
        for (let i = 1; i <= dungeon.floorCount; i++) {
            // 🎲 Roll for Special Room (Trap or Shrine)
            const specialRoll = Math.random();
            if (specialRoll < 0.15) { // 15% Trap
                floors.push({ type: "TRAP", floor: floors.length + 1, cleared: false, name: "Spike Trap", damagePct: 0.1 });
            }
            else if (specialRoll < 0.25) { // 10% Shrine
                floors.push({ type: "SHRINE", floor: floors.length + 1, cleared: false, name: "Ancient Shrine", healPct: 0.3 });
            }
            // 🎁 Check for treasure room before this floor
            if (i > 1 && Math.random() < dungeon.treasureChance) {
                floors.push({ type: "TREASURE", floor: floors.length + 1, cleared: false });
            }
            // Scale mob stats by floor number + depth multiplier
            const floorHp = Math.floor((40 + (i * 20)) * hpMult) + (character.level * 5);
            floors.push({
                type: "MOB",
                floor: floors.length + 1,
                cleared: false,
                name: `${dungeon.name} Guardian (F${i})`,
                hp: floorHp,
                maxHp: floorHp,
                attack: Math.floor((8 + (i * 4)) * statMult) + Math.floor(character.level * 1.5),
                defense: Math.floor((5 + (i * 3)) * statMult) + Math.floor(character.level * 1.0),
                expReward: Math.floor((20 + (i * 12)) * expMult)
            });
        }
        // Add boss as final floor
        const bossHp = Math.floor(dungeon.bossHp * hpMult) + (character.level * 5);
        floors.push({
            type: "BOSS",
            floor: floors.length + 1,
            cleared: false,
            name: dungeon.bossName,
            hp: bossHp,
            maxHp: bossHp,
            attack: Math.floor(dungeon.bossAttack * statMult) + Math.floor(character.level * 1.5),
            defense: Math.floor(dungeon.bossDefense * statMult) + Math.floor(character.level * 1.2),
            expReward: Math.floor(dungeon.bossExpReward * expMult),
            lootItemCode: dungeon.lootItemCode
        });
        const dungeonInstance = {
            templateId: dungeon.id,
            name: dungeon.name,
            totalFloors: floors.length,
            floors
        };
        // Lock character into dungeon
        await prisma.character.update({
            where: { id: characterId },
            data: {
                actionStatus: "IN_DUNGEON",
                dungeonProgress: 0,
                dungeonData: dungeonInstance,
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
    async fightFloor(characterId) {
        const character = await prisma.character.findUnique({
            where: { id: characterId }
        });
        if (!character || character.actionStatus !== "IN_DUNGEON" || !character.dungeonData) {
            throw new Error("Not currently in a dungeon");
        }
        const dungeon = character.dungeonData;
        const floorIndex = character.dungeonProgress || 0;
        const floor = dungeon.floors[floorIndex];
        if (!floor)
            throw new Error("No floor to fight");
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
                    dungeonData: dungeonComplete ? Prisma.DbNull : dungeon,
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
                    dungeonData: dungeonComplete ? Prisma.DbNull : dungeon,
                    actionStatus: dungeonComplete ? (character.previousStatus || "IDLE") : "IN_DUNGEON"
                }
            });
            return { type: "TRAP", message: `You triggered a spike trap! Lost ${damage} HP.`, nextFloor: dungeonComplete ? null : dungeon.floors[nextIndex] };
        }
        // Handle treasure rooms
        if (floor.type === "TREASURE") {
            const treasureItems = ["IRON_ORE", "SILVER_ORE", "HERB", "HEALTH_POTION"];
            const lootCode = treasureItems[Math.floor(Math.random() * treasureItems.length)];
            const qty = Math.floor(Math.random() * 3) + 1;
            const existing = await prisma.inventoryItem.findFirst({
                where: { characterId, itemCode: lootCode }
            });
            if (existing) {
                await prisma.inventoryItem.update({
                    where: { id: existing.id },
                    data: { quantity: { increment: qty } }
                });
            }
            else {
                await prisma.inventoryItem.create({
                    data: { characterId, itemCode: lootCode, quantity: qty }
                });
            }
            // Mark floor cleared, advance
            dungeon.floors[floorIndex].cleared = true;
            const nextIndex = floorIndex + 1;
            const hasNext = nextIndex < dungeon.floors.length;
            await prisma.character.update({
                where: { id: characterId },
                data: {
                    dungeonProgress: nextIndex,
                    dungeonData: dungeon,
                    hp: character.maxHp // HP reset after each room
                }
            });
            return {
                type: "TREASURE",
                loot: [{ itemCode: lootCode, quantity: qty }],
                nextFloor: hasNext ? dungeon.floors[nextIndex] : null,
                floorIndex: nextIndex,
                totalFloors: dungeon.totalFloors,
                message: `You found a treasure chest! +${qty}x ${lootCode}`
            };
        }
        // Combat (MOB or BOSS)
        const stats = await equipmentService.getCharacterCombatStats(characterId);
        let playerHp = character.hp;
        let enemyHp = floor.hp;
        const combatLog = [];
        let turn = 1;
        while (playerHp > 0 && enemyHp > 0 && turn <= 100) {
            // Player attacks
            let pDmg = Math.max(1, Math.floor(stats.atk - floor.defense + (Math.random() * 4)));
            const isCrit = Math.random() < (character.luk * 0.02);
            if (isCrit)
                pDmg *= 2;
            enemyHp -= pDmg;
            combatLog.push({ turn, attacker: "Player", damage: pDmg, message: `You strike ${floor.name} for ${pDmg}!${isCrit ? ' CRIT!' : ''}` });
            if (enemyHp <= 0)
                break;
            // Enemy attacks
            let eDmg = Math.max(1, Math.floor(floor.attack - stats.def + (Math.random() * 3)));
            const dodged = Math.random() < (stats.agi * 0.015);
            if (dodged) {
                combatLog.push({ turn, attacker: "Enemy", damage: 0, message: `${floor.name} attacks but you dodge!` });
            }
            else {
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
                    logDetails: combatLog
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
        // Loot on boss kill
        const loot = [];
        if (floor.type === "BOSS" && floor.lootItemCode) {
            const existing = await prisma.inventoryItem.findFirst({
                where: { characterId, itemCode: floor.lootItemCode }
            });
            if (existing) {
                await prisma.inventoryItem.update({
                    where: { id: existing.id },
                    data: { quantity: { increment: 1 } }
                });
            }
            else {
                await prisma.inventoryItem.create({
                    data: { characterId, itemCode: floor.lootItemCode, quantity: 1 }
                });
            }
            loot.push({ itemCode: floor.lootItemCode, quantity: 1 });
        }
        const nextMaxHp = character.maxHp + (levelGain * 10);
        const healAmount = Math.floor(nextMaxHp * 0.2);
        const nextHp = Math.min(nextMaxHp, playerHp + healAmount);
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
                dungeonData: dungeonComplete ? Prisma.DbNull : dungeon,
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
                logDetails: combatLog
            }
        });
        return {
            type: "COMBAT",
            isWin: true,
            log: {
                logDetails: combatLog,
                enemyName: `[Dungeon] ${floor.name}`
            },
            expGained,
            loot,
            dungeonComplete,
            nextFloor: dungeonComplete ? null : dungeon.floors[nextIndex],
            floorIndex: dungeonComplete ? null : nextIndex,
            totalFloors: dungeon.totalFloors,
            message: dungeonComplete
                ? `You defeated ${floor.name} and conquered the dungeon!`
                : `You defeated ${floor.name}! HP restored. Advancing to next room...`
        };
    }
    /**
     * Get current dungeon state for the UI
     */
    async getDungeonState(characterId) {
        const character = await prisma.character.findUnique({
            where: { id: characterId }
        });
        if (!character || character.actionStatus !== "IN_DUNGEON" || !character.dungeonData) {
            return null;
        }
        const dungeon = character.dungeonData;
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
//# sourceMappingURL=dungeonService.js.map