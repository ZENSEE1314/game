/**
 * ResourceIcon — maps a resource key to a colored Lucide icon badge.
 *  - wood   -> TreePine  (emerald)
 *  - stone  -> Mountain  (stone)
 *  - iron   -> Anvil     (amber)
 *  - gold   -> Coins     (amber)
 *
 * Use `size` to scale the badge.
 */
import * as React from "react";
import { TreePine, Mountain, Anvil, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

export type ResourceKey = "wood" | "stone" | "iron" | "gold";

interface ResourceIconProps {
  resource: ResourceKey;
  className?: string;
  /** Size of the inner SVG. The badge pads it. */
  iconSize?: number;
}

const config: Record<
  ResourceKey,
  { Icon: React.ComponentType<{ className?: string }>; badge: string; iconCls: string }
> = {
  wood: {
    Icon: TreePine,
    badge: "bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/30",
    iconCls: "text-emerald-400",
  },
  stone: {
    Icon: Mountain,
    badge: "bg-stone-500/15 text-stone-300 ring-1 ring-stone-500/30",
    iconCls: "text-stone-300",
  },
  iron: {
    Icon: Anvil,
    badge: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
    iconCls: "text-amber-400",
  },
  gold: {
    Icon: Coins,
    badge: "bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30",
    iconCls: "text-amber-400",
  },
};

export function ResourceIcon({
  resource,
  className,
  iconSize,
}: ResourceIconProps) {
  const { Icon, badge, iconCls } = config[resource];
  const style = iconSize ? { ["--size" as string]: `${iconSize}px` } : undefined;
  return (
    <span
      style={style}
      className={cn(
        "inline-flex size-6 items-center justify-center rounded-md [&_svg]:size-3.5",
        badge,
        className,
      )}
    >
      <Icon className={iconCls} />
    </span>
  );
}

export { TreePine, Mountain, Anvil, Coins };
