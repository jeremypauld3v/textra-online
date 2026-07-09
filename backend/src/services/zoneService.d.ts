export interface ZoneData {
    name: string;
    minDepth: number;
    maxDepth: number | null;
    dangerMultiplier: number;
    expMultiplier: number;
    dropChanceMultiplier: number;
    commonNodeTypes: string[];
    excludedNodeTypes: string[];
    sprites?: any;
}
declare class ZoneService {
    private cachedZones;
    private lastFetch;
    private CACHE_TTL;
    getAllZones(): Promise<any[]>;
    getZoneAtDepth(depth: number): Promise<any>;
    createZone(data: ZoneData): Promise<{
        name: string;
        sprites: import("@prisma/client/runtime/client").JsonValue | null;
        id: string;
        minDepth: number;
        maxDepth: number | null;
        expMultiplier: number;
        dangerMultiplier: number;
        dropChanceMultiplier: number;
        commonNodeTypes: string[];
        excludedNodeTypes: string[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    updateZone(id: string, data: Partial<ZoneData>): Promise<{
        name: string;
        sprites: import("@prisma/client/runtime/client").JsonValue | null;
        id: string;
        minDepth: number;
        maxDepth: number | null;
        expMultiplier: number;
        dangerMultiplier: number;
        dropChanceMultiplier: number;
        commonNodeTypes: string[];
        excludedNodeTypes: string[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    deleteZone(id: string): Promise<void>;
}
export declare const zoneService: ZoneService;
export {};
//# sourceMappingURL=zoneService.d.ts.map