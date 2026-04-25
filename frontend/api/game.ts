import { apiClient } from "./client";

export interface BattleLogPayload {
  id: string;
  enemyName: string;
  isWin: boolean;
  expGained: number;
  logDetails: {
    turn: number;
    attacker: string;
    damage: number;
    message: string;
  }[];
  createdAt: string;
}

export interface CharacterStatus {
  id: string;
  name: string;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  currentDepth: number;
  locationName: string;
  isSafe: boolean;
  rankName: string;
  dangerLevel: string;
  expBonus: number;
  lootBonus: number;
  actionStatus: string;
  previousStatus?: string | null;
  pendingEncounter?: {
    type: "PVE" | "GATHERING" | "PVP" | "DUNGEON" | "PVP_INCOMING" | "PVP_WAITING";
    name: string;
    hp?: number;
    maxHp?: number;
    amount?: number;
    [key: string]: any;
  } | null;
  lastPulseAt?: string | null;
  isPaused: boolean;
  str: number;
  agi: number;
  dex: number;
  luk: number;
  int: number;
  statPoints: number;
  energy: number;
  maxEnergy: number;
  gold: number;
  // Gear Boosted Stats
  atk: number;
  def: number;
  equippedWeapon?: { id: string; template: any } | null;
  equippedChest?: { id: string; template: any } | null;
  equippedHelmet?: { id: string; template: any } | null;
  equippedBoots?: { id: string; template: any } | null;
  equippedGloves?: { id: string; template: any } | null;
  equippedCape?: { id: string; template: any } | null;
  equippedNecklace?: { id: string; template: any } | null;
  equippedRing1?: { id: string; template: any } | null;
  equippedRing2?: { id: string; template: any } | null;
  dungeonState?: any;
}

export interface InventoryItem {
  id: string;
  characterId: string;
  itemCode: string;
  quantity: number;
  rolledAtk?: number | null;
  rolledDef?: number | null;
  rolledStr?: number | null;
  rolledAgi?: number | null;
  rolledInt?: number | null;
  rolledLuk?: number | null;
}

export const gameApi = {
  getStatus: async () => {
    const response = await apiClient.get<{
      character: CharacterStatus;
      latestBattles: BattleLogPayload[];
    }>("/game/status");
    return response.data;
  },

  getInventory: async () => {
    const response = await apiClient.get<{
      inventory: InventoryItem[];
      equipment: {
        equippedWeaponId: string | null;
        equippedChestId: string | null;
        equippedHelmetId: string | null;
        equippedBootsId: string | null;
        equippedGlovesId: string | null;
        equippedCapeId: string | null;
        equippedNecklaceId: string | null;
        equippedRing1Id: string | null;
        equippedRing2Id: string | null;
      };
    }>("/game/inventory");
    return response.data;
  },

  getMetadata: async () => {
    const response = await apiClient.get<{
      items: any[];
      zones: any[];
    }>("/game/metadata");
    return response.data;
  },

  travel: async (direction: "OUT" | "IN" | "CAMP") => {
    const response = await apiClient.post<{
      success: boolean;
      message: string;
      status: string;
    }>("/game/travel", { direction });
    return response.data;
  },

  pause: async (paused: boolean) => {
    const response = await apiClient.post<{ success: boolean; isPaused: boolean }>("/game/travel/pause", { paused });
    return response.data;
  },

  resolveEncounter: async (action: "attack" | "skip" | "gather" | "enter_dungeon") => {
    const response = await apiClient.post<any>("/game/resolve-encounter", { action });
    return response.data;
  },

  dungeonFight: async () => {
    const response = await apiClient.post<any>("/game/dungeon/fight");
    return response.data;
  },

  allocateStat: async (stat: "str" | "agi" | "dex" | "luk" | "int", amount: number = 1) => {
    const response = await apiClient.post<{ success: boolean; character: CharacterStatus }>("/game/stats/allocate", { stat, amount });
    return response.data;
  },
  
  equip: async (inventoryItemId: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>("/game/equip", { inventoryItemId });
    return response.data;
  },

  unequip: async (slot: "WEAPON" | "CHEST" | "HELMET" | "BOOTS" | "GLOVES" | "CAPE" | "NECKLACE" | "RING1" | "RING2") => {
    const response = await apiClient.post<{ success: boolean; message: string }>("/game/unequip", { slot });
    return response.data;
  },

  reforge: async (inventoryItemId: string) => {
    const response = await apiClient.post<{ success: boolean; item: any }>("/game/reforge", { inventoryItemId });
    return response.data;
  },

  useItem: async (inventoryItemId: string) => {
    const response = await apiClient.post<{ 
      success: boolean; 
      healed: number; 
      energyRestored: number;
      newHp: number;
      newEnergy: number;
    }>("/game/use-item", { inventoryItemId });
    return response.data;
  },

  getRecipes: async () => {
    const response = await apiClient.get<{ recipes: any[] }>("/game/recipes");
    return response.data;
  },

  craft: async (recipeId: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>("/game/craft", { recipeId });
    return response.data;
  },

  getMarket: async () => {
    const response = await apiClient.get<{ listings: any[] }>("/game/market");
    return response.data;
  },

  listItem: async (inventoryItemId: string, quantity: number, price: number) => {
    const response = await apiClient.post<{ success: boolean; listing: any }>("/game/market/list", { inventoryItemId, quantity, price });
    return response.data;
  },

  buyItem: async (listingId: string, quantity: number) => {
    const response = await apiClient.post<{ success: boolean; message: string }>("/game/market/buy", { listingId, quantity });
    return response.data;
  },

  cancelListing: async (listingId: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>("/game/market/cancel", { listingId });
    return response.data;
  },
  
  getFriends: async () => {
    const response = await apiClient.get<{ friends: any[], pending: any[] }>("/game/friends");
    return response.data;
  },

  addFriend: async (targetName: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>("/game/friends/add", { targetName });
    return response.data;
  },

  acceptFriend: async (targetUserId: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>("/game/friends/accept", { targetUserId });
    return response.data;
  },

  removeFriend: async (targetUserId: string) => {
    const response = await apiClient.post<{ success: boolean; message: string }>("/game/friends/remove", { targetUserId });
    return response.data;
  },

  getWorldChatHistory: async () => {
    const response = await apiClient.get<{ messages: any[] }>("/game/chat/world");
    return response.data;
  },

  getTradeChatHistory: async () => {
    const response = await apiClient.get<{ messages: any[] }>("/game/chat/trade");
    return response.data;
  },

  getRecentWhisperPartners: async () => {
    const response = await apiClient.get<{ partners: any[] }>("/game/chat/private/recent");
    return response.data;
  },

  clearPrivateChatHistory: async (targetUserId: string) => {
    const response = await apiClient.post<{ success: boolean }>("/game/chat/private/clear", { targetUserId });
    return response.data;
  },

  getPrivateChatHistory: async (targetUserId: string) => {
    const response = await apiClient.get<{ messages: any[] }>(`/game/chat/private/${targetUserId}`);
    return response.data;
  }
};
