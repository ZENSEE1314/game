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
import { createInitialState, generateOpponents } from './initial-state';
import { applyProductionTick, calculate_offline_earnings, refreshShield } from './engine';
import { applyOfflineEarnings } from './engine';
import {
  doUpgradeFacility,
  doRecruitTroops,
  doForgeWeapon,
  doUpgradeWeaponTier,
  doAttack,
  doOfflineDoubleAd,
  doPeaceShieldAd,
  doConscriptionAd,
} from './actions';

interface PendingOffline {
  earnings: OfflineEarnings;
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

  // --- Misc -------------------------------------------------------------
  refreshOpponents: () => Promise<void>;
  resetGame: () => void;
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

      // -----------------------------------------------------------------
      // Real-time production tick. Called every TICK_MS by useGameLoop.
      // -----------------------------------------------------------------
      tick: () => {
        set((s) => {
          let next = applyProductionTick(s.state, 1);
          next = refreshShield(next);
          return { state: next };
        });
      },

      // -----------------------------------------------------------------
      // On load: compute offline earnings since last_saved_at and stage
      // them as "pending" (player must claim, optionally 2x via ad).
      // -----------------------------------------------------------------
      reconcileOnLoad: () => {
        set((s) => {
          const now = Date.now();
          const deltaSec = Math.max(0, (now - s.state.last_saved_at) / 1000);
          if (deltaSec < 30) {
            return { state: refreshShield(s.state), pendingOffline: null, offlineAdUsed: false };
          }
          const earnings = calculate_offline_earnings(s.state, deltaSec);
          if (earnings.seconds_elapsed === 0) {
            return { state: refreshShield(s.state), pendingOffline: null, offlineAdUsed: false };
          }
          return {
            state: refreshShield(s.state),
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
        if (result.success) set({ state: result.state });
        return result.success;
      },

      // -----------------------------------------------------------------
      // BARRACKS — recruit troops.
      // -----------------------------------------------------------------
      recruitTroops: (count) => {
        const s = get();
        const result = doRecruitTroops(s.state, count);
        if (result.success) set({ state: result.state });
        return result.success;
      },

      // -----------------------------------------------------------------
      // FORGE — forge a new weapon.
      // -----------------------------------------------------------------
      forgeWeapon: () => {
        const s = get();
        const result = doForgeWeapon(s.state);
        if (result.success) set({ state: result.state });
        return result.success;
      },

      // -----------------------------------------------------------------
      // FORGE — upgrade weapon tier.
      // -----------------------------------------------------------------
      upgradeWeaponTier: () => {
        const s = get();
        const result = doUpgradeWeaponTier(s.state);
        if (result.success) set({ state: result.state });
        return result.success;
      },

      // -----------------------------------------------------------------
      // ARENA — attack an opponent.
      // -----------------------------------------------------------------
      attackOpponent: (opponentId) => {
        const s = get();
        const result = doAttack(s.state, opponentId, s.opponents);
        if (!result.success) {
          return { success: false, reason: result.reason };
        }
        set({
          state: result.state,
          opponents: result.opponents ?? s.opponents,
          lastBattle: {
            result: result.result!,
            opponent: result.opponent!,
            troopsLost: result.result!.attacker_casualties.troops_lost,
          },
          conscriptionAdUsed: false,
        });
        return { success: true };
      },

      // -----------------------------------------------------------------
      // AD HOOKS
      // -----------------------------------------------------------------
      claimOfflineEarnings: (useDoubleAd) => {
        const s = get();
        if (!s.pendingOffline) return;
        let earnings = s.pendingOffline.earnings;
        if (useDoubleAd && !s.offlineAdUsed) {
          earnings = doOfflineDoubleAd(earnings);
          set({ offlineAdUsed: true });
        }
        const next = applyOfflineEarnings(s.state, earnings);
        set({ state: next, pendingOffline: null });
      },

      activatePeaceShield: () => {
        const s = get();
        const next = doPeaceShieldAd(s.state);
        set({ state: next });
      },

      conscriptTroops: () => {
        const s = get();
        if (!s.lastBattle || s.conscriptionAdUsed || s.lastBattle.troopsLost <= 0) return;
        const next = doConscriptionAd(s.state, s.lastBattle.troopsLost);
        set({ state: next, conscriptionAdUsed: true });
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
        set({
          state: createInitialState(),
          opponents: generateOpponents(1),
          pendingOffline: null,
          lastBattle: null,
          offlineAdUsed: false,
          conscriptionAdUsed: false,
          busy: false,
        });
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
    },
  ),
);
