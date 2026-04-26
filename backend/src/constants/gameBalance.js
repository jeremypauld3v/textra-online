/**
 * ⚖️ Game Balance Constants
 * Centralized place to tune the game mechanics.
 */
export const GAME_BALANCE = {
    // 🕒 Time Intervals (in seconds)
    ENCOUNTER_INTERVAL: 10,
    DECISION_COUNTDOWN_SECONDS: 30, // decision required time
    // 🗺️ Travel
    SAFE_ZONE_LIMIT: 200,
    TRAVEL_OUT_DISTANCE: 5,
    TRAVEL_IN_DISTANCE: 10, // returning is faster
    // 🎲 Encounter Probabilities
    PVP_AMBUSH_CHANCE: 0.05,
    BASE_SPAWN_CHANCE: 0.3,
    MAX_SPAWN_CHANCE: 0.5,
    DUNGEON_ENCOUNTER_CHANCE: 0.15,
    GATHERING_CHANCE_SAFE: 0.8,
    GATHERING_CHANCE_DANGER: 0.3,
    // ⚔️ Combat Mechanics (scaling and logic)
    BASE_CRIT_MODIFIER: 0.002,
    BASE_DODGE_MODIFIER: 0.0015,
    GATHER_CRIT_MODIFIER: 0.003,
    VICTORY_HEAL_PCT: 0.2, // restore 20% HP after win
    PVP_CRIT_MODIFIER: 0.002,
    PVP_FLEE_CHANCE_CAP: 0.8,
    PVP_FLEE_AGI_DIVISOR: 200,
    // 📈 Scaling Factors (Per Depth)
    HP_SCALING_DIVISOR: 200,
    STAT_SCALING_DIVISOR: 250,
    EXP_SCALING_DIVISOR: 150, // for dungeons
    EXP_STEP_DIVISOR: 50, // for monsters
    EXP_STEP_GROWTH: 0.05, // for monsters
    // 💰 Economy & Death
    DEATH_PENALTY_GOLD_PCT: 0.1, // lose 10% gold on PVP death
    PVP_LOOT_DROP_CHANCE: 0.5, // 50% chance to lose/drop inventory items in PVP
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
    // 🛰️ Matchmaking & Visibility
    PVP_SEARCH_RADIUS: 100,
    NEARBY_BROADCAST_RADIUS: 50,
    SPAWN_CHANCE_DEPTH_SCALER: 2000,
    // 🎲 Loot Scaling (Per 50km depth)
    LOOT_DEPTH_INTERVAL: 50,
    LOOT_CHANCE_GROWTH: 0.05, // +5% chance per interval
    LOOT_QUANTITY_GROWTH: 0.1, // +10% quantity per interval
    LOOT_RARITY_WEIGHT_FACTOR: 1.15, // Multiplier for Rare+ scaling
    LOOT_LUK_QUALITY_BONUS: 0.001, // Each LUK point adds 0.1% to the depth multiplier
    GLOBAL_MYTHICAL_CHANCE: 0.0001, // 0.01% base chance for surprise drops
    // 🛡️ Safety Caps
    MAX_STAT_VALUE: 2000, // Maximum value for any single rolled stat
    MAX_SCALING_MULTIPLIER: 10.0, // Maximum monster stat multiplier from depth
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
//# sourceMappingURL=gameBalance.js.map