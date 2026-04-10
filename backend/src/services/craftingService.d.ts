/**
 * ⚒️ CraftingService
 * Handles the logic for forging new items from materials.
 * Equipment items get RNG stat rolls (±30% of template base).
 */
export declare class CraftingService {
    /**
     * 🏗️ Get all available recipes
     */
    getRecipes(): Promise<({
        ingredients: ({
            item: {
                statEnergy: number | null;
                statHeal: number | null;
                statDef: number | null;
                statAtk: number | null;
                statAgi: number | null;
                statStr: number | null;
                code: string;
                name: string;
                emoji: string;
                rarity: string;
                type: string;
                description: string;
                levelReq: number;
                equipSlot: string | null;
            };
        } & {
            id: string;
            itemCode: string;
            quantity: number;
            recipeId: string;
        })[];
        resultItem: {
            statEnergy: number | null;
            statHeal: number | null;
            statDef: number | null;
            statAtk: number | null;
            statAgi: number | null;
            statStr: number | null;
            code: string;
            name: string;
            emoji: string;
            rarity: string;
            type: string;
            description: string;
            levelReq: number;
            equipSlot: string | null;
        };
    } & {
        levelReq: number;
        id: string;
        resultItemCode: string;
    })[]>;
    /**
     * 🎲 Roll a stat within ±30% of the base value (min 1)
     */
    private rollStat;
    /**
     * ⚒️ Craft an item from a recipe
     */
    craftItem(characterId: string, recipeId: string): Promise<{
        success: boolean;
        message: string;
        rolledStats: {
            rolledAtk: number | null;
            rolledDef: number | null;
            rolledStr: number | null;
            rolledAgi: number | null;
        } | null;
    }>;
}
export declare const craftingService: CraftingService;
//# sourceMappingURL=craftingService.d.ts.map