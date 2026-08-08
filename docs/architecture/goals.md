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
