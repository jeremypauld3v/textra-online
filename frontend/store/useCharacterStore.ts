import { create } from "zustand";
import { gameApi, CharacterStatus, BattleLogPayload } from "../api/game";
import { useAuthStore } from "./useAuthStore";

interface CharacterState {
  character: CharacterStatus | null;
  battleLogs: BattleLogPayload[];
  loading: boolean;
  screensaverActive: boolean;
  
  setCharacter: (character: CharacterStatus | null) => void;
  setBattleLogs: (battleLogs: BattleLogPayload[]) => void;
  updateCharacter: (fields: Partial<CharacterStatus>) => void;
  fetchStatus: () => Promise<void>;
  setScreensaverActive: (active: boolean) => void;
}

export const useCharacterStore = create<CharacterState>((set) => ({
  character: null,
  battleLogs: [],
  loading: true,
  screensaverActive: false,

  setCharacter: (character) => set({ character }),
  setBattleLogs: (battleLogs) => set({ battleLogs }),
  updateCharacter: (fields) => set((state) => ({
    character: state.character ? { ...state.character, ...fields } : null
  })),
  setScreensaverActive: (active) => set({ screensaverActive: active }),

  fetchStatus: async () => {
    try {
      const data = await gameApi.getStatus();
      set({
        character: data.character,
        battleLogs: data.latestBattles,
        loading: false
      });
    } catch (e: any) {
      console.error("Failed to fetch character status in store", e);
      set({ loading: false });
      if (e.response?.status === 401 || e.response?.status === 403 || e.response?.status === 404) {
        useAuthStore.getState().logout();
      }
    }
  }
}));
