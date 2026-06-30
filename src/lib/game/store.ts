/**
 * ============================================================
 * ZUSTAND GAME STORE
 * ============================================================
 * Single source of truth for the client. Persists to localStorage
 * so a refresh/return triggers offline-earnings reconciliation.
 *
 * Architecture:
 *   - Real-time tick + offline reconcile: LOCAL (must be local for
 *     idle-game responsiveness; uses engine.ts).
 *   - Discrete player actions: LOCAL via the pure actions.ts module
 *     (instant UX). The same actions.ts is also wrapped by API routes
 *     for a server-authoritative path; `refreshOpponents` demonstrates
 *     a live API call.
 * ============================================================
 */

'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { GameState, Opponent, BattleResult, OfflineEarnings } from './types';
import { createInitialState, generateOpponents, syncDerived } from './initial-state';
import { applyProductionTick, calculate_offline_earnings, refreshShield } from './engine';
import { applyOfflineEarnings } from './engine';
import { weaponMultiplierForTier } from './constants';
import {
  doUpgradeFacility,
  doRecruitTroops,
  doForgeWeapon,
  doUpgradeWeaponTier,
  doAttack,
  doOfflineDoubleAd,
  doPeaceShieldAd,
  doConscriptionAd,
  doClaimQuest,
  doRecordOfflineReturn,
} from './actions';
import { rollDailyQuests, questsExpired, checkAchievements } from './quests';
import { performRebirth, allocatePerk, previewPrestigeGain, canRebirth, applyWarmongerPerk } from './prestige';
import { reconcileEvent } from './events';
import { playSound } from './sound';
import {
  reconcileStamina,
  consumeStamina,
  refillStamina,
  tapNode,
  upgradeTool,
} from './stamina-tap';
import {
  reconcileCave,
  performCaveHunt,
  sellItem,
} from './cave-market';

interface PendingOffline {
  earnings: OfflineEarnings;
}

/**
 * postMutate — call after ANY discrete player action mutates the state.
 * Checks for:
 *   - newly-unlocked achievements (stat crossed threshold)
 *   - newly-completed quests (tracker delta reached goal, not yet claimed)
 * Returns the (possibly updated) state + lists of newly-unlocked IDs
 * for the UI to surface as toasts.
 */
function postMutate(state: GameState): {
  state: GameState;
  unlocked: string[];
  completedQuests: string[];
} {
  let next = state;
  const unlocked: string[] = [];

  // --- Achievements ---
  const newAch = checkAchievements(next.stats, next.achievements_unlocked);
  if (newAch.length > 0) {
    next = { ...next, achievements_unlocked: [...next.achievements_unlocked, ...newAch] };
    unlocked.push(...newAch);
  }

  // --- Quest completion detection (for toast; not claiming yet) ---
  const completedQuests: string[] = [];
  for (const q of next.quests) {
    if (q.claimed) continue;
    const progress = Math.max(0, next.stats[q.tracker] - q.baseline);
    if (progress >= q.goal) {
      completedQuests.push(q.id);
    }
  }

  return { state: next, unlocked, completedQuests };
}

export interface GameStore {
  state: GameState;
  opponents: Opponent[];
  /** Set on load if offline earnings were accrued; cleared on claim. */
  pendingOffline: PendingOffline | null;
  /** Last battle result (for the battle report modal + conscription ad). */
  lastBattle: { result: BattleResult; opponent: Opponent; troopsLost: number } | null;
  /** Tracks whether the offline 2x ad has already been consumed. */
  offlineAdUsed: boolean;
  /** Tracks whether the conscription ad has been consumed for lastBattle. */
  conscriptionAdUsed: boolean;
  /** Loading flag for async actions. */
  busy: boolean;
  /** Achievement IDs unlocked in the most recent mutation (for toasts). */
  newlyUnlocked: string[];
  /** Quest IDs completed in the most recent mutation (for toasts). */
  newlyCompletedQuests: string[];

  // --- Tick & lifecycle -------------------------------------------------
  tick: () => void;
  reconcileOnLoad: () => void;

  // --- Base Camp actions ------------------------------------------------
  upgradeFacility: (key: keyof GameState['facilities']) => boolean;

  // --- Barracks/Forge actions -------------------------------------------
  recruitTroops: (count: number) => boolean;
  forgeWeapon: () => boolean;
  upgradeWeaponTier: () => boolean;

  // --- Arena actions ----------------------------------------------------
  attackOpponent: (opponentId: string) => { success: boolean; reason?: string };

  // --- Ad hooks ---------------------------------------------------------
  claimOfflineEarnings: (useDoubleAd: boolean) => void;
  activatePeaceShield: () => void;
  conscriptTroops: () => void;

  // --- Quests -----------------------------------------------------------
  claimQuest: (questId: string) => boolean;

  // --- Prestige / Rebirth -----------------------------------------------
  rebirth: () => { success: boolean; pointsGained?: number; reason?: string };
  allocatePrestigePerk: (perkId: string) => boolean;

  // --- Arena Stamina + Tap Nodes + Cave + Market ------------------------
  refillStaminaAd: () => void;
  tapResourceNode: (node: 'tree' | 'mine' | 'farm') => boolean;
  upgradeToolLevel: (tool: 'axe' | 'pickaxe' | 'sickle') => boolean;
  huntCave: (caveId: string) => { success: boolean; reason?: string };
  sellInventoryItem: (itemId: string, quantity: number) => boolean;

  // --- Misc -------------------------------------------------------------
  refreshOpponents: () => Promise<void>;
  resetGame: () => void;
  clearNotifications: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      state: createInitialState(),
      opponents: generateOpponents(1),
      pendingOffline: null,
      lastBattle: null,
      offlineAdUsed: false,
      conscriptionAdUsed: false,
      busy: false,
      newlyUnlocked: [],
      newlyCompletedQuests: [],

      // Helper: after any state mutation, check for newly-unlocked
      // achievements and newly-completed quests, stamp them onto the
      // state, and surface their IDs for UI toasts.
      // (Defined as a closure so it can call set/get.)
      // NOTE: called inline below via the exported function.

      // -----------------------------------------------------------------
      // Real-time production tick. Called every TICK_MS by useGameLoop.
      // -----------------------------------------------------------------
      tick: () => {
        set((s) => {
          let next = applyProductionTick(s.state, 1);
          next = refreshShield(next);
          // Reconcile events (expiry check + small spawn chance) ~once/sec.
          next = reconcileEvent(next, Date.now());
          // Reconcile arena stamina regeneration.
          next = reconcileStamina(next, Date.now());
          // Reconcile cave daily entry reset.
          next = reconcileCave(next, Date.now());
          return { state: next };
        });
      },

      // -----------------------------------------------------------------
      // On load: rotate daily quests if expired, then compute offline
      // earnings since last_saved_at and stage them as "pending".
      // -----------------------------------------------------------------
      reconcileOnLoad: () => {
        set((s) => {
          const now = Date.now();
          let state = s.state;

          // Rotate quests if it's been >24h (or never rotated).
          if (state.quests.length === 0 || questsExpired(state.quests_rotated_at, now)) {
            state = {
              ...state,
              quests: rollDailyQuests(state.stats, now),
              quests_rotated_at: now,
            };
          }

          // Reconcile events: clear expired, force-spawn one if none active
          // so the player always has something engaging on return.
          state = reconcileEvent(state, now, true);

          // Re-sync derived stats so prestige perks (fortified vault cap,
          // quartermaster troop cap) apply immediately on load.
          state = syncDerived(state);

          // Re-apply warmonger perk to weapon multipliers (in case the
          // player invested points in a previous session).
          state.gear.weapon_multipliers = applyWarmongerPerk(
            state,
            weaponMultiplierForTier(state.gear.weapon_tier_level),
          );

          const deltaSec = Math.max(0, (now - state.last_saved_at) / 1000);
          if (deltaSec < 30) {
            return { state: refreshShield(state), pendingOffline: null, offlineAdUsed: false };
          }
          const earnings = calculate_offline_earnings(state, deltaSec);
          if (earnings.seconds_elapsed === 0) {
            return { state: refreshShield(state), pendingOffline: null, offlineAdUsed: false };
          }
          return {
            state: refreshShield(state),
            pendingOffline: { earnings },
            offlineAdUsed: false,
          };
        });
      },

      // -----------------------------------------------------------------
      // BASE CAMP — facility upgrades.
      // -----------------------------------------------------------------
      upgradeFacility: (key) => {
        const s = get();
        const result = doUpgradeFacility(s.state, key);
        if (result.success) {
          const { state, unlocked, completedQuests } = postMutate(result.state);
          set({ state, newlyUnlocked: unlocked, newlyCompletedQuests: completedQuests });
          playSound('upgrade');
        } else {
          playSound('error');
        }
        return result.success;
      },

      // -----------------------------------------------------------------
      // BARRACKS — recruit troops.
      // -----------------------------------------------------------------
      recruitTroops: (count) => {
        const s = get();
        const result = doRecruitTroops(s.state, count);
        if (result.success) {
          const { state, unlocked, completedQuests } = postMutate(result.state);
          set({ state, newlyUnlocked: unlocked, newlyCompletedQuests: completedQuests });
          playSound('recruit');
        } else {
          playSound('error');
        }
        return result.success;
      },

      // -----------------------------------------------------------------
      // FORGE — forge a new weapon.
      // -----------------------------------------------------------------
      forgeWeapon: () => {
        const s = get();
        const result = doForgeWeapon(s.state);
        if (result.success) {
          const { state, unlocked, completedQuests } = postMutate(result.state);
          set({ state, newlyUnlocked: unlocked, newlyCompletedQuests: completedQuests });
          playSound('forge');
        } else {
          playSound('error');
        }
        return result.success;
      },

      // -----------------------------------------------------------------
      // FORGE — upgrade weapon tier.
      // -----------------------------------------------------------------
      upgradeWeaponTier: () => {
        const s = get();
        const result = doUpgradeWeaponTier(s.state);
        if (result.success) {
          const { state, unlocked, completedQuests } = postMutate(result.state);
          set({ state, newlyUnlocked: unlocked, newlyCompletedQuests: completedQuests });
          playSound('upgrade');
        } else {
          playSound('error');
        }
        return result.success;
      },

      // -----------------------------------------------------------------
      // ARENA — attack an opponent.
      // -----------------------------------------------------------------
      attackOpponent: (opponentId) => {
        const s = get();
        // Check stamina first.
        const staminaCheck = consumeStamina(s.state);
        if (!staminaCheck.ok) {
          playSound('error');
          return { success: false, reason: 'No arena stamina left! Wait for it to regenerate or watch an ad.' };
        }
        const result = doAttack(staminaCheck.state, opponentId, s.opponents);
        if (!result.success) {
          playSound('error');
          return { success: false, reason: result.reason };
        }
        const { state, unlocked, completedQuests } = postMutate(result.state);
        set({
          state,
          opponents: result.opponents ?? s.opponents,
          lastBattle: {
            result: result.result!,
            opponent: result.opponent!,
            troopsLost: result.result!.attacker_casualties.troops_lost,
          },
          conscriptionAdUsed: false,
          newlyUnlocked: unlocked,
          newlyCompletedQuests: completedQuests,
        });
        playSound('attack');
        setTimeout(() => playSound(result.result!.attacker_won ? 'victory' : 'defeat'), 200);
        if (result.result!.attacker_won && result.result!.loot.gold > 0) {
          setTimeout(() => playSound('loot'), 500);
        }
        return { success: true };
      },

      // -----------------------------------------------------------------
      // AD HOOKS
      // -----------------------------------------------------------------
      claimOfflineEarnings: (useDoubleAd) => {
        const s = get();
        if (!s.pendingOffline) return;
        let earnings = s.pendingOffline.earnings;
        let adUsed = false;
        if (useDoubleAd && !s.offlineAdUsed) {
          earnings = doOfflineDoubleAd(earnings);
          adUsed = true;
        }
        let next = applyOfflineEarnings(s.state, earnings);
        // Record offline-return stats.
        const refinedProduced =
          earnings.refined_wood_gained + earnings.refined_stone_gained + earnings.refined_iron_gained;
        next = doRecordOfflineReturn(next, earnings.seconds_elapsed, refinedProduced);
        if (adUsed) {
          next.stats.total_ads_watched += 1;
        }
        const { state, unlocked, completedQuests } = postMutate(next);
        set({
          state,
          pendingOffline: null,
          offlineAdUsed: s.offlineAdUsed || adUsed,
          newlyUnlocked: unlocked,
          newlyCompletedQuests: completedQuests,
        });
        playSound(adUsed ? 'ad' : 'loot');
      },

      activatePeaceShield: () => {
        const s = get();
        const next = doPeaceShieldAd(s.state);
        const { state, unlocked, completedQuests } = postMutate(next);
        set({ state, newlyUnlocked: unlocked, newlyCompletedQuests: completedQuests });
        playSound('shield');
      },

      conscriptTroops: () => {
        const s = get();
        if (!s.lastBattle || s.conscriptionAdUsed || s.lastBattle.troopsLost <= 0) return;
        const next = doConscriptionAd(s.state, s.lastBattle.troopsLost);
        const { state, unlocked, completedQuests } = postMutate(next);
        set({
          state,
          conscriptionAdUsed: true,
          newlyUnlocked: unlocked,
          newlyCompletedQuests: completedQuests,
        });
        playSound('recruit');
      },

      // -----------------------------------------------------------------
      // QUESTS — claim a completed quest's reward.
      // -----------------------------------------------------------------
      claimQuest: (questId) => {
        const s = get();
        const result = doClaimQuest(s.state, questId);
        if (result.success) {
          const { state, unlocked, completedQuests } = postMutate(result.state);
          set({ state, newlyUnlocked: unlocked, newlyCompletedQuests: completedQuests });
          playSound('quest');
        } else {
          playSound('error');
        }
        return result.success;
      },

      // -----------------------------------------------------------------
      // PRESTIGE / REBIRTH
      // -----------------------------------------------------------------
      rebirth: () => {
        const s = get();
        if (!canRebirth(s.state)) {
          playSound('error');
          return { success: false, reason: 'Not enough gold earned this run' };
        }
        const pointsGained = previewPrestigeGain(s.state.prestige.current_run_gold);
        const result = performRebirth(s.state);
        if (!result.success) {
          return { success: false, reason: result.reason };
        }
        // Re-roll quests for the new run + post-mutate for achievements.
        const { state, unlocked, completedQuests } = postMutate(result.state);
        set({
          state,
          opponents: generateOpponents(state.player.level),
          pendingOffline: null,
          lastBattle: null,
          offlineAdUsed: false,
          conscriptionAdUsed: false,
          newlyUnlocked: unlocked,
          newlyCompletedQuests: completedQuests,
        });
        return { success: true, pointsGained };
      },

      allocatePrestigePerk: (perkId) => {
        const s = get();
        const result = allocatePerk(s.state, perkId);
        if (result.success) {
          // Re-sync derived stats so vault/troop-cap multipliers apply,
          // and re-apply warmonger to weapon multipliers if that perk
          // was invested.
          let next: GameState = { ...s.state, prestige: result.prestige };
          next = syncDerived(next);
          if (perkId === 'warmonger') {
            next.gear.weapon_multipliers = applyWarmongerPerk(
              next,
              weaponMultiplierForTier(next.gear.weapon_tier_level),
            );
          }
          set({ state: next });
        }
        return result.success;
      },

      // -----------------------------------------------------------------
      // ARENA STAMINA + TAP NODES + CAVE + MARKET
      // -----------------------------------------------------------------
      refillStaminaAd: () => {
        const s = get();
        const next = refillStamina(s.state);
        next.stats.total_ads_watched += 1;
        set({ state: next });
        playSound('ad');
      },

      tapResourceNode: (node) => {
        const s = get();
        const result = tapNode(s.state, node, Date.now());
        if (result.ok) {
          set({ state: result.state });
          playSound('loot');
        }
        return result.ok;
      },

      upgradeToolLevel: (tool) => {
        const s = get();
        const result = upgradeTool(s.state, tool);
        if (result.success) {
          set({ state: result.state });
          playSound('upgrade');
        } else {
          playSound('error');
        }
        return result.success;
      },

      huntCave: (caveId) => {
        const s = get();
        const result = performCaveHunt(s.state, caveId, Date.now());
        if (!result.ok) {
          playSound('error');
          return { success: false, reason: result.reason };
        }
        set({ state: result.state });
        playSound(result.result.success ? 'loot' : 'error');
        return { success: true };
      },

      sellInventoryItem: (itemId, quantity) => {
        const s = get();
        const result = sellItem(s.state, itemId, quantity);
        if (result.ok) {
          set({ state: result.state });
          playSound('loot');
        } else {
          playSound('error');
        }
        return result.ok;
      },

      // -----------------------------------------------------------------
      // MISC
      // -----------------------------------------------------------------
      refreshOpponents: async () => {
        set({ busy: true });
        try {
          const level = get().state.player.level;
          // Live API call — demonstrates the server-authoritative path.
          const res = await fetch(`/api/opponents?level=${level}`);
          if (res.ok) {
            const data = await res.json();
            if (data.opponents?.length) {
              set({ opponents: data.opponents });
              return;
            }
          }
        } catch {
          // fall through to local generation
        }
        // Fallback: local generation (keeps the game working offline).
        set({ opponents: generateOpponents(get().state.player.level) });
      },

      resetGame: () => {
        const fresh = createInitialState();
        // Roll a fresh quest set for the new campaign.
        fresh.quests = rollDailyQuests(fresh.stats, Date.now());
        fresh.quests_rotated_at = Date.now();
        set({
          state: fresh,
          opponents: generateOpponents(1),
          pendingOffline: null,
          lastBattle: null,
          offlineAdUsed: false,
          conscriptionAdUsed: false,
          busy: false,
          newlyUnlocked: [],
          newlyCompletedQuests: [],
        });
      },

      clearNotifications: () => {
        set({ newlyUnlocked: [], newlyCompletedQuests: [] });
      },
    }),
    {
      name: 'idle-war-state-v1',
      storage: createJSONStorage(() => localStorage),
      // Skip auto-hydration: during SSR, localStorage is unavailable and
      // Zustand would silently no-op hydration (marking hasHydrated=true
      // without actually loading persisted state). We manually rehydrate
      // on the client in useGameLoop, then reconcile offline earnings.
      skipHydration: true,
      partialize: (s) => ({
        state: s.state,
        opponents: s.opponents,
      }),
      // Merge persisted state with current defaults so NEW fields added in
      // later versions (e.g. stats, quests, achievements_unlocked) are
      // backfilled onto old saves instead of being undefined.
      merge: (persisted, current) => {
        const p = (persisted as Partial<GameStore>) ?? {};
        const currentState = (p.state && typeof p.state === 'object') ? p.state : current.state;
        // Deep-merge: ensure all new GameState sub-fields exist.
        const mergedState: GameState = {
          ...current.state,
          ...currentState,
          // Guarantee nested new fields are present.
          stats: currentState.stats ?? current.state.stats,
          quests: currentState.quests ?? current.state.quests,
          quests_rotated_at: currentState.quests_rotated_at ?? current.state.quests_rotated_at,
          achievements_unlocked: currentState.achievements_unlocked ?? current.state.achievements_unlocked,
          battle_history: currentState.battle_history ?? current.state.battle_history,
          prestige: currentState.prestige ?? current.state.prestige,
          active_event: currentState.active_event ?? current.state.active_event,
          arena_stamina: currentState.arena_stamina ?? current.state.arena_stamina,
          tap_nodes: currentState.tap_nodes ?? current.state.tap_nodes,
          cave: currentState.cave ?? current.state.cave,
          inventory: currentState.inventory ?? current.state.inventory,
          resources: { ...current.state.resources, ...(currentState.resources ?? {}) },
          player: { ...current.state.player, ...(currentState.player ?? {}) },
          army: { ...current.state.army, ...(currentState.army ?? {}) },
          gear: { ...current.state.gear, ...(currentState.gear ?? {}) },
          facilities: { ...current.state.facilities, ...(currentState.facilities ?? {}) },
        };
        return {
          ...current,
          state: mergedState,
          opponents: p.opponents ?? current.opponents,
        };
      },
    },
  ),
);
