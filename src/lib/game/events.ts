/**
 * ============================================================
 * LIMITED-TIME EVENTS
 * ============================================================
 * Rotating temporary buffs that encourage return visits. One event
 * is active at a time; it expires after a few hours and a new one
 * may appear. Events multiply a specific production system.
 * ============================================================
 */

import type { GameEvent, GameState } from './types';

/** Event-definition templates (static pool). */
interface EventDef {
  def_key: string;
  title: string;
  description: string;
  avatar: string;
  buff_type: GameEvent['buff_type'];
  multiplier: number;
  /** Duration in ms. */
  duration_ms: number;
}

/** The pool of possible events. */
export const EVENT_POOL: EventDef[] = [
  {
    def_key: 'golden_rush',
    title: 'Golden Rush',
    description: 'A gold vein has been struck! Passive gold generation is doubled.',
    avatar: '💰',
    buff_type: 'gold',
    multiplier: 2,
    duration_ms: 2 * 60 * 60 * 1000, // 2 hours
  },
  {
    def_key: 'timber_festival',
    title: 'Timber Festival',
    description: 'The forests are rich! Raw material gathering is boosted 1.5×.',
    avatar: '🌲',
    buff_type: 'raw',
    multiplier: 1.5,
    duration_ms: 2 * 60 * 60 * 1000,
  },
  {
    def_key: 'refining_frenzy',
    title: 'Refining Frenzy',
    description: 'The forges burn hot! Refined material production is doubled.',
    avatar: '🔥',
    buff_type: 'refined',
    multiplier: 2,
    duration_ms: 2 * 60 * 60 * 1000,
  },
  {
    def_key: 'blood_feud',
    title: 'Blood Feud',
    description: 'The arena calls! PvP loot is boosted 2× for the duration.',
    avatar: '⚔️',
    buff_type: 'pvp_loot',
    multiplier: 2,
    duration_ms: 1 * 60 * 60 * 1000, // 1 hour
  },
  {
    def_key: 'scholars_week',
    title: "Scholar's Week",
    description: 'Wisdom flows! All XP gains are boosted 1.5×.',
    avatar: '📜',
    buff_type: 'xp',
    multiplier: 1.5,
    duration_ms: 3 * 60 * 60 * 1000, // 3 hours
  },
  {
    def_key: 'kings_bounty',
    title: "King's Bounty",
    description: 'Royal coffers overflow! Gold generation is tripled.',
    avatar: '👑',
    buff_type: 'gold',
    multiplier: 3,
    duration_ms: 1 * 60 * 60 * 1000, // 1 hour (powerful but short)
  },
];

/**
 * Roll a random event from the pool, avoiding the currently-active
 * one (if any). Returns a fully-formed GameEvent with ends_at set.
 */
export function rollEvent(state: GameState, now: number): GameEvent {
  const pool = state.active_event
    ? EVENT_POOL.filter((e) => e.def_key !== state.active_event!.def_key)
    : EVENT_POOL;
  const def = pool[Math.floor(Math.random() * pool.length)];
  return {
    def_key: def.def_key,
    title: def.title,
    description: def.description,
    avatar: def.avatar,
    buff_type: def.buff_type,
    multiplier: def.multiplier,
    ends_at: now + def.duration_ms,
  };
}

/**
 * Chance per reconcile tick that a new event spawns when none is active.
 * ~25% chance so events feel like a pleasant surprise, not constant.
 */
const EVENT_SPAWN_CHANCE = 0.25;

/**
 * Reconcile the active event on load / tick:
 *   - If the current event has expired, clear it.
 *   - If no event is active, there's a small chance to spawn one.
 *
 * Returns the (possibly updated) state. Called by reconcileOnLoad
 * and periodically by the tick loop.
 */
export function reconcileEvent(state: GameState, now: number, forceSpawn = false): GameState {
  // Clear expired event.
  if (state.active_event && state.active_event.ends_at <= now) {
    state = { ...state, active_event: null };
  }

  // Maybe spawn a new event if none active.
  if (!state.active_event && (forceSpawn || Math.random() < EVENT_SPAWN_CHANCE)) {
    state = { ...state, active_event: rollEvent(state, now) };
  }

  return state;
}

/**
 * Get the effective multiplier for a buff type, combining the active
 * event (if any) with a base multiplier. Returns the base if no event.
 */
export function eventMultiplier(state: GameState, buffType: GameEvent['buff_type']): number {
  if (state.active_event && state.active_event.buff_type === buffType && state.active_event.ends_at > Date.now()) {
    return state.active_event.multiplier;
  }
  return 1;
}

/** Human-readable countdown for the active event, e.g. "1h 23m". */
export function eventRemainingLabel(state: GameState): string {
  if (!state.active_event) return 'None';
  const ms = Math.max(0, state.active_event.ends_at - Date.now());
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
