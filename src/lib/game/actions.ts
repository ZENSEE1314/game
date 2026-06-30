/**
 * ============================================================
 * PURE ACTION FUNCTIONS
 * ============================================================
 * Stateless transformations: (state, params) -> { state, ...meta }.
 *
 * These are the SINGLE source of truth for discrete player actions.
 * Both the API routes (authoritative server path) and the client
 * store (responsive local fallback) call these.
 *
 * The real-time tick + offline reconciliation live in engine.ts and
 * are always executed client-side (they must be local for an idle
 * game's responsiveness).
 * ============================================================
 */

import type { GameState, Opponent, BattleResult, OfflineEarnings } from './types';
import { syncDerived, generateOpponents } from './initial-state';
import { awardXp } from './engine';
import {
  resolvePvp,
  projectPlayer,
  projectOpponent,
  applyBattleToAttacker,
} from './pvp';
import {
  facilityUpgradeCost,
  troopRecruitCost,
  weaponForgeCost,
  weaponTierUpgradeCost,
  weaponMultiplierForTier,
  PVP_VICTORY_XP,
  RECRUIT_XP,
} from './constants';
import {
  trigger_offline_double_ad,
  trigger_peace_shield_ad,
  trigger_conscription_ad,
} from './ads';
import { applyWarmongerPerk } from './prestige';

export interface ActionResult {
  state: GameState;
  success: boolean;
  reason?: string;
}

// ---------------------------------------------------------------------------
// BASE CAMP
// ---------------------------------------------------------------------------

export function doUpgradeFacility(state: GameState, facility: keyof GameState['facilities']): ActionResult {
  const currentLevel = state.facilities[facility];
  const cost = facilityUpgradeCost(currentLevel);

  if (
    state.player.gold < cost.gold ||
    state.resources.wood.refined_amount < cost.refined_wood ||
    state.resources.stone.refined_amount < cost.refined_stone ||
    state.resources.iron.refined_amount < cost.refined_iron
  ) {
    return { state, success: false, reason: 'Insufficient resources' };
  }

  let next = structuredClone(state);
  next.player.gold -= cost.gold;
  next.resources.wood.refined_amount -= cost.refined_wood;
  next.resources.stone.refined_amount -= cost.refined_stone;
  next.resources.iron.refined_amount -= cost.refined_iron;
  next.facilities[facility] = currentLevel + 1;
  next = syncDerived(next);
  next = awardXp(next, 10);
  next.stats.total_facility_upgrades += 1;
  return { state: next, success: true };
}

// ---------------------------------------------------------------------------
// BARRACKS / FORGE
// ---------------------------------------------------------------------------

export function doRecruitTroops(state: GameState, count: number): ActionResult {
  if (count <= 0) return { state, success: false, reason: 'Invalid count' };
  const cost = troopRecruitCost();
  const totalGold = cost.gold * count;
  const totalIron = cost.refined_iron * count;
  const totalWood = cost.refined_wood * count;

  if (
    state.player.gold < totalGold ||
    state.resources.iron.refined_amount < totalIron ||
    state.resources.wood.refined_amount < totalWood
  ) {
    return { state, success: false, reason: 'Insufficient resources' };
  }
  if (state.army.active_troops + count > state.army.max_troop_capacity) {
    return { state, success: false, reason: 'Exceeds troop capacity' };
  }

  let next = structuredClone(state);
  next.player.gold -= totalGold;
  next.resources.iron.refined_amount -= totalIron;
  next.resources.wood.refined_amount -= totalWood;
  next.army.active_troops += count;
  next = awardXp(next, RECRUIT_XP * count);
  next.stats.total_troops_recruited += count;
  return { state: next, success: true };
}

export function doForgeWeapon(state: GameState): ActionResult {
  const cost = weaponForgeCost(state.gear.weapon_count);
  if (
    state.player.gold < cost.gold ||
    state.resources.iron.refined_amount < cost.refined_iron
  ) {
    return { state, success: false, reason: 'Insufficient resources' };
  }
  let next = structuredClone(state);
  next.player.gold -= cost.gold;
  next.resources.iron.refined_amount -= cost.refined_iron;
  next.gear.weapon_count += 1;
  next = awardXp(next, 5);
  next.stats.total_weapons_forged += 1;
  return { state: next, success: true };
}

export function doUpgradeWeaponTier(state: GameState): ActionResult {
  const currentTier = state.gear.weapon_tier_level;
  const cost = weaponTierUpgradeCost(currentTier);
  if (
    state.player.gold < cost.gold ||
    state.resources.iron.refined_amount < cost.refined_iron ||
    state.resources.stone.refined_amount < cost.refined_stone
  ) {
    return { state, success: false, reason: 'Insufficient resources' };
  }
  let next = structuredClone(state);
  next.player.gold -= cost.gold;
  next.resources.iron.refined_amount -= cost.refined_iron;
  next.resources.stone.refined_amount -= cost.refined_stone;
  next.gear.weapon_tier_level = currentTier + 1;
  next.gear.weapon_multipliers = applyWarmongerPerk(next, weaponMultiplierForTier(currentTier + 1));
  next = awardXp(next, 15);
  next.stats.total_weapon_tier_upgrades += 1;
  return { state: next, success: true };
}

// ---------------------------------------------------------------------------
// ARENA — PvP
// ---------------------------------------------------------------------------

export interface AttackResult extends ActionResult {
  result?: BattleResult;
  opponent?: Opponent;
  opponents?: Opponent[];
}

export function doAttack(state: GameState, opponentId: string, opponents: Opponent[]): AttackResult {
  const opp = opponents.find((o) => o.id === opponentId);
  if (!opp) return { state, success: false, reason: 'Opponent not found', opponents };
  if (state.army.active_troops <= 0) {
    return { state, success: false, reason: 'You have no troops to attack with', opponents };
  }

  const attacker = projectPlayer(state, true);
  const defender = projectOpponent(opp);
  const result = resolvePvp(attacker, defender);

  let next = applyBattleToAttacker(state, result, opp);
  if (result.attacker_won) {
    next = awardXp(next, PVP_VICTORY_XP);
  }

  const remaining = opponents.filter((o) => o.id !== opponentId);
  const refreshed = remaining.length < 3
    ? [...remaining, ...generateOpponents(state.player.level)]
    : remaining;

  return {
    state: next,
    success: true,
    result,
    opponent: opp,
    opponents: refreshed,
  };
}

// ---------------------------------------------------------------------------
// AD HOOKS
// ---------------------------------------------------------------------------

export function doOfflineDoubleAd(earnings: OfflineEarnings): OfflineEarnings {
  return trigger_offline_double_ad(earnings);
}

export function doPeaceShieldAd(state: GameState): GameState {
  const next = trigger_peace_shield_ad(state);
  next.stats.total_ads_watched += 1;
  return next;
}

export function doConscriptionAd(state: GameState, troopsLost: number): GameState {
  const next = trigger_conscription_ad(state, troopsLost);
  next.stats.total_ads_watched += 1;
  return next;
}

/**
 * Track offline-return stats (longest absence + refined produced).
 * Called by the store after applying offline earnings.
 */
export function doRecordOfflineReturn(state: GameState, secondsElapsed: number, refinedProduced: number): GameState {
  const next = structuredClone(state);
  next.stats.longest_offline_return_seconds = Math.max(
    next.stats.longest_offline_return_seconds,
    secondsElapsed,
  );
  next.stats.total_refined_produced += refinedProduced;
  next.stats.total_gold_earned += 0; // gold tracked separately if needed
  return next;
}

/**
 * Claim a completed quest's reward. Returns new state with rewards
 * applied + quest marked claimed.
 */
export function doClaimQuest(state: GameState, questId: string): ActionResult {
  const q = state.quests.find((x) => x.id === questId);
  if (!q) return { state, success: false, reason: 'Quest not found' };
  if (q.claimed) return { state, success: false, reason: 'Already claimed' };

  // Verify completion using live stats.
  const progress = Math.max(0, state.stats[q.tracker] - q.baseline);
  if (progress < q.goal) return { state, success: false, reason: 'Not yet complete' };

  let next = structuredClone(state);
  const q2 = next.quests.find((x) => x.id === questId)!;
  q2.claimed = true;
  next.player.gold += q.reward.gold;
  next.resources.wood.refined_amount += q.reward.refined_wood;
  next.resources.stone.refined_amount += q.reward.refined_stone;
  next.resources.iron.refined_amount += q.reward.refined_iron;
  next = awardXp(next, q.reward.xp);
  next.stats.total_gold_earned += q.reward.gold;
  return { state: next, success: true };
}

