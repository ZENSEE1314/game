/**
 * ============================================================
 * QUESTS & ACHIEVEMENTS DEFINITIONS
 * ============================================================
 * Static definitions for the daily-quest rotation and the career
 * achievement roster. Quest instances are generated from these defs
 * and tracked on the player state.
 * ============================================================
 */

import type { Achievement, CareerStats, Quest, QuestTier, QuestReward } from './types';

/** One quest-definition template. */
export interface QuestDef {
  def_key: string;
  title: string;
  description: string;
  tracker: keyof CareerStats;
  goal: number;
  /** Reward multiplier base; scaled by tier. */
  baseReward: QuestReward;
}

/** Daily quest pool — 3 are drawn at random each day. */
export const DAILY_QUEST_POOL: QuestDef[] = [
  {
    def_key: 'win_3_battles',
    title: 'Bloodied Blade',
    description: 'Win 3 battles in the Arena.',
    tracker: 'total_victories',
    goal: 3,
    baseReward: { gold: 300, refined_wood: 20, refined_stone: 20, refined_iron: 15, xp: 40 },
  },
  {
    def_key: 'recruit_20_troops',
    title: 'Call to Arms',
    description: 'Recruit 20 troops at the Barracks.',
    tracker: 'total_troops_recruited',
    goal: 20,
    baseReward: { gold: 250, refined_wood: 15, refined_stone: 10, refined_iron: 20, xp: 35 },
  },
  {
    def_key: 'forge_5_weapons',
    title: 'Hammer & Anvil',
    description: 'Forge 5 weapons at the Blacksmith.',
    tracker: 'total_weapons_forged',
    goal: 5,
    baseReward: { gold: 200, refined_wood: 10, refined_stone: 15, refined_iron: 25, xp: 30 },
  },
  {
    def_key: 'upgrade_3_facilities',
    title: 'Expanding Empire',
    description: 'Upgrade any 3 facilities in Base Camp.',
    tracker: 'total_facility_upgrades',
    goal: 3,
    baseReward: { gold: 350, refined_wood: 25, refined_stone: 25, refined_iron: 10, xp: 45 },
  },
  {
    def_key: 'fight_5_battles',
    title: 'Seasoned Commander',
    description: 'Fight 5 battles (win or lose) in the Arena.',
    tracker: 'total_battles',
    goal: 5,
    baseReward: { gold: 200, refined_wood: 15, refined_stone: 15, refined_iron: 15, xp: 30 },
  },
  {
    def_key: 'watch_2_ads',
    title: "Sponsor's Friend",
    description: 'Watch 2 rewarded ads of any kind.',
    tracker: 'total_ads_watched',
    goal: 2,
    baseReward: { gold: 400, refined_wood: 20, refined_stone: 20, refined_iron: 20, xp: 50 },
  },
];

/** The elite quest — always present, bigger reward, harder goal. */
export const ELITE_QUEST: QuestDef = {
  def_key: 'elite_conqueror',
  title: 'Conqueror\'s Path',
  description: 'Win 8 battles in a single day.',
  tracker: 'total_victories',
  goal: 8,
  baseReward: { gold: 1000, refined_wood: 60, refined_stone: 60, refined_iron: 50, xp: 150 },
};

/** Scale a base reward by tier (elite = 2.5x). */
function scaleReward(base: QuestReward, tier: QuestTier): QuestReward {
  if (tier === 'elite') {
    return {
      gold: Math.floor(base.gold * 2.5),
      refined_wood: Math.floor(base.refined_wood * 2.5),
      refined_stone: Math.floor(base.refined_stone * 2.5),
      refined_iron: Math.floor(base.refined_iron * 2.5),
      xp: Math.floor(base.xp * 2.5),
    };
  }
  return base;
}

/** Draw 3 random daily quests + the elite quest, seeded by the date. */
export function rollDailyQuests(stats: CareerStats, now: number): Quest[] {
  // Shuffle the pool (Fisher-Yates with a date-seeded pick).
  const pool = [...DAILY_QUEST_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const picked = pool.slice(0, 3);

  const quests: Quest[] = picked.map((def) => ({
    id: `q_${def.def_key}_${now}`,
    def_key: def.def_key,
    tier: 'daily' as const,
    title: def.title,
    description: def.description,
    tracker: def.tracker,
    baseline: stats[def.tracker],
    goal: def.goal,
    reward: scaleReward(def.baseReward, 'daily'),
    claimed: false,
    issued_at: now,
  }));

  // Always append the elite quest.
  quests.push({
    id: `q_${ELITE_QUEST.def_key}_${now}`,
    def_key: ELITE_QUEST.def_key,
    tier: 'elite',
    title: ELITE_QUEST.title,
    description: ELITE_QUEST.description,
    tracker: ELITE_QUEST.tracker,
    baseline: stats[ELITE_QUEST.tracker],
    goal: ELITE_QUEST.goal,
    reward: scaleReward(ELITE_QUEST.baseReward, 'elite'),
    claimed: false,
    issued_at: now,
  });

  return quests;
}

/** Has a quest roster expired (older than 24h)? */
export function questsExpired(rotatedAt: number, now: number): boolean {
  return now - rotatedAt >= 24 * 60 * 60 * 1000;
}

/** Compute current progress for a quest given live stats. */
export function questProgress(q: Quest, stats: CareerStats): { current: number; goal: number; pct: number; complete: boolean } {
  const current = Math.max(0, stats[q.tracker] - q.baseline);
  const pct = Math.min(100, (current / q.goal) * 100);
  return { current, goal: q.goal, pct, complete: current >= q.goal };
}

// ---------------------------------------------------------------------------
// ACHIEVEMENTS — static roster, unlocked when a career stat crosses threshold.
// ---------------------------------------------------------------------------

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_blood', title: 'First Blood', description: 'Fight your first battle.', icon: 'Swords', tracker: 'total_battles', threshold: 1 },
  { id: 'veteran', title: 'Veteran', description: 'Fight 25 battles.', icon: 'Shield', tracker: 'total_battles', threshold: 25 },
  { id: 'warlord', title: 'Warlord', description: 'Fight 100 battles.', icon: 'Skull', tracker: 'total_battles', threshold: 100 },
  { id: 'first_victory', title: 'First Victory', description: 'Win your first battle.', icon: 'Trophy', tracker: 'total_victories', threshold: 1 },
  { id: 'champion', title: 'Champion', description: 'Win 25 battles.', icon: 'Medal', tracker: 'total_victories', threshold: 25 },
  { id: 'conqueror', title: 'Conqueror', description: 'Win 100 battles.', icon: 'Crown', tracker: 'total_victories', threshold: 100 },
  { id: 'recruiter', title: 'Recruiter', description: 'Recruit 50 troops.', icon: 'Users', tracker: 'total_troops_recruited', threshold: 50 },
  { id: 'general', title: 'General', description: 'Recruit 250 troops.', icon: 'Flag', tracker: 'total_troops_recruited', threshold: 250 },
  { id: 'blacksmith', title: 'Blacksmith', description: 'Forge 25 weapons.', icon: 'Hammer', tracker: 'total_weapons_forged', threshold: 25 },
  { id: 'master_smith', title: 'Master Smith', description: 'Forge 100 weapons.', icon: 'Anvil', tracker: 'total_weapons_forged', threshold: 100 },
  { id: 'builder', title: 'Builder', description: 'Upgrade facilities 25 times.', icon: 'TentTree', tracker: 'total_facility_upgrades', threshold: 25 },
  { id: 'architect', title: 'Architect', description: 'Upgrade facilities 100 times.', icon: 'Castle', tracker: 'total_facility_upgrades', threshold: 100 },
  { id: 'looter', title: 'Looter', description: 'Loot 5,000 gold total.', icon: 'Coins', tracker: 'total_gold_looted', threshold: 5000 },
  { id: 'magnate', title: 'Magnate', description: 'Loot 50,000 gold total.', icon: 'Gem', tracker: 'total_gold_looted', threshold: 50000 },
  { id: 'ad_supporter', title: 'Sponsor\'s Friend', description: 'Watch 10 rewarded ads.', icon: 'Zap', tracker: 'total_ads_watched', threshold: 10 },
  { id: 'refiner', title: 'Refiner', description: 'Produce 1,000 refined materials.', icon: 'Sparkles', tracker: 'total_refined_produced', threshold: 1000 },
];

/** Check for newly-unlocked achievements; returns IDs that crossed threshold. */
export function checkAchievements(stats: CareerStats, alreadyUnlocked: string[]): string[] {
  const newlyUnlocked: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (alreadyUnlocked.includes(a.id)) continue;
    if (stats[a.tracker] >= a.threshold) {
      newlyUnlocked.push(a.id);
    }
  }
  return newlyUnlocked;
}
