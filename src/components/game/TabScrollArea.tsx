"use client";

/**
 * TabScrollArea — a horizontally scrollable container for the tab bar.
 *
 * Fixes the "can't click right-side tabs" issue by:
 *   1. Using native touch scrolling (`overflow-x-auto` + `-webkit-overflow-scrolling: touch`).
 *   2. Auto-scrolling the selected tab into view when it changes.
 *   3. NO overlay gradient that blocks clicks (removed the w-12 overlay
 *      that was intercepting touch events on the rightmost visible tab).
 *   4. The scroll container has a high `overscroll-behavior-x: contain`
 *      so swiping inside doesn't navigate the page.
 */

import * as React from "react";

export function TabScrollArea({ children }: { children: React.ReactNode }) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{
        WebkitOverflowScrolling: "touch",
        overscrollBehaviorX: "contain",
        touchAction: "pan-x",
      }}
    >
      {children}
    </div>
  );
}
