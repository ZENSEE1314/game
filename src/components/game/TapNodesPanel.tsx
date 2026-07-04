"use client";

/**
 * TapNodesPanel — the active-gathering tab.
 *
 * Shows three tappable resource nodes (tree/mine/farm) as images.
 * The player taps to collect resources (active gameplay), with a
 * short cooldown between taps. Tool upgrades (axe/pickaxe/sickle)
 * boost the yield per tap. This sits alongside the passive tick system.
 */

import * as React from "react";
import { useGameStore } from "@/lib/game/store";
import {
  tapYield,
  tapCooldownLabel,
  canTap,
  TAP_COOLDOWN_MS,
  toolUpgradeCost,
  formatTapYield,
} from "@/lib/game/stamina-tap";
import { formatNumber } from "@/lib/game/constants";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UpgradeButton } from "@/components/game/ui/UpgradeButton";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { TreePine, Mountain, Coins, Hammer, Pickaxe, Wheat } from "lucide-react";
import { cn } from "@/lib/utils";

type NodeType = "tree" | "mine" | "farm";

interface NodeConfig {
  key: NodeType;
  name: string;
  image: string;
  toolKey: "axe_level" | "pickaxe_level" | "sickle_level";
  toolName: string;
  toolIcon: React.ReactNode;
  accent: string;
  ring: string;
}

const NODES: NodeConfig[] = [
  {
    key: "tree",
    name: "Timber Grove",
    image: "/nodes/tree.png",
    toolKey: "axe_level",
    toolName: "Axe",
    toolIcon: <TreePine className="size-4" />,
    accent: "from-emerald-950/40 to-stone-900/60 border-emerald-700/40",
    ring: "ring-emerald-500/40",
  },
  {
    key: "mine",
    name: "Ore Mine",
    image: "/nodes/mine.png",
    toolKey: "pickaxe_level",
    toolName: "Pickaxe",
    toolIcon: <Mountain className="size-4" />,
    accent: "from-amber-950/40 to-stone-900/60 border-amber-700/40",
    ring: "ring-amber-500/40",
  },
  {
    key: "farm",
    name: "Rice Farm",
    image: "/nodes/farm.png",
    toolKey: "sickle_level",
    toolName: "Sickle",
    toolIcon: <Coins className="size-4" />,
    accent: "from-amber-950/40 to-stone-900/60 border-amber-700/40",
    ring: "ring-amber-400/40",
  },
];

export function TapNodesPanel() {
  const state = useGameStore((s) => s.state);
  const tap = useGameStore((s) => s.tapResourceNode);
  const upgradeTool = useGameStore((s) => s.upgradeToolLevel);
  const [, force] = React.useReducer((x) => x + 1, 0);

  // Re-render every 500ms so cooldowns update smoothly.
  React.useEffect(() => {
    const id = setInterval(force, 500);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Hammer className="size-5 text-amber-400" />
        <h2 className="text-lg font-bold text-stone-100">Gathering</h2>
        <div className="h-px flex-1 bg-stone-800/60" />
      </div>

      <p className="text-xs text-stone-400">
        Tap a node to actively gather resources. Upgrade your tools to boost yield per tap. Passive generation from Base Camp also continues.
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {NODES.map((node) => (
          <NodeCard
            key={node.key}
            node={node}
            state={state}
            onTap={() => {
              const ok = tap(node.key);
              if (!ok) {
                toast.error("On cooldown", { description: "Wait a moment before tapping again." });
              }
            }}
            onUpgrade={() => {
              const ok = upgradeTool(node.toolKey.replace("_level", "") as "axe" | "pickaxe" | "sickle");
              if (ok) {
                toast.success(`${node.toolName} upgraded!`, {
                  description: "Your gathering yield has increased.",
                });
              } else {
                toast.error("Can't upgrade", { description: "Not enough resources." });
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}

function NodeCard({
  node,
  state,
  onTap,
  onUpgrade,
}: {
  node: NodeConfig;
  state: ReturnType<typeof useGameStore.getState>["state"];
  onTap: () => void;
  onUpgrade: () => void;
}) {
  const now = Date.now();
  const ready = canTap(state, node.key, now);
  const cdLabel = tapCooldownLabel(state, node.key);
  const y = tapYield(state, node.key);
  const toolLevel = state.tap_nodes[node.toolKey];
  const cost = toolUpgradeCost(toolLevel);
  const canAfford =
    state.player.gold >= cost.gold &&
    state.resources.iron.refined_amount >= cost.refined_iron &&
    state.resources.wood.refined_amount >= cost.refined_wood;

  // Floating "+yield" text on each successful tap.
  const [floatId, setFloatId] = React.useState(0);
  const [floatText, setFloatText] = React.useState("");

  const handleTap = () => {
    const text = formatTapYield(y);
    setFloatText(text);
    setFloatId((n) => n + 1);
    onTap();
  };

  return (
    <Card className={cn("relative overflow-hidden border bg-gradient-to-b p-4", node.accent)}>
      {/* Tappable node image */}
      <button
        type="button"
        onClick={handleTap}
        disabled={!ready}
        className={cn(
          "group relative flex w-full items-center justify-center rounded-lg bg-stone-950/50 p-2 transition-all",
          ready ? "cursor-pointer hover:bg-stone-950/70 active:scale-95" : "cursor-not-allowed opacity-60",
        )}
        aria-label={`Tap ${node.name} to gather`}
      >
        {/* Glow ring when ready */}
        {ready && (
          <motion.div
            aria-hidden
            className={cn("pointer-events-none absolute inset-0 rounded-lg ring-2", node.ring)}
            animate={{ opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
        )}
        <img
          src={node.image}
          alt={node.name}
          className="relative size-28 object-contain drop-shadow-lg sm:size-32"
          draggable={false}
        />
        {/* Cooldown overlay */}
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-stone-950/70">
            <span className="font-mono text-lg font-bold text-amber-300 tabular-nums">{cdLabel}</span>
          </div>
        )}
        {/* Floating "+yield" text on tap */}
        {floatId > 0 && floatText && (
          <motion.div
            key={floatId}
            initial={{ opacity: 0, y: 0, scale: 0.8 }}
            animate={{ opacity: [0, 1, 1, 0], y: -40, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 text-sm font-bold text-amber-200 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
          >
            {floatText}
          </motion.div>
        )}
      </button>

      {/* Node name + yield preview */}
      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-stone-100">{node.name}</span>
        <Badge variant="outline" className="border-stone-700/60 bg-stone-900/60 text-[10px] text-stone-300">
          {node.toolName} Lv {toolLevel}
        </Badge>
      </div>
      <div className="mt-1 text-center text-xs font-mono text-amber-300 tabular-nums">
        {formatTapYield(y)}
      </div>

      {/* Upgrade button */}
      <div className="mt-3">
        <UpgradeButton canAfford={canAfford} onClick={onUpgrade} className="w-full text-xs">
          <span className="flex items-center justify-center gap-1">
            {node.toolIcon}
            Upgrade {node.toolName}
          </span>
        </UpgradeButton>
        <div className="mt-1.5 flex items-center justify-center gap-2 text-[10px] text-stone-500">
          <span className="inline-flex items-center gap-0.5">
            🪙 {formatNumber(cost.gold)}
          </span>
          <span className="inline-flex items-center gap-0.5">
            ⛏️ {formatNumber(cost.refined_iron)}
          </span>
          <span className="inline-flex items-center gap-0.5">
            🪵 {formatNumber(cost.refined_wood)}
          </span>
        </div>
      </div>
    </Card>
  );
}
