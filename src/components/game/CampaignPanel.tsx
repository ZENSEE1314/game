"use client";

/**
 * CampaignPanel — the 30-day Campaign tab.
 *
 * Two sections:
 *   1. Daily Check-In calendar (30-day reward grid). Claim once per
 *      day. Day 30 = Dragon Heart (epic). Streak tracking.
 *   2. 30-day permanent campaign quest line. Linear progression,
 *      each day unlocks a stat-milestone quest. Persists through rebirth.
 */

import * as React from "react";
import { useGameStore } from "@/lib/game/store";
import {
  CHECK_IN_REWARDS,
  CHECK_IN_CYCLE_DAYS,
  canClaimCheckIn,
  getRewardForDay,
} from "@/lib/game/check-in";
import {
  CAMPAIGN_QUESTS,
  campaignProgress,
  canClaimCampaign,
  getCurrentCampaignQuest,
  campaignCompletedCount,
} from "@/lib/game/campaign";
import { formatNumber } from "@/lib/game/constants";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UpgradeButton } from "@/components/game/ui/UpgradeButton";
import { Calendar, Gift, Flame, CheckCircle2, Lock, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function CampaignPanel() {
  const state = useGameStore((s) => s.state);
  const claimCheckIn = useGameStore((s) => s.claimDailyCheckIn);
  const claimCampaign = useGameStore((s) => s.claimCampaignQuest);

  const ci = state.check_in;
  const canClaim = canClaimCheckIn(state, Date.now());
  const todayDay = ci.current_day + 1 > CHECK_IN_CYCLE_DAYS ? 1 : ci.current_day + 1;
  const todayReward = getRewardForDay(todayDay);

  // Campaign quest
  const currentQuest = getCurrentCampaignQuest(state);
  const progress = campaignProgress(state);
  const canClaimCamp = canClaimCampaign(state);
  const completedCount = campaignCompletedCount(state);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="size-5 text-amber-400" />
        <h2 className="text-lg font-bold text-stone-100">Campaign</h2>
        <div className="h-px flex-1 bg-stone-800/60" />
      </div>

      {/* Daily Check-In */}
      <Card className="gap-3 border-amber-900/40 bg-amber-950/15 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Gift className="size-5 text-amber-400" />
            <div>
              <div className="text-sm font-bold text-amber-100">Daily Check-In</div>
              <div className="flex items-center gap-2 text-[11px] text-stone-400">
                <Flame className="size-3 text-rose-400" />
                <span>{ci.streak} day streak</span>
                <span className="text-stone-600">·</span>
                <span>{ci.total_claims} total claims</span>
              </div>
            </div>
          </div>
          {canClaim && todayReward && (
            <Button
              onClick={() => {
                const ok = claimCheckIn();
                if (ok) {
                  toast.success(`Day ${todayDay} claimed!`, {
                    description: `${todayReward.avatar} ${todayReward.label}`,
                  });
                }
              }}
              className="gap-1.5 bg-amber-600 text-amber-50 shadow-md shadow-amber-900/40 hover:bg-amber-500"
            >
              <Gift className="size-4" />
              Claim Day {todayDay}
            </Button>
          )}
        </div>

        {/* 30-day reward grid */}
        <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
          {CHECK_IN_REWARDS.map((reward) => {
            const isClaimed = reward.day <= ci.current_day;
            const isToday = reward.day === todayDay && canClaim;
            const isLocked = reward.day > ci.current_day + 1;
            return (
              <div
                key={reward.day}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 rounded-md border p-1.5 text-center",
                  isClaimed && "border-emerald-700/40 bg-emerald-950/20 opacity-50",
                  isToday && "border-amber-500 bg-amber-950/40 ring-1 ring-amber-500/50",
                  !isClaimed && !isToday && "border-stone-800/60 bg-stone-900/40",
                  reward.special && "border-rose-700/40 bg-rose-950/15",
                )}
                title={`Day ${reward.day}: ${reward.label}`}
              >
                <span className="text-[9px] font-mono text-stone-500">{reward.day}</span>
                <span className="text-base">{reward.avatar}</span>
                {isClaimed && <CheckCircle2 className="absolute right-0 top-0 size-3 text-emerald-400" />}
                {isLocked && <Lock className="absolute right-0 top-0 size-2.5 text-stone-600" />}
                {reward.day === 30 && <Star className="absolute left-0 top-0 size-2.5 text-rose-400" />}
              </div>
            );
          })}
        </div>
        <div className="text-center text-[10px] text-stone-500">
          Day 30 rewards a <span className="text-rose-300 font-semibold">Dragon Heart (Epic)</span>! Check in daily to reach it.
        </div>
      </Card>

      {/* 30-Day Campaign Quest */}
      <Card className="gap-3 border-stone-800/80 bg-stone-900/50 p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Star className="size-5 text-amber-400" />
            <div>
              <div className="text-sm font-bold text-stone-100">30-Day Campaign</div>
              <div className="text-[11px] text-stone-400">
                {completedCount} / 30 quests completed
              </div>
            </div>
          </div>
          <Badge className="bg-stone-700 text-stone-200">
            Day {Math.min(ci.current_day + 1, 30)} / 30
          </Badge>
        </div>

        {currentQuest ? (
          <div className="space-y-2">
            <div className="flex items-start gap-3 rounded-lg border border-stone-800/60 bg-stone-950/40 p-3">
              <span className="text-3xl">{currentQuest.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-amber-400">DAY {currentQuest.day}</span>
                  <span className="text-sm font-bold text-stone-100">{currentQuest.title}</span>
                </div>
                <p className="text-[11px] text-stone-400">{currentQuest.description}</p>
                {progress && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <Progress value={progress.pct} className="h-1.5 bg-stone-800" />
                    <span className="font-mono text-[10px] tabular-nums text-stone-400">
                      {formatNumber(progress.current)} / {formatNumber(progress.goal)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Reward preview */}
            <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-400">
              <span className="uppercase tracking-wider">Reward:</span>
              <span className="text-amber-300">🪙 {currentQuest.reward.gold}</span>
              <span className="text-emerald-300">🪵 {currentQuest.reward.refined_wood}</span>
              <span className="text-amber-300">⚒️ {currentQuest.reward.refined_iron}</span>
              <span className="text-stone-300">✨ {currentQuest.reward.xp} XP</span>
            </div>

            <UpgradeButton
              canAfford={canClaimCamp}
              onClick={() => {
                const ok = claimCampaign();
                if (ok) {
                  toast.success(`${currentQuest.title} complete!`, {
                    description: `Day ${currentQuest.day} reward claimed. Next quest unlocked!`,
                  });
                } else {
                  toast.error("Not yet complete", { description: "Keep progressing to finish this quest." });
                }
              }}
              className="w-full"
            >
              <span className="flex items-center justify-center gap-1">
                <CheckCircle2 className="size-4" />
                {canClaimCamp ? "Claim Reward" : "In Progress"}
              </span>
            </UpgradeButton>
          </div>
        ) : (
          <div className="rounded-lg border border-amber-800/40 bg-amber-950/20 px-4 py-6 text-center">
            <Star className="mx-auto size-8 text-amber-400" />
            <div className="mt-2 text-sm font-bold text-amber-200">Campaign Complete!</div>
            <div className="text-[11px] text-stone-400">You've conquered all 30 days. Legendary!</div>
          </div>
        )}

        {/* Quest history strip */}
        <div className="flex flex-wrap gap-1">
          {CAMPAIGN_QUESTS.map((q) => {
            const isDone = state.campaign.completed.includes(`day_${q.day}`);
            const isCurrent = q.day === state.campaign.current_day;
            return (
              <div
                key={q.day}
                className={cn(
                  "flex size-6 items-center justify-center rounded text-[9px] font-mono",
                  isDone && "bg-emerald-700 text-emerald-50",
                  isCurrent && !isDone && "bg-amber-600 text-amber-50 ring-1 ring-amber-400",
                  !isDone && !isCurrent && "bg-stone-800 text-stone-500",
                )}
                title={`Day ${q.day}: ${q.title}`}
              >
                {q.day}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
