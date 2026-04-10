import { prisma } from "../lib/prisma.js";
import { gameDataManager } from "./gameDataManager.js";
import { equipmentService } from "./equipmentService.js";
import { Prisma } from "@prisma/client";
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
    // Fetch from DB via DataManager
    const monster = await gameDataManager.getRandomMonster();
    if (!monster)
        throw new Error("No monsters defined in database");
    // Scaling Math (Radial Depth System) + Tier Modifiers
    const hpMult = (1 + (depth / 200)) * tier.dangerMult;
    const statMult = (1 + (depth / 250)) * tier.dangerMult;
    // Final Exp Mult (Combines linear scaling with Tier Jump)
    const expMult = (1 + (Math.floor(depth / 50) * 0.05)) * tier.expMult;
    const scaledHp = Math.floor(monster.hp * hpMult) + (character.level * 5);
    return {
        type: "PVE",
        name: tier.prefix + monster.name,
        hp: scaledHp,
        maxHp: scaledHp,
        attack: Math.floor(monster.attack * statMult) + Math.floor(character.level * 1.2),
        defense: Math.floor(monster.defense * statMult) + Math.floor(character.level * 1.2),
        expValue: Math.floor(monster.expReward * expMult) + (character.level * 2)
    };
}
export async function generateGatheringEncounter(character) {
    const depth = character.currentDepth;
    // Fetch from DB via DataManager
    const nodes = await gameDataManager.getResourceNodes();
    if (!nodes || nodes.length === 0)
        throw new Error("No resource nodes defined in database");
    const node = nodes[Math.floor(Math.random() * nodes.length)];
    if (!node)
        throw new Error("Failed to select resource node");
    const amount = Math.floor(Math.random() * 3) + 1;
    const hpMult = 1 + (depth / 300);
    const rewardMult = 1 + (depth / 500);
    const integrity = Math.floor((node.baseHp + (amount * 5)) * hpMult);
    return {
        type: "GATHERING",
        name: node.name,
        icon: node.icon,
        amount,
        hp: integrity,
        maxHp: integrity,
        xpReward: Math.floor((node.xpReward * amount) * rewardMult),
        itemCode: node.itemCode
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
        const isCrit = Math.random() < (character.luk * 0.02);
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
        const isDodged = Math.random() < (character.agi * 0.015);
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
        // Perk: +20% HP restore on win
        const healAmount = Math.floor(nextMaxHp * 0.2);
        nextHp = Math.min(nextMaxHp, nextHp + healAmount);
    }
    else {
        // Death Penalty: Reset to City
        nextHp = nextMaxHp; // Restored at city
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
    // Roll for Loot from DB Template
    const lootedItems = [];
    if (isWin) {
        const monsterTemplate = await gameDataManager.getMonster(enemy.name.replace(/^\[.*\] /, "")); // Strip Rank for lookup
        if (monsterTemplate && monsterTemplate.lootTable) {
            const tier = getDepthTier(character.currentDepth);
            const lootMult = (1 + (Math.floor(character.currentDepth / 50) * 0.02)) * tier.lootMult;
            for (const entry of monsterTemplate.lootTable) {
                // Scale drop chance by distance & Tier (Cap at 90%)
                const dropChance = Math.min(0.9, entry.chance * lootMult);
                if (Math.random() < dropChance) {
                    await prisma.inventoryItem.upsert({
                        where: { characterId_itemCode: { characterId: character.id, itemCode: entry.itemCode } },
                        update: { quantity: { increment: 1 } },
                        create: { characterId: character.id, itemCode: entry.itemCode, quantity: 1 }
                    });
                    lootedItems.push(entry.itemCode);
                }
            }
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
    const amount = node.amount;
    const xp = node.xpReward;
    let integrity = node.hp;
    const maxIntegrity = node.maxHp;
    const stats = await equipmentService.getCharacterCombatStats(character.id);
    const gatherPower = Math.max(2, Math.floor(stats.dex * 1.5 + stats.int * 0.5));
    let turnCounter = 1;
    const gatherLog = [];
    while (integrity > 0) {
        let damage = Math.max(3, Math.floor(gatherPower + (Math.random() * 5)));
        const isPerfect = Math.random() < (character.luk * 0.03);
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
        if (turnCounter > 20)
            break;
    }
    const { level, exp, levelGain } = calculateLevelUp(character.level, character.exp, xp);
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
    // Award the resource item from DB definition
    if (node.itemCode) {
        await prisma.inventoryItem.upsert({
            where: { characterId_itemCode: { characterId: character.id, itemCode: node.itemCode } },
            update: { quantity: { increment: amount } },
            create: { characterId: character.id, itemCode: node.itemCode, quantity: amount }
        });
    }
    const savedLog = await prisma.battleLog.create({
        data: {
            characterId: character.id,
            enemyName: `Gathering: ${node.name}`,
            isWin: true,
            expGained: xp,
            logDetails: gatherLog
        }
    });
    return {
        success: true,
        type: "GATHERING",
        item: node.name,
        amount,
        updatedChar,
        log: savedLog,
        startIntegrity: maxIntegrity
    };
}
export async function processPVP(character) {
    const isWin = Math.random() > 0.5;
    const xp = isWin ? 50 : 10;
    const { level, exp, levelGain } = calculateLevelUp(character.level, character.exp, xp);
    const updatedChar = await prisma.character.update({
        where: { id: character.id },
        data: { exp, level, statPoints: { increment: levelGain * 5 }, maxHp: { increment: levelGain * 10 } }
    });
    const savedLog = await prisma.battleLog.create({
        data: {
            characterId: character.id,
            enemyName: "Rival Traveler",
            isWin,
            expGained: xp,
            logDetails: [{ turn: 1, attacker: "Player", damage: 0, message: isWin ? "You defeated the rival!" : "The rival bested you..." }]
        }
    });
    return { success: true, type: "PVP", isWin, updatedChar, log: savedLog };
}
export async function processDungeonEncounter(character) {
    const encounter = await generatePVEEncounter(character);
    return executeCombat(character, encounter);
}
//# sourceMappingURL=combatEngine.js.map