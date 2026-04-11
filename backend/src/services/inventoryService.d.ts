/**
 * 📦 InventoryService
 * Manages all inventory transitions: adding, stacking, and capacity checks.
 */
export declare class InventoryService {
    /**
     * ➕ Add Item to Inventory
     * Handles stacking for materials/consumables and enforces 100-slot capacity.
     */
    addItem(characterId: string, itemCode: string, quantity?: number, rolls?: {
        rolledAtk?: number | null;
        rolledDef?: number | null;
        rolledStr?: number | null;
        rolledAgi?: number | null;
        rolledInt?: number | null;
        rolledLuk?: number | null;
    }, customTx?: any): Promise<any>;
    /**
     * 📏 Get Current Slot Count
     */
    getSlotCount(characterId: string): Promise<number>;
}
export declare const inventoryService: InventoryService;
//# sourceMappingURL=inventoryService.d.ts.map