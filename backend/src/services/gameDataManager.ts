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

    const [items, monsters] = await Promise.all([
      prisma.itemTemplate.findMany(),
      prisma.monsterTemplate.findMany({ include: { lootTable: true } })
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

  async getRandomMonster() {
    await this.initialize();
    const monsters = Array.from(this.monsterCache.values());
    return monsters[Math.floor(Math.random() * monsters.length)];
  }

  async getResourceNodes() {
    // These are static enough to fetch directly or cache similarly
    return prisma.resourceNodeTemplate.findMany();
  }
}

export const gameDataManager = new GameDataManager();
