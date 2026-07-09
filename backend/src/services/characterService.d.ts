export declare function getCharacterStatusPayload(characterId: string): Promise<{
    character: any;
    latestBattles: {
        character: undefined;
        id: string;
        createdAt: Date;
        characterId: string;
        enemyName: string;
        logDetails: import("@prisma/client/runtime/client").JsonValue;
        isWin: boolean;
        expGained: number;
    }[];
}>;
//# sourceMappingURL=characterService.d.ts.map