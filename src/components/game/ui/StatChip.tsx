/**
 * StatChip — a compact pill that shows an icon badge + label + value.
 * Used throughout the ResourceBar and elsewhere for at-a-glance stats.
 */
import * as React from "react";
import { cn } from "@/lib/utils";

export type StatChipTone = "amber" | "emerald" | "rose" | "stone";

interface StatChipProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: StatChipTone;
  className?: string;
  /** Optional small sub-text rendered under the value (e.g. a rate). */
  sub?: string;
  /** Optional tooltip text shown on hover (defaults to label). */
  tooltip?: string;
}

const toneStyles: Record<
  StatChipTone,
  { wrap: string; iconBadge: string; label: string; value: string }
> = {
  amber: {
    wrap: "border-amber-900/40 bg-amber-950/30",
    iconBadge: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
    label: "text-amber-200/70",
    value: "text-amber-100",
  },
  emerald: {
    wrap: "border-emerald-900/40 bg-emerald-950/30",
    iconBadge: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
    label: "text-emerald-200/70",
    value: "text-emerald-100",
  },
  rose: {
    wrap: "border-rose-900/40 bg-rose-950/30",
    iconBadge: "bg-rose-500/15 text-rose-400 ring-1 ring-rose-500/30",
    label: "text-rose-200/70",
    value: "text-rose-100",
  },
  stone: {
    wrap: "border-stone-700/50 bg-stone-900/40",
    iconBadge: "bg-stone-500/15 text-stone-300 ring-1 ring-stone-500/30",
    label: "text-stone-400",
    value: "text-stone-100",
  },
};

export function StatChip({
  icon,
  label,
  value,
  tone = "stone",
  className,
  sub,
  tooltip,
}: StatChipProps) {
  const t = toneStyles[tone];
  return (
    <div
      title={tooltip ?? label}
      className={cn(
        "flex items-center gap-2.5 rounded-lg border px-3 py-1.5 backdrop-blur-sm",
        t.wrap,
        className,
      )}
    >
      <span
        className={cn(
          "flex size-7 items-center justify-center rounded-md [&_svg]:size-4",
          t.iconBadge,
        )}
      >
        {icon}
      </span>
      <div className="flex flex-col leading-tight">
        <span
          className={cn(
            "text-[10px] font-medium uppercase tracking-wider",
            t.label,
          )}
        >
          {label}
        </span>
        <span
          className={cn(
            "font-mono text-sm font-semibold tabular-nums",
            t.value,
          )}
        >
          {value}
          {sub ? (
            <span className="ml-1 text-[10px] font-normal text-stone-400">
              {sub}
            </span>
          ) : null}
        </span>
      </div>
    </div>
  );
}
