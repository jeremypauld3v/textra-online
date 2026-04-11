import { create } from 'zustand';

export interface SimBattleData {
  log: { logDetails: any[]; enemyName?: string };
  startPlayerHp: number;
  startMaxPlayerHp: number;
  startEnemyHp: number;
  startMaxEnemyHp: number;
  playerName?: string;
  enemyName?: string;
  isPvp?: boolean;
  isWin?: boolean;
  goldStolen?: number;
  isGathering?: boolean;
  startIntegrity?: number;
  [key: string]: any;
}

interface EncounterState {
  simBattle: SimBattleData | null;
  setSimBattle: (data: SimBattleData | null) => void;
}

export const useEncounterStore = create<EncounterState>((set) => ({
  simBattle: null,
  setSimBattle: (data) => set({ simBattle: data }),
}));
