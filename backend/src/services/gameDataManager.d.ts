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
    initialize(): Promise<void>;
    getItem(code: string): Promise<any>;
    getAllItems(): Promise<any[]>;
    getMonster(name: string): Promise<any>;
    getRandomMonster(): Promise<any>;
    getResourceNodes(): Promise<{
        name: string;
        type: string;
        id: string;
        itemCode: string;
        icon: string;
        baseHp: number;
        xpReward: number;
    }[]>;
}
export declare const gameDataManager: GameDataManager;
export {};
//# sourceMappingURL=gameDataManager.d.ts.map