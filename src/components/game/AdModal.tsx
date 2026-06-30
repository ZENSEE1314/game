"use client";

/**
 * AdModal — a REUSABLE simulated Rewarded-Ad interstitial.
 *
 * Props:
 *   open          controlled visibility
 *   onClose       fired when the user dismisses/finishes
 *   onRewarded    fired when the player claims the reward
 *   title         modal heading
 *   description   body copy
 *   rewardLabel   short label shown on the claim button
 *   durationMs    simulated ad length (default 3000ms)
 *
 * Behavior:
 *   - When opened, runs a progress bar that fills over `durationMs`.
 *   - Shows a "▶ Watching ad…" state with a live countdown.
 *   - When the timer completes, a "Claim Reward" button appears.
 *     Clicking it calls onRewarded() then onClose().
 *   - Rewarded ads cannot be skipped — the X close button is hidden
 *     while the ad is "playing" and re-enabled after completion so
 *     the player can dismiss without claiming if they choose.
 *   - Clearly marked as a SIMULATED ad with an "Ad" badge.
 */

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Zap, Gift, Clapperboard, Lock } from "lucide-react";

interface AdModalProps {
  open: boolean;
  onClose: () => void;
  onRewarded: () => void;
  title: string;
  description: string;
  rewardLabel: string;
  durationMs?: number;
}

export function AdModal({
  open,
  onClose,
  onRewarded,
  title,
  description,
  rewardLabel,
  durationMs = 3000,
}: AdModalProps) {
  const [elapsed, setElapsed] = React.useState(0);
  const [completed, setCompleted] = React.useState(false);

  // Reset the ad whenever it is (re)opened.
  React.useEffect(() => {
    if (open) {
      setElapsed(0);
      setCompleted(false);
    }
  }, [open]);

  // Tick the progress bar.
  React.useEffect(() => {
    if (!open || completed) return;
    const tickMs = 50;
    const id = setInterval(() => {
      setElapsed((e) => {
        const next = e + tickMs;
        if (next >= durationMs) {
          clearInterval(id);
          setCompleted(true);
          return durationMs;
        }
        return next;
      });
    }, tickMs);
    return () => clearInterval(id);
  }, [open, completed, durationMs]);

  const pct = Math.min(100, (elapsed / durationMs) * 100);
  const remainingSec = Math.max(0, Math.ceil((durationMs - elapsed) / 1000));

  const handleClaim = () => {
    onRewarded();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o && completed) onClose();
      }}
    >
      <DialogContent
        showCloseButton={completed}
        className="max-w-md overflow-hidden border-amber-800/50 bg-stone-950 p-0 text-stone-100"
      >
        {/* Ad badge strip */}
        <div className="flex items-center justify-between border-b border-amber-900/40 bg-amber-950/40 px-4 py-1.5">
          <Badge
            variant="outline"
            className="border-amber-700/50 bg-amber-900/40 text-[10px] font-bold uppercase tracking-widest text-amber-200"
          >
            <Clapperboard className="mr-1 size-3" /> Ad
          </Badge>
          <span className="text-[10px] text-amber-300/70">
            Rewarded • Simulated
          </span>
        </div>

        <div className="p-5">
          <DialogHeader className="gap-1">
            <div className="mb-1 flex items-center gap-2 text-amber-400">
              <Zap className="size-5" />
            </div>
            <DialogTitle className="text-base font-bold text-amber-100">
              {title}
            </DialogTitle>
            <p className="text-xs text-stone-400">{description}</p>
          </DialogHeader>

          {/* Simulated ad viewport */}
          <div className="relative mt-4 h-32 overflow-hidden rounded-lg border border-amber-900/40 bg-gradient-to-br from-amber-950/60 via-stone-900 to-stone-950">
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
              <AnimatePresence mode="wait">
                {!completed ? (
                  <motion.div
                    key="watching"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 1.2 }}
                    >
                      <Clapperboard className="size-9 text-amber-400" />
                    </motion.div>
                    <div className="text-sm font-semibold text-amber-200">
                      ▶ Watching ad…
                    </div>
                    <div className="font-mono text-xs text-amber-300/70 tabular-nums">
                      {remainingSec}s remaining
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="done"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center gap-1"
                  >
                    <motion.div
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5 }}
                    >
                      <Gift className="size-9 text-emerald-400" />
                    </motion.div>
                    <div className="text-sm font-semibold text-emerald-300">
                      Reward unlocked!
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-3">
            <Progress
              value={pct}
              className="h-1.5 bg-stone-900 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-amber-500 [&>[data-slot=progress-indicator]]:to-amber-300"
            />
            <div className="mt-1 flex justify-between text-[10px] text-stone-500">
              <span>{Math.floor(pct)}%</span>
              <span>{completed ? "Complete" : "Do not close"}</span>
            </div>
          </div>

          {/* Action */}
          <div className="mt-4">
            {!completed ? (
              <div className="flex items-center justify-center gap-1.5 rounded-md border border-stone-800 bg-stone-900/60 px-3 py-2 text-[11px] text-stone-500">
                <Lock className="size-3" />
                Rewarded ads can&apos;t be skipped — hang tight.
              </div>
            ) : (
              <Button
                onClick={handleClaim}
                className="w-full gap-1.5 bg-amber-600 text-amber-50 shadow-md shadow-amber-900/40 hover:bg-amber-500"
              >
                <Gift className="size-4" />
                Claim — {rewardLabel}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
