"use client";

/**
 * AmbientGlow — decorative animated radial-gradient orbs.
 *
 * Renders absolutely-positioned blurred radial gradients that slowly
 * pulse (opacity 0.3 -> 0.6 -> 0.3 over 4s, infinite). Place 1-2 of
 * these behind the main content (z-0) for atmospheric depth.
 *
 * Tone presets map to the existing palette:
 *   - amber   -> forge-fire
 *   - emerald -> resources / success
 *   - rose    -> PvP / danger
 *
 * Purely decorative: pointer-events-none, no layout impact.
 */

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type AmbientGlowTone = "amber" | "emerald" | "rose";

interface AmbientGlowProps {
  tone?: AmbientGlowTone;
  className?: string;
}

const toneColors: Record<AmbientGlowTone, string> = {
  amber: "rgba(217, 119, 6, 0.45)", // amber-600 with alpha
  emerald: "rgba(16, 185, 129, 0.40)", // emerald-500
  rose: "rgba(225, 29, 72, 0.40)", // rose-600
};

export function AmbientGlow({ tone = "amber", className }: AmbientGlowProps) {
  const color = toneColors[tone];
  return (
    <motion.div
      aria-hidden
      className={cn(
        "pointer-events-none absolute rounded-full blur-3xl",
        className,
      )}
      style={{
        background: `radial-gradient(circle at center, ${color} 0%, transparent 70%)`,
      }}
      initial={{ opacity: 0.3 }}
      animate={{ opacity: [0.3, 0.6, 0.3] }}
      transition={{
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}
