"use client";

/**
 * HelpGuide — a "How to Play" modal triggered from the footer.
 *
 * Explains the core game loops: resources, refining, army, PvP, prestige,
 * events, and the 3 rewarded-ad hooks. Uses an Accordion for scannable
 * sections. A "First Time" badge pulses on the trigger button if the
 * player hasn't opened the guide yet (tracked in localStorage).
 */

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HelpCircle,
  TreePine,
  Hammer,
  Swords,
  Sparkles,
  Zap,
  Coins,
  Users,
  Shield,
  RotateCcw,
  Trophy,
  ScrollText,
} from "lucide-react";

const SECTIONS = [
  {
    id: "resources",
    icon: TreePine,
    title: "Resources & Refining",
    body: "Your Base Camp produces three raw materials — Wood, Stone, and Iron — at a rate set by your Gatherer facilities. Refineries automatically convert raw materials into refined materials (2 raw → 1 refined) at their processing rate. Refined materials are spent on upgrades, troops, and weapons. Upgrade your gatherers and refineries in the Base Camp tab to boost production.",
  },
  {
    id: "army",
    icon: Users,
    title: "Army & Weapons",
    body: "Recruit troops at the Barracks (costs gold + refined iron + refined wood). Your troop capacity is set by your Barracks level. Forge weapons at the Blacksmith to increase your Battle Score. Upgrading weapon tier raises your attack and defense multipliers. More troops + better weapons = higher Battle Score.",
  },
  {
    id: "pvp",
    icon: Swords,
    title: "Arena & PvP Combat",
    body: "Attack NPC opponents in the Arena. Battle Score = your troops × your attack multiplier vs their troops × their defense multiplier. Highest score wins (ties go to the defender). The combat preview shows your odds before you attack. On victory, you loot 10% of the defender's unsecure gold + 10% of their refined wood/iron. Both sides ALWAYS take casualties: attacker loses 5% troops + 5% weapons; defender loses 10% + 10%.",
  },
  {
    id: "ads",
    icon: Zap,
    title: "Rewarded Ads (3 types)",
    body: "Watch a simulated ad for a bonus: (1) Offline Double — 2× your offline earnings when you return. (2) Peace Shield — 3 hours of protection from raids (stacks to 24h). (3) Conscription — instantly restore 25% of troops lost in your most recent battle. Ads are simulated; no real ads are shown.",
  },
  {
    id: "quests",
    icon: ScrollText,
    title: "Quests & Achievements",
    body: "Daily quests (3 random + 1 elite) rotate every 24h. Complete them by performing the tracked action, then claim rewards (gold, refined materials, XP). Achievements unlock permanently when you hit career stat milestones — check the Stats tab to see your progress.",
  },
  {
    id: "prestige",
    icon: RotateCcw,
    title: "Rebirth & Prestige",
    body: "Once you've earned 1,000 gold in a single run, you can Rebirth. This resets your facilities, army, resources, and gear — but preserves your career stats, achievements, and quests. You earn Prestige Points (based on run gold via a sqrt curve) that you can invest in 6 permanent perks: Industrious (raw/s), Master Refiner (refined/s), Logistics (gold/s), Quartermaster (troop cap), Warmonger (weapon mult), and Fortified (vault cap). These multipliers apply to ALL future runs.",
  },
  {
    id: "events",
    icon: Sparkles,
    title: "Limited-Time Events",
    body: "Random events spawn periodically (and always one on login if none is active). They grant a temporary multiplier to a specific system — gold, raw materials, refining, PvP loot, or XP — for 1–3 hours. Watch the banner above your tabs for active events and their countdown.",
  },
  {
    id: "leaderboard",
    icon: Trophy,
    title: "Leaderboard",
    body: "Your Power Score = victories×50 + gold looted÷10 + level×10 + rebirths×500. You're ranked against 20 NPC commanders. Climb the ranks by winning battles, looting gold, leveling up, and rebirthing. Each rebirth adds 500 power, reflecting your permanent progress.",
  },
];

const HELP_SEEN_KEY = "idle-war-help-seen";

export function HelpGuide() {
  const [open, setOpen] = React.useState(false);
  const [seen, setSeen] = React.useState(true);

  // Check localStorage on mount to see if the guide has been opened.
  React.useEffect(() => {
    try {
      setSeen(localStorage.getItem(HELP_SEEN_KEY) === "1");
    } catch {
      setSeen(false);
    }
  }, []);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && !seen) {
      try {
        localStorage.setItem(HELP_SEEN_KEY, "1");
      } catch {
        // ignore
      }
      setSeen(true);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="relative gap-1.5 border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800 hover:text-amber-200"
        >
          <HelpCircle className="size-3.5" />
          <span className="hidden sm:inline">How to Play</span>
          {!seen && (
            <Badge
              className="absolute -right-1.5 -top-1.5 size-2 animate-pulse rounded-full bg-amber-500 p-0"
              aria-label="New"
            />
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg gap-0 overflow-y-auto border-stone-700 bg-stone-950 p-0 text-stone-100">
        <DialogHeader className="gap-1 border-b border-stone-800 p-4">
          <DialogTitle className="flex items-center gap-2 text-amber-100">
            <HelpCircle className="size-5 text-amber-400" />
            How to Play Idle War
          </DialogTitle>
          <DialogDescription className="text-stone-400">
            A quick guide to the core mechanics. Tap any section to expand.
          </DialogDescription>
        </DialogHeader>
        <Accordion type="single" collapsible defaultValue="resources" className="px-4 py-2">
          {SECTIONS.map(({ id, icon: Icon, title, body }) => (
            <AccordionItem key={id} value={id} className="border-stone-800">
              <AccordionTrigger className="gap-2 py-3 text-left text-sm font-semibold text-stone-200 hover:text-amber-200 hover:no-underline">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-md bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/30 [&_svg]:size-3.5">
                  <Icon />
                </span>
                {title}
              </AccordionTrigger>
              <AccordionContent className="pb-3 pl-8 pr-1 text-[13px] leading-relaxed text-stone-400">
                {body}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
        <div className="flex items-center justify-center gap-1.5 border-t border-stone-800 p-3 text-[11px] text-stone-500">
          <Coins className="size-3 text-amber-500" />
          <span>Progress auto-saves to your browser. Clearing cache resets the game.</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
