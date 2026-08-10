# Goals Domain (Sprint 7.1)

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
  goals.test.ts       // 25+ pure domain tests
src/hooks/useGoals.ts // thin React access layer
src/routes/_authenticated/metas.tsx // minimal validation UI (final UI = Sprint 7.4)
```

## Goal types

`workout_frequency`, `workout_count`, `streak`, `strength`, `duration`,
`training_time`, `program`, `skill`, `body_weight`, `body_measurement`, `custom`.

Categories: `fitness`, `strength`, `consistency`, `skill`, `program`, `body`,
`custom`.

## Progress semantics

Behaviour is driven by `progressType`, never by the title:

| progressType   | Fold rule       | Allowed units                                        |
| -------------- | --------------- | ---------------------------------------------------- |
| `count`        | accumulate      | workouts, repetitions, days                          |
| `threshold`    | best value wins | repetitions, seconds, kilograms, centimeters, percentage |
| `duration`     | accumulate      | seconds, minutes                                     |
| `cumulative`   | accumulate      | minutes, seconds, workouts, repetitions              |
| `streak`       | best value wins | days                                                 |
| `target_value` | best value wins | kilograms, centimeters, percentage, repetitions      |
| `boolean`      | 0 or 1          | boolean                                              |

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

`GoalCompletedEvent` carries a `sourceId` so Sprint 7.3 can attach idempotent
rewards. **Sprint 7.1 defines contracts only** — nothing subscribes yet.

## Integration boundaries (future work)

- **Sprint 7.2 — automatic tracking:** producers will emit `GoalProgressSignal`
  (`workout_completed`, `exercise_completed`, `training_week_completed`,
  `training_program_completed`, `streak_updated`, `skill_achieved`,
  `body_measurement_recorded`). The contract already exists in `goalEvents.ts`;
  no listeners are registered.
- **Sprint 7.3 — gamification:** `goal_completed` → GamificationOrchestrator →
  XPService → ProgressionService → AchievementService. GoalService must never
  award XP or unlock achievements directly.
- **Sprint 7.4 — final UI + Dashboard widget.** The current `/metas` screen is a
  validation surface only; the Dashboard was not modified.

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

| Activity event               | Goal types updated                          |
| ---------------------------- | ------------------------------------------- |
| `workout_completed`          | `workout_count`, `workout_frequency`, `training_time` |
| `exercise_completed`         | `strength`, `duration` (matched by `metadata.exerciseId`) |
| `training_week_completed`    | `program` with `metadata.scope = "week"`    |
| `training_program_completed` | `program` (default scope)                   |
| `streak_updated`             | `streak`                                    |
| `skill_achieved`             | `skill` (matched by `metadata.skillId`)     |
| `body_measurement_recorded`  | `body_weight`, `body_measurement` (matched by `metadata.measurementKey`) |

Matching lives in `matchGoalToEvent(goal, event)` — one typed rule per event
kind, returning either a typed match or the reason it was ignored
(`not_active`, `out_of_window`, `no_rule`, `already_processed`, `no_change`).

Identifiers are always stable slugs, never translated display text.

## Threshold vs cumulative

The goal's `progressType` — not its title — decides the fold:

- `threshold` / `target_value` / `streak` / `boolean`: **best value wins**.
  A 9-rep session after a 7-rep best stores 9; a later 6-rep session keeps 9.
  Tracking feeds the *best single set* (`repetitions`, `seconds`).
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

| Goal type            | Mode                                                    |
| -------------------- | ------------------------------------------------------- |
| `workout_count`, `workout_frequency`, `training_time` | automatic |
| `program` (program and week scope), `streak`          | automatic |
| `strength`, `duration`                                | hybrid — automatic once per-exercise performance events are emitted by the workout runtime; manual today |
| `skill`                                               | hybrid — pending a `skill_achieved` producer |
| `body_weight`, `body_measurement`                     | pending — typed integration point ready, no authoritative measurement store yet |
| `custom`                                              | manual |

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
(level-up modal and achievement modals); the dedicated Goals reward screen is
deferred.
