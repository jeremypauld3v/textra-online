import { create } from "zustand";
import { gameApi } from "../api/game";

interface GameState {
  items: Record<string, any>;
  zones: any[];
  isMetadataLoaded: boolean;
  fetchMetadata: () => Promise<void>;
}

export const useGameStore = create<GameState>((set) => ({
  items: {},
  zones: [],
  isMetadataLoaded: false,

  fetchMetadata: async () => {
    try {
      const data = await gameApi.getMetadata();
      
      // Transform items array to a quick-lookup record
      const itemsMap: Record<string, any> = {};
      data.items.forEach((item: any) => {
        itemsMap[item.code] = item;
      });

      set({ 
        items: itemsMap, 
        zones: data.zones, 
        isMetadataLoaded: true 
      });
    } catch (e) {
      console.error("Failed to sync game metadata", e);
    }
  }
}));
