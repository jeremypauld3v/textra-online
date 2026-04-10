/**
 * 🧪 ConsumableService
 * Handles the logic for using potions and food.
 */
export declare class ConsumableService {
    /**
     * 🧪 Use a consumable item from inventory
     */
    useItem(characterId: string, inventoryItemId: string): Promise<{
        success: boolean;
        healed: number;
        energyRestored: number;
        newHp: number;
        newEnergy: number;
    }>;
}
export declare const consumableService: ConsumableService;
//# sourceMappingURL=consumableService.d.ts.map