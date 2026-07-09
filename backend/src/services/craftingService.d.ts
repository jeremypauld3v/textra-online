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
                code: string;
                name: string;
                emoji: string;
                type: string;
                description: string;
                statAtk: number | null;
                statDef: number | null;
                statStr: number | null;
                statAgi: number | null;
                statInt: number | null;
                statLuk: number | null;
                statDex: number | null;
                statHeal: number | null;
                statEnergy: number | null;
                minRoll: number;
                maxRoll: number;
                levelReq: number;
                equipSlot: string | null;
                classType: string | null;
                statLifesteal: number | null;
                statThorns: number | null;
                statGoldBonus: number | null;
                statExpBonus: number | null;
                statMoveSpeed: number | null;
                statHpRegen: number | null;
                sprites: import("@prisma/client/runtime/client").JsonValue | null;
                rarityId: string;
            };
        } & {
            id: string;
            itemCode: string;
            quantity: number;
            recipeId: string;
        })[];
        resultItem: {
            code: string;
            name: string;
            emoji: string;
            type: string;
            description: string;
            statAtk: number | null;
            statDef: number | null;
            statStr: number | null;
            statAgi: number | null;
            statInt: number | null;
            statLuk: number | null;
            statDex: number | null;
            statHeal: number | null;
            statEnergy: number | null;
            minRoll: number;
            maxRoll: number;
            levelReq: number;
            equipSlot: string | null;
            classType: string | null;
            statLifesteal: number | null;
            statThorns: number | null;
            statGoldBonus: number | null;
            statExpBonus: number | null;
            statMoveSpeed: number | null;
            statHpRegen: number | null;
            sprites: import("@prisma/client/runtime/client").JsonValue | null;
            rarityId: string;
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
            rolledInt: number | null;
            rolledLuk: number | null;
        } | null;
    }>;
}
export declare const craftingService: CraftingService;
//# sourceMappingURL=craftingService.d.ts.map