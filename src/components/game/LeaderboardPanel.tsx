"use client";

/**
 * LeaderboardPanel — the Leaderboard tab.
 *
 * Renders the player's competitive standing against 20 generated NPCs.
 *
 * Layout:
 *   - Section header "Leaderboard" with a subtitle explaining the power
 *     score formula: victories×50 + gold÷10 + level×10 + rebirths×500.
 *   - "Your Rank" highlight card: rank, power_score, and the gap to the
 *     next rank above ("X power to overtake #N"). Uses
 *     `playerLeaderboardContext(entries)`.
 *   - Scrollable leaderboard list: each row shows rank (with medal styling
 *     for top 3), avatar emoji, name + level, "★ Rebirthed" badge for
 *     rebirthed NPCs, compact victories/battles/gold_looted stats, and a
 *     big right-aligned power score. The player's row is highlighted with
 *     an amber border + "YOU" badge.
 *
 * Data is fully derived from `generateLeaderboard(state)` — recomputed
 * live as the player's stats change.
 */

import * as React from "react";
import { useGameStore } from "@/lib/game/store";
import { formatNumber } from "@/lib/game/constants";
import {
  generateLeaderboard,
  playerLeaderboardContext,
} from "@/lib/game/leaderboard";
import type { LeaderboardEntry } from "@/lib/game/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Medal,
  Crown,
  Swords,
  Coins,
  Star,
  TrendingUp,
  ChevronUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Medal styling for the top 3 ranks. */
function rankBadge(rank: number): {
  wrap: string;
  text: string;
  Icon: LucideIcon | null;
} {
  if (rank === 1) {
    return {
      wrap: "bg-gradient-to-br from-amber-400/30 to-amber-600/20 ring-1 ring-amber-400/60",
      text: "text-amber-200",
      Icon: Crown,
    };
  }
  if (rank === 2) {
    return {
      wrap: "bg-gradient-to-br from-stone-300/25 to-stone-500/15 ring-1 ring-stone-300/50",
      text: "text-stone-100",
      Icon: Medal,
    };
  }
  if (rank === 3) {
    return {
      wrap: "bg-gradient-to-br from-amber-700/30 to-amber-900/15 ring-1 ring-amber-700/50",
      text: "text-amber-300",
      Icon: Medal,
    };
  }
  return {
    wrap: "bg-stone-800/60 ring-1 ring-stone-700/40",
    text: "text-stone-400",
    Icon: null,
  };
}

interface LeaderRowProps {
  entry: LeaderboardEntry;
}

function LeaderRow({ entry }: LeaderRowProps) {
  const medal = rankBadge(entry.rank);
  const isTop3 = entry.rank <= 3;

  return (
    <div
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-2.5 py-2 transition-colors sm:gap-3 sm:px-3 sm:py-2.5",
        entry.is_player
          ? "border-amber-500/60 bg-gradient-to-r from-amber-950/40 via-amber-900/20 to-stone-900/40 shadow-md shadow-amber-900/30"
          : isTop3
            ? "border-stone-700/60 bg-stone-900/40"
            : "border-stone-800/60 bg-stone-900/30 hover:border-stone-700/70 hover:bg-stone-900/50",
      )}
    >
      {/* Rank */}
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md sm:size-10",
          medal.wrap,
        )}
      >
        {medal.Icon ? (
          <medal.Icon
            className={cn("size-4 sm:size-5", medal.text)}
          />
        ) : (
          <span
            className={cn(
              "font-mono text-sm font-bold tabular-nums sm:text-base",
              medal.text,
            )}
          >
            {entry.rank}
          </span>
        )}
      </div>

      {/* Avatar */}
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-stone-950/60 text-base sm:size-9 sm:text-lg">
        <span aria-hidden>{entry.avatar}</span>
      </span>

      {/* Name + level + rebirthed badge */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={cn(
              "truncate text-sm font-semibold",
              entry.is_player ? "text-amber-100" : "text-stone-100",
            )}
          >
            {entry.name}
          </span>
          {entry.is_player && (
            <Badge
              variant="outline"
              className="shrink-0 gap-0.5 border-amber-400/60 bg-amber-500/20 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider text-amber-200"
            >
              You
            </Badge>
          )}
          {entry.is_rebirthed && (
            <Badge
              variant="outline"
              className="hidden shrink-0 gap-0.5 border-amber-700/50 bg-amber-950/40 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wider text-amber-300 sm:inline-flex"
            >
              <Star className="size-2.5 fill-amber-300 text-amber-300" />
              Rebirthed
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-stone-400 sm:text-[11px]">
          <span className="font-mono tabular-nums">Lv {entry.level}</span>
          <span className="inline-flex items-center gap-0.5">
            <Swords className="size-2.5 text-rose-400" />
            <span className="font-mono tabular-nums">
              {formatNumber(entry.victories)}
            </span>
            <span className="text-stone-600">/{formatNumber(entry.battles)}</span>
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Coins className="size-2.5 text-amber-400" />
            <span className="font-mono tabular-nums">
              {formatNumber(entry.gold_looted)}
            </span>
          </span>
        </div>
      </div>

      {/* Power score */}
      <div className="shrink-0 text-right">
        <div className="text-[9px] uppercase tracking-wider text-stone-500">
          Power
        </div>
        <div
          className={cn(
            "font-mono text-base font-bold tabular-nums sm:text-lg",
            entry.is_player
              ? "text-amber-200"
              : isTop3
                ? "text-stone-100"
                : "text-stone-200",
          )}
        >
          {formatNumber(entry.power_score)}
        </div>
      </div>
    </div>
  );
}

export function LeaderboardPanel() {
  const state = useGameStore((s) => s.state);

  // Generate the leaderboard (NPCs + player) live from current state.
  const entries = React.useMemo(
    () => generateLeaderboard(state),
    [state],
  );
  const ctx = React.useMemo(
    () => playerLeaderboardContext(entries),
    [entries],
  );

  const gapToOvertake =
    ctx.above && ctx.player
      ? Math.max(0, ctx.above.power_score - ctx.player.power_score)
      : 0;
  const isTopRank = ctx.player?.rank === 1;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex flex-wrap items-center gap-2">
        <Trophy className="size-5 text-amber-400" />
        <h2 className="text-lg font-bold text-stone-100">Leaderboard</h2>
        <div className="h-px flex-1 bg-stone-800/60" />
        <Badge
          variant="outline"
          className="border-amber-700/50 bg-amber-950/30 px-2 py-1 text-[10px] text-amber-300"
        >
          <span className="font-mono tabular-nums">{entries.length}</span>
          <span className="ml-1">commanders</span>
        </Badge>
      </div>

      {/* Power-score formula subtitle */}
      <p className="-mt-2 text-[11px] text-stone-500">
        Power Score ={" "}
        <span className="font-mono text-stone-300">
          victories×50 + gold÷10 + level×10 + rebirths×500
        </span>
      </p>

      {/* Your Rank highlight card */}
      {ctx.player && (
        <Card className="gap-3 border-amber-700/50 bg-gradient-to-br from-amber-950/40 via-stone-900/50 to-stone-950/40 p-4 shadow-lg shadow-amber-950/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex size-10 items-center justify-center rounded-md bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/40">
                <Trophy className="size-5" />
              </span>
              <div>
                <div className="text-[10px] uppercase tracking-wider text-amber-300/70">
                  Your Rank
                </div>
                <div className="font-mono text-2xl font-bold text-amber-100 tabular-nums">
                  #{ctx.player.rank}
                  <span className="ml-2 text-sm font-normal text-stone-400">
                    / {entries.length}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase tracking-wider text-stone-500">
                Power Score
              </div>
              <div className="font-mono text-2xl font-bold text-amber-200 tabular-nums">
                {formatNumber(ctx.player.power_score)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 border-t border-stone-800/60 pt-2.5 text-[11px]">
            {isTopRank ? (
              <span className="inline-flex items-center gap-1.5 font-semibold text-amber-300">
                <Crown className="size-3.5 fill-amber-300 text-amber-300" />
                You reign atop the leaderboard. Defend your throne.
              </span>
            ) : ctx.above ? (
              <span className="inline-flex flex-wrap items-center gap-1.5 text-stone-300">
                <TrendingUp className="size-3.5 text-emerald-400" />
                <span className="font-mono font-semibold text-amber-200 tabular-nums">
                  {formatNumber(gapToOvertake)}
                </span>
                <span className="text-stone-400">
                  power to overtake{" "}
                  <span className="font-mono text-stone-200">
                    #{ctx.above.rank}
                  </span>
                  <span className="text-stone-500"> ({ctx.above.name})</span>
                </span>
              </span>
            ) : (
              <span className="text-stone-400">Keep climbing, Commander.</span>
            )}
          </div>

          {/* Gap-to-next visual bar */}
          {!isTopRank && ctx.above && (
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-amber-300/70">
                #{ctx.player.rank}
              </span>
              <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-stone-800/80">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-amber-500 to-amber-300"
                  style={{
                    width: `${Math.min(
                      100,
                      (ctx.player.power_score /
                        Math.max(1, ctx.above.power_score)) *
                        100,
                    )}%`,
                  }}
                />
              </div>
              <span className="shrink-0 text-[10px] uppercase tracking-wider text-stone-500">
                #{ctx.above.rank}
              </span>
            </div>
          )}
        </Card>
      )}

      {/* Above + below context (compact, only on mobile when player is far
          from top of the scroll list — gives quick neighbors). */}
      {ctx.above && ctx.below && (
        <div className="grid grid-cols-2 gap-2 sm:hidden">
          <ContextChip entry={ctx.above} label="Above" icon={ChevronUp} />
          <ContextChip entry={ctx.below} label="Below" icon={ChevronUp} flip />
        </div>
      )}

      {/* Scrollable leaderboard list */}
      <div className="max-h-[32rem] space-y-1.5 overflow-y-auto pr-1">
        {entries.map((entry) => (
          <LeaderRow key={`${entry.rank}-${entry.name}`} entry={entry} />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-stone-800/60 bg-stone-900/30 px-3 py-2 text-[10px] text-stone-500">
        <span className="inline-flex items-center gap-1">
          <Crown className="size-3 text-amber-300" /> Champion
        </span>
        <span className="inline-flex items-center gap-1">
          <Medal className="size-3 text-stone-300" /> Runner-up
        </span>
        <span className="inline-flex items-center gap-1">
          <Star className="size-3 fill-amber-300 text-amber-300" /> Rebirthed
        </span>
        <span className="inline-flex items-center gap-1">
          <Swords className="size-3 text-rose-400" /> Victories / Battles
        </span>
        <span className="inline-flex items-center gap-1">
          <Coins className="size-3 text-amber-400" /> Gold looted
        </span>
      </div>
    </div>
  );
}

/** Small chip showing the immediate above/below neighbor (mobile only). */
function ContextChip({
  entry,
  label,
  icon: Icon,
  flip = false,
}: {
  entry: LeaderboardEntry;
  label: string;
  icon: LucideIcon;
  flip?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-stone-800/60 bg-stone-900/40 px-2.5 py-1.5">
      <Icon
        className={cn(
          "size-3.5 text-stone-500",
          flip && "rotate-180 text-stone-600",
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="text-[9px] uppercase tracking-wider text-stone-500">
          {label} #{entry.rank}
        </div>
        <div className="truncate text-[11px] font-semibold text-stone-200">
          {entry.avatar} {entry.name}
        </div>
      </div>
      <div className="shrink-0 font-mono text-xs font-bold tabular-nums text-amber-200">
        {formatNumber(entry.power_score)}
      </div>
    </div>
  );
}
