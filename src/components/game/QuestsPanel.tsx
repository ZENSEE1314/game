"use client";

/**
 * QuestsPanel — the Quests tab.
 *
 * Layout:
 *   - Section header "Daily Quests" with a countdown to next rotation
 *     (24h from state.quests_rotated_at).
 *   - Elite quest (tier === 'elite') shown at the TOP in a distinct
 *     rose/amber-tinted card labeled "ELITE".
 *   - Daily quests (tier === 'daily') rendered as Cards with progress
 *     bar, reward preview, and a Claim / Claimed / progress button.
 *
 * On claim: calls claimQuest(id), toasts success with reward summary.
 */

import * as React from "react";
import { useGameStore } from "@/lib/game/store";
import { formatNumber } from "@/lib/game/constants";
import { questProgress } from "@/lib/game/quests";
import type { Quest, QuestReward } from "@/lib/game/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ResourceIcon } from "@/components/game/ui/ResourceIcon";
import {
  ScrollText,
  Clock,
  Coins,
  Sparkles,
  Star,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Format ms remaining as "Xh Ym". */
function formatRemaining(ms: number): string {
  if (ms <= 0) return "0m";
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/** Compact reward preview row. */
function RewardPreview({ reward }: { reward: QuestReward }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wider text-stone-500">
        Reward
      </span>
      {reward.gold > 0 && (
        <Badge
          variant="outline"
          className="gap-1 border-amber-900/40 bg-amber-950/30 px-1.5 py-0 text-[10px] text-amber-300"
        >
          <Coins className="size-3" />
          <span className="font-mono tabular-nums">{formatNumber(reward.gold)}</span>
        </Badge>
      )}
      {reward.refined_wood > 0 && (
        <Badge
          variant="outline"
          className="gap-1 border-emerald-900/40 bg-emerald-950/30 px-1.5 py-0 text-[10px] text-emerald-300"
        >
          <ResourceIcon resource="wood" className="size-4" />
          <span className="font-mono tabular-nums">{formatNumber(reward.refined_wood)}</span>
        </Badge>
      )}
      {reward.refined_stone > 0 && (
        <Badge
          variant="outline"
          className="gap-1 border-stone-700/60 bg-stone-950/40 px-1.5 py-0 text-[10px] text-stone-300"
        >
          <ResourceIcon resource="stone" className="size-4" />
          <span className="font-mono tabular-nums">{formatNumber(reward.refined_stone)}</span>
        </Badge>
      )}
      {reward.refined_iron > 0 && (
        <Badge
          variant="outline"
          className="gap-1 border-amber-900/40 bg-amber-950/30 px-1.5 py-0 text-[10px] text-amber-300"
        >
          <ResourceIcon resource="iron" className="size-4" />
          <span className="font-mono tabular-nums">{formatNumber(reward.refined_iron)}</span>
        </Badge>
      )}
      {reward.xp > 0 && (
        <Badge
          variant="outline"
          className="gap-1 border-amber-900/40 bg-amber-950/30 px-1.5 py-0 text-[10px] text-amber-200"
        >
          <Sparkles className="size-3" />
          <span className="font-mono tabular-nums">{formatNumber(reward.xp)} XP</span>
        </Badge>
      )}
    </div>
  );
}

interface QuestCardProps {
  quest: Quest;
  elite?: boolean;
}

function QuestCard({ quest, elite = false }: QuestCardProps) {
  const stats = useGameStore((s) => s.state.stats);
  const claim = useGameStore((s) => s.claimQuest);

  const { current, goal, pct, complete } = questProgress(quest, stats);

  const handleClaim = () => {
    const ok = claim(quest.id);
    if (ok) {
      const parts: string[] = [];
      if (quest.reward.gold > 0) parts.push(`+${formatNumber(quest.reward.gold)} gold`);
      if (quest.reward.refined_wood > 0) parts.push(`+${formatNumber(quest.reward.refined_wood)} wood`);
      if (quest.reward.refined_stone > 0) parts.push(`+${formatNumber(quest.reward.refined_stone)} stone`);
      if (quest.reward.refined_iron > 0) parts.push(`+${formatNumber(quest.reward.refined_iron)} iron`);
      if (quest.reward.xp > 0) parts.push(`+${formatNumber(quest.reward.xp)} XP`);
      toast.success(`Claimed: ${quest.title}`, {
        description: parts.join(" · "),
        icon: <CheckCircle2 className="size-4" />,
      });
    } else {
      toast.error("Cannot claim", {
        description: "Quest not complete or already claimed.",
      });
    }
  };

  const claimedBadge = (
    <Badge
      variant="outline"
      className="gap-1 border-stone-700/60 bg-stone-950/40 px-2 py-0 text-[10px] text-stone-400"
    >
      <Lock className="size-3" />
      Claimed
    </Badge>
  );

  return (
    <Card
      className={cn(
        "gap-2 p-3 transition-colors",
        elite
          ? "border-amber-700/50 bg-gradient-to-br from-amber-950/40 via-rose-950/20 to-stone-900/50 shadow-md shadow-amber-950/30"
          : "border-stone-800/80 bg-stone-900/50 hover:border-amber-900/40",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {elite && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-600/50 bg-amber-500/15 px-1.5 py-0 text-[10px] font-bold uppercase tracking-wider text-amber-300"
              >
                <Star className="size-3 fill-amber-300 text-amber-300" />
                Elite
              </Badge>
            )}
            <h3
              className={cn(
                "truncate text-sm font-semibold",
                elite ? "text-amber-100" : "text-stone-100",
              )}
            >
              {quest.title}
            </h3>
          </div>
          <p className="mt-0.5 text-[11px] leading-snug text-stone-400">
            {quest.description}
          </p>
        </div>
        <div className="shrink-0">
          {quest.claimed ? (
            claimedBadge
          ) : complete ? (
            <Button
              size="sm"
              onClick={handleClaim}
              className="gap-1 bg-emerald-600 text-emerald-50 shadow-md shadow-emerald-900/40 hover:bg-emerald-500"
            >
              <CheckCircle2 className="size-3.5" />
              Claim
            </Button>
          ) : (
            <Badge
              variant="outline"
              className="border-stone-700/60 bg-stone-950/40 px-2 py-0 text-[10px] text-stone-400"
            >
              {Math.floor(pct)}%
            </Badge>
          )}
        </div>
      </div>

      {/* Progress bar + numbers */}
      <div className="flex items-center gap-2">
        <Progress
          value={pct}
          className={cn(
            "h-2",
            elite
              ? "bg-amber-950/60 [&>[data-slot=progress-indicator]]:bg-amber-400"
              : complete
                ? "bg-emerald-950/60 [&>[data-slot=progress-indicator]]:bg-emerald-400"
                : "bg-stone-800/80 [&>[data-slot=progress-indicator]]:bg-amber-500",
          )}
        />
        <span className="shrink-0 font-mono text-[11px] font-semibold tabular-nums text-stone-300">
          {formatNumber(current)} / {formatNumber(goal)}
        </span>
      </div>

      <RewardPreview reward={quest.reward} />
    </Card>
  );
}

export function QuestsPanel() {
  const quests = useGameStore((s) => s.state.quests);
  const rotatedAt = useGameStore((s) => s.state.quests_rotated_at);

  // Live countdown — re-render every 30s.
  const [, setTick] = React.useState(0);
  React.useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const now = Date.now();
  const rotationEnd = rotatedAt + 24 * 60 * 60 * 1000;
  const remaining = Math.max(0, rotationEnd - now);

  const eliteQuests = quests.filter((q) => q.tier === "elite");
  const dailyQuests = quests.filter((q) => q.tier === "daily");

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center gap-2">
        <ScrollText className="size-5 text-amber-400" />
        <h2 className="text-lg font-bold text-stone-100">Quests</h2>
        <div className="h-px flex-1 bg-stone-800/60" />
        <Badge
          variant="outline"
          className="gap-1 border-stone-700/60 bg-stone-900/60 px-2 py-1 text-[11px] text-stone-300"
        >
          <Clock className="size-3 text-amber-400" />
          <span className="font-mono tabular-nums">
            Resets in {formatRemaining(remaining)}
          </span>
        </Badge>
      </div>

      {/* Empty state */}
      {quests.length === 0 && (
        <Card className="gap-2 border-stone-800/60 bg-stone-900/30 p-6 text-center text-sm text-stone-400">
          No active quests. Check back shortly.
        </Card>
      )}

      {/* Elite quests (top) */}
      {eliteQuests.length > 0 && (
        <div className="space-y-2">
          {eliteQuests.map((q) => (
            <QuestCard key={q.id} quest={q} elite />
          ))}
        </div>
      )}

      {/* Daily quests header */}
      {dailyQuests.length > 0 && (
        <>
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
              Daily Quests
            </span>
            <div className="h-px flex-1 bg-stone-800/60" />
            <span className="text-[11px] text-stone-500">
              {dailyQuests.filter((q) => !q.claimed).length} active
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {dailyQuests.map((q) => (
              <QuestCard key={q.id} quest={q} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
