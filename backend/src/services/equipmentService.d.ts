/**
 * 🛡️ EquipmentService
 * Handles the logic for equipping and unequipping gear.
 */
export declare class EquipmentService {
    /**
     * 🗡️ Equip an item from inventory to a slot
     */
    equipItem(characterId: string, inventoryItemId: string): Promise<{
        int: number;
        name: string;
        id: string;
        hp: number;
        createdAt: Date;
        updatedAt: Date;
        level: number;
        exp: number;
        maxHp: number;
        currentDepth: number;
        actionStatus: string;
        lastPulseAt: Date | null;
        previousStatus: string | null;
        pendingEncounter: import("@prisma/client/runtime/client").JsonValue | null;
        currentPath: import("@prisma/client/runtime/client").JsonValue | null;
        dungeonProgress: number | null;
        dungeonData: import("@prisma/client/runtime/client").JsonValue | null;
        str: number;
        agi: number;
        dex: number;
        luk: number;
        statPoints: number;
        gold: number;
        energy: number;
        maxEnergy: number;
        userId: string;
        equippedWeaponId: string | null;
        equippedChestId: string | null;
        equippedHelmetId: string | null;
        equippedBootsId: string | null;
    }>;
    /**
     * 🚶 Unequip an item from a slot
     */
    unequipItem(characterId: string, slot: "WEAPON" | "CHEST" | "HELMET" | "BOOTS"): Promise<{
        int: number;
        name: string;
        id: string;
        hp: number;
        createdAt: Date;
        updatedAt: Date;
        level: number;
        exp: number;
        maxHp: number;
        currentDepth: number;
        actionStatus: string;
        lastPulseAt: Date | null;
        previousStatus: string | null;
        pendingEncounter: import("@prisma/client/runtime/client").JsonValue | null;
        currentPath: import("@prisma/client/runtime/client").JsonValue | null;
        dungeonProgress: number | null;
        dungeonData: import("@prisma/client/runtime/client").JsonValue | null;
        str: number;
        agi: number;
        dex: number;
        luk: number;
        statPoints: number;
        gold: number;
        energy: number;
        maxEnergy: number;
        userId: string;
        equippedWeaponId: string | null;
        equippedChestId: string | null;
        equippedHelmetId: string | null;
        equippedBootsId: string | null;
    }>;
    /**
     * 📊 Calculate Total Stats (Base + Gear)
     * Uses per-item rolled stats if available, otherwise falls back to template base stats.
     */
    getCharacterCombatStats(characterId: string): Promise<{
        atk: number;
        def: number;
        str: number;
        agi: number;
        dex: number;
        int: number;
        luk: number;
    }>;
}
export declare const equipmentService: EquipmentService;
//# sourceMappingURL=equipmentService.d.ts.map