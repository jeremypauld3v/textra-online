/**
 * ⚒️ ReforgeService
 * Allows players to reroll variable stats on equipment.
 */
export declare class ReforgeService {
    /**
     * 🎲 Reforge an item
     * Wipes current rolls and generates new ones based on template & character LUK.
     */
    reforgeItem(characterId: string, inventoryItemId: string): Promise<{
        id: string;
        itemCode: string;
        quantity: number;
        characterId: string;
        rolledAtk: number | null;
        rolledDef: number | null;
        rolledStr: number | null;
        rolledAgi: number | null;
        rolledInt: number | null;
        rolledLuk: number | null;
    }>;
}
export declare const reforgeService: ReforgeService;
//# sourceMappingURL=reforgeService.d.ts.map