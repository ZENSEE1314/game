"use client";

/**
 * BattleReportModal — self-contained.
 *
 * Reads `lastBattle` from the store. If null (or locally dismissed),
 * renders nothing. When a NEW battle arrives (new object reference),
 * the dismissed state is reset.
 *
 * Renders a "Battle Report" Dialog with:
 *   - VICTORY / DEFEAT banner
 *   - Opponent name + avatar
 *   - Attacker vs Defender scores
 *   - Casualties (yours + theirs)
 *   - Loot (only on victory)
 *   - If you lost troops AND the conscription ad is still available,
 *     a "Conscript Reinforcements (Ad)" button that opens AdModal
 *     and on reward calls conscriptTroops().
 *   - A Close button that locally dismisses the modal.
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
import { Badge } from "@/components/ui/badge";
import { ResourceIcon } from "@/components/game/ui/ResourceIcon";
import { AdModal } from "@/components/game/AdModal";
import {
  Trophy,
  Skull,
  Swords,
  Shield,
  Users,
  Coins,
  Zap,
  Sparkles,
} from "lucide-react";

export function BattleReportModal() {
  const lastBattle = useGameStore((s) => s.lastBattle);
  const conscriptionAdUsed = useGameStore((s) => s.conscriptionAdUsed);
  const conscript = useGameStore((s) => s.conscriptTroops);

  const [dismissed, setDismissed] = React.useState(false);
  const [adOpen, setAdOpen] = React.useState(false);
  const prevRef = React.useRef(lastBattle);

  // Reset the dismissed flag whenever a NEW battle result arrives.
  React.useEffect(() => {
    if (lastBattle !== prevRef.current) {
      prevRef.current = lastBattle;
      setDismissed(false);
    }
  }, [lastBattle]);

  if (!lastBattle || dismissed) return null;

  const { result, opponent, troopsLost } = lastBattle;
  const won = result.attacker_won;

  const showConscription = troopsLost > 0 && !conscriptionAdUsed;

  const handleConscript = () => {
    conscript();
    setAdOpen(false);
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={() => {
          /* non-dismissable until Close is pressed */
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="max-w-md border-stone-700/60 bg-stone-950 text-stone-100"
        >
          <DialogHeader className="gap-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2 text-base font-bold text-stone-100">
                <Swords className="size-5 text-amber-400" />
                Battle Report
              </DialogTitle>
              <Badge
                variant="outline"
                className={
                  won
                    ? "border-emerald-700/60 bg-emerald-950/50 text-emerald-300"
                    : "border-rose-800/60 bg-rose-950/50 text-rose-300"
                }
              >
                {won ? "VICTORY" : "DEFEAT"}
              </Badge>
            </div>
            <DialogDescription className="sr-only">
              Outcome of your attack on {opponent.name}.
            </DialogDescription>
          </DialogHeader>

          {/* Banner */}
          <div
            className={`relative overflow-hidden rounded-lg border px-4 py-3 text-center ${
              won
                ? "border-emerald-800/50 bg-gradient-to-b from-emerald-950/50 to-stone-950"
                : "border-rose-900/50 bg-gradient-to-b from-rose-950/50 to-stone-950"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              {won ? (
                <Trophy className="size-6 text-emerald-400" />
              ) : (
                <Skull className="size-6 text-rose-400" />
              )}
              <span
                className={`text-xl font-black tracking-wide ${
                  won ? "text-emerald-300" : "text-rose-300"
                }`}
              >
                {won ? "VICTORY" : "DEFEAT"}
              </span>
            </div>
            <div className="mt-1 flex items-center justify-center gap-2 text-sm text-stone-300">
              <span className="text-2xl">{opponent.avatar}</span>
              <span>{opponent.name}</span>
              <span className="text-[10px] text-stone-500">Lv {opponent.player.level}</span>
            </div>
          </div>

          {/* Scores */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-amber-300/70">
                Your score
              </div>
              <div className="font-mono text-xl font-bold text-amber-200 tabular-nums">
                {formatNumber(result.attacker_score)}
              </div>
              {won && <div className="text-[10px] text-emerald-400">▲ Winner</div>}
            </div>
            <div className="rounded-lg border border-rose-900/40 bg-rose-950/20 px-3 py-2">
              <div className="text-[10px] uppercase tracking-wider text-rose-300/70">
                Defender score
              </div>
              <div className="font-mono text-xl font-bold text-rose-200 tabular-nums">
                {formatNumber(result.defender_score)}
              </div>
              {!won && <div className="text-[10px] text-rose-400">▲ Winner</div>}
            </div>
          </div>

          {/* Casualties */}
          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wider text-stone-500">
              Casualties
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-md border border-rose-900/40 bg-rose-950/20 px-2.5 py-1.5">
                <div className="flex items-center gap-1 text-[10px] text-rose-300/70">
                  <Users className="size-3" /> Your losses
                </div>
                <div className="font-mono text-xs text-rose-200">
                  {result.attacker_casualties.troops_lost} troops
                  {" • "}
                  {result.attacker_casualties.weapons_lost} weapons
                </div>
              </div>
              <div className="rounded-md border border-stone-700/60 bg-stone-900/40 px-2.5 py-1.5">
                <div className="flex items-center gap-1 text-[10px] text-stone-400">
                  <Skull className="size-3" /> Their losses
                </div>
                <div className="font-mono text-xs text-stone-200">
                  {result.defender_casualties.troops_lost} troops
                  {" • "}
                  {result.defender_casualties.weapons_lost} weapons
                </div>
              </div>
            </div>
          </div>

          {/* Loot (only on victory) */}
          {won && (
            <div>
              <div className="mb-1 flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-400/80">
                <Sparkles className="size-3" /> Spoils of war
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="flex flex-col items-center rounded-md border border-amber-900/40 bg-amber-950/20 px-2 py-1.5">
                  <Coins className="size-4 text-amber-400" />
                  <div className="font-mono text-xs font-bold text-amber-200 tabular-nums">
                    +{formatNumber(result.loot.gold)}
                  </div>
                  <div className="text-[9px] text-stone-500">Gold</div>
                </div>
                <div className="flex flex-col items-center rounded-md border border-emerald-900/40 bg-emerald-950/20 px-2 py-1.5">
                  <ResourceIcon resource="wood" className="size-4" />
                  <div className="font-mono text-xs font-bold text-emerald-200 tabular-nums">
                    +{formatNumber(result.loot.refined_wood)}
                  </div>
                  <div className="text-[9px] text-stone-500">R. Wood</div>
                </div>
                <div className="flex flex-col items-center rounded-md border border-amber-900/40 bg-amber-950/20 px-2 py-1.5">
                  <ResourceIcon resource="iron" className="size-4" />
                  <div className="font-mono text-xs font-bold text-amber-200 tabular-nums">
                    +{formatNumber(result.loot.refined_iron)}
                  </div>
                  <div className="text-[9px] text-stone-500">R. Iron</div>
                </div>
              </div>
            </div>
          )}

          {/* Conscription hint + action */}
          {showConscription && (
            <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 p-2.5">
              <div className="mb-1 flex items-center gap-1.5 text-[11px] text-amber-300">
                <Shield className="size-3.5" />
                <span>
                  Lost {troopsLost} troops. Watch a short ad to conscript
                  reinforcements and restore 25% of them (
                  {Math.floor(troopsLost * 0.25)} troops).
                </span>
              </div>
              <Button
                onClick={() => setAdOpen(true)}
                className="w-full gap-1.5 bg-amber-600 text-amber-50 shadow-md shadow-amber-900/40 hover:bg-amber-500"
              >
                <Zap className="size-4" />
                Conscript Reinforcements (Ad)
              </Button>
            </div>
          )}

          {conscriptionAdUsed && troopsLost > 0 && (
            <div className="rounded-md border border-stone-800 bg-stone-900/40 px-2.5 py-1.5 text-[11px] text-stone-500">
              Conscription ad already used for this battle.
            </div>
          )}

          <div className="flex items-center gap-2">
            <Swords className="size-3.5 text-stone-500" />
            <div className="h-px flex-1 bg-stone-800/60" />
          </div>

          <Button
            onClick={() => setDismissed(true)}
            variant="outline"
            className="w-full border-stone-700 bg-stone-900 text-stone-200 hover:bg-stone-800"
          >
            Close
          </Button>
        </DialogContent>
      </Dialog>

      <AdModal
        open={adOpen}
        onClose={() => setAdOpen(false)}
        onRewarded={handleConscript}
        title="Conscription Order"
        description="The war council authorizes emergency conscription. Watch to recall 25% of your fallen troops to the field."
        rewardLabel={`+${Math.floor(troopsLost * 0.25)} Troops`}
      />
    </>
  );
}
