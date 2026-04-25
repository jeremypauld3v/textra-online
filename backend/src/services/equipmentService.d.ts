/**
 * 🛡️ EquipmentService
 * Handles the logic for equipping and unequipping gear.
 */
export declare class EquipmentService {
    private statsCache;
    private CACHE_TTL;
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
        str: number;
        agi: number;
        dex: number;
        luk: number;
        energy: number;
        maxEnergy: number;
        userId: string;
        actionStatus: string;
        maxHp: number;
        lastPulseAt: Date | null;
        isPaused: boolean;
        pendingEncounter: import("@prisma/client/runtime/client").JsonValue | null;
        previousStatus: string | null;
        statPoints: number;
        currentPath: import("@prisma/client/runtime/client").JsonValue | null;
        currentDepth: number;
        dungeonData: import("@prisma/client/runtime/client").JsonValue | null;
        dungeonProgress: number | null;
        equippedWeaponId: string | null;
        equippedChestId: string | null;
        equippedHelmetId: string | null;
        equippedBootsId: string | null;
        equippedGlovesId: string | null;
        equippedCapeId: string | null;
        equippedNecklaceId: string | null;
        equippedRing1Id: string | null;
        equippedRing2Id: string | null;
        gold: number;
    }>;
    /**
     * 🚶 Unequip an item from a slot
     */
    unequipItem(characterId: string, slot: "WEAPON" | "CHEST" | "HELMET" | "BOOTS" | "GLOVES" | "CAPE" | "NECKLACE" | "RING1" | "RING2"): Promise<{
        int: number;
        name: string;
        id: string;
        hp: number;
        createdAt: Date;
        updatedAt: Date;
        level: number;
        exp: number;
        str: number;
        agi: number;
        dex: number;
        luk: number;
        energy: number;
        maxEnergy: number;
        userId: string;
        actionStatus: string;
        maxHp: number;
        lastPulseAt: Date | null;
        isPaused: boolean;
        pendingEncounter: import("@prisma/client/runtime/client").JsonValue | null;
        previousStatus: string | null;
        statPoints: number;
        currentPath: import("@prisma/client/runtime/client").JsonValue | null;
        currentDepth: number;
        dungeonData: import("@prisma/client/runtime/client").JsonValue | null;
        dungeonProgress: number | null;
        equippedWeaponId: string | null;
        equippedChestId: string | null;
        equippedHelmetId: string | null;
        equippedBootsId: string | null;
        equippedGlovesId: string | null;
        equippedCapeId: string | null;
        equippedNecklaceId: string | null;
        equippedRing1Id: string | null;
        equippedRing2Id: string | null;
        gold: number;
    }>;
    /**
     * 📊 Calculate Total Stats (Base + Gear)
     * Uses per-item rolled stats if available, otherwise falls back to template base stats.
     */
    getCharacterCombatStats(characterId: string): Promise<any>;
}
export declare const equipmentService: EquipmentService;
//# sourceMappingURL=equipmentService.d.ts.map