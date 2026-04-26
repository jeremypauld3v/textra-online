export interface ZoneData {
    name: string;
    minDepth: number;
    maxDepth: number | null;
    dangerMultiplier: number;
    expMultiplier: number;
    dropChanceMultiplier: number;
    commonNodeTypes: string[];
    excludedNodeTypes: string[];
}
declare class ZoneService {
    private cachedZones;
    private lastFetch;
    private CACHE_TTL;
    getAllZones(): Promise<any[]>;
    getZoneAtDepth(depth: number): Promise<any>;
    createZone(data: ZoneData): Promise<{
        name: string;
        id: string;
        minDepth: number;
        maxDepth: number | null;
        expMultiplier: number;
        createdAt: Date;
        updatedAt: Date;
        dangerMultiplier: number;
        dropChanceMultiplier: number;
        commonNodeTypes: string[];
        excludedNodeTypes: string[];
    }>;
    updateZone(id: string, data: Partial<ZoneData>): Promise<{
        name: string;
        id: string;
        minDepth: number;
        maxDepth: number | null;
        expMultiplier: number;
        createdAt: Date;
        updatedAt: Date;
        dangerMultiplier: number;
        dropChanceMultiplier: number;
        commonNodeTypes: string[];
        excludedNodeTypes: string[];
    }>;
    deleteZone(id: string): Promise<void>;
}
export declare const zoneService: ZoneService;
export {};
//# sourceMappingURL=zoneService.d.ts.map