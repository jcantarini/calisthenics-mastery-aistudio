# Database

Postgres on Supabase. Every user-owned table has RLS enabled and is scoped to
`auth.uid() = user_id`, plus explicit Data API grants.

## Tables by domain

| Domain               | Tables                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| Profile / Onboarding | `profiles`, `user_onboarding`, `fitness_assessment`                                                    |
| Workout generation   | `generated_workouts`                                                                                   |
| Training             | `training_plans`, `training_weeks`, `training_days`, `planned_workouts`                                |
| XP                   | `xp_history`, `user_stats`                                                                             |
| Progression          | `user_progression`, `level_history`                                                                    |
| Achievements         | `achievements` (catalog), `user_achievements`, `user_achievement_progress`                             |
| Notifications        | `workout_reminder_settings`                                                                            |
| Progress History     | `workout_sessions`, `workout_session_exercises`, `workout_session_sets`, `workout_session_adjustments` |
| Auxiliary Facts      | `hydration_facts`, `meal_adherence_facts`, `daily_target_snapshots`                                    |
| Dispatch             | `history_dispatch_outbox`                                                                              |

`achievements` is a read-only catalog: `SELECT` for `authenticated`, no write
policy at all.

## Progress History core schema (Sprint 8.1A1)

Sprint 8.1A1 implemented the first physical slice of ADR 0005 — the four core
immutable / append-only entities only.

| Table                         | Role                                                   |
| ----------------------------- | ------------------------------------------------------ |
| `workout_sessions`            | Immutable canonical record of one completed workout    |
| `workout_session_exercises`   | Immutable exercise rows of a session                   |
| `workout_session_sets`        | Immutable set rows of a session exercise               |
| `workout_session_adjustments` | Append-only `void` / `correction` events over sessions |

**Ownership.** Every table carries a direct `user_id` foreign key to
`auth.users(id) ON DELETE CASCADE`. Parents also carry a unique `(id, user_id)`
so children reference them compositely: exercises through
`(session_id, user_id)`, sets through `(session_exercise_id, user_id)`, and
adjustments through `(target_session_id, user_id)` and
`(replacement_session_id, user_id)`. A child owned by one user is therefore
structurally unable to reference a parent owned by another user, independently
of RLS.

**Immutability.** No `voided_at`, no mutable status column and no `updated_at`
on these tables. Corrections are new sessions plus an append-only adjustment
row. Plan provenance (`source_plan_id`, `source_planned_workout_id`) is stored
as plain immutable UUID scalars with **no** foreign key to the mutable training
plan tables, and exercise identity is bounded catalog text with no foreign key
to the exercise catalog.

**Index strategy (contract §15, no speculative indexes).**

- `workout_sessions`: unique `(user_id, ingestion_key)`, unique `(id, user_id)`,
  timeline `(user_id, occurred_at DESC, id DESC)`, `(user_id, local_day)`, and a
  partial `(user_id, source_planned_workout_id)`.
- `workout_session_exercises`: unique `(id, user_id)`, unique
  `(session_id, order_index)`, `(session_id, user_id)`, `(user_id)`, and a
  partial `(user_id, exercise_id)`.
- `workout_session_sets`: unique `(session_exercise_id, set_index)`,
  `(session_exercise_id, user_id)`, `(user_id)`.
- `workout_session_adjustments`: unique `(id, user_id)`,
  `(user_id, adjustment_key)`, `(target_session_id)`, partial unique
  `(replacement_session_id)`, plus `(target_session_id, user_id)`, a partial
  `(replacement_session_id, user_id)` and `(user_id, occurred_at DESC, id DESC)`.

**Contract bounds (Sprint 8.1A1-C1).** The core schema was corrected forward to
match the ratified contract exactly:

- `order_index` is bounded `0..59` (60 exercises maximum) and `set_index`
  `0..99` (100 sets maximum). Contiguity remains a trusted-ingestion
  responsibility, not a database constraint.
- Plan provenance is complete and symmetric: `source = 'plan_workout'` requires
  both `source_plan_id` and `source_planned_workout_id`; any other source
  requires all five provenance columns (`source_plan_id`,
  `source_planned_workout_id`, `plan_name_snapshot`, `week_number_snapshot`,
  `day_number_snapshot`) to be `NULL`. Still no foreign keys to plan tables.
- `prescription_snapshot` is validated structurally: it must be a JSON object,
  restricted to the closed key matrix `version, planned_sets, reps_text,
rest_text, rest_seconds, tempo, focus_key, focus_text, prescription_note`,
  must explicitly contain `version` (integer `1`), `planned_sets` (integer
  `0..100`) and `reps_text` (non-empty string, 1–40 chars), and accepts each
  optional key only with a valid value of the expected type — an explicit JSON
  `null` is rejected. The former approximate `octet_length(... ::text) <= 2048`
  size check was removed; the exact payload limit belongs to trusted ingestion.

Verified against an empty history dataset: 35 positive and negative cases
(prescription shape, index bounds, provenance combinations) all behave as the
contract specifies, with RLS, grants, indexes and ownership constraints
unchanged.

**JSON validation hardening (Sprint 8.1A1-C2).** The prescription check now
evaluates every rule inside the CHECK expression itself, so a malformed payload
always fails as a check violation (SQLSTATE `23514`) and never as a cast error
(`22P02`):

- Numeric keys (`version`, `planned_sets`, `rest_seconds`) are read only when
  `jsonb_typeof(...) = 'number'`; a string, boolean, array or object value fails
  the check instead of attempting a numeric conversion. `version` must equal
  `1`, `planned_sets` must be integral in `0..100`, and the optional
  `rest_seconds` must be integral in `0..3600`.
- Text keys are length-bounded on the original value — `reps_text` and
  `rest_text` 1–40, `tempo` 1–24, `focus_text` 1–120, `prescription_note` 1–400 —
  and must carry no leading or trailing whitespace (space, tab, newline, carriage
  return, form feed, vertical tab). Internal spaces are preserved; a
  whitespace-only value is rejected.
- `focus_key` keeps the `^[A-Za-z0-9_.:-]{1,64}$` pattern.

No function, trigger, view, RPC, outbox or UI was introduced, and no approximate
byte-size substitute for the removed 2048-byte check was added.

**Reproducible evidence (Sprint 8.1A1-C2).** The whole migration set (18
forward migrations, ending with the C1 corrective migration and the C2
prescription migration) was replayed from scratch on a disposable PostgreSQL
17.9 instance isolated from the shared project database, seeded only with the
`anon`/`authenticated`/`service_role` roles and a minimal `auth` schema. The
battery ran inside a single transaction that was rolled back, leaving no rows:
103 positive and negative cases passed with zero failures — 68 prescription
cases, 4 `order_index` bounds, 4 `set_index` bounds, 7 provenance combinations,
2 composite-ownership rejections, 1 ingestion-idempotency rejection, 1 account
deletion cascade and 16 RLS/grant catalog assertions. All 54 rejected
prescription cases reported SQLSTATE `23514`; none reported `22P02`.

**Committed regression suite (Sprint 8.1A1-V1-C1).** That evidence is now
reproducible from the repository: `supabase/tests/progress_history_core/run.sh`
builds a disposable PostgreSQL 17 cluster, replays all 18 migrations, and runs
169 cases (55 positive, 114 negative) covering prescription JSON, ordering,
set bounds, provenance, idempotency, composite ownership, adjustments, deletion
cascade, role-based RLS/grant behaviour and catalog assertions. The recorded
run passed with zero failures; rejections reported `23514` (73), `42501` (27),
`23503` (7), `23505` (6) and `23502` (1). Full evidence, including per-case
outcomes and catalog dumps, is in
[`progress-history-core-validation.md`](./progress-history-core-validation.md).
Those results were produced by the authoring agent and remain
`8.1A1-V1-C1 — PENDING INDEPENDENT VALIDATION`; the suite is test tooling only and
adds no migration, function, trigger, view or RPC.

**RLS and grants.** RLS is enabled on all four tables with a single own-row
`FOR SELECT TO authenticated` policy using `(select auth.uid()) = user_id`.
Grants are explicit and minimal: `anon` receives nothing, `authenticated`
receives `SELECT` only, `service_role` receives `SELECT, INSERT` only. Within
this matrix no role holds `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`,
`TRIGGER` or `ALL`; table owners and database superusers sit outside the matrix
and retain their inherent privileges by definition. Because `service_role`
bypasses RLS, RLS is described here only as protection for user-facing roles;
cross-user safety on server paths comes from the server-derived `user_id` plus
the composite ownership constraints.

**Not implemented yet.** Trusted ingestion and adjustment functions, the
durable dispatch outbox, read-model views, services and UI do not exist. No
view, trigger or function was created by this sprint.

## Auxiliary Progress facts schema (Sprint 8.1A2)

Sprint 8.1A2 added the three auxiliary Phase 8 fact tables defined by the
ratified contract (§8), as one additive migration. The eighteen previous
migrations are unchanged; the repository now holds 19.

| Table                    | Role                                            |
| ------------------------ | ----------------------------------------------- |
| `hydration_facts`        | Hydration `entry` rows and their `void` rows    |
| `meal_adherence_facts`   | Append-only per-meal adherence observations     |
| `daily_target_snapshots` | Point-in-time capture of a day's calorie target |

They are independent auxiliary facts: no `session_id`, no foreign key to
workout sessions or to mutable plan tables, and no translated label used as a
canonical identity. All three share `ingestion_key` (unique per user, with the
contracted prefix `hydration:` / `meal:` / `daily-target:` plus a UUID), a
64-character lowercase hexadecimal `fact_fingerprint`, occurrence/capture
timestamp, IANA timezone text with its source, `local_day`, `contract_version`
fixed at `1`, and no `updated_at` or status column.

Entity-specific bounds:

- **Hydration.** `kind` is `entry` or `void`. An entry carries `volume_ml` in
  `1..10000` and no target; a void carries a mandatory `target_fact_id` and no
  volume. A composite `(id, user_id)` uniqueness plus a composite foreign key
  makes a cross-user void structurally impossible, self-targeting is rejected,
  and a partial unique index allows at most one direct void per target.
- **Meal adherence.** Canonical `meal_key` vocabulary and mandatory `adhered`.
  Deliberately **no** uniqueness per meal and day, so multiple observations
  remain storable.
- **Daily targets.** `calorie_target_kcal` in `0.01..20000`. `target_source`
  `calculated` requires both `weight_kg` (`0.01..500`) and a bounded
  `calculation_algorithm`; every other source forbids both. Multiple snapshots
  per local day are allowed.

**RLS and grants.** Identical to the frozen core matrix: RLS enabled, a single
own-row `FOR SELECT TO authenticated` policy using `(select auth.uid()) =
user_id`, `anon` granted nothing, `authenticated` `SELECT` only, `service_role`
`SELECT, INSERT` only, `PUBLIC` nothing. No `UPDATE`, `DELETE`, `TRUNCATE`,
`REFERENCES`, `TRIGGER` or `ALL` for these roles; owners and superusers sit
outside the matrix. RLS does not restrict `service_role`. Every ownership /
RLS lookup path is indexed, and each table has a direct `user_id` foreign key
to `auth.users(id) ON DELETE CASCADE` — account deletion remains the single
explicit deletion path.

**Evidence.** `supabase/tests/progress_history_auxiliary/` replays all 19
migrations on a disposable PostgreSQL 17.9 cluster and runs a frozen inventory
of 127 cases (54 positive, 73 negative); the recorded run passed with zero
failures, and the core suite stays at 169/169. Details in
[`progress-history-auxiliary-validation.md`](./progress-history-auxiliary-validation.md).
Status: `8.1A2 — INDEPENDENTLY VALIDATED`.

**Still deferred to trusted ingestion.** Fingerprint computation and
canonicalization, replay-versus-conflict resolution, IANA timezone validation,
`local_day` derivation, clock-relative occurrence validation, refusing to void
a row that is itself a void, and atomic correction/completion transactions. No
clock-dependent CHECK exists and schema constraints alone do not make ingestion
safe. No RPC, view, outbox, service or UI was added.

## Durable dispatch outbox schema (Sprint 8.1A3)

Sprint 8.1A3 added `public.history_dispatch_outbox` as one additive migration;
the nineteen previous migrations are unchanged and the repository now holds 20.
It is mutable server-owned delivery state, **not** canonical history, and is
never read by clients.

**Shape.** Frozen vocabularies for `event_kind` (`session_completed`,
`session_voided`, `session_corrected`), `consumer` (`training_plan_sync`,
`gamification`, `goals`) and `state` (`pending`, `processing`,
`retry_scheduled`, `delivered`, `dead_letter`); `attempt_count` integral and
`>= 0`; `event_version` fixed at `1`; bounded `lease_owner` (1–100),
`last_error_code` (1–64) and `last_error_summary` (1–500); defaults `pending`,
`0`, `1` and `now()` for `next_attempt_at`, `created_at` and `updated_at`. The
ten-attempt budget is deliberately **not** a CHECK — it is an operational rule
of the future restricted worker functions.

**Subject resolution.** `session_completed` forbids `adjustment_id`;
`session_voided` and `session_corrected` require it. Duplicate protection uses
two **partial** unique indexes — `(session_id, event_kind, consumer)` where
`adjustment_id IS NULL` and `(adjustment_id, event_kind, consumer)` where it is
not null — because a single four-column nullable unique constraint would be
ineffective under PostgreSQL null semantics.

**Ownership.** A direct `user_id` foreign key to `auth.users(id) ON DELETE
CASCADE`, plus same-user composite foreign keys `(session_id, user_id) →
workout_sessions(id, user_id)` and `(adjustment_id, user_id) →
workout_session_adjustments(id, user_id)`. No foreign key points at a mutable
training-plan table.

**Indexes (contract §15).** Claim eligibility `(state, next_attempt_at, id)`
partial on `pending`/`retry_scheduled`; lease expiry `(lease_expires_at)`
partial on `processing`; `(user_id)`; `(session_id, user_id)`;
`(adjustment_id, user_id)` partial where not null; dead-letter review
`(state, updated_at)`; delivered-row retention `(state, delivered_at)`.

**RLS and grants.** RLS is enabled with **no** policy. `PUBLIC`, `anon` and
`authenticated` receive nothing at all; `service_role` receives `SELECT`,
`INSERT`, `UPDATE` and `DELETE` only — never `ALL`, `TRUNCATE`, `REFERENCES` or
`TRIGGER`. `service_role` bypasses RLS by design, so outbox safety rests on the
absent user-facing grants, server-only credential isolation and the composite
ownership constraints. The `DELETE` grant exists only to make the future 90-day
`delivered`-row retention boundary possible through a restricted server-only
maintenance function; no automatic cleanup exists and the grant enforces
nothing. Deleting an outbox row never cascades into sessions, adjustments or
auxiliary facts; account deletion remains the single explicit ownership
cascade.

**Privilege reset (Sprint 8.1A3-C1).** The original outbox migration granted
the four contracted privileges without first revoking inherited ones. Where the
database carries permissive default table privileges, `service_role` therefore
also retained `TRUNCATE`, `REFERENCES`, `TRIGGER` and `MAINTAIN`. One additive
corrective migration now revokes every privilege on the table from `PUBLIC`,
`anon`, `authenticated` and `service_role` and re-grants only `SELECT`,
`INSERT`, `UPDATE` and `DELETE` to `service_role`. Table, data, indexes,
constraints, RLS and the deliberate absence of policies are untouched;
schema-wide default privileges are unchanged; the history and auxiliary grants
are unchanged.

**Evidence.** `supabase/tests/progress_history_outbox/` replays all 21
migrations on a disposable PostgreSQL 17.9 cluster — now armed with permissive
default table privileges — and runs a frozen inventory of 107 cases (61
positive, 46 negative); the recorded run passed with zero failures, with the
core suite at 169/169 and the auxiliary suite at 127/127.
`regression-default-grants.sh` additionally proves the suite fails without the
corrective migration and passes with it. Details in
[`progress-history-outbox-validation.md`](./progress-history-outbox-validation.md).
Status: `8.1A3-C1 — IMPLEMENTED, PENDING INDEPENDENT VALIDATION`.

**Not implemented yet.** Claim, acknowledgement and lease-recovery functions,
retry and backoff behaviour, operator manual replay, retention cleanup, the
ingestion and adjustment RPCs, workers, consumers, read models, services and
UI. No trigger, function, view or RPC was created by this sprint.

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
