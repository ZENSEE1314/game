/**
 * ============================================================
 * CAVE HUNTING + MARKET ENGINE
 * ============================================================
 * Cave hunting: enter a cave (3/day), wait the cooldown, then
 * resolve a hunt that may yield monster items. Failures give
 * nothing. Items can be sold at the market for gold.
 *
 * Caves scale in difficulty (tier 1-3). Higher tier = longer
 * cooldown, lower success chance, but better loot.
 * ============================================================
 */

import type { GameState, CaveDef, CaveHuntResult, MonsterItemDef, ItemRarity, CaveState } from './types';

/** Max cave entries per day. */
export const CAVE_MAX_ENTRIES_PER_DAY = 3;
/** Daily reset interval. */
export const CAVE_RESET_INTERVAL_MS = 24 * 60 * 60 * 1000;

/** All monster-item definitions. */
export const MONSTER_ITEMS: MonsterItemDef[] = [
  // Common
  { id: 'wolf_tooth', name: 'Wolf Tooth', avatar: '🦷', rarity: 'common', sell_price: 50, description: 'A sharp fang from a grey wolf.' },
  { id: 'bat_wing', name: 'Bat Wing', avatar: '🦇', rarity: 'common', sell_price: 40, description: 'Leathery wing of a cave bat.' },
  { id: 'rat_tail', name: 'Rat Tail', avatar: '🐀', rarity: 'common', sell_price: 30, description: 'A common vermin trophy.' },
  // Uncommon
  { id: 'lion_skin', name: 'Lion Skin', avatar: '🦁', rarity: 'uncommon', sell_price: 150, description: 'A majestic pelt from a plains lion.' },
  { id: 'bear_claw', name: 'Bear Claw', avatar: '🐻', rarity: 'uncommon', sell_price: 180, description: 'Massive claw of a cave bear.' },
  { id: 'spider_silk', name: 'Spider Silk', avatar: '🕷️', rarity: 'uncommon', sell_price: 120, description: 'Strong, gossamer thread.' },
  // Rare
  { id: 'troll_hide', name: 'Troll Hide', avatar: '👹', rarity: 'rare', sell_price: 500, description: 'Tough regenerative hide.' },
  { id: 'wyvern_scale', name: 'Wyvern Scale', avatar: '🐲', rarity: 'rare', sell_price: 750, description: 'Iridescent dragon-kin scale.' },
  { id: 'golem_core', name: 'Golem Core', avatar: '🗿', rarity: 'rare', sell_price: 600, description: 'Pulsing crystalline heart.' },
  // Epic
  { id: 'phoenix_feather', name: 'Phoenix Feather', avatar: '🔥', rarity: 'epic', sell_price: 2500, description: 'Eternal flame-imbued plume.' },
  { id: 'dragon_heart', name: 'Dragon Heart', avatar: '🐉', rarity: 'epic', sell_price: 5000, description: 'Still-warm heart of an ancient wyrm.' },
  { id: 'kraken_eye', name: 'Kraken Eye', avatar: '👁️', rarity: 'epic', sell_price: 3000, description: 'Glowing orb from the deep.' },
];

/** Lookup an item by ID. */
export function getItem(id: string): MonsterItemDef | undefined {
  return MONSTER_ITEMS.find((i) => i.id === id);
}

/** All cave definitions. */
export const CAVES: CaveDef[] = [
  {
    id: 'whispering_cavern',
    name: 'Whispering Cavern',
    avatar: '🕳️',
    description: 'An easy cave teeming with wolves and bats. 1-hour cooldown.',
    tier: 1,
    cooldown_ms: 1 * 60 * 60 * 1000,
    base_success: 0.8,
    loot_table: [
      { item_id: 'wolf_tooth', weight: 50, min: 1, max: 3 },
      { item_id: 'bat_wing', weight: 40, min: 1, max: 2 },
      { item_id: 'rat_tail', weight: 30, min: 1, max: 2 },
      { item_id: 'lion_skin', weight: 5, min: 1, max: 1 },
    ],
  },
  {
    id: 'irondeep_mine',
    name: 'Irondeep Mine',
    avatar: '⛏️',
    description: 'A medium cave with bears and spiders. 4-hour cooldown, better loot.',
    tier: 2,
    cooldown_ms: 4 * 60 * 60 * 1000,
    base_success: 0.6,
    loot_table: [
      { item_id: 'bear_claw', weight: 35, min: 1, max: 2 },
      { item_id: 'spider_silk', weight: 35, min: 1, max: 3 },
      { item_id: 'lion_skin', weight: 25, min: 1, max: 1 },
      { item_id: 'troll_hide', weight: 8, min: 1, max: 1 },
      { item_id: 'golem_core', weight: 5, min: 1, max: 1 },
      { item_id: 'wyvern_scale', weight: 2, min: 1, max: 1 },
    ],
  },
  {
    id: 'volcanic_depths',
    name: 'Volcanic Depths',
    avatar: '🌋',
    description: 'A deadly cave with dragons and phoenixes. 8-hour cooldown, epic loot.',
    tier: 3,
    cooldown_ms: 8 * 60 * 60 * 1000,
    base_success: 0.4,
    loot_table: [
      { item_id: 'wyvern_scale', weight: 30, min: 1, max: 2 },
      { item_id: 'golem_core', weight: 25, min: 1, max: 1 },
      { item_id: 'troll_hide', weight: 20, min: 1, max: 2 },
      { item_id: 'phoenix_feather', weight: 10, min: 1, max: 1 },
      { item_id: 'kraken_eye', weight: 8, min: 1, max: 1 },
      { item_id: 'dragon_heart', weight: 3, min: 1, max: 1 },
    ],
  },
];

/** Create fresh cave state. */
export function createInitialCaveState(now: number): CaveState {
  return {
    entries_today: 0,
    next_reset_at: now + CAVE_RESET_INTERVAL_MS,
    last_entered: {},
  };
}

/** Reconcile daily entry reset. */
export function reconcileCave(state: GameState, now: number): GameState {
  if (now >= state.cave.next_reset_at) {
    return {
      ...state,
      cave: {
        ...state.cave,
        entries_today: 0,
        next_reset_at: now + CAVE_RESET_INTERVAL_MS,
      },
    };
  }
  return state;
}

/** Whether the player can enter a cave right now. */
export function canEnterCave(state: GameState, caveId: string, now: number): { ok: boolean; reason?: string } {
  if (state.cave.entries_today >= CAVE_MAX_ENTRIES_PER_DAY) {
    return { ok: false, reason: 'No cave entries left today' };
  }
  const cave = CAVES.find((c) => c.id === caveId);
  if (!cave) return { ok: false, reason: 'Unknown cave' };
  const last = state.cave.last_entered[caveId] ?? 0;
  if (now < last + cave.cooldown_ms) {
    return { ok: false, reason: 'Cave on cooldown' };
  }
  return { ok: true };
}

/** Cooldown remaining label for a cave (HH:MM:SS). */
export function caveCooldownLabel(state: GameState, caveId: string): string {
  const cave = CAVES.find((c) => c.id === caveId);
  if (!cave) return '';
  const last = state.cave.last_entered[caveId] ?? 0;
  const remaining = last + cave.cooldown_ms - Date.now();
  if (remaining <= 0) return 'Ready';
  return formatHMS(remaining);
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function formatHMS(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/**
 * Perform a cave hunt: consume an entry, set cooldown, resolve the
 * success roll + loot drop. Returns the result + new state.
 */
export function performCaveHunt(
  state: GameState,
  caveId: string,
  now: number,
): { state: GameState; result: CaveHuntResult; ok: boolean; reason?: string } {
  const check = canEnterCave(state, caveId, now);
  if (!check.ok) {
    return {
      state,
      ok: false,
      reason: check.reason,
      result: { success: false, item_id: null, item_name: null, quantity: 0, rarity: 'common' },
    };
  }

  const cave = CAVES.find((c) => c.id === caveId)!;
  // Success chance boosted slightly by player level (max +15% at L15).
  const successChance = Math.min(0.95, cave.base_success + state.player.level * 0.01);
  const success = Math.random() < successChance;

  const next = structuredClone(state);
  next.cave.entries_today += 1;
  next.cave.last_entered[caveId] = now;

  if (!success) {
    return {
      state: next,
      ok: true,
      result: { success: false, item_id: null, item_name: null, quantity: 0, rarity: 'common' },
    };
  }

  // Roll loot from the weighted table.
  const totalWeight = cave.loot_table.reduce((s, e) => s + e.weight, 0);
  let roll = Math.random() * totalWeight;
  let drop = cave.loot_table[0];
  for (const entry of cave.loot_table) {
    roll -= entry.weight;
    if (roll <= 0) {
      drop = entry;
      break;
    }
  }
  const qty = drop.min + Math.floor(Math.random() * (drop.max - drop.min + 1));
  const item = getItem(drop.item_id)!;

  // Add to inventory.
  next.inventory.items[drop.item_id] = (next.inventory.items[drop.item_id] ?? 0) + qty;

  return {
    state: next,
    ok: true,
    result: {
      success: true,
      item_id: item.id,
      item_name: item.name,
      quantity: qty,
      rarity: item.rarity,
    },
  };
}

/** Sell an item from the inventory for gold. */
export function sellItem(
  state: GameState,
  itemId: string,
  quantity: number,
): { state: GameState; ok: boolean; reason?: string; goldGained: number } {
  const owned = state.inventory.items[itemId] ?? 0;
  if (owned < quantity) {
    return { state, ok: false, reason: 'Not enough items', goldGained: 0 };
  }
  const item = getItem(itemId);
  if (!item) return { state, ok: false, reason: 'Unknown item', goldGained: 0 };

  const goldGained = item.sell_price * quantity;
  const next = structuredClone(state);
  next.inventory.items[itemId] = owned - quantity;
  if (next.inventory.items[itemId] <= 0) delete next.inventory.items[itemId];
  next.player.gold += goldGained;
  if (next.prestige) {
    next.prestige.current_run_gold += goldGained;
  }
  next.stats.total_gold_earned += goldGained;
  return { state: next, ok: true, goldGained };
}

/** Total count of items in inventory. */
export function inventoryCount(state: GameState): number {
  return Object.values(state.inventory.items).reduce((s, n) => s + n, 0);
}

/** Rarity color helper for UI. */
export function rarityColor(rarity: ItemRarity): { text: string; bg: string; border: string; label: string } {
  switch (rarity) {
    case 'common':
      return { text: 'text-stone-300', bg: 'bg-stone-800/40', border: 'border-stone-600/40', label: 'Common' };
    case 'uncommon':
      return { text: 'text-emerald-300', bg: 'bg-emerald-950/40', border: 'border-emerald-600/40', label: 'Uncommon' };
    case 'rare':
      return { text: 'text-amber-300', bg: 'bg-amber-950/40', border: 'border-amber-600/40', label: 'Rare' };
    case 'epic':
      return { text: 'text-rose-300', bg: 'bg-rose-950/40', border: 'border-rose-600/40', label: 'Epic' };
  }
}
