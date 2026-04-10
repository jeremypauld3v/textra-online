import { prisma } from "../lib/prisma.js";
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
        if (isEquipment) {
            rolledAtk = this.rollStat(recipe.resultItem.statAtk || 0);
            rolledDef = this.rollStat(recipe.resultItem.statDef || 0);
            rolledStr = this.rollStat(recipe.resultItem.statStr || 0);
            rolledAgi = this.rollStat(recipe.resultItem.statAgi || 0);
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
            if (isEquipment) {
                // Equipment: Always create a new unique instance with rolled stats
                // First, check if a "blank" (no rolled stats) version exists from old data
                const existing = await tx.inventoryItem.findFirst({
                    where: { characterId, itemCode: recipe.resultItemCode, rolledAtk: null }
                });
                if (existing) {
                    // Upgrade existing blank item with rolled stats
                    await tx.inventoryItem.update({
                        where: { id: existing.id },
                        data: { rolledAtk, rolledDef, rolledStr, rolledAgi }
                    });
                }
                else {
                    // Delete unique constraint conflict if exists, then create fresh
                    // (player re-crafting the same equipment type)
                    await tx.inventoryItem.create({
                        data: {
                            characterId,
                            itemCode: recipe.resultItemCode,
                            quantity: 1,
                            rolledAtk,
                            rolledDef,
                            rolledStr,
                            rolledAgi
                        }
                    }).catch(async () => {
                        // Unique constraint hit — update the existing one with new rolls
                        await tx.inventoryItem.update({
                            where: {
                                characterId_itemCode: {
                                    characterId,
                                    itemCode: recipe.resultItemCode
                                }
                            },
                            data: { rolledAtk, rolledDef, rolledStr, rolledAgi, quantity: { increment: 1 } }
                        });
                    });
                }
            }
            else {
                // Non-equipment: Stack as usual (consumables, materials)
                await tx.inventoryItem.upsert({
                    where: {
                        characterId_itemCode: {
                            characterId,
                            itemCode: recipe.resultItemCode
                        }
                    },
                    update: {
                        quantity: { increment: 1 }
                    },
                    create: {
                        characterId,
                        itemCode: recipe.resultItemCode,
                        quantity: 1
                    }
                });
            }
        });
        return {
            success: true,
            message: isEquipment
                ? `Item forged! Stats rolled: ATK ${rolledAtk || 0}, DEF ${rolledDef || 0}, STR ${rolledStr || 0}, AGI ${rolledAgi || 0}`
                : "Item crafted successfully!",
            rolledStats: isEquipment ? { rolledAtk, rolledDef, rolledStr, rolledAgi } : null
        };
    }
}
export const craftingService = new CraftingService();
//# sourceMappingURL=craftingService.js.map