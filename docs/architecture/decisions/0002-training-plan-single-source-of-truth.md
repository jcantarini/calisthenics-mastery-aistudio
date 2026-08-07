# 0002 — TrainingPlanService as Single Source of Truth

**Status:** Accepted (Sprint 6.6B) · Part of Core Architecture v1.0

## Context

Training data spans four tables (`training_plans`, `training_weeks`,
`training_days`, `planned_workouts`) plus derived counters
(`completed_workouts`, `completed_weeks`, `progress_percentage`,
`next_workout_date`) and a lifecycle state machine (active / paused /
completed, and per-workout locked / available / in_progress / completed /
skipped).

If more than one caller mutated these tables, the derived counters and the
cursor (`current_week` / `current_day`) would silently drift out of sync with
the underlying rows.

## Decision

`TrainingPlanService` is the only writer to the training tables. Every state
transition is exposed as a method that returns the refreshed
`CurrentProgramState`. React accesses it exclusively through
`useTrainingProgram`.

## Reason

Derived state is only consistent if a single component owns the invariants.
Returning the full refreshed state from each mutation also removes the
read-after-write race that would otherwise occur in the UI.

## Consequences

- All training invariants are enforced in one testable place.
- Mutations return state, so hooks can write straight into the query cache
  instead of invalidating and refetching.
- `TrainingPlanService` is large (~700 LOC) and mixes orchestration with data
  access. A repository split is a candidate for a later phase — it was
  deliberately **not** done during the freeze, because it is a stylistic
  refactor of working code.
