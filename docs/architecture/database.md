# Database

Postgres on Supabase. Every user-owned table has RLS enabled and is scoped to
`auth.uid() = user_id`, plus explicit Data API grants.

## Tables by domain

| Domain               | Tables                                                                     |
| -------------------- | -------------------------------------------------------------------------- |
| Profile / Onboarding | `profiles`, `user_onboarding`, `fitness_assessment`                        |
| Workout generation   | `generated_workouts`                                                       |
| Training             | `training_plans`, `training_weeks`, `training_days`, `planned_workouts`    |
| XP                   | `xp_history`, `user_stats`                                                 |
| Progression          | `user_progression`, `level_history`                                        |
| Achievements         | `achievements` (catalog), `user_achievements`, `user_achievement_progress` |
| Notifications        | `workout_reminder_settings`                                                |

`achievements` is a read-only catalog: `SELECT` for `authenticated`, no write
policy at all.

## Integrity

- **Foreign keys (added in Sprint 6.6B):** every `user_id` column on a
  user-owned table now references `auth.users(id) ON DELETE CASCADE`. Before
  this, deleting an account left orphaned training and gamification rows.
  Verified zero orphan rows before applying.
- Structural FKs already existed: `training_weeks/days/planned_workouts →
training_plans`, `training_days → planned_workouts`,
  `user_achievements(_progress) → achievements`.

## Idempotency constraints

| Constraint                                              | Guarantees                       |
| ------------------------------------------------------- | -------------------------------- |
| `level_history_user_new_level_key (user_id, new_level)` | a level is recorded at most once |
| `user_achievements_user_id_achievement_id_key`          | an achievement unlocks once      |
| `user_achievement_progress_user_id_achievement_id_key`  | one progress row per achievement |
| `training_weeks (plan_id, week_number)`                 | one row per plan week            |
| `training_days (plan_id, week_number, day_number)`      | one row per plan day             |

## Indexes

Hot-path indexes: `generated_workouts (user_id, created_at DESC)`,
`level_history (user_id, created_at DESC)`,
`user_achievements (user_id, unlocked_at DESC)`,
`planned_workouts (plan_id, week_number, day_number)`,
`training_plans (user_id)`.

Sprint 6.6B dropped four **exact duplicate** indexes that only cost write
throughput: `idx_training_weeks_plan`, `idx_training_days_plan`,
`training_days_plan_week_day_idx`, `idx_planned_workouts_plan`.

## RLS

All policies use `auth.uid() = user_id` and are now uniformly scoped
`TO authenticated`. The three training tables previously fell back to the
implicit `PUBLIC` role; effective access was identical (`auth.uid()` is `NULL`
for anon) but the inconsistency has been removed.

**Known limitation (deferred):** gamification writes are still
client-authoritative — RLS protects _ownership_, not _rules_. A determined
user could write arbitrary XP rows for themselves. Moving XP/progression
writes behind `createServerFn` is Phase 7 work, tracked in
[architecture-freeze-v1.md](./architecture-freeze-v1.md).

## Schema change policy

All schema changes go through the migration tool. Never weaken RLS to make a
feature work; never grant `anon` on a user-owned table.
