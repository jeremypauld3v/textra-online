import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

interface AuthState {
  token: string | null;
  characterId: string | null;
  isLoadingSession: boolean;
  login: (token: string, characterId: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  characterId: null,
  isLoadingSession: true,
  
  login: async (token, characterId) => {
    await SecureStore.setItemAsync("userToken", token);
    await SecureStore.setItemAsync("characterId", characterId);
    set({ token, characterId });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("userToken");
    await SecureStore.deleteItemAsync("characterId");
    set({ token: null, characterId: null });
  },

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const characterId = await SecureStore.getItemAsync("characterId");
      
      if (token && characterId) {
        set({ token, characterId, isLoadingSession: false });
      } else {
        set({ isLoadingSession: false });
      }
    } catch (e) {
      console.error("Failed to hydrate session", e);
      set({ isLoadingSession: false });
    }
  }
}));
