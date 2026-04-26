import type { Character } from "@prisma/client";
import { Prisma } from "@prisma/client";
export interface TurnLog {
    turn: number;
    attacker: "Player" | "Enemy";
    damage: number;
    message: string;
    isCrit?: boolean;
}
/**
 * 📊 RADIAL DEPTH TIERS & REWARDS
 */
export declare const getDepthTier: (depth: number) => Promise<{
    name: any;
    dangerMult: any;
    expMult: any;
    lootMult: any;
    prefix: string;
    commonNodeTypes: any;
    excludedNodeTypes: any;
}>;
export declare function generatePVEEncounter(character: Character): Promise<{
    type: string;
    name: string;
    hp: number;
    maxHp: number;
    attack: number;
    defense: number;
    expValue: number;
}>;
export declare function generateGatheringEncounter(character: Character): Promise<{
    type: string;
    name: any;
    icon: any;
    hp: number;
    maxHp: number;
    xpReward: number;
    resourceNodeTemplateId: any;
}>;
export declare function executeCombat(character: Character, enemy: any): Promise<{
    success: boolean;
    isWin: boolean;
    updatedChar: {
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
        pendingEncounter: Prisma.JsonValue | null;
        previousStatus: string | null;
        statPoints: number;
        currentPath: Prisma.JsonValue | null;
        currentDepth: number;
        dungeonData: Prisma.JsonValue | null;
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
    };
    log: {
        id: string;
        createdAt: Date;
        characterId: string;
        enemyName: string;
        logDetails: Prisma.JsonValue;
        isWin: boolean;
        expGained: number;
    };
    lootedItems: any[];
    experienceGained: any;
    goldGained: number;
    playerName: string;
    enemyName: any;
    startPlayerHp: number;
    startMaxPlayerHp: number;
    startEnemyHp: any;
    startMaxEnemyHp: any;
}>;
export declare function executeGathering(character: Character, node: any): Promise<{
    success: boolean;
    type: string;
    isWin: boolean;
    item: any;
    amount: number;
    updatedChar: {
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
        pendingEncounter: Prisma.JsonValue | null;
        previousStatus: string | null;
        statPoints: number;
        currentPath: Prisma.JsonValue | null;
        currentDepth: number;
        dungeonData: Prisma.JsonValue | null;
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
    };
    log: {
        id: string;
        createdAt: Date;
        characterId: string;
        enemyName: string;
        logDetails: Prisma.JsonValue;
        isWin: boolean;
        expGained: number;
    };
    experienceGained: any;
    goldGained: number;
    startIntegrity: any;
    startMaxPlayerHp: number;
    startPlayerHp: number;
    lootedItems: any[];
}>;
/**
 * 🎲 UNIVERSAL LOOT ROLLER
 * Handles depth-scaling, Rarity modifiers, and Luck bonuses.
 */
export declare function resolveLootRolls(character: Character, stats: any, lootTable: any[], manualMultiplier?: number): Promise<any[]>;
/**
 * ⚔️ PVP COMBAT RESOLUTION
 */
export declare function resolvePvpCombat(attackerId: string, defenderId: string): Promise<{
    isWin: boolean;
    winnerName: string;
    loserName: string;
    goldStolen: number;
    goldGained: number;
    experienceGained: number;
    lootedItems: {
        itemCode: string;
        quantity: number;
    }[];
    log: {
        logDetails: TurnLog[];
        enemyName: string;
    };
    attackerName: string;
    defenderName: string;
    attackerStartHp: number;
    attackerMaxHp: number;
    defenderStartHp: number;
    defenderMaxHp: number;
}>;
//# sourceMappingURL=combatEngine.d.ts.map