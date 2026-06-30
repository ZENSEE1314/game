/**
 * useGameLoop — drives the real-time production tick.
 *
 * Because the store uses `skipHydration: true` (to avoid the Zustand
 * persist SSR no-op hydration issue), we manually call `rehydrate()`
 * on the client first. ONLY after the persisted state is loaded do we
 * run the offline-earnings reconciliation (so it reads the real
 * last_saved_at) and start the tick interval (so it can't overwrite
 * last_saved_at before reconciliation).
 */

'use client';

import { useEffect } from 'react';
import { useGameStore } from '@/lib/game/store';
import { TICK_MS } from '@/lib/game/constants';

export function useGameLoop() {
  const tick = useGameStore((s) => s.tick);
  const reconcileOnLoad = useGameStore((s) => s.reconcileOnLoad);

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    // Rehydrate from localStorage -> reconcile offline earnings -> start tick.
    const bootstrap = async () => {
      // rehydrate() returns a Promise that resolves with the store state
      // AFTER the persisted value has been merged in.
      await useGameStore.persist.rehydrate();
      if (cancelled) return;
      reconcileOnLoad();
      intervalId = setInterval(() => {
        tick();
      }, TICK_MS);
    };

    bootstrap();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [tick, reconcileOnLoad]);

  // Persist on tab hide so last_saved_at is fresh for offline calc.
  useEffect(() => {
    const onHide = () => {
      tick();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onHide();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onHide);
    };
  }, [tick]);
}
