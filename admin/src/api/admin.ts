import axios, { type InternalAxiosRequestConfig } from 'axios';

const API_URL = 'http://localhost:3000/api';

const client = axios.create({
  baseURL: API_URL,
});

// Interceptor to add auth token
client.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = localStorage.getItem('admin_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface Rarity {
  id: string;
  name: string;
  rank: number;
  color: string;
  dropRateModifier: number;
  hasGlow: boolean;
}

export interface ItemTemplate {
  code: string;
  name: string;
  emoji: string;
  rarityId: string;
  rarity?: Rarity;
  type: string;
  description: string;
  statAtk?: number;
  statDef?: number;
  statStr?: number;
  statAgi?: number;
  statInt?: number;
  statLuk?: number;
  statDex?: number;
  statHeal?: number;
  statEnergy?: number;
  minRoll: number;
  maxRoll: number;
  levelReq: number;
  equipSlot?: string;
}

export interface InventoryItem {
  id: string;
  characterId: string;
  itemCode: string;
  quantity: number;
  rolledAtk?: number;
  rolledDef?: number;
  rolledStr?: number;
  rolledAgi?: number;
  rolledInt?: number;
  rolledLuk?: number;
  template: ItemTemplate;
}

export interface Character {
  id: string;
  name: string;
  level: number;
  exp: number;
  str: number;
  agi: number;
  dex: number;
  luk: number;
  int: number;
  gold: number;
  hp: number;
  maxHp: number;
  actionStatus: string;
  statPoints: number;
  currentDepth: number;
  user: { email: string };
  inventory?: InventoryItem[];
}

export interface LootTableEntry {
  id?: string;
  itemCode: string;
  chance: number;
  minQuantity: number;
  maxQuantity: number;
  item?: ItemTemplate;
}

export interface MonsterTemplate {
  id: string;
  name: string;
  hp: number;
  attack: number;
  defense: number;
  expReward: number;
  goldReward: number;
  minGoldMult: number;
  maxGoldMult: number;
  minDepth: number;
  isBoss: boolean;
  dungeonId: string | null;
  lootTable: LootTableEntry[];
}

export interface ResourceNodeTemplate {
  id: string;
  name: string;
  type: string;
  icon: string;
  baseHp: number;
  xpReward: number;
  lootTable: LootTableEntry[];
}

export interface MarketListing {
  id: string;
  sellerId: string;
  itemCode: string;
  quantity: number;
  price: number;
  rolledAtk?: number;
  rolledDef?: number;
  rolledStr?: number;
  rolledAgi?: number;
  rolledInt?: number;
  rolledLuk?: number;
  template: ItemTemplate;
  seller: { name: string };
}

export interface DungeonTemplate {
  id: string;
  name: string;
  description: string;
  minDepth: number;
  maxDepth?: number | null;
  minLevel: number;
  floorCount: number;
  lootMultiplier: number;
  expMultiplier: number;
  treasureChance: number;
}

export interface RecipeIngredient {
  id?: string;
  itemCode: string;
  quantity: number;
  item?: ItemTemplate;
}

export interface CraftingRecipe {
  id: string;
  resultItemCode: string;
  levelReq: number;
  resultItem?: ItemTemplate;
  ingredients: RecipeIngredient[];
}

export interface DashboardStats {
  userCount: number;
  charCount: number;
  itemTemplateCount: number;
  marketListingCount: number;
  zoneCount: number;
}

export interface Zone {
  id: string;
  name: string;
  minDepth: number;
  maxDepth: number | null;
  dangerMultiplier: number;
  expMultiplier: number;
  dropChanceMultiplier: number;
  commonNodeTypes: string[];
  excludedNodeTypes: string[];
}

export interface WorldConfig {
  current: Record<string, number>;
}

export const adminApi = {
  getDashboard: () => client.get<DashboardStats>('/admin/dashboard'),
  
  // Items
  getItems: () => client.get<ItemTemplate[]>('/admin/items'),
  createItem: (data: Partial<ItemTemplate>) => client.post<ItemTemplate>('/admin/items', data),
  updateItem: (code: string, data: Partial<ItemTemplate>) => client.put<ItemTemplate>(`/admin/items/${code}`, data),
  deleteItem: (code: string) => client.delete(`/admin/items/${code}`),
  
  // Players
  getPlayers: () => client.get<Character[]>('/admin/players'),
  getPlayerDetail: (id: string) => client.get<Character>(`/admin/players/${id}`),
  updatePlayer: (id: string, data: Partial<Character>) => client.put<Character>(`/admin/players/${id}`, data),
  spawnItem: (id: string, itemCode: string, quantity: number) => client.post(`/admin/players/${id}/inventory`, { itemCode, quantity }),
  removeItem: (playerId: string, itemId: string) => client.delete(`/admin/players/${playerId}/inventory/${itemId}`),
  removeItems: (playerId: string, itemIds: string[]) => client.delete(`/admin/players/${playerId}/inventory`, { data: { itemIds } }),

  // Monsters
  getMonsters: () => client.get<MonsterTemplate[]>('/admin/monsters'),
  createMonster: (data: Partial<MonsterTemplate>) => client.post<MonsterTemplate>('/admin/monsters', data),
  updateMonster: (id: string, data: Partial<MonsterTemplate>) => client.put<MonsterTemplate>(`/admin/monsters/${id}`, data),
  deleteMonster: (id: string) => client.delete(`/admin/monsters/${id}`),

  // Dungeons
  getDungeons: () => client.get<DungeonTemplate[]>('/admin/dungeons'),
  createDungeon: (data: Partial<DungeonTemplate>) => client.post<DungeonTemplate>('/admin/dungeons', data),
  updateDungeon: (id: string, data: Partial<DungeonTemplate>) => client.put<DungeonTemplate>(`/admin/dungeons/${id}`, data),
  deleteDungeon: (id: string) => client.delete(`/admin/dungeons/${id}`),

  // Resource Nodes
  getResourceNodes: () => client.get<ResourceNodeTemplate[]>('/admin/resource-nodes'),
  createResourceNode: (data: Partial<ResourceNodeTemplate>) => client.post<ResourceNodeTemplate>('/admin/resource-nodes', data),
  updateResourceNode: (id: string, data: Partial<ResourceNodeTemplate>) => client.put<ResourceNodeTemplate>(`/admin/resource-nodes/${id}`, data),
  deleteResourceNode: (id: string) => client.delete(`/admin/resource-nodes/${id}`),

  // Marketplace
  getMarket: () => client.get<MarketListing[]>('/admin/market'),
  deleteListing: (id: string) => client.delete(`/admin/market/${id}`),

  // Recipes
  getRecipes: () => client.get<CraftingRecipe[]>('/admin/recipes'),
  createRecipe: (data: Partial<CraftingRecipe>) => client.post<CraftingRecipe>('/admin/recipes', data),
  updateRecipe: (id: string, data: Partial<CraftingRecipe>) => client.put<CraftingRecipe>(`/admin/recipes/${id}`, data),
  deleteRecipe: (id: string) => client.delete(`/admin/recipes/${id}`),
  
  // Zones
  getZones: () => client.get<Zone[]>('/admin/zones'),
  createZone: (data: Partial<Zone>) => client.post<Zone>('/admin/zones', data),
  updateZone: (id: string, data: Partial<Zone>) => client.put<Zone>(`/admin/zones/${id}`, data),
  deleteZone: (id: string) => client.delete(`/admin/zones/${id}`),
  
  // System
  broadcast: (message: string) => client.post('/admin/broadcast', { message }),
  getConfig: () => client.get<WorldConfig>('/admin/config'),
};
