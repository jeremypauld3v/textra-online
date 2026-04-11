import { prisma } from "../lib/prisma.js";
import { inventoryService } from "./inventoryService.js";
/**
 * ⚒️ CraftingService
 * Handles the logic for forging new items from materials.
 * Equipment items get RNG stat rolls (±30% of template base).
 */
export class CraftingService {
    /**
     * 🏗️ Get all available recipes
     */
    async getRecipes() {
        return await prisma.craftingRecipe.findMany({
            include: {
                resultItem: true,
                ingredients: {
                    include: { item: true }
                }
            }
        });
    }
    /**
     * 🎲 Roll a stat within ±30% of the base value (min 1)
     */
    rollStat(base) {
        if (base <= 0)
            return 0;
        const min = Math.max(1, Math.floor(base * 0.7));
        const max = Math.ceil(base * 1.3);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    /**
     * ⚒️ Craft an item from a recipe
     */
    async craftItem(characterId, recipeId) {
        // 1. Fetch recipe with result template
        const recipe = await prisma.craftingRecipe.findUnique({
            where: { id: recipeId },
            include: {
                ingredients: true,
                resultItem: true
            }
        });
        if (!recipe)
            throw new Error("Recipe not found");
        // 2. Fetch character and inventory
        const character = await prisma.character.findUnique({
            where: { id: characterId },
            include: {
                inventory: true
            }
        });
        if (!character)
            throw new Error("Character not found");
        // 3. Validation
        if (character.level < recipe.levelReq) {
            throw new Error(`Requires Level ${recipe.levelReq}`);
        }
        // 4. Check Ingredients
        for (const ing of recipe.ingredients) {
            const invItem = character.inventory.find(i => i.itemCode === ing.itemCode);
            if (!invItem || invItem.quantity < ing.quantity) {
                throw new Error(`Missing ingredient: ${ing.itemCode} (Need ${ing.quantity})`);
            }
        }
        // 5. Determine if this is equipment (gets RNG stats)
        const isEquipment = recipe.resultItem.type === "EQUIPMENT";
        // 6. Roll stats if equipment
        let rolledAtk = null;
        let rolledDef = null;
        let rolledStr = null;
        let rolledAgi = null;
        let rolledInt = null;
        let rolledLuk = null;
        if (isEquipment) {
            rolledAtk = this.rollStat(recipe.resultItem.statAtk || 0);
            rolledDef = this.rollStat(recipe.resultItem.statDef || 0);
            rolledStr = this.rollStat(recipe.resultItem.statStr || 0);
            rolledAgi = this.rollStat(recipe.resultItem.statAgi || 0);
            rolledInt = this.rollStat(recipe.resultItem.statInt || 0);
            rolledLuk = this.rollStat(recipe.resultItem.statLuk || 0);
        }
        // 7. Execute Craft (Atomic Transaction)
        await prisma.$transaction(async (tx) => {
            // Consume Ingredients
            for (const ing of recipe.ingredients) {
                const invItem = character.inventory.find(i => i.itemCode === ing.itemCode);
                if (invItem.quantity > ing.quantity) {
                    await tx.inventoryItem.update({
                        where: { id: invItem.id },
                        data: { quantity: { decrement: ing.quantity } }
                    });
                }
                else {
                    await tx.inventoryItem.delete({
                        where: { id: invItem.id }
                    });
                }
            }
            // Handle Result Creation via Centralized Service
            await inventoryService.addItem(characterId, recipe.resultItemCode, 1, { rolledAtk, rolledDef, rolledStr, rolledAgi, rolledInt, rolledLuk }, tx);
        });
        return {
            success: true,
            message: isEquipment
                ? `Item forged! ATK:${rolledAtk || 0} DEF:${rolledDef || 0} STR:${rolledStr || 0} AGI:${rolledAgi || 0} INT:${rolledInt || 0} LUK:${rolledLuk || 0}`
                : "Item crafted successfully!",
            rolledStats: isEquipment ? { rolledAtk, rolledDef, rolledStr, rolledAgi, rolledInt, rolledLuk } : null
        };
    }
}
export const craftingService = new CraftingService();
//# sourceMappingURL=craftingService.js.map