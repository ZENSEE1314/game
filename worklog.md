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

---
Task ID: FE-2
Agent: frontend-styling-expert
Task: Built the UI for the prestige + leaderboard engine modules (Leaderboard tab + Prestige/Rebirth tab) and added an UpgradeButton styling-polish component wired into BaseCamp + BarracksForge. Extended the page shell from 5 to 7 tabs with a horizontally-scrollable mobile tab bar.

Work Log:
- Read worklog.md (full project history) + the new engine modules: types.ts (PrestigeState / PrestigePerk / LeaderboardEntry), prestige.ts (PRESTIGE_PERKS, previewPrestigeGain, canRebirth, perkMultiplier, REBIRTH_MIN_GOLD), leaderboard.ts (playerPowerScore, generateLeaderboard, playerLeaderboardContext), store.ts (rebirth() + allocatePrestigePerk() methods).
- Read existing UI for style consistency: page.tsx, QuestsPanel.tsx, StatsPanel.tsx, StatChip.tsx, ResourceIcon.tsx, AmbientGlow.tsx, BaseCamp.tsx, BarracksForge.tsx, card.tsx, button.tsx, progress.tsx, alert-dialog.tsx, constants.ts (formatNumber).
- Created `src/components/game/ui/UpgradeButton.tsx` ('use client') — a polished composite action button. When `canAfford`: amber (or rose) gradient bg, shadow-lg glow, slow shimmer pulse (Framer Motion `animate opacity [0.25,0.6,0.25]` over 2.4s infinite) + a moving shimmer streak that sweeps across the button every ~4s. `whileHover={{scale:1.02}}` + `whileTap={{scale:0.98}}` for tactile feedback. When `!canAfford`: muted stone bg, disabled, cursor-not-allowed, no animation. Tone prop supports "amber" (forge actions) | "rose" (combat/recruit actions). Children rendered in a z-10 relative span above the shimmer overlays.
- Created `src/components/game/LeaderboardPanel.tsx` ('use client') — the Leaderboard tab. Section header "Leaderboard" with a power-score formula subtitle ("victories×50 + gold÷10 + level×10 + rebirths×500"). "Your Rank" highlight card at top showing rank, power_score, and a gap-to-overtake line ("X power to overtake #N (name)") computed via `playerLeaderboardContext(entries)`. A mini amber gradient progress bar visually compares player vs next-rank-above power. Scrollable list (`max-h-[32rem] overflow-y-auto`) of 21 entries; each row = rank tile (top-3 styled: #1 Crown amber gradient, #2 Medal silver gradient, #3 Medal bronze gradient) + avatar emoji + name + level + "YOU" amber badge (player row) + "★ Rebirthed" amber badge (rebirthed NPCs) + compact victories/battles + gold_looted + big right-aligned mono power score. Player's row is highlighted with an amber gradient border + amber glow shadow. Bottom legend explains all icons. Mobile-only "Above/Below" context chips render the immediate neighbors so the player doesn't have to scroll to find them. Live recomputes from `generateLeaderboard(state)` via `React.useMemo` as state changes.
- Created `src/components/game/PrestigePanel.tsx` ('use client') — the Prestige/Rebirth tab. Animated RotateCcw header (Framer Motion spring entrance) + global multiplier badge. Subtitle explains the rebirth loop. Summary card shows 4 stat tiles (Rebirths / Lifetime Points / Unspent Points prominent / Global Mult ×) plus a current-run-gold progress bar that uses the `floor(sqrt(gold/1000))` formula to compute "X pts earned this run" and "Y gold to next point". Rebirth action card: shows points-to-gain big amber number, a helper-text warning (amber) when not yet eligible with the exact gold gap to 1,000, and a rose-gradient Rebirth button (disabled when `!canRebirth`) wrapped in an AlertDialog confirmation explaining what resets vs. what's preserved. On confirm, calls `rebirth()` and toasts success with the points gained. Prestige Perks grid (1/2/3 cols responsive) of 6 PerkCards — each shows Lucide icon (mapped from perk.icon: Pickaxe/FlaskConical/Coins/Users/Swords/Lock), name, description, effect_label, current `×N.NN` multiplier badge, an invested-pips row (filled amber segments vs empty stone for max_points=10 slots), and an UpgradeButton ("Invest 1 Point" / "No points" / "Maxed"). Maxed perks get a full amber-gradient card treatment with a "★ Maxed" badge. Unspent-points badge floats at the top of the Perks section when > 0.
- Modified `src/app/page.tsx` — extended TABS from 5 to 7 entries (added Leaderboard with Trophy icon + "Ranks" short label, and Prestige with Sparkles icon + "Rebirth" short label). CRITICAL: with 7 tabs at 375px mobile, the original centered TabsList would clip. Wrapped the TabsList in an `overflow-x-auto` scroll container with `[scrollbar-width:none]` + `[&::-webkit-scrollbar]:hidden` for a clean scrollbar-less horizontal swipe. The TabsList is now `flex w-max` so it sizes to its content (allowing overflow) on mobile but still centers comfortably on desktop. Added `shrink-0` to the icons so they don't compress. Rendered `<LeaderboardPanel />` and `<PrestigePanel />` in the tab content alongside the existing 5 panels. Updated header comment to reflect 7-tab shell.
- Modified `src/components/game/BaseCamp.tsx` — replaced the 8 facility Upgrade `<Button>`s with `<UpgradeButton canAfford={canAfford} onClick={handleUpgrade}>`. Removed the now-unused `Button` import. Preserved all existing logic (cost calc, canAfford check, toast messages, icon, label swap to "Not enough resources").
- Modified `src/components/game/BarracksForge.tsx` — replaced 3 buttons with `<UpgradeButton>`: the Recruit button uses `tone="rose"`, and the Forge Weapon + Upgrade Weapon Tier buttons use the default amber tone. The +/- stepper buttons and 1/5/10/Max preset buttons are intentionally left as shadcn `<Button>`s (they're increment/decrement steppers, not upgrade affordance actions). All existing toast messages, cost previews, and tier-upgrade-next-multiplier previews preserved.
- Ran `bun run lint` — passed clean (0 errors).
- Verified via `curl http://localhost:3000/` — HTTP 200. Grepped the rendered HTML for the 7 mobile tab labels (Camp / Forge / Arena / Quests / Stats / Ranks / Rebirth) — all present. Inspected the last 40 lines of dev.log — all successful compiles + 200 responses, no runtime errors after the final edit. (An earlier transient HMR "Fast Refresh had to perform a full reload" warning appeared mid-edit while a broken intermediate version was on disk, but subsequent renders are all clean.)

Stage Summary:
- 3 files created, 3 files modified:
  - NEW `src/components/game/ui/UpgradeButton.tsx` — composite upgrade button with Framer Motion shimmer + hover/tap micro-animations.
  - NEW `src/components/game/LeaderboardPanel.tsx` — competitive leaderboard with player-rank highlight card, top-3 medal styling, gap-to-overtake bar, scrollable 21-entry list.
  - NEW `src/components/game/PrestigePanel.tsx` — rebirth summary + action card with AlertDialog confirmation + 6-perk allocation grid with pips + multiplier badges + UpgradeButton invest actions.
  - MODIFIED `src/app/page.tsx` — 7 tabs (added Leaderboard + Prestige) with horizontally-scrollable mobile tab bar so all 7 fit at 375px.
  - MODIFIED `src/components/game/BaseCamp.tsx` — 8 facility upgrade buttons swapped to `<UpgradeButton>`.
  - MODIFIED `src/components/game/BarracksForge.tsx` — 3 action buttons (Recruit / Forge Weapon / Upgrade Tier) swapped to `<UpgradeButton>` with rose tone for Recruit.
- Design language honored: dark stone-950 base, amber forge-fire primary, emerald for resources, rose for PvP/rebirth, NO indigo/blue. Mono `tabular-nums` on every numeric value. Lucide icons throughout (Trophy, Crown, Medal, RotateCcw, Sparkles, Star, Pickaxe, FlaskConical, etc.). Framer Motion for the rotate-in prestige header, the upgrade-button shimmer pulse + sweep, and the existing tab transitions. Mobile responsive throughout: tab bar scrolls horizontally, grids collapse to 1-col, leaderboard row stats wrap, prestige summary goes 2-col on mobile / 4-col on desktop.
- All prestige/leaderboard engine APIs consumed correctly: `generateLeaderboard`, `playerLeaderboardContext`, `previewPrestigeGain`, `canRebirth`, `perkMultiplier`, `PRESTIGE_PERKS`, `REBIRTH_MIN_GOLD`, store `rebirth()` + `allocatePrestigePerk()`. Toasts fire on every action (rebirth success with points gained, perk investment success, error cases for both).
- Lint clean, dev server HTTP 200, no runtime errors in the most recent log entries. The prestige loop is now fully playable end-to-end: earn gold → see prestige preview grow → rebirth via AlertDialog confirmation → spend points on 6 perks → multipliers apply on next run → leaderboard reflects the rebirth bonus (+500 per rebirth in power score).
- No outstanding issues.

---
Task ID: 7 (webDevReview round 2)
Agent: Main Architect (QA + Prestige/Leaderboard completion + Polish)
Task: Recurring webDevReview — QA, fix bugs, complete the prestige/leaderboard integration started in the previous round, add new UI tabs, and apply styling polish.

## Current Project Status Assessment
Entering this round, the game had 5 working tabs (Base Camp, Barracks/Forge, Arena, Quests, Stats) with quests, achievements, career stats, and combat preview all live. The previous round had started building prestige.ts, leaderboard.ts, types/engine/initial-state updates, and store methods, but the integration was INCOMPLETE: the store's `merge` function didn't backfill the new `prestige` field (crash risk for old saves), `perkMultiplier`/`trackRunGold` weren't defensive against undefined prestige, PvP loot didn't track run gold, and no UI components or tabs existed for Leaderboard/Prestige. QA via agent-browser confirmed no runtime errors on fresh state but the prestige system was non-functional from the UI.

## Completed Modifications This Round

### 1. BUG FIXES (critical for old-save compatibility)
- `src/lib/game/store.ts` — added `prestige: currentState.prestige ?? current.state.prestige` to the persist `merge` function's backfill list, so old saves without the prestige field get the default seeded instead of crashing.
- `src/lib/game/prestige.ts` — made `perkMultiplier()` defensive: `state.prestige?.perks?.[perkId] ?? 0` (was `state.prestige.perks[perkId]`). Made `trackRunGold()` defensive: falls back to `createInitialPrestige()` if prestige is undefined.

### 2. ENGINE COMPLETION
- `src/lib/game/pvp.ts` — `applyBattleToAttacker` now tracks run gold for the prestige/rebirth calc: on attacker victory, calls `trackRunGold(next, result.loot.gold)` to add loot to `prestige.current_run_gold`. Also added `total_gold_earned` stat tracking. Converted `require('./prestige')` to a proper ESM `import { trackRunGold } from './prestige'` (require doesn't work in Next.js ESM).
- `src/lib/game/store.ts` — added `rebirth()` and `allocatePrestigePerk()` store methods. `rebirth()` validates via `canRebirth`, calls `performRebirth`, re-rolls opponents, and surfaces achievement/quest notifications. `allocatePrestigePerk()` calls `allocatePerk` and updates the prestige state.

### 3. NEW UI (Task FE-2 by frontend-styling-expert subagent)
- `src/components/game/LeaderboardPanel.tsx` (NEW) — "Your Rank" highlight card with gap-to-overtake + progress bar; scrollable list of 21 entries (20 NPCs + player) with top-3 medal styling (Crown/Silver/Bronze), avatar emoji, "★ Rebirthed" badges, compact stats, big mono power scores; player row highlighted with amber gradient + "YOU" badge. Live-recomputes via `generateLeaderboard(state)`.
- `src/components/game/PrestigePanel.tsx` (NEW) — summary tiles (rebirths, lifetime points, unspent points, global mult) + current-run-gold progress bar with sqrt-formula "gold to next point" calc; "Rebirth Now" card with AlertDialog confirmation + rose-gradient button (disabled if `!canRebirth`); 6-perk grid (Industrious, Master Refiner, Logistics, Quartermaster, Warmonger, Fortified) with Lucide icon map, ×N.NN multiplier badges, 10-segment invested pips, and UpgradeButton invest actions.
- `src/components/game/ui/UpgradeButton.tsx` (NEW) — polished composite button with Framer Motion: amber/rose gradient, slow shimmer pulse (2.4s) + sweeping highlight streak (~4s) on affordable buttons; whileHover scale 1.02 + whileTap scale 0.98; muted disabled state. Used in BaseCamp (8 facility upgrades) and BarracksForge (recruit/forge/tier).
- `src/app/page.tsx` (modified) — extended to 7 tabs (Base Camp, Barracks & Forge, Arena, Quests, Stats, Leaderboard, Prestige) with Trophy + Sparkles icons; TabsList wrapped in `overflow-x-auto` hidden-scrollbar container for mobile.
- `src/components/game/BaseCamp.tsx` (modified) — swapped 8 Upgrade buttons to UpgradeButton.
- `src/components/game/BarracksForge.tsx` (modified) — swapped Recruit/Forge/Tier buttons to UpgradeButton.

## Verification Results
- `bun run lint` — clean (0 errors).
- agent-browser QA: all 7 tabs render; Leaderboard shows "Your Rank #21/21" with 21 commanders, player row highlighted with "YOU" badge; Prestige panel shows rebirth count, points, perk grid with multipliers.
- End-to-end rebirth flow verified: clicked Rebirth → AlertDialog "Confirm Rebirth" → confirmed → Rebirths: 1, Lifetime Points: 1, Unspent Points: 1, run reset → invested 1 point in Industrious → Unspent: 0, global mult ×1.01, perk button disabled.
- VLM (glm-4.6v) confirmed: mobile 7-tab layout "all 7 tabs fit and remain usable, no layout issues"; leaderboard and prestige panels functional with minor contrast polish opportunities.
- Dev log: all 200 responses, no 500s, no runtime errors.

## Unresolved Issues / Risks
- None blocking. The prestige multiplier is applied at tick-time in the engine (not stored in the displayed `raw_per_sec`), so the resource bar shows base rates while the Prestige tab shows the global multiplier — this is intentional but could confuse some players.
- Minor: VLM suggested subtle row borders in the leaderboard and contrast tweaks for the "Current Run Gold" text — non-blocking polish items.

## Priority Recommendations for Next Phase
1. **Prestige perk effects on non-production systems** — currently only industrious/refining/logistics apply via the engine; quartermaster (troop cap), warmonger (weapon mult), and fortified (vault cap) perks are invested but not yet wired into their respective systems (barracks/forge/vault). Wire them in `actions.ts` and `constants.ts`.
2. **Server-side persistence** — migrate from localStorage to Prisma/SQLite for cross-device progress.
3. **More quest variety** — weekly quests, chain quests, story arcs.
4. **Sound design** — ambient forge/PvP sound effects.
5. **Balance tuning** — the sqrt prestige curve (1000 gold = 1 pt, 100K = 10 pts) may need tuning after playtesting; consider flat bonuses per rebirth tier.

---
Task ID: FE-3
Agent: frontend-styling-expert
Task: Build the limited-time EventBanner UI (renders above tabs when state.active_event is non-null) + apply VLM-driven styling polish to the Leaderboard and Prestige panels.

Work Log:
- Read worklog.md (project history, 7-tab idle game), events.ts (EVENT_POOL + reconcileEvent + eventMultiplier + eventRemainingLabel), types.ts (GameEvent schema + GameState.active_event), and the existing ResourceBar / LeaderboardPanel / PrestigePanel / page.tsx to lock the design language (dark stone-950, amber/emerald/rose, mono tabular-nums, Lucide, Framer Motion, shadcn Card/Badge/Progress, NO indigo/blue).
- CREATED `src/components/game/EventBanner.tsx` ('use client'):
  - Renders ONLY when state.active_event is non-null (reads via `useGameStore((s) => s.state.active_event)`); returns null otherwise via AnimatePresence.
  - Horizontal Card with dark stone gradient background + buff-type-tinted ring + glow shadow (`shadow-{amber|emerald|rose|orange}-900/40`).
  - Left: large event avatar emoji (text-2xl/3xl) in a rounded gradient badge tinted by buff type.
  - Center: event title (text-amber-200 bold), buff-type chip ("Zap 1.5× Raw" / "2× Gold" / "2× PvP Loot" / "1.5× XP" etc.) color-coded gold=amber, raw/refined=emerald, pvp_loot=rose, xp=warm-orange (NEVER blue/indigo), plus a "Limited Event" tag (hidden on mobile). Description below (text-stone-300, text-xs, line-clamp-2).
  - Right: Clock icon + live countdown label ("1h 47m" / "12m") with role=progressbar showing depleting time-remaining as a fraction of the def's total duration (looked up from EVENT_POOL by def_key, falls back to 2h default). Bar is animated via Framer Motion width transition.
  - Local 1s setInterval tick keeps the countdown + bar smooth even if the global tick is briefly delayed (cleanup on unmount).
  - Urgency mode: when <10 min remain, the pulsing glow shadow intensifies + turns rose + the countdown text turns rose-200 (was amber-100) for visual urgency.
  - Framer Motion entrance: slide-down + fade-in with height auto (so layout shifts smoothly). Exit reverses. Subtle infinite boxShadow pulse (2.4s normal, 1.2s urgent) conveys "don't miss this!" urgency.
  - Mobile responsive: avatar shrinks size-12→size-14 sm:, chip text-[10px]→text-[11px] sm:, bar width w-20→w-28 sm:.
- MODIFIED `src/app/page.tsx`:
  - Imported `EventBanner` from `@/components/game/EventBanner`.
  - Inserted `<EventBanner />` (wrapped in a `<div className="mb-3">` for spacing) as the FIRST child of `<main>`, right before the `<Tabs>` block — sits between the sticky ResourceBar and the tab bar, scrolls with content (not sticky).
  - Preserved ALL existing structure: useGameLoop, 7 tabs (Base Camp / Barracks & Forge / Arena / Quests / Stats / Leaderboard / Prestige), AnimatePresence tab transitions, OfflineEarningsModal, BattleReportModal, NotificationToasts, AmbientGlow orbs, sticky footer with Reset Game AlertDialog.
- MODIFIED `src/components/game/LeaderboardPanel.tsx` (VLM polish):
  - Row separators: each LeaderRow now gets `border-b last:border-b-0` — bottom border tints by row type (amber for player via `border-b-amber-700/50`, stone for others via `border-b-stone-800/40` / `border-b-stone-800/50` for top-3). Removed the prior `space-y-1.5` gap on the scroll container so rows sit flush with only the border separator between them (tighter, more scannable rhythm).
  - Player row contrast boost: swapped gradient to `bg-gradient-to-r from-amber-950/50 via-amber-900/30 to-amber-900/20` (more saturated amber, no fade to stone), border to `border-amber-600/60` (per spec), shadow to `shadow-md shadow-amber-900/40`.
  - Rank alignment: kept `size-9 sm:size-10` square medal cells, added explicit `text-center` to the cell + `w-8 text-center` to the inner rank-number span so digits (and the medal icons above them) line up uniformly down the column.
- MODIFIED `src/components/game/PrestigePanel.tsx` (VLM polish):
  - Current Run Gold contrast: label now `text-amber-300 font-semibold` (was text-stone-300), big number now `text-amber-100 text-base font-bold` (was text-amber-200). Also swapped the wrapper border from `border-stone-800/60` to `border-amber-900/40` so the gold block reads as amber-themed.
  - Rebirth button legibility: gradient brightened to `from-rose-500 to-rose-700` (was from-rose-600 to-rose-800), added `font-semibold` + `ring-1 ring-rose-400/40` + `shadow-md shadow-rose-900/50` + explicit `text-rose-50 hover:text-rose-50` so the label stays high-contrast on hover.
  - Prestige Perks section separator: added `border-t border-stone-800/60 pt-3` to the section wrapper (was just `pt-1`) for clear visual hierarchy between the rebirth action card and the perk grid. Bumped the "Prestige Perks" header text from `text-stone-300` to `text-stone-200` for slightly better contrast.
- Verified: `bun run lint` clean (0 errors, 0 warnings). Dev server returns HTTP 200 on `/`. dev.log shows only successful compilations, no runtime errors. agent-browser visual QA confirmed: EventBanner rendered correctly on page load (force-spawned "Timber Festival" 1.5× Raw event with "1h 47m remaining" + 90% depleting bar), all 7 tabs render, Leaderboard and Prestige panels load cleanly, no console errors.

Stage Summary:
- Files created: `src/components/game/EventBanner.tsx` (288 lines, 'use client', Framer Motion + AnimatePresence + local 1s tick).
- Files modified: `src/app/page.tsx` (+5 lines: import + banner wrapper), `src/components/game/LeaderboardPanel.tsx` (row separators + player-row contrast + rank alignment), `src/components/game/PrestigePanel.tsx` (Current Run Gold contrast + Rebirth button legibility + Prestige Perks separator).
- Design language honored throughout: dark stone-950 base, amber primary, emerald for raw/refined events, rose for pvp_loot + Rebirth button, warm orange for XP event, NO indigo/blue. Mono tabular-nums on every numeric value. Lucide icons (Clock, Zap, Sparkles, Trophy, Crown, Medal, RotateCcw, etc.). Framer Motion for entrance/exit + pulsing glow. shadcn Card/Badge/Progress reused (no new primitives). Mobile responsive.
- No outstanding issues. EventBanner correctly renders only when active_event is non-null, exits cleanly when the event expires (AnimatePresence handles the unmount). Countdown + progress bar update every second via local interval + global tick. Color-coded buff chips match the buff_type. Leaderboard rows now have visible separators + brighter player row. Prestige "Current Run Gold" reads clearly amber-100/amber-300. Rebirth button is high-contrast rose with ring + shadow. Prestige Perks section is visually separated from the rebirth action card.

---
Task ID: 8 (webDevReview round 3)
Agent: Main Architect (QA + Prestige perk bug fix + Help Guide)
Task: Recurring webDevReview — QA, fix the critical prestige perk wiring bug (quartermaster/warmonger/fortified perks were invested but had no effect), fix the beforeunload race condition, add a How-to-Play guide for new-player onboarding.

## Current Project Status Assessment
Entering this round, the game had 7 working tabs (Base Camp, Barracks/Forge, Arena, Quests, Stats, Leaderboard, Prestige) with quests, achievements, career stats, combat preview, prestige/rebirth, leaderboard, and limited-time events all live. The previous round's #1 recommendation was: "Wire the remaining prestige perks (quartermaster/warmonger/fortified) into their systems — currently only industrious/refining/logistics apply via the engine." QA via agent-browser confirmed this was a FUNCTIONAL BUG: players could invest prestige points in 3 perks that did nothing.

## Completed Modifications This Round

### 1. CRITICAL BUG FIX: Prestige perks now fully wired
The previous round added `syncDerived` to `reconcileOnLoad` and `allocatePrestigePerk`, but:
- **Warmonger perk was NOT applied on load** — weapon multipliers stayed at base (1.0) even with points invested. Fixed by adding `applyWarmongerPerk(state, weaponMultiplierForTier(...))` to `reconcileOnLoad` in `src/lib/game/store.ts` so weapon multipliers get the warmonger bonus on every load.
- Verified end-to-end via a dev-only store exposure (`window.__gameStore`): cheated 10 points + perks {quartermaster:3, fortified:2, warmonger:1}, reloaded, and confirmed:
  - Fortified (2pts × 15%): vault = 3500 × 1.3 = 4550 ✓
  - Quartermaster (3pts × 10%): troop cap = 30 × 1.3 = 39 ✓
  - Warmonger (1pt × 3%): attack_mult = 1.03, defense_mult = 1.03 ✓
- Verified allocate flow: clicking "Invest 1 Point" in Quartermaster immediately increased troop cap from 39 → 42 (30 × 1.4) and decremented unspent points 10 → 9.
- Removed the dev-only store exposure after testing.
- Files: `src/lib/game/store.ts` (reconcileOnLoad warmonger application), `src/lib/game/prestige.ts` (applyWarmongerPerk helper — already existed from prior round), `src/lib/game/constants.ts` (recomputeDerived accepts optional vault/troopCap mults), `src/lib/game/initial-state.ts` (syncDerived passes fortified + quartermaster mults).

### 2. BUG FIX: beforeunload race condition
- `src/hooks/useGameLoop.ts` — added a `hydratedRef` (useRef) that gates the `beforeunload`/`visibilitychange` save handler. Before this fix, a reload fired BEFORE the async `rehydrate()` completed would call `tick()` which persists the empty initial state (perks={}, run_gold=0) over the saved state, wiping progress. Now `onHide` returns early if `!hydratedRef.current`, so pre-rehydrate reloads cannot corrupt saved state. The ref is set to `true` only after `await useGameStore.persist.rehydrate()` resolves.

### 3. NEW FEATURE: How-to-Play Guide
- `src/components/game/HelpGuide.tsx` (NEW) — a "How to Play" modal triggered from the footer. 8 accordion sections explaining every game system: Resources & Refining, Army & Weapons, Arena & PvP Combat, Rewarded Ads (3 types), Quests & Achievements, Rebirth & Prestige, Limited-Time Events, Leaderboard. Each section has a themed Lucide icon badge. A "New" pulse badge appears on the trigger button until the player opens the guide once (tracked in localStorage `idle-war-help-seen`). Dialog is scrollable (max-h-[85vh]) with an Accordion (first section expanded by default). Mobile-friendly (button label hidden on small screens, just the icon).
- `src/app/page.tsx` (modified) — added `<HelpGuide />` to the footer next to the Reset Game button, wrapped both in a flex container. Preserved all existing structure (7 tabs, EventBanner, modals, AmbientGlow, sticky footer).

## Verification Results
- `bun run lint` — clean (0 errors).
- agent-browser QA: all 7 tabs render, EventBanner shows active events (King's Bounty, Blood Feud seen across reloads), HelpGuide modal opens with all 8 sections, no runtime errors.
- Prestige perk verification (via dev store exposure): fortified vault 3500→4550, quartermaster troopcap 30→39, warmonger mult 1.0→1.03, all applied on load + on allocate.
- Allocate flow verified: clicking "Invest 1 Point" in Quartermaster immediately boosted troop cap 39→42.
- VLM (glm-4.6v) confirmed: HelpGuide is "clear, well-organized, explains core mechanics for new players, no visual issues."
- Dev log: all 200 responses, no 500s, no runtime errors.

## Unresolved Issues / Risks
- None blocking. All 6 prestige perks now function correctly across load/allocate/rebirth.
- The beforeunload gate prevents pre-rehydrate state corruption; the legitimate persistence flow (in-memory store is source of truth) works correctly.

## Priority Recommendations for Next Phase
1. **Server-side persistence** — migrate from localStorage to Prisma/SQLite for cross-device progress. The API routes already exist; wire the store to sync via API.
2. **More quest variety** — weekly quests, chain quests, story arcs.
3. **Sound design** — ambient forge/PvP sound effects (currently visual-only).
4. **Balance tuning** — the sqrt prestige curve (1000 gold = 1 pt, 100K = 10 pts) may need tuning after playtesting.
5. **Tutorial overlay** — for first-time players, a step-by-step spotlight tour pointing at the ResourceBar, Base Camp upgrade buttons, etc. (the HelpGuide covers this textually, but a visual tour would be more engaging).

---
Task ID: 9 (User-driven redesign + new gameplay systems)
Agent: Main Architect
Task: Major redesign per user request — fix hydration error, add arena stamina (5 max, +1/3h, HH:MM:SS timer), tap-to-collect resource nodes (tree/mine/farm images) with tool upgrades, cave hunting (3/day, levels, items), and market to sell items. Reorganize tabs to be user-friendly.

## Current Project Status Assessment
User reported a hydration mismatch error (browser extension adding style attributes to body/header) and requested a major redesign: simpler/more intuitive UI, arena attack limits with a visible timer, tappable resource nodes with images and upgradeable tools, a cave hunting system with monster items, and a market. The game had 7 tabs (Base Camp, Barracks/Forge, Arena, Quests, Stats, Leaderboard, Prestige) + events + prestige + sound system all working.

## Completed Modifications This Round

### 1. CRITICAL FIX: Hydration mismatch error
- `src/app/layout.tsx` — added `suppressHydrationWarning` to the `<body>` element. The error was caused by a browser extension injecting `style={{padding-top:"38px"}}` into body and `data-zai-hidden="true"`/`style={{display:"none"}}` into the header. React's `suppressHydrationWarning` on `<html>` didn't propagate to `<body>`. Adding it to `<body>` lets React ignore extension-injected attribute differences. Verified: no hydration errors in console after reload.

### 2. NEW ENGINE: Arena Stamina System (`src/lib/game/stamina-tap.ts`)
- `ArenaStamina` type: current/max/next_regenerate_at/regenerate_interval_ms. Max 5, +1 every 3 hours.
- `reconcileStamina(state, now)` — called every tick; adds regenerated points (handles multi-point offline catch-up).
- `consumeStamina(state)` — called before each attack; returns ok=false if 0 stamina.
- `refillStamina(state)` — full refill for the rewarded-ad hook.
- `staminaCountdownLabel(state)` — returns "HH:MM:SS" countdown string.
- Wired into store: `tick()` calls `reconcileStamina`; `attackOpponent()` calls `consumeStamina` first (blocks attack with "No arena stamina left!" reason); new `refillStaminaAd()` store method.

### 3. NEW ENGINE: Tap-to-Collect Nodes (`src/lib/game/stamina-tap.ts`)
- `TapNodesState` type: axe_level, pickaxe_level, sickle_level, per-node cooldown timestamps.
- 3 nodes: Tree (wood, axe), Mine (stone+iron, pickaxe), Farm (gold, sickle). 5s cooldown per node.
- `tapYield(state, node)` — yields scale with tool level (e.g. wood = 5 + 3×(axe_level-1)).
- `tapNode(state, node, now)` — grants yield + sets cooldown. **BUG FIXED**: was adding `y.gold` (undefined for tree/mine) causing NaN gold; guarded with `if (y.gold)`.
- `upgradeTool(state, tool)` — costs gold + refined iron + refined wood (geometric scaling).
- Wired into store: `tapResourceNode(node)` + `upgradeToolLevel(tool)` methods.

### 4. NEW ENGINE: Cave Hunting + Market (`src/lib/game/cave-market.ts`)
- `MONSTER_ITEMS` — 12 items across 4 rarities (common: wolf_tooth/bat_wing/rat_tail; uncommon: lion_skin/bear_claw/spider_silk; rare: troll_hide/wyvern_scale/golem_core; epic: phoenix_feather/dragon_heart/kraken_eye). Each has sell_price (50–5000 gold).
- `CAVES` — 3 caves: Whispering Cavern (tier 1, 1h cooldown, 80% success), Irondeep Mine (tier 2, 4h, 60%), Volcanic Depths (tier 3, 8h, 40%). Each has a weighted loot table.
- `CaveState` — entries_today (max 3/day), next_reset_at (24h), last_entered per cave.
- `performCaveHunt(state, caveId, now)` — consumes entry, sets cooldown, rolls success (boosted by player level), rolls weighted loot. Returns CaveHuntResult.
- `sellItem(state, itemId, qty)` — sells from inventory for gold.
- `rarityColor(rarity)` — UI helper (common=stone, uncommon=emerald, rare=amber, epic=rose).
- Wired into store: `huntCave(caveId)` + `sellInventoryItem(itemId, qty)` methods; `tick()` calls `reconcileCave` for daily reset.

### 5. NEW UI: Tap Nodes, Cave Hunt, Arena Stamina panels
- Generated 4 AI images (1024×1024) via z-ai CLI → `public/nodes/{tree,mine,farm,cave}.png`.
- `src/components/game/TapNodesPanel.tsx` (NEW) — 3 tappable node cards with images, pulsing glow ring when ready, cooldown overlay, yield preview, tool-level badge, UpgradeButton per tool. Re-renders every 500ms for cooldowns.
- `src/components/game/CaveHuntingPanel.tsx` (NEW) — daily-entries card (3/3 with reset countdown), 3 cave cards (image + tier badge + success% + HH:MM:SS cooldown + loot preview + Enter button), inventory grid with rarity-tinted item cards + Sell buttons.
- `src/components/game/Arena.tsx` (modified) — added `StaminaPanel` (stamina pips 5/5, HH:MM:SS countdown, +1/3h label, Refill-via-Ad button opening AdModal). Imported `staminaCountdownLabel` + `Clock` icon.
- `src/app/page.tsx` (modified) — reorganized to 9 tabs with Gathering first (default tab) for intuitive active-play entry: Gathering, Base Camp, Barracks & Forge, Arena, Cave Hunt, Quests, Stats, Leaderboard, Prestige. Added TreePine + Skull icons.
- `src/components/game/HelpGuide.tsx` (modified) — added "Active Gathering (Tap Nodes)" + "Cave Hunting & Market" sections; updated PvP section to mention stamina; updated Ads section to 4 types (added Stamina Refill).

### 6. BUG FIX: NaN gold from tap nodes
- `src/lib/game/stamina-tap.ts` — `tapNode` was adding `y.gold` (undefined for tree/mine) to player gold, causing NaN. Fixed with `if (y.gold)` guard.
- `src/lib/game/constants.ts` — `formatNumber` now returns '0' for NaN/Infinity as a safety net.

## Verification Results
- `bun run lint` — clean (0 errors).
- agent-browser QA: all 9 tabs render; Gathering tab shows 3 tappable node images (tree/mine/farm); tapping Gold Farm increased gold 3→16; Arena stamina shows 5/5 then 4/5 after attack with HH:MM:SS countdown "02:59:05"; Cave Hunt shows 3 caves with images, entering consumed 1 entry (3→2) and yielded 2× Wolf Tooth; Market sold 1 Wolf Tooth for 50 gold.
- Hydration error: GONE (suppressHydrationWarning on body fixed the extension-injected attribute mismatch).
- VLM confirmed: mobile 9-tab layout "tabs fit, Gathering content is clear."
- Dev log: all 200 responses, no 500s after the NaN fix.

## Unresolved Issues / Risks
- None blocking. All new systems (stamina, tap nodes, cave hunting, market) verified end-to-end.
- Minor: cave hunt result isn't returned from the store (only success/failure); the UI toasts a generic "Check your inventory" message. Could be enhanced to show the specific loot in a result modal.

## Priority Recommendations for Next Phase
1. **Cave hunt result modal** — show the specific item dropped (or "failed") in a result dialog after each hunt.
2. **Market buy** — currently only sell; add a buy tab where players can purchase upgrade materials with gold.
3. **Tool upgrade prestige** — make tool levels persist through rebirth (currently reset).
4. **Stamina for cave entries** — consider a shared energy system or keep separate.
5. **More node types** — fishing pond, herb garden for alchemy recipes.

---
Task ID: 10 (webDevReview round 4 — UX polish + market improvements)
Agent: Main Architect
Task: Recurring webDevReview — QA, fix the #1 priority (cave hunt result modal), add bulk-sell to market, and add tap-feedback animations.

## Current Project Status Assessment
The game has 9 tabs (Gathering, Base Camp, Barracks/Forge, Arena, Cave Hunt, Quests, Stats, Leaderboard, Prestige) with arena stamina, tap nodes, cave hunting, market, events, prestige, and sound all working. QA confirmed no runtime errors. The #1 recommended improvement from the previous round was the cave hunt result modal — currently the UI shows a generic "Check your inventory" toast instead of the specific loot. This is a significant UX gap since the player doesn't know what they got (or if they failed) without switching to the inventory.

## Completed Modifications This Round

### 1. FIX: Cave hunt result modal (was #1 priority)
- `src/lib/game/store.ts` — updated `huntCave` interface + implementation to return `{ success, reason?, result?, caveName? }` instead of just `{ success, reason? }`. The `result` (CaveHuntResult) + `caveName` are now returned so the UI can show the specific outcome.
- `src/components/game/CaveHuntingPanel.tsx` — added `HuntResultModal` component:
  - Success state: green check circle (spring-bounce animation), "HUNT SUCCESSFUL!" label, the specific item card (avatar + name + rarity badge + ×quantity + total gold value), rarity-tinted border/background.
  - Failure state: red X circle, "HUNT FAILED" label, "The monster escaped. You got nothing this time." message.
  - Framer Motion spring entrance for the result icon + staggered fade-in for the item card.
  - Close button.
- Removed the generic "Check your inventory" toast; replaced with the modal that shows exactly what happened.

### 2. NEW FEATURE: Bulk sell in market
- `src/lib/game/store.ts` — added `sellAllItems(rarity?)` store method. Sells all items (optionally filtered by rarity) in one operation, returning `{ goldGained, count }`. Iterates the inventory, calls `sellItem` for each, accumulates gold + count.
- `src/components/game/CaveHuntingPanel.tsx` — added a "Sell All" button in the Inventory & Market header. On click, calls `sellAll()` and toasts "Sold N items +X gold" (or "Nothing to sell" if empty).

### 3. STYLING: Tap feedback animation
- `src/components/game/TapNodesPanel.tsx` — added a floating "+yield" text animation on each tap. When the player taps a node, a Framer Motion `motion.div` renders the yield text (e.g. "+5 🪵") that floats up 40px while fading in/out over 1 second, with an amber glow drop-shadow. Uses a `floatId` state key to re-trigger the animation on each tap.

## Verification Results
- `bun run lint` — clean (0 errors).
- agent-browser QA: cave hunt result modal shows "HUNT SUCCESSFUL!" with item details (🦁 Lion Skin, UNCOMMON, ×1, Worth 150 gold) on success, and "HUNT FAILED" with escape message on failure. "Sell All" button sold all items (gold 569→719, +150). Tap nodes show floating yield text on tap.
- No runtime errors, no hydration errors, all 9 tabs functional.
- Dev log: all 200 responses.

## Unresolved Issues / Risks
- None blocking. The cave hunt flow is now complete with a satisfying result modal.
- Minor: the floating tap text only shows on the gatherer's own tap (not on passive ticks); this is intentional for active-play feedback.

## Priority Recommendations for Next Phase
1. **Market buy tab** — currently only sell; add a buy tab where players can purchase upgrade materials or rare items with gold.
2. **Tool upgrade prestige** — make tool levels persist through rebirth (currently reset).
3. **Crafting** — combine monster items into permanent gear upgrades (e.g. 10 Wolf Teeth → +1% attack trinket).
4. **Cave entry via ad** — allow 1 extra daily cave entry via a rewarded ad.
5. **More node types** — fishing pond, herb garden for alchemy recipes.
