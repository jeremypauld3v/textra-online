import { prisma } from "../lib/prisma.js";
/**
 * 🧪 ConsumableService
 * Handles the logic for using potions and food.
 */
export class ConsumableService {
    /**
     * 🧪 Use a consumable item from inventory
     */
    async useItem(characterId, inventoryItemId) {
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
        if (template.type !== "CONSUMABLE") {
            throw new Error("This item is not a consumable");
        }
        const character = await prisma.character.findUnique({
            where: { id: characterId }
        });
        if (!character)
            throw new Error("Character not found");
        // 3. Apply Effects
        let healAmount = template.statHeal || 0;
        let energyAmount = template.statEnergy || 0;
        if (healAmount === 0 && energyAmount === 0) {
            throw new Error("This item has no consumable effect");
        }
        // Ensure we don't go over max
        const newHp = Math.min(character.maxHp, character.hp + healAmount);
        const newEnergy = Math.min(character.maxEnergy, character.energy + energyAmount);
        // 4. Update Character and Decrement/Remove Item
        await prisma.$transaction(async (tx) => {
            // Update stats
            await tx.character.update({
                where: { id: characterId },
                data: {
                    hp: newHp,
                    energy: newEnergy
                }
            });
            // Decrement item
            if (invItem.quantity > 1) {
                await tx.inventoryItem.update({
                    where: { id: inventoryItemId },
                    data: { quantity: { decrement: 1 } }
                });
            }
            else {
                await tx.inventoryItem.delete({
                    where: { id: inventoryItemId }
                });
            }
        });
        return {
            success: true,
            healed: newHp - character.hp,
            energyRestored: newEnergy - character.energy,
            newHp,
            newEnergy
        };
    }
}
export const consumableService = new ConsumableService();
//# sourceMappingURL=consumableService.js.map