/**
 * 🧠 GameDataManager
 * Centralized service to handle all DB-driven game metadata.
 * Implements a simple cache to ensure performance during intensive combat/travel loops.
 */
declare class GameDataManager {
    private itemCache;
    private monsterCache;
    private lastUpdate;
    private CACHE_TTL;
    initialize(force?: boolean): Promise<void>;
    getItem(code: string): Promise<any>;
    getAllItems(): Promise<any[]>;
    getMonster(name: string): Promise<any>;
    getRandomMonster(depth: number): Promise<any>;
    getDungeonMonsters(dungeonId: string): Promise<{
        regular: any[];
        boss: any;
    }>;
    getResourceNodes(): Promise<({
        lootTable: ({
            item: {
                rarity: {
                    name: string;
                    id: string;
                    rank: number;
                    color: string;
                    dropRateModifier: number;
                    hasGlow: boolean;
                };
            } & {
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
            chance: number;
            minQuantity: number;
            maxQuantity: number;
            depthBonus: number;
            monsterTemplateId: string | null;
            resourceNodeTemplateId: string | null;
            itemCode: string;
        })[];
    } & {
        name: string;
        type: string;
        sprites: import("@prisma/client/runtime/client").JsonValue | null;
        id: string;
        icon: string;
        baseHp: number;
        xpReward: number;
    })[]>;
}
export declare const gameDataManager: GameDataManager;
export {};
//# sourceMappingURL=gameDataManager.d.ts.map