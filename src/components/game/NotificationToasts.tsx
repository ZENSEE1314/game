"use client";

/**
 * NotificationToasts — fires sonner toasts for achievements + quests.
 *
 * Watches `newlyUnlocked` (achievement IDs) and `newlyCompletedQuests`
 * (quest IDs) on the store. On any change, fires a `toast.success` for
 * each new ID, then calls `clearNotifications()` so the same IDs are
 * never re-surfaced.
 *
 * Render this component once at the page level (after the modals).
 */

import * as React from "react";
import { useGameStore } from "@/lib/game/store";
import { ACHIEVEMENTS } from "@/lib/game/quests";
import { toast } from "sonner";
import { Trophy, ScrollText } from "lucide-react";

export function NotificationToasts() {
  const newlyUnlocked = useGameStore((s) => s.newlyUnlocked);
  const newlyCompletedQuests = useGameStore((s) => s.newlyCompletedQuests);
  const quests = useGameStore((s) => s.state.quests);
  const clearNotifications = useGameStore((s) => s.clearNotifications);

  // Refs to dedupe within a single render batch and to avoid re-firing
  // for the same IDs (defensive — clearNotifications should already do it).
  const firedAchRef = React.useRef<Set<string>>(new Set());
  const firedQuestRef = React.useRef<Set<string>>(new Set());

  React.useEffect(() => {
    let anyFired = false;

    for (const id of newlyUnlocked) {
      if (firedAchRef.current.has(id)) continue;
      const ach = ACHIEVEMENTS.find((a) => a.id === id);
      if (!ach) continue;
      firedAchRef.current.add(id);
      anyFired = true;
      toast.success("Achievement Unlocked", {
        description: `${ach.title} — ${ach.description}`,
        icon: <Trophy className="size-4" />,
        duration: 4500,
      });
    }

    for (const id of newlyCompletedQuests) {
      if (firedQuestRef.current.has(id)) continue;
      const q = quests.find((qq) => qq.id === id);
      if (!q) continue;
      firedQuestRef.current.add(id);
      anyFired = true;
      const tierLabel = q.tier === "elite" ? "Elite Quest" : "Quest";
      toast.success(`${tierLabel} Complete`, {
        description: `${q.title} — claim your reward in the Quests tab.`,
        icon: <ScrollText className="size-4" />,
        duration: 4500,
      });
    }

    if (anyFired) {
      // Trim the ref sets so they don't grow unbounded across a long
      // session (keep the last 100 entries).
      if (firedAchRef.current.size > 100) {
        firedAchRef.current = new Set(
          Array.from(firedAchRef.current).slice(-100),
        );
      }
      if (firedQuestRef.current.size > 100) {
        firedQuestRef.current = new Set(
          Array.from(firedQuestRef.current).slice(-100),
        );
      }
      // Clear the store flags so we don't re-fire on the next render.
      // Defer one tick to avoid setState-during-render warnings.
      const t = setTimeout(() => clearNotifications(), 0);
      return () => clearTimeout(t);
    }
  }, [newlyUnlocked, newlyCompletedQuests, quests, clearNotifications]);

  // This component renders nothing.
  return null;
}
