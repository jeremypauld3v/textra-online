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
  async equipItem(characterId: string, inventoryItemId: string) {
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

    if (!character) throw new Error("Character not found");

    if (character.level < template.levelReq) {
      throw new Error(`Requires Level ${template.levelReq}`);
    }

    // 3. Determine Slot Mapping
    const slotMapping: Record<string, keyof typeof character> = {
      WEAPON: "equippedWeaponId",
      CHEST: "equippedChestId",
      HELMET: "equippedHelmetId",
      BOOTS: "equippedBootsId",
    };

    const slotField = slotMapping[template.equipSlot];
    if (!slotField) throw new Error("Invalid equipment slot");

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
  async unequipItem(characterId: string, slot: "WEAPON" | "CHEST" | "HELMET" | "BOOTS") {
    let updateData = {};
    if (slot === "WEAPON") updateData = { equippedWeaponId: null };
    else if (slot === "CHEST") updateData = { equippedChestId: null };
    else if (slot === "HELMET") updateData = { equippedHelmetId: null };
    else if (slot === "BOOTS") updateData = { equippedBootsId: null };

    return await prisma.character.update({
      where: { id: characterId },
      data: updateData
    });
  }

  /**
   * 📊 Calculate Total Stats (Base + Gear)
   * Uses per-item rolled stats if available, otherwise falls back to template base stats.
   */
  async getCharacterCombatStats(characterId: string) {
    const character = await prisma.character.findUnique({
      where: { id: characterId },
      include: {
        inventory: {
          include: { template: true }
        }
      }
    });

    if (!character) throw new Error("Character not found");

    // Identify current gear
    const weapon = character.inventory.find(i => i.id === character.equippedWeaponId);
    const chest = character.inventory.find(i => i.id === character.equippedChestId);
    const helmet = character.inventory.find(i => i.id === character.equippedHelmetId);
    const boots = character.inventory.find(i => i.id === character.equippedBootsId);

    const gear = [weapon, chest, helmet, boots].filter(Boolean);

    // Use rolled stats if available, otherwise fall back to template base stats
    let totalAtk = gear.reduce((acc, i) => acc + (i?.rolledAtk ?? i?.template.statAtk ?? 0), 0);
    let totalDef = gear.reduce((acc, i) => acc + (i?.rolledDef ?? i?.template.statDef ?? 0), 0);
    let bonusStr = gear.reduce((acc, i) => acc + (i?.rolledStr ?? i?.template.statStr ?? 0), 0);
    let bonusAgi = gear.reduce((acc, i) => acc + (i?.rolledAgi ?? i?.template.statAgi ?? 0), 0);

    // Final Derived Stats
    // Formula: ATK = (STR * 2) + WeaponATK
    // Formula: DEF = (AGI * 1) + GearDEF
    const finalAtk = ((character.str + bonusStr) * 2) + totalAtk;
    const finalDef = ((character.agi + bonusAgi) * 1) + totalDef;

    return {
      atk: finalAtk,
      def: finalDef,
      str: character.str + bonusStr,
      agi: character.agi + bonusAgi,
      dex: character.dex,
      int: character.int,
      luk: character.luk
    };
  }
}

export const equipmentService = new EquipmentService();
