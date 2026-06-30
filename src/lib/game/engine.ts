/**
 * ============================================================
 * CORE MATH ENGINE
 * ============================================================
 * Pure functions for:
 *   1. Resource accumulation (raw production per second)
 *   2. Processing automation (raw -> refined conversion)
 *   3. Offline earnings reconciliation (time-delta based)
 *
 * All functions are SIDE-EFFECT FREE on their inputs — they return
 * new values or clones. The Zustand store applies the results.
 * ============================================================
 */

import type { GameState, OfflineEarnings, ResourceState } from './types';
import {
  OFFLINE_CAP_SECONDS,
  OFFLINE_THRESHOLD_SECONDS,
  REFINE_COST_RATIO,
  goldPerSec,
  xpForLevel,
} from './constants';
import { perkMultiplier, trackRunGold } from './prestige';
import { eventMultiplier } from './events';

/**
 * Advance a single resource by `seconds`.
 *
 *  - Adds `raw_per_sec * seconds` to `current_amount`.
 *  - Then runs the processing automation: consumes raw material to
 *    produce refined material at `processing_rate`. Each refined unit
 *    costs `REFINE_COST_RATIO` raw units. If there isn't enough raw
 *    material, refining is throttled to whatever is available.
 *
 * Returns a NEW ResourceState (does not mutate input).
 */
export function tickResource(res: ResourceState, seconds: number, rawMult = 1, refineMult = 1): ResourceState {
  // --- (1) Raw accumulation (with prestige multiplier) -----------------
  let raw = res.current_amount + res.raw_per_sec * rawMult * seconds;

  // --- (2) Processing automation (with prestige multiplier) ------------
  // Refined we *want* to produce this tick.
  const desiredRefined = res.processing_rate * refineMult * seconds;
  // Raw units that would be consumed to produce `desiredRefined`.
  const rawNeeded = desiredRefined * REFINE_COST_RATIO;
  // Clamp to available raw (can't refine what we don't have).
  const actualRefined = raw >= rawNeeded ? desiredRefined : (raw / REFINE_COST_RATIO);
  const rawConsumed = actualRefined * REFINE_COST_RATIO;

  raw = Math.max(0, raw - rawConsumed);

  return {
    current_amount: raw,
    raw_per_sec: res.raw_per_sec,
    refined_amount: res.refined_amount + actualRefined,
    processing_rate: res.processing_rate,
  };
}

/**
 * Apply a full production tick to the whole game state for `seconds`.
 * Used both by the real-time loop (seconds=1) and the offline calc.
 *
 * Applies prestige multipliers to raw/refined/gold production and
 * tracks gold earned during the current run (for the rebirth calc).
 * Mutates a CLONE of the input.
 */
export function applyProductionTick(state: GameState, seconds: number): GameState {
  const next: GameState = structuredClone(state);

  // Prestige perk multipliers (1.0 if no points invested).
  const rawMult = perkMultiplier(next, 'industrious');
  const refineMult = perkMultiplier(next, 'refining');
  const goldMult = perkMultiplier(next, 'logistics');

  // Event multipliers (1.0 if no active event for that buff type).
  const rawEvent = eventMultiplier(next, 'raw');
  const refineEvent = eventMultiplier(next, 'refined');
  const goldEvent = eventMultiplier(next, 'gold');

  next.resources.wood = tickResource(next.resources.wood, seconds, rawMult * rawEvent, refineMult * refineEvent);
  next.resources.stone = tickResource(next.resources.stone, seconds, rawMult * rawEvent, refineMult * refineEvent);
  next.resources.iron = tickResource(next.resources.iron, seconds, rawMult * rawEvent, refineMult * refineEvent);

  // Passive gold trickle (prestige logistics × event gold buff).
  const goldGained = goldPerSec(next.player.level) * goldMult * goldEvent * seconds;
  next.player.gold += goldGained;

  // Track run gold for the rebirth calc.
  next.prestige = trackRunGold(next, goldGained).prestige;

  next.last_saved_at = Date.now();
  return next;
}

/**
 * ============================================================
 * OFFLINE EARNINGS CALCULATION
 * ============================================================
 * `calculate_offline_earnings(time_delta)` — per spec.
 *
 * Computes what the player *would* have earned while away, WITHOUT
 * mutating state. The caller decides whether to apply it (and the
 * `trigger_offline_double_ad` hook can double it first).
 *
 * The time delta is capped at OFFLINE_CAP_SECONDS so players can't
 * stockpile infinitely. Sub-threshold deltas return zero gains.
 */
export function calculate_offline_earnings(
  state: GameState,
  timeDeltaSeconds: number,
): OfflineEarnings {
  const elapsed = Math.max(0, Math.min(timeDeltaSeconds, OFFLINE_CAP_SECONDS));

  if (elapsed < OFFLINE_THRESHOLD_SECONDS) {
    return {
      wood_gained: 0,
      stone_gained: 0,
      iron_gained: 0,
      refined_wood_gained: 0,
      refined_stone_gained: 0,
      refined_iron_gained: 0,
      gold_gained: 0,
      seconds_elapsed: 0,
    };
  }

  // Re-simulate production over the capped window using the SAME
  // formulas as the live tick — guarantees offline/online parity.
  const before = state;
  const after = applyProductionTick(state, elapsed);

  return {
    wood_gained: after.resources.wood.current_amount - before.resources.wood.current_amount,
    stone_gained: after.resources.stone.current_amount - before.resources.stone.current_amount,
    iron_gained: after.resources.iron.current_amount - before.resources.iron.current_amount,
    refined_wood_gained: after.resources.wood.refined_amount - before.resources.wood.refined_amount,
    refined_stone_gained: after.resources.stone.refined_amount - before.resources.stone.refined_amount,
    refined_iron_gained: after.resources.iron.refined_amount - before.resources.iron.refined_amount,
    gold_gained: after.player.gold - before.player.gold,
    seconds_elapsed: elapsed,
  };
}

/**
 * Apply a previously-calculated OfflineEarnings to a state clone.
 * Used by the store on session resume (after the optional 2x ad).
 */
export function applyOfflineEarnings(state: GameState, earnings: OfflineEarnings): GameState {
  const next: GameState = structuredClone(state);
  next.resources.wood.current_amount += earnings.wood_gained;
  next.resources.stone.current_amount += earnings.stone_gained;
  next.resources.iron.current_amount += earnings.iron_gained;
  next.resources.wood.refined_amount += earnings.refined_wood_gained;
  next.resources.stone.refined_amount += earnings.refined_stone_gained;
  next.resources.iron.refined_amount += earnings.refined_iron_gained;
  next.player.gold += earnings.gold_gained;
  next.last_saved_at = Date.now();
  return next;
}

/**
 * Reconcile shield state: refresh `is_raidable` from `shield_until`.
 * Called on every tick + on load.
 */
export function refreshShield(state: GameState): GameState {
  const now = Date.now();
  const shielded = state.shield_until !== null && state.shield_until > now;
  if (state.is_raidable !== !shielded) {
    const next = structuredClone(state);
    next.is_raidable = !shielded;
    // Shield expired -> clear the timestamp.
    if (!shielded && state.shield_until !== null) {
      next.shield_until = null;
    }
    return next;
  }
  return state;
}

/**
 * Award XP and handle level-ups. Returns a new state with updated
 * level / current_exp. Overflow XP carries to the next level.
 * Applies the active xp event multiplier if any.
 */
export function awardXp(state: GameState, xp: number): GameState {
  const next = structuredClone(state);
  const xpMult = eventMultiplier(next, 'xp');
  next.player.current_exp += Math.floor(xp * xpMult);
  while (next.player.current_exp >= xpForLevel(next.player.level)) {
    next.player.current_exp -= xpForLevel(next.player.level);
    next.player.level += 1;
  }
  return next;
}
