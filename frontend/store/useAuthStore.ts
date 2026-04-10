import { create } from "zustand";
import * as SecureStore from "expo-secure-store";

interface AuthState {
  token: string | null;
  characterId: string | null;
  userId: string | null;
  isLoadingSession: boolean;
  login: (token: string, characterId: string, userId: string) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  characterId: null,
  userId: null,
  isLoadingSession: true,
  
  login: async (token, characterId, userId) => {
    await SecureStore.setItemAsync("userToken", token);
    await SecureStore.setItemAsync("characterId", characterId);
    await SecureStore.setItemAsync("userId", userId);
    set({ token, characterId, userId });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("userToken");
    await SecureStore.deleteItemAsync("characterId");
    await SecureStore.deleteItemAsync("userId");
    set({ token: null, characterId: null, userId: null });
  },

  hydrate: async () => {
    try {
      const token = await SecureStore.getItemAsync("userToken");
      const characterId = await SecureStore.getItemAsync("characterId");
      const userId = await SecureStore.getItemAsync("userId");
      
      if (token && characterId && userId) {
        set({ token, characterId, userId, isLoadingSession: false });
      } else {
        set({ isLoadingSession: false });
      }
    } catch (e) {
      console.error("Failed to hydrate session", e);
      set({ isLoadingSession: false });
    }
  }
}));
