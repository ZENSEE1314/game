"use client";

/**
 * BaseCamp — the production & economy tab.
 *
 * Layout:
 *   (1) A row of 3 Resource cards (Wood/Stone/Iron) showing raw +
 *       refined amounts, both rates, and a refining-throughput bar.
 *   (2) A 2-column grid of 8 Facility upgrade cards (gatherers,
 *       refineries, vault, barracks). Each card shows current level,
 *       current effect, next-level preview, the upgrade cost, and an
 *       Upgrade button that is disabled when the player can't afford it.
 */

import * as React from "react";
import { useGameStore } from "@/lib/game/store";
import {
  formatNumber,
  facilityUpgradeCost,
  rawPerSec,
  processingRate,
  vaultCapacity,
  troopCapacity,
  REFINE_COST_RATIO,
} from "@/lib/game/constants";
import type { FacilityLevels, ResourceState } from "@/lib/game/types";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ResourceIcon } from "@/components/game/ui/ResourceIcon";
import { UpgradeButton } from "@/components/game/ui/UpgradeButton";
import {
  TreePine,
  Mountain,
  Anvil,
  Sparkles,
  Coins,
  Lock,
  Users,
  Hammer,
  ArrowUpCircle,
  Factory,
  Warehouse,
  Tent,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";

type FacilityKey = keyof FacilityLevels;
type ResourceKey = "wood" | "stone" | "iron";

interface FacilityMeta {
  key: FacilityKey;
  name: string;
  Icon: LucideIcon;
  category: "gatherer" | "refinery" | "infrastructure";
  /** Compute the human-readable current effect string from the level. */
  effect: (level: number) => string;
  /** Compute the next-level effect string for the preview. */
  nextEffect: (level: number) => string;
}

const FACILITIES: FacilityMeta[] = [
  {
    key: "wood_gatherer",
    name: "Wood Gatherer",
    Icon: TreePine,
    category: "gatherer",
    effect: (l) => `+${rawPerSec(l).toFixed(2)}/s raw wood`,
    nextEffect: (l) => `+${rawPerSec(l + 1).toFixed(2)}/s raw wood`,
  },
  {
    key: "stone_quarry",
    name: "Stone Quarry",
    Icon: Mountain,
    category: "gatherer",
    effect: (l) => `+${rawPerSec(l).toFixed(2)}/s raw stone`,
    nextEffect: (l) => `+${rawPerSec(l + 1).toFixed(2)}/s raw stone`,
  },
  {
    key: "iron_mine",
    name: "Iron Mine",
    Icon: Anvil,
    category: "gatherer",
    effect: (l) => `+${rawPerSec(l).toFixed(2)}/s raw iron`,
    nextEffect: (l) => `+${rawPerSec(l + 1).toFixed(2)}/s raw iron`,
  },
  {
    key: "wood_refinery",
    name: "Wood Refinery",
    Icon: Factory,
    category: "refinery",
    effect: (l) => `+${processingRate(l).toFixed(2)}/s refined wood`,
    nextEffect: (l) => `+${processingRate(l + 1).toFixed(2)}/s refined wood`,
  },
  {
    key: "stone_refinery",
    name: "Stone Refinery",
    Icon: Factory,
    category: "refinery",
    effect: (l) => `+${processingRate(l).toFixed(2)}/s refined stone`,
    nextEffect: (l) => `+${processingRate(l + 1).toFixed(2)}/s refined stone`,
  },
  {
    key: "iron_smelter",
    name: "Iron Smelter",
    Icon: Hammer,
    category: "refinery",
    effect: (l) => `+${processingRate(l).toFixed(2)}/s refined iron`,
    nextEffect: (l) => `+${processingRate(l + 1).toFixed(2)}/s refined iron`,
  },
  {
    key: "vault",
    name: "Vault",
    Icon: Warehouse,
    category: "infrastructure",
    effect: (l) => `${formatNumber(vaultCapacity(l))} gold secured`,
    nextEffect: (l) => `${formatNumber(vaultCapacity(l + 1))} gold secured`,
  },
  {
    key: "barracks",
    name: "Barracks",
    Icon: Tent,
    category: "infrastructure",
    effect: (l) => `${troopCapacity(l)} troop capacity`,
    nextEffect: (l) => `${troopCapacity(l + 1)} troop capacity`,
  },
];

const RESOURCE_META: Array<{
  key: ResourceKey;
  name: string;
  gathererKey: FacilityKey;
  refineryKey: FacilityKey;
}> = [
  { key: "wood", name: "Wood", gathererKey: "wood_gatherer", refineryKey: "wood_refinery" },
  { key: "stone", name: "Stone", gathererKey: "stone_quarry", refineryKey: "stone_refinery" },
  { key: "iron", name: "Iron", gathererKey: "iron_mine", refineryKey: "iron_smelter" },
];

function categoryTint(c: FacilityMeta["category"]): string {
  switch (c) {
    case "gatherer":
      return "border-emerald-900/40 bg-gradient-to-b from-emerald-950/30 to-stone-950/40";
    case "refinery":
      return "border-amber-900/40 bg-gradient-to-b from-amber-950/25 to-stone-950/40";
    case "infrastructure":
      return "border-stone-700/60 bg-gradient-to-b from-stone-900/60 to-stone-950/40";
  }
}

function categoryIconTint(c: FacilityMeta["category"]): string {
  switch (c) {
    case "gatherer":
      return "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30";
    case "refinery":
      return "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30";
    case "infrastructure":
      return "bg-stone-500/15 text-stone-300 ring-1 ring-stone-500/30";
  }
}

function ResourceCard({
  name,
  resourceKey,
  res,
}: {
  name: string;
  resourceKey: ResourceKey;
  res: ResourceState;
}) {
  // Refining throughput indicator (visual only): how much of the raw
  // production the refinery can chew through (capped at 100%).
  const rawPerSec = res.raw_per_sec;
  const procPerSec = res.processing_rate;
  const throughput = Math.min(
    100,
    rawPerSec > 0 ? (procPerSec * REFINE_COST_RATIO * 100) / rawPerSec : 0,
  );

  return (
    <Card className="gap-3 border-stone-800/80 bg-stone-900/40 p-4 shadow-lg shadow-black/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ResourceIcon resource={resourceKey} className="size-8 [&_svg]:size-4.5" />
          <div>
            <div className="text-sm font-semibold text-stone-100">{name}</div>
            <div className="text-[11px] text-stone-400">Production chain</div>
          </div>
        </div>
      </div>

      {/* Raw row */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-stone-800/60 bg-stone-950/40 px-2.5 py-1.5">
          <div className="text-[10px] uppercase tracking-wider text-stone-500">Raw</div>
          <div className="font-mono text-lg font-bold text-stone-100 tabular-nums">
            {formatNumber(res.current_amount)}
          </div>
          <div className="text-[10px] text-emerald-400/80">
            +{rawPerSec.toFixed(2)}/s
          </div>
        </div>
        <div className="rounded-md border border-amber-900/30 bg-amber-950/20 px-2.5 py-1.5">
          <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-300/70">
            <Sparkles className="size-3" /> Refined
          </div>
          <div className="font-mono text-lg font-bold text-amber-100 tabular-nums">
            {formatNumber(res.refined_amount)}
          </div>
          <div className="text-[10px] text-amber-400/80">
            +{procPerSec.toFixed(2)}/s
          </div>
        </div>
      </div>

      <div>
        <div className="mb-1 flex items-center justify-between text-[10px] text-stone-500">
          <span>Refining throughput</span>
          <span className="font-mono tabular-nums">{Math.floor(throughput)}%</span>
        </div>
        <Progress
          value={throughput}
          className="h-1.5 bg-stone-950/60 [&>[data-slot=progress-indicator]]:bg-gradient-to-r [&>[data-slot=progress-indicator]]:from-emerald-500 [&>[data-slot=progress-indicator]]:to-amber-400"
        />
      </div>
    </Card>
  );
}

function FacilityCard({ meta }: { meta: FacilityMeta }) {
  const state = useGameStore((s) => s.state);
  const upgrade = useGameStore((s) => s.upgradeFacility);
  const level = state.facilities[meta.key];
  const cost = facilityUpgradeCost(level);
  const { Icon } = meta;

  const canAfford =
    state.player.gold >= cost.gold &&
    state.resources.wood.refined_amount >= cost.refined_wood &&
    state.resources.stone.refined_amount >= cost.refined_stone &&
    state.resources.iron.refined_amount >= cost.refined_iron;

  const handleUpgrade = () => {
    const ok = upgrade(meta.key);
    if (ok) {
      toast.success(`${meta.name} upgraded to Lv ${level + 1}`, {
        description: meta.nextEffect(level),
      });
    } else {
      toast.error("Insufficient resources", {
        description: "Gather more refined materials to upgrade this facility.",
      });
    }
  };

  return (
    <Card className={`gap-3 p-4 ${categoryTint(meta.category)} shadow-lg shadow-black/30`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2.5">
          <span
            className={`flex size-9 items-center justify-center rounded-md ${categoryIconTint(
              meta.category,
            )} [&_svg]:size-5`}
          >
            <Icon />
          </span>
          <div>
            <div className="text-sm font-semibold text-stone-100">{meta.name}</div>
            <div className="text-[11px] text-stone-400">Lv {level}</div>
          </div>
        </div>
        <Badge
          variant="outline"
          className="border-stone-700/60 bg-stone-950/40 text-[10px] text-stone-300"
        >
          Lv {level} → {level + 1}
        </Badge>
      </div>

      <div className="rounded-md border border-stone-800/60 bg-stone-950/40 px-2.5 py-1.5">
        <div className="text-[10px] uppercase tracking-wider text-stone-500">
          Current effect
        </div>
        <div className="font-mono text-sm font-semibold text-stone-100">
          {meta.effect(level)}
        </div>
        <div className="text-[10px] text-emerald-400/80">
          Next: {meta.nextEffect(level)}
        </div>
      </div>

      <div>
        <div className="mb-1 text-[10px] uppercase tracking-wider text-stone-500">
          Upgrade cost
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <CostItem icon={<Coins className="size-3" />} label={formatNumber(cost.gold)} tone="amber" />
          <CostItem
            icon={<ResourceIcon resource="wood" className="size-4" />}
            label={formatNumber(cost.refined_wood)}
            tone="emerald"
          />
          <CostItem
            icon={<ResourceIcon resource="stone" className="size-4" />}
            label={formatNumber(cost.refined_stone)}
            tone="stone"
          />
          <CostItem
            icon={<ResourceIcon resource="iron" className="size-4" />}
            label={formatNumber(cost.refined_iron)}
            tone="amber"
          />
        </div>
      </div>

      <UpgradeButton canAfford={canAfford} onClick={handleUpgrade}>
        <ArrowUpCircle className="size-4" />
        {canAfford ? "Upgrade" : "Not enough resources"}
      </UpgradeButton>
    </Card>
  );
}

function CostItem({
  icon,
  label,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "amber" | "emerald" | "stone";
}) {
  const toneCls =
    tone === "amber"
      ? "border-amber-900/40 bg-amber-950/30 text-amber-200"
      : tone === "emerald"
        ? "border-emerald-900/40 bg-emerald-950/30 text-emerald-200"
        : "border-stone-700/60 bg-stone-900/50 text-stone-200";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] font-mono tabular-nums ${toneCls}`}
    >
      {icon}
      {label}
    </span>
  );
}

export function BaseCamp() {
  const state = useGameStore((s) => s.state);

  return (
    <div className="space-y-5">
      {/* Resources */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">
            Resources
          </h2>
          <div className="h-px flex-1 bg-stone-800/60" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {RESOURCE_META.map((r) => (
            <ResourceCard
              key={r.key}
              name={r.name}
              resourceKey={r.key}
              res={state.resources[r.key]}
            />
          ))}
        </div>
      </section>

      {/* Facilities */}
      <section>
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-400">
            Facilities
          </h2>
          <div className="h-px flex-1 bg-stone-800/60" />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {FACILITIES.map((meta) => (
            <FacilityCard key={meta.key} meta={meta} />
          ))}
        </div>
      </section>

      {/* Helper legend */}
      <section className="rounded-lg border border-stone-800/60 bg-stone-900/30 p-3 text-[11px] text-stone-500">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="inline-flex items-center gap-1">
            <TreePine className="size-3 text-emerald-400" /> Gatherers produce raw
          </span>
          <span className="inline-flex items-center gap-1">
            <Factory className="size-3 text-amber-400" /> Refineries convert raw → refined
            ({REFINE_COST_RATIO}:1)
          </span>
          <span className="inline-flex items-center gap-1">
            <Lock className="size-3 text-stone-300" /> Vault protects gold from raids
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3 text-rose-300" /> Barracks raise troop capacity
          </span>
        </div>
      </section>
    </div>
  );
}
