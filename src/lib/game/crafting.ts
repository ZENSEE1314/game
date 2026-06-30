/**
 * ============================================================
 * CRAFTING SYSTEM
 * ============================================================
 * Combine monster items (from cave hunting) into permanent
 * trinkets that grant stacking bonuses. Trinkets persist through
 * rebirth (they're permanent gear, like prestige).
 *
 * Recipe tiers scale with ingredient rarity:
 *   - Common ingredients → small bonuses (troop cap, tap yield)
 *   - Uncommon ingredients → medium (gold/s, vault cap)
 *   - Rare ingredients → strong (attack/defense mult, cave success)
 *   - Epic ingredients → powerful (PvP loot)
 * ============================================================
 */

import type { CraftRecipe, GameState, TrinketBonusType } from './types';
import { getItem } from './cave-market';

/** All crafting recipes. */
export const CRAFT_RECIPES: CraftRecipe[] = [
  {
    id: 'wolves_fang_necklace',
    name: "Wolf's Fang Necklace",
    avatar: '📿',
    description: 'A crude necklace of wolf teeth. Boosts troop capacity.',
    ingredients: [{ item_id: 'wolf_tooth', quantity: 5 }],
    bonus: { type: 'troop_cap', label: 'Troop Capacity', icon: 'Users' },
    bonus_per_unit: 0.05, // +5% per unit
    max_owned: 10,
  },
  {
    id: 'bat_leather_cape',
    name: 'Bat Leather Cape',
    avatar: '🦇',
    description: 'A dark cape sewn from bat wings. Boosts tap yield.',
    ingredients: [{ item_id: 'bat_wing', quantity: 5 }],
    bonus: { type: 'tap_yield', label: 'Tap Yield', icon: 'Hammer' },
    bonus_per_unit: 0.05,
    max_owned: 10,
  },
  {
    id: 'lions_mantle',
    name: "Lion's Mantle",
    avatar: '🦁',
    description: 'A regal mantle of lion skin. Boosts passive gold generation.',
    ingredients: [{ item_id: 'lion_skin', quantity: 3 }],
    bonus: { type: 'gold_per_sec', label: 'Gold Generation', icon: 'Coins' },
    bonus_per_unit: 0.08,
    max_owned: 10,
  },
  {
    id: 'bear_gauntlets',
    name: 'Bear Gauntlets',
    avatar: '🐻',
    description: 'Sturdy gauntlets from bear claws. Boosts vault capacity.',
    ingredients: [{ item_id: 'bear_claw', quantity: 3 }],
    bonus: { type: 'vault_cap', label: 'Vault Capacity', icon: 'Lock' },
    bonus_per_unit: 0.08,
    max_owned: 10,
  },
  {
    id: 'spider_silk_robe',
    name: 'Spider Silk Robe',
    avatar: '🕷️',
    description: 'A lightweight robe woven from spider silk. Boosts defense.',
    ingredients: [{ item_id: 'spider_silk', quantity: 4 }],
    bonus: { type: 'defense_mult', label: 'Weapon Defense', icon: 'Shield' },
    bonus_per_unit: 0.04,
    max_owned: 10,
  },
  {
    id: 'troll_hide_armor',
    name: 'Troll Hide Armor',
    avatar: '👹',
    description: 'Thick regenerative armor. Boosts weapon attack.',
    ingredients: [{ item_id: 'troll_hide', quantity: 3 }],
    bonus: { type: 'attack_mult', label: 'Weapon Attack', icon: 'Swords' },
    bonus_per_unit: 0.04,
    max_owned: 10,
  },
  {
    id: 'wyvern_scale_shield',
    name: 'Wyvern Scale Shield',
    avatar: '🐲',
    description: 'An iridescent shield. Boosts cave hunt success chance.',
    ingredients: [{ item_id: 'wyvern_scale', quantity: 3 }],
    bonus: { type: 'cave_success', label: 'Cave Success', icon: 'Skull' },
    bonus_per_unit: 0.05,
    max_owned: 10,
  },
  {
    id: 'golem_amulet',
    name: 'Golem Amulet',
    avatar: '🗿',
    description: 'A pulsing crystalline amulet. Boosts PvP loot.',
    ingredients: [{ item_id: 'golem_core', quantity: 3 }],
    bonus: { type: 'pvp_loot', label: 'PvP Loot', icon: 'Coins' },
    bonus_per_unit: 0.06,
    max_owned: 10,
  },
  {
    id: 'phoenix_crown',
    name: 'Phoenix Crown',
    avatar: '🔥',
    description: 'A blazing crown of eternal feathers. Massive gold boost.',
    ingredients: [{ item_id: 'phoenix_feather', quantity: 2 }],
    bonus: { type: 'gold_per_sec', label: 'Gold Generation', icon: 'Coins' },
    bonus_per_unit: 0.20,
    max_owned: 5,
  },
  {
    id: 'dragon_heart_ring',
    name: 'Dragon Heart Ring',
    avatar: '🐉',
    description: 'A ring pulsing with ancient power. Massive attack boost.',
    ingredients: [{ item_id: 'dragon_heart', quantity: 1 }],
    bonus: { type: 'attack_mult', label: 'Weapon Attack', icon: 'Swords' },
    bonus_per_unit: 0.15,
    max_owned: 5,
  },
];

/** Lookup a recipe by ID. */
export function getRecipe(id: string): CraftRecipe | undefined {
  return CRAFT_RECIPES.find((r) => r.id === id);
}

/**
 * Compute the total bonus multiplier for a trinket bonus type from
 * all crafted trinkets the player owns. Returns 1.0 if none.
 *
 *   effective_mult = 1 + sum(per_unit * owned_count)
 */
export function trinketMultiplier(state: GameState, type: TrinketBonusType): number {
  // Defensive: inventory or trinkets may be undefined on old saves.
  const trinkets = state.inventory?.trinkets ?? {};
  let total = 0;
  for (const recipe of CRAFT_RECIPES) {
    if (recipe.bonus.type !== type) continue;
    const owned = trinkets[recipe.id] ?? 0;
    total += recipe.bonus_per_unit * owned;
  }
  return 1 + total;
}

/** Whether the player can craft a recipe (has ingredients + under max_owned). */
export function canCraft(state: GameState, recipeId: string): { ok: boolean; reason?: string } {
  const recipe = getRecipe(recipeId);
  if (!recipe) return { ok: false, reason: 'Unknown recipe' };
  const owned = state.inventory.trinkets?.[recipeId] ?? 0;
  if (owned >= recipe.max_owned) {
    return { ok: false, reason: `Max owned (${recipe.max_owned})` };
  }
  for (const ing of recipe.ingredients) {
    const have = state.inventory.items[ing.item_id] ?? 0;
    if (have < ing.quantity) {
      const item = getItem(ing.item_id);
      return { ok: false, reason: `Need ${ing.quantity}× ${item?.name ?? ing.item_id}` };
    }
  }
  return { ok: true };
}

/**
 * Craft a trinket: consume ingredients, add trinket to inventory.
 * Returns new state or unchanged on error.
 */
export function craftTrinket(
  state: GameState,
  recipeId: string,
): { state: GameState; ok: boolean; reason?: string } {
  const check = canCraft(state, recipeId);
  if (!check.ok) return { state, ok: false, reason: check.reason };

  const recipe = getRecipe(recipeId)!;
  const next = structuredClone(state);
  // Consume ingredients.
  for (const ing of recipe.ingredients) {
    next.inventory.items[ing.item_id] = (next.inventory.items[ing.item_id] ?? 0) - ing.quantity;
    if (next.inventory.items[ing.item_id] <= 0) {
      delete next.inventory.items[ing.item_id];
    }
  }
  // Add trinket.
  if (!next.inventory.trinkets) next.inventory.trinkets = {};
  next.inventory.trinkets[recipeId] = (next.inventory.trinkets[recipeId] ?? 0) + 1;

  return { state: next, ok: true };
}

/** Total number of trinkets owned (for display). */
export function trinketCount(state: GameState): number {
  return Object.values(state.inventory.trinkets ?? {}).reduce((s, n) => s + n, 0);
}
