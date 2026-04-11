import { prisma } from "../lib/prisma.js";
import { gameDataManager } from "./gameDataManager.js";
import { equipmentService } from "./equipmentService.js";
import { inventoryService } from "./inventoryService.js";
import { Prisma } from "@prisma/client";
import { GAME_BALANCE } from "../constants/gameBalance.js";
/**
 * 📊 RADIAL DEPTH TIERS & REWARDS
 */
export const getDepthTier = (depth) => {
    if (depth >= 2000)
        return { name: "Nightmare", dangerMult: 2.5, expMult: 5.0, lootMult: 3.0, prefix: "[Nightmare] " };
    if (depth >= 1000)
        return { name: "Elite", dangerMult: 1.5, expMult: 2.0, lootMult: 1.5, prefix: "[Elite] " };
    if (depth >= 500)
        return { name: "Veteran", dangerMult: 1.2, expMult: 1.25, lootMult: 1.12, prefix: "[Veteran] " };
    return { name: "Standard", dangerMult: 1.0, expMult: 1.0, lootMult: 1.0, prefix: "" };
};
/**
 * 🛠️ CORE LEVELING LOGIC
 */
function calculateLevelUp(currentLevel, currentExp, gainedExp) {
    let level = currentLevel;
    let exp = currentExp + gainedExp;
    let levelGain = 0;
    while (true) {
        const required = level * 100;
        if (exp >= required) {
            exp -= required;
            level += 1;
            levelGain += 1;
        }
        else {
            break;
        }
    }
    return { level, exp, levelGain };
}
export async function generatePVEEncounter(character) {
    const depth = character.currentDepth;
    const tier = getDepthTier(depth);
    const monster = await gameDataManager.getRandomMonster();
    if (!monster)
        throw new Error("No monsters defined in database");
    const hpMult = (1 + (depth / 200)) * tier.dangerMult;
    const statMult = (1 + (depth / 250)) * tier.dangerMult;
    const expMult = (1 + (Math.floor(depth / 50) * 0.05)) * tier.expMult;
    const scaledHp = Math.floor(monster.hp * hpMult) + (character.level * GAME_BALANCE.MONSTER_LEVEL_HP_BONUS);
    return {
        type: "PVE",
        name: tier.prefix + monster.name,
        hp: scaledHp,
        maxHp: scaledHp,
        attack: Math.floor(monster.attack * statMult) + Math.floor(character.level * GAME_BALANCE.MONSTER_LEVEL_STAT_BONUS),
        defense: Math.floor(monster.defense * statMult) + Math.floor(character.level * GAME_BALANCE.MONSTER_LEVEL_STAT_BONUS),
        expValue: Math.floor(monster.expReward * expMult) + (character.level * GAME_BALANCE.MONSTER_LEVEL_EXP_BONUS)
    };
}
export async function generateGatheringEncounter(character) {
    const depth = character.currentDepth;
    const nodes = await gameDataManager.getResourceNodes();
    if (!nodes || nodes.length === 0)
        throw new Error("No resource nodes defined in database");
    const node = nodes[Math.floor(Math.random() * nodes.length)];
    if (!node)
        throw new Error("Failed to select resource node");
    const tier = getDepthTier(depth);
    const hpMult = (1 + (depth / 300)) * tier.dangerMult;
    const rewardMult = (1 + (depth / 500)) * tier.expMult;
    const integrity = Math.floor(node.baseHp * hpMult);
    return {
        type: "GATHERING",
        name: node.name,
        icon: node.icon,
        hp: integrity,
        maxHp: integrity,
        xpReward: Math.floor(node.xpReward * rewardMult),
        resourceNodeTemplateId: node.id
    };
}
export async function executeCombat(character, enemy) {
    let enemyHp = enemy.hp;
    const enemyAttack = enemy.attack;
    const enemyDefense = enemy.defense;
    let playerHp = character.hp;
    const stats = await equipmentService.getCharacterCombatStats(character.id);
    const playerAttack = stats.atk;
    const playerDefense = stats.def;
    let turnCounter = 1;
    const combatLog = [];
    while (playerHp > 0 && enemyHp > 0) {
        let playerDamage = Math.max(1, Math.floor(playerAttack - enemyDefense + (Math.random() * 4)));
        const isCrit = Math.random() < (stats.luk * GAME_BALANCE.BASE_CRIT_MODIFIER);
        if (isCrit)
            playerDamage *= 2;
        enemyHp -= playerDamage;
        combatLog.push({
            turn: turnCounter,
            attacker: "Player",
            damage: playerDamage,
            message: `${character.name} attacks ${enemy.name} for ${playerDamage} damage!${isCrit ? ' (CRITICAL HIT!)' : ''}`
        });
        if (enemyHp <= 0)
            break;
        let enemyDamage = Math.max(1, Math.floor(enemyAttack - playerDefense + (Math.random() * 3)));
        const isDodged = Math.random() < (stats.agi * GAME_BALANCE.BASE_DODGE_MODIFIER);
        if (isDodged) {
            combatLog.push({ turn: turnCounter, attacker: "Enemy", damage: 0, message: `${enemy.name} attacks, but ${character.name} dodged swiftlly!` });
        }
        else {
            playerHp -= enemyDamage;
            combatLog.push({ turn: turnCounter, attacker: "Enemy", damage: enemyDamage, message: `${enemy.name} strikes ${character.name} for ${enemyDamage} damage!` });
        }
        turnCounter++;
        if (turnCounter > 100)
            break;
    }
    const isWin = playerHp > 0;
    let finalExp = isWin ? (enemy.expValue || 0) : 0;
    const { level, exp, levelGain } = calculateLevelUp(character.level, character.exp, finalExp);
    const nextMaxHp = character.maxHp + (levelGain * 10);
    let nextHp = Math.max(1, playerHp);
    let nextDepth = character.currentDepth;
    let nextStatus = character.previousStatus || "IDLE";
    if (isWin) {
        const healAmount = Math.floor(nextMaxHp * GAME_BALANCE.VICTORY_HEAL_PCT);
        nextHp = Math.min(nextMaxHp, nextHp + healAmount);
    }
    else {
        nextHp = nextMaxHp;
        nextDepth = 0;
        nextStatus = "IDLE";
    }
    const updatedChar = await prisma.character.update({
        where: { id: character.id },
        data: {
            hp: nextHp,
            exp, level,
            currentDepth: nextDepth,
            statPoints: { increment: levelGain * 5 },
            maxHp: nextMaxHp,
            actionStatus: nextStatus,
            previousStatus: null,
            pendingEncounter: Prisma.DbNull
        }
    });
    const lootedItems = [];
    if (isWin) {
        const monsterTemplate = await gameDataManager.getMonster(enemy.name.replace(/^\[.*\] /, ""));
        if (monsterTemplate && monsterTemplate.lootTable) {
            const lootResult = await resolveLootRolls(character, stats, monsterTemplate.lootTable);
            lootedItems.push(...lootResult);
        }
    }
    const savedLog = await prisma.battleLog.create({
        data: {
            characterId: character.id,
            enemyName: enemy.name,
            isWin,
            expGained: finalExp,
            logDetails: combatLog
        }
    });
    return { success: true, isWin, updatedChar, log: savedLog, loot: lootedItems };
}
export async function executeGathering(character, node) {
    const stats = await equipmentService.getCharacterCombatStats(character.id);
    const gatherPower = Math.max(2, Math.floor(stats.dex * 1.5 + stats.int * 0.5));
    let integrity = node.hp;
    let turnCounter = 1;
    const gatherLog = [];
    while (integrity > 0 && turnCounter <= 20) {
        let damage = Math.max(3, Math.floor(gatherPower + (Math.random() * 5)));
        const isPerfect = Math.random() < (stats.luk * GAME_BALANCE.GATHER_CRIT_MODIFIER);
        if (isPerfect)
            damage *= 2;
        integrity -= damage;
        gatherLog.push({
            turn: turnCounter,
            attacker: "Player",
            damage: damage,
            message: `You strike the ${node.name} for ${damage} progress!${isPerfect ? " (PERFECT STRIKE!)" : ""}`
        });
        turnCounter++;
    }
    const { level, exp, levelGain } = calculateLevelUp(character.level, character.exp, node.xpReward || 0);
    const updatedChar = await prisma.character.update({
        where: { id: character.id },
        data: {
            exp, level,
            statPoints: { increment: levelGain * 5 },
            maxHp: { increment: levelGain * 10 },
            actionStatus: character.previousStatus || "IDLE",
            previousStatus: null,
            pendingEncounter: Prisma.DbNull
        }
    });
    const savedLog = await prisma.battleLog.create({
        data: { characterId: character.id, enemyName: `Gathering: ${node.name}`, isWin: true, expGained: node.xpReward || 0, logDetails: gatherLog }
    });
    const lootedItems = [];
    const nodes = await gameDataManager.getResourceNodes();
    const nodeTemplate = nodes.find(n => n.id === node.resourceNodeTemplateId);
    if (nodeTemplate && nodeTemplate.lootTable) {
        const lootResult = await resolveLootRolls(character, stats, nodeTemplate.lootTable);
        lootedItems.push(...lootResult);
    }
    return { success: true, type: "GATHERING", item: node.name, amount: lootedItems.length, updatedChar, log: savedLog, startIntegrity: node.maxHp, loot: lootedItems };
}
/**
 * 🎲 EQUIPMENT STAT ROLLER
 * Generates random variances for item stats.
 */
function generateEquipmentRolls(stats, template) {
    const luckBonus = (stats.luk * 0.005); // 100 LUK = +50% roll floor improvement
    const minMult = 0.8 + luckBonus;
    const maxMult = 1.2 + luckBonus;
    const roll = (base) => {
        if (!base)
            return null;
        const mult = minMult + (Math.random() * (maxMult - minMult));
        return Math.floor(base * mult);
    };
    return {
        rolledAtk: roll(template.statAtk),
        rolledDef: roll(template.statDef),
        rolledStr: roll(template.statStr),
        rolledAgi: roll(template.statAgi),
        rolledInt: roll(template.statInt),
        rolledLuk: roll(template.statLuk),
    };
}
/**
 * 🎲 UNIVERSAL LOOT ROLLER
 * Handles depth-scaling, Rarity modifiers, and Luck bonuses.
 */
async function resolveLootRolls(character, stats, lootTable) {
    const depth = character.currentDepth;
    const tier = getDepthTier(depth);
    const lootedCodes = [];
    // Base Multiplier: 1 + (Depth / Interval * Growth) + (LUK * Bonus)
    const depthIntervals = Math.floor(depth / GAME_BALANCE.LOOT_DEPTH_INTERVAL);
    const baseDepthMult = (depthIntervals * GAME_BALANCE.LOOT_CHANCE_GROWTH);
    const lukMult = (stats.luk * GAME_BALANCE.LOOT_LUK_QUALITY_BONUS);
    const totalLootMult = (1 + baseDepthMult + lukMult) * tier.lootMult;
    const quantityMult = 1 + (depthIntervals * GAME_BALANCE.LOOT_QUANTITY_GROWTH);
    for (const entry of lootTable) {
        // Rarity scaling: Rare items benefit more from high depth multipliers
        // item.rarity might be included if we eager load it in GameDataManager
        const rarityRank = entry.item?.rarity?.rank || 1;
        const rarityScale = Math.pow(totalLootMult, 1 + (rarityRank * 0.05));
        // Apply depth bonus specific to the loot entry if any
        const finalChance = Math.min(0.9, (entry.chance + (depth * entry.depthBonus)) * rarityScale);
        if (Math.random() < finalChance) {
            const baseQty = Math.floor(Math.random() * (entry.maxQuantity - entry.minQuantity + 1)) + entry.minQuantity;
            const finalQty = Math.max(1, Math.floor(baseQty * quantityMult));
            try {
                const itemTemplate = await gameDataManager.getItem(entry.itemCode);
                let rolls = {};
                if (itemTemplate?.type === "EQUIPMENT") {
                    rolls = generateEquipmentRolls(stats, itemTemplate);
                }
                await inventoryService.addItem(character.id, entry.itemCode, finalQty, rolls);
                lootedCodes.push(`${entry.itemCode} x${finalQty}`);
            }
            catch (e) {
                console.warn(`Loot failed: ${e.message}`);
            }
        }
    }
    // SURPRISE WORLD DROPS (Rare chance to hit Mythical gear)
    const worldDropChance = GAME_BALANCE.GLOBAL_MYTHICAL_CHANCE * totalLootMult;
    if (Math.random() < worldDropChance) {
        const allItems = await gameDataManager.getAllItems();
        const mythicalItems = allItems.filter(i => i.rarityId === "MYTHICAL");
        if (mythicalItems.length > 0) {
            const drop = mythicalItems[Math.floor(Math.random() * mythicalItems.length)];
            await inventoryService.addItem(character.id, drop.code, 1);
            lootedCodes.push(`${drop.code} (WORLD DROP!)`);
        }
    }
    return lootedCodes;
}
/**
 * ⚔️ PVP COMBAT RESOLUTION
 */
export async function resolvePvpCombat(attackerId, defenderId) {
    const attackerChar = await prisma.character.findUnique({ where: { id: attackerId }, include: { inventory: true } });
    const defenderChar = await prisma.character.findUnique({ where: { id: defenderId }, include: { inventory: true } });
    if (!attackerChar || !defenderChar)
        throw new Error("Character not found");
    const attackerStats = await equipmentService.getCharacterCombatStats(attackerId);
    const defenderStats = await equipmentService.getCharacterCombatStats(defenderId);
    let p1Hp = attackerChar.hp;
    let p2Hp = defenderChar.hp;
    const combatLog = [];
    let turn = 1;
    while (p1Hp > 0 && p2Hp > 0 && turn <= 100) {
        let d1 = Math.max(1, Math.floor(attackerStats.atk - defenderStats.def + (Math.random() * 5)));
        const c1 = Math.random() < (attackerStats.luk * GAME_BALANCE.PVP_CRIT_MODIFIER);
        if (c1)
            d1 *= 2;
        p2Hp -= d1;
        combatLog.push({ turn, attacker: "Player", damage: d1, message: `${attackerChar.name} hits ${defenderChar.name} for ${d1}!${c1 ? ' CRIT!' : ''}` });
        if (p2Hp <= 0)
            break;
        let d2 = Math.max(1, Math.floor(defenderStats.atk - attackerStats.def + (Math.random() * 5)));
        const c2 = Math.random() < (defenderStats.luk * GAME_BALANCE.PVP_CRIT_MODIFIER);
        if (c2)
            d2 *= 2;
        p1Hp -= d2;
        combatLog.push({ turn, attacker: "Enemy", damage: d2, message: `${defenderChar.name} hits ${attackerChar.name} for ${d2}!` });
        turn++;
    }
    const isAttackerWin = p1Hp > 0;
    const winner = isAttackerWin ? attackerChar : defenderChar;
    const loser = isAttackerWin ? defenderChar : attackerChar;
    const healAmount = Math.floor(winner.maxHp * GAME_BALANCE.VICTORY_HEAL_PCT);
    const winnerNextHp = Math.min(winner.maxHp, (isAttackerWin ? p1Hp : p2Hp) + healAmount);
    const loserGoldLost = Math.floor(loser.gold * GAME_BALANCE.DEATH_PENALTY_GOLD_PCT);
    const droppedItems = [];
    await prisma.$transaction(async (tx) => {
        await tx.character.update({ where: { id: winner.id }, data: { hp: winnerNextHp, gold: { increment: loserGoldLost }, actionStatus: "IDLE", pendingEncounter: Prisma.DbNull } });
        await tx.character.update({ where: { id: loser.id }, data: { hp: loser.maxHp, gold: { decrement: loserGoldLost }, currentDepth: 0, actionStatus: "IDLE", pendingEncounter: Prisma.DbNull } });
        const loserInv = await tx.inventoryItem.findMany({ where: { characterId: loser.id } });
        for (const item of loserInv) {
            if (Math.random() < GAME_BALANCE.PVP_LOOT_DROP_CHANCE) {
                await tx.inventoryItem.delete({ where: { id: item.id } });
            }
            else {
                const existing = await tx.inventoryItem.findFirst({ where: { characterId: winner.id, itemCode: item.itemCode, rolledAtk: item.rolledAtk } });
                if (existing && item.rolledAtk === null) {
                    await tx.inventoryItem.update({ where: { id: existing.id }, data: { quantity: { increment: item.quantity } } });
                    await tx.inventoryItem.delete({ where: { id: item.id } });
                }
                else {
                    await tx.inventoryItem.update({ where: { id: item.id }, data: { characterId: winner.id } });
                }
                droppedItems.push(item.itemCode);
            }
        }
    });
    return {
        isWin: isAttackerWin,
        winnerName: winner.name,
        loserName: loser.name,
        goldStolen: loserGoldLost,
        lootedItems: droppedItems,
        log: { logDetails: combatLog, enemyName: isAttackerWin ? defenderChar.name : attackerChar.name },
        // Starting HP for autobattler seeding
        attackerName: attackerChar.name,
        defenderName: defenderChar.name,
        attackerStartHp: attackerChar.hp,
        attackerMaxHp: attackerChar.maxHp,
        defenderStartHp: defenderChar.hp,
        defenderMaxHp: defenderChar.maxHp,
    };
}
//# sourceMappingURL=combatEngine.js.map