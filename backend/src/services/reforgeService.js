import { prisma } from "../lib/prisma.js";
import { gameDataManager } from "./gameDataManager.js";
import { equipmentService } from "./equipmentService.js";
import { GAME_BALANCE } from "../constants/gameBalance.js";
/**
 * ⚒️ ReforgeService
 * Allows players to reroll variable stats on equipment.
 */
export class ReforgeService {
    /**
     * 🎲 Reforge an item
     * Wipes current rolls and generates new ones based on template & character LUK.
     */
    async reforgeItem(characterId, inventoryItemId) {
        // 1. Fetch Character & Item
        const [character, item] = await Promise.all([
            prisma.character.findUnique({ where: { id: characterId } }),
            prisma.inventoryItem.findUnique({
                where: { id: inventoryItemId },
                include: {
                    template: {
                        include: { rarity: true }
                    }
                }
            })
        ]);
        if (!character || !item)
            throw new Error("Character or Item not found");
        if (item.characterId !== characterId)
            throw new Error("Item does not belong to you");
        if (item.template.type !== "EQUIPMENT")
            throw new Error("Can only reforge equipment");
        // 2. Calculate Costs (Scales with Rarity & Level)
        const rarityRank = item.template.rarity?.rank || 1;
        const goldCost = 100 * rarityRank * Math.floor(item.template.levelReq / 5);
        if (character.gold < goldCost) {
            throw new Error(`Insufficient gold. Need ${goldCost} GOLD.`);
        }
        // 3. Generate New Rolls
        const stats = await equipmentService.getCharacterCombatStats(characterId);
        const newRolls = equipmentService.generateEquipmentRolls(stats, item.template);
        // Reforging has a slightly higher floor/ceiling (+0.05) than base template rolls
        // We can wrap the call if we want that behavior, or just accept the standard roller.
        // Given the user report of OP stats, staying with standard roller is safer.
        // 4. Update Database
        return await prisma.$transaction(async (tx) => {
            // Deduct Gold
            await tx.character.update({
                where: { id: characterId },
                data: { gold: { decrement: goldCost } }
            });
            // Update Item Rolls
            return await tx.inventoryItem.update({
                where: { id: inventoryItemId },
                data: {
                    rolledAtk: newRolls.rolledAtk,
                    rolledDef: newRolls.rolledDef,
                    rolledStr: newRolls.rolledStr,
                    rolledAgi: newRolls.rolledAgi,
                    rolledInt: newRolls.rolledInt,
                    rolledLuk: newRolls.rolledLuk,
                }
            });
        });
    }
}
export const reforgeService = new ReforgeService();
//# sourceMappingURL=reforgeService.js.map