import { prisma } from "../lib/prisma.js";
import { gameDataManager } from "./gameDataManager.js";
import { equipmentService } from "./equipmentService.js";
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
                include: { template: true }
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
        const newRolls = this.generateRolls(stats, item.template);
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
    generateRolls(playerStats, template) {
        const luckBonus = (playerStats.luk * 0.005);
        const minMult = 0.85 + luckBonus; // Reforging has a slightly higher floor than drops
        const maxMult = 1.25 + luckBonus;
        const roll = (base) => {
            if (!base || base === 0)
                return null;
            const mult = Math.min(2.0, minMult + (Math.random() * (maxMult - minMult)));
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
}
export const reforgeService = new ReforgeService();
//# sourceMappingURL=reforgeService.js.map