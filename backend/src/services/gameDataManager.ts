import { prisma } from "../lib/prisma.js";

/**
 * 🧠 GameDataManager
 * Centralized service to handle all DB-driven game metadata.
 * Implements a simple cache to ensure performance during intensive combat/travel loops.
 */
class GameDataManager {
  private itemCache: Map<string, any> = new Map();
  private monsterCache: Map<string, any> = new Map();
  private lastUpdate: number = 0;
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async initialize() {
    const now = Date.now();
    if (now - this.lastUpdate < this.CACHE_TTL && this.itemCache.size > 0) return;

    console.log("🔄 Syncing Game Metadata from Database...");

    const [items, monsters, rarities] = await Promise.all([
      prisma.itemTemplate.findMany({ include: { rarity: true } }),
      prisma.monsterTemplate.findMany({ include: { lootTable: { include: { item: { include: { rarity: true } } } } } }),
      prisma.rarity.findMany()
    ]);

    this.itemCache.clear();
    items.forEach(i => this.itemCache.set(i.code, i));

    this.monsterCache.clear();
    monsters.forEach(m => this.monsterCache.set(m.name, m));

    this.lastUpdate = now;
  }

  async getItem(code: string) {
    await this.initialize();
    return this.itemCache.get(code);
  }

  async getAllItems() {
    await this.initialize();
    return Array.from(this.itemCache.values());
  }

  async getMonster(name: string) {
    await this.initialize();
    return this.monsterCache.get(name);
  }

  async getRandomMonster(depth: number) {
    await this.initialize();
    const monsters = Array.from(this.monsterCache.values());
    
    // Filter monsters by depth
    const eligible = monsters.filter(m => (m.minDepth || 0) <= depth);
    
    // Fallback to all monsters if none found (shouldn't happen with Forest Slime at minDepth 0)
    const pool = eligible.length > 0 ? eligible : monsters;
    
    return pool[Math.floor(Math.random() * pool.length)];
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
