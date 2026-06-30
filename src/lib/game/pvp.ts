/**
 * ============================================================
 * PvP COMBAT ENGINE
 * ============================================================
 * Implements the EXACT spec:
 *
 *  - Battle Score = Troops * Weapon Multiplier. Highest wins.
 *  - Resource Transfer: 10% of Defender's UNSECURE Gold, Refined
 *    Wood, and Refined Ore is looted on an attacker victory.
 *  - Casualties:
 *      Attacker ALWAYS loses 5% of active_troops AND 5% of weapon_count.
 *      Defender ALWAYS loses 10% of active_troops AND 10% of weapon_count.
 *
 * The engine is pure: it takes two CombatantState projections and
 * returns a BattleResult. The store is responsible for applying the
 * deltas to the full GameState (and for opponents, which are
 * ephemeral NPCs, we just discard them).
 * ============================================================
 */

import type { CombatantState, BattleResult, GameState, Opponent } from './types';
import { trackRunGold } from './prestige';
import { eventMultiplier } from './events';
import {
  ATTACKER_TROOP_LOSS_RATE,
  ATTACKER_WEAPON_LOSS_RATE,
  DEFENDER_TROOP_LOSS_RATE,
  DEFENDER_WEAPON_LOSS_RATE,
  LOOT_RATE,
} from './constants';

/**
 * Compute the Battle Score for a combatant.
 *
 *   Battle Score = active_troops * weapon_multiplier
 *
 * The "weapon multiplier" used is the combatant's attack_mult when
 * they are the attacker, and defense_mult when they are the defender.
 * If a combatant has zero weapons, we still apply a baseline 1.0x so
 * unarmed troops aren't worth literally nothing (but they ARE weak).
 */
export function battleScore(
  troops: number,
  weaponCount: number,
  multiplier: number,
): number {
  const effectiveMult = weaponCount > 0 ? multiplier : 1.0;
  return troops * effectiveMult;
}

/**
 * Resolve a PvP engagement.
 *
 * @param attacker  Attacker projection (uses attack_mult).
 * @param defender  Defender projection (uses defense_mult).
 * @returns BattleResult with scores, casualties, and loot.
 *
 * Casualties are ALWAYS applied to both sides (win or lose), exactly
 * as the spec mandates. Loot is only transferred on an attacker win
 * AND only from the defender's UNSECURE pool:
 *   - gold above secure_vault_limit
 *   - all refined_wood (treated as unsecure)
 *   - all refined_iron (treated as unsecure)
 */
export function resolvePvp(attacker: CombatantState, defender: CombatantState): BattleResult {
  // --- (1) Battle scores ------------------------------------------------
  const attacker_score = battleScore(
    attacker.active_troops,
    attacker.weapon_count,
    attacker.attack_mult,
  );
  const defender_score = battleScore(
    defender.active_troops,
    defender.weapon_count,
    defender.defense_mult,
  );

  // Highest score wins. Ties go to the defender (home-field advantage).
  const attacker_won = attacker_score > defender_score;

  // --- (2) Casualties (ALWAYS applied, per spec) -----------------------
  const attacker_troops_lost = Math.floor(attacker.active_troops * ATTACKER_TROOP_LOSS_RATE);
  const attacker_weapons_lost = Math.floor(attacker.weapon_count * ATTACKER_WEAPON_LOSS_RATE);

  const defender_troops_lost = Math.floor(defender.active_troops * DEFENDER_TROOP_LOSS_RATE);
  const defender_weapons_lost = Math.floor(defender.weapon_count * DEFENDER_WEAPON_LOSS_RATE);

  // --- (3) Loot (only on attacker victory, only from unsecure pool) ----
  let loot = { gold: 0, refined_wood: 0, refined_iron: 0 };

  if (attacker_won) {
    // Defender's unsecure gold = gold above the secure vault limit.
    const unsecure_gold = Math.max(0, defender.gold - defender.secure_vault_limit);
    loot.gold = Math.floor(unsecure_gold * LOOT_RATE);
    // Refined wood & iron are treated as fully unsecure (per spec).
    loot.refined_wood = Math.floor(defender.refined_wood * LOOT_RATE);
    loot.refined_iron = Math.floor(defender.refined_iron * LOOT_RATE);
  }

  return {
    attacker_won,
    attacker_score,
    defender_score,
    attacker_casualties: {
      troops_lost: attacker_troops_lost,
      weapons_lost: attacker_weapons_lost,
    },
    defender_casualties: {
      troops_lost: defender_troops_lost,
      weapons_lost: defender_weapons_lost,
    },
    loot,
  };
}

/**
 * Project a player's GameState into a CombatantState for the engine.
 * The caller passes `asAttacker: true` to select attack_mult.
 */
export function projectPlayer(state: GameState, asAttacker: boolean): CombatantState {
  const mult = asAttacker
    ? state.gear.weapon_multipliers.attack_mult
    : state.gear.weapon_multipliers.defense_mult;
  return {
    active_troops: state.army.active_troops,
    weapon_count: state.gear.weapon_count,
    attack_mult: state.gear.weapon_multipliers.attack_mult,
    defense_mult: state.gear.weapon_multipliers.defense_mult,
    // multiplier selection happens inside battleScore; we still pass both.
    gold: state.player.gold,
    secure_vault_limit: state.player.secure_vault_limit,
    refined_wood: state.resources.wood.refined_amount,
    refined_iron: state.resources.iron.refined_amount,
    is_raidable: state.is_raidable,
  };
  // (mult kept for clarity; battleScore picks based on role.)
  void mult;
}

/** Project an NPC opponent into a CombatantState (always the defender). */
export function projectOpponent(opp: Opponent): CombatantState {
  return {
    active_troops: opp.army.active_troops,
    weapon_count: opp.gear.weapon_count,
    attack_mult: opp.gear.weapon_multipliers.attack_mult,
    defense_mult: opp.gear.weapon_multipliers.defense_mult,
    gold: opp.player.gold,
    secure_vault_limit: 0, // NPC vaults are always unsecure for loot.
    refined_wood: opp.resources.wood.refined_amount,
    refined_iron: opp.resources.iron.refined_amount,
    is_raidable: true,
  };
}

/**
 * Apply a BattleResult to the ATTACKER's full game state.
 * Returns a new state with casualties + loot applied.
 * (Defender application is only relevant for real multiplayer; for
 *  the NPC arena we just log the battle to history.)
 */
export function applyBattleToAttacker(state: GameState, result: BattleResult, opp: Opponent): GameState {
  const next = structuredClone(state);

  // Attacker casualties (always).
  next.army.active_troops = Math.max(0, next.army.active_troops - result.attacker_casualties.troops_lost);
  next.gear.weapon_count = Math.max(0, next.gear.weapon_count - result.attacker_casualties.weapons_lost);

  // Loot (only on victory). Apply pvp_loot event multiplier if active.
  if (result.attacker_won) {
    const lootMult = eventMultiplier(next, 'pvp_loot');
    next.player.gold += Math.floor(result.loot.gold * lootMult);
    next.resources.wood.refined_amount += Math.floor(result.loot.refined_wood * lootMult);
    next.resources.iron.refined_amount += Math.floor(result.loot.refined_iron * lootMult);
  }

  // Record to history (cap at 20 entries).
  next.battle_history.unshift({
    id: `b_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    opponent_id: opp.id,
    opponent_name: opp.name,
    role: 'attacker',
    result: result.attacker_won ? 'victory' : 'defeat',
    troops_lost: result.attacker_casualties.troops_lost,
    weapons_lost: result.attacker_casualties.weapons_lost,
    gold_delta: result.attacker_won ? result.loot.gold : 0,
    refined_wood_delta: result.attacker_won ? result.loot.refined_wood : 0,
    refined_iron_delta: result.attacker_won ? result.loot.refined_iron : 0,
  });
  next.battle_history = next.battle_history.slice(0, 20);

  // --- Career stats -----------------------------------------------------
  next.stats.total_battles += 1;
  if (result.attacker_won) {
    next.stats.total_victories += 1;
    next.stats.total_gold_looted += result.loot.gold;
    next.stats.total_gold_earned += result.loot.gold;
  } else {
    next.stats.total_defeats += 1;
  }

  // --- Track run gold for prestige/rebirth calc ------------------------
  if (result.attacker_won && result.loot.gold > 0) {
    const tracked = trackRunGold(next, result.loot.gold);
    next.prestige = tracked.prestige;
  }

  return next;
}

/**
 * ============================================================
 * COMBAT PREVIEW
 * ============================================================
 * Compute a deterministic "win odds" estimate for the Arena UI so
 * players can judge an attack before committing. Returns the
 * attacker/defender scores and a qualitative likelihood label.
 *
 * This does NOT add randomness — it uses the same deterministic
 * battleScore formula as resolvePvp so the preview matches the
 * actual outcome.
 */
export interface CombatPreview {
  attacker_score: number;
  defender_score: number;
  /** Ratio in [0,1] — share of total score power held by attacker. */
  attacker_share: number;
  /** Qualitative label for the UI. */
  verdict: 'certain' | 'likely' | 'even' | 'risky' | 'doomed';
  verdict_label: string;
}

export function previewCombat(attacker: CombatantState, defender: CombatantState): CombatPreview {
  const attacker_score = battleScore(attacker.active_troops, attacker.weapon_count, attacker.attack_mult);
  const defender_score = battleScore(defender.active_troops, defender.weapon_count, defender.defense_mult);
  const total = attacker_score + defender_score;
  const attacker_share = total > 0 ? attacker_score / total : 0.5;

  let verdict: CombatPreview['verdict'];
  let verdict_label: string;
  if (attacker_score === 0) {
    verdict = 'doomed';
    verdict_label = 'No army';
  } else if (attacker_share >= 0.85) {
    verdict = 'certain';
    verdict_label = 'Certain Victory';
  } else if (attacker_share >= 0.6) {
    verdict = 'likely';
    verdict_label = 'Likely Victory';
  } else if (attacker_share >= 0.45) {
    verdict = 'even';
    verdict_label = 'Even Match';
  } else if (attacker_share >= 0.2) {
    verdict = 'risky';
    verdict_label = 'Risky';
  } else {
    verdict = 'doomed';
    verdict_label = 'Likely Defeat';
  }

  return { attacker_score, defender_score, attacker_share, verdict, verdict_label };
}

