"use client";

/**
 * EventBanner — prominent banner shown when a limited-time event is active.
 *
 * Sits between the ResourceBar and the tab content. Displays the event
 * avatar, title, description, buff multiplier chip, and a live countdown
 * with a depleting progress bar. Animates in via Framer Motion.
 *
 * Renders nothing when no event is active.
 */

import { useGameStore } from "@/lib/game/store";
import { eventRemainingLabel } from "@/lib/game/events";
import type { GameEvent } from "@/lib/game/types";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Clock, Sparkles, Coins, TreePine, FlaskConical, Swords, ScrollText } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import * as React from "react";

/** Map buff_type → (icon, chip tone classes, label). */
function buffMeta(buffType: GameEvent["buff_type"]): {
  icon: React.ReactNode;
  chipClass: string;
  label: string;
} {
  switch (buffType) {
    case "gold":
      return {
        icon: <Coins className="size-3.5" />,
        chipClass: "border-amber-600/50 bg-amber-950/60 text-amber-200",
        label: "Gold",
      };
    case "raw":
      return {
        icon: <TreePine className="size-3.5" />,
        chipClass: "border-emerald-600/50 bg-emerald-950/60 text-emerald-200",
        label: "Raw Materials",
      };
    case "refined":
      return {
        icon: <FlaskConical className="size-3.5" />,
        chipClass: "border-emerald-600/50 bg-emerald-950/60 text-emerald-200",
        label: "Refining",
      };
    case "pvp_loot":
      return {
        icon: <Swords className="size-3.5" />,
        chipClass: "border-rose-600/50 bg-rose-950/60 text-rose-200",
        label: "PvP Loot",
      };
    case "xp":
      return {
        icon: <ScrollText className="size-3.5" />,
        chipClass: "border-amber-600/50 bg-amber-950/60 text-amber-200",
        label: "XP",
      };
  }
}

/** Estimate the event's total duration from its def (for the progress bar). */
function estimatedDurationMs(buffType: GameEvent["buff_type"]): number {
  // Match EVENT_POOL durations in events.ts.
  if (buffType === "pvp_loot") return 1 * 60 * 60 * 1000;
  if (buffType === "xp") return 3 * 60 * 60 * 1000;
  return 2 * 60 * 60 * 1000; // gold, raw, refined = 2h default
}

export function EventBanner() {
  const activeEvent = useGameStore((s) => s.state.active_event);

  return (
    <AnimatePresence>
      {activeEvent && <BannerContent key={activeEvent.def_key} event={activeEvent} />}
    </AnimatePresence>
  );
}

function BannerContent({ event }: { event: GameEvent }) {
  // Re-render every second so the countdown + progress bar update live.
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const id = setInterval(force, 1000);
    return () => clearInterval(id);
  }, []);

  const state = useGameStore((s) => s.state);
  const remainingLabel = eventRemainingLabel(state);
  const meta = buffMeta(event.buff_type);

  const now = Date.now();
  const totalMs = estimatedDurationMs(event.buff_type);
  const elapsed = Math.max(0, totalMs - (event.ends_at - now));
  const pct = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, y: -12, height: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="overflow-hidden"
    >
      <Card
        className={cn(
          "relative mx-auto w-full max-w-6xl gap-0 overflow-hidden border-amber-600/40 bg-gradient-to-r from-amber-950/50 via-stone-900/60 to-amber-950/40 p-3 shadow-lg shadow-amber-900/30",
        )}
      >
        {/* Pulsing glow border accent */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-lg ring-1 ring-amber-500/30"
          animate={{ opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative flex items-center gap-3">
          {/* Avatar */}
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-stone-950/60 text-3xl shadow-inner">
            {event.avatar}
          </div>

          {/* Title + description */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-3.5 shrink-0 text-amber-400" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300/80">
                Limited-Time Event
              </span>
            </div>
            <h3 className="truncate text-sm font-bold text-amber-100">
              {event.title}
            </h3>
            <p className="hidden truncate text-[11px] text-stone-300 sm:block">
              {event.description}
            </p>
          </div>

          {/* Buff multiplier chip */}
          <div
            className={cn(
              "flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold tabular-nums",
              meta.chipClass,
            )}
          >
            {meta.icon}
            <span>
              {event.multiplier}× {meta.label}
            </span>
          </div>

          {/* Countdown */}
          <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
            <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-200">
              <Clock className="size-3.5" />
              <span className="font-mono tabular-nums">{remainingLabel}</span>
            </div>
            <div className="h-1.5 w-24 overflow-hidden rounded-full bg-stone-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500"
                style={{ width: `${100 - pct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Mobile countdown row (visible only on small screens) */}
        <div className="mt-2 flex items-center justify-between gap-2 sm:hidden">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-amber-200">
            <Clock className="size-3.5" />
            <span className="font-mono tabular-nums">{remainingLabel}</span>
          </div>
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-rose-500"
              style={{ width: `${100 - pct}%` }}
            />
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
