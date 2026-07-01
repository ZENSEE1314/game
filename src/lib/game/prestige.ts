/**
 * ============================================================
 * PRESTIGE / REBIRTH SYSTEM
 * ============================================================
 * Meta-progression layer. When a player rebirths:
 *   - Facilities, army, resources, gear, gold RESET to initial values.
 *   - Career stats + achievements + quests are PRESERVED (they're
 *     lifetime counters).
 *   - The player earns Prestige Points based on gold earned this run.
 *   - Prestige Points can be spent on permanent perks that multiply
 *     production on all future runs.
 *
 * This adds a long-tail retention loop on top of the idle loop.
 * ============================================================
 */

import type { GameState, PrestigePerk, PrestigeState } from './types';
import { createInitialState } from './initial-state';

/**
 * Available prestige perks. Each point invested grants `per_point_value`
 * bonus. Players allocate points into these to specialize their run.
 */
export const PRESTIGE_PERKS: PrestigePerk[] = [
  {
    id: 'industrious',
    name: 'Industrious',
    description: 'Raw material gathering rate.',
    icon: 'Pickaxe',
    max_points: 10,
    per_point_value: 0.05, // +5% per point -> +50% at max
    effect_label: '+5% raw/s per point',
  },
  {
    id: 'refining',
    name: 'Master Refiner',
    description: 'Refined material processing rate.',
    icon: 'FlaskConical',
    max_points: 10,
    per_point_value: 0.05,
    effect_label: '+5% refined/s per point',
  },
  {
    id: 'logistics',
    name: 'Logistics',
    description: 'Passive gold generation rate.',
    icon: 'Coins',
    max_points: 10,
    per_point_value: 0.08, // +8% per point -> +80% at max
    effect_label: '+8% gold/s per point',
  },
  {
    id: 'quartermaster',
    name: 'Quartermaster',
    description: 'Troop capacity + recruit cost discount.',
    icon: 'Users',
    max_points: 10,
    per_point_value: 0.10, // +10% capacity per point
    effect_label: '+10% troop cap per point',
  },
  {
    id: 'warmonger',
    name: 'Warmonger',
    description: 'Weapon attack & defense multipliers.',
    icon: 'Swords',
    max_points: 10,
    per_point_value: 0.03, // +3% per point -> +30% at max
    effect_label: '+3% weapon mult per point',
  },
  {
    id: 'fortified',
    name: 'Fortified',
    description: 'Vault secure-gold capacity.',
    icon: 'Lock',
    max_points: 10,
    per_point_value: 0.15, // +15% per point
    effect_label: '+15% vault cap per point',
  },
];

/** Create a fresh prestige state (for new players / reset). */
export function createInitialPrestige(): PrestigeState {
  return {
    rebirth_count: 0,
    prestige_points: 0,
    total_prestige_earned: 0,
    current_run_gold: 0,
    global_multiplier: 1,
    perks: {},
  };
}

/**
 * How many prestige points a rebirth would yield, based on gold earned
 * this run. Uses a sqrt curve so early runs reward quickly but there's
 * diminishing returns.
 *
 *   points = floor(sqrt(current_run_gold / 1000))
 *
 * Example: 1,000 gold -> 1 pt; 10,000 -> 3 pts; 100,000 -> 10 pts.
 */
export function previewPrestigeGain(currentRunGold: number): number {
  if (currentRunGold < 1000) return 0;
  return Math.floor(Math.sqrt(currentRunGold / 1000));
}

/** Minimum gold required before a rebirth is allowed. */
export const REBIRTH_MIN_GOLD = 1000;

/** Whether the player can rebirth right now. */
export function canRebirth(state: GameState): boolean {
  return state.prestige.current_run_gold >= REBIRTH_MIN_GOLD;
}

/**
 * Compute the effective multiplier for a given perk from the player's
 * allocation. Returns 1.0 (no bonus) if no points invested.
 */
export function perkMultiplier(state: GameState, perkId: string): number {
  const perk = PRESTIGE_PERKS.find((p) => p.id === perkId);
  if (!perk) return 1;
  // Defensive: prestige may be undefined on old saves pre-merge.
  const points = state.prestige?.perks?.[perkId] ?? 0;
  return 1 + perk.per_point_value * points;
}

/**
 * Apply the warmonger prestige perk to a base weapon-multiplier pair.
 * Returns a new { attack_mult, defense_mult } scaled by the perk bonus.
 * Used whenever weapon multipliers are recomputed (tier upgrade, rebirth).
 */
export function applyWarmongerPerk(
  state: GameState,
  base: { attack_mult: number; defense_mult: number },
): { attack_mult: number; defense_mult: number } {
  const warmongerMult = perkMultiplier(state, 'warmonger');
  return {
    attack_mult: +(base.attack_mult * warmongerMult).toFixed(4),
    defense_mult: +(base.defense_mult * warmongerMult).toFixed(4),
  };
}

/**
 * Recompute the global multiplier (sum of all perk effects, used for
 * display) and return an updated PrestigeState. The actual per-system
 * multipliers are read via perkMultiplier() by the engine.
 */
export function recomputeGlobalMultiplier(prestige: PrestigeState): PrestigeState {
  // Global multiplier is a rough aggregate for display: average bonus.
  let totalBonus = 0;
  for (const perk of PRESTIGE_PERKS) {
    const pts = prestige.perks[perk.id] ?? 0;
    totalBonus += perk.per_point_value * pts;
  }
  const avg = totalBonus / PRESTIGE_PERKS.length;
  return { ...prestige, global_multiplier: 1 + avg };
}

/**
 * Allocate 1 prestige point into a perk. Validates point availability
 * and perk cap. Returns the updated prestige state (or unchanged on error).
 */
export function allocatePerk(state: GameState, perkId: string): { prestige: PrestigeState; success: boolean; reason?: string } {
  const perk = PRESTIGE_PERKS.find((p) => p.id === perkId);
  if (!perk) return { prestige: state.prestige, success: false, reason: 'Unknown perk' };
  if (state.prestige.prestige_points <= 0) {
    return { prestige: state.prestige, success: false, reason: 'No prestige points available' };
  }
  const current = state.prestige.perks[perkId] ?? 0;
  if (current >= perk.max_points) {
    return { prestige: state.prestige, success: false, reason: 'Perk already maxed' };
  }
  const next: PrestigeState = {
    ...state.prestige,
    prestige_points: state.prestige.prestige_points - 1,
    perks: { ...state.prestige.perks, [perkId]: current + 1 },
  };
  return { prestige: recomputeGlobalMultiplier(next), success: true };
}

/**
 * Perform a rebirth: reset run-state, award prestige points, preserve
 * career stats + achievements + quests.
 */
export function performRebirth(state: GameState): { state: GameState; pointsGained: number; success: boolean; reason?: string } {
  if (!canRebirth(state)) {
    return { state, pointsGained: 0, success: false, reason: `Need at least ${REBIRTH_MIN_GOLD} gold this run` };
  }

  const pointsGained = previewPrestigeGain(state.prestige.current_run_gold);

  // Build a fresh run state, preserving lifetime fields.
  const fresh = createInitialState();

  // Preserve player identity but reset level/exp/gold to fresh values.
  // Preserve career stats, achievements, quests (lifetime), and prestige.
  const newState: GameState = {
    ...fresh,
    player: {
      ...fresh.player,
      id: state.player.id, // keep identity
    },
    stats: state.stats,                       // lifetime
    achievements_unlocked: state.achievements_unlocked, // lifetime
    quests: state.quests,                     // keep current daily quests
    quests_rotated_at: state.quests_rotated_at,
    battle_history: state.battle_history.slice(0, 5), // keep recent history flavor
    inventory: {
      items: {},  // reset monster items (run-specific)
      trinkets: state.inventory?.trinkets ?? {},  // KEEP trinkets (permanent gear)
    },
    prestige: recomputeGlobalMultiplier({
      ...state.prestige,
      rebirth_count: state.prestige.rebirth_count + 1,
      prestige_points: state.prestige.prestige_points + pointsGained,
      total_prestige_earned: state.prestige.total_prestige_earned + pointsGained,
      current_run_gold: 0, // reset run gold
    }),
    shield_until: null,
    is_raidable: true,
    last_saved_at: Date.now(),
  };

  // Apply prestige multipliers to the fresh run: vault/troop cap via
  // syncDerived, and warmonger to weapon multipliers.
  newState.player.secure_vault_limit = Math.floor(
    newState.player.secure_vault_limit * perkMultiplier(newState, 'fortified'),
  );
  newState.army.max_troop_capacity = Math.floor(
    newState.army.max_troop_capacity * perkMultiplier(newState, 'quartermaster'),
  );
  newState.gear.weapon_multipliers = applyWarmongerPerk(newState, newState.gear.weapon_multipliers);

  return { state: newState, pointsGained, success: true };
}

/**
 * Track gold earned during the current run. Called by the engine when
 * passive gold accrues or when PvP loot is gained.
 */
export function trackRunGold(state: GameState, goldDelta: number): GameState {
  if (goldDelta <= 0) return state;
  // Defensive: prestige may be undefined on old saves pre-merge.
  const prestige = state.prestige ?? createInitialPrestige();
  return {
    ...state,
    prestige: {
      ...prestige,
      current_run_gold: prestige.current_run_gold + goldDelta,
    },
  };
}
