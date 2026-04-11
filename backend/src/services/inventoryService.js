import { prisma } from "../lib/prisma.js";
import { gameDataManager } from "./gameDataManager.js";
/**
 * 📦 InventoryService
 * Manages all inventory transitions: adding, stacking, and capacity checks.
 */
export class InventoryService {
    /**
     * ➕ Add Item to Inventory
     * Handles stacking for materials/consumables and enforces 100-slot capacity.
     */
    async addItem(characterId, itemCode, quantity = 1, rolls = {}, customTx // Optional transaction client
    ) {
        const db = customTx || prisma;
        // 1. Fetch Item Template to check type (EQUIPMENT vs others)
        const template = await gameDataManager.getItem(itemCode);
        if (!template)
            throw new Error(`Item template not found: ${itemCode}`);
        const isEquipment = template.type === "EQUIPMENT";
        // 2. Check Capacity (Limit: 100 unique slots)
        // Note: We count unique rows in InventoryItem table for this character
        const currentSlotCount = await db.inventoryItem.count({ where: { characterId } });
        // 3. Stacking Logic
        if (!isEquipment) {
            // Non-equipment (Materials, Consumables) should stack
            const existing = await db.inventoryItem.findFirst({
                where: { characterId, itemCode }
            });
            if (existing) {
                return await db.inventoryItem.update({
                    where: { id: existing.id },
                    data: { quantity: { increment: quantity } }
                });
            }
        }
        // 4. If Equipment or No Existing Stack found: Check Capacity again before creating new row
        if (currentSlotCount >= 100) {
            throw new Error("Your inventory is full (Max 100 slots).");
        }
        // Create New Slot
        return await db.inventoryItem.create({
            data: {
                characterId,
                itemCode,
                quantity: isEquipment ? 1 : quantity,
                rolledAtk: rolls.rolledAtk || null,
                rolledDef: rolls.rolledDef || null,
                rolledStr: rolls.rolledStr || null,
                rolledAgi: rolls.rolledAgi || null,
                rolledInt: rolls.rolledInt || null,
                rolledLuk: rolls.rolledLuk || null,
            }
        });
    }
    /**
     * 📏 Get Current Slot Count
     */
    async getSlotCount(characterId) {
        return await prisma.inventoryItem.count({ where: { characterId } });
    }
}
export const inventoryService = new InventoryService();
//# sourceMappingURL=inventoryService.js.map