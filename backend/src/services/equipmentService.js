import { prisma } from "../lib/prisma.js";
import { gameDataManager } from "./gameDataManager.js";
/**
 * 🛡️ EquipmentService
 * Handles the logic for equipping and unequipping gear.
 */
export class EquipmentService {
    /**
     * 🗡️ Equip an item from inventory to a slot
     */
    async equipItem(characterId, inventoryItemId) {
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
        const totalStr = character.str + bonusStr;
        const totalAgi = character.agi + bonusAgi;
        const totalInt = character.int + bonusInt;
        const totalLuk = character.luk + bonusLuk;
        // Derive final ATK — detect class by item code prefix instead of name
        let finalAtk = totalAtk;
        const weaponTemplate = weapon?.template;
        if (weaponTemplate) {
            const code = weaponTemplate.code.toUpperCase();
            if (code.startsWith("WARRIOR") || code === "EXCALIBUR" || code === "CHAOS_BLADE") {
                finalAtk += (totalStr * 3); // Warrior scaling
            }
            else if (code.startsWith("ARCHER") || code === "ARTEMIS_BOW") {
                finalAtk += (totalAgi * 3); // Archer scaling
            }
            else if (code.startsWith("MAGE") || code === "MERLIN_STAFF") {
                finalAtk += (totalInt * 3); // Mage scaling
            }
            else {
                finalAtk += (totalStr * 2); // Hybrid / unknown fallback
            }
        }
        else {
            finalAtk += (totalStr * 1.5); // Unarmed penalty
        }
        const finalDef = (totalAgi * 1) + totalDef;
        return {
            atk: finalAtk,
            def: finalDef,
            str: totalStr,
            agi: totalAgi,
            dex: character.dex,
            int: totalInt,
            luk: totalLuk
        };
    }
}
export const equipmentService = new EquipmentService();
//# sourceMappingURL=equipmentService.js.map