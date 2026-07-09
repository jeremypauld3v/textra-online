/**
 * ⚖️ Game Balance Constants
 * Centralized place to tune the game mechanics.
 */

export const GAME_BALANCE = {
  // 🕒 Time Intervals (in seconds)
  ENCOUNTER_INTERVAL: 6,       // was 10 — encounters 40% faster
  DECISION_COUNTDOWN_SECONDS: 30,

  // 🗺️ Travel
  SAFE_ZONE_LIMIT: 200,
  TRAVEL_OUT_DISTANCE: 10,     // was 5 — double travel speed
  TRAVEL_IN_DISTANCE: 20,      // was 10 — returning is faster

  // 🎲 Encounter Probabilities
  PVP_AMBUSH_CHANCE: 0.05,
  BASE_SPAWN_CHANCE: 0.45,     // was 0.3 — more encounters
  MAX_SPAWN_CHANCE: 0.65,      // was 0.5
  DUNGEON_ENCOUNTER_CHANCE: 0.12,  // was 0.15 — slightly less dungeons
  GATHERING_CHANCE_SAFE: 0.65,     // was 0.8 — more combat in safe zone
  GATHERING_CHANCE_DANGER: 0.3,

  // ⚔️ Combat Mechanics
  BASE_CRIT_MODIFIER: 0.003,   // was 0.002
  BASE_DODGE_MODIFIER: 0.002,  // was 0.0015
  GATHER_CRIT_MODIFIER: 0.004, // was 0.003
  VICTORY_HEAL_PCT: 0.3,       // was 0.2 — heal 30% HP after win
  PVP_CRIT_MODIFIER: 0.003,    // was 0.002
  PVP_FLEE_CHANCE_CAP: 0.8,
  PVP_FLEE_AGI_DIVISOR: 150,   // was 200 — easier to flee

  // 📈 Scaling Factors
  HP_SCALING_DIVISOR: 200,
  STAT_SCALING_DIVISOR: 250,
  EXP_SCALING_DIVISOR: 100,     // was 150
  EXP_STEP_DIVISOR: 25,         // was 50 — double XP from kills
  EXP_STEP_GROWTH: 0.08,        // was 0.05

  // 💰 Economy
  DEATH_PENALTY_GOLD_PCT: 0.1,
  PVP_LOOT_DROP_CHANCE: 0.5,
  MONSTER_LEVEL_HP_BONUS: 5,
  MONSTER_LEVEL_STAT_BONUS: 1.2,
  MONSTER_LEVEL_EXP_BONUS: 2,

  // ⚒️ Dungeon Scaling
  DUNGEON_HP_MULT: 1.0,
  DUNGEON_STAT_MULT: 1.0,
  DUNGEON_EXP_MULT: 1.0,
  DUNGEON_TRAP_CHANCE: 0.15,
  DUNGEON_SHRINE_CHANCE: 0.1,
  DUNGEON_SHRINE_HEAL_PCT: 0.3,
  DUNGEON_TRAP_DAMAGE_PCT: 0.1,

  // 🛰️ Matchmaking
  PVP_SEARCH_RADIUS: 100,
  NEARBY_BROADCAST_RADIUS: 50,
  SPAWN_CHANCE_DEPTH_SCALER: 2000,

  // 🎲 Loot Scaling
  LOOT_DEPTH_INTERVAL: 50,
  LOOT_CHANCE_GROWTH: 0.08,     // was 0.05 — 60% more loot at depth
  LOOT_QUANTITY_GROWTH: 0.15,   // was 0.1 — 50% more quantity
  LOOT_RARITY_WEIGHT_FACTOR: 1.2,  // was 1.15
  LOOT_LUK_QUALITY_BONUS: 0.002,   // was 0.001
  GLOBAL_MYTHICAL_CHANCE: 0.0002,  // was 0.0001 — doubled

  // 🛡️ Safety Caps
  MAX_STAT_VALUE: 2000,
  MAX_SCALING_MULTIPLIER: 10.0,
};

export const BACKEND_MESSAGES = {
  UNAUTHORIZED: "Unauthorized",
  CHARACTER_NOT_FOUND: "Character not found",
  NO_PENDING_ENCOUNTER: "No pending encounter found",
  INVALID_ENCOUNTER_ACTION: "Invalid action for this encounter type",
  DEAD_REMAIN: "You are dead. Wait to revive.",
  FRIEND_ADDED: "Friend added!",
  ALREADY_FRIENDS: "Already friends",
  CANNOT_ADD_SELF: "Cannot add yourself",
  NAME_REQUIRED: "Name required",
  ITEM_EQUIPPED: "Item equipped!",
  ITEM_UNEQUIPPED: "Item unequipped!",
  TARGET_UNAVAILABLE: "Target is no longer available.",
  FLEE_SUCCESS: "You successfully escaped!",
  FLEE_FAILED: "Flee failed! You are cornered.",
  ENCOUNTER_SKIPPED: "Encounter skipped. Resuming journey.",
};
