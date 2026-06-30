/**
 * ============================================================
 * INITIAL STATE & OPPONENT GENERATION
 * ============================================================
 */

import type { GameState, Opponent } from './types';
import {
  deriveResourceState,
  recomputeDerived,
  vaultCapacity,
  troopCapacity,
  weaponMultiplierForTier,
} from './constants';
import { perkMultiplier } from './prestige';

/** A fresh new-player GameState. */
export function createInitialState(): GameState {
  const state: GameState = {
    player: {
      id: 'player_1',
      level: 1,
      current_exp: 0,
      gold: 500,
      secure_vault_limit: 0, // recomputed below
    },
    resources: {
      wood: { current_amount: 120, raw_per_sec: 0, refined_amount: 60, processing_rate: 0 },
      stone: { current_amount: 120, raw_per_sec: 0, refined_amount: 60, processing_rate: 0 },
      iron: { current_amount: 60, raw_per_sec: 0, refined_amount: 30, processing_rate: 0 },
    },
    facilities: {
      wood_gatherer: 1,
      stone_quarry: 1,
      iron_mine: 1,
      wood_refinery: 1,
      stone_refinery: 1,
      iron_smelter: 1,
      vault: 1,
      barracks: 1,
    },
    army: {
      active_troops: 10,
      max_troop_capacity: 0, // recomputed below
    },
    gear: {
      weapon_tier_level: 0,
      weapon_multipliers: weaponMultiplierForTier(0),
      weapon_count: 5,
    },
    last_saved_at: Date.now(),
    shield_until: null,
    is_raidable: true,
    battle_history: [],
    stats: {
      total_battles: 0,
      total_victories: 0,
      total_defeats: 0,
      total_troops_recruited: 0,
      total_weapons_forged: 0,
      total_weapon_tier_upgrades: 0,
      total_facility_upgrades: 0,
      total_gold_earned: 0,
      total_gold_looted: 0,
      total_refined_produced: 0,
      total_ads_watched: 0,
      longest_offline_return_seconds: 0,
    },
    quests: [],
    quests_rotated_at: 0,
    achievements_unlocked: [],
    prestige: {
      rebirth_count: 0,
      prestige_points: 0,
      total_prestige_earned: 0,
      current_run_gold: 0,
      global_multiplier: 1,
      perks: {},
    },
    active_event: null,
  };

  // Initialize the derived rate/capacity fields from facility levels.
  state.resources.wood = deriveResourceState(state.facilities.wood_gatherer, state.facilities.wood_refinery, state.resources.wood);
  state.resources.stone = deriveResourceState(state.facilities.stone_quarry, state.facilities.stone_refinery, state.resources.stone);
  state.resources.iron = deriveResourceState(state.facilities.iron_mine, state.facilities.iron_smelter, state.resources.iron);
  state.player.secure_vault_limit = vaultCapacity(state.facilities.vault);
  state.army.max_troop_capacity = troopCapacity(state.facilities.barracks);

  return state;
}

/** Theme-appropriate NPC names + emoji avatars for the Arena. */
const OPPONENT_POOL: Array<{ name: string; avatar: string }> = [
  { name: 'Ravager Kael', avatar: '⚔️' },
  { name: 'Ironjaw Voss', avatar: '🛡️' },
  { name: 'Wraith Lord Mira', avatar: '💀' },
  { name: 'Warlord Drask', avatar: '🔥' },
  { name: 'Lady Crimson', avatar: '🗡️' },
  { name: 'Bonecaller Zeph', avatar: '☠️' },
  { name: 'Garrison Bryn', avatar: '🏰' },
  { name: 'Scout Captain Reva', avatar: '🏹' },
  { name: 'Duke Malcor', avatar: '👑' },
  { name: 'Berserker Tok', avatar: '🪓' },
  { name: 'Nightblade Sera', avatar: '🌙' },
  { name: 'Forge Master Dorn', avatar: '⚒️' },
];

/**
 * Generate a fresh roster of opponents scaled loosely to the player's
 * level. Higher player level -> tougher opponents with better loot.
 */
export function generateOpponents(playerLevel: number): Opponent[] {
  const count = 6;
  const pool = [...OPPONENT_POOL].sort(() => Math.random() - 0.5);
  const opponents: Opponent[] = [];

  for (let i = 0; i < count; i++) {
    // Difficulty scales with both player level and the slot index.
    const tier = Math.max(1, playerLevel - 1 + Math.floor(i / 2));
    const threat = Math.min(5, 1 + Math.floor(i / 1.5));

    const troopCount = Math.floor(8 + tier * 6 + Math.random() * 10);
    const weaponCount = Math.floor(3 + tier * 2 + Math.random() * 4);
    const weaponTier = Math.max(0, Math.floor(tier / 2));
    const mults = weaponMultiplierForTier(weaponTier);

    opponents.push({
      id: `opp_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      name: pool[i % pool.length].name,
      avatar: pool[i % pool.length].avatar,
      army: {
        active_troops: troopCount,
        max_troop_capacity: troopCount,
      },
      gear: {
        weapon_tier_level: weaponTier,
        weapon_multipliers: mults,
        weapon_count: weaponCount,
      },
      player: {
        gold: Math.floor(150 + tier * 120 + Math.random() * 200),
        level: Math.max(1, playerLevel - 1 + i),
      },
      resources: {
        wood: { refined_amount: Math.floor(20 + tier * 15 + Math.random() * 30) },
        iron: { refined_amount: Math.floor(10 + tier * 8 + Math.random() * 20) },
      },
      threat,
    });
  }

  return opponents;
}

/**
 * Re-derive all cached rate fields (call after any facility upgrade).
 * Applies prestige perk multipliers for vault capacity (fortified)
 * and troop capacity (quartermaster).
 */
export function syncDerived(state: GameState): GameState {
  const next = structuredClone(state);
  const vaultMult = perkMultiplier(next, 'fortified');
  const troopCapMult = perkMultiplier(next, 'quartermaster');
  recomputeDerived(next, { vaultMult, troopCapMult });
  return next;
}
