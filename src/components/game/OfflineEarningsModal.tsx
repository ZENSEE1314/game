"use client";

/**
 * OfflineEarningsModal — self-contained.
 *
 * Reads `pendingOffline` from the store. If null, renders nothing.
 * Otherwise shows a non-dismissable Dialog titled "Welcome Back,
 * Commander!" with the time-away and a grid of resources gained.
 *
 * Two actions:
 *   - "Claim"               -> claimOfflineEarnings(false)
 *   - "Claim 2x (Watch Ad)" -> opens the AdModal; on reward calls
 *                              claimOfflineEarnings(true). Disabled
 *                              if offlineAdUsed is already true.
 */

import * as React from "react";
import { useGameStore } from "@/lib/game/store";
import { formatNumber } from "@/lib/game/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ResourceIcon } from "@/components/game/ui/ResourceIcon";
import { AdModal } from "@/components/game/AdModal";
import { Coins, Clock, Zap, Sparkles } from "lucide-react";

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

interface GainRow {
  label: string;
  value: number;
  resource: "wood" | "stone" | "iron" | "gold";
  refined?: boolean;
}

export function OfflineEarningsModal() {
  const pending = useGameStore((s) => s.pendingOffline);
  const offlineAdUsed = useGameStore((s) => s.offlineAdUsed);
  const claim = useGameStore((s) => s.claimOfflineEarnings);
  const [adOpen, setAdOpen] = React.useState(false);

  if (!pending) return null;
  const e = pending.earnings;

  const gains: GainRow[] = [
    { label: "Raw Wood", value: e.wood_gained, resource: "wood" },
    { label: "Raw Stone", value: e.stone_gained, resource: "stone" },
    { label: "Raw Iron", value: e.iron_gained, resource: "iron" },
    { label: "Refined Wood", value: e.refined_wood_gained, resource: "wood", refined: true },
    { label: "Refined Stone", value: e.refined_stone_gained, resource: "stone", refined: true },
    { label: "Refined Iron", value: e.refined_iron_gained, resource: "iron", refined: true },
  ];

  return (
    <>
      <Dialog
        open
        onOpenChange={() => {
          /* non-dismissable: ignore outside clicks / escape */
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-md border-amber-800/50 bg-stone-950 text-stone-100"
        >
          <DialogHeader className="gap-1">
            <div className="mb-1 flex items-center gap-2 text-amber-400">
              <Clock className="size-5" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300/80">
                While you were away
              </span>
            </div>
            <DialogTitle className="text-lg font-bold text-amber-100">
              Welcome Back, Commander!
            </DialogTitle>
            <DialogDescription className="text-stone-400">
              Your camp kept working for{" "}
              <span className="font-mono text-stone-200">
                {formatDuration(e.seconds_elapsed)}
              </span>
              . Claim your accumulated earnings.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {gains.map((g) => (
              <div
                key={g.label}
                className="flex flex-col gap-1 rounded-lg border border-stone-800/70 bg-stone-900/50 px-2.5 py-2"
              >
                <div className="flex items-center gap-1.5">
                  <ResourceIcon resource={g.resource} className="size-5 [&_svg]:size-3" />
                  <span className="text-[10px] uppercase tracking-wider text-stone-500">
                    {g.label}
                  </span>
                  {g.refined && (
                    <Sparkles className="size-3 text-amber-400" />
                  )}
                </div>
                <div className="font-mono text-sm font-bold text-stone-100 tabular-nums">
                  +{formatNumber(g.value)}
                </div>
              </div>
            ))}
            {/* Gold tile spans the trailing slot for emphasis */}
            <div className="col-span-2 flex items-center justify-between rounded-lg border border-amber-900/40 bg-amber-950/30 px-2.5 py-2 sm:col-span-1">
              <div className="flex items-center gap-1.5">
                <Coins className="size-4 text-amber-400" />
                <span className="text-[10px] uppercase tracking-wider text-amber-300/70">
                  Gold
                </span>
              </div>
              <div className="font-mono text-sm font-bold text-amber-200 tabular-nums">
                +{formatNumber(e.gold_gained)}
              </div>
            </div>
          </div>

          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => claim(false)}
              className="flex-1 gap-1.5 bg-stone-200 text-stone-900 hover:bg-stone-100"
            >
              Claim
            </Button>
            <Button
              onClick={() => setAdOpen(true)}
              disabled={offlineAdUsed}
              className="flex-1 gap-1.5 bg-amber-600 text-amber-50 shadow-md shadow-amber-900/40 hover:bg-amber-500 disabled:bg-stone-800 disabled:text-stone-500 disabled:shadow-none"
            >
              <Zap className="size-4" />
              {offlineAdUsed ? "Ad used" : "Claim 2x (Watch Ad)"}
            </Button>
          </div>

          {offlineAdUsed && (
            <div className="text-center text-[10px] text-stone-500">
              You&apos;ve already doubled these earnings.
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AdModal
        open={adOpen}
        onClose={() => setAdOpen(false)}
        onRewarded={() => claim(true)}
        title="Double Your Earnings!"
        description="Watch this short message from our sponsor to claim 2× your offline earnings."
        rewardLabel="2x Offline Earnings"
      />
    </>
  );
}
