import { prisma } from "../lib/prisma.js";
import { gameDataManager } from "./gameDataManager.js";
import { equipmentService } from "./equipmentService.js";
import { inventoryService } from "./inventoryService.js";
import { Prisma } from "@prisma/client";
import { GAME_BALANCE } from "../constants/gameBalance.js";
import { zoneService } from "./zoneService.js";
import { getIO } from "../socket.js";
/**
 * 📊 RADIAL DEPTH TIERS & REWARDS
 */
export const getDepthTier = async (depth) => {
    const zone = await zoneService.getZoneAtDepth(depth);
    if (zone) {
        return {
            name: zone.name,
            dangerMult: zone.dangerMultiplier,
            expMult: zone.expMultiplier,
            lootMult: zone.dropChanceMultiplier,
            prefix: `[${zone.name}] `,
            commonNodeTypes: zone.commonNodeTypes,
            excludedNodeTypes: zone.excludedNodeTypes
        };
    }
    // Fallback if no zone is defined in DB
    return {
        name: "Wilderness",
        dangerMult: 1.0,
        expMult: 1.0,
        lootMult: 1.0,
        prefix: "",
        commonNodeTypes: [],
        excludedNodeTypes: []
    };
};
/**
 * 🛠️ CORE LEVELING LOGIC
 * Mathematically derived level-up check to avoid loop overhead.
 */
function calculateLevelUp(currentLevel, currentExp, gainedExp) {
    let level = currentLevel;
    let exp = currentExp + gainedExp;
    let levelGain = 0;
    // Faster mathematical calculation instead of loop
    // Required for next level = level * 100
    // This is a simple progression. For higher complexity (sum of arithmetic progression),
    // we would use a quadratic formula, but here 100*level is straightforward.
    while (exp >= level * 100) {
        exp -= level * 100;
        level += 1;
        levelGain += 1;
        if (levelGain > 100)
            break; // Safety break
    }
    return { level, exp, levelGain };
}
/**
 * ⚔️ ADVANCED DAMAGE CALCULATOR
 * Implements Level-based scaling and better stat integration.
 */
function calculateDamage(attackerStats, defenderDef, isGathering = false) {
    const basePower = isGathering ? (attackerStats.dex * 2 + attackerStats.int * 0.5) : attackerStats.atk;
    const variance = 0.9 + (Math.random() * 0.2); // 90% to 110%
    // Penetration logic: Higher DEX ignores more defense (Capped at 80%)
    const penetration = 1 - Math.min(0.8, (attackerStats.dex / 1000));
    const effectiveDef = defenderDef * penetration;
    const rawDamage = Math.max(5, (basePower * variance) - (effectiveDef * 0.5));
    // Crit logic (Capped at 80%)
    const critChance = Math.min(0.8, (attackerStats.luk * (isGathering ? GAME_BALANCE.GATHER_CRIT_MODIFIER : GAME_BALANCE.BASE_CRIT_MODIFIER)));
    const isCrit = Math.random() < critChance;
    return {
        damage: Math.floor(isCrit ? rawDamage * 2 : rawDamage),
        isCrit
    };
}
export async function generatePVEEncounter(character) {
    const depth = character.currentDepth;
    const tier = await getDepthTier(depth);
    const monster = await gameDataManager.getRandomMonster(depth);
    if (!monster)
        throw new Error("No monsters defined in database");
    const hpMult = (1 + (depth / GAME_BALANCE.HP_SCALING_DIVISOR)) * tier.dangerMult;
    const statMult = (1 + (depth / GAME_BALANCE.STAT_SCALING_DIVISOR)) * tier.dangerMult;
    const expMult = (1 + (Math.floor(depth / GAME_BALANCE.EXP_STEP_DIVISOR) * GAME_BALANCE.EXP_STEP_GROWTH)) * tier.expMult;
    const scaledHp = Math.floor(monster.hp * Math.min(GAME_BALANCE.MAX_SCALING_MULTIPLIER, hpMult)) + (character.level * GAME_BALANCE.MONSTER_LEVEL_HP_BONUS);
    return {
        type: "PVE",
        name: monster.name,
        hp: scaledHp,
        maxHp: scaledHp,
        attack: Math.floor(monster.attack * Math.min(GAME_BALANCE.MAX_SCALING_MULTIPLIER, statMult)) + Math.floor(character.level * GAME_BALANCE.MONSTER_LEVEL_STAT_BONUS),
        defense: Math.floor(monster.defense * Math.min(GAME_BALANCE.MAX_SCALING_MULTIPLIER, statMult)) + Math.floor(character.level * GAME_BALANCE.MONSTER_LEVEL_STAT_BONUS),
        expValue: Math.floor(monster.expReward * expMult) + (character.level * GAME_BALANCE.MONSTER_LEVEL_EXP_BONUS)
    };
}
export async function generateGatheringEncounter(character) {
    const depth = character.currentDepth;
    const nodes = await gameDataManager.getResourceNodes();
    if (!nodes || nodes.length === 0)
        throw new Error("No resource nodes defined in database");
    const tier = await getDepthTier(depth);
    // Apply Zone logic: Filters & Weights
    let availableNodes = nodes;
    if (tier.excludedNodeTypes?.length > 0) {
        availableNodes = nodes.filter(n => !tier.excludedNodeTypes.includes(n.type));
    }
    // If no nodes left after exclusion, fallback to all (safeguard)
    if (availableNodes.length === 0)
        availableNodes = nodes;
    // Weighting: Nodes in commonNodeTypes are 3x more likely
    const weightedNodes = [];
    availableNodes.forEach(n => {
        const weight = tier.commonNodeTypes?.includes(n.type) ? 3 : 1;
        for (let i = 0; i < weight; i++) {
            weightedNodes.push(n);
        }
    });
    const node = weightedNodes[Math.floor(Math.random() * weightedNodes.length)];
    if (!node)
        throw new Error("Failed to select resource node");
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
function getPlayerClass(stats) {
    if (!stats)
        return "WARRIOR";
    // Use classType from equipment stats first, fallback to weapon code prefix
    if (stats.classType === "WARRIOR" || stats.classType === "ARCHER" || stats.classType === "MAGE") {
        return stats.classType;
    }
    const code = (stats.weaponCode || '').toUpperCase();
    if (code.startsWith("WARRIOR") || code === "EXCALIBUR" || code === "CHAOS_BLADE")
        return "WARRIOR";
    if (code.startsWith("ARCHER") || code === "ARTEMIS_BOW")
        return "ARCHER";
    if (code.startsWith("MAGE") || code === "MERLIN_STAFF")
        return "MAGE";
    return "WARRIOR";
}
export async function executeCombat(character, enemy) {
    const startEnemyHp = enemy.hp;
    let enemyHp = enemy.hp;
    const enemyAttack = enemy.attack;
    const enemyDefense = enemy.defense;
    let playerHp = character.hp;
    const stats = await equipmentService.getCharacterCombatStats(character.id);
    const playerAttack = stats.atk;
    const playerDefense = stats.def;
    let turnCounter = 1;
    const combatLog = [];
    const playerClass = getPlayerClass(stats);
    let enemyStunned = false;
    let playerEvading = false;
    let berserkActive = false;
    let rejuvenateUsed = false;
    while (playerHp > 0 && enemyHp > 0) {
        let turnActionTaken = false;
        let turnDamage = 0;
        let turnIsCrit = false;
        let skillMessage = "";
        // 1. Mage Heal Check (triggers once per battle at <40% HP)
        if (playerClass === "MAGE" && !rejuvenateUsed && (playerHp / character.maxHp) < 0.40) {
            rejuvenateUsed = true;
            const healAmount = Math.floor(stats.int * 4.0);
            playerHp = Math.min(character.maxHp, playerHp + healAmount);
            combatLog.push({
                turn: turnCounter,
                attacker: "Player",
                damage: 0,
                message: `✨ REJUVENATE! You channel mana to restore +${healAmount} HP!`
            });
        }
        // 2. Warrior Berserk Check (triggers once at <30% HP, lasts rest of battle)
        if (playerClass === "WARRIOR" && !berserkActive && (playerHp / character.maxHp) < 0.30) {
            berserkActive = true;
            combatLog.push({
                turn: turnCounter,
                attacker: "Player",
                damage: 0,
                message: "🩸 BERSERK! You enter a bloodlust rage, increasing ATK by 50% for the rest of battle!"
            });
        }
        // 3. Player Active Skills
        if (playerClass === "MAGE" && Math.random() < 0.25) {
            // mage fireball
            const isCrit = Math.random() < Math.min(0.8, stats.luk * GAME_BALANCE.BASE_CRIT_MODIFIER);
            const baseDmg = stats.int * 3.5;
            const damage = Math.floor(isCrit ? baseDmg * 2 : baseDmg);
            enemyHp -= damage;
            combatLog.push({
                turn: turnCounter,
                attacker: "Player",
                damage,
                message: `🔥 FIREBALL! You blast ${enemy.name} with raw arcane magic! (-${damage})`,
                isCrit
            });
            turnActionTaken = true;
        }
        else if (playerClass === "WARRIOR" && Math.random() < 0.20) {
            // warrior shield slam
            const isCrit = Math.random() < Math.min(0.8, stats.luk * GAME_BALANCE.BASE_CRIT_MODIFIER);
            const baseDmg = stats.def * 1.5;
            const damage = Math.floor(isCrit ? baseDmg * 2 : baseDmg);
            enemyHp -= damage;
            enemyStunned = true;
            combatLog.push({
                turn: turnCounter,
                attacker: "Player",
                damage,
                message: `🛡️ SHIELD SLAM! You hit ${enemy.name} with your shield, stunning them! (-${damage})`,
                isCrit
            });
            turnActionTaken = true;
        }
        else if (playerClass === "ARCHER" && Math.random() < Math.min(0.40, stats.agi / 1000)) {
            // archer double shot
            const shot1 = calculateDamage(stats, enemyDefense);
            const shot2 = calculateDamage(stats, enemyDefense);
            const totalDmg = shot1.damage + shot2.damage;
            enemyHp -= totalDmg;
            combatLog.push({
                turn: turnCounter,
                attacker: "Player",
                damage: totalDmg,
                message: `🏹 DOUBLE SHOT! You fire two arrows in rapid succession! (-${totalDmg})`,
                isCrit: shot1.isCrit || shot2.isCrit
            });
            turnActionTaken = true;
        }
        else if (playerClass === "ARCHER" && !playerEvading && Math.random() < Math.min(0.40, stats.agi / 800)) {
            // archer defensive roll / evasion preparation
            playerEvading = true;
            combatLog.push({
                turn: turnCounter,
                attacker: "Player",
                damage: 0,
                message: "💨 DEFENSIVE ROLL! You prepare to evade the enemy's next strike!"
            });
        }
        // 4. Fallback to Normal Attack if no offensive skill action was taken
        if (!turnActionTaken) {
            let finalStats = stats;
            if (berserkActive) {
                finalStats = { ...stats, atk: stats.atk * 1.5 };
            }
            const pResult = calculateDamage(finalStats, enemyDefense);
            const playerDamage = pResult.damage;
            const isCrit = pResult.isCrit;
            enemyHp -= playerDamage;
            // 🩸 Life Steal
            if (stats.lifesteal > 0 && playerDamage > 0) {
                const heal = Math.floor(playerDamage * (stats.lifesteal / 100));
                if (heal > 0)
                    playerHp = Math.min(character.maxHp, playerHp + heal);
            }
            let msg = "";
            if (isCrit) {
                const critMsgs = [
                    `${character.name} lands a devastating blow on ${enemy.name}!`,
                    `CRITICAL! ${character.name} strikes a weak point!`,
                    `${character.name} unleashes a massive strike!`,
                ];
                msg = critMsgs[Math.floor(Math.random() * critMsgs.length)] + ` (-${playerDamage})`;
            }
            else {
                const hitMsgs = [
                    `${character.name} attacks ${enemy.name}.`,
                    `${character.name} swings at ${enemy.name}.`,
                    `${character.name} hits ${enemy.name}.`,
                ];
                msg = hitMsgs[Math.floor(Math.random() * hitMsgs.length)] + ` (-${playerDamage})`;
            }
            combatLog.push({
                turn: turnCounter,
                attacker: "Player",
                damage: playerDamage,
                message: msg,
                isCrit: isCrit
            });
        }
        if (enemyHp <= 0)
            break;
        // 5. Enemy turn
        if (enemyStunned) {
            enemyStunned = false; // consume stun
            combatLog.push({
                turn: turnCounter,
                attacker: "Enemy",
                damage: 0,
                message: `💫 ${enemy.name} is stunned and unable to move!`
            });
        }
        else if (playerEvading) {
            playerEvading = false; // evade success!
            combatLog.push({
                turn: turnCounter,
                attacker: "Enemy",
                damage: 0,
                message: `💨 MISS! You deftly dodge ${enemy.name}'s attack!`
            });
        }
        else {
            const eResult = calculateDamage({ atk: enemyAttack, dex: 50, luk: 5 }, playerDefense);
            const enemyDamage = eResult.damage;
            const dodgeChance = Math.min(0.8, (stats.agi * GAME_BALANCE.BASE_DODGE_MODIFIER));
            const isDodged = Math.random() < dodgeChance;
            if (isDodged) {
                combatLog.push({ turn: turnCounter, attacker: "Enemy", damage: 0, message: `${character.name} deftly dodged ${enemy.name}'s attack!` });
            }
            else {
                playerHp -= enemyDamage;
                // 🛡️ Thorns — reflect damage back
                if (stats.thorns > 0 && enemyDamage > 0) {
                    const reflect = Math.floor(enemyDamage * (stats.thorns / 100));
                    if (reflect > 0) {
                        enemyHp -= reflect;
                        combatLog.push({
                            turn: turnCounter,
                            attacker: "Player",
                            damage: reflect,
                            message: `🌵 THORNS! ${enemy.name} takes ${reflect} reflected damage!`
                        });
                    }
                }
                const enemyMsgs = [
                    `${enemy.name} strikes back!`,
                    `${enemy.name} lunges at ${character.name}.`,
                    `${enemy.name} deals a hit.`,
                ];
                combatLog.push({
                    turn: turnCounter,
                    attacker: "Enemy",
                    damage: enemyDamage,
                    message: enemyMsgs[Math.floor(Math.random() * enemyMsgs.length)] + ` (-${enemyDamage})`,
                    isCrit: eResult.isCrit
                });
            }
        }
        turnCounter++;
        if (turnCounter > 100)
            break;
    }
    const isWin = playerHp > 0;
    let finalExp = isWin ? (enemy.expValue || 0) : 0;
    let finalGold = 0;
    const monsterTemplate = isWin ? await gameDataManager.getMonster(enemy.name.replace(/^\[.*\] /, "")) : null;
    if (isWin && monsterTemplate) {
        const minMult = monsterTemplate.minGoldMult || 0.8;
        const maxMult = monsterTemplate.maxGoldMult || 1.2;
        const randomMult = Math.random() * (maxMult - minMult) + minMult;
        // Depth-based gold scaling: +5% per 50km depth
        const depthBonus = 1 + Math.floor(character.currentDepth / 50) * 0.05;
        finalGold = Math.floor(monsterTemplate.goldReward * randomMult * depthBonus);
        // 💰 Gold bonus from gear
        if (stats.goldBonus > 0)
            finalGold = Math.floor(finalGold * (1 + stats.goldBonus / 100));
    }
    // 📈 EXP bonus from gear
    if (stats.equipExpBonus > 0)
        finalExp = Math.floor(finalExp * (1 + stats.equipExpBonus / 100));
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
            gold: { increment: finalGold },
            currentDepth: nextDepth,
            statPoints: { increment: levelGain * 5 },
            maxHp: nextMaxHp,
            actionStatus: nextStatus,
            previousStatus: null,
            pendingEncounter: Prisma.DbNull
        }
    });
    const lootedItems = [];
    if (isWin && monsterTemplate && monsterTemplate.lootTable) {
        const lootResult = await resolveLootRolls(character, stats, monsterTemplate.lootTable);
        lootedItems.push(...lootResult);
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
    return {
        success: true,
        isWin,
        updatedChar,
        log: savedLog,
        lootedItems: lootedItems,
        experienceGained: finalExp,
        goldGained: finalGold,
        playerName: character.name,
        enemyName: enemy.name,
        startPlayerHp: character.hp,
        startMaxPlayerHp: character.maxHp,
        startEnemyHp: startEnemyHp,
        startMaxEnemyHp: startEnemyHp
    };
}
export async function executeGathering(character, node) {
    if (character.energy <= 0) {
        throw new Error("You are too exhausted to gather. You must camp to restore energy.");
    }
    const stats = await equipmentService.getCharacterCombatStats(character.id);
    const gatherPower = Math.max(2, Math.floor(stats.dex * 0.5 + stats.int * 0.2));
    let integrity = node.hp;
    let turnCounter = 1;
    const gatherLog = [];
    while (integrity > 0 && turnCounter <= 20) {
        const pResult = calculateDamage(stats, 0, true);
        const damage = pResult.damage;
        const isPerfect = pResult.isCrit;
        integrity -= damage;
        let msg = "";
        if (isPerfect) {
            const perfectMsgs = [
                `PERFECT STRIKE! You harvest a wealth of materials!`,
                `Masterful swing! The ${node.name} yields easily!`,
                `Efficient work! You've found a rich vein/patch!`,
            ];
            msg = perfectMsgs[Math.floor(Math.random() * perfectMsgs.length)] + ` (+${damage})`;
        }
        else {
            const workMsgs = [
                `You work on the ${node.name}.`,
                `You strike the ${node.name} carefully.`,
                `Chiseling away at the ${node.name}...`,
            ];
            msg = workMsgs[Math.floor(Math.random() * workMsgs.length)] + ` (+${damage})`;
        }
        gatherLog.push({
            turn: turnCounter,
            attacker: "Player",
            damage: damage,
            message: msg
        });
        turnCounter++;
    }
    const { level, exp, levelGain } = calculateLevelUp(character.level, character.exp, node.xpReward || 0);
    let nextStatus = character.previousStatus || "IDLE";
    const newEnergy = Math.max(0, character.energy - 5);
    if (newEnergy <= 0) {
        nextStatus = "CAMPING";
        getIO().to(`user:${character.userId}`).emit("exhaustion_forced_camp", { message: "You used up the last of your energy gathering. Setting up camp..." });
    }
    const updatedChar = await prisma.character.update({
        where: { id: character.id },
        data: {
            exp, level,
            statPoints: { increment: levelGain * 5 },
            maxHp: { increment: levelGain * 10 },
            energy: newEnergy,
            actionStatus: nextStatus,
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
    return {
        success: true,
        type: "GATHERING",
        isWin: true,
        item: node.name,
        amount: lootedItems.length,
        updatedChar,
        log: savedLog,
        experienceGained: node.xpReward || 0,
        goldGained: 0,
        startEnemyHp: node.hp,
        startMaxEnemyHp: node.hp,
        startMaxPlayerHp: character.maxHp,
        startPlayerHp: character.hp,
        lootedItems: lootedItems
    };
}
/**
 * 🎲 UNIVERSAL LOOT ROLLER
 * Handles depth-scaling, Rarity modifiers, and Luck bonuses.
 */
export async function resolveLootRolls(character, stats, lootTable, manualMultiplier = 1.0) {
    const depth = character.currentDepth;
    const tier = await getDepthTier(depth);
    const lootedItems = [];
    // Base Multiplier: 1 + (Depth / Interval * Growth) + (LUK * Bonus)
    const depthIntervals = Math.floor(depth / GAME_BALANCE.LOOT_DEPTH_INTERVAL);
    const baseDepthMult = (depthIntervals * GAME_BALANCE.LOOT_CHANCE_GROWTH);
    const lukMult = (stats.luk * GAME_BALANCE.LOOT_LUK_QUALITY_BONUS);
    const totalLootMult = (1 + baseDepthMult + lukMult) * tier.lootMult * manualMultiplier;
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
                    rolls = equipmentService.generateEquipmentRolls(stats, itemTemplate);
                }
                await inventoryService.addItem(character.id, entry.itemCode, finalQty, rolls);
                lootedItems.push({
                    itemCode: entry.itemCode,
                    quantity: finalQty,
                    name: itemTemplate?.name || entry.itemCode,
                    emoji: itemTemplate?.emoji || "📦",
                    rarityId: itemTemplate?.rarityId || "COMMON",
                    isWorldDrop: false
                });
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
            const rolls = equipmentService.generateEquipmentRolls(stats, drop);
            await inventoryService.addItem(character.id, drop.code, 1, rolls);
            lootedItems.push({
                itemCode: drop.code,
                quantity: 1,
                name: drop.name,
                emoji: drop.emoji,
                rarityId: drop.rarityId,
                isWorldDrop: true
            });
        }
    }
    return lootedItems;
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
        const winnerSlotCount = await tx.inventoryItem.count({ where: { characterId: winner.id } });
        const loserInv = await tx.inventoryItem.findMany({ where: { characterId: loser.id } });
        let currentSlots = winnerSlotCount;
        for (const item of loserInv) {
            const isEquipment = item.rolledAtk !== null;
            // 1. Roll for drop chance
            if (Math.random() < GAME_BALANCE.PVP_LOOT_DROP_CHANCE) {
                await tx.inventoryItem.delete({ where: { id: item.id } });
                continue;
            }
            // 2. Check if it can stack with existing item in winner's inventory
            const existing = await tx.inventoryItem.findFirst({
                where: { characterId: winner.id, itemCode: item.itemCode, rolledAtk: item.rolledAtk }
            });
            if (existing && !isEquipment) {
                // Stackable material
                await tx.inventoryItem.update({ where: { id: existing.id }, data: { quantity: { increment: item.quantity } } });
                await tx.inventoryItem.delete({ where: { id: item.id } });
                droppedItems.push({ itemCode: item.itemCode, quantity: item.quantity });
            }
            else if (currentSlots < 100) {
                // New slot (equipment or new material stack)
                await tx.inventoryItem.update({ where: { id: item.id }, data: { characterId: winner.id } });
                currentSlots++;
                droppedItems.push({ itemCode: item.itemCode, quantity: item.quantity });
            }
            else {
                // Inventory full, item is lost to the void
                await tx.inventoryItem.delete({ where: { id: item.id } });
            }
        }
    });
    return {
        isWin: isAttackerWin,
        winnerName: winner.name,
        loserName: loser.name,
        goldStolen: loserGoldLost,
        goldGained: isAttackerWin ? loserGoldLost : 0,
        experienceGained: 0,
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