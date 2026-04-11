/**
 * 📝 UI Strings & Messages
 */
export const UI_STRINGS = {
  // ⚔️ Encounter Enums
  ENCOUNTER_TYPES: {
    GATHERING: "Resource Node",
    DUNGEON: "Hidden Entrance",
    HOSTILE: "Hostile Presence",
    PVP: "Player Ambush",
  },

  // 🚪 Modal Defaults
  DECISION_REQUIRED: "DECISION REQUIRED",
  DECISION_WAITING: "Waiting for target to respond...",
  UNKNWON_DISCOVERY: "Unknown Discovery",

  // 🏔️ Locations
  VALORIA_CITY: "Valoria City",
  LOCATION_PREFIX: "km from City",

  // 🔔 Notifications
  LEVEL_UP: "✨ LEVEL UP!",
  LEVEL_REACHED: (level: number) => `Level ${level} reached!`,
  ESCAPED: "⚡ Escaped!",
  BATTLE_VICTORY: "⚔️ Victory!",
  BATTLE_DEFEAT: "💀 Defeated!",

  // 🛠️ Errors
  ERROR_RESOLVE_FAILED: "Failed to resolve encounter",
  ERROR_GENERIC: "Something went wrong",
};
