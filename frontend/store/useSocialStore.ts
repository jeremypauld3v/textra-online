import { create } from "zustand";

interface SocialState {
  hasUnreadWhispers: boolean;
  hasFriendRequest: boolean;
  setHasUnreadWhispers: (val: boolean) => void;
  setHasFriendRequest: (val: boolean) => void;
  clearNotifications: () => void;
}

/**
 * Global store to track social notifications across the app.
 * Used primarily for the red dot indicator on the bottom tab bar.
 */
export const useSocialStore = create<SocialState>((set) => ({
  hasUnreadWhispers: false,
  hasFriendRequest: false,

  setHasUnreadWhispers: (val) => set({ hasUnreadWhispers: val }),
  setHasFriendRequest: (val) => set({ hasFriendRequest: val }),

  clearNotifications: () => set({ 
    hasUnreadWhispers: false, 
    hasFriendRequest: false 
  }),
}));
