"use client";

/**
 * BarracksForge — the army & forge tab.
 *
 * Two sections:
 *   (1) Barracks — active troops vs max capacity, a recruit stepper
 *       (1 / 5 / 10 / Max), per-troop cost, and a Recruit button.
 *   (2) Blacksmith Forge — weapon count + tier, attack/defense
 *       multiplier badges, an arsenal visual, plus Forge Weapon and
 *       Upgrade Weapon Tier actions.
 */

import * as React from "react";
import { useGameStore } from "@/lib/game/store";
import {
  formatNumber,
  troopRecruitCost,
  weaponForgeCost,
  weaponTierUpgradeCost,
  weaponMultiplierForTier,
} from "@/lib/game/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ResourceIcon } from "@/components/game/ui/ResourceIcon";
import { UpgradeButton } from "@/components/game/ui/UpgradeButton";
import {
  Users,
  Sword,
  Hammer,
  Anvil,
  ArrowUpCircle,
  Sparkles,
  Shield,
  Coins,
  Plus,
  Minus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RECRUIT_PRESETS = [1, 5, 10];

function BarracksSection() {
  const state = useGameStore((s) => s.state);
  const recruit = useGameStore((s) => s.recruitTroops);

  const { army, player, resources } = state;
  const pct = Math.min(100, (army.active_troops / army.max_troop_capacity) * 100);
  const atCapacity = army.active_troops >= army.max_troop_capacity;

  const [count, setCount] = React.useState<number>(1);
  const perCost = troopRecruitCost();
  const totalCost = {
    gold: perCost.gold * count,
    refined_iron: perCost.refined_iron * count,
    refined_wood: perCost.refined_wood * count,
  };

  // Compute the actual max recruitable given resources & capacity.
  const maxByCap = army.max_troop_capacity - army.active_troops;
  const maxByGold = Math.floor(player.gold / perCost.gold);
  const maxByIron = Math.floor(resources.iron.refined_amount / perCost.refined_iron);
  const maxByWood = Math.floor(resources.wood.refined_amount / perCost.refined_wood);
  const maxRecruitable = Math.max(0, Math.min(maxByCap, maxByGold, maxByIron, maxByWood));

  const canAfford =
    count > 0 &&
    player.gold >= totalCost.gold &&
    resources.iron.refined_amount >= totalCost.refined_iron &&
    resources.wood.refined_amount >= totalCost.refined_wood;
  const fitsCapacity = army.active_troops + count <= army.max_troop_capacity;
  const canRecruit = canAfford && fitsCapacity && count > 0;

  const handleRecruit = () => {
    const ok = recruit(count);
    if (ok) {
      toast.success(`Recruited ${count} troop${count > 1 ? "s" : ""}`, {
        description: `Standing army: ${army.active_troops + count}/${army.max_troop_capacity}`,
      });
    } else {
      if (!fitsCapacity) {
        toast.error("Exceeds troop capacity", {
          description: "Upgrade your Barracks to field more troops.",
        });
      } else {
        toast.error("Insufficient resources", {
          description: "Need gold, refined iron and refined wood to recruit.",
        });
      }
    }
  };

  const adjust = (n: number) => {
    setCount(Math.max(1, Math.min(maxRecruitable || 1, n)));
  };

  return (
    <Card className="gap-4 border-rose-900/40 bg-gradient-to-b from-rose-950/15 to-stone-950/40 p-4 shadow-lg shadow-black/30">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-md bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30">
            <Users className="size-5" />
          </span>
          <div>
            <div className="text-sm font-semibold text-stone-100">Barracks</div>
            <div className="text-[11px] text-stone-400">Recruit standing troops</div>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-rose-800/40 bg-rose-950/30 text-rose-300"
        >
          Cap {army.max_troop_capacity}
        </Badge>
      </div>

      {/* Big troop count */}
      <div className="rounded-lg border border-stone-800/60 bg-stone-950/40 px-3 py-3">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-stone-500">
              Active troops
            </div>
            <div className="font-mono text-3xl font-bold text-rose-200 tabular-nums">
              {army.active_troops}
              <span className="text-base font-normal text-stone-500">
                {" "}
                / {army.max_troop_capacity}
              </span>
            </div>
          </div>
          <div className="text-right text-[11px] text-stone-500">
            {pct.toFixed(0)}% garrisoned
          </div>
        </div>
        <Progress
          value={pct}
          className="mt-2 h-2 bg-stone-950/60 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-rose-600 [&>[data-slot=progress-indicator]]:to-rose-400"
        />
      </div>

      {/* Recruit control */}
      <div className="rounded-lg border border-stone-800/60 bg-stone-950/30 p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-wider text-stone-500">
            Recruit count
          </span>
          <span className="text-[10px] text-stone-500">
            Max: {maxRecruitable}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="size-9 border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800"
            onClick={() => adjust(count - 1)}
            disabled={count <= 1}
          >
            <Minus className="size-4" />
          </Button>
          <input
            type="number"
            min={1}
            value={count}
            onChange={(e) => {
              const v = parseInt(e.target.value || "0", 10);
              setCount(Number.isFinite(v) ? Math.max(1, v) : 1);
            }}
            className="h-9 w-16 rounded-md border border-stone-700 bg-stone-950 text-center font-mono text-sm font-semibold text-stone-100 tabular-nums outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-600/40"
          />
          <Button
            variant="outline"
            size="icon"
            className="size-9 border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800"
            onClick={() => adjust(count + 1)}
            disabled={count >= Math.max(1, maxRecruitable)}
          >
            <Plus className="size-4" />
          </Button>
          <div className="ml-1 flex flex-wrap gap-1">
            {RECRUIT_PRESETS.map((n) => (
              <Button
                key={n}
                variant="outline"
                size="sm"
                className={cn(
                  "h-8 border-stone-700 bg-stone-900 px-2.5 text-xs text-stone-300 hover:bg-stone-800",
                  count === n && "border-amber-600 bg-amber-950/40 text-amber-200",
                )}
                onClick={() => setCount(n)}
              >
                {n}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-amber-700/40 bg-amber-950/30 px-2.5 text-xs text-amber-300 hover:bg-amber-900/40"
              onClick={() => setCount(Math.max(1, maxRecruitable))}
              disabled={maxRecruitable <= 0}
            >
              Max
            </Button>
          </div>
        </div>

        {/* Cost preview */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-stone-500">
            Cost for {count}:
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-900/40 bg-amber-950/30 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-amber-200">
            <Coins className="size-3" />
            {formatNumber(totalCost.gold)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-900/40 bg-amber-950/30 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-amber-200">
            <ResourceIcon resource="iron" className="size-4" />
            {formatNumber(totalCost.refined_iron)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-emerald-900/40 bg-emerald-950/30 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-emerald-200">
            <ResourceIcon resource="wood" className="size-4" />
            {formatNumber(totalCost.refined_wood)}
          </span>
        </div>

        <UpgradeButton
          canAfford={canRecruit}
          onClick={handleRecruit}
          tone="rose"
        >
          <Users className="size-4" />
          Recruit {count} Troop{count > 1 ? "s" : ""}
        </UpgradeButton>

        {atCapacity && (
          <div className="mt-2 rounded-md border border-amber-900/40 bg-amber-950/30 px-2.5 py-1.5 text-[11px] text-amber-300">
            Barracks full — upgrade the Barracks facility to raise capacity.
          </div>
        )}
      </div>
    </Card>
  );
}

function Arsenal({ count }: { count: number }) {
  const cap = 20;
  const shown = Math.min(cap, count);
  const overflow = Math.max(0, count - cap);
  return (
    <div className="flex flex-wrap items-center gap-1">
      {Array.from({ length: shown }).map((_, i) => (
        <Sword
          key={i}
          className="size-4 text-amber-400 drop-shadow-[0_0_3px_rgba(251,191,36,0.4)]"
        />
      ))}
      {overflow > 0 && (
        <span className="rounded bg-amber-950/60 px-1.5 py-0.5 font-mono text-[10px] text-amber-300 ring-1 ring-amber-700/40">
          +{formatNumber(overflow)}
        </span>
      )}
      {count === 0 && (
        <span className="text-[11px] text-stone-500">No weapons forged.</span>
      )}
    </div>
  );
}

function ForgeSection() {
  const state = useGameStore((s) => s.state);
  const forge = useGameStore((s) => s.forgeWeapon);
  const upgradeTier = useGameStore((s) => s.upgradeWeaponTier);

  const { gear, player, resources } = state;
  const forgeCost = weaponForgeCost(gear.weapon_count);
  const tierCost = weaponTierUpgradeCost(gear.weapon_tier_level);
  const nextTierMult = weaponMultiplierForTier(gear.weapon_tier_level + 1);

  const canForge =
    player.gold >= forgeCost.gold &&
    resources.iron.refined_amount >= forgeCost.refined_iron;

  const canUpgradeTier =
    player.gold >= tierCost.gold &&
    resources.iron.refined_amount >= tierCost.refined_iron &&
    resources.stone.refined_amount >= tierCost.refined_stone;

  const handleForge = () => {
    const ok = forge();
    if (ok) {
      toast.success("Weapon forged", {
        description: `Arsenal now holds ${gear.weapon_count + 1} weapon${gear.weapon_count + 1 > 1 ? "s" : ""}.`,
      });
    } else {
      toast.error("Insufficient resources", {
        description: "Need gold and refined iron to forge.",
      });
    }
  };

  const handleUpgradeTier = () => {
    const ok = upgradeTier();
    if (ok) {
      toast.success(`Weapon tier upgraded to T${gear.weapon_tier_level + 1}`, {
        description: `New multipliers: ×${nextTierMult.attack_mult.toFixed(2)} ATK / ×${nextTierMult.defense_mult.toFixed(2)} DEF`,
      });
    } else {
      toast.error("Insufficient resources", {
        description: "Need gold, refined iron and refined stone.",
      });
    }
  };

  return (
    <Card className="gap-4 border-amber-900/40 bg-gradient-to-b from-amber-950/20 to-stone-950/40 p-4 shadow-lg shadow-black/30">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-md bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30">
            <Hammer className="size-5" />
          </span>
          <div>
            <div className="text-sm font-semibold text-stone-100">Blacksmith Forge</div>
            <div className="text-[11px] text-stone-400">Forge & temper weapons</div>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-amber-800/40 bg-amber-950/30 text-amber-300"
        >
          Tier {gear.weapon_tier_level}
        </Badge>
      </div>

      {/* Multiplier badges */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-rose-900/40 bg-rose-950/20 px-2.5 py-2">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-rose-300/70">
            <Sword className="size-3" /> Attack mult
          </div>
          <div className="font-mono text-lg font-bold text-rose-200 tabular-nums">
            ×{gear.weapon_multipliers.attack_mult.toFixed(2)}
          </div>
        </div>
        <div className="rounded-md border border-emerald-900/40 bg-emerald-950/20 px-2.5 py-2">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-emerald-300/70">
            <Shield className="size-3" /> Defense mult
          </div>
          <div className="font-mono text-lg font-bold text-emerald-200 tabular-nums">
            ×{gear.weapon_multipliers.defense_mult.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Arsenal visual */}
      <div className="rounded-md border border-stone-800/60 bg-stone-950/40 px-2.5 py-2">
        <div className="mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-stone-500">
            <Sparkles className="size-3 text-amber-400" /> Arsenal
          </span>
          <span className="font-mono text-[11px] text-amber-200 tabular-nums">
            {gear.weapon_count} weapons
          </span>
        </div>
        <Arsenal count={gear.weapon_count} />
      </div>

      {/* Forge weapon */}
      <div className="rounded-lg border border-stone-800/60 bg-stone-950/30 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Anvil className="size-4 text-amber-400" />
            <div>
              <div className="text-sm font-semibold text-stone-100">Forge Weapon</div>
              <div className="text-[11px] text-stone-400">+1 weapon, keeps tier</div>
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-900/40 bg-amber-950/30 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-amber-200">
            <Coins className="size-3" />
            {formatNumber(forgeCost.gold)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-900/40 bg-amber-950/30 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-amber-200">
            <ResourceIcon resource="iron" className="size-4" />
            {formatNumber(forgeCost.refined_iron)}
          </span>
        </div>
        <UpgradeButton canAfford={canForge} onClick={handleForge} className="mt-2">
          <Hammer className="size-4" />
          Forge Weapon
        </UpgradeButton>
      </div>

      {/* Upgrade weapon tier */}
      <div className="rounded-lg border border-stone-800/60 bg-stone-950/30 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpCircle className="size-4 text-amber-400" />
            <div>
              <div className="text-sm font-semibold text-stone-100">
                Upgrade Weapon Tier
              </div>
              <div className="text-[11px] text-stone-400">
                Raise multipliers (T{gear.weapon_tier_level} → T{gear.weapon_tier_level + 1})
              </div>
            </div>
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-900/40 bg-amber-950/30 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-amber-200">
            <Coins className="size-3" />
            {formatNumber(tierCost.gold)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-amber-900/40 bg-amber-950/30 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-amber-200">
            <ResourceIcon resource="iron" className="size-4" />
            {formatNumber(tierCost.refined_iron)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-stone-700/60 bg-stone-900/50 px-1.5 py-0.5 font-mono text-[11px] tabular-nums text-stone-200">
            <ResourceIcon resource="stone" className="size-4" />
            {formatNumber(tierCost.refined_stone)}
          </span>
        </div>
        <div className="mt-2 rounded-md border border-emerald-900/30 bg-emerald-950/20 px-2 py-1 text-[11px] text-emerald-300">
          Next: ×{nextTierMult.attack_mult.toFixed(2)} ATK / ×{nextTierMult.defense_mult.toFixed(2)} DEF
        </div>
        <UpgradeButton
          canAfford={canUpgradeTier}
          onClick={handleUpgradeTier}
          className="mt-2"
        >
          <ArrowUpCircle className="size-4" />
          Upgrade to Tier {gear.weapon_tier_level + 1}
        </UpgradeButton>
      </div>
    </Card>
  );
}

export function BarracksForge() {
  return (
    <div className="space-y-4">
      <BarracksSection />
      <ForgeSection />
    </div>
  );
}
