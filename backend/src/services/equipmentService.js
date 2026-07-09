import { prisma } from "../lib/prisma.js";
import { gameDataManager } from "./gameDataManager.js";
import { GAME_BALANCE } from "../constants/gameBalance.js";
/**
 * 🛡️ EquipmentService
 * Handles the logic for equipping and unequipping gear.
 */
export class EquipmentService {
    /**
     * 🎲 EQUIPMENT STAT ROLLER
     * Generates random variances for item stats.
     */
    generateEquipmentRolls(stats, template) {
        const luckBonus = (stats.luk * 0.005); // 100 LUK = +50% roll floor improvement
        const minMult = (template.minRoll ?? 0.8) + luckBonus;
        const maxMult = (template.maxRoll ?? 1.2) + luckBonus;
        const rollInt = (base) => {
            if (!base)
                return null;
            const mult = Math.min(2.0, minMult + (Math.random() * (maxMult - minMult)));
            const rolled = Math.floor(base * mult);
            return Math.min(GAME_BALANCE.MAX_STAT_VALUE, rolled);
        };
        const rollFloat = (base) => {
            if (!base)
                return null;
            const mult = Math.min(2.0, minMult + (Math.random() * (maxMult - minMult)));
            return Math.round(base * mult * 10) / 10;
        };
        return {
            rolledAtk: rollInt(template.statAtk),
            rolledDef: rollInt(template.statDef),
            rolledStr: rollInt(template.statStr),
            rolledAgi: rollInt(template.statAgi),
            rolledInt: rollInt(template.statInt),
            rolledLuk: rollInt(template.statLuk),
            rolledDex: rollInt(template.statDex),
            rolledLifesteal: rollFloat(template.statLifesteal),
            rolledThorns: rollFloat(template.statThorns),
            rolledGoldBonus: rollFloat(template.statGoldBonus),
            rolledExpBonus: rollFloat(template.statExpBonus),
            rolledMoveSpeed: rollFloat(template.statMoveSpeed),
            rolledHpRegen: rollFloat(template.statHpRegen),
        };
    }
    statsCache = new Map();
    CACHE_TTL = 5000; // 5 seconds cache for stats
    /**
     * 🗡️ Equip an item from inventory to a slot
     */
    async equipItem(characterId, inventoryItemId) {
        // Invalidate cache
        this.statsCache.delete(characterId);
        // 1. Fetch item and character
        const invItem = await prisma.inventoryItem.findUnique({
            where: { id: inventoryItemId },
            include: { template: true }
        });
        if (!invItem || invItem.characterId !== characterId) {
            throw new Error("Item not found in your inventory");
        }
        const { template } = invItem;
        // 2. Validation
        if (template.type !== "EQUIPMENT" || !template.equipSlot) {
            throw new Error("This item cannot be equipped");
        }
        const character = await prisma.character.findUnique({
            where: { id: characterId }
        });
        if (!character)
            throw new Error("Character not found");
        if (character.level < template.levelReq) {
            throw new Error(`Requires Level ${template.levelReq}`);
        }
        // 3. Determine Slot Mapping
        const slotMapping = {
            WEAPON: "equippedWeaponId",
            CHEST: "equippedChestId",
            HELMET: "equippedHelmetId",
            BOOTS: "equippedBootsId",
            GLOVES: "equippedGlovesId",
            CAPE: "equippedCapeId",
            NECKLACE: "equippedNecklaceId",
        };
        let slotField = slotMapping[template.equipSlot];
        // Specialized Logic for Multiple Ring Slots
        if (template.equipSlot === "RING") {
            if (!character.equippedRing1Id)
                slotField = "equippedRing1Id";
            else if (!character.equippedRing2Id)
                slotField = "equippedRing2Id";
            else
                slotField = "equippedRing1Id"; // Replace slot 1 if both full
        }
        if (!slotField)
            throw new Error("Invalid equipment slot");
        // 4. Update Character (Atomic Swap)
        const updatedChar = await prisma.character.update({
            where: { id: characterId },
            data: {
                [slotField]: invItem.id
            }
        });
        return updatedChar;
    }
    /**
     * 🚶 Unequip an item from a slot
     */
    async unequipItem(characterId, slot) {
        // Invalidate cache
        this.statsCache.delete(characterId);
        let updateData = {};
        if (slot === "WEAPON")
            updateData = { equippedWeaponId: null };
        else if (slot === "CHEST")
            updateData = { equippedChestId: null };
        else if (slot === "HELMET")
            updateData = { equippedHelmetId: null };
        else if (slot === "BOOTS")
            updateData = { equippedBootsId: null };
        else if (slot === "GLOVES")
            updateData = { equippedGlovesId: null };
        else if (slot === "CAPE")
            updateData = { equippedCapeId: null };
        else if (slot === "NECKLACE")
            updateData = { equippedNecklaceId: null };
        else if (slot === "RING1")
            updateData = { equippedRing1Id: null };
        else if (slot === "RING2")
            updateData = { equippedRing2Id: null };
        return await prisma.character.update({
            where: { id: characterId },
            data: updateData
        });
    }
    /**
     * 📊 Calculate Total Stats (Base + Gear)
     * Uses per-item rolled stats if available, otherwise falls back to template base stats.
     */
    async getCharacterCombatStats(characterId) {
        const now = Date.now();
        const cached = this.statsCache.get(characterId);
        if (cached && (now - cached.timestamp < this.CACHE_TTL)) {
            return cached.stats;
        }
        const character = await prisma.character.findUnique({
            where: { id: characterId },
            include: {
                inventory: {
                    include: { template: true }
                }
            }
        });
        if (!character)
            throw new Error("Character not found");
        // Identify current gear
        const weapon = character.inventory.find(i => i.id === character.equippedWeaponId);
        const chest = character.inventory.find(i => i.id === character.equippedChestId);
        const helmet = character.inventory.find(i => i.id === character.equippedHelmetId);
        const boots = character.inventory.find(i => i.id === character.equippedBootsId);
        const gloves = character.inventory.find(i => i.id === character.equippedGlovesId);
        const cape = character.inventory.find(i => i.id === character.equippedCapeId);
        const necklace = character.inventory.find(i => i.id === character.equippedNecklaceId);
        const ring1 = character.inventory.find(i => i.id === character.equippedRing1Id);
        const ring2 = character.inventory.find(i => i.id === character.equippedRing2Id);
        const gear = [weapon, chest, helmet, boots, gloves, cape, necklace, ring1, ring2].filter(Boolean);
        // Use rolled stats if available, otherwise fall back to template base stats
        let totalAtk = gear.reduce((acc, i) => acc + (i?.rolledAtk ?? i?.template.statAtk ?? 0), 0);
        let totalDef = gear.reduce((acc, i) => acc + (i?.rolledDef ?? i?.template.statDef ?? 0), 0);
        let bonusStr = gear.reduce((acc, i) => acc + (i?.rolledStr ?? i?.template.statStr ?? 0), 0);
        let bonusAgi = gear.reduce((acc, i) => acc + (i?.rolledAgi ?? i?.template.statAgi ?? 0), 0);
        let bonusInt = gear.reduce((acc, i) => acc + (i?.rolledInt ?? i?.template.statInt ?? 0), 0);
        let bonusLuk = gear.reduce((acc, i) => acc + (i?.rolledLuk ?? i?.template.statLuk ?? 0), 0);
        let bonusDex = gear.reduce((acc, i) => acc + (i?.rolledDex ?? i?.template.statDex ?? 0), 0);
        // Unique stats (percentages, accumulate additively)
        let totalLifesteal = gear.reduce((acc, i) => acc + (i?.rolledLifesteal ?? i?.template.statLifesteal ?? 0), 0);
        let totalThorns = gear.reduce((acc, i) => acc + (i?.rolledThorns ?? i?.template.statThorns ?? 0), 0);
        let totalGoldBonus = gear.reduce((acc, i) => acc + (i?.rolledGoldBonus ?? i?.template.statGoldBonus ?? 0), 0);
        let totalExpBonus = gear.reduce((acc, i) => acc + (i?.rolledExpBonus ?? i?.template.statExpBonus ?? 0), 0);
        let totalMoveSpeed = gear.reduce((acc, i) => acc + (i?.rolledMoveSpeed ?? i?.template.statMoveSpeed ?? 0), 0);
        let totalHpRegen = gear.reduce((acc, i) => acc + (i?.rolledHpRegen ?? i?.template.statHpRegen ?? 0), 0);
        const totalStr = character.str + bonusStr;
        const totalAgi = character.agi + bonusAgi;
        const totalInt = character.int + bonusInt;
        const totalLuk = character.luk + bonusLuk;
        // Derive final ATK — detect class by weapon's classType field
        let finalAtk = totalAtk;
        let classType = null;
        const weaponTemplate = weapon?.template;
        if (weaponTemplate) {
            classType = weaponTemplate.classType || null;
            // Fallback: if no classType set, try code prefix for backwards compatibility
            if (!classType) {
                const code = weaponTemplate.code.toUpperCase();
                if (code.startsWith("WARRIOR") || code === "EXCALIBUR" || code === "CHAOS_BLADE")
                    classType = "WARRIOR";
                else if (code.startsWith("ARCHER") || code === "ARTEMIS_BOW")
                    classType = "ARCHER";
                else if (code.startsWith("MAGE") || code === "MERLIN_STAFF")
                    classType = "MAGE";
            }
            if (classType === "WARRIOR") {
                finalAtk += (totalStr * 3);
            }
            else if (classType === "ARCHER") {
                finalAtk += (totalAgi * 3);
            }
            else if (classType === "MAGE") {
                finalAtk += (totalInt * 3);
            }
            else {
                finalAtk += (totalStr * 2); // Hybrid / unknown
            }
        }
        else {
            finalAtk += (totalStr * 1.5); // Unarmed penalty
        }
        const finalDef = (totalAgi * 1) + totalDef;
        const finalMaxEnergy = 100 + (totalInt * 1);
        // Derived stats for character display
        const critChance = Math.min(0.8, totalLuk * GAME_BALANCE.BASE_CRIT_MODIFIER) * 100;
        const dodgeChance = Math.min(0.40, totalAgi / 1000) * 100;
        const armorPen = Math.min(0.8, character.dex / 1000) * 100;
        const gatherPower = character.dex * 2 + totalInt * 0.5;
        const pvpFlee = Math.min(0.8, totalAgi / GAME_BALANCE.PVP_FLEE_AGI_DIVISOR) * 100;
        const finalStats = {
            atk: finalAtk,
            def: finalDef,
            str: totalStr,
            agi: totalAgi,
            dex: character.dex + bonusDex,
            int: totalInt,
            luk: totalLuk,
            maxEnergy: finalMaxEnergy,
            weaponCode: weaponTemplate ? weaponTemplate.code.toUpperCase() : null,
            classType: classType,
            critChance,
            dodgeChance,
            armorPen,
            gatherPower,
            pvpFlee,
            lifesteal: totalLifesteal,
            thorns: totalThorns,
            goldBonus: totalGoldBonus,
            equipExpBonus: totalExpBonus,
            moveSpeed: totalMoveSpeed,
            hpRegen: totalHpRegen,
        };
        // Save to cache
        this.statsCache.set(characterId, { stats: finalStats, timestamp: Date.now() });
        return finalStats;
    }
}
export const equipmentService = new EquipmentService();
//# sourceMappingURL=equipmentService.js.map