"use client";

/**
 * PrestigePanel — the Rebirth / Prestige tab.
 *
 * Layout:
 *   - Section header "Rebirth" with icon.
 *   - Summary card: rebirth count, lifetime prestige earned, unspent
 *     prestige points, current run gold + progress bar to next prestige
 *     point, global multiplier badge.
 *   - Rebirth action card: shows points to gain, a Rebirth button
 *     (disabled unless canRebirth), and an AlertDialog confirmation.
 *   - Prestige Perks grid: 6 perk cards from PRESTIGE_PERKS, each with
 *     icon (mapped by name), description, effect label, invested pips,
 *     current multiplier, an Invest-1 button, and an invested/max bar.
 */

import * as React from "react";
import { useGameStore } from "@/lib/game/store";
import { formatNumber } from "@/lib/game/constants";
import {
  PRESTIGE_PERKS,
  previewPrestigeGain,
  canRebirth,
  perkMultiplier,
  REBIRTH_MIN_GOLD,
} from "@/lib/game/prestige";
import type { PrestigePerk } from "@/lib/game/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { UpgradeButton } from "@/components/game/ui/UpgradeButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  RotateCcw,
  Sparkles,
  Coins,
  TrendingUp,
  Pickaxe,
  FlaskConical,
  Users,
  Swords,
  Lock,
  Star,
  CheckCircle2,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/** Map perk.icon string -> Lucide component. */
const PERK_ICON_MAP: Record<string, LucideIcon> = {
  Pickaxe,
  FlaskConical,
  Coins,
  Users,
  Swords,
  Lock,
};

/**
 * Compute the gold needed to gain ONE more prestige point from the
 * current run gold, and the progress (0-100) within the current tier.
 *
 * points = floor(sqrt(gold / 1000))
 * next_threshold = (currentPoints + 1)^2 * 1000
 * prev_threshold = currentPoints^2 * 1000
 */
function runProgress(currentRunGold: number): {
  currentPoints: number;
  nextThreshold: number;
  prevThreshold: number;
  goldToNext: number;
  pct: number;
} {
  const currentPoints = previewPrestigeGain(currentRunGold);
  const prevThreshold = currentPoints * currentPoints * 1000;
  const nextThreshold = (currentPoints + 1) * (currentPoints + 1) * 1000;
  const goldToNext = Math.max(0, nextThreshold - currentRunGold);
  const span = Math.max(1, nextThreshold - prevThreshold);
  const pct = Math.min(
    100,
    Math.max(
      0,
      ((currentRunGold - prevThreshold) / span) * 100,
    ),
  );
  return {
    currentPoints,
    nextThreshold,
    prevThreshold,
    goldToNext,
    pct,
  };
}

function PerkCard({
  perk,
  invested,
  multiplier,
  unspentPoints,
  onInvest,
}: {
  perk: PrestigePerk;
  invested: number;
  multiplier: number;
  unspentPoints: number;
  onInvest: () => void;
}) {
  const Icon = PERK_ICON_MAP[perk.icon] ?? Sparkles;
  const maxed = invested >= perk.max_points;
  const canInvest = unspentPoints > 0 && !maxed;
  const pct = (invested / perk.max_points) * 100;

  return (
    <Card
      className={cn(
        "gap-2 p-3 transition-colors",
        maxed
          ? "border-amber-500/50 bg-gradient-to-br from-amber-950/40 via-stone-900/40 to-stone-900/60 shadow-md shadow-amber-950/20"
          : "border-stone-800/80 bg-stone-900/50 hover:border-amber-900/40",
      )}
    >
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-md [&_svg]:size-5",
            maxed
              ? "bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/50"
              : "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
          )}
        >
          <Icon />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <h4 className="truncate text-sm font-semibold text-stone-100">
              {perk.name}
            </h4>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 px-1.5 py-0 font-mono text-[10px] font-bold tabular-nums",
                maxed
                  ? "border-amber-500/50 bg-amber-500/20 text-amber-200"
                  : "border-amber-700/40 bg-amber-950/30 text-amber-300",
              )}
            >
              ×{multiplier.toFixed(2)}
            </Badge>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-stone-400">
            {perk.description}
          </p>
          <p className="mt-0.5 text-[10px] font-medium text-amber-300/80">
            {perk.effect_label}
          </p>
        </div>
      </div>

      {/* Invested pips */}
      <div className="flex items-center gap-1">
        {Array.from({ length: perk.max_points }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < invested
                ? "bg-gradient-to-r from-amber-400 to-amber-500"
                : "bg-stone-800",
            )}
          />
        ))}
      </div>

      <div className="flex items-center justify-between text-[10px] text-stone-500">
        <span className="font-mono tabular-nums">
          {invested} / {perk.max_points}
        </span>
        {maxed && (
          <span className="inline-flex items-center gap-0.5 font-semibold text-amber-300">
            <Star className="size-2.5 fill-amber-300 text-amber-300" /> Maxed
          </span>
        )}
      </div>

      <UpgradeButton
        canAfford={canInvest}
        onClick={onInvest}
        className="h-8 text-xs"
      >
        {maxed ? (
          <>
            <Lock className="size-3.5" /> Maxed
          </>
        ) : unspentPoints <= 0 ? (
          <>
            <Sparkles className="size-3.5" /> No points
          </>
        ) : (
          <>
            <TrendingUp className="size-3.5" /> Invest 1 Point
          </>
        )}
      </UpgradeButton>
    </Card>
  );
}

export function PrestigePanel() {
  const state = useGameStore((s) => s.state);
  const rebirth = useGameStore((s) => s.rebirth);
  const allocate = useGameStore((s) => s.allocatePrestigePerk);

  const prestige = state.prestige;
  const allowed = canRebirth(state);
  const pointsGained = previewPrestigeGain(prestige.current_run_gold);
  const run = runProgress(prestige.current_run_gold);

  const handleRebirth = () => {
    const result = rebirth();
    if (result.success) {
      toast.success("Rebirth complete", {
        description: `Earned ${result.pointsGained} prestige ${
          result.pointsGained === 1 ? "point" : "points"
        } — permanent bonuses now in effect.`,
        icon: <RotateCcw className="size-4" />,
      });
    } else {
      toast.error("Cannot rebirth", {
        description: result.reason ?? "Unknown error.",
      });
    }
  };

  const handleInvest = (perkId: string, perkName: string) => {
    const ok = allocate(perkId);
    if (ok) {
      toast.success(`Invested 1 point in ${perkName}`, {
        description: "Your permanent bonus has increased.",
        icon: <CheckCircle2 className="size-4" />,
      });
    } else {
      toast.error("Cannot invest", {
        description: "No unspent prestige points or perk is maxed.",
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex flex-wrap items-center gap-2">
        <motion.span
          initial={{ rotate: -90, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          <RotateCcw className="size-5 text-amber-400" />
        </motion.span>
        <h2 className="text-lg font-bold text-stone-100">Rebirth</h2>
        <div className="h-px flex-1 bg-stone-800/60" />
        <Badge
          variant="outline"
          className="border-amber-700/50 bg-amber-950/30 px-2 py-1 text-[11px] text-amber-300"
        >
          <Star className="size-3 fill-amber-300 text-amber-300" />
          <span className="ml-1 font-mono tabular-nums">
            ×{prestige.global_multiplier.toFixed(2)}
          </span>
          <span className="ml-1 text-stone-500">global</span>
        </Badge>
      </div>

      <p className="-mt-2 text-[11px] text-stone-500">
        Reset your run for permanent prestige multipliers. Career stats,
        achievements, and prestige are preserved.
      </p>

      {/* Summary card */}
      <Card className="gap-3 border-amber-700/40 bg-gradient-to-br from-amber-950/30 via-stone-900/40 to-stone-950/40 p-4 shadow-lg shadow-black/30">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SummaryStat
            label="Rebirths"
            value={formatNumber(prestige.rebirth_count)}
            icon={RotateCcw}
            tone="stone"
          />
          <SummaryStat
            label="Lifetime Points"
            value={formatNumber(prestige.total_prestige_earned)}
            icon={Star}
            tone="amber"
          />
          <SummaryStat
            label="Unspent Points"
            value={formatNumber(prestige.prestige_points)}
            icon={Sparkles}
            tone="amber"
            prominent
          />
          <SummaryStat
            label="Global Mult"
            value={`×${prestige.global_multiplier.toFixed(2)}`}
            icon={TrendingUp}
            tone="emerald"
          />
        </div>

        {/* Current run gold + progress to next prestige point */}
        <div className="rounded-lg border border-stone-800/60 bg-stone-950/40 p-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px]">
            <span className="inline-flex items-center gap-1.5 text-stone-300">
              <Coins className="size-3.5 text-amber-400" />
              <span>Current Run Gold</span>
            </span>
            <span className="font-mono font-bold tabular-nums text-amber-200">
              {formatNumber(prestige.current_run_gold)}
            </span>
          </div>
          <Progress
            value={run.pct}
            className="h-2 bg-stone-950/60 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-amber-600 [&>[data-slot=progress-indicator]]:to-amber-400"
          />
          <div className="mt-1.5 flex items-center justify-between text-[10px] text-stone-500">
            <span>
              <span className="font-mono tabular-nums">
                {run.currentPoints}
              </span>{" "}
              pts earned this run
            </span>
            {run.currentPoints > 0 || prestige.current_run_gold > 0 ? (
              <span>
                <span className="font-mono tabular-nums">
                  {formatNumber(run.goldToNext)}
                </span>{" "}
                gold to next point
              </span>
            ) : (
              <span>
                Need{" "}
                <span className="font-mono tabular-nums">
                  {formatNumber(REBIRTH_MIN_GOLD)}
                </span>{" "}
                gold to rebirth
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Rebirth action card */}
      <Card className="gap-3 border-rose-900/40 bg-gradient-to-br from-rose-950/25 via-stone-900/40 to-stone-950/40 p-4 shadow-lg shadow-black/30">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-md bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30">
              <RotateCcw className="size-5" />
            </span>
            <div>
              <h3 className="text-sm font-semibold text-stone-100">
                Rebirth Now
              </h3>
              <p className="text-[11px] text-stone-400">
                Reset your run for permanent prestige.
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] uppercase tracking-wider text-stone-500">
              You'll gain
            </div>
            <div className="font-mono text-2xl font-bold text-amber-200 tabular-nums">
              +{pointsGained}
            </div>
            <div className="text-[10px] text-stone-500">
              prestige {pointsGained === 1 ? "point" : "points"}
            </div>
          </div>
        </div>

        {!allowed && (
          <div className="flex items-center gap-2 rounded-md border border-amber-900/40 bg-amber-950/30 px-2.5 py-1.5 text-[11px] text-amber-300">
            <AlertTriangle className="size-3.5 shrink-0" />
            <span>
              Earn at least{" "}
              <span className="font-mono font-semibold tabular-nums">
                {formatNumber(REBIRTH_MIN_GOLD)}
              </span>{" "}
              gold this run to rebirth.{" "}
              <span className="font-mono tabular-nums">
                ({formatNumber(Math.max(0, REBIRTH_MIN_GOLD - prestige.current_run_gold))}{" "}
                more)
              </span>
            </span>
          </div>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              disabled={!allowed}
              className={cn(
                "w-full gap-1.5",
                allowed
                  ? "bg-gradient-to-b from-rose-600 to-rose-800 text-rose-50 shadow-lg shadow-rose-900/40 hover:from-rose-500 hover:to-rose-700"
                  : "bg-stone-800 text-stone-500 hover:bg-stone-800",
              )}
            >
              <RotateCcw className="size-4" />
              {allowed ? "Rebirth" : "Not enough gold"}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent className="border-stone-700 bg-stone-950 text-stone-100">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2 text-stone-100">
                <AlertTriangle className="size-5 text-rose-400" />
                Confirm Rebirth
              </AlertDialogTitle>
              <AlertDialogDescription className="text-stone-400">
                This will reset your facilities, army, resources, and gear.
                Career stats, achievements, and prestige are preserved.
                You'll gain{" "}
                <span className="font-mono font-semibold text-amber-300 tabular-nums">
                  +{pointsGained}
                </span>{" "}
                prestige {pointsGained === 1 ? "point" : "points"}. Continue?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="border-stone-700 bg-stone-900 text-stone-200 hover:bg-stone-800">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRebirth}
                className="gap-1.5 bg-gradient-to-b from-rose-600 to-rose-800 text-rose-50 hover:from-rose-500 hover:to-rose-700"
              >
                <RotateCcw className="size-4" />
                Rebirth
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      {/* Prestige Perks section */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-amber-400" />
          <h3 className="text-sm font-semibold uppercase tracking-wider text-stone-300">
            Prestige Perks
          </h3>
          <div className="h-px flex-1 bg-stone-800/60" />
          {prestige.prestige_points > 0 && (
            <Badge
              variant="outline"
              className="gap-1 border-amber-600/50 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-200"
            >
              <Sparkles className="size-3" />
              <span className="font-mono tabular-nums">
                {formatNumber(prestige.prestige_points)}
              </span>{" "}
              unspent
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {PRESTIGE_PERKS.map((perk) => (
            <PerkCard
              key={perk.id}
              perk={perk}
              invested={prestige.perks?.[perk.id] ?? 0}
              multiplier={perkMultiplier(state, perk.id)}
              unspentPoints={prestige.prestige_points}
              onInvest={() => handleInvest(perk.id, perk.name)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Compact summary stat tile for the prestige summary card. */
function SummaryStat({
  label,
  value,
  icon: Icon,
  tone,
  prominent = false,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone: "amber" | "emerald" | "stone";
  prominent?: boolean;
}) {
  const toneCls = {
    amber: "border-amber-900/40 bg-amber-950/30 text-amber-200",
    emerald: "border-emerald-900/40 bg-emerald-950/30 text-emerald-200",
    stone: "border-stone-700/60 bg-stone-900/50 text-stone-200",
  }[tone];

  return (
    <div
      className={cn(
        "rounded-lg border px-3 py-2",
        toneCls,
        prominent && "ring-1 ring-amber-500/40",
      )}
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-stone-400">
        <Icon className="size-3" />
        {label}
      </div>
      <div
        className={cn(
          "mt-0.5 font-mono font-bold tabular-nums",
          prominent ? "text-2xl" : "text-xl",
          tone === "amber"
            ? "text-amber-100"
            : tone === "emerald"
              ? "text-emerald-100"
              : "text-stone-100",
        )}
      >
        {value}
      </div>
    </div>
  );
}
