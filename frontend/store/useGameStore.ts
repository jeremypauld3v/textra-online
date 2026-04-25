import { create } from "zustand";
import { gameApi } from "../api/game";

interface GameState {
  items: Record<string, any>;
  zones: any[];
  isMetadataLoaded: boolean;
  fetchMetadata: (retries?: number, delay?: number) => Promise<void>;
}

export const useGameStore = create<GameState>((set) => ({
  items: {},
  zones: [],
  isMetadataLoaded: false,

  fetchMetadata: async (retries = 3, delay = 1000) => {
    try {
      const data = await gameApi.getMetadata();
      
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
      console.error(`Failed to sync game metadata. Retries left: ${retries}`, e);
      if (retries > 0) {
        setTimeout(() => {
          useGameStore.getState().fetchMetadata(retries - 1, delay * 2);
        }, delay);
      }
    }
  }
}));
