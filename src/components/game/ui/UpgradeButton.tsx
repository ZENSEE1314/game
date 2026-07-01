"use client";

/**
 * UpgradeButton — a polished composite action button with micro-animations.
 *
 * Visual states:
 *   - Affordable (canAfford=true): amber gradient bg, forge-fire glow,
 *     a slow shimmer pulse to draw the eye, scale[1.02] on hover and
 *     scale[0.98] on tap.
 *   - Unaffordable (canAfford=false): muted stone bg, disabled, cursor
 *     not-allowed, no animation.
 *
 * Built on top of the existing shadcn Button so it inherits sizing /
 * focus / disabled semantics, then layered with Framer Motion for the
 * hover / tap / shimmer animations.
 */

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface UpgradeButtonProps {
  canAfford: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
  /** Optional tone override (default: "amber"). "rose" for combat actions. */
  tone?: "amber" | "rose";
}

const toneStyles: Record<
  NonNullable<UpgradeButtonProps["tone"]>,
  { afford: string; affordHover: string; glow: string; shimmer: string }
> = {
  amber: {
    afford:
      "bg-gradient-to-b from-amber-500 to-amber-700 text-amber-50 shadow-lg shadow-amber-900/40",
    affordHover:
      "hover:from-amber-400 hover:to-amber-600 hover:shadow-xl hover:shadow-amber-700/50",
    glow: "shadow-amber-500/40",
    shimmer: "rgba(251, 191, 36, 0.45)",
  },
  rose: {
    afford:
      "bg-gradient-to-b from-rose-600 to-rose-800 text-rose-50 shadow-lg shadow-rose-900/40",
    affordHover:
      "hover:from-rose-500 hover:to-rose-700 hover:shadow-xl hover:shadow-rose-700/50",
    glow: "shadow-rose-500/40",
    shimmer: "rgba(244, 63, 94, 0.45)",
  },
};

export function UpgradeButton({
  canAfford,
  onClick,
  children,
  className,
  tone = "amber",
}: UpgradeButtonProps) {
  const t = toneStyles[tone];

  if (!canAfford) {
    return (
      <button
        type="button"
        disabled
        onClick={onClick}
        className={cn(
          "inline-flex h-9 w-full items-center justify-center gap-2 rounded-md bg-stone-800 text-sm font-medium text-stone-500",
          "cursor-not-allowed opacity-80 [&_svg]:size-4 [&_svg]:shrink-0",
          className,
        )}
      >
        {children}
      </button>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "relative inline-flex h-9 w-full items-center justify-center gap-2 overflow-hidden rounded-md text-sm font-semibold",
        "[&_svg]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50",
        t.afford,
        t.affordHover,
        className,
      )}
    >
      {/* Shimmer / pulse overlay — slow opacity sweep to draw the eye. */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-md"
        style={{
          background: `radial-gradient(120% 80% at 50% 0%, ${t.shimmer} 0%, transparent 60%)`,
        }}
        animate={{ opacity: [0.25, 0.6, 0.25] }}
        transition={{
          duration: 2.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      {/* Moving shimmer streak (subtle highlight sweep). */}
      <motion.span
        aria-hidden
        className="pointer-events-none absolute -inset-y-2 -left-1/3 w-1/3 skew-x-12 rounded-md bg-white/10 blur-md"
        animate={{ x: ["0%", "420%"] }}
        transition={{
          duration: 2.8,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 1.2,
        }}
      />
      <span className="relative z-10 inline-flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}
