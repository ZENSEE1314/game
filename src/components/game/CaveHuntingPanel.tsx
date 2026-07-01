"use client";

/**
 * CaveHuntingPanel — the cave hunting tab.
 *
 * Players can enter caves (3/day) to hunt monsters for rare items.
 * Each cave has a tier (easy/medium/hard), cooldown, and loot table.
 * Failures yield nothing. Items go to inventory and can be sold at
 * the market.
 */

import * as React from "react";
import { useGameStore } from "@/lib/game/store";
import {
  CAVES,
  canEnterCave,
  caveCooldownLabel,
  CAVE_MAX_ENTRIES_PER_DAY,
  rarityColor,
  getItem,
} from "@/lib/game/cave-market";
import { CRAFT_RECIPES, canCraft } from "@/lib/game/crafting";
import { formatNumber } from "@/lib/game/constants";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { UpgradeButton } from "@/components/game/ui/UpgradeButton";
import { AdModal } from "@/components/game/AdModal";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Skull, Clock, Zap, Package, Coins, Check, X, Hammer } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CaveHuntResult } from "@/lib/game/types";

interface HuntModalData {
  result: CaveHuntResult;
  caveName: string;
}

export function CaveHuntingPanel() {
  const state = useGameStore((s) => s.state);
  const hunt = useGameStore((s) => s.huntCave);
  const sell = useGameStore((s) => s.sellInventoryItem);
  const sellAll = useGameStore((s) => s.sellAllItems);
  const craft = useGameStore((s) => s.craftItem);
  const grantEntryAd = useGameStore((s) => s.grantCaveEntryAd);
  const [, force] = React.useReducer((x) => x + 1, 0);
  const [modalData, setModalData] = React.useState<HuntModalData | null>(null);
  const [entryAdOpen, setEntryAdOpen] = React.useState(false);

  // Re-render every second for cooldown timers.
  React.useEffect(() => {
    const id = setInterval(force, 1000);
    return () => clearInterval(id);
  }, []);

  const entriesLeft = CAVE_MAX_ENTRIES_PER_DAY - state.cave.entries_today;
  const msToReset = Math.max(0, state.cave.next_reset_at - Date.now());
  const resetH = Math.floor(msToReset / 3600000);
  const resetM = Math.floor((msToReset % 3600000) / 60000);

  const handleHunt = (caveId: string, caveName: string) => {
    const r = hunt(caveId);
    if (!r.success) {
      toast.error(`Can't enter ${caveName}`, { description: r.reason ?? "Unknown reason" });
      return;
    }
    // Show the result modal with the specific loot (or failure).
    if (r.result) {
      setModalData({ result: r.result, caveName: r.caveName ?? caveName });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Skull className="size-5 text-rose-400" />
        <h2 className="text-lg font-bold text-stone-100">Cave Hunting</h2>
        <div className="h-px flex-1 bg-stone-800/60" />
      </div>

      {/* Entries summary */}
      <Card className="gap-2 border-amber-900/40 bg-amber-950/15 p-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30 [&_svg]:size-4">
              <Zap />
            </span>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-300">
                Daily Entries
              </div>
              <div className="text-[11px] text-stone-400">
                Resets in {resetH}h {resetM}m
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="gap-1 bg-amber-600 text-amber-50">
              {entriesLeft} / {CAVE_MAX_ENTRIES_PER_DAY}
            </Badge>
            {entriesLeft === 0 && (
              <Button
                onClick={() => setEntryAdOpen(true)}
                size="sm"
                className="gap-1 bg-amber-600 text-amber-50 shadow-md shadow-amber-900/40 hover:bg-amber-500"
              >
                <Zap className="size-3.5" />
                +1 (Ad)
              </Button>
            )}
          </div>
        </div>
      </Card>

      <AdModal
        open={entryAdOpen}
        onClose={() => setEntryAdOpen(false)}
        onRewarded={() => {
          grantEntryAd();
          toast.success("Extra cave entry granted!", {
            description: "You can enter one more cave today.",
          });
        }}
        title="Extra Cave Entry"
        description="Watch this short message to gain one extra cave entry today."
        rewardLabel="+1 Cave Entry"
      />

      {/* Cave cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {CAVES.map((cave) => {
          const check = canEnterCave(state, cave.id, Date.now());
          const cdLabel = caveCooldownLabel(state, cave.id);
          return (
            <Card key={cave.id} className="overflow-hidden border-stone-800/80 bg-stone-900/50 p-0">
              {/* Cave image */}
              <div className="relative flex h-28 items-center justify-center bg-stone-950/60">
                <img src="/nodes/cave.png" alt={cave.name} className="size-24 object-contain opacity-80" draggable={false} />
                <Badge className={cn("absolute right-2 top-2", cave.tier === 1 ? "bg-emerald-700" : cave.tier === 2 ? "bg-amber-700" : "bg-rose-700")}>
                  Tier {cave.tier}
                </Badge>
              </div>
              <div className="space-y-2 p-3">
                <div>
                  <div className="text-sm font-bold text-stone-100">{cave.name}</div>
                  <p className="text-[11px] text-stone-400">{cave.description}</p>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-stone-400">Success: <span className="font-mono text-emerald-300">{Math.round(cave.base_success * 100)}%</span></span>
                  <span className="flex items-center gap-1 text-stone-400">
                    <Clock className="size-3" />
                    <span className="font-mono tabular-nums">{cdLabel}</span>
                  </span>
                </div>
                {/* Loot preview */}
                <div className="flex flex-wrap gap-1">
                  {cave.loot_table.slice(0, 4).map((entry) => {
                    const item = getItem(entry.item_id);
                    if (!item) return null;
                    const rc = rarityColor(item.rarity);
                    return (
                      <span key={entry.item_id} className={cn("rounded px-1.5 py-0.5 text-[9px]", rc.bg, rc.text, "border", rc.border)} title={item.name}>
                        {item.avatar} {item.name}
                      </span>
                    );
                  })}
                </div>
                <UpgradeButton
                  canAfford={check.ok}
                  onClick={() => handleHunt(cave.id, cave.name)}
                  tone="rose"
                  className="w-full text-xs"
                >
                  <span className="flex items-center justify-center gap-1">
                    <Skull className="size-3.5" />
                    {check.ok ? "Enter Cave" : check.reason === "Cave on cooldown" ? "On Cooldown" : "No Entries"}
                  </span>
                </UpgradeButton>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Inventory + Market */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center gap-2">
          <Package className="size-4 text-amber-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
            Inventory & Market
          </span>
          <div className="h-px flex-1 bg-stone-800/60" />
          <Button
            size="sm"
            variant="outline"
            className="h-6 gap-1 border-amber-800/60 bg-amber-950/30 px-2 text-[10px] text-amber-300 hover:bg-amber-900/40 hover:text-amber-200"
            onClick={() => {
              const r = sellAll();
              if (r.count > 0) {
                toast.success(`Sold ${r.count} items`, { description: `+${formatNumber(r.goldGained)} gold` });
              } else {
                toast.error("Nothing to sell");
              }
            }}
          >
            <Coins className="size-3" />
            Sell All
          </Button>
        </div>
        <InventoryGrid onSell={(itemId, qty, name, gold) => {
          const ok = sell(itemId, qty);
          if (ok) {
            toast.success(`Sold ${qty}× ${name}`, { description: `+${formatNumber(gold)} gold` });
          } else {
            toast.error("Can't sell");
          }
        }} />
      </div>

      {/* Crafting section */}
      <CraftingSection state={state} onCraft={(recipeId, name) => {
        const ok = craft(recipeId);
        if (ok) {
          toast.success(`${name} crafted!`, { description: "Permanent bonus active." });
        } else {
          toast.error("Can't craft", { description: "Not enough ingredients or max owned." });
        }
      }} />

      {/* Hunt result modal */}
      <HuntResultModal data={modalData} onClose={() => setModalData(null)} />
    </div>
  );
}

function CraftingSection({
  state,
  onCraft,
}: {
  state: ReturnType<typeof useGameStore.getState>["state"];
  onCraft: (recipeId: string, name: string) => void;
}) {
  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-center gap-2">
        <Hammer className="size-4 text-amber-400" />
        <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">
          Crafting — Permanent Trinkets
        </span>
        <div className="h-px flex-1 bg-stone-800/60" />
      </div>
      <p className="text-[11px] text-stone-500">
        Combine monster items into permanent trinkets. Bonuses stack and persist through rebirth.
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {CRAFT_RECIPES.map((recipe) => {
          const check = canCraft(state, recipe.id);
          const owned = state.inventory.trinkets?.[recipe.id] ?? 0;
          return (
            <Card key={recipe.id} className="gap-2 border-stone-800/80 bg-stone-900/50 p-3">
              <div className="flex items-start gap-2">
                <span className="text-2xl">{recipe.avatar}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="truncate text-xs font-bold text-stone-100">{recipe.name}</span>
                    {owned > 0 && (
                      <Badge className="bg-amber-600 px-1 text-[9px] text-amber-50">×{owned}</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-stone-400">{recipe.description}</p>
                  <div className="mt-0.5 text-[10px] text-emerald-300">
                    +{Math.round(recipe.bonus_per_unit * 100)}% {recipe.bonus.label}
                  </div>
                </div>
              </div>
              {/* Ingredients */}
              <div className="flex flex-wrap gap-1">
                {recipe.ingredients.map((ing) => {
                  const item = getItem(ing.item_id);
                  const have = state.inventory.items[ing.item_id] ?? 0;
                  const enough = have >= ing.quantity;
                  return (
                    <span
                      key={ing.item_id}
                      className={cn(
                        "rounded px-1.5 py-0.5 text-[9px] tabular-nums",
                        enough ? "bg-emerald-950/40 text-emerald-300" : "bg-rose-950/40 text-rose-300",
                      )}
                      title={item?.name}
                    >
                      {item?.avatar} {have}/{ing.quantity}
                    </span>
                  );
                })}
              </div>
              <UpgradeButton
                canAfford={check.ok}
                onClick={() => onCraft(recipe.id, recipe.name)}
                className="w-full text-[11px]"
              >
                <span className="flex items-center justify-center gap-1">
                  <Hammer className="size-3" />
                  {owned >= recipe.max_owned ? "Maxed" : `Craft${owned > 0 ? ` (+1)` : ""}`}
                </span>
              </UpgradeButton>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function HuntResultModal({ data, onClose }: { data: HuntModalData | null; onClose: () => void }) {
  if (!data) return null;
  const { result, caveName } = data;
  const item = result.item_id ? getItem(result.item_id) : null;
  const rc = item ? rarityColor(item.rarity) : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm border-stone-700 bg-stone-950 p-0 text-stone-100">
        <DialogHeader className="gap-1 border-b border-stone-800 p-4">
          <DialogTitle className="flex items-center gap-2 text-amber-100">
            <Skull className="size-5 text-rose-400" />
            Hunt Result
          </DialogTitle>
          <DialogDescription className="text-stone-400">
            {caveName}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-3 p-6">
          {result.success ? (
            <>
              <motion.div
                initial={{ scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                className="flex size-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400 ring-2 ring-emerald-500/40"
              >
                <Check className="size-10" />
              </motion.div>
              <div className="text-center">
                <div className="text-sm font-bold uppercase tracking-wider text-emerald-300">
                  Hunt Successful!
                </div>
                {item && rc && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className={cn("mt-3 rounded-lg border p-3", rc.border, rc.bg)}
                  >
                    <div className="text-4xl">{item.avatar}</div>
                    <div className={cn("mt-1 text-sm font-bold", rc.text)}>{item.name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-stone-400">{rc.label}</div>
                    <div className="mt-1 text-xs text-amber-300">×{result.quantity}</div>
                    <div className="mt-1 text-[10px] text-stone-500">Worth {formatNumber(item.sell_price * result.quantity)} gold</div>
                  </motion.div>
                )}
              </div>
            </>
          ) : (
            <>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                className="flex size-20 items-center justify-center rounded-full bg-rose-500/15 text-rose-400 ring-2 ring-rose-500/40"
              >
                <X className="size-10" />
              </motion.div>
              <div className="text-center">
                <div className="text-sm font-bold uppercase tracking-wider text-rose-300">
                  Hunt Failed
                </div>
                <div className="mt-1 text-xs text-stone-400">
                  The monster escaped. You got nothing this time.
                </div>
              </div>
            </>
          )}

          <Button onClick={onClose} className="mt-2 w-full bg-stone-200 text-stone-900 hover:bg-stone-100">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InventoryGrid({ onSell }: { onSell: (itemId: string, qty: number, name: string, gold: number) => void }) {
  const items = useGameStore((s) => s.state.inventory.items);
  const owned = Object.entries(items).filter(([, qty]) => qty > 0);

  if (owned.length === 0) {
    return (
      <div className="rounded-md border border-stone-800/60 bg-stone-900/30 px-3 py-6 text-center text-sm text-stone-500">
        No monster items yet. Enter a cave to hunt for loot!
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      <AnimatePresence>
        {owned.map(([itemId, qty]) => {
          const item = getItem(itemId);
          if (!item) return null;
          const rc = rarityColor(item.rarity);
          return (
            <motion.div
              key={itemId}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn("rounded-lg border bg-stone-900/50 p-2", rc.border, rc.bg)}
            >
              <div className="flex items-center gap-2">
                <span className="text-2xl">{item.avatar}</span>
                <div className="min-w-0 flex-1">
                  <div className={cn("truncate text-xs font-semibold", rc.text)}>{item.name}</div>
                  <div className="text-[10px] text-stone-400">{rc.label} ×{qty}</div>
                </div>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[10px] text-amber-300">🪙 {formatNumber(item.sell_price)}/ea</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 gap-1 border-stone-700 bg-stone-800 px-2 text-[10px] text-stone-200 hover:bg-amber-900/40 hover:text-amber-200"
                  onClick={() => onSell(itemId, 1, item.name, item.sell_price)}
                >
                  <Coins className="size-3" />
                  Sell 1
                </Button>
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
