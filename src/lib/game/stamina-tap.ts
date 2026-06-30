/**
 * ============================================================
 * ARENA STAMINA + TAP NODES ENGINE
 * ============================================================
 * Two active-gameplay systems:
 *
 * 1. Arena Stamina: limits PvP attacks. Max 5, +1 every 3 hours.
 *    Shows HH:MM:SS countdown to next point. Refill-via-ad hook.
 *
 * 2. Tap Nodes: tree/mine/farm images the player taps to actively
 *    collect resources. Tool upgrades (axe/pickaxe/sickle) boost
 *    yield per tap. Adds an active layer on top of passive ticks.
 * ============================================================
 */

import type { GameState, TapNodesState, ArenaStamina } from './types';
import { formatNumber } from './constants';
import { trinketMultiplier } from './crafting';

/** Arena stamina config. */
export const ARENA_STAMINA_MAX = 5;
export const ARENA_STAMINA_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours

/** Create a fresh stamina state (full). */
export function createInitialStamina(now: number): ArenaStamina {
  return {
    current: ARENA_STAMINA_MAX,
    max: ARENA_STAMINA_MAX,
    next_regenerate_at: now + ARENA_STAMINA_INTERVAL_MS,
    regenerate_interval_ms: ARENA_STAMINA_INTERVAL_MS,
  };
}

/**
 * Reconcile stamina on tick / load: add regenerated points if enough
 * time has passed. Returns updated state (or same if no change).
 */
export function reconcileStamina(state: GameState, now: number): GameState {
  const st = state.arena_stamina;
  if (st.current >= st.max) {
    // Already full — no regeneration needed. Keep next_regenerate_at
    // in the future so the timer doesn't show negative.
    if (st.next_regenerate_at <= now) {
      return {
        ...state,
        arena_stamina: { ...st, next_regenerate_at: now + st.regenerate_interval_ms },
      };
    }
    return state;
  }
  if (now < st.next_regenerate_at) return state;

  // Calculate how many points regenerated (could be >1 after long offline).
  const elapsed = now - st.next_regenerate_at;
  const pointsGained = 1 + Math.floor(elapsed / st.regenerate_interval_ms);
  const newCurrent = Math.min(st.max, st.current + pointsGained);
  const newNext = newCurrent >= st.max
    ? now + st.regenerate_interval_ms
    : st.next_regenerate_at + pointsGained * st.regenerate_interval_ms;

  return {
    ...state,
    arena_stamina: {
      ...st,
      current: newCurrent,
      next_regenerate_at: newNext,
    },
  };
}

/** Consume 1 stamina for an attack. Returns false if none left. */
export function consumeStamina(state: GameState): { state: GameState; ok: boolean } {
  if (state.arena_stamina.current <= 0) {
    return { state, ok: false };
  }
  const st = state.arena_stamina;
  // If this is the first consumption (was full), lock in the regen timer.
  const nextRegen = st.current === st.max ? Date.now() + st.regenerate_interval_ms : st.next_regenerate_at;
  return {
    state: {
      ...state,
      arena_stamina: { ...st, current: st.current - 1, next_regenerate_at: nextRegen },
    },
    ok: true,
  };
}

/** Refill stamina to max (used by the rewarded-ad hook). */
export function refillStamina(state: GameState): GameState {
  return {
    ...state,
    arena_stamina: {
      ...state.arena_stamina,
      current: state.arena_stamina.max,
      next_regenerate_at: Date.now() + state.arena_stamina.regenerate_interval_ms,
    },
  };
}

/** Add 1 stamina (capped at max). Used by the rewarded-ad hook. */
export function addOneStamina(state: GameState): GameState {
  const st = state.arena_stamina;
  if (st.current >= st.max) return state;
  return {
    ...state,
    arena_stamina: {
      ...st,
      current: Math.min(st.max, st.current + 1),
    },
  };
}

/** Format the stamina regen countdown as HH:MM:SS. */
export function staminaCountdownLabel(state: GameState): string {
  const st = state.arena_stamina;
  if (st.current >= st.max) return 'Full';
  const ms = Math.max(0, st.next_regenerate_at - Date.now());
  return formatHMS(ms);
}

/** Format ms as HH:MM:SS. */
export function formatHMS(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

// ===========================================================================
// TAP NODES
// ===========================================================================

/** Tap-node cooldown (ms) between collects. */
export const TAP_COOLDOWN_MS = 0; // No cooldown — players can tap freely

/** Create fresh tap-node state. */
export function createInitialTapNodes(): TapNodesState {
  return {
    axe_level: 1,
    pickaxe_level: 1,
    sickle_level: 1,
    cooldowns: { tree: 0, mine: 0, farm: 0 },
  };
}

/** Yield per tap for a node type at the current tool level. */
export function tapYield(state: GameState, node: 'tree' | 'mine' | 'farm'): { wood?: number; stone?: number; iron?: number; gold: number } {
  const tn = state.tap_nodes;
  // Trinket bonus (tap_yield) — applied to all tap yields.
  const tapMult = trinketMultiplier(state, 'tap_yield');
  switch (node) {
    case 'tree':
      // Axe level boosts wood. 5 base, +3 per level.
      return { wood: Math.floor((5 + 3 * (tn.axe_level - 1)) * tapMult) };
    case 'mine':
      // Pickaxe boosts stone + iron. 3 stone + 2 iron base, +2/+1 per level.
      return {
        stone: Math.floor((3 + 2 * (tn.pickaxe_level - 1)) * tapMult),
        iron: Math.floor((2 + 1 * (tn.pickaxe_level - 1)) * tapMult),
      };
    case 'farm':
      // Sickle boosts gold. 10 base, +5 per level.
      return { gold: Math.floor((10 + 5 * (tn.sickle_level - 1)) * tapMult) };
  }
}

/** Whether a node is off cooldown. */
export function canTap(state: GameState, node: 'tree' | 'mine' | 'farm', now: number): boolean {
  return now >= state.tap_nodes.cooldowns[node] + TAP_COOLDOWN_MS;
}

/** Cooldown remaining label for a node (e.g. "3s"). */
export function tapCooldownLabel(state: GameState, node: 'tree' | 'mine' | 'farm'): string {
  const remaining = state.tap_nodes.cooldowns[node] + TAP_COOLDOWN_MS - Date.now();
  if (remaining <= 0) return 'Ready';
  return `${Math.ceil(remaining / 1000)}s`;
}

/**
 * Tap a node: grants yield + sets cooldown. Returns new state + yield,
 * or unchanged state with ok=false if on cooldown.
 */
export function tapNode(
  state: GameState,
  node: 'tree' | 'mine' | 'farm',
  now: number,
): { state: GameState; ok: boolean; yield: ReturnType<typeof tapYield> } {
  if (!canTap(state, node, now)) {
    return { state, ok: false, yield: tapYield(state, node) };
  }
  const y = tapYield(state, node);
  const next = structuredClone(state);
  next.tap_nodes.cooldowns[node] = now;
  if (y.wood) next.resources.wood.current_amount += y.wood;
  if (y.stone) next.resources.stone.current_amount += y.stone;
  if (y.iron) next.resources.iron.current_amount += y.iron;
  if (y.gold) next.player.gold += y.gold;
  // Track run gold for prestige.
  if (y.gold && y.gold > 0 && next.prestige) {
    next.prestige.current_run_gold += y.gold;
  }
  return { state: next, ok: true, yield: y };
}

/** Cost to upgrade a tool to the next level (gold + refined materials). */
export function toolUpgradeCost(currentLevel: number): { gold: number; refined_iron: number; refined_wood: number } {
  const base = 80;
  const factor = 1.6;
  const g = Math.floor(base * Math.pow(factor, currentLevel - 1));
  return {
    gold: g,
    refined_iron: Math.floor(g * 0.15),
    refined_wood: Math.floor(g * 0.1),
  };
}

/** Apply a tool upgrade. Returns new state or unchanged if unaffordable. */
export function upgradeTool(
  state: GameState,
  tool: 'axe' | 'pickaxe' | 'sickle',
): { state: GameState; ok: boolean; reason?: string } {
  const levelKey = tool === 'axe' ? 'axe_level' : tool === 'pickaxe' ? 'pickaxe_level' : 'sickle_level';
  const currentLevel = state.tap_nodes[levelKey];
  const cost = toolUpgradeCost(currentLevel);
  if (
    state.player.gold < cost.gold ||
    state.resources.iron.refined_amount < cost.refined_iron ||
    state.resources.wood.refined_amount < cost.refined_wood
  ) {
    return { state, ok: false, reason: 'Insufficient resources' };
  }
  const next = structuredClone(state);
  next.player.gold -= cost.gold;
  next.resources.iron.refined_amount -= cost.refined_iron;
  next.resources.wood.refined_amount -= cost.refined_wood;
  next.tap_nodes[levelKey] = currentLevel + 1;
  return { state: next, ok: true };
}

/** Format the yield for display, e.g. "+5 🪵 +3 🪨". */
export function formatTapYield(y: ReturnType<typeof tapYield>): string {
  const parts: string[] = [];
  if (y.wood) parts.push(`+${formatNumber(y.wood)} 🪵`);
  if (y.stone) parts.push(`+${formatNumber(y.stone)} 🪨`);
  if (y.iron) parts.push(`+${formatNumber(y.iron)} ⛏️`);
  if (y.gold) parts.push(`+${formatNumber(y.gold)} 🪙`);
  return parts.join('  ');
}
