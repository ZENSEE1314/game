"use client";

/**
 * Idle War — main page.
 *
 * Composes the full game shell:
 *   - useGameLoop() drives the 1s tick + offline reconciliation.
 *   - ResourceBar (sticky top).
 *   - 7-tab Tabs section (Base Camp / Barracks & Forge / Arena / Quests /
 *     Stats / Leaderboard / Prestige) with subtle Framer Motion fade
 *     transitions. The tab bar is horizontally scrollable on small
 *     screens so all 7 tabs stay reachable at 375px.
 *   - AmbientGlow orbs behind the main content for atmosphere.
 *   - Page-level modals (OfflineEarningsModal, BattleReportModal).
 *   - NotificationToasts (achievement / quest-completion sonner toasts).
 *   - Sticky footer with version, ad disclaimer, and Reset Game
 *     (AlertDialog confirmed) -> resetGame().
 */

import * as React from "react";
import { useGameLoop } from "@/hooks/useGameLoop";
import { useGameStore } from "@/lib/game/store";
import { ResourceBar } from "@/components/game/ResourceBar";
import { EventBanner } from "@/components/game/EventBanner";
import { HelpGuide } from "@/components/game/HelpGuide";
import { TapNodesPanel } from "@/components/game/TapNodesPanel";
import { BaseCamp } from "@/components/game/BaseCamp";
import { BarracksForge } from "@/components/game/BarracksForge";
import { Arena } from "@/components/game/Arena";
import { CaveHuntingPanel } from "@/components/game/CaveHuntingPanel";
import { CampaignPanel } from "@/components/game/CampaignPanel";
import { GuildPanel } from "@/components/game/GuildPanel";
import { QuestsPanel } from "@/components/game/QuestsPanel";
import { StatsPanel } from "@/components/game/StatsPanel";
import { LeaderboardPanel } from "@/components/game/LeaderboardPanel";
import { PrestigePanel } from "@/components/game/PrestigePanel";
import { NotificationToasts } from "@/components/game/NotificationToasts";
import { AmbientGlow } from "@/components/game/ui/AmbientGlow";
import { OfflineEarningsModal } from "@/components/game/OfflineEarningsModal";
import { BattleReportModal } from "@/components/game/BattleReportModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  TentTree,
  Hammer,
  Swords,
  ScrollText,
  BarChart3,
  Trophy,
  Sparkles,
  RotateCcw,
  Flag,
  TreePine,
  Skull,
  Calendar,
  Users,
} from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { value: "gather", label: "Gathering", short: "Gather", icon: TreePine },
  { value: "base", label: "Base Camp", short: "Camp", icon: TentTree },
  { value: "barracks", label: "Barracks & Forge", short: "Forge", icon: Hammer },
  { value: "arena", label: "Arena", short: "Arena", icon: Swords },
  { value: "cave", label: "Cave Hunt", short: "Cave", icon: Skull },
  { value: "campaign", label: "Campaign", short: "Day", icon: Calendar },
  { value: "guild", label: "Guild", short: "Guild", icon: Users },
  { value: "quests", label: "Quests", short: "Quests", icon: ScrollText },
  { value: "stats", label: "Stats", short: "Stats", icon: BarChart3 },
  { value: "leaderboard", label: "Leaderboard", short: "Ranks", icon: Trophy },
  { value: "prestige", label: "Prestige", short: "Rebirth", icon: Sparkles },
] as const;

export default function Home() {
  useGameLoop();
  const resetGame = useGameStore((s) => s.resetGame);
  const [tab, setTab] = React.useState<(typeof TABS)[number]["value"]>("gather");

  const handleReset = () => {
    resetGame();
    toast.success("Game reset", {
      description: "A new campaign begins. Build your empire anew, Commander.",
    });
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-stone-950 text-stone-100">
      {/* Atmospheric background */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            "radial-gradient(1200px 600px at 50% -10%, rgba(180,83,9,0.18), transparent 60%)," +
            "radial-gradient(900px 500px at 100% 100%, rgba(127,29,29,0.12), transparent 60%)," +
            "radial-gradient(700px 500px at 0% 80%, rgba(20,83,45,0.10), transparent 60%)",
        }}
      />
      {/* Animated ambient glow orbs for extra atmospheric depth */}
      <AmbientGlow
        tone="amber"
        className="left-[5%] top-[15%] size-72 sm:size-96"
      />
      <AmbientGlow
        tone="rose"
        className="right-[2%] top-[55%] size-64 sm:size-80"
      />

      {/* Sticky top bar */}
      <div className="relative z-20">
        <ResourceBar />
      </div>

      {/* Main content */}
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4 sm:py-6">
        {/* Limited-time event banner (renders only when an event is active). */}
        <div className="mb-3">
          <EventBanner />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="gap-3">
          {/* Tab bar: horizontally scrollable on small screens so all 7
              tabs remain reachable at 375px. The scroll container hides
              the scrollbar for a cleaner look. */}
          <div className="-mx-3 px-3 sm:mx-0 sm:px-0">
            <div className="overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <TabsList className="flex h-auto w-max gap-1 rounded-lg border border-stone-800/80 bg-stone-900/70 p-1 backdrop-blur">
                {TABS.map(({ value, label, short, icon: Icon }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    className="gap-1.5 rounded-md px-2.5 py-2 text-xs font-medium text-stone-300 data-[state=active]:bg-amber-950/60 data-[state=active]:text-amber-200 data-[state=active]:shadow-inner sm:px-3 sm:text-sm"
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{short}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="mt-4"
            >
              {tab === "gather" && <TapNodesPanel />}
              {tab === "base" && <BaseCamp />}
              {tab === "barracks" && <BarracksForge />}
              {tab === "arena" && <Arena />}
              {tab === "cave" && <CaveHuntingPanel />}
              {tab === "campaign" && <CampaignPanel />}
              {tab === "guild" && <GuildPanel />}
              {tab === "quests" && <QuestsPanel />}
              {tab === "stats" && <StatsPanel />}
              {tab === "leaderboard" && <LeaderboardPanel />}
              {tab === "prestige" && <PrestigePanel />}
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </main>

      {/* Page-level modals */}
      <OfflineEarningsModal />
      <BattleReportModal />

      {/* Achievement / Quest completion toasts */}
      <NotificationToasts />

      {/* Sticky footer */}
      <footer className="relative z-10 mt-auto border-t border-stone-800/80 bg-stone-950/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-3 py-3 text-xs text-stone-500 sm:flex-row sm:px-4">
          <div className="flex items-center gap-2">
            <Flag className="size-3.5 text-amber-500" />
            <span className="font-semibold text-stone-300">Idle War</span>
            <span className="text-stone-600">v1.0</span>
          </div>
          <div className="text-center text-[11px]">
            Ad-supported · Simulated rewarded ads · Progress saved locally
          </div>
          <div className="flex items-center gap-2">
            <HelpGuide />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-stone-700 bg-stone-900 text-stone-400 hover:bg-stone-800 hover:text-rose-300"
                >
                  <RotateCcw className="size-3.5" />
                  Reset Game
                </Button>
              </AlertDialogTrigger>
            <AlertDialogContent className="border-stone-700 bg-stone-950 text-stone-100">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-stone-100">
                  Reset your campaign?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-stone-400">
                  This will permanently erase your commander, resources, army,
                  and battle history. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="border-stone-700 bg-stone-900 text-stone-200 hover:bg-stone-800">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleReset}
                  className="bg-rose-700 text-rose-50 hover:bg-rose-600"
                >
                  Reset
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          </div>
        </div>
      </footer>
    </div>
  );
}
