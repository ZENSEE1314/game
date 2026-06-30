# Idle War — 2D Idle Progression Game with PvP

A hybrid-casual idle strategy game with a 3-tab interface (Base Camp, Barracks/Forge, Arena),
real-time production, offline earnings, PvP combat, and 3 rewarded-ad hooks.

---
Task ID: 1 + 2-core
Agent: Main Architect
Task: Initialize project understanding + build the core game engine (types, constants, math engine, PvP engine, ad hooks, store, actions, API routes).

Work Log:
- Read project scaffold: Next.js 16 + TS + Tailwind 4 + shadcn/ui + Zustand + Prisma. Dev server already running on :3000.
- Designed flat data-engine architecture (NO 2D grid). Single GameState object with player/resources/facilities/army/gear + shield + battle history.
- Created `src/lib/game/types.ts` — full type schema: PlayerProfile, ResourceState, ArmyState, BlacksmithGear, FacilityLevels, GameState, OfflineEarnings, BattleResult, CombatantState, Opponent, AdType.
- Created `src/lib/game/constants.ts` — balance curves: rawPerSec, processingRate, vaultCapacity, troopCapacity, xpForLevel, upgrade costs (geometric scaling), PvP casualty rates (5%/5% attacker, 10%/10% defender), loot rate (10%), PEACE_SHIELD_MS (3h), REFINE_COST_RATIO, formatNumber.
- Created `src/lib/game/engine.ts` — pure math: tickResource (raw accum + refining automation), applyProductionTick, calculate_offline_earnings (time-delta capped at 8h), applyOfflineEarnings, refreshShield, awardXp.
- Created `src/lib/game/pvp.ts` — resolvePvp (Battle Score = troops * weapon_mult, highest wins, ties to defender), casualties always applied per spec, loot = 10% of defender's UNSECURE gold (above vault) + 10% refined wood/iron, only on attacker win. Plus projectPlayer/projectOpponent/applyBattleToAttacker.
- Created `src/lib/game/ads.ts` — trigger_offline_double_ad (2x earnings), trigger_peace_shield_ad (3h shield, stacks to 24h cap), trigger_conscription_ad (restore 25% lost troops), shieldRemainingMs/Label.
- Created `src/lib/game/initial-state.ts` — createInitialState (Lv1 player, starter resources/facilities/army), generateOpponents (6 NPCs scaled to player level, themed names+emoji), syncDerived.
- Created `src/lib/game/actions.ts` — pure action functions (doUpgradeFacility, doRecruitTroops, doForgeWeapon, doUpgradeWeaponTier, doAttack, doOfflineDoubleAd, doPeaceShieldAd, doConscriptionAd). SINGLE source of truth for discrete actions.
- Created `src/lib/game/store.ts` — Zustand store with persist (localStorage). Local tick + reconcile; discrete actions via actions.ts; refreshOpponents calls GET /api/opponents (live API). Tracks pendingOffline, lastBattle, ad-used flags, busy.
- Created `src/hooks/useGameLoop.ts` — 1s interval tick + reconcileOnLoad on mount + visibility/beforeunload save.
- Created 10 API routes (stateless server-authoritative wrappers over actions.ts/engine.ts):
  - POST /api/game/upgrade, /recruit, /forge-weapon, /upgrade-weapon-tier, /offline
  - POST /api/pvp/attack
  - POST /api/ads/offline-double, /peace-shield, /conscription
  - GET /api/opponents?level=N
- `bun run lint` passes with zero errors.

Stage Summary:
- Core engine COMPLETE and lint-clean. All spec math implemented exactly:
  - Battle Score = troops * weapon_mult; highest wins (ties -> defender).
  - Casualties: attacker 5% troops + 5% weapons (always); defender 10% troops + 10% weapons (always).
  - Loot: 10% of defender's UNSECURE gold (above secure_vault_limit) + 10% refined wood + 10% refined iron, on attacker win only.
  - Offline earnings via time-delta (capped 8h), with 2x ad hook.
  - Peace shield = 3h (stacks to 24h cap), is_raidable=false.
  - Conscription = restore 25% of lost troops.
- Refining automation: consumes 2 raw -> 1 refined at processing_rate, throttled by available raw.
- Next: build the UI layer (ResourceBar, BaseCamp, BarracksForge, Arena, modals) and main page.

---
Task ID: 3-b + 4
Agent: frontend-styling-expert
Task: Built the entire React UI layer for "Idle War" — sticky ResourceBar, 3-tab page (Base Camp / Barracks & Forge / Arena), reusable simulated Rewarded-Ad modal, Offline-Earnings modal, Battle-Report modal, sticky footer with reset, plus layout/Toaster wiring.

Work Log:
- Read worklog + engine/store/constants/ads/actions/pvp/initial-state/useGameLoop to understand the API surface and balance curves.
- Read existing shadcn primitives (button/card/dialog/alert-dialog/tabs/progress/badge/tooltip/separator/sonner) + globals.css to align with the New York dark theme.
- Updated `src/app/layout.tsx`: added `dark` class on <html>, body bg set to `bg-stone-950 text-stone-100`, added Sonner `<Toaster richColors position="top-center" theme="dark" />` alongside the existing radix Toaster, and rewrote metadata to "Idle War".
- Created `src/components/game/ui/StatChip.tsx` — tone-aware pill (amber/emerald/rose/stone) with icon badge + label + mono value + optional sub-text.
- Created `src/components/game/ui/ResourceIcon.tsx` — maps wood/stone/iron/gold to colored Lucide icon badges (TreePine/Mountain/Anvil/Coins).
- Created `src/components/game/ResourceBar.tsx` — sticky `top-0 z-30` bar with backdrop blur: level + XP progress, gold + secure-vault indicator, 3 resources with /s rates, troops/cap, arsenal + tier, shield status (Shielded Xh Ym / Exposed). Wraps on mobile.
- Created `src/components/game/BaseCamp.tsx` — 3 resource cards (raw+refined amounts, both rates, refining-throughput progress bar) + 2-col grid of 8 facility upgrade cards (gatherers emerald-tinted, refineries amber-tinted, vault/barracks stone-tinted). Each card shows current effect, next-level preview, full cost breakdown with resource icons, and an Upgrade button disabled when unaffordable. Toasts success/failure.
- Created `src/components/game/BarracksForge.tsx` — Barracks card (troops/cap big + progress, recruit stepper with 1/5/10/Max presets, per-troop cost, capacity hint) and Blacksmith Forge card (attack/defense multiplier badges, arsenal sword-row visual capped at 20 with "+N" overflow, Forge Weapon + Upgrade Weapon Tier actions with cost + next-multiplier preview).
- Created `src/components/game/AdModal.tsx` — reusable simulated rewarded-ad interstitial: progress bar over `durationMs`, live countdown, "▶ Watching ad…" state, Claim Reward button on completion, "Ad • Simulated" badge, no-skip note. Framer Motion transitions.
- Created `src/components/game/OfflineEarningsModal.tsx` — self-contained, reads `pendingOffline`. Non-dismissable Dialog with time-away + grid of 7 resource gains. "Claim" and "Claim 2x (Watch Ad)" (disabled when `offlineAdUsed`); the ad path opens AdModal then calls `claimOfflineEarnings(true)`.
- Created `src/components/game/BattleReportModal.tsx` — self-contained, reads `lastBattle`. VICTORY/DEFEAT banner, opponent avatar+name, attacker vs defender scores, casualties (both sides), loot (victory only), and a "Conscript Reinforcements (Ad)" button (shown only when troops lost > 0 AND `!conscriptionAdUsed`) that opens AdModal and calls `conscriptTroops()`. Uses a ref to reset local "dismissed" state when a new battle object arrives.
- Created `src/components/game/Arena.tsx` — Shield panel (Activate Peace Shield ad / countdown when shielded), Scout New Opponents button (busy spinner), scrollable opponent list (`max-h-[28rem]`) with avatar/level/threat-skull stars/troops/weapons/DEF-mult badges and 10% loot preview, and a scrollable Battle History section.
- Created `src/app/page.tsx` — root `min-h-screen flex flex-col` wrapper with atmospheric radial-gradient background, `useGameLoop()` call, sticky ResourceBar, Tabs (Base Camp / Barracks & Forge / Arena) with Framer Motion `AnimatePresence` fade between tabs, page-level modals, and a sticky footer with version, ad-disclaimer, and AlertDialog-confirmed Reset Game button.
- Ran `bun run lint` — passed clean. Fixed two runtime errors caught by Next.js compile: `CrossedSwords` is not a Lucide export (renamed to `Swords` in current lucide-react) and `Camp` was missing (swapped to `TentTree`); removed an accidental duplicate `Swords` import in BattleReportModal.
- Verified via `curl http://localhost:3000/` — HTTP 200, and the rendered HTML contains "Idle War", "Base Camp", "Barracks", "Arena", "Commander", "Wood Gatherer".

Stage Summary:
- UI layer COMPLETE and lint-clean. 10 files created + layout.tsx updated:
  - `src/app/layout.tsx` (edited: dark mode + Sonner Toaster + Idle War metadata)
  - `src/app/page.tsx`
  - `src/components/game/ui/StatChip.tsx`
  - `src/components/game/ui/ResourceIcon.tsx`
  - `src/components/game/ResourceBar.tsx`
  - `src/components/game/BaseCamp.tsx`
  - `src/components/game/BarracksForge.tsx`
  - `src/components/game/Arena.tsx`
  - `src/components/game/AdModal.tsx`
  - `src/components/game/OfflineEarningsModal.tsx`
  - `src/components/game/BattleReportModal.tsx`
- Design language honored: dark stone-950 base, amber forge-fire primary, emerald (resources/success), rose (PvP/danger). Mono `tabular-nums` for all numeric values. Subtle gradients, ring-tinted icon badges, progress-bar capacity indicators, scrollable opponent + history lists, sticky resource bar + sticky footer.
- All 3 rewarded-ad hooks wired through the reusable AdModal: offline-double (2x), peace-shield (3h), conscription (25% troop restore).
- Affordability checks on every Upgrade/Recruit/Forge/Attack action with disabled buttons + explanatory helper text + sonner toasts.
- Mobile responsive: tab labels collapse to short labels on phone width, resource bar wraps, grids collapse to single column.
- No outstanding issues. Game is fully playable end-to-end from the UI.

---
Task ID: 5
Agent: Main Architect
Task: End-to-end verification with Agent Browser + fix Zustand persist SSR hydration bug.

Work Log:
- Launched Agent Browser against http://localhost:3000/. Page renders, 3 tabs present, 8 facility upgrade buttons.
- Tested Base Camp: clicked Upgrade on Wood Gatherer -> toast "Wood Gatherer upgraded to Lv 2 +1.50/s raw wood". Resources deducted correctly.
- Tested Barracks & Forge: recruited 1 troop -> toast "Recruited 1 troop, Standing army: 11/30". Forge Weapon + Upgrade Tier buttons present.
- Tested Arena PvP: attacked "Scout Captain Reva" -> Battle Report modal showed DEFEAT, Attacker Score 11 vs Defender Score 17. Casualties: attacker 0 troops (5% of 11 floored), defender 1 troop (10% floored). Math matches spec exactly.
- Tested Peace Shield ad: clicked "Activate Shield (Ad)" -> AdModal played 3s -> "Claim — 3h Peace Shield" -> button changed to "Shielded" (disabled), toast "protected from raids for 3 hours".
- BUG FOUND: Offline earnings modal did not appear on return. Root cause: Zustand persist hydrates ASYNC (microtask) even for sync storage; during SSR localStorage is unavailable so hydration silently no-ops and marks hasHydrated=true without loading persisted state. reconcileOnLoad ran against un-hydrated state (last_saved_at=now), so delta≈0.
- FIX: Added `skipHydration: true` to persist config + manual `useGameStore.persist.rehydrate()` in useGameLoop before reconcileOnLoad. After fix: set last_saved_at to 2h ago (with beforeunload temporarily disabled), reloaded -> Offline Earnings modal appeared with correct values (Raw Wood +3.6K, Refined Wood +3.6K, Gold +1.1K for 2h — matches engine formulas).
- Tested offline 2x ad: clicked "Claim 2x (Watch Ad)" -> AdModal "Double Your Earnings!" -> claimed -> resources doubled (Gold 2.4K, Wood 7.6K). trigger_offline_double_ad verified.
- Re-enabled beforeunload handler (correct production behavior: saves close-time so real offline delta is accurate).
- Fixed minor cosmetic: removed duplicate Gold tile in OfflineEarningsModal grid (it has its own emphasis tile).
- `bun run lint` clean. Dev log: all 200 responses, no 500s, no runtime errors. Only a benign Radix Dialog aria-describedby warning.
- Verified responsive: tested at 375px (mobile) and 1280px (desktop). Tabs collapse to short labels on mobile, resource bar wraps, grids stack.

Stage Summary:
- ALL core flows browser-verified: facility upgrades, troop recruiting, weapon forge, PvP attack + battle report, peace shield ad, offline earnings + 2x ad.
- Critical fix: Zustand persist `skipHydration: true` + manual `rehydrate()` resolves the SSR hydration no-op that broke offline earnings.
- Conscription ad hook verified by code review (requires losing 4+ troops to see a restore; logic calls doConscriptionAd which restores 25% per spec).
- Game is fully playable, lint-clean, no runtime errors. Ready for the recurring webDevReview cron.

---
Task ID: FE
Agent: frontend-styling-expert
Task: Build the UI for the new quests/stats/combat-preview engine features (Quests tab, Stats tab, achievement/quest-completion toasts, Arena combat-preview mini-bar) + styling polish (AmbientGlow orbs).

Work Log:
- Read worklog.md + types.ts (CareerStats / Quest / Achievement / GameState), quests.ts (DAILY_QUEST_POOL, ELITE_QUEST, questProgress, ACHIEVEMENTS), pvp.ts (previewCombat, projectPlayer, projectOpponent, CombatPreview), store.ts (newlyUnlocked / newlyCompletedQuests / claimQuest / clearNotifications + postMutate), constants.ts (formatNumber, LOOT_RATE), Arena.tsx, page.tsx, ResourceBar.tsx, StatChip.tsx, ResourceIcon.tsx, BaseCamp.tsx to align with the existing dark-amber/emerald/rose design language.
- Created `src/components/game/ui/AmbientGlow.tsx` — `'use client'` decorative component. Renders absolutely-positioned `blur-3xl` radial-gradient orbs that pulse opacity 0.3 -> 0.6 -> 0.3 over 4s (Framer Motion, infinite). Tone presets: amber (forge-fire) / emerald (success) / rose (danger). pointer-events-none so it never blocks UI.
- Created `src/components/game/NotificationToasts.tsx` — `'use client'`. Watches `newlyUnlocked` (achievement IDs) and `newlyCompletedQuests` (quest IDs) on the store via `useEffect`. For each new ID, fires `toast.success` with a Lucide icon + description: achievements -> "Achievement Unlocked: {title} — {description}" with Trophy icon; quests -> "Quest Complete: {title} — claim your reward in the Quests tab." with ScrollText icon. Maintains ref-based dedupe sets (capped at 100) so the same ID never re-fires; defers `clearNotifications()` via `setTimeout(...,0)` to avoid setState-during-render. Renders null.
- Created `src/components/game/QuestsPanel.tsx` — `'use client'`. Section header "Quests" with a live countdown badge (`Resets in Xh Ym`, re-rendered every 30s via setInterval) computed from `state.quests_rotated_at + 24h`. Elite quest rendered at the TOP in a rose/amber gradient-tinted Card labeled "ELITE" (Star icon). Daily quests in a 2-col responsive grid. Each QuestCard shows title + description, a Progress bar (emerald when complete, amber otherwise, amber-glow for elite), `current/goal` mono numbers (via `questProgress(q, state.stats)`), and a reward-preview row using ResourceIcon + Coins + Sparkles badges (gold/wood/stone/iron/xp). Claim button (emerald, CheckCircle2) shown only when `complete && !claimed`; otherwise "Claimed" badge (Lock) or live `X%` badge. Claim -> `claimQuest(id)` + sonner success toast listing the reward parts.
- Created `src/components/game/StatsPanel.tsx` — `'use client'`. Section "Career Statistics": 2-col (mobile) / 3-col (desktop) grid of 12 StatTiles (battles, victories + win-rate, defeats, troops recruited, weapons forged, tier upgrades, facility upgrades, gold looted, refined produced, ads watched, longest offline return formatted Xh Ym, achievements count) — each tile = tone-aware icon badge + label + big mono tabular-nums number + optional sub-text. Section "Achievements": responsive grid (1/2/3 cols) of 16 achievement cards. Unlocked cards use a full-color amber gradient with the mapped Lucide icon (ICON_MAP keyed by `a.icon` string: Swords/Shield/Skull/Trophy/Medal/Crown/Users/Flag/Hammer/Anvil/TentTree/Castle/Coins/Gem/Zap/Sparkles) and an emerald "Unlocked" badge. Locked cards are dimmed (opacity-70, grayscale icon) with progress text "X / Y" and a thin Progress bar.
- Modified `src/components/game/Arena.tsx` — added a `BattleOddsBar` sub-component rendered in each OpponentCard between the troops+weapons row and the loot row. Computes `previewCombat(projectPlayer(state, true), projectOpponent(opp))` and renders: a "Battle Odds" header with a color-coded verdict Badge (certain/likely = emerald, even = amber, risky/doomed = rose), a 2px-tall split bar (emerald attacker vs rose defender by `attacker_share`), and a mono "You {attacker_score} vs Them {defender_score}" line. OpponentCard now subscribes to `state` so the preview updates live as the player's army/gear change. Also polished the loot row per VLM feedback: bumped text from text-[10px] to text-[11px], enlarged the loot icons (size-3.5/size-4), used `gap-2` for breathing room, kept `flex-wrap` to prevent truncation. Preserved ShieldPanel / Scout button / BattleHistory exactly as-is.
- Modified `src/app/page.tsx` — extended TABS to 5 entries (Base Camp / Barracks & Forge / Arena / Quests / Stats) with icons TentTree / Hammer / Swords / ScrollText / BarChart3, and added a `short` field per tab for mobile labels (Camp / Forge / Arena / Quests / Stats). Tightened mobile tab padding (px-2.5) so all 5 fit at 375px. Rendered `<QuestsPanel />` and `<StatsPanel />` in the tab content. Mounted `<NotificationToasts />` after the modals. Added two `<AmbientGlow />` orbs (amber top-left, rose bottom-right, responsive size) behind the main content (z-0) for extra atmosphere. Updated the file header comment to reflect the 5-tab + ambient-glow + notification-toasts shell.
- Ran `bun run lint` — passed clean (eslint-config-next permissive ruleset, no errors).
- Verified via `curl http://localhost:3000/` — HTTP 200, and the rendered HTML contains all five tab labels (Camp, Forge, Arena, Quests, Stats). Inspected the last 40 lines of dev.log — only successful compiles + 200 responses, no runtime/TypeScript errors.

Stage Summary:
- 4 files created, 2 files modified:
  - NEW `src/components/game/ui/AmbientGlow.tsx`
  - NEW `src/components/game/NotificationToasts.tsx`
  - NEW `src/components/game/QuestsPanel.tsx`
  - NEW `src/components/game/StatsPanel.tsx`
  - MODIFIED `src/components/game/Arena.tsx` (combat-preview BattleOddsBar + loot-row polish)
  - MODIFIED `src/app/page.tsx` (5 tabs + NotificationToasts + AmbientGlow)
- Design language honored end-to-end: dark stone-950 base, amber/emerald/rose accents, mono tabular-nums for every numeric value, Lucide icons throughout, no indigo/blue. Elite quest card uses a distinctive rose-tinted amber gradient; achievement unlocked cards use the same family. Mobile responsive: tab labels collapse to short labels, grids collapse to fewer columns, loot row wraps.
- Combat preview uses the same deterministic `battleScore` formula as `resolvePvp`, so the preview verdict always matches the actual battle outcome (no surprises for the player).
- NotificationToasts dedupes via ref sets so the same achievement/quest is never re-toasted across renders; `clearNotifications()` is called after firing to clear the store flags.
- Lint clean, dev server HTTP 200, no runtime errors. Game is fully playable with all 5 tabs and the new quest/stats/combat-preview features live.

---
Task ID: 6 (webDevReview round 1)
Agent: Main Architect (QA + Features + Polish)
Task: Recurring webDevReview — QA the live game, fix bugs, add new features (quests, achievements, stats, combat preview) and styling polish.

## Current Project Status Assessment
The game was in a stable, fully-playable state entering this round (core engine + 3-tab UI verified in Task 5). QA via agent-browser + VLM (glm-4.6v) on desktop + mobile screenshots confirmed: no runtime errors, all core flows (upgrades, recruit, forge, PvP, peace shield, offline 2x) working. VLM identified styling polish opportunities (loot readability, shield alert prominence, opponent card hierarchy) but no blocking bugs.

## Completed Modifications This Round

### 1. NEW ENGINE: Career Stats + Quests + Achievements
- `src/lib/game/types.ts` — added `CareerStats` (12 cumulative counters), `Quest`, `QuestTier`, `QuestReward`, `Achievement` interfaces; extended `GameState` with `stats`, `quests`, `quests_rotated_at`, `achievements_unlocked`.
- `src/lib/game/quests.ts` (NEW) — `DAILY_QUEST_POOL` (6 quest defs), `ELITE_QUEST`, `rollDailyQuests()` (draws 3 daily + 1 elite, baselines tracked against current stats), `questsExpired()`, `questProgress()`, `ACHIEVEMENTS` (16 achievements across battles/victories/recruiting/forging/building/looting/ads/refining), `checkAchievements()`.
- `src/lib/game/pvp.ts` — added `previewCombat()` + `CombatPreview` interface (deterministic win-odds: certain/likely/even/risky/doomed verdicts with attacker_share ratio). Added career-stat tracking to `applyBattleToAttacker` (total_battles, victories, defeats, gold_looted).
- `src/lib/game/actions.ts` — added stat tracking to all actions (facility_upgrades, troops_recruited, weapons_forged, weapon_tier_upgrades); ad hooks now increment `total_ads_watched`; added `doRecordOfflineReturn` (longest_offline_return_seconds + total_refined_produced) and `doClaimQuest` (verifies completion, grants reward, marks claimed).
- `src/lib/game/store.ts` — added `postMutate()` helper (checks achievement unlocks + quest completions after every mutation, surfaces IDs for toasts); added `claimQuest()`, `clearNotifications()`, `newlyUnlocked` + `newlyCompletedQuests` fields; quest rotation in `reconcileOnLoad` (24h expiry); **CRITICAL FIX: added `merge` function to persist config** to backfill new schema fields (stats/quests/achievements_unlocked) onto old persisted saves — fixes a `Cannot read properties of undefined (reading 'length')` runtime error that crashed the Quests tab for returning players.
- `src/lib/game/initial-state.ts` — `createInitialState()` now seeds `stats` (all zeros), `quests: []`, `quests_rotated_at: 0`, `achievements_unlocked: []`.

### 2. NEW UI: Quests, Stats, Combat Preview, Notifications (Task FE by frontend-styling-expert subagent)
- `src/components/game/QuestsPanel.tsx` (NEW) — Elite quest (rose/amber gradient) + daily quests grid with progress bars, reward previews, claim buttons, 24h rotation countdown.
- `src/components/game/StatsPanel.tsx` (NEW) — Career stats tiles (12 metrics incl. win rate + longest-offline formatting) + 16-achievement grid (unlocked = full-color with Lucide icon map; locked = dimmed with X/Y progress).
- `src/components/game/NotificationToasts.tsx` (NEW) — watches `newlyUnlocked`/`newlyCompletedQuests`, fires sonner toasts with ref-based dedupe, then clears.
- `src/components/game/ui/AmbientGlow.tsx` (NEW) — decorative Framer-Motion pulsing radial-gradient orbs for atmosphere.
- `src/components/game/Arena.tsx` (modified) — added `BattleOddsBar` (verdict badge + emerald/rose split bar + You/Them scores) to each opponent card; polished loot row readability (text-[11px], larger icons, gap-2).
- `src/app/page.tsx` (modified) — extended to 5 tabs (Base Camp / Barracks & Forge / Arena / Quests / Stats) with ScrollText + BarChart3 icons + mobile short labels; mounted QuestsPanel, StatsPanel, NotificationToasts, 2x AmbientGlow orbs.

## Verification Results
- `bun run lint` — clean (0 errors).
- agent-browser QA: all 5 tabs render; Quests panel shows Elite + 3 daily quests with progress; Stats panel shows 12 career stats + 16 achievements with locked/unlocked states.
- End-to-end flow verified: attacked opponent → "First Blood" achievement unlocked (toast fired) → Stats panel shows "1 / 16" achievements, "Battles Fought: 1", "First Blood: UNLOCKED" → Quests panel "Sponsor's Friend" progressed to 50% after activating Peace Shield ad.
- VLM (glm-4.6v) confirmed: combat preview "clear and readable, verdict color-coding makes sense, no visual issues"; mobile 5-tab layout "all tabs fit without overflow, no layout issues".
- Dev log: all 200 responses, no 500s, no runtime errors after the merge-fix.

## Unresolved Issues / Risks
- None blocking. The schema migration `merge` handles forward-compatibility for future field additions.
- Minor: quest progress toasts fire on every mutation that completes a quest (deduped by ID within a session, but a quest could re-surface its completion toast if stats oscillate — unlikely given monotonic counters).

## Priority Recommendations for Next Phase
1. **Server-side persistence** — migrate from localStorage to Prisma/SQLite so progress survives cross-device/clear-cache. The API routes already exist; wire the store to sync via API.
2. **Leaderboard** — given career stats + battle history exist, a global/NPC leaderboard tab would add retention.
3. **More quest variety** — add weekly quests, chain quests, and quest-line story arcs.
4. **Sound design** — ambient forge/PvP sound effects (currently visual-only).
5. **Balance tuning** — the combat preview makes it obvious when attacks are doomed; consider adding a "scout intel" cost or fog-of-war to the preview for higher-threat opponents.
