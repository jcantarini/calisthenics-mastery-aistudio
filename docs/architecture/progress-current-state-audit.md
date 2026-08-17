# Progress & History — Current-State Audit (Sprint 8.0A)

**Status:** Read-only audit · Documentation only · No source, test, migration,
Supabase, dependency or infrastructure change.
**Baseline:** Core Architecture v1.0 FROZEN · Phase 7 Goals RELEASE APPROVED ·
355/355 tests across 23 files · lockfile SHA-256 `184c717a13a2b402067877f9689afcd83edf96945a9e94f952c73fcb81805058`.

---

## 1. Executive summary

The application currently has **two parallel progress systems**:

1. A **canonical, server-persisted training/gamification stack** —
   `TrainingPlanService`, `GoalService`/`GoalTrackingService`, `XPService`,
   `ProgressionService`, `AchievementService`, coordinated by
   `GamificationOrchestrator`, persisted under RLS in Supabase.
2. A **legacy local prototype state** in `src/lib/store.ts`
   (`barra:state:v2`, `localStorage`), holding `completedSessions`,
   `workoutLog`, `dietLog`, `goals`, `weeklyGoal`, `streak` and `profile`.

The Progress page (`src/routes/_authenticated/progresso.tsx`) and the Weekly
Report (`src/routes/_authenticated/relatorio.tsx`) are built **entirely on the
legacy local state**. That state is device-local and never synced: it survives
reload **and** a normal logout (`handleLogout()` in `perfil.tsx` calls
`supabase.auth.signOut()` but never removes `barra:state:v2`), and it is not
available on another browser or device. It can be lost when the user clears
browser/site storage, or depending on PWA/browser uninstall behaviour.

Because the key is **not namespaced by the authenticated `user_id`**, another
account signing in on the same browser profile inherits and sees the previous
account's local profile, workouts, goals, diet and reminder data — a
**cross-account local-data isolation/privacy risk**. Supabase RLS does not
protect this `localStorage` state. The Progress page also contains a **second
goals model** that conflicts with the canonical Phase 7 Goals domain.

There is currently **no workout-history table**. Completion is a mutation of
the plan row (`planned_workouts.status/completed_at`), not an append-only
history record. Exercise-level performance (actual sets, reps, load, RPE) is
**never captured**. Nutrition and hydration have **local browser persistence
only** (inside `barra:state:v2`) and **no canonical server-side/Supabase
persistence**; they are not portable between browsers/devices and not
user-scoped.

**Readiness decision: READY WITH BLOCKERS** (blocking decisions in §17, final
decision in §19).


---

## 2. Scope and audit method

Read-only inspection of:

- Routes: `progresso.tsx`, `relatorio.tsx`, `index.tsx` (Dashboard),
  `timer.tsx`, `dieta.tsx`, `first-workout.tsx`, `treinos.*`, `jogador.tsx`,
  `xp.tsx`, `conquistas.tsx`, `metas.tsx`.
- State: `src/lib/store.ts`, `src/lib/nutrition.ts`, `src/lib/programs.ts`.
- Services: `src/services/training-plan/*`, `src/services/workout-generator/*`,
  `src/services/goals/*`, `src/services/xp/*`, `src/services/progression/*`,
  `src/services/achievements/*`, `src/services/gamification/*`.
- Hooks: `useTrainingProgram`, `useGoals`, `useGamification`,
  `usePlayerProgression`, `useXPHistory`, `useAchievements`.
- Persistence: all files in `supabase/migrations/`, generated
  `src/integrations/supabase/types.ts`, `docs/architecture/database.md`.

No write query, DDL, migration or policy change was executed. No `.env` value
and no real user data was read or reproduced.

---

## 3. Current UI inventory

### 3.1 Progress page — `src/routes/_authenticated/progresso.tsx`

| Metric                   | Source                                          | Computed in | Persistence         | Survives reload / logout / other device |
| ------------------------ | ----------------------------------------------- | ----------- | ------------------- | --------------------------------------- |
| Streak (`state.streak`)  | `useAppState()` legacy store                    | Store       | `localStorage` only | Yes / Yes / No                          |
| Sessions total           | `state.completedSessions.length`                | Route       | `localStorage` only | Yes / Yes / No                          |
| Goals completed count    | `state.goals.filter(g => g.done)`               | Route       | `localStorage` only | Yes / Yes / No                          |
| 35-day activity heatmap  | `state.completedSessions` → `Set(toDateString)` | Route       | `localStorage` only | Yes / Yes / No                          |
| Goal list + add/toggle   | `state.goals` (local `{id,label,done}` model)   | Route       | `localStorage` only | Yes / Yes / No                          |
| Weekly report entry link | Static link to `/relatorio`                     | —           | —                   | —                                       |

Survival matrix note: logout does **not** clear `barra:state:v2`
(`handleLogout()` only calls `supabase.auth.signOut()`), so the data persists
in the browser and is visible to the next account that signs in on the same
browser profile — the key is not namespaced by `user_id`. The data can be lost
when browser/site storage is cleared, or depending on PWA/browser uninstall
behaviour; it is never available on another device.

Notes: no loading state, no error state, no empty state for the heatmap or
goal list; local timezone via `Date#toDateString()`; i18n through `useT()`;
accessibility limited (`aria-label` only on the add button; the heatmap cells
carry `title` but no accessible text; no live region).

### 3.2 Weekly Report — `src/routes/_authenticated/relatorio.tsx`

| Metric                          | Source                                                      | Computed in | Persistence                         |
| ------------------------------- | ----------------------------------------------------------- | ----------- | ----------------------------------- |
| Workouts (7 d), training days   | `state.workoutLog`                                          | Route       | `localStorage`                      |
| Active minutes                  | `sum(workoutLog[].durationSec)/60`                          | Route       | `localStorage`                      |
| Calories burned                 | `sum(workoutLog[].kcalBurned)` (MET estimate)               | Route       | `localStorage`                      |
| Calories consumed (`kcalIn`)    | Re-derived from `buildMealPlan(kcalTarget)` × checked meals | Route       | Derived, not a fact                 |
| Calorie target                  | `dietLog[key].kcalTarget ?? targetCalories(profile)`        | Route       | Partly local                        |
| Water average                   | `dietLog[key].waterMl`                                      | Route       | `localStorage`                      |
| Meal adherence %                | checked meals / plan length                                 | Route       | Derived                             |
| BMI / category / suggested goal | `bmi(profile)`, `bmiCategory`, `BMI_META`                   | Route       | Recomputed from **current** profile |
| Session list (last 7 days)      | `state.workoutLog`                                          | Route       | `localStorage`                      |

Notes: `EmptyState` is used for empty periods; no loading/error states (data
is synchronous); heavy business arithmetic lives **inside the route
component** — a Core Architecture v1.0 boundary smell.

### 3.3 Dashboard progress surfaces

| Component                                                                              | Source                                                 | Canonical?                    |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------- |
| `StatisticsCard`                                                                       | `overall: OverallProgress` from `TrainingPlanService`  | Yes for streak/workouts/weeks |
| `StatisticsCard` time+kcal                                                             | `app.workoutLog` aggregated in `index.tsx` (`useMemo`) | **No — legacy local**         |
| `ProgramOverviewCard`, `WeeklyProgressCard`, `TodayWorkoutCard`, `UpcomingWorkoutCard` | `useCurrentProgram()` → `CurrentProgramState`          | Yes                           |
| `PlayerLevelCard`                                                                      | `usePlayerProgression` → `ProgressionService`          | Yes                           |
| `GoalsDashboardCard`, `RecentGoalRewardsCard`                                          | `useGoals` + XP ledger                                 | Yes                           |

`StatisticsCard` labels are hardcoded Portuguese (`"Estatísticas"`,
`"Sequência"`, `"Treinos"`, `"Tempo"`, `"Calorias"`, `"Semanas"`) — an i18n
gap equivalent to the one closed for `PlayerLevelCard` in Sprint 7.5C-C2.

---

## 4. State-field inventory — `src/lib/store.ts` (`barra:state:v2`)

| Field                | Classification                                                    | Writers                           | Consumers                              |
| -------------------- | ----------------------------------------------------------------- | --------------------------------- | -------------------------------------- |
| `streak`             | **Duplicated / legacy**                                           | `logWorkoutSession` (timer)       | `progresso.tsx`                        |
| `lastSession`        | Legacy                                                            | `logWorkoutSession`               | `logWorkoutSession` streak rule        |
| `completedSessions`  | **Duplicated / legacy**                                           | `logWorkoutSession`               | `progresso.tsx` (count + heatmap)      |
| `completedExercises` | Legacy / unclear                                                  | `treinos.$slug.tsx`               | `treinos.$slug.tsx`                    |
| `activeProgram`      | **Duplicated / legacy**                                           | `treinos.*`                       | `treinos.*`                            |
| `weeklyGoal`         | Legacy, effectively unused                                        | default only                      | —                                      |
| `goals`              | **Duplicated / legacy** (second Goals model)                      | `progresso.tsx`                   | `progresso.tsx`                        |
| `profile`            | **Duplicated** with `profiles`/`user_onboarding`                  | `perfil.tsx`, `dieta.tsx`         | nutrition, report, timer kcal estimate |
| `dietLog`            | **Canonical-by-default but local-only**                           | `dieta.tsx`                       | `dieta.tsx`, `relatorio.tsx`           |
| `workoutLog`         | **Canonical-by-default but local-only**                           | `timer.tsx` (`logWorkoutSession`) | `relatorio.tsx`, Dashboard time/kcal   |
| `reminders`          | Diet/hydration reminder config (local-only, not user-scoped)      | `dieta.tsx`                       | `src/lib/reminders.ts` scheduler        |

**Reminder systems are two distinct categories, not duplicates of the same
configuration:**

1. **Diet/hydration reminders** — `store.reminders`, stored inside
   `barra:state:v2`, edited by `dieta.tsx`, consumed by `src/lib/reminders.ts`.
   Local-only and not user-scoped.
2. **Workout reminders** — managed by `src/lib/workout-reminders.ts` and
   `lembretes.tsx`, cached locally under `barra:workout-reminders:v1` and
   synchronised with the `workout_reminder_settings` table in Supabase.
   User-owned and protected by RLS on the server.

The architectural issue is the **overlap and naming confusion** between the two
mechanisms (two scheduling paths, two storage keys, two persistence models),
not configuration duplication.

Helpers: `todayKey()` (local timezone), `estimateKcal()` (MET × weight ×
duration), `logWorkoutSession()` (naive streak: +1 unless already logged
today; no gap reset), `initialsFrom()`.

---

## 5. Training sources

- **Ownership of completion:** `TrainingPlanService.completeWorkout(plannedWorkoutId, userId?)`
  (`src/services/training-plan/TrainingPlanService.ts`). It is the only writer
  of `planned_workouts.status/is_completed/completed_at` and the mirrored
  `training_days.completed/completed_at`, then calls `advanceCursorTo`,
  `setPlanStatus`, `syncPlanProgress`.
- **Persisted facts:** plan cursor, per-workout terminal status, completion
  timestamp, aggregate counters on `training_plans`
  (`completed_workouts`, `completed_weeks`, `progress_percentage`,
  `last_workout_date`, `next_workout_date`), and `started_at` set by
  `startWorkout`.
- **Estimates only:** `estimated_duration_min`, `estimated_calories` — planned
  values from generation, never actuals.
- **Exercise-level performance:** **not preserved.** `exercises` is the planned
  JSONB prescription; no actual sets/reps/load/RPE/per-exercise timestamps are
  ever written back.
- **Actual duration:** computed transiently inside `completeWorkout`
  (`completed_at − started_at`) and handed to `GoalTrackingService`, but
  **never persisted**.
- **Duplicate completion:** not guarded at the training layer (a repeat call
  re-updates the same row and re-runs the pipeline). Downstream idempotency
  exists: unique index `idx_xp_history_unique_source (user_id, event_type, source_id)`,
  `user_achievements (user_id, achievement_id)` unique, and
  `goal_progress_events_source_unique (goal_id, source_event_id, source_event_type)`.
- **Reconstruction:** history can only be reconstructed for workouts belonging
  to a plan that still exists. A restarted or deleted plan destroys the record;
  `restartProgram` resets statuses. **Workout history is therefore mutable and
  lossy today.**
- **Timer sessions** (`timer.tsx`) and the **first-workout flow**
  (`first-workout.tsx`, using `WorkoutGeneratorService`) do **not** go through
  `completeWorkout`; timer results land only in the legacy `workoutLog`.

---

## 6. Goals and gamification read boundaries

| Domain        | Service                              | Read hooks                                      | Tables                                                           |
| ------------- | ------------------------------------ | ----------------------------------------------- | ---------------------------------------------------------------- |
| Goals         | `GoalService`, `GoalTrackingService` | `useGoals`, `useActiveGoals`, `useGoalProgress` | `user_goals`, `goal_progress_events`                             |
| XP            | `XPService`                          | `useXPHistory`                                  | `xp_history`, `user_stats`                                       |
| Progression   | `ProgressionService`                 | `usePlayerProgression`                          | `user_progression`, `level_history`                              |
| Achievements  | `AchievementService`                 | `useAchievements`                               | `achievements`, `user_achievements`, `user_achievement_progress` |
| Orchestration | `GamificationOrchestrator`           | `useGamification`, `useWorkoutRewards`          | none of its own                                                  |

Phase 8 **can** consume these read-only: every domain exposes a service-level
read API and hooks.

**Ledger semantics (accurate wording):**

- `xp_history` — `XPService` uses **insert-only ledger behaviour** at the
  application level: corrections are written as negative adjustment rows
  instead of editing prior XP entries. The database, however, grants
  `SELECT, INSERT, UPDATE, DELETE` on `xp_history` to `authenticated`, and its
  `FOR ALL` ownership policy (`auth.uid() = user_id`) allows an authenticated
  user to update or delete their own XP rows. Append-only is therefore an
  **application/service convention, not a database-enforced invariant**.
- `goal_progress_events` — a **persistent idempotency/state ledger**, not an
  append-only log. `GoalTrackingService` inserts claims, updates them during
  settlement and deletes them during release/retry; the table also grants
  `UPDATE` and `DELETE` to `authenticated`. The unique constraint
  `(goal_id, source_event_id, source_event_type)` provides duplicate protection
  **only while the corresponding ledger row is still present**.

This is recorded as an architectural/security finding for later hardening; no
database change is made in this sprint.

Phase 8 **must not** write to those tables, recompute XP or level curves,
re-emit completion events for historical backfill, or model goals locally.

---

## 7. Nutrition and hydration sources

| Value                    | Nature                                                                           |
| ------------------------ | -------------------------------------------------------------------------------- |
| BMI / category / goal    | Derived, recomputed from the **current** local `profile`                         |
| BMR / TDEE / target kcal | Derived (`src/lib/nutrition.ts`: `bmi`, `targetCalories`, macros)                |
| Meal plan                | Generated deterministically by `buildMealPlan(kcalTarget)`                       |
| Meal completion          | Local-only fact: `dietLog[dayKey].meals[mealId]`                                 |
| Consumed calories        | Derived from checked meals × current plan — **not a recorded fact**              |
| Water                    | Local-only fact: `dietLog[dayKey].waterMl`                                       |
| `kcalTarget` per day     | Partially snapshotted (`dietLog[key].kcalTarget`), falls back to today's profile |

Consequence: changing weight/activity retroactively changes historical
calorie targets and consumed-calorie figures in the Weekly Report. No
nutrition table exists in Supabase.

---

## 8. Database and persistence inventory

All objects live in `public`, all user tables carry `user_id` (or `id` for
`profiles`) referencing `auth.users`, all have RLS enabled with explicit
`GRANT` to `authenticated` and `service_role`, all use
`auth.uid() = user_id` in `USING` and `WITH CHECK`.

| Table                       | Owner domain      | Ownership col  | RLS | Notable indexes / constraints                          |
| --------------------------- | ----------------- | -------------- | --- | ------------------------------------------------------ |
| `profiles`                  | Profile           | `id`           | Yes | insert/select/update policies, no delete               |
| `user_onboarding`           | Onboarding        | `user_id`      | Yes | —                                                      |
| `fitness_assessment`        | Onboarding        | `user_id`      | Yes | —                                                      |
| `training_plans`            | Training          | `user_id`      | Yes | `training_plans_user_idx`                              |
| `training_weeks`            | Training          | `user_id`      | Yes | unique `(plan_id, week_number)`                        |
| `planned_workouts`          | Training          | `user_id`      | Yes | unique `(plan_id, week_number, day_number)`            |
| `training_days`             | Training          | `user_id`      | Yes | `idx_training_days_plan`                               |
| `generated_workouts`        | Workout generator | `user_id`      | Yes | `(user_id, created_at DESC)`, `(plan_id)`              |
| `user_goals`                | Goals             | `user_id`      | Yes | `(user_id, status, created_at DESC)`                   |
| `goal_progress_events`      | Goals             | `user_id`      | Yes | unique `(goal_id, source_event_id, source_event_type)` |
| `xp_history`                | XP                | `user_id`      | Yes | unique `(user_id, event_type, source_id)` partial      |
| `user_stats`                | XP                | `user_id`      | Yes | —                                                      |
| `user_progression`          | Progression       | `user_id`      | Yes | —                                                      |
| `level_history`             | Progression       | `user_id`      | Yes | unique `(user_id, new_level)`                          |
| `achievements`              | Achievements      | none (catalog) | Yes | read-only to `authenticated`                           |
| `user_achievements`         | Achievements      | `user_id`      | Yes | unique `(user_id, achievement_id)`                     |
| `user_achievement_progress` | Achievements      | `user_id`      | Yes | unique `(user_id, achievement_id)`                     |
| `workout_reminder_settings` | Reminders         | `user_id`      | Yes | —                                                      |

**Missing for Phase 8:** no `workout_history` / `workout_sets`, no
`nutrition_log` / `hydration_log`, no `daily_activity` rollup, no
personal-records table, no immutable snapshot table.

Functions: `handle_new_user()` (SECURITY DEFINER, `search_path = public`,
triggered on `auth.users` insert, not client-callable) and `set_updated_at()`
(trigger only, not SECURITY DEFINER). **No views exist**, so no view-based RLS
bypass. All timestamps are `timestamptz`; `scheduled_date`,
`last_workout_date`, `next_workout_date`, `start_date` are `date`.

---

## 9. Canonical source-of-truth matrix

| Concept                     | Canonical today                                          | Legacy duplicate                              |
| --------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| Plan structure & cursor     | `training_plans` / `training_weeks` / `planned_workouts` | `store.activeProgram`                         |
| Workout completed           | `planned_workouts.status = 'completed'`                  | `store.completedSessions`, `store.workoutLog` |
| Streak                      | `computeStreak(plan)` → `OverallProgress.currentStreak`  | `store.streak`                                |
| Training minutes / calories | **none authoritative** (only estimates on the plan row)  | `store.workoutLog` aggregation                |
| Goals                       | `user_goals` via `GoalService`                           | `store.goals`                                 |
| XP / level / achievements   | `xp_history`, `user_progression`, `user_achievements`    | none                                          |
| Profile / body metrics      | `profiles` + `user_onboarding`                           | `store.profile`                               |
| Nutrition & hydration       | **none** (no table)                                      | `store.dietLog`                               |

---

## 10. Writer / consumer matrix

| Store or table      | Writers                                                     | Consumers                                            |
| ------------------- | ----------------------------------------------------------- | ---------------------------------------------------- |
| `planned_workouts`  | `TrainingPlanService` only                                  | `useTrainingProgram`, Dashboard, training-plan route |
| `training_plans`    | `TrainingPlanService` (`syncPlanProgress`, `setPlanStatus`) | same                                                 |
| `user_goals`        | `GoalService`, `GoalTrackingService`                        | `useGoals`, Goals UI, Dashboard                      |
| `xp_history`        | `XPService` (via Orchestrator)                              | `useXPHistory`, `RecentGoalRewardsCard`, `/xp`       |
| `user_progression`  | `ProgressionService`                                        | `usePlayerProgression`, `PlayerLevelCard`, `/niveis` |
| `user_achievements` | `AchievementService`                                        | `useAchievements`, `/conquistas`                     |
| `store.workoutLog`  | `timer.tsx` via `logWorkoutSession`                         | `relatorio.tsx`, Dashboard statistics                |
| `store.dietLog`     | `dieta.tsx`                                                 | `dieta.tsx`, `relatorio.tsx`                         |
| `store.goals`       | `progresso.tsx`                                             | `progresso.tsx`                                      |

---

## 11. Current data-flow diagrams

```text
[CURRENT — plan workout completion]
TodayWorkoutCard -> useProgramActions.completeWorkout
  -> TrainingPlanService.completeWorkout
     -> UPDATE planned_workouts (+ training_days mirror)
     -> advanceCursorTo -> setPlanStatus? -> syncPlanProgress (training_plans)
     -> GamificationOrchestrator.processWorkoutCompleted
          -> XPService (xp_history, user_stats)
          -> ProgressionService (user_progression, level_history)
          -> AchievementService (user_achievements, progress)
     -> GoalTrackingService.trackSafely(workout_completed | streak_updated
          | training_week_completed | training_program_completed)
          -> goal_progress_events + user_goals
     (both pipelines are try/catch-isolated; failure never blocks completion)
```

```text
[LEGACY — timer session]
timer.tsx -> estimateKcal(MET, store.profile.weightKg, durationSec)
  -> logWorkoutSession -> localStorage(barra:state:v2)
       workoutLog[dayKey], completedSessions, lastSession, streak++
  -> consumed by relatorio.tsx and Dashboard time/calorie tiles
  (no Supabase write, no Goals tracking, no XP, no achievements)
```

```text
[LEGACY — nutrition]
dieta.tsx -> setState(dietLog[dayKey].meals / .waterMl / .kcalTarget)
  -> localStorage only
relatorio.tsx -> re-derives kcalIn from buildMealPlan(current target)
```

```text
[MISSING]
completed workout -> immutable workout_history record
completed workout -> per-exercise performance rows
timer session      -> canonical training history
nutrition/water    -> server-side daily log
any               -> personal records, period comparison, pagination
```

```text
[PLANNED — Phase 8, not implemented]
Completion event -> ProgressHistoryService -> append-only history tables
Progress UI      -> ProgressHistoryService read models (no local state)
```

---

## 12. Duplication and conflict matrix

| #   | Conflict                                                            | Severity | Files / symbols                                                     | Risk                                                  | Disposition |
| --- | ------------------------------------------------------------------- | -------- | ------------------------------------------------------------------- | ----------------------------------------------------- | ----------- |
| 1   | Local `store.goals` vs canonical `user_goals`                       | Critical | `store.ts:goals`, `progresso.tsx`                                   | Two Goals systems; user sees divergent goal sets      | Replace     |
| 2   | Workout history only as mutable plan rows; no history table         | Critical | `planned_workouts`, `TrainingPlanService.restartProgram`            | History is destroyed on restart/delete                | Replace     |
| 3   | `store.completedSessions`/`workoutLog` vs persisted completions     | Critical | `store.ts`, `timer.tsx`, `relatorio.tsx`, `index.tsx`               | Device-local, lost on logout; contradicts Dashboard   | Deprecate   |
| 4   | Two definitions of "completed workout" (plan completion vs timer)   | High     | `TrainingPlanService.completeWorkout` vs `logWorkoutSession`        | Metrics disagree; timer grants no XP or goal progress | Replace     |
| 5   | Local `store.streak` vs `computeStreak(plan)`                       | High     | `store.ts`, `trainingPlanRuntime.ts`                                | Two streak numbers on two screens                     | Deprecate   |
| 6   | Business math inside route components                               | High     | `relatorio.tsx`, `progresso.tsx`, `index.tsx` `useMemo`             | Violates v1.0 layering; untestable                    | Replace     |
| 7   | Nutrition history recomputed from current profile                   | High     | `nutrition.ts`, `relatorio.tsx`                                     | Past days silently change                             | Replace     |
| 8   | No persisted actual duration/calories                               | High     | `completeWorkout` (actual duration discarded)                       | Volume/duration trends impossible                     | Adapt       |
| 9   | `store.profile` vs `profiles`/`user_onboarding`                     | Medium   | `perfil.tsx`, `onboarding.ts`                                       | Divergent body metrics feeding kcal math              | Adapt       |
| 10  | Duplicate completion not idempotent at training layer               | Medium   | `completeWorkout`                                                   | Repeated aggregates; downstream ledgers absorb it     | Adapt       |
| 11  | Timezone conventions differ (`todayKey` local vs `daysBetween` UTC) | Medium   | `store.ts:todayKey`, `trainingPlanRuntime.ts:toDateKey/daysBetween` | Off-by-one day grouping                               | Investigate |
| 12  | `StatisticsCard` hardcoded Portuguese labels                        | Medium   | `StatisticsCard.tsx`                                                | i18n regression vs Phase 7 standard                   | Adapt       |
| 13  | Legacy `reminders` vs `workout_reminder_settings`                   | Low      | `store.ts:reminders`, `lembretes.tsx`                               | Config drift                                          | Investigate |
| 14  | `weeklyGoal`, `completedExercises`, `activeProgram` dead/near-dead  | Low      | `store.ts`                                                          | Confusion                                             | Deprecate   |

---

## 13. Security and RLS findings

- Every `public` table has RLS enabled and explicit Data API grants.
- All user-owned policies use `auth.uid() = user_id` in both `USING` and
  `WITH CHECK`, so ownership cannot be changed by an UPDATE.
- `achievements` is a read-only catalog: `GRANT SELECT` to `authenticated`
  only, with insert/update/delete denied.
- **No views exist** — no view-based RLS bypass surface.
- SECURITY DEFINER functions: only `handle_new_user()`, pinned with
  `SET search_path = public` and reachable solely through the
  `auth.users` insert trigger; not exposed to the Data API.
- No `user_id` is client-provided in a trusted position: services resolve it
  via `resolveUserId()` from the Supabase session, and RLS enforces it anyway.
- Service-role credentials are not referenced in client code; the only
  privileged entry point is `@/integrations/supabase/client.server`.
- No `.env` values were read or reproduced; no real user data inspected.
- **Phase 8 note:** any new history table must ship RLS + grants in the same
  migration, and historical rows should be insert-only for `authenticated`
  (no UPDATE/DELETE policy) to guarantee immutability.

---

## 14. Historical-data capability matrix

| Requirement                   | Supported | Missing data / contract                              |
| ----------------------------- | --------- | ---------------------------------------------------- |
| Workout list                  | Partial   | Only current plan rows; no cross-plan, non-immutable |
| Workout details               | Partial   | Planned prescription only; no actuals                |
| Weekly summary                | Partial   | Legacy local only; no server aggregation             |
| Monthly summary               | No        | No history table, no rollup                          |
| Exercise-level performance    | No        | No sets/reps/load/RPE capture or table               |
| Personal records              | No        | Requires exercise-level history                      |
| Training volume               | No        | Requires actual sets × reps × load                   |
| Duration trends               | No        | Actual duration computed but discarded               |
| Consistency / streak history  | Partial   | Current streak only; no historical series            |
| Period comparison             | No        | Requires immutable time-series                       |
| Goals × XP correlation        | Partial   | Both ledgers exist; no joined read model             |
| Nutrition & hydration history | No        | No table; local-only, derived                        |
| Pagination                    | No        | No paged read API or keyset index                    |
| Timezone-correct grouping     | No        | Mixed local/UTC conventions; no stored user timezone |
| Immutable snapshots           | No        | Metrics recomputed from mutable plans/profile        |

---

## 15. Technical debt and risks

1. Progress and Weekly Report are prototype-grade and non-portable across
   devices; a reinstall or logout erases the user's entire visible history.
2. A second Goals model in the Progress page directly contradicts the Phase 7
   release-approved domain.
3. Restarting a program silently rewrites what the user perceives as history.
4. Timer workouts are invisible to Goals, XP and achievements.
5. Route components hold non-trivial domain arithmetic.
6. Nutrition history is retroactively mutable.
7. Timezone handling is implicit and inconsistent.
8. `StatisticsCard` is not localized.

---

## 16. Keep / adapt / deprecate / replace recommendations

_(Recommendations only — nothing is implemented in Sprint 8.0A.)_

- **Keep:** `TrainingPlanService` as the plan runtime owner; the whole
  gamification stack and its ledgers; `GoalService`/`GoalTrackingService`;
  `nutrition.ts` pure calculators; existing RLS/grant patterns.
- **Adapt:** persist actual duration/calories on completion; add ownership-safe
  idempotency to `completeWorkout`; localize `StatisticsCard`; align profile
  reads on the server profile.
- **Deprecate:** `store.streak`, `store.completedSessions`, `store.weeklyGoal`,
  `store.activeProgram`, `store.completedExercises`.
- **Replace:** `store.goals` with `GoalService`; `store.workoutLog` with a
  persisted history domain; route-level metric math with a
  `ProgressHistoryService`; local `dietLog` with a persisted nutrition log.

---

## 17. Blocking decisions for Sprint 8.0B

1. **History model:** append-only `workout_history` (+ `workout_history_sets`)
   vs extending `planned_workouts`. Immutability requires the former.
2. **Scope of exercise-level capture:** does Phase 8 introduce a workout
   execution/logging UI, or only summary history?
3. **Timer sessions:** promoted to first-class history entries (and therefore
   into Goals/XP) or kept out of canonical metrics?
4. **Migration of legacy local data:** import existing `workoutLog`/`dietLog`
   once, or start clean?
5. **Nutrition persistence:** in Phase 8 or deferred to a later phase?
6. **Timezone contract:** store the user's IANA timezone and group server-side,
   or group client-side in local time?
7. **Snapshot policy:** which values must be frozen at write time (kcal target,
   body weight, difficulty, plan name)?
8. **ADR requirement:** a new history domain touches frozen v1.0 boundaries and
   needs ADR 0005 before implementation.

---

## 18. Proposed safe subdivision of remaining Phase 8 work

| Sprint | Content                                                                                                                                       |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 8.0B   | Decisions above + ADR 0005 + history domain contract (types, service API, no code)                                                            |
| 8.1    | History persistence: migration (RLS, grants, insert-only), types, `ProgressHistoryService` write path wired to `completeWorkout` (idempotent) |
| 8.2    | Read models: workout list/detail, weekly & monthly summaries, pagination, timezone-correct grouping                                           |
| 8.3    | Progress page rebuild on canonical sources; removal of the legacy local goals model                                                           |
| 8.4    | Weekly Report rebuild; snapshot-based nutrition/hydration decision applied                                                                    |
| 8.5    | Exercise-level performance & personal records (if approved in 8.0B)                                                                           |
| 8.6    | i18n, accessibility, responsive polish, validation & release gate                                                                             |

---

## 19. Final readiness decision

**READY WITH BLOCKERS.**

The canonical training and gamification domains are solid, RLS-correct and
safe to consume read-only, so Phase 8 can proceed — but Sprint 8.0B must first
resolve the eight blocking decisions in §17, in particular the history model,
the immutability/snapshot policy and the fate of the legacy local state.
