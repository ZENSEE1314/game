/**
 * ============================================================
 * 30-DAY PERMANENT CAMPAIGN QUESTS
 * ============================================================
 * A linear 30-day quest line. Each day unlocks a new quest that
 * tracks a career stat milestone. Complete the quest to claim the
 * reward + unlock the next day. Progress persists through rebirth.
 * ============================================================
 */

import type { CampaignQuestDef, CampaignState, GameState } from './types';
import { awardXp } from './engine';

/** Create fresh campaign state. */
export function createInitialCampaign(now: number): CampaignState {
  return {
    current_day: 1,
    completed: [],
    started_at: now,
  };
}

/** All 30 campaign quest definitions. */
export const CAMPAIGN_QUESTS: CampaignQuestDef[] = [
  { day: 1, title: 'First Steps', description: 'Upgrade any facility 1 time.', tracker: 'total_facility_upgrades', goal: 1, reward: { gold: 100, refined_wood: 5, refined_iron: 5, xp: 20 }, icon: '🌱' },
  { day: 2, title: 'Gatherer', description: 'Tap resource nodes 10 times.', tracker: 'total_facility_upgrades', goal: 3, reward: { gold: 150, refined_wood: 8, refined_iron: 5, xp: 25 }, icon: '🪓' },
  { day: 3, title: 'Recruiter', description: 'Recruit 5 troops.', tracker: 'total_troops_recruited', goal: 5, reward: { gold: 200, refined_wood: 10, refined_iron: 8, xp: 30 }, icon: '⚔️' },
  { day: 4, title: 'Blacksmith', description: 'Forge 3 weapons.', tracker: 'total_weapons_forged', goal: 3, reward: { gold: 250, refined_wood: 10, refined_iron: 12, xp: 35 }, icon: '🔨' },
  { day: 5, title: 'First Blood', description: 'Win 1 battle in the Arena.', tracker: 'total_victories', goal: 1, reward: { gold: 300, refined_wood: 15, refined_iron: 10, xp: 40 }, icon: '🏆' },
  { day: 6, title: 'Builder', description: 'Upgrade facilities 5 times total.', tracker: 'total_facility_upgrades', goal: 5, reward: { gold: 350, refined_wood: 20, refined_iron: 15, xp: 45 }, icon: '🏰' },
  { day: 7, title: 'Veteran', description: 'Fight 5 battles.', tracker: 'total_battles', goal: 5, reward: { gold: 500, refined_wood: 25, refined_iron: 20, xp: 60 }, icon: '⚔️' },
  { day: 8, title: 'Cave Explorer', description: 'Win 3 battles.', tracker: 'total_victories', goal: 3, reward: { gold: 400, refined_wood: 20, refined_iron: 15, xp: 50 }, icon: '🕳️' },
  { day: 9, title: 'Arsenal', description: 'Forge 5 weapons total.', tracker: 'total_weapons_forged', goal: 5, reward: { gold: 450, refined_wood: 15, refined_iron: 20, xp: 55 }, icon: '🗡️' },
  { day: 10, title: 'Champion', description: 'Win 5 battles total.', tracker: 'total_victories', goal: 5, reward: { gold: 600, refined_wood: 30, refined_iron: 25, xp: 70 }, icon: '👑' },
  { day: 11, title: 'Looter', description: 'Loot 500 gold total.', tracker: 'total_gold_looted', goal: 500, reward: { gold: 500, refined_wood: 25, refined_iron: 20, xp: 60 }, icon: '💰' },
  { day: 12, title: 'General', description: 'Recruit 20 troops total.', tracker: 'total_troops_recruited', goal: 20, reward: { gold: 550, refined_wood: 30, refined_iron: 25, xp: 65 }, icon: '🛡️' },
  { day: 13, title: 'Architect', description: 'Upgrade facilities 10 times.', tracker: 'total_facility_upgrades', goal: 10, reward: { gold: 650, refined_wood: 35, refined_iron: 30, xp: 75 }, icon: '🏛️' },
  { day: 14, title: 'Warmonger', description: 'Fight 10 battles total.', tracker: 'total_battles', goal: 10, reward: { gold: 700, refined_wood: 35, refined_iron: 30, xp: 80 }, icon: '🔥' },
  { day: 15, title: 'Conqueror', description: 'Win 10 battles total.', tracker: 'total_victories', goal: 10, reward: { gold: 1000, refined_wood: 50, refined_iron: 40, xp: 100 }, icon: '👑' },
  { day: 16, title: 'Master Smith', description: 'Forge 10 weapons total.', tracker: 'total_weapons_forged', goal: 10, reward: { gold: 750, refined_wood: 40, refined_iron: 35, xp: 85 }, icon: '⚒️' },
  { day: 17, title: 'Gold Rush', description: 'Loot 2000 gold total.', tracker: 'total_gold_looted', goal: 2000, reward: { gold: 800, refined_wood: 40, refined_iron: 35, xp: 90 }, icon: '🪙' },
  { day: 18, title: 'Commander', description: 'Recruit 50 troops total.', tracker: 'total_troops_recruited', goal: 50, reward: { gold: 850, refined_wood: 45, refined_iron: 40, xp: 95 }, icon: '🎖️' },
  { day: 19, title: 'Veteran Warrior', description: 'Fight 15 battles total.', tracker: 'total_battles', goal: 15, reward: { gold: 900, refined_wood: 50, refined_iron: 45, xp: 100 }, icon: '⚔️' },
  { day: 20, title: 'War Hero', description: 'Win 15 battles total.', tracker: 'total_victories', goal: 15, reward: { gold: 1200, refined_wood: 60, refined_iron: 50, xp: 120 }, icon: '🏅' },
  { day: 21, title: 'Empire Builder', description: 'Upgrade facilities 20 times.', tracker: 'total_facility_upgrades', goal: 20, reward: { gold: 1000, refined_wood: 55, refined_iron: 50, xp: 110 }, icon: '🏯' },
  { day: 22, title: 'Treasure Hunter', description: 'Loot 5000 gold total.', tracker: 'total_gold_looted', goal: 5000, reward: { gold: 1100, refined_wood: 60, refined_iron: 55, xp: 115 }, icon: '💎' },
  { day: 23, title: 'Legendary Smith', description: 'Forge 15 weapons total.', tracker: 'total_weapons_forged', goal: 15, reward: { gold: 1200, refined_wood: 65, refined_iron: 60, xp: 120 }, icon: '🔪' },
  { day: 24, title: 'Grand General', description: 'Recruit 100 troops total.', tracker: 'total_troops_recruited', goal: 100, reward: { gold: 1300, refined_wood: 70, refined_iron: 65, xp: 125 }, icon: '⚔️' },
  { day: 25, title: 'Battle Master', description: 'Fight 25 battles total.', tracker: 'total_battles', goal: 25, reward: { gold: 1500, refined_wood: 80, refined_iron: 70, xp: 140 }, icon: '🔥' },
  { day: 26, title: 'Champion of the Realm', description: 'Win 25 battles total.', tracker: 'total_victories', goal: 25, reward: { gold: 1800, refined_wood: 100, refined_iron: 80, xp: 160 }, icon: '👑' },
  { day: 27, title: 'Refiner', description: 'Produce 1000 refined materials.', tracker: 'total_refined_produced', goal: 1000, reward: { gold: 1600, refined_wood: 90, refined_iron: 80, xp: 150 }, icon: '⚗️' },
  { day: 28, title: 'Sponsor\'s Friend', description: 'Watch 10 rewarded ads.', tracker: 'total_ads_watched', goal: 10, reward: { gold: 2000, refined_wood: 100, refined_iron: 90, xp: 170 }, icon: '📺' },
  { day: 29, title: 'Warlord', description: 'Fight 50 battles total.', tracker: 'total_battles', goal: 50, reward: { gold: 2500, refined_wood: 120, refined_iron: 100, xp: 200 }, icon: '💀' },
  { day: 30, title: 'Immortal Conqueror', description: 'Win 50 battles total.', tracker: 'total_victories', goal: 50, reward: { gold: 5000, refined_wood: 200, refined_iron: 150, xp: 300 }, icon: '🌟' },
];

/** Get the current day's quest (or null if campaign complete). */
export function getCurrentCampaignQuest(state: GameState): CampaignQuestDef | null {
  const camp = state.campaign;
  if (camp.current_day > 30) return null;
  return CAMPAIGN_QUESTS.find((q) => q.day === camp.current_day) ?? null;
}

/** Get progress for the current campaign quest. */
export function campaignProgress(state: GameState): { current: number; goal: number; pct: number; complete: boolean } | null {
  const quest = getCurrentCampaignQuest(state);
  if (!quest) return null;
  const current = state.stats[quest.tracker] ?? 0;
  // For tracked stats that are cumulative, we need the delta from campaign start.
  // Since stats are lifetime, the goal is the absolute threshold (simpler).
  const pct = Math.min(100, (current / quest.goal) * 100);
  return { current, goal: quest.goal, pct, complete: current >= quest.goal };
}

/** Whether the current campaign quest can be claimed. */
export function canClaimCampaign(state: GameState): boolean {
  const p = campaignProgress(state);
  if (!p) return false;
  return p.complete && !state.campaign.completed.includes(`day_${state.campaign.current_day}`);
}

/** Claim the current campaign quest reward + advance to next day. */
export function claimCampaign(
  state: GameState,
): { state: GameState; ok: boolean; reward: CampaignQuestDef['reward'] | null; quest: CampaignQuestDef | null } {
  if (!canClaimCampaign(state)) {
    return { state, ok: false, reward: null, quest: null };
  }
  const quest = getCurrentCampaignQuest(state)!;
  const next = structuredClone(state);
  next.campaign.completed.push(`day_${next.campaign.current_day}`);
  next.campaign.current_day += 1;
  // Apply reward.
  next.player.gold += quest.reward.gold;
  next.resources.wood.refined_amount += quest.reward.refined_wood;
  next.resources.iron.refined_amount += quest.reward.refined_iron;
  // XP
  const awarded = awardXp(next, quest.reward.xp);
  // awardXp returns a new state; copy over.
  next.player = awarded.player;
  return { state: next, ok: true, reward: quest.reward, quest };
}

/** Total campaign completion (0-30). */
export function campaignCompletedCount(state: GameState): number {
  return state.campaign.completed.length;
}
