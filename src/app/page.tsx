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
import { TabScrollArea } from "@/components/game/TabScrollArea";
import { QuestsPanel } from "@/components/game/QuestsPanel";
import { StatsPanel } from "@/components/game/StatsPanel";
import { LeaderboardPanel } from "@/components/game/LeaderboardPanel";
import { PrestigePanel } from "@/components/game/PrestigePanel";
import { NotificationToasts } from "@/components/game/NotificationToasts";
import { AmbientGlow } from "@/components/game/ui/AmbientGlow";
import { OfflineEarningsModal } from "@/components/game/OfflineEarningsModal";
import { BattleReportModal } from "@/components/game/BattleReportModal";
import { AuthGate } from "@/components/game/AuthGate";
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
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

const TABS = [
  { value: "gather", label: "Gathering", short: "Gather", icon: TreePine },
  { value: "base", label: "Base Camp", short: "Camp", icon: TentTree },
  { value: "barracks", label: "Barracks & Forge", short: "Forge", icon: Hammer },
  { value: "arena", label: "Arena", short: "Arena", icon: Swords },
  { value: "leaderboard", label: "Leaderboard", short: "Ranks", icon: Trophy },
  { value: "cave", label: "Cave Hunt", short: "Cave", icon: Skull },
  { value: "campaign", label: "Campaign", short: "Day", icon: Calendar },
  { value: "guild", label: "Guild", short: "Guild", icon: Users },
  { value: "quests", label: "Quests", short: "Quests", icon: ScrollText },
  { value: "stats", label: "Stats", short: "Stats", icon: BarChart3 },
  { value: "prestige", label: "Prestige", short: "Rebirth", icon: Sparkles },
] as const;

export default function Home() {
  useGameLoop();
  const resetGame = useGameStore((s) => s.resetGame);
  const [tab, setTab] = React.useState<(typeof TABS)[number]["value"]>("gather");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll the active tab into view when it changes.
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        const active = scrollRef.current.querySelector('button[class*="amber-950"]') as HTMLElement | null;
        if (active) active.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [tab]);

  const scrollByDir = (dir: 'left' | 'right') => {
    if (scrollRef.current) scrollRef.current.scrollBy({ left: dir === 'left' ? -200 : 200, behavior: 'smooth' });
  };

  const handleReset = () => {
    resetGame();
    toast.success("Game reset", {
      description: "A new campaign begins. Build your empire anew, Commander.",
    });
  };

  return (
    <AuthGate>
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

      {/* Main content */}
      <main className="relative z-10 mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4 sm:py-6">
        {/* Limited-time event banner — shown FIRST at the top */}
        <div className="mb-3">
          <EventBanner />
        </div>

        {/* Resource bar with Level + EXP + ALL resources — shown BELOW event banner */}
        <div className="mb-3">
          <ResourceBar />
        </div>

        {/* Tab bar with visible left/right scroll arrows */}
        <div className="flex items-center gap-1 mb-3">
          <button onClick={() => scrollByDir('left')} className="flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-800 bg-stone-900 text-stone-400 hover:bg-stone-800 hover:text-amber-200" aria-label="Scroll tabs left">
            <ChevronLeft className="size-4" />
          </button>
          <div ref={scrollRef} className="flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}>
            <div className="flex h-auto w-max gap-0.5 rounded-lg border border-stone-800/80 bg-stone-900/70 p-1 backdrop-blur">
              {TABS.map(({ value, label, short, icon: Icon }) => (
                <button key={value} onClick={() => setTab(value)} className={`flex items-center gap-1 rounded-md px-2.5 py-2 text-[11px] font-medium transition-colors sm:gap-1.5 sm:px-3 sm:text-sm ${tab === value ? 'bg-amber-950/60 text-amber-200 shadow-inner' : 'text-stone-300 hover:text-amber-200'}`}>
                  <Icon className="size-3.5 shrink-0 sm:size-4" />
                  <span className="hidden sm:inline">{label}</span>
                  <span className="sm:hidden">{short}</span>
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => scrollByDir('right')} className="flex size-8 shrink-0 items-center justify-center rounded-md border border-stone-800 bg-stone-900 text-stone-400 hover:bg-stone-800 hover:text-amber-200" aria-label="Scroll tabs right">
            <ChevronRight className="size-4" />
          </button>
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
    </AuthGate>
  );
}
