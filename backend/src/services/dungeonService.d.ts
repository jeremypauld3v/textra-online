import type { Character } from "@prisma/client";
/**
 * 🏰 DungeonService
 * Handles dungeon encounters — enter, fight rooms, treasure, boss.
 * Per README §4.3: No escape once inside. HP resets after each room.
 */
export declare class DungeonService {
    /**
     * Generate a dungeon encounter for the travel pulse
     */
    generateDungeonEncounter(character: Character): Promise<{
        type: "DUNGEON";
        name: string;
        description: string;
        dungeonId: string;
        floorCount: number;
        bossName: string;
        minLevel: number;
    } | null>;
    /**
     * Enter a dungeon — locks the player in
     */
    enterDungeon(characterId: string): Promise<{
        success: boolean;
        dungeon: {
            templateId: string;
            name: string;
            totalFloors: number;
            floors: any[];
        };
        currentFloor: any;
        message: string;
    }>;
    /**
     * Fight the current dungeon floor
     */
    fightFloor(characterId: string): Promise<{
        type: string;
        message: string;
        nextFloor: any;
        loot?: never;
        floorIndex?: never;
        totalFloors?: never;
        isWin?: never;
        log?: never;
        expGained?: never;
        dungeonComplete?: never;
    } | {
        type: string;
        loot: {
            itemCode: string;
            quantity: number;
        }[];
        nextFloor: any;
        floorIndex: number;
        totalFloors: any;
        message: string;
        isWin?: never;
        log?: never;
        expGained?: never;
        dungeonComplete?: never;
    } | {
        type: string;
        isWin: boolean;
        log: {
            logDetails: any[];
            enemyName: string;
        };
        message: string;
        nextFloor?: never;
        loot?: never;
        floorIndex?: never;
        totalFloors?: never;
        expGained?: never;
        dungeonComplete?: never;
    } | {
        type: string;
        isWin: boolean;
        log: {
            logDetails: any[];
            enemyName: string;
        };
        expGained: any;
        loot: any[];
        dungeonComplete: boolean;
        nextFloor: any;
        floorIndex: number | null;
        totalFloors: any;
        message: string;
    }>;
    /**
     * Get current dungeon state for the UI
     */
    getDungeonState(characterId: string): Promise<{
        name: any;
        currentFloor: any;
        floorIndex: number;
        totalFloors: any;
        hp: number;
        maxHp: number;
    } | null>;
}
export declare const dungeonService: DungeonService;
//# sourceMappingURL=dungeonService.d.ts.map