/**
 * ============================================================
 * DAILY CHECK-IN (30-DAY REWARD CALENDAR)
 * ============================================================
 * Players claim one reward per day for 30 days. Day 30 gives a
 * rare item. The cycle resets after day 30. Streaks track
 * consecutive logins (missed days don't reset, but you can only
 * claim once per calendar day).
 * ============================================================
 */

import type { GameState } from './types';

/** Reward definitions for each of the 30 days. */
export interface CheckInReward {
  day: number;
  /** Reward type. */
  type: 'gold' | 'refined_wood' | 'refined_stone' | 'refined_iron' | 'troops' | 'prestige' | 'rare_item';
  /** Quantity. */
  quantity: number;
  /** Display label. */
  label: string;
  /** Emoji avatar. */
  avatar: string;
  /** Is this a milestone/special day? */
  special?: boolean;
}

/** The 30-day reward calendar. */
export const CHECK_IN_REWARDS: CheckInReward[] = [
  { day: 1, type: 'gold', quantity: 100, label: '100 Gold', avatar: '🪙' },
  { day: 2, type: 'refined_wood', quantity: 10, label: '10 Refined Wood', avatar: '🪵' },
  { day: 3, type: 'refined_stone', quantity: 10, label: '10 Refined Stone', avatar: '🪨' },
  { day: 4, type: 'gold', quantity: 200, label: '200 Gold', avatar: '🪙' },
  { day: 5, type: 'refined_iron', quantity: 10, label: '10 Refined Iron', avatar: '⚒️' },
  { day: 6, type: 'troops', quantity: 5, label: '5 Troops', avatar: '⚔️' },
  { day: 7, type: 'gold', quantity: 500, label: '500 Gold', avatar: '🪙', special: true },
  { day: 8, type: 'refined_wood', quantity: 20, label: '20 Refined Wood', avatar: '🪵' },
  { day: 9, type: 'refined_stone', quantity: 20, label: '20 Refined Stone', avatar: '🪨' },
  { day: 10, type: 'gold', quantity: 300, label: '300 Gold', avatar: '🪙' },
  { day: 11, type: 'refined_iron', quantity: 15, label: '15 Refined Iron', avatar: '⚒️' },
  { day: 12, type: 'troops', quantity: 10, label: '10 Troops', avatar: '⚔️' },
  { day: 13, type: 'gold', quantity: 400, label: '400 Gold', avatar: '🪙' },
  { day: 14, type: 'refined_wood', quantity: 25, label: '25 Refined Wood', avatar: '🪵' },
  { day: 15, type: 'prestige', quantity: 1, label: '1 Prestige Point', avatar: '✨', special: true },
  { day: 16, type: 'refined_stone', quantity: 25, label: '25 Refined Stone', avatar: '🪨' },
  { day: 17, type: 'refined_iron', quantity: 20, label: '20 Refined Iron', avatar: '⚒️' },
  { day: 18, type: 'gold', quantity: 500, label: '500 Gold', avatar: '🪙' },
  { day: 19, type: 'troops', quantity: 15, label: '15 Troops', avatar: '⚔️' },
  { day: 20, type: 'refined_wood', quantity: 30, label: '30 Refined Wood', avatar: '🪵' },
  { day: 21, type: 'gold', quantity: 750, label: '750 Gold', avatar: '🪙', special: true },
  { day: 22, type: 'refined_stone', quantity: 30, label: '30 Refined Stone', avatar: '🪨' },
  { day: 23, type: 'refined_iron', quantity: 25, label: '25 Refined Iron', avatar: '⚒️' },
  { day: 24, type: 'gold', quantity: 600, label: '600 Gold', avatar: '🪙' },
  { day: 25, type: 'troops', quantity: 20, label: '20 Troops', avatar: '⚔️' },
  { day: 26, type: 'prestige', quantity: 2, label: '2 Prestige Points', avatar: '✨' },
  { day: 27, type: 'gold', quantity: 800, label: '800 Gold', avatar: '🪙' },
  { day: 28, type: 'refined_wood', quantity: 40, label: '40 Refined Wood', avatar: '🪵' },
  { day: 29, type: 'refined_iron', quantity: 35, label: '35 Refined Iron', avatar: '⚒️' },
  { day: 30, type: 'rare_item', quantity: 1, label: 'Dragon Heart (Epic)!', avatar: '🐉', special: true },
];

/** Total days in the cycle. */
export const CHECK_IN_CYCLE_DAYS = 30;

/**
 * Check-in state (lives on GameState).
 */
export interface CheckInState {
  /** Current day in the cycle (1-30). 0 = hasn't started. */
  current_day: number;
  /** Epoch ms of the last claimed day (to enforce once-per-day). */
  last_claimed_at: number | null;
  /** Total claims across all cycles (for stats). */
  total_claims: number;
  /** Current consecutive-day streak (resets if a day is missed). */
  streak: number;
}

/** Create fresh check-in state. */
export function createInitialCheckIn(): CheckInState {
  return {
    current_day: 0,
    last_claimed_at: null,
    total_claims: 0,
    streak: 0,
  };
}

/** Whether the player can claim today's reward (once per calendar day). */
export function canClaimCheckIn(state: GameState, now: number): boolean {
  const ci = state.check_in ?? createInitialCheckIn();
  if (ci.last_claimed_at === null) return true;
  // Check if 24h have passed since last claim (calendar day check).
  const oneDay = 24 * 60 * 60 * 1000;
  return now >= ci.last_claimed_at + oneDay;
}

/** Whether the player has completed the 30-day cycle (resets). */
export function isCycleComplete(state: GameState): boolean {
  const ci = state.check_in ?? createInitialCheckIn();
  return ci.current_day >= CHECK_IN_CYCLE_DAYS;
}

/**
 * Claim today's check-in reward. Returns the reward + new state, or
 * unchanged state with ok=false if can't claim.
 */
export function claimCheckIn(
  state: GameState,
  now: number,
): { state: GameState; ok: boolean; reward: CheckInReward | null; reason?: string } {
  if (!canClaimCheckIn(state, now)) {
    return { state, ok: false, reward: null, reason: 'Already claimed today' };
  }

  const ci = state.check_in ?? createInitialCheckIn();
  let nextDay = ci.current_day + 1;
  let streak = ci.streak;

  // Cycle resets after day 30.
  if (nextDay > CHECK_IN_CYCLE_DAYS) {
    nextDay = 1;
    streak = 0;
  }

  // Streak logic: if last claim was >2 days ago, reset streak.
  if (ci.last_claimed_at !== null) {
    const twoDays = 2 * 24 * 60 * 60 * 1000;
    if (now - ci.last_claimed_at > twoDays) {
      streak = 0;
    }
  }
  streak += 1;

  const reward = CHECK_IN_REWARDS[nextDay - 1];
  const next = structuredClone(state);
  next.check_in = {
    current_day: nextDay,
    last_claimed_at: now,
    total_claims: ci.total_claims + 1,
    streak,
  };

  // Apply the reward.
  switch (reward.type) {
    case 'gold':
      next.player.gold += reward.quantity;
      break;
    case 'refined_wood':
      next.resources.wood.refined_amount += reward.quantity;
      break;
    case 'refined_stone':
      next.resources.stone.refined_amount += reward.quantity;
      break;
    case 'refined_iron':
      next.resources.iron.refined_amount += reward.quantity;
      break;
    case 'troops':
      next.army.active_troops = Math.min(
        next.army.max_troop_capacity,
        next.army.active_troops + reward.quantity,
      );
      break;
    case 'prestige':
      if (next.prestige) {
        next.prestige.prestige_points += reward.quantity;
        next.prestige.total_prestige_earned += reward.quantity;
      }
      break;
    case 'rare_item':
      // Day 30: Dragon Heart (epic monster item).
      if (!next.inventory.items) next.inventory.items = {};
      next.inventory.items['dragon_heart'] = (next.inventory.items['dragon_heart'] ?? 0) + reward.quantity;
      break;
  }

  return { state: next, ok: true, reward };
}

/** Get the reward for a specific day number (1-indexed). */
export function getRewardForDay(day: number): CheckInReward | undefined {
  return CHECK_IN_REWARDS.find((r) => r.day === day);
}
