import { prisma } from "../lib/prisma.js";
/**
 * 🧠 GameDataManager
 * Centralized service to handle all DB-driven game metadata.
 * Implements a simple cache to ensure performance during intensive combat/travel loops.
 */
class GameDataManager {
    itemCache = new Map();
    monsterCache = new Map();
    lastUpdate = 0;
    CACHE_TTL = 5 * 60 * 1000; // 5 minutes
    async initialize() {
        const now = Date.now();
        if (now - this.lastUpdate < this.CACHE_TTL && this.itemCache.size > 0)
            return;
        // Use a lock-like pattern to prevent concurrent re-initialization
        if (this.lastUpdate === -1)
            return;
        const prevUpdate = this.lastUpdate;
        this.lastUpdate = -1;
        try {
            console.log("🔄 Syncing Game Metadata from Database...");
            const [items, monsters] = await Promise.all([
                prisma.itemTemplate.findMany({ include: { rarity: true } }),
                prisma.monsterTemplate.findMany({ include: { lootTable: { include: { item: { include: { rarity: true } } } } } }),
            ]);
            this.itemCache.clear();
            items.forEach(i => this.itemCache.set(i.code, i));
            this.monsterCache.clear();
            monsters.forEach(m => this.monsterCache.set(m.name, m));
            this.lastUpdate = now;
        }
        catch (err) {
            this.lastUpdate = prevUpdate; // Reset on failure
            throw err;
        }
    }
    async getItem(code) {
        await this.initialize();
        return this.itemCache.get(code);
    }
    async getAllItems() {
        await this.initialize();
        return Array.from(this.itemCache.values());
    }
    async getMonster(name) {
        await this.initialize();
        return this.monsterCache.get(name);
    }
    async getRandomMonster(depth) {
        await this.initialize();
        const monsters = Array.from(this.monsterCache.values());
        // Improved depth logic: Monsters have a specific depth range
        // or we pick from the closest tier.
        const eligible = monsters.filter(m => (m.minDepth || 0) <= depth);
        // Sort by depth descending and pick from top 3 to keep it challenging
        eligible.sort((a, b) => (b.minDepth || 0) - (a.minDepth || 0));
        const pool = eligible.slice(0, 3);
        return pool[Math.floor(Math.random() * pool.length)] || monsters[0];
    }
    async getResourceNodes() {
        return prisma.resourceNodeTemplate.findMany({
            include: {
                lootTable: {
                    include: {
                        item: {
                            include: {
                                rarity: true
                            }
                        }
                    }
                }
            }
        });
    }
}
export const gameDataManager = new GameDataManager();
//# sourceMappingURL=gameDataManager.js.map