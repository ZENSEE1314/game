/**
 * ============================================================
 * GAME STATE SCHEMA & TYPE DEFINITIONS
 * ============================================================
 * A 2D page-based / tab-driven Idle Progression Game with PvP.
 *
 * The game operates entirely as a flat data engine — there is NO
 * 2D grid or walking mechanic. State is mutated by:
 *   (a) a real-time tick loop (1s delta) for production, and
 *   (b) discrete player actions (upgrades, crafting, PvP attacks).
 *
 * Offline progress is reconciled via time-delta math on re-entry.
 * ============================================================
 */

/** A single keyed resource (wood / stone / iron). */
export interface ResourceState {
  /** Raw material currently held (uncapped, but practically bounded by vault). */
  current_amount: number;
  /** Raw material generated per second (from gathering facilities). */
  raw_per_sec: number;
  /** Refined material currently held (used for crafting/recruiting). */
  refined_amount: number;
  /** Refined material produced per second (from processing facilities). */
  processing_rate: number;
}

/** Player identity + progression + liquid economy. */
export interface PlayerProfile {
  id: string;
  level: number;
  current_exp: number;
  /** Liquid currency — the main PvP loot target. */
  gold: number;
  /** Gold protected from raids. Anything above this is "unsecure". */
  secure_vault_limit: number;
}

/** Standing army. */
export interface ArmyState {
  active_troops: number;
  max_troop_capacity: number;
}

/** Blacksmith-forged weaponry that multiplies army effectiveness. */
export interface BlacksmithGear {
  weapon_tier_level: number;
  weapon_multipliers: {
    attack_mult: number;
    defense_mult: number;
  };
  weapon_count: number;
}

/** Upgradeable facility tiers — drive the production math. */
export interface FacilityLevels {
  /** Wood gatherer camp level. */
  wood_gatherer: number;
  /** Stone quarry level. */
  stone_quarry: number;
  /** Iron mine level. */
  iron_mine: number;
  /** Wood refinery level (raw -> refined wood). */
  wood_refinery: number;
  /** Stone refinery level. */
  stone_refinery: number;
  /** Iron smelter level (raw -> refined iron / ore). */
  iron_smelter: number;
  /** Vault level — raises secure_vault_limit. */
  vault: number;
  /** Barracks level — raises max_troop_capacity. */
  barracks: number;
}

/** A PvP engagement record (kept for history/log). */
export interface BattleRecord {
  id: string;
  timestamp: number;
  opponent_id: string;
  opponent_name: string;
  role: 'attacker' | 'defender';
  result: 'victory' | 'defeat';
  troops_lost: number;
  weapons_lost: number;
  gold_delta: number;
  refined_wood_delta: number;
  refined_iron_delta: number;
}

/** AI opponent definition used in the Arena. */
export interface Opponent {
  id: string;
  name: string;
  avatar: string;
  army: ArmyState;
  gear: BlacksmithGear;
  player: Pick<PlayerProfile, 'gold' | 'level'>;
  resources: {
    wood: Pick<ResourceState, 'refined_amount'>;
    iron: Pick<ResourceState, 'refined_amount'>;
  };
  /** Difficulty rating 1-5 for UI flavor. */
  threat: number;
}

/**
 * Career stats — cumulative counters persisted across the whole
 * campaign. Drives the achievements system and the stats panel.
 */
export interface CareerStats {
  total_battles: number;
  total_victories: number;
  total_defeats: number;
  total_troops_recruited: number;
  total_weapons_forged: number;
  total_weapon_tier_upgrades: number;
  total_facility_upgrades: number;
  total_gold_earned: number;      // from PvP loot + passive
  total_gold_looted: number;      // from PvP only
  total_refined_produced: number; // wood+stone+iron combined
  total_ads_watched: number;
  longest_offline_return_seconds: number;
}

/** Quest difficulty tier — affects reward size. */
export type QuestTier = 'daily' | 'elite';

/** A single quest instance tracked on the player state. */
export interface Quest {
  id: string;
  /** Stable quest-definition key (maps to a QUEST_DEFS entry). */
  def_key: string;
  tier: QuestTier;
  /** Human-readable title. */
  title: string;
  description: string;
  /** Stat key from CareerStats this quest tracks. */
  tracker: keyof CareerStats;
  /** Starting value of the tracker when the quest was issued. */
  baseline: number;
  /** Target delta to complete. */
  goal: number;
  /** Reward granted on completion. */
  reward: QuestReward;
  /** Whether the reward has been claimed. */
  claimed: boolean;
  /** Epoch ms when the quest was issued (for expiry). */
  issued_at: number;
}

export interface QuestReward {
  gold: number;
  refined_wood: number;
  refined_stone: number;
  refined_iron: number;
  xp: number;
}

/** Achievement definition (static; earned-state lives on player state). */
export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // lucide icon name
  /** Stat key + threshold to unlock. */
  tracker: keyof CareerStats;
  threshold: number;
}

/**
 * Prestige (Rebirth) meta-progression. When a player rebirths, their
 * facilities/army/resources/gear reset, but they earn Prestige Points
 * (based on total gold earned that run) that grant permanent multipliers
 * to ALL production on the next run.
 */
export interface PrestigeState {
  /** Number of times the player has rebirthed. */
  rebirth_count: number;
  /** Unspent prestige points available to allocate. */
  prestige_points: number;
  /** Total prestige points ever earned (for display). */
  total_prestige_earned: number;
  /** Gold earned during the CURRENT run (resets on rebirth). */
  current_run_gold: number;
  /** Permanent global production multiplier (derived from spent points). */
  global_multiplier: number;
  /** Prestige perk allocations: perk_key -> points spent. */
  perks: Record<string, number>;
}

/** A single prestige perk definition. */
export interface PrestigePerk {
  id: string;
  name: string;
  description: string;
  icon: string;
  /** Max points investable. */
  max_points: number;
  /** Per-point effect value (e.g. 0.02 = +2% per point). */
  per_point_value: number;
  /** What this perk multiplies — used in UI description. */
  effect_label: string;
}

/** A leaderboard entry — used for the NPC leaderboard + the player's row. */
export interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  level: number;
  victories: number;
  battles: number;
  gold_looted: number;
  power_score: number;
  is_player: boolean;
  is_rebirthed?: boolean;
}

/** The root game state object — the single source of truth. */
export interface GameState {
  player: PlayerProfile;
  resources: {
    wood: ResourceState;
    stone: ResourceState;
    iron: ResourceState;
  };
  facilities: FacilityLevels;
  army: ArmyState;
  gear: BlacksmithGear;
  /** Epoch ms of last successful tick/save — used for offline earnings. */
  last_saved_at: number;
  /** Epoch ms until which the player is shielded from raids. */
  shield_until: number | null;
  /** Derived from shield_until; cached for fast reads. */
  is_raidable: boolean;
  battle_history: BattleRecord[];
  /** Career totals — drives achievements + stats panel. */
  stats: CareerStats;
  /** Active quests (rotated daily). */
  quests: Quest[];
  /** Epoch ms when the daily quest roster was last rotated. */
  quests_rotated_at: number;
  /** Set of achievement IDs already unlocked. */
  achievements_unlocked: string[];
  /** Prestige / rebirth meta-progression. */
  prestige: PrestigeState;
  /** Active limited-time event (or null if none). */
  active_event: GameEvent | null;
}

/**
 * A limited-time event that grants a temporary buff. Events rotate
 * periodically and offer a themed multiplier bonus to encourage
 * return visits.
 */
export interface GameEvent {
  /** Stable event-definition key. */
  def_key: string;
  /** Display title. */
  title: string;
  /** Themed description. */
  description: string;
  /** Emoji avatar for the event. */
  avatar: string;
  /** Which production system is buffed. */
  buff_type: 'raw' | 'refined' | 'gold' | 'pvp_loot' | 'xp';
  /** Multiplier applied to the buffed system (e.g. 2 = 2x). */
  multiplier: number;
  /** Epoch ms when the event ends. */
  ends_at: number;
}



/** Output of the offline-earnings calculation (before applying). */
export interface OfflineEarnings {
  wood_gained: number;
  stone_gained: number;
  iron_gained: number;
  refined_wood_gained: number;
  refined_stone_gained: number;
  refined_iron_gained: number;
  gold_gained: number;
  seconds_elapsed: number;
}

/** Result of a PvP engagement. */
export interface BattleResult {
  attacker_won: boolean;
  attacker_score: number;
  defender_score: number;
  attacker_casualties: {
    troops_lost: number;
    weapons_lost: number;
  };
  defender_casualties: {
    troops_lost: number;
    weapons_lost: number;
  };
  loot: {
    gold: number;
    refined_wood: number;
    refined_iron: number;
  };
}

/** The three rewarded-ad formats supported by the game. */
export type AdType = 'offline_double' | 'peace_shield' | 'conscription';

/** A pending ad reward that the UI confirmed was "watched". */
export interface AdRewardPayload {
  type: AdType;
  /** For offline_double: the earnings object to double. */
  earnings?: OfflineEarnings;
  /** For conscription: troops lost in the most recent battle. */
  troops_lost?: number;
}

// ---------------------------------------------------------------------------
// Helper type aliases for clarity at API boundaries.
// ---------------------------------------------------------------------------

/** Minimal attacker/defender projection fed into the PvP engine. */
export interface CombatantState {
  active_troops: number;
  weapon_count: number;
  attack_mult: number;
  defense_mult: number;
  gold: number;
  secure_vault_limit: number;
  refined_wood: number;
  refined_iron: number;
  is_raidable: boolean;
}
