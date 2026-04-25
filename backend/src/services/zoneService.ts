import { prisma } from "../lib/prisma.js";

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

class ZoneService {
    private cachedZones: any[] = [];
    private lastFetch: number = 0;
    private CACHE_TTL = 30000; // 30 seconds

    async getAllZones() {
        if (Date.now() - this.lastFetch > this.CACHE_TTL) {
            this.cachedZones = await prisma.zone.findMany({
                orderBy: { minDepth: 'asc' }
            });
            this.lastFetch = Date.now();
        }
        return this.cachedZones;
    }

    async getZoneAtDepth(depth: number) {
        const zones = await this.getAllZones();
        return zones.find(z => {
            const isAboveMin = depth >= z.minDepth;
            const isBelowMax = z.maxDepth === null || depth <= z.maxDepth;
            return isAboveMin && isBelowMax;
        }) || null;
    }

    async createZone(data: ZoneData) {
        const zone = await prisma.zone.create({ data });
        this.lastFetch = 0; // Invalidate cache
        return zone;
    }

    async updateZone(id: string, data: Partial<ZoneData>) {
        const zone = await prisma.zone.update({
            where: { id },
            data
        });
        this.lastFetch = 0;
        return zone;
    }

    async deleteZone(id: string) {
        await prisma.zone.delete({ where: { id } });
        this.lastFetch = 0;
    }
}

export const zoneService = new ZoneService();
