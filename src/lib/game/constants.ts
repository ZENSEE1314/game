/**
 * ============================================================
 * GAME CONSTANTS & BALANCE CURVES
 * ============================================================
 * Central tuning file. All production rates, costs, capacities,
 * and PvP multipliers are defined here so balance can be tweaked
 * without touching engine logic.
 * ============================================================
 */

import type { FacilityLevels, ResourceState, GameState } from './types';

/** Real-time tick interval in ms. */
export const TICK_MS = 1000;

/** Peace-shield duration granted by the rewarded ad. */
export const PEACE_SHIELD_MS = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Offline earnings cap. Players can't accumulate infinite resources
 * while away; we cap the elapsed window used in the calc.
 */
export const OFFLINE_CAP_SECONDS = 8 * 60 * 60; // 8 hours

/** Minimum elapsed seconds before we treat a session as "returning". */
export const OFFLINE_THRESHOLD_SECONDS = 30;

// ---------------------------------------------------------------------------
// Production formulas — raw_per_sec / processing_rate scale with level.
// Linear growth kept simple & predictable for a hybrid-casual audience.
// ---------------------------------------------------------------------------

/** Raw material produced per second at a given gatherer level. */
export function rawPerSec(level: number): number {
  // 0.5 base, +0.5 per level -> level 1 = 1.0/s, level 10 = 5.5/s
  return Math.max(0, 0.5 + 0.5 * level);
}

/** Refined material produced per second at a given refinery level. */
export function processingRate(level: number): number {
  // 0.25 base, +0.25 per level -> level 1 = 0.5/s, level 10 = 2.75/s
  return Math.max(0, 0.25 + 0.25 * level);
}

/**
 * Refining conversion ratio: how many raw units are consumed to
 * produce 1 refined unit. Lower = more efficient.
 */
export const REFINE_COST_RATIO = 2; // 2 raw -> 1 refined

/** Vault capacity at a given vault level. */
export function vaultCapacity(level: number): number {
  // 2,000 base + 1,500 per level
  return 2000 + 1500 * level;
}

/** Max troop capacity at a given barracks level. */
export function troopCapacity(level: number): number {
  // 20 base + 10 per level
  return 20 + 10 * level;
}

/** Gold generated passively per second (small trickle). */
export function goldPerSec(level: number): number {
  return 0.1 + 0.05 * level;
}

/** XP required to reach the next level from `level`. */
export function xpForLevel(level: number): number {
  return 100 * level * level;
}

// ---------------------------------------------------------------------------
// Facility upgrade costs. Costs scale geometrically per level.
// ---------------------------------------------------------------------------

export interface UpgradeCost {
  gold: number;
  refined_wood: number;
  refined_stone: number;
  refined_iron: number;
}

/** Cost to upgrade a facility from `currentLevel` to `currentLevel + 1`. */
export function facilityUpgradeCost(currentLevel: number): UpgradeCost {
  const base = 50;
  const factor = 1.5;
  const g = Math.floor(base * Math.pow(factor, currentLevel));
  return {
    gold: g,
    refined_wood: Math.floor(g * 0.6),
    refined_stone: Math.floor(g * 0.6),
    refined_iron: Math.floor(g * 0.3),
  };
}

/** Cost to recruit a single troop. */
export function troopRecruitCost(): { gold: number; refined_iron: number; refined_wood: number } {
  return { gold: 20, refined_iron: 2, refined_wood: 1 };
}

/** Cost to forge one weapon (increments weapon_count by 1, keeps tier). */
export function weaponForgeCost(currentCount: number): { gold: number; refined_iron: number } {
  return {
    gold: 30 + 5 * currentCount,
    refined_iron: 3 + Math.floor(currentCount / 2),
  };
}

/** Cost to upgrade weapon tier (raises attack/defense multipliers). */
export function weaponTierUpgradeCost(currentTier: number): { gold: number; refined_iron: number; refined_stone: number } {
  return {
    gold: 100 * Math.pow(2, currentTier),
    refined_iron: 10 * Math.pow(2, currentTier),
    refined_stone: 8 * Math.pow(2, currentTier),
  };
}

/** Multiplier gain per weapon tier level. Tier 1 -> 1.1x, Tier 2 -> 1.2x, ... */
export function weaponMultiplierForTier(tier: number): { attack_mult: number; defense_mult: number } {
  const mult = 1 + 0.1 * tier;
  return { attack_mult: mult, defense_mult: mult };
}

// ---------------------------------------------------------------------------
// PvP constants — per the strict spec.
// ---------------------------------------------------------------------------

/** Attacker casualty rate (always applied). */
export const ATTACKER_TROOP_LOSS_RATE = 0.05; // 5%
export const ATTACKER_WEAPON_LOSS_RATE = 0.05; // 5%

/** Defender casualty rate (always applied). */
export const DEFENDER_TROOP_LOSS_RATE = 0.10; // 10%
export const DEFENDER_WEAPON_LOSS_RATE = 0.10; // 10%

/** Fraction of the defender's UNSECURE gold/wood/iron looted on victory. */
export const LOOT_RATE = 0.10; // 10%

/** XP awarded for a PvP victory. */
export const PVP_VICTORY_XP = 50;

/** XP awarded per troop recruited. */
export const RECRUIT_XP = 2;

// ---------------------------------------------------------------------------
// Resource helpers — compute derived production values from facility levels.
// ---------------------------------------------------------------------------

export function deriveResourceState(
  gathererLevel: number,
  refineryLevel: number,
  existing?: Partial<ResourceState>,
): ResourceState {
  return {
    current_amount: existing?.current_amount ?? 0,
    raw_per_sec: rawPerSec(gathererLevel),
    refined_amount: existing?.refined_amount ?? 0,
    processing_rate: processingRate(refineryLevel),
  };
}

/**
 * Recompute all derived (rate/capacity) fields from facility levels.
 *
 * Optional `mults` lets callers apply prestige perk multipliers to the
 * vault capacity (fortified perk) and troop capacity (quartermaster
 * perk). We keep this in constants.ts (not prestige.ts) to avoid a
 * circular import; callers pass the multipliers in.
 */
export function recomputeDerived(
  state: {
    resources: GameState['resources'];
    facilities: FacilityLevels;
    player: { secure_vault_limit: number };
    army: { max_troop_capacity: number };
  },
  mults?: { vaultMult?: number; troopCapMult?: number },
) {
  state.resources.wood.raw_per_sec = rawPerSec(state.facilities.wood_gatherer);
  state.resources.stone.raw_per_sec = rawPerSec(state.facilities.stone_quarry);
  state.resources.iron.raw_per_sec = rawPerSec(state.facilities.iron_mine);
  state.resources.wood.processing_rate = processingRate(state.facilities.wood_refinery);
  state.resources.stone.processing_rate = processingRate(state.facilities.stone_refinery);
  state.resources.iron.processing_rate = processingRate(state.facilities.iron_smelter);
  const vaultMult = mults?.vaultMult ?? 1;
  const troopCapMult = mults?.troopCapMult ?? 1;
  state.player.secure_vault_limit = Math.floor(vaultCapacity(state.facilities.vault) * vaultMult);
  state.army.max_troop_capacity = Math.floor(troopCapacity(state.facilities.barracks) * troopCapMult);
}

/** Format a number for compact UI display (e.g. 12.3K, 4.5M). */
export function formatNumber(n: number): string {
  if (!isFinite(n) || isNaN(n)) return '0';
  if (n < 1000) return Math.floor(n).toString();
  if (n < 1_000_000) return (n / 1000).toFixed(1) + 'K';
  if (n < 1_000_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  return (n / 1_000_000_000).toFixed(2) + 'B';
}
