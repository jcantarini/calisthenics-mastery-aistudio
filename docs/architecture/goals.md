# Goals Domain (Sprints 7.1–7.5)

> Status: implemented through Sprint 7.5B. Final release approval remains
> governed by [goals-release-gate.md](./goals-release-gate.md), which is
> currently PARTIALLY VALIDATED (manual UX walkthrough pending). This document
> describes the code as it exists, not planned work.

## Goals Core (Sprint 7.1)

New domain added **after** Core Architecture v1.0 was frozen. Goals extends the
architecture; it changes no existing domain.

## Purpose

Own everything about user goals: definition, lifecycle, progress, validation,
completion rules, persistence and queries.

The Goals domain does **not** own XP, levels, achievements, workout generation,
training-plan execution, notifications or nutrition.

## Modules

```
src/services/goals/
  GoalService.ts      // single source of truth, persistence + orchestration
  goalRules.ts        // pure rules: progress, completion, expiration, transitions
  goalValidation.ts   // pure input validation, typed results
  goalEvents.ts       // typed event contracts + local bus
  goalTypes.ts        // domain model, unions, GoalError
  goals.test.ts       // pure domain tests
  releaseContract.test.ts // integrated release contract tests (Sprint 7.5B)
src/hooks/useGoals.ts // thin React access layer (async resilience)
src/hooks/asyncResource.ts // pure async state model
src/hooks/mutationFlow.ts  // pure mutation + awaited refresh model
src/routes/_authenticated/metas.tsx // Goals Home (final product UI)
```

## Goal types

`workout_frequency`, `workout_count`, `streak`, `strength`, `duration`,
`training_time`, `program`, `skill`, `body_weight`, `body_measurement`, `custom`.

Categories: `fitness`, `strength`, `consistency`, `skill`, `program`, `body`,
`custom`.

## Progress semantics

Behaviour is driven by `progressType`, never by the title:

| progressType   | Fold rule       | Allowed units                                            |
| -------------- | --------------- | -------------------------------------------------------- |
| `count`        | accumulate      | workouts, repetitions, days                              |
| `threshold`    | best value wins | repetitions, seconds, kilograms, centimeters, percentage |
| `duration`     | accumulate      | seconds, minutes                                         |
| `cumulative`   | accumulate      | minutes, seconds, workouts, repetitions                  |
| `streak`       | best value wins | days                                                     |
| `target_value` | best value wins | kilograms, centimeters, percentage, repetitions          |
| `boolean`      | 0 or 1          | boolean                                                  |

**Normalization is deliberate:** `percentage` is clamped to 0–100 and
`currentValue` in a `GoalProgress` is clamped to the target, while `rawValue`
keeps the real achievement (12 pull-ups against a target of 10 stays 12).

## Lifecycle

```
draft ──▶ active ──▶ completed   (terminal)
  │         │  ├──▶ cancelled    (terminal)
  │         │  └──▶ expired      (terminal)
  │         ▼
  │       paused ──▶ active | cancelled | expired
  └──▶ cancelled
```

`validateGoalTransition()` is the only authority. Completed goals never become
active again — restarting is an explicit `duplicateGoal()`.

## Service API

`createGoal`, `getGoal`, `getGoals`, `getActiveGoals`, `getCompletedGoals`,
`updateGoal`, `deleteGoal`, `activateGoal`, `pauseGoal`, `resumeGoal`,
`cancelGoal`, `completeGoal`, `getGoalProgress`, `updateGoalProgress`,
`evaluateGoal`, `duplicateGoal`.

Errors are thrown as `GoalError` with codes `validation_failed`,
`invalid_transition`, `not_found`, `unauthenticated`, `persistence_failed`.
Raw database messages never reach the UI.

## Idempotency

- `completeGoal()` on an already completed goal is a no-op returning the goal.
- Transitions use an optimistic `.eq("status", previous)` guard, so a
  concurrent double-complete produces one state change and one event.
- `updateGoalProgress()` returns early for completed goals and for no-op deltas.

## Persistence

Table `public.user_goals` — `user_id` references `auth.users(id)
ON DELETE CASCADE`, CHECK constraints on status / target / current value and the
"completed implies completed_at" invariant, `set_updated_at` trigger, and
indexes on `(user_id, status, created_at DESC)` and `(user_id, target_date)`.

RLS: a single `FOR ALL TO authenticated` policy scoped to `auth.uid() = user_id`,
with Data API grants for `authenticated` and `service_role` only. `user_id` is
always resolved server-side from the session, never taken from client input.

## Events

`goal_created`, `goal_activated`, `goal_progress_updated`, `goal_completed`,
`goal_paused`, `goal_resumed`, `goal_cancelled`, `goal_expired`.

`GoalCompletedEvent` carries a `sourceId` used for idempotent rewards. The
Goals → Gamification bridge subscribes to this bus exactly once, at the moment
the Goals barrel (`src/services/goals/index.ts`) is first imported.

## Integration boundaries (implemented)

- **Automatic tracking (7.2):** producers emit `GoalProgressSignal` through
  `GoalTrackingService`; goals are updated only via `GoalService`.
- **Gamification (7.3):** `goal_completed` → GamificationOrchestrator →
  XPService → ProgressionService → AchievementService. GoalService never awards
  XP and never unlocks achievements.
- **Reward recovery (7.3B):** missing pipeline executions are reconciled from
  the deterministic XP source reference.
- **UI + Dashboard (7.4–7.5):** `/metas` is the product Goals experience and the
  Dashboard shows a spotlight card plus authoritative recent goal rewards.

---

# Automatic Goal Tracking (Sprint 7.2)

Goals now react to real activity. Tracking **detects** progress; it never
persists goal state and never awards rewards.

```
Authoritative domain event
        ↓
GoalTrackingService      (matching + idempotency)
        ↓
GoalService              (single source of truth)
        ↓
goalRules                (fold, completion)
        ↓
Supabase (user_goals)
```

## Modules

```
src/services/goals/
  GoalTrackingService.ts   // orchestration, ledger, failure isolation, reconcile
  goalTrackingRules.ts     // pure matching, time windows, value derivation
  goalTrackingTypes.ts     // activity events, ports, typed tracking result
  goalTracking.test.ts     // 37 tests
```

## Supported events and matching

| Activity event               | Goal types updated                                                       |
| ---------------------------- | ------------------------------------------------------------------------ |
| `workout_completed`          | `workout_count`, `workout_frequency`, `training_time`                    |
| `exercise_completed`         | `strength`, `duration` (matched by `metadata.exerciseId`)                |
| `training_week_completed`    | `program` with `metadata.scope = "week"`                                 |
| `training_program_completed` | `program` (default scope)                                                |
| `streak_updated`             | `streak`                                                                 |
| `skill_achieved`             | `skill` (matched by `metadata.skillId`)                                  |
| `body_measurement_recorded`  | `body_weight`, `body_measurement` (matched by `metadata.measurementKey`) |

Matching lives in `matchGoalToEvent(goal, event)` — one typed rule per event
kind, returning either a typed match or the reason it was ignored
(`not_active`, `out_of_window`, `no_rule`, `already_processed`, `no_change`).

Identifiers are always stable slugs, never translated display text.

## Threshold vs cumulative

The goal's `progressType` — not its title — decides the fold:

- `threshold` / `target_value` / `streak` / `boolean`: **best value wins**.
  A 9-rep session after a 7-rep best stores 9; a later 6-rep session keeps 9.
  Tracking feeds the _best single set_ (`repetitions`, `seconds`).
- `count` / `cumulative` / `duration`: **accumulate**. Tracking feeds workout
  totals (`totalRepetitions`, `totalSeconds`), so 50 + 70 = 120.

`training_time` uses the **actual** workout duration (`started_at` →
`completed_at`) and only falls back to the estimate when no real duration exists.

## Time windows

Domain date logic uses UTC date keys (same convention as the training runtime),
never locale-formatted UI strings.

- Events before `startDate` are ignored.
- Events after `targetDate` are ignored.
- `workout_frequency` goals use their own window: `startDate → targetDate`,
  defaulting to 7 days from `startDate`.

Only `active` goals are tracked; `draft`, `paused`, `completed`, `cancelled`
and `expired` goals are ignored.

## Directional body goals

Minimal extension, no schema change: `goal.metadata.direction` is
`increase` | `decrease` | `reach`, with `metadata.baselineValue` as the
starting measurement.

For `increase` / `decrease`, `targetValue` is the **required change**
(82 kg → 75 kg is `targetValue = 7`, `baselineValue = 82`, `direction =
"decrease"`). Observed progress = `baseline - measurement` (or the inverse for
`increase`), clamped at 0. This keeps the frozen "higher is better" completion
rule correct in both directions, and a wrong-direction measurement never counts
as progress.

## Idempotency

Table `public.goal_progress_events` is the persisted ledger:

`user_id`, `goal_id`, `source_event_id`, `source_event_type`,
`progress_delta`, `observed_value`, `metadata`, `processed_at`, with
`UNIQUE(goal_id, source_event_id, source_event_type)`, FKs with
`ON DELETE CASCADE`, an index on `(user_id, goal_id, processed_at DESC)` and a
single `FOR ALL TO authenticated` RLS policy scoped to `auth.uid() = user_id`.

Flow: **claim → apply → settle**. The claim insert happens first, so duplicate
delivery loses the unique-constraint race and is skipped. If the GoalService
update fails, the claim is released, making retries safe. Protection therefore
survives refresh, app restart, network retry and duplicate delivery.

Source ids: workout id, `workoutId:exerciseId`, `planId:week-N`, planId,
`date:streak`, skillId, measurement id.

## Concurrency

Two layers prevent lost updates:

1. `GoalService.updateGoalProgress` writes with a compare-and-set guard on
   `current_value` and re-reads + retries (up to 4 attempts) when another
   writer moved the value.
2. `GoalTrackingService` serializes work per goal inside the tab.

## Automatic, manual and pending

| Goal type                                             | Mode                                                                                                     |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `workout_count`, `workout_frequency`, `training_time` | automatic                                                                                                |
| `program` (program and week scope), `streak`          | automatic                                                                                                |
| `strength`, `duration`                                | hybrid — automatic once per-exercise performance events are emitted by the workout runtime; manual today |
| `skill`                                               | hybrid — pending a `skill_achieved` producer                                                             |
| `body_weight`, `body_measurement`                     | pending — typed integration point ready, no authoritative measurement store yet                          |
| `custom`                                              | manual                                                                                                   |

Manual progress remains available. Automatic tracking is preferred whenever
authoritative data exists; the ledger prevents an automatic update from
double-counting a source event.

## Reconciliation

`GoalTrackingService.reconcileGoal(goalId)` replays already completed workouts
of the **active plan** (bounded to the last 200) through the same idempotent
pipeline. Only `workout_count`, `workout_frequency` and `training_time` goals
are reconcilable — exercise, skill and body history has no authoritative store
yet (Phase 8).

## Failure isolation

Training integration calls `trackSafely()` inside its own `try/catch` in
`TrainingPlanService.completeWorkout`. A tracking failure is logged and
returned in the typed result; workout completion and the training runtime
always succeed.

## Rewards — Sprint 7.3 (Goals x Gamification)

Goals never calculate XP, levels or achievements. `GoalService` only emits
`goal_completed`; every reward consequence comes from the existing pipeline:

```
GoalService (status -> completed)
  -> goal_completed event
  -> goalGamification bridge (lazy import, one direction only)
  -> GamificationOrchestrator.processGoalCompleted()
  -> XP -> Progression -> Achievements -> consolidated GamificationResult
```

### Difficulty

`user_goals.difficulty` is `easy | medium | hard | epic` (default `medium`).
It is a Goals-domain attribute; the **XP domain** owns the prices in
`src/services/xp/xpRules.ts`:

| Difficulty | XP  |
| ---------- | --- |
| easy       | 50  |
| medium     | 100 |
| hard       | 200 |
| epic       | 400 |

Unknown or missing difficulty falls back to the `medium` tier.

### Idempotency

The bridge derives a deterministic reference `goal_completed:<goalId>`
(`goalCompletionSourceId`). XPService already enforces uniqueness on
`(user, event_type, source_id)`, so a duplicate event, a retry after a lost
response, an app restart or a re-emitted completion award XP exactly once —
and therefore create no duplicate level history and no duplicate unlocks.

Achievement counting uses an **authoritative absolute update**: the bridge
reads `GoalService.countCompletedGoals()` and passes it as
`payload.goalsCompleted`, so `goals_completed` is set, never incremented.
When the count is unavailable the engine falls back to a safe increment and
XP is still awarded.

### Failure isolation

The bridge is fully wrapped: a gamification failure is logged and swallowed,
so goal completion, tracking and workout completion always succeed. Both
manual completion and automatic tracking travel the same single pipeline.

### UI

`GamificationHost` reuses the shared celebrations for goal completions
(level-up modal and achievement modals). In addition,
`GoalCompletionRewardDialog` presents the completion reward and reads the XP
amount **only** from the persisted XP ledger entry
(`goal_completed:<goalId>`); when the entry is not readable yet it shows a
pending state instead of inventing a value.

---

# Goal Reward Recovery (Sprint 7.3B)

## Failure scenario

A goal can be persisted as `completed` while the in-memory `goal_completed`
event never finishes the Gamification pipeline (crash, lost network, app
closed). The goal stays completed forever, but XP, level and achievement side
effects never happened.

## Deterministic reward identity

`goal_completed:<goalId>` (`goalCompletionSourceId`, XP domain) is the
authoritative proof that goal-completion XP ran. No new table, no new column:
recovery asks the XP domain through `XPService.hasProcessedSource(type,
sourceId, userId)`.

## Module

`src/services/goals/GoalRewardRecovery.ts` — `createGoalRewardRecovery(ports)`
(pure, port-driven) plus the live `GoalRewardRecoveryService`, which lazily
imports GoalService, XPService and the orchestrator.

Public API:

- `reconcileCompletedGoalRewards(userId)` → typed report
  `{ scanned, alreadyProcessed, recovered, skipped, failed, errors, entries }`
- `reconcileGoalReward(goalId, userId)` — diagnostics / targeted retry
- `reconcileSafely(userId)` — fire-and-forget

**GoalRewardRecovery does NOT own rewards.** It only reconciles a missing
execution of the existing pipeline:

```
GoalRewardRecovery -> GamificationOrchestrator.processGoalCompleted
                   -> XPService -> ProgressionService -> AchievementService
```

It never writes XP, levels or achievements, and never touches goal state
(no reopen, no re-complete, no rewrite of `completed_at`).

## Eligibility and historical boundary

A goal is reconciled only when `status = completed`, `completed_at` is present,
`completed_at >= GOAL_REWARDS_ACTIVATED_AT` and the XP source is unprocessed.
The activation boundary is the Sprint 7.3 migration instant
(`2026-08-10T19:41:17.000Z`, the `user_goals.difficulty` migration), so goals
completed before Goals × Gamification existed are never retro-awarded.
Difficulty is read from persisted state, never recalculated.

## Bounded reconciliation

Newest-first `completed_at` query, `LIMIT 50`
(`GoalService.getRecentCompletedGoals`). Reliability, not analytics.

## Idempotency, retry and partial failure

Running reconciliation ten times equals running it once: XP idempotency on
`(user, event_type, source_id)` blocks duplicate XP, hence duplicate level
history; achievements use the authoritative absolute `goalsCompleted` count.
Goals are processed sequentially; a failing goal is recorded in `errors` and
never stops the others, and a later run retries it safely.

## Trigger

One non-blocking React host in `src/routes/__root.tsx` fires the service once
per authenticated session (initial session, `SIGNED_IN`) and again on the
`online` event. It never blocks rendering or authentication, and failures are
logged only. The method is reconnect-safe and can also be called manually.

## Observability

Logs reconciliation start and the final counters (scanned / recovered /
already processed / skipped / failed). No secrets, no database internals.

---

# Goals UI (Sprints 7.4A–7.4B)

The Goals experience is a product surface, not a validation page. All UI is
presentation only: no percentage, completion rule or lifecycle decision is
recomputed in a component.

## Goals Home — `src/routes/_authenticated/metas.tsx`

Orchestration only: loading/refreshing state from `useGoals`, mutations through
`useGoalMutations` → `GoalService`, and canonical progress from
`buildGoalProgress`. Composition:

```
GoalsSummary      aggregate counters (singular/plural aware)
GoalsFilters      active | paused | completed | all
GoalCard          per-goal summary + progress
GoalDetails       lifecycle actions + manual progress
GoalCreationWizard    creation
GoalCompletionRewardDialog   authoritative reward presentation
GoalsSkeleton / GoalsEmptyState / ErrorState
```

Filters are a **button group** (`role="group"` + `aria-pressed`), not a tablist:
no tab panel exists, so tab semantics would be a lie to assistive technology.

## Creation wizard

`GoalCreationWizard.tsx` + pure modules:

- `goalTemplates.ts` — 11 templates, custom kinds, `GoalDraft`, bounds,
  `validateDraft`, and `buildCreateGoalInput` (the only draft → domain adapter).
- `wizardNavigation.ts` — maps an invalid field to the step that owns it and to
  the element that must receive focus.
- `numericInput.ts` — locale-tolerant decimal parsing (comma or period), bounds,
  integer and `min + k * step` grid validation.
- `radioNavigation.ts` — roving tabindex: arrows, Home, End, Enter and Space,
  exactly one tabbable option per group.
- `goalSubmissionGuard.ts` — single-flight guard: a second submit while one is
  in flight is dropped, so no duplicate goal is ever created.

Every template and custom-kind preset is proven valid and step-aligned by test,
so selecting a preset can never produce an initially invalid draft.

## Manual progress

`manualProgress.ts` + `GoalManualProgress.tsx`. Manual controls appear only for
active goals whose tracking mode is `manual` or `pending`. Values are validated,
previewed with the canonical `foldProgress`, and submitted as a single
`GoalProgressSignal` through `GoalService.updateGoalProgress`, which is also the
only path that can complete a goal. There is no parallel completion path.

## Dashboard integration

`goalsDashboard.ts` (pure) + `GoalsDashboardCard.tsx` and
`RecentGoalRewardsCard.tsx`. The Dashboard route loads goals once and passes
them down as props; recent rewards are read from the XP ledger and matched to
goals by the deterministic source reference.

## Tracking capability presentation

`goalTrackingCapability.ts` returns `auto | manual | pending` for a goal, and
`GoalTrackingBadge` renders that truth. A goal type without an authoritative
producer is labelled `pending`, never "automatic".

---

# Resilience, localization and accessibility (Sprint 7.5A)

## Async resilience

`asyncResource.ts` and `mutationFlow.ts` are pure models used by `useGoals`:

- latest-request-wins: a superseded response is dropped;
- unmount safety: no state update after unmount;
- initial load vs background refresh are distinct states;
- a failed refresh keeps the previously loaded data usable;
- `pending` stays true until the awaited post-mutation reload settles, and a
  failing reload never re-runs the mutation.

## Localization

`src/lib/goals-i18n.ts` ships Portuguese, English, Italian, Spanish and French.
Parity is enforced twice: at compile time with `satisfies Record<GoalsKey,
string>` and at test time for every dynamic key family (templates, custom kinds,
categories, difficulties, units, statuses, filters, actions, wizard hints and
numeric issues), including the two documented intentionally empty strings.

## Accessibility semantics

- Button-group filters with `aria-pressed`; selection is never colour-only.
- Roving tabindex radio groups with full keyboard support.
- `aria-busy` plus polite live regions for refresh and pending states.
- Validation moves the wizard to the owning step and focuses the field.
- Dialogs expose a localized close control and cannot be dismissed while a
  critical mutation is in flight.

---

# Release guarantees (Sprint 7.5B)

Proven by `src/services/goals/releaseContract.test.ts`, which drives the real
services and rules against an in-memory persistence layer:

1. Every template and custom kind produces a domain-valid `CreateGoalInput`.
2. Lifecycle transitions follow `GOAL_TRANSITIONS`; terminal states offer none.
3. Duplication creates a new goal and never reopens the original.
4. Manual progress applies once, completes once, and is refused after completion.
5. Concurrent identical submissions produce exactly one completion event.
6. Automatic tracking updates only matching goals and ignores the rest.
7. The same source event is never processed twice.
8. A tracking or gamification failure never rolls back goal state.
9. Manual and automatic completion emit the same `goal_completed` contract.
10. `goalCompletionSourceId` is deterministic; reward recovery is idempotent and
    never mutates goals.
11. Reward presentation reads only persisted ledger values.
12. UI contracts (filters, keyboard, wizard routing, parser, presets, async
    behaviour) and five-locale key parity hold.
