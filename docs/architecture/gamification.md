# Gamification Architecture

Four independent engines plus one coordinator. Each engine owns its rules and
its own persistence. The coordinator owns **nothing** but the pipeline.

## Intended flow

```
Domain Event  (workout completed, week completed, assessment completed, ...)
        ↓
GamificationOrchestrator
        ↓
XP Engine          (XPService)            → how much XP, idempotency, history
        ↓
Progression Engine (ProgressionService)   → level curve, level-ups, level history
        ↓
Achievement Engine (AchievementService)   → unlock evaluation and progress
        ↓
Consolidated GamificationResult
        ↓
Presentation Layer (GamificationHost, modals, dashboard cards)
```

**The Orchestrator coordinates. It does not own XP, level or achievement
rules.** It contains no formula, no threshold and no reward table.

## XPService — `src/services/xp/`

- Owns the XP table for every event type (`xpRules.ts`, pure).
- Idempotent per `(userId, eventType, sourceId)` — replaying an event does not
  double-award.
- Persists `xp_history` and `user_stats`, then publishes `onXPApplied`.

## ProgressionService — `src/services/progression/`

- Level curve: `increment(n) = 25n² + 25n + 200`, 100+ levels
  (`levelCurve.ts`, pure).
- `levelRules.ts` computes snapshots and level transitions without touching IO.
- Persists `user_progression` (state) and `level_history` (idempotent history
  via a unique `(user_id, new_level)` constraint).
- Subscribes to the XP bus at import time — importing
  `@/services/progression` guarantees the engine is wired.

## AchievementService — `src/services/achievements/`

- 34-entry catalog in `achievements` plus `achievementCatalog.ts`.
- Four evaluation models: boolean, cumulative, streak, duration.
- Unlocks award their own XP **through XPService** — they never write XP rows
  directly.
- Publishes unlocks on `achievementEvents.ts`.

## GamificationOrchestrator — `src/services/gamification/`

- Built with `createGamificationOrchestrator(engines)`: engines are injected
  as ports, which is what makes the pipeline testable with fakes.
- `stage()` wraps every step: a thrown error is logged and folded into
  `result.errors`, the pipeline continues, and a partial result is returned.
- `gamificationResults.ts` holds the pure folding logic (`withXP`,
  `withProgression`, `withAchievements`, `withStats`, `withWeekly`,
  `withPluginOutput`, `finalize`).
- `registerEngine(plugin)` is the extension point for future engines (Goals,
  Nutrition, Notifications, AI Coach, Daily Rewards, Season Pass) — adding one
  requires **zero** changes to the pipeline.
- `getSnapshot()` is a read-only projection so the Dashboard consumes the
  Orchestrator instead of reaching into individual engines.

## Presentation

| Layer            | Modules                                                                    |
| ---------------- | --------------------------------------------------------------------------- |
| Hooks            | `useGamification`, `useLevelProgress`, `useWorkoutRewards`, `usePlayerProgression`, `useAchievements`, `useXPHistory` |
| Host             | `GamificationHost.tsx` — subscribes to the result bus and sequences celebrations |
| Celebrations     | `WorkoutCompleteScreen`, `LevelUpModal`, `AchievementModal`                  |
| Cards            | `PlayerLevelCard`, `PlayerStatsCard`, `RecentAchievementsCard`, `XPHistoryCard`, `LevelHistoryCard`, `AchievementGrid` |
| Design tokens    | `rarity.ts` (Common → Legendary), `badges.tsx`, `progress-bars.tsx`, `CountUp.tsx` |
| Routes           | `/jogador`, `/conquistas`, `/xp`, `/niveis`                                  |

UI components read the consolidated result. They never recompute XP, levels or
unlock conditions for display.
