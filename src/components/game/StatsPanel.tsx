"use client";

/**
 * StatsPanel — the "brag page" tab.
 *
 * Two sections:
 *   (1) Career Statistics — a responsive grid of stat tiles, each with
 *       an icon + label + big mono number. Includes a derived win-rate.
 *   (2) Achievements — a grid of achievement cards. Unlocked = full
 *       color with emerald "Unlocked" badge; locked = dimmed with
 *       progress text "12 / 25".
 *
 * Icons are mapped from a fixed dictionary keyed by `a.icon` string.
 */

import * as React from "react";
import { useGameStore } from "@/lib/game/store";
import { formatNumber } from "@/lib/game/constants";
import { ACHIEVEMENTS } from "@/lib/game/quests";
import type { Achievement } from "@/lib/game/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Swords,
  Shield,
  Skull,
  Trophy,
  Medal,
  Crown,
  Users,
  Flag,
  Hammer,
  Anvil,
  TentTree,
  Castle,
  Coins,
  Gem,
  Zap,
  Sparkles,
  BarChart3,
  Clock,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

/** Map lucide icon name -> component. Keys are the `a.icon` strings. */
const ICON_MAP: Record<string, LucideIcon> = {
  Swords,
  Shield,
  Skull,
  Trophy,
  Medal,
  Crown,
  Users,
  Flag,
  Hammer,
  Anvil,
  TentTree,
  Castle,
  Coins,
  Gem,
  Zap,
  Sparkles,
};

/** Format seconds as "Xh Ym" (or "Xm" / "Xs" for small values). */
function formatDuration(seconds: number): string {
  if (seconds <= 0) return "0s";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

interface StatTileProps {
  Icon: LucideIcon;
  label: string;
  value: string;
  sub?: string;
  tone: "amber" | "emerald" | "rose" | "stone";
}

const toneStyles: Record<
  StatTileProps["tone"],
  { wrap: string; iconBadge: string; value: string }
> = {
  amber: {
    wrap: "border-amber-900/40 bg-amber-950/20",
    iconBadge: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
    value: "text-amber-100",
  },
  emerald: {
    wrap: "border-emerald-900/40 bg-emerald-950/20",
    iconBadge: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
    value: "text-emerald-100",
  },
  rose: {
    wrap: "border-rose-900/40 bg-rose-950/20",
    iconBadge: "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30",
    value: "text-rose-100",
  },
  stone: {
    wrap: "border-stone-700/50 bg-stone-900/40",
    iconBadge: "bg-stone-500/15 text-stone-300 ring-1 ring-stone-500/30",
    value: "text-stone-100",
  },
};

function StatTile({ Icon, label, value, sub, tone }: StatTileProps) {
  const t = toneStyles[tone];
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5",
        t.wrap,
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-5",
          t.iconBadge,
        )}
      >
        <Icon />
      </span>
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="text-[10px] font-medium uppercase tracking-wider text-stone-400">
          {label}
        </span>
        <span
          className={cn(
            "font-mono text-lg font-bold tabular-nums",
            t.value,
          )}
        >
          {value}
        </span>
        {sub && (
          <span className="text-[10px] text-stone-500">{sub}</span>
        )}
      </div>
    </div>
  );
}

function AchievementCard({
  achievement,
  unlocked,
  currentValue,
}: {
  achievement: Achievement;
  unlocked: boolean;
  currentValue: number;
}) {
  const Icon = ICON_MAP[achievement.icon] ?? Sparkles;
  const pct = Math.min(100, (currentValue / achievement.threshold) * 100);

  if (unlocked) {
    return (
      <Card className="gap-2 border-amber-700/50 bg-gradient-to-br from-amber-950/40 via-stone-900/40 to-stone-900/60 p-3 shadow-md shadow-amber-950/20">
        <div className="flex items-start gap-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40 [&_svg]:size-5">
            <Icon />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <h4 className="truncate text-sm font-semibold text-amber-100">
                {achievement.title}
              </h4>
              <Badge
                variant="outline"
                className="gap-1 border-emerald-700/50 bg-emerald-500/15 px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider text-emerald-300"
              >
                <Trophy className="size-3" />
                Unlocked
              </Badge>
            </div>
            <p className="mt-0.5 text-[11px] leading-snug text-stone-400">
              {achievement.description}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="gap-2 border-stone-800/60 bg-stone-900/30 p-3 opacity-70 saturate-50">
      <div className="flex items-start gap-2.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-stone-700/30 text-stone-500 grayscale [&_svg]:size-5">
          <Icon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <h4 className="truncate text-sm font-semibold text-stone-400">
              {achievement.title}
            </h4>
            <Badge
              variant="outline"
              className="border-stone-700/60 bg-stone-950/40 px-1.5 py-0 text-[10px] text-stone-500"
            >
              Locked
            </Badge>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-stone-500">
            {achievement.description}
          </p>
          <div className="mt-1.5 flex items-center gap-2">
            <Progress
              value={pct}
              className="h-1.5 bg-stone-800/80 [&>[data-slot=progress-indicator]]:bg-stone-500"
            />
            <span className="shrink-0 font-mono text-[10px] font-semibold tabular-nums text-stone-500">
              {formatNumber(currentValue)} / {formatNumber(achievement.threshold)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export function StatsPanel() {
  const stats = useGameStore((s) => s.state.stats);
  const unlocked = useGameStore((s) => s.state.achievements_unlocked);

  const winRate =
    stats.total_battles > 0
      ? Math.round((stats.total_victories / stats.total_battles) * 100)
      : 0;

  // Build the stat tile list. Order matters for the visual rhythm.
  const tiles: StatTileProps[] = [
    {
      Icon: Swords,
      label: "Battles Fought",
      value: formatNumber(stats.total_battles),
      tone: "amber",
    },
    {
      Icon: Trophy,
      label: "Victories",
      value: formatNumber(stats.total_victories),
      sub: `${winRate}% win rate`,
      tone: "emerald",
    },
    {
      Icon: Skull,
      label: "Defeats",
      value: formatNumber(stats.total_defeats),
      tone: "rose",
    },
    {
      Icon: Users,
      label: "Troops Recruited",
      value: formatNumber(stats.total_troops_recruited),
      tone: "rose",
    },
    {
      Icon: Hammer,
      label: "Weapons Forged",
      value: formatNumber(stats.total_weapons_forged),
      tone: "amber",
    },
    {
      Icon: Anvil,
      label: "Tier Upgrades",
      value: formatNumber(stats.total_weapon_tier_upgrades),
      tone: "amber",
    },
    {
      Icon: TentTree,
      label: "Facility Upgrades",
      value: formatNumber(stats.total_facility_upgrades),
      tone: "emerald",
    },
    {
      Icon: Coins,
      label: "Gold Looted",
      value: formatNumber(stats.total_gold_looted),
      tone: "amber",
    },
    {
      Icon: Sparkles,
      label: "Refined Produced",
      value: formatNumber(stats.total_refined_produced),
      tone: "emerald",
    },
    {
      Icon: Zap,
      label: "Ads Watched",
      value: formatNumber(stats.total_ads_watched),
      tone: "amber",
    },
    {
      Icon: Clock,
      label: "Longest Offline",
      value: formatDuration(stats.longest_offline_return_seconds),
      tone: "stone",
    },
    {
      Icon: Crown,
      label: "Achievements",
      value: `${unlocked.length} / ${ACHIEVEMENTS.length}`,
      tone: "amber",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Section: Career Statistics */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-amber-400" />
          <h2 className="text-lg font-bold text-stone-100">
            Career Statistics
          </h2>
          <div className="h-px flex-1 bg-stone-800/60" />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {tiles.map((tile) => (
            <StatTile key={tile.label} {...tile} />
          ))}
        </div>
      </div>

      {/* Section: Achievements */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Trophy className="size-5 text-amber-400" />
          <h2 className="text-lg font-bold text-stone-100">Achievements</h2>
          <div className="h-px flex-1 bg-stone-800/60" />
          <Badge
            variant="outline"
            className="border-amber-700/50 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-300"
          >
            {unlocked.length} / {ACHIEVEMENTS.length}
          </Badge>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ACHIEVEMENTS.map((a) => {
            const isUnlocked = unlocked.includes(a.id);
            const current = Math.min(
              stats[a.tracker] as number,
              a.threshold,
            );
            return (
              <AchievementCard
                key={a.id}
                achievement={a}
                unlocked={isUnlocked}
                currentValue={current}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
