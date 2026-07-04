"use client";

/**
 * Arena — the PvP tab.
 *
 * Layout:
 *   - Header with title + Shield status. If unshielded, a prominent
 *     "Activate Peace Shield (Ad)" button opens the AdModal and on
 *     reward calls activatePeaceShield(). If shielded, shows countdown
 *     + disabled state.
 *   - "Scout New Opponents" button -> refreshOpponents() (busy state).
 *   - Scrollable opponent list. Each card shows avatar, name, level +
 *     threat (1-5), troop count, weapon count+tier, and potential loot.
 *     Attack button (rose variant) calls attackOpponent(id).
 *   - Battle History section (scrollable) reading state.battle_history.
 */

import * as React from "react";
import { useGameStore } from "@/lib/game/store";
import { formatNumber, LOOT_RATE } from "@/lib/game/constants";
import { shieldRemainingLabel } from "@/lib/game/ads";
import { staminaCountdownLabel } from "@/lib/game/stamina-tap";
import { previewCombat, projectPlayer, projectOpponent, type CombatPreview } from "@/lib/game/pvp";
import type { Opponent, BattleRecord } from "@/lib/game/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResourceIcon } from "@/components/game/ui/ResourceIcon";
import { AdModal } from "@/components/game/AdModal";
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Skull,
  Swords,
  Users,
  Coins,
  History,
  Trophy,
  Zap,
  Clock,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Verdict label color classes. */
function verdictBadgeClass(verdict: CombatPreview["verdict"]): string {
  switch (verdict) {
    case "certain":
    case "likely":
      return "border-emerald-700/50 bg-emerald-950/40 text-emerald-300";
    case "even":
      return "border-amber-700/50 bg-amber-950/40 text-amber-300";
    case "risky":
    case "doomed":
      return "border-rose-700/50 bg-rose-950/40 text-rose-300";
  }
}

/** Compact "Battle Odds" mini-bar: attacker vs defender split. */
function BattleOddsBar({ preview }: { preview: CombatPreview }) {
  const attackerPct = Math.round(preview.attacker_share * 100);
  const defenderPct = 100 - attackerPct;
  return (
    <div className="mt-1.5 rounded-md border border-stone-800/70 bg-stone-950/40 p-1.5">
      <div className="mb-1 flex items-center justify-between gap-1.5">
        <span className="text-[10px] font-medium uppercase tracking-wider text-stone-500">
          Battle Odds
        </span>
        <Badge
          variant="outline"
          className={cn(
            "gap-1 px-1.5 py-0 text-[10px] font-semibold",
            verdictBadgeClass(preview.verdict),
          )}
        >
          {preview.verdict_label}
        </Badge>
      </div>
      {/* Split bar: emerald attacker vs rose defender */}
      <div className="flex h-2 w-full overflow-hidden rounded-full bg-stone-900">
        <div
          className="h-full bg-emerald-500/80 transition-all"
          style={{ width: `${attackerPct}%` }}
        />
        <div
          className="h-full bg-rose-500/80 transition-all"
          style={{ width: `${defenderPct}%` }}
        />
      </div>
      <div className="mt-1 flex items-center justify-between gap-1.5 font-mono text-[10px] tabular-nums">
        <span className="text-emerald-300">
          You {formatNumber(preview.attacker_score)}
        </span>
        <span className="text-stone-500">vs</span>
        <span className="text-rose-300">
          Them {formatNumber(preview.defender_score)}
        </span>
      </div>
    </div>
  );
}

function ThreatStars({ threat }: { threat: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skull
          key={i}
          className={cn(
            "size-3",
            i < threat ? "text-rose-400" : "text-stone-700",
          )}
        />
      ))}
    </div>
  );
}

function ShieldPanel() {
  const state = useGameStore((s) => s.state);
  const activate = useGameStore((s) => s.activatePeaceShield);
  const [adOpen, setAdOpen] = React.useState(false);

  const label = shieldRemainingLabel(state);
  const shielded = label !== "None";

  return (
    <>
      <Card
        className={cn(
          "gap-2 p-3",
          shielded
            ? "border-emerald-900/40 bg-emerald-950/20"
            : "border-rose-900/40 bg-rose-950/15",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-md [&_svg]:size-4",
                shielded
                  ? "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30"
                  : "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30",
              )}
            >
              {shielded ? <ShieldCheck /> : <ShieldAlert />}
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                {shielded ? "Peace Shield Active" : "Exposed to Raids"}
              </div>
              <div className="text-[11px] text-stone-400">
                {shielded
                  ? `Protected for ${label}`
                  : "Enemies can raid your unsecured gold."}
              </div>
            </div>
          </div>
          <Button
            onClick={() => setAdOpen(true)}
            disabled={shielded}
            className={cn(
              "gap-1.5",
              shielded
                ? "bg-stone-800 text-stone-500"
                : "bg-amber-600 text-amber-50 shadow-md shadow-amber-900/40 hover:bg-amber-500",
            )}
          >
            <Zap className="size-4" />
            {shielded ? "Shielded" : "Activate Shield (Ad)"}
          </Button>
        </div>
      </Card>

      <AdModal
        open={adOpen}
        onClose={() => setAdOpen(false)}
        onRewarded={() => {
          activate();
          toast.success("Peace Shield activated", {
            description: "You're protected from raids for 3 hours.",
          });
        }}
        title="Peace Shield"
        description="Watch this brief message to raise a 3-hour Peace Shield. (Stacks up to 24h.)"
        rewardLabel="3h Peace Shield"
      />
    </>
  );
}

/**
 * RevealOddsBar — shows the battle odds ONLY after the player watches
 * an ad. Before that, shows a "Reveal Odds (Ad)" button. The revealed
 * state is per-opponent (tracked locally by oppId).
 */
function RevealOddsBar({ preview, oppId }: { preview: CombatPreview; oppId: string }) {
  const [revealed, setRevealed] = React.useState<Set<string>>(() => {
    try {
      const saved = sessionStorage.getItem('idle-war-revealed-odds');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });
  const [adOpen, setAdOpen] = React.useState(false);

  const isRevealed = revealed.has(oppId);

  const handleReveal = () => {
    const next = new Set(revealed);
    next.add(oppId);
    setRevealed(next);
    try {
      sessionStorage.setItem('idle-war-revealed-odds', JSON.stringify([...next]));
    } catch {
      // ignore
    }
    setAdOpen(false);
  };

  if (isRevealed) {
    return <BattleOddsBar preview={preview} />;
  }

  return (
    <>
      <div className="mt-1.5 flex items-center gap-2">
        <Button
          onClick={() => setAdOpen(true)}
          size="sm"
          variant="outline"
          className="h-6 gap-1 border-amber-800/60 bg-amber-950/30 px-2 text-[10px] text-amber-300 hover:bg-amber-900/40 hover:text-amber-200"
        >
          <Zap className="size-3" />
          Reveal Odds (Ad)
        </Button>
        <span className="text-[10px] text-stone-500">Intel unknown — scout to reveal</span>
      </div>
      <AdModal
        open={adOpen}
        onClose={() => setAdOpen(false)}
        onRewarded={handleReveal}
        title="Scout Intel"
        description="Watch this message to reveal the battle odds for this opponent."
        rewardLabel="Battle Odds Revealed"
      />
    </>
  );
}

function OpponentCard({ opp }: { opp: Opponent }) {
  const attack = useGameStore((s) => s.attackOpponent);
  const state = useGameStore((s) => s.state);

  const potentialGold = Math.floor(opp.player.gold * LOOT_RATE);
  const potentialWood = Math.floor(opp.resources.wood.refined_amount * LOOT_RATE);
  const potentialIron = Math.floor(opp.resources.iron.refined_amount * LOOT_RATE);

  // Combat preview — deterministic, same formula as resolvePvp.
  const preview = previewCombat(projectPlayer(state, true), projectOpponent(opp));

  const handleAttack = () => {
    const r = attack(opp.id);
    if (!r.success) {
      toast.error("Cannot attack", {
        description: r.reason ?? "Unknown reason",
      });
    } else {
      toast.success(`Assaulting ${opp.name}…`, {
        description: "See the battle report for the outcome.",
      });
    }
  };

  return (
    <Card className="gap-2 border-stone-800/80 bg-stone-900/50 p-3 shadow-md shadow-black/30 transition-colors hover:border-rose-900/50">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg border border-stone-700/60 bg-stone-950/60 text-2xl">
          {opp.avatar}
        </div>

        {/* Identity + stats */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-stone-100">
                {opp.name}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-stone-400">
                <span>Lv {opp.player.level}</span>
                <ThreatStars threat={opp.threat} />
              </div>
            </div>
            <Button
              onClick={handleAttack}
              size="sm"
              className="gap-1 bg-rose-700 text-rose-50 shadow-md shadow-rose-900/40 hover:bg-rose-600"
            >
              <Swords className="size-3.5" />
              Attack
            </Button>
          </div>

          {/* Troops + weapons row — troop count HIDDEN (intel unknown) */}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
            <Badge
              variant="outline"
              className="border-rose-900/40 bg-rose-950/30 text-rose-300"
            >
              <Users className="mr-1 size-3" />
              ??? troops
            </Badge>
            <Badge
              variant="outline"
              className="border-amber-900/40 bg-amber-950/30 text-amber-300"
            >
              <Swords className="mr-1 size-3" />
              {opp.gear.weapon_count} wpn · T{opp.gear.weapon_tier_level}
            </Badge>
            <Badge
              variant="outline"
              className="border-stone-700/60 bg-stone-950/40 text-stone-300"
            >
              ×{opp.gear.weapon_multipliers.defense_mult.toFixed(2)} DEF
            </Badge>
          </div>

          {/* Battle odds — gated behind a "Reveal Odds" ad */}
          <RevealOddsBar preview={preview} oppId={opp.id} />

          {/* Potential loot (flex-wrap, slightly larger per VLM feedback) */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-stone-400">
            <span className="uppercase tracking-wider text-stone-500">Loot (10%):</span>
            <span className="inline-flex items-center gap-1 font-mono text-amber-300 tabular-nums">
              <Coins className="size-3.5" />
              {formatNumber(potentialGold)}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-emerald-300 tabular-nums">
              <ResourceIcon resource="wood" className="size-4" />
              {formatNumber(potentialWood)}
            </span>
            <span className="inline-flex items-center gap-1 font-mono text-amber-300 tabular-nums">
              <ResourceIcon resource="iron" className="size-4" />
              {formatNumber(potentialIron)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function BattleHistory({ history }: { history: BattleRecord[] }) {
  if (history.length === 0) {
    return (
      <div className="rounded-md border border-stone-800/60 bg-stone-900/30 px-3 py-4 text-center text-[11px] text-stone-500">
        No battles fought yet. Scout an opponent and attack!
      </div>
    );
  }
  return (
    <div className="max-h-72 space-y-1.5 overflow-y-auto pr-1">
      {history.map((b) => {
        const won = b.result === "victory";
        return (
          <div
            key={b.id}
            className={cn(
              "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs",
              won
                ? "border-emerald-900/40 bg-emerald-950/15"
                : "border-rose-900/40 bg-rose-950/15",
            )}
          >
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-md [&_svg]:size-3.5",
                won
                  ? "bg-emerald-500/15 text-emerald-400"
                  : "bg-rose-500/15 text-rose-400",
              )}
            >
              {won ? <Trophy /> : <Skull />}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "font-semibold",
                    won ? "text-emerald-300" : "text-rose-300",
                  )}
                >
                  {won ? "Victory" : "Defeat"}
                </span>
                <span className="text-stone-400">vs</span>
                <span className="truncate text-stone-200">{b.opponent_name}</span>
              </div>
              <div className="text-[10px] text-stone-500">
                Lost {b.troops_lost} troops · {b.weapons_lost} weapons
                {won && b.gold_delta > 0
                  ? ` · +${formatNumber(b.gold_delta)} gold`
                  : ""}
              </div>
            </div>
            <span className="shrink-0 font-mono text-[10px] text-stone-500">
              {formatTimeAgo(b.timestamp)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function StaminaPanel() {
  const state = useGameStore((s) => s.state);
  const refill = useGameStore((s) => s.refillStaminaAd);
  const [adOpen, setAdOpen] = React.useState(false);
  const [, force] = React.useReducer((x) => x + 1, 0);

  // Re-render every second for the HH:MM:SS countdown.
  React.useEffect(() => {
    const id = setInterval(force, 1000);
    return () => clearInterval(id);
  }, []);

  const st = state.arena_stamina;
  const countdown = staminaCountdownLabel(state);
  const empty = st.current === 0;

  return (
    <>
      <Card
        className={cn(
          "gap-2 p-3",
          empty
            ? "border-rose-900/50 bg-rose-950/20"
            : "border-amber-900/40 bg-amber-950/15",
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "flex size-8 items-center justify-center rounded-md [&_svg]:size-4",
                empty
                  ? "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30"
                  : "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
              )}
            >
              <Swords />
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                Arena Stamina
              </div>
              <div className="text-[11px] text-stone-400">
                {empty ? "No stamina — wait or watch an ad" : `Next point in ${countdown}`}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Stamina pips */}
            <div className="flex items-center gap-1">
              {Array.from({ length: st.max }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "size-2.5 rounded-full",
                    i < st.current ? "bg-amber-400" : "bg-stone-700",
                  )}
                />
              ))}
            </div>
            <span className="font-mono text-sm font-bold text-amber-300 tabular-nums">
              {st.current}/{st.max}
            </span>
          </div>
        </div>
        {/* HH:MM:SS countdown + refill button */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-stone-400">
            <Clock className="size-3 text-amber-400" />
            <span className="font-mono tabular-nums">
              {st.current >= st.max ? "Full" : countdown}
            </span>
            <span className="text-stone-600">·</span>
            <span>+1 / 3h</span>
          </div>
          <Button
            onClick={() => setAdOpen(true)}
            size="sm"
            className="gap-1 bg-amber-600 text-amber-50 shadow-md shadow-amber-900/40 hover:bg-amber-500"
          >
            <Zap className="size-3.5" />
            +1 Stamina (Ad)
          </Button>
        </div>
      </Card>

      <AdModal
        open={adOpen}
        onClose={() => setAdOpen(false)}
        onRewarded={() => {
          refill();
          toast.success("+1 Arena Stamina!", {
            description: "Watch again for another point.",
          });
        }}
        title="Stamina Boost"
        description="Watch this short message to gain +1 arena stamina. Watch multiple times for more!"
        rewardLabel="+1 Stamina"
      />
    </>
  );
}

export function Arena() {
  const opponents = useGameStore((s) => s.opponents);
  const busy = useGameStore((s) => s.busy);
  const refresh = useGameStore((s) => s.refreshOpponents);
  const history = useGameStore((s) => s.state.battle_history);
  const playerLevel = useGameStore((s) => s.state.player.level);
  const ARENA_MIN_LEVEL = 5;

  const handleRefresh = async () => {
    await refresh();
    toast.success("Fresh opponents scouted");
  };

  if (playerLevel < ARENA_MIN_LEVEL) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2"><Skull className="size-5 text-rose-400" /><h2 className="text-lg font-bold text-stone-100">Arena</h2><div className="h-px flex-1 bg-stone-800/60" /></div>
        <div className="flex flex-col items-center justify-center rounded-lg border border-rose-900/40 bg-rose-950/15 px-4 py-12 text-center">
          <Lock className="size-12 text-rose-400/60" />
          <h3 className="mt-3 text-base font-bold text-rose-200">Arena Locked</h3>
          <p className="mt-1 text-xs text-stone-400">You must reach <span className="font-bold text-amber-300">Level {ARENA_MIN_LEVEL}</span> to enter the Arena.</p>
          <p className="mt-2 text-[11px] text-stone-500">Current level: <span className="font-bold text-stone-300">{playerLevel}</span> · {ARENA_MIN_LEVEL - playerLevel} more to go!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skull className="size-5 text-rose-400" />
        <h2 className="text-lg font-bold text-stone-100">Arena</h2>
        <div className="h-px flex-1 bg-stone-800/60" />
      </div>

      <StaminaPanel />
      <ShieldPanel />

      {/* Scout + opponent list */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span className="font-semibold uppercase tracking-wider">
            Opponents
          </span>
          <span className="text-stone-600">·</span>
          <span>{opponents.length} scouted</span>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={busy}
          variant="outline"
          size="sm"
          className="gap-1.5 border-stone-700 bg-stone-900 text-stone-200 hover:bg-stone-800"
        >
          <RefreshCw className={cn("size-3.5", busy && "animate-spin")} />
          {busy ? "Scouting…" : "Scout New"}
        </Button>
      </div>

      <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
        {opponents.length === 0 ? (
          <div className="rounded-md border border-stone-800/60 bg-stone-900/30 px-3 py-6 text-center text-sm text-stone-500">
            No opponents scouted. Hit &quot;Scout New&quot; to find targets.
          </div>
        ) : (
          opponents.map((o) => <OpponentCard key={o.id} opp={o} />)
        )}
      </div>

      {/* Battle history */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <History className="size-4 text-stone-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Battle History
          </span>
          <div className="h-px flex-1 bg-stone-800/60" />
        </div>
        <BattleHistory history={history} />
      </div>
    </div>
  );
}
