"use client";

/**
 * ResourceBar — sticky top status bar.
 *
 * Surfaces the player's vital stats at a glance:
 *  - Player level + XP progress
 *  - Gold (with secure-vault indicator)
 *  - 3 resources (current + /s rate)
 *  - Active troops / max capacity
 *  - Weapon count + tier
 *  - Shield status (Shielded Xh Ym / Exposed)
 */

import { useGameStore } from "@/lib/game/store";
import { formatNumber, xpForLevel } from "@/lib/game/constants";
import { shieldRemainingLabel } from "@/lib/game/ads";
import { StatChip } from "@/components/game/ui/StatChip";
import { SoundToggle } from "@/components/game/SoundToggle";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Coins,
  TreePine,
  Mountain,
  Anvil,
  Users,
  Sword,
  Shield,
  ShieldAlert,
  Lock,
} from "lucide-react";

export function ResourceBar() {
  const state = useGameStore((s) => s.state);

  const { player, resources, army, gear } = state;
  const xpNeeded = xpForLevel(player.level);
  const xpPct = Math.min(100, (player.current_exp / xpNeeded) * 100);

  const shieldLabel = shieldRemainingLabel(state);
  const shielded = shieldLabel !== "None";

  return (
    <header className="sticky top-0 z-30 border-b border-stone-800/80 bg-stone-950/85 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-3 py-2.5 sm:px-4">
        {/* Top row: level + gold + shield */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Player level + XP */}
          <div className="flex items-center gap-2.5 rounded-lg border border-amber-900/40 bg-amber-950/30 px-3 py-1.5">
            <span className="flex size-7 items-center justify-center rounded-md bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
              <Crown className="size-4" />
            </span>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] font-medium uppercase tracking-wider text-amber-200/70">
                Commander
              </span>
              <span className="font-mono text-sm font-semibold text-amber-100 tabular-nums">
                Lv {player.level}
              </span>
            </div>
            <div className="ml-1 hidden w-24 flex-col gap-0.5 sm:flex">
              <div className="flex justify-between text-[10px] text-amber-200/70">
                <span>XP</span>
                <span className="font-mono tabular-nums">
                  {formatNumber(player.current_exp)}/{formatNumber(xpNeeded)}
                </span>
              </div>
              <Progress
                value={xpPct}
                className="h-1.5 bg-amber-950/60 [&>[data-slot=progress-indicator]]:bg-amber-400"
              />
            </div>
          </div>

          {/* Gold + vault */}
          <StatChip
            icon={<Coins />}
            label="Gold"
            value={formatNumber(player.gold)}
            tone="amber"
            sub={`🔒 ${formatNumber(player.secure_vault_limit)}`}
            className="min-w-[7.5rem]"
          />

          {/* Shield status */}
          {shielded ? (
            <Badge
              variant="outline"
              className="gap-1 border-emerald-700/50 bg-emerald-950/40 px-2.5 py-1 text-emerald-300"
            >
              <Shield className="size-3.5" />
              <span className="text-[11px] font-semibold">Shielded {shieldLabel}</span>
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="gap-1 border-rose-800/50 bg-rose-950/40 px-2.5 py-1 text-rose-300"
            >
              <ShieldAlert className="size-3.5" />
              <span className="text-[11px] font-semibold">Exposed</span>
            </Badge>
          )}
        </div>

        {/* Bottom row: resources + army + weapons (wraps on mobile) */}
        <div className="flex flex-wrap items-center gap-2">
          <StatChip
            icon={<TreePine />}
            label="Wood"
            value={formatNumber(resources.wood.current_amount)}
            tone="emerald"
            sub={`+${resources.wood.raw_per_sec.toFixed(1)}/s`}
          />
          <StatChip
            icon={<Mountain />}
            label="Stone"
            value={formatNumber(resources.stone.current_amount)}
            tone="stone"
            sub={`+${resources.stone.raw_per_sec.toFixed(1)}/s`}
          />
          <StatChip
            icon={<Anvil />}
            label="Iron"
            value={formatNumber(resources.iron.current_amount)}
            tone="amber"
            sub={`+${resources.iron.raw_per_sec.toFixed(1)}/s`}
          />
          <StatChip
            icon={<Users />}
            label="Troops"
            value={`${army.active_troops}/${army.max_troop_capacity}`}
            tone="rose"
          />
          <StatChip
            icon={<Sword />}
            label="Arsenal"
            value={`${gear.weapon_count}`}
            tone="amber"
            sub={`T${gear.weapon_tier_level}`}
          />
          {/* Vault indicator on mobile-only row */}
          <Badge
            variant="outline"
            className="ml-auto gap-1 border-stone-700/60 bg-stone-900/60 px-2 py-1 text-stone-300"
          >
            <Lock className="size-3" />
            <span className="text-[11px]">Vault {formatNumber(player.secure_vault_limit)}</span>
          </Badge>
          <SoundToggle />
        </div>
      </div>
    </header>
  );
}
