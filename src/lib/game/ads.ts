/**
 * ============================================================
 * AD MONETIZATION HOOKS
 * ============================================================
 * Three Rewarded Video Ad formats, per spec:
 *
 *   1. trigger_offline_double_ad(earnings)
 *      -> Multiplies calculated idle earnings by 2x.
 *
 *   2. trigger_peace_shield_ad(state)
 *      -> Flags a 3-hour timestamp block where is_raidable = false.
 *
 *   3. trigger_conscription_ad(state, troops_lost)
 *      -> Instantly restores 25% of lost troops after a battle.
 *
 * In production these would gate on an actual ad SDK callback. Here
 * we expose pure helpers that the UI calls AFTER the (simulated) ad
 * has finished playing. The AdModal component simulates the watch.
 * ============================================================
 */

import type { GameState, OfflineEarnings } from './types';
import { PEACE_SHIELD_MS } from './constants';

/**
 * 2x the offline earnings. Returns a NEW earnings object; the caller
 * applies it via applyOfflineEarnings.
 *
 * Hook: trigger_offline_double_ad()
 */
export function trigger_offline_double_ad(earnings: OfflineEarnings): OfflineEarnings {
  return {
    ...earnings,
    wood_gained: earnings.wood_gained * 2,
    stone_gained: earnings.stone_gained * 2,
    iron_gained: earnings.iron_gained * 2,
    refined_wood_gained: earnings.refined_wood_gained * 2,
    refined_stone_gained: earnings.refined_stone_gained * 2,
    refined_iron_gained: earnings.refined_iron_gained * 2,
    gold_gained: earnings.gold_gained * 2,
    // seconds_elapsed is NOT doubled — only the rewards are.
    seconds_elapsed: earnings.seconds_elapsed,
  };
}

/**
 * Grant a 3-hour peace shield. Sets shield_until = now + 3h and
 * is_raidable = false. If a shield is already active, EXTENDS it
 * (stacks the remaining time, capped at 24h total).
 *
 * Hook: trigger_peace_shield_ad()
 */
export function trigger_peace_shield_ad(state: GameState): GameState {
  const now = Date.now();
  const currentExpiry = state.shield_until && state.shield_until > now ? state.shield_until : now;
  let newExpiry = currentExpiry + PEACE_SHIELD_MS;
  // Cap total shield at 24h to prevent permanent immunity.
  const maxExpiry = now + 24 * 60 * 60 * 1000;
  if (newExpiry > maxExpiry) newExpiry = maxExpiry;

  const next = structuredClone(state);
  next.shield_until = newExpiry;
  next.is_raidable = false;
  return next;
}

/**
 * Restore 25% of troops lost in the most recent battle. The caller
 * passes the explicit `troops_lost` count (from the battle result or
 * the history entry) so we don't have to guess which battle.
 *
 * Restored troops are added back to active_troops, but never exceed
 * max_troop_capacity.
 *
 * Hook: trigger_conscription_ad()
 */
export function trigger_conscription_ad(state: GameState, troopsLost: number): GameState {
  const restored = Math.floor(troopsLost * 0.25);
  if (restored <= 0) return state;

  const next = structuredClone(state);
  next.army.active_troops = Math.min(
    next.army.max_troop_capacity,
    next.army.active_troops + restored,
  );
  return next;
}

/** Returns remaining shield time in ms (0 if none/expired). */
export function shieldRemainingMs(state: GameState): number {
  if (state.shield_until === null) return 0;
  return Math.max(0, state.shield_until - Date.now());
}

/** Human-readable shield countdown, e.g. "2h 14m". */
export function shieldRemainingLabel(state: GameState): string {
  const ms = shieldRemainingMs(state);
  if (ms <= 0) return 'None';
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m`;
}
