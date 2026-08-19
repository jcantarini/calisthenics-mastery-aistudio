# Progress & History — Architecture Decision Proposal (Sprint 8.0B-A, closed by 8.0B-A-C1)

**Status:** PROPOSAL — pending independent validation. Not approved, not
implemented.
**Scope:** documentation only. No executable behaviour, schema, policy or
dependency changed.
**Successor:** Sprint 8.0B-B independently validates this proposal and only
then creates ADR 0005 and the domain contracts.

ADR 0005 does not exist and has **not** been approved. Nothing in this
document is an implemented fact. Implemented facts are only those recorded in
[progress-current-state-audit.md](./progress-current-state-audit.md) and the
frozen Core Architecture v1.0 documents.

---

## 1. Executive summary

Sprint 8.0A concluded `READY WITH BLOCKERS`: the app has a canonical,
Supabase-backed stack for Training Plans, Goals, XP, Progression and
Achievements, but **no history domain**. What the Progress and Weekly Report
screens display today is either (a) reconstructed from the mutable current
training plan, or (b) read from the legacy device-local prototype state
`barra:state:v2` in `src/lib/store.ts`.

This proposal converts the ten blockers into evidence-based recommendations.
Its central thesis:

> Completed training is a **historical fact** and must be stored as an
> independent, append-only, snapshot-bearing record — written only through a
> trusted server-side ingestion boundary, never derived from prescription
> (`planned_workouts`) or from mutable profile data.

Headline recommendations:

| #   | Blocker                      | Recommended direction                                                                             | Confidence | Status                            |
| --- | ---------------------------- | ------------------------------------------------------------------------------------------------- | ---------- | --------------------------------- |
| 1   | Canonical history model      | New independent append-only domain; `planned_workouts` stays prescription/runtime only            | High       | Approved direction for ADR drafting |
| 2   | Exercise-performance capture | Persist session → exercise → set model in Phase 8; detailed capture UI deferred to 8.5            | High       | Approved direction for ADR drafting |
| 3   | Timer & ad-hoc sessions      | One trusted ingestion command with a canonical `ingestion_key`; one reward pipeline only          | High       | Approved direction for ADR drafting |
| 4   | Legacy local data            | Clean start; no automatic and no user-driven import in v1; no rewards from legacy estimates       | High       | Approved direction for ADR drafting |
| 5   | Nutrition/hydration boundary | Phase 8 persists hydration, meal-adherence and daily-target snapshots; food/CalorieCam is 9B      | High       | Approved direction for ADR drafting |
| 6   | Time contract                | Store UTC instant + IANA zone + precomputed local calendar day as a written fact                  | High       | Approved direction for ADR drafting |
| 7   | Snapshot policy              | Stable IDs + neutral identity snapshot; never store translated UI strings as canonical identity   | High       | Approved direction for ADR drafting |
| 8   | Local-state isolation        | Per-user namespaced key + logout purge + no-inherit rule for unscoped legacy state                | High       | Approved direction for ADR drafting |
| 9   | Ledger enforcement           | Recommend insert-only DB enforcement for `xp_history`; `goal_progress_events` stays mutable       | High       | Recommended for approval          |
| 10  | ADR boundary                 | New `progress-history` domain; ADR 0005 required before any implementation                        | High       | Approved direction for ADR drafting |

Readiness result: see §19.

---

## 2. Validated baseline

- Core Platform Architecture v1.0 — frozen (Sprint 6.6B).
- Phase 7 Goals & Gamification — RELEASE APPROVED.
- Sprint 8.0A + closure 8.0A-C1 — validated; readiness `READY WITH BLOCKERS`.
- Validated dependency baseline: `@lovable.dev/vite-tanstack-config` `2.12.0`,
  `bun.lock` SHA-256 `184c717a13a2b402067877f9689afcd83edf96945a9e94f952c73fcb81805058`,
  Bun `1.3.3`.
- TypeScript 0 errors; 355/355 tests across 23 files; lint 0 errors with 13
  pre-existing Fast Refresh warnings; client + SSR + Nitro builds pass.
- No Progress History domain, migration, service or UI exists.

Primary evidence source: `docs/architecture/progress-current-state-audit.md`.
Targeted evidence was taken from the documents and services listed inline in
each decision. No repository-wide re-audit was performed.

---

## 3. Non-negotiable architectural constraints

Carried forward from
[conventions.md](./conventions.md),
[architecture-freeze-v1.md](./architecture-freeze-v1.md) and ADRs
[0001](./decisions/0001-service-layer-boundaries.md),
[0002](./decisions/0002-training-plan-single-source-of-truth.md),
[0003](./decisions/0003-event-driven-gamification.md),
[0004](./decisions/0004-gamification-orchestrator.md):

1. No second Goals system; no second XP, Progression or Achievement engine.
2. No business calculations inside route components (RULE 1).
3. `TrainingPlanService` remains the sole owner and writer of training-plan
   runtime state (RULE 2 / ADR 0002).
4. Historical facts are never reconstructed from mutable plans or profiles.
5. Historical records never change silently when a plan, exercise, profile or
   calorie target changes.
6. Workout ingestion and all downstream work are idempotent.
7. A client-provided `user_id` is never an authorization decision; the trusted
   server boundary derives the user ID from a validated token.
8. RLS is mandatory for every user-owned object exposed via the Data API, and
   Data API `GRANT`s are designed explicitly and separately from policies.
9. Any privileged/server path derives and validates the authenticated user
   itself, because service-role access bypasses RLS.
10. Views must not bypass RLS: `security_invoker` or no public-role grant.
11. The Progress domain never writes Goals, XP, Progression or Achievement
    tables and never awards rewards on its own.
12. Core Architecture v1.0 is extended only through ADR 0005.

---

## 4. Consolidated decision matrix

| #   | Decision                     | Recommendation                                                                    | Data integrity | Security/privacy | Confidence | Status                              |
| --- | ---------------------------- | ----------------------------------------------------------------------------------- | -------------- | ---------------- | ---------- | ----------------------------------- |
| 1   | Canonical history model      | Independent append-only history domain plus append-only adjustment events         | High impact    | Medium           | High       | Approved direction for ADR drafting |
| 2   | Exercise-performance capture | Persist session → exercise → set model now; UI in 8.5; nullable actuals           | High impact    | Low              | High       | Approved direction for ADR drafting |
| 3   | Timer / ad-hoc               | Single trusted ingestion command keyed by `(user_id, ingestion_key)`              | High impact    | High             | High       | Approved direction for ADR drafting |
| 4   | Legacy local data            | Clean start, no v1 import, no rewards from legacy estimates                       | Medium         | High             | High       | Approved direction for ADR drafting |
| 5   | Nutrition/hydration          | Phase 8 = hydration + adherence + target snapshot; Phase 9B = food/CalorieCam     | Medium         | Low              | High       | Approved direction for ADR drafting |
| 6   | Time contract                | UTC instant + IANA zone + `local_day` written as fact                             | High impact    | Low              | High       | Approved direction for ADR drafting |
| 7   | Snapshot policy              | Canonical ID + neutral identity snapshot; localize at read time                   | High impact    | Low              | High       | Approved direction for ADR drafting |
| 8   | Local-state isolation        | Namespaced key, logout purge, never auto-adopt unscoped v2                        | Medium         | High             | High       | Approved direction for ADR drafting |
| 9   | Ledger enforcement           | Insert-only DB enforcement for `xp_history`; `goal_progress_events` unchanged     | Medium         | High             | High       | Recommended for approval            |
| 10  | ADR boundary                 | New `progress-history` domain, ADR 0005 first                                     | High impact    | Medium           | High       | Approved direction for ADR drafting |

---

## 5. Detailed analysis — Decisions 1–10

Each decision uses the same thirteen fields: current problem, repository
evidence, considered options, recommended decision, rejected options and
reasons, data-integrity implications, security and privacy implications, UX
implications, migration and backward-compatibility implications, dependencies
for later sprints, risks and mitigations, confidence level, decision status.

### Decision 1 — Canonical history model

**Current problem.** There is no record of what a user actually did. "History"
is recomputed by scanning the active plan for rows whose status is
`completed`, so restarting, regenerating or deleting a plan destroys history,
and editing a plan rewrites the past.

**Repository evidence.**

- `src/services/training-plan/TrainingPlanService.ts` — `getActivePlan`,
  `completeWorkout`; sole writer of `training_plans`, `training_weeks`,
  `training_days`, `planned_workouts` (ADR 0002).
- `src/services/goals/GoalTrackingService.ts` → `reconcileGoal` replays
  history by reading `TrainingPlanService.getActivePlan(uid)` and filtering
  `workout.status === "completed"` — reconstruction from mutable prescription,
  bounded to the last 200 rows.
- `docs/architecture/progress-current-state-audit.md` §§ on history
  reconstruction and destroyable history.
- `src/lib/store.ts` — `workoutLog`, `completedSessions`, `streak`.

**Considered options.** A. Extend `planned_workouts` with actual-performance
columns and freeze rows after completion. B. Independent immutable history
domain owned by a new service. C. Hybrid — history only for plan workouts,
ad-hoc sessions elsewhere.

**Recommended decision: B.** Four concepts are separated explicitly:

| Concept               | Owner                                 | Mutability                        |
| --------------------- | ------------------------------------- | --------------------------------- |
| Training prescription | Training (`planned_workouts`)         | Mutable, regenerable              |
| Runtime plan state    | `TrainingPlanService`                 | Mutable state machine             |
| Completed fact        | Progress History (workout session)    | Immutable, append-only            |
| Correction            | Append-only adjustment event          | Never edits the original          |
| Derived analytics     | Progress History read model           | Recomputed, never stored as truth |

- Authoritative historical source: the workout session and its children.
- Plan provenance is stored as **immutable scalar values** — `source_plan_id`,
  `source_planned_workout_id`, plan-name snapshot, week/day snapshot — and
  **not** as foreign keys into mutable, deletable training-plan tables. No
  `ON DELETE SET NULL` relationship may silently mutate historical provenance.
- Ad-hoc workouts are ordinary sessions with no plan provenance and
  `source = 'timer' | 'manual' | 'first_workout'`.
- Sessions are never modified. Voids and corrections are append-only
  adjustment events (§8, Decision 7 and §15).
- Duplicate ingestion is prevented by `(user_id, ingestion_key)` (§10).
- The model needs three levels: **session**, **session exercise**, **session
  set**. Two levels would make per-set analytics a migration-breaking change.

**Rejected options and reasons.** A: couples immutable facts to a regenerable
prescription table owned by another service, violates ADR 0002 ownership and
constraints 4/5, and cannot represent ad-hoc sessions. C: two ingestion paths,
duplicate idempotency logic, guaranteed drift.

**Data-integrity implications.** History survives every plan operation;
analytics become reproducible; provenance cannot be rewritten by plan deletion.

**Security and privacy implications.** New user-owned tables; RLS plus
explicitly designed Data API grants (§12); no new PII class; writes only
through the trusted boundary (§6).

**UX implications.** Enables a real history timeline, honest streaks and
durable personal records.

**Migration and backward-compatibility implications.** Additive only. Existing
plan reconstruction may remain as a clearly labelled read fallback for one
transition sprint.

**Dependencies for later sprints.** 8.0B-B (ADR + contracts), 8.1 (schema and
ingestion), 8.5 (execution UI).

**Risks and mitigations.** Double counting during the transition — mitigate by
ingesting forward-only from the cutover and provenance-tagging anything else.

**Confidence level: High. Decision status: Approved direction for ADR
drafting.**

### Decision 2 — Exercise-performance capture

**Current problem.** Actual sets, reps, load, hold time and RPE are not
persisted at all; prescription is the only surviving number, and actual
duration is computed transiently and discarded.

**Repository evidence.** Audit §§ on discarded duration and missing set data;
`src/services/workout-generator/workoutTypes.ts` defines prescription only;
`src/routes/_authenticated/timer.tsx` computes an MET-based estimate through
`estimateKcal` in `src/lib/store.ts` and writes only to local state.

**Considered options.** A. Summary-only history now, detail later. B. Full
session/exercise/set persistence now, UI later. C. Full persistence and full
UI now.

**Recommended decision: B.** From the first migration the model supports, per
exercise: canonical exercise ID, neutral identity snapshot, prescription
snapshot, completion/skip state, substitution reference, notes, order index;
and per set: set index, reps, load or assistance level, duration, hold time,
distance, RPE, completed flag, optional timestamps. All actuals nullable, so a
summary-only ingestion in 8.1 is a valid degenerate case of the same model.

**Rejected options and reasons.** A creates a compatibility dead end: adding
set-level rows later retro-invalidates every aggregate computed from the
summary. C inflates Phase 8 scope and delays the ingestion boundary Goals and
XP depend on.

**Data-integrity implications.** One stable shape for all sources; aggregates
never need recomputation semantics changes.

**Security and privacy implications.** Child rows carry `user_id` for direct
RLS with composite ownership constraints (§9 of this list, and §12).

**UX implications.** 8.5 can add detailed capture without a data migration;
early releases show honest summaries.

**Migration and backward-compatibility implications.** Nullable actuals make
later enrichment purely additive.

**Dependencies for later sprints.** 8.1 (schema), 8.5 (capture UI).

**Risks and mitigations.** Empty child tables early on — acceptable; read
models must treat zero exercises as valid.

**Confidence level: High. Decision status: Approved direction for ADR
drafting.**

### Decision 3 — Timer and ad-hoc sessions

**Current problem.** Timer sessions never reach the canonical flow: they only
mutate local state, so they grant no XP, unlock no achievements and move no
Goals — while a plan completion does all three. Two interfaces completing the
same planned workout could also produce two history rows.

**Repository evidence.** `src/routes/_authenticated/timer.tsx` calls
`logWorkoutSession` (`src/lib/store.ts`);
`TrainingPlanService.completeWorkout` is what reaches
`GamificationOrchestrator` (ADR 0004) and `GoalTrackingService.trackSafely`;
`src/routes/_authenticated/first-workout.tsx` is a third path.

**Considered options.** A. Let each surface call the Orchestrator directly.
B. Single trusted ingestion command with a canonical `ingestion_key`.
C. Keep timer sessions local.

**Recommended decision: B.** Timer, first-workout and plan completion all
produce the same ingestion command, submitted through the trusted server
boundary (§6) and coordinated by the `WorkoutCompletionCoordinator` (§7).
Uniqueness is `(user_id, ingestion_key)`; `source` is provenance metadata only
and never participates in uniqueness (§10). Accidental sessions are handled by
explicit completion confirmation plus nonzero workout evidence — no arbitrary
duration threshold (§17).

**Rejected options and reasons.** A: a second reward path, violating
constraint 11. C: perpetuates the dual-truth problem and unequal rewards.

**Data-integrity implications.** Exactly one history session per logical
completion, regardless of the originating interface.

**Security and privacy implications.** All writes pass the trusted boundary;
the browser never writes reward-bearing history.

**UX implications.** Timer and ad-hoc training finally count toward XP, goals
and streaks.

**Migration and backward-compatibility implications.** Existing direct
dispatch in `TrainingPlanService.completeWorkout` is only removed in the later
implementation sprint, not in this documentation sprint.

**Dependencies for later sprints.** 8.1 (ingestion), 8.2 (source wiring).

**Risks and mitigations.** Retry storms — mitigated by durable outbox and
idempotent downstream handling (§8).

**Confidence level: High. Decision status: Approved direction for ADR
drafting.**

### Decision 4 — Legacy local-data transition

**Current problem.** `barra:state:v2` holds `workoutLog`,
`completedSessions`, `streak`, goals, `dietLog`, profile and diet/hydration
reminders, is not namespaced by `user_id`, and survives logout — so the
signed-in account may not be the account that produced the data.

**Repository evidence.** `src/lib/store.ts` (`KEY = "barra:state:v2"`,
`useAppState`); `src/routes/_authenticated/perfil.tsx` logout calls
`supabase.auth.signOut()` without clearing the key; audit §§ on cross-account
local-data isolation.

**Considered options.** A. Automatic import on first login. B. User-confirmed
one-time import. C. Read-only legacy compatibility period. D. Clean start.

**Recommended decision: D — clean start.** The application is not yet publicly
released, so:

- No automatic import of legacy or inferred workouts into canonical history.
- No user-driven legacy import in v1.
- No XP, achievements, goals or streaks awarded from legacy estimates.
- A developer-only export or diagnostic tool may be considered later if
  inexpensive; it is not a launch requirement and not a blocker.

**Rejected options and reasons.** A: imports data of unprovable ownership into
an authenticated account — a privacy defect. B: same ownership problem plus
v1 scope and duplicate-detection complexity for data that has no real users.
C alone: extends the dual-truth window indefinitely.

**Data-integrity implications.** Canonical history starts empty and contains
only trusted, server-ingested facts.

**Security and privacy implications.** Eliminates the cross-account adoption
path entirely; pairs with Decision 8.

**UX implications.** Pre-release users see an empty history; acceptable given
no public release.

**Migration and backward-compatibility implications.** Legacy fields are
removed from `src/lib/store.ts` one release after Progress and Weekly Report
read exclusively from the canonical domain.

**Dependencies for later sprints.** 8.3 (canonical reads), 8.4 (legacy
retirement, namespacing).

**Risks and mitigations.** Perceived data loss — mitigated by messaging and by
the optional developer-only export.

**Confidence level: High. Decision status: Approved direction for ADR
drafting.**

### Decision 5 — Nutrition and hydration boundary

**Current problem.** Nutrition and hydration have local browser persistence
only, are not user-scoped, and historical calorie figures are recomputed from
the _current_ profile, so past days change when weight changes.

**Repository evidence.** `src/lib/nutrition.ts` (BMR/TDEE from current
profile), `src/lib/store.ts` `dietLog`/`DietDayLog`,
`src/routes/_authenticated/dieta.tsx`,
`src/routes/_authenticated/relatorio.tsx`.

**Considered options.** A. Defer everything to Phase 9B. B. Staged model.
C. Full food logging in Phase 8.

**Recommended decision: B — staged model.**

| Concept                                    | Phase                            |
| ------------------------------------------ | -------------------------------- |
| Meal-plan prescription                     | Derived, not stored              |
| Meal-adherence fact                        | Phase 8 (auxiliary fact)         |
| Hydration fact (ml, local day)             | Phase 8 (auxiliary fact)         |
| Daily-target snapshot (kcal, weight)       | Phase 8 (auxiliary fact)         |
| Recorded food facts / calorie ingestion    | Phase 9B                         |
| CalorieCam and user-corrected estimates    | Phase 9B, flagged                |

Hydration and meal adherence are **auxiliary progress facts**. They are not
child entities of a workout session unless a later explicit product decision
creates such a relationship.

**Rejected options and reasons.** A loses the adherence series users already
keep locally. C duplicates Phase 9B work and inflates Phase 8.

**Data-integrity implications.** Daily-target snapshots stop history from
being rewritten when profile weight changes.

**Security and privacy implications.** Health-adjacent data becomes
server-persisted and user-owned; RLS and explicit grants required.

**UX implications.** Phase 8 reports can honestly show adherence, hydration
totals and the target in force that day — never "calories eaten".

**Migration and backward-compatibility implications.** Additive; Phase 9B adds
food facts without altering Phase 8 fact shapes.

**Dependencies for later sprints.** 8.1 (schema), 8.3 (reports), 9B.

**Risks and mitigations.** Scope creep into food logging — mitigated by the
explicit phase table above.

**Confidence level: High. Decision status: Approved direction for ADR
drafting.**

### Decision 6 — Time and timezone contract

**Current problem.** `todayKey()` in `src/lib/store.ts` builds day keys from
the device's local date, while services and Supabase use UTC `timestamptz`;
grouping shifts when the device timezone changes.

**Repository evidence.** `src/lib/store.ts` `todayKey()`; audit § on
inconsistent timezone handling; `timestamptz` columns across Supabase tables.

**Considered options.** A. Store UTC only and localize on read. B. Store local
date only. C. Store UTC instant + IANA zone + precomputed local day.

**Recommended decision: C.** Written at ingestion time:

- `occurred_at timestamptz` — the UTC instant (authoritative ordering).
- `tz` — the user's IANA zone resolved at write time.
- `local_day date` — the calendar day in `tz` at write time; a **fact**, never
  recomputed.

Weeks, months, streaks and ISO boundaries are derived at read time from
`local_day`. Scheduled plan dates remain zone-less calendar dates. Unknown
zones use the profile zone and are marked `tz_source = 'assumed'`.

**Rejected options and reasons.** A re-localizes old rows against the current
device zone (off-by-one grouping after travel). B loses ordering precision and
cross-zone comparability.

**Data-integrity implications.** Grouping is stable forever; DST and travel
affect only future rows.

**Security and privacy implications.** IANA zone is coarse location metadata;
stored only on the user's own rows.

**UX implications.** Streaks and "today" match what the user experienced.

**Migration and backward-compatibility implications.** New columns only.

**Dependencies for later sprints.** 8.1 (schema), 8.3 (read models).

**Risks and mitigations.** Wrong zone at write time — mitigated by
`tz_source` and by never rewriting `local_day`.

**Confidence level: High. Decision status: Approved direction for ADR
drafting.**

### Decision 7 — Historical snapshot policy and localization

**Current problem.** Every display value today resolves from mutable current
sources (plan, catalog, profile), so history rewrites itself; and naive
snapshotting risks freezing a translated UI string as the canonical identity.

**Repository evidence.** `src/lib/programs.ts` and `src/lib/content-i18n.ts`
(localized exercise labels), `src/lib/nutrition.ts` (profile-derived values),
audit §§ on mutable-source display.

**Considered options.** A. Snapshot nothing. B. Snapshot everything including
localized labels. C. Snapshot calculation and identity values only, with a
neutral identity label.

**Recommended decision: C.**

| Value                                       | Treatment                                    |
| ------------------------------------------- | -------------------------------------------- |
| `user_id`, session ID                       | Stable ID                                    |
| `source_plan_id`, `source_planned_workout_id` | Immutable scalar provenance (no FK)        |
| Plan name, workout title                    | Immutable snapshot                           |
| Exercise canonical ID                       | Stable ID when available                     |
| Exercise identity snapshot                  | Neutral, non-translated label / source key   |
| Exercise prescription at completion         | Immutable snapshot                           |
| Actual performance (sets/reps/RPE…)         | Immutable fact                               |
| Difficulty / level at completion            | Immutable snapshot                           |
| `estimated_duration_sec`, `actual_duration_sec` | Both stored (distinct meanings)          |
| `calories_kcal` + `calories_source`         | Single value plus provenance (Decision 10)   |
| Body weight used in calculation             | `calculation_weight_kg` snapshot             |
| Calorie target of the day                   | Immutable snapshot (auxiliary fact)          |
| Week / day number                           | Immutable snapshot                           |
| `source`, `ingestion_key`                   | Immutable fact                               |
| App / schema version                        | Immutable stamp                              |
| Locale-sensitive text, i18n strings         | **Not stored as identity** — read-time       |
| Media, video URLs, exercise cues            | **Not copied** — current catalog             |
| Achievement/XP amounts                      | **Not copied** — owned by gamification       |

Display rule: prefer the current localized catalog label when the canonical
exercise still exists; fall back to the stored neutral snapshot when it does
not. Snapshots preserve historical meaning without permanently storing a UI
translation as the canonical name.

**Rejected options and reasons.** A rewrites history whenever a catalog or
profile changes. B freezes translations, so history renders in the language
used at completion and never follows the user's current language.

**Data-integrity implications.** Deleted catalog entries still render
meaningfully; calculations stay reproducible.

**Security and privacy implications.** Snapshot scope is minimal; no extra
personal data is duplicated.

**UX implications.** History follows the user's current language while
remaining historically accurate.

**Migration and backward-compatibility implications.** Snapshot columns are
additive and never backfilled from mutable sources.

**Dependencies for later sprints.** 8.1 (schema), 8.3 (presentation).

**Risks and mitigations.** Snapshot bloat — mitigated by the "calculation or
identity only" rule.

**Confidence level: High. Decision status: Approved direction for ADR
drafting.**

### Decision 8 — Local-state user isolation

**Current problem.** `barra:state:v2` is a single unscoped key that survives
logout, so a second account on the same browser inherits the first account's
profile, workouts, goals, diet and reminders. RLS does not protect
localStorage.

**Repository evidence.** `src/lib/store.ts` (`KEY = "barra:state:v2"`);
`src/routes/_authenticated/perfil.tsx` (`signOut` without purge);
`src/lib/workout-reminders.ts` (`barra:workout-reminders:v1`, cache of the
RLS-protected `workout_reminder_settings`); audit § on cross-account local-data
isolation.

**Considered options.** A. Keep the unscoped key. B. Purge on logout only.
C. Namespace per user, purge on logout, never auto-adopt.

**Recommended decision: C** (implementation deferred):

1. Namespaced key `barra:state:{userId}:v3`, resolved after session hydration;
   no read before the user is known.
2. Logout removes the active namespaced key and any anonymous scratch key.
3. Pre-authentication state lives under `barra:state:anon:v3` and is never
   promoted to a user namespace automatically.
4. When a different user signs in, no legacy or foreign namespace is read.
5. Unscoped v2 is never auto-adopted; under Decision 4 it is simply retired.
6. Diet/hydration reminder state moves with the namespaced key; it stays
   local-only until a canonical owner exists.
7. `barra:workout-reminders:v1` must also be purged on logout; the two
   reminder systems stay separate and the naming overlap is documented as
   debt, not merged in Phase 8.

**Rejected options and reasons.** A leaves an active cross-account leak. B
still allows a stale unscoped key to be read by the next account before purge.

**Data-integrity implications.** Local state stops mixing accounts.

**Security and privacy implications.** Closes the only currently identified
cross-account data-isolation defect.

**UX implications.** Users signing out lose local scratch state — acceptable
and expected.

**Migration and backward-compatibility implications.** v2 → v3 is a retirement,
not a migration.

**Dependencies for later sprints.** 8.4.

**Risks and mitigations.** Reading before hydration — mitigated by rule 1.

**Confidence level: High. Decision status: Approved direction for ADR
drafting.**

### Decision 9 — Ledger enforcement

**Current problem.** Append-only behaviour of `xp_history` is an application
convention, not a database invariant; `goal_progress_events` is often
mislabelled append-only although deletion is part of its retry contract.

**Repository evidence.** `src/services/xp/XPService.ts` reads and inserts
`xp_history` only, correcting with negative compensating rows; the migration
grants `SELECT, INSERT, UPDATE, DELETE` on `xp_history` to `authenticated`
under a `FOR ALL` ownership policy. `src/services/goals/GoalTrackingService.ts`
inserts claims, `UPDATE`s them on settlement and `DELETE`s them on
release/retry; the same grants apply.

**Considered options.** A. Leave both as-is. B. Enforce insert-only in the
database for `xp_history` and keep `goal_progress_events` mutable. C. Make
both append-only.

**Recommended decision: B.** For `xp_history`: revoke `UPDATE`/`DELETE` from
`authenticated`, split the `FOR ALL` policy into explicit `SELECT` and
`INSERT` policies, and keep balance corrections as compensating rows — no
service change is required because the service already only selects and
inserts. For `goal_progress_events`: keep it as a mutable operational ledger,
because insert/update/delete is its documented retry contract, and the unique
constraint only protects duplicates while the row exists.

**Rejected options and reasons.** A leaves a browser-writable XP ledger. C
breaks the Goals retry contract.

**Data-integrity implications.** XP becomes tamper-resistant at the database
level; Goals keeps working unchanged.

**Security and privacy implications.** Removes client-side XP rewriting.
Hardening the Goals write boundary (moving claim/settle/release behind a
server boundary) is deferred to a future ADR 0006 or Phase 10 decision and
must not block ADR 0005.

**UX implications.** None visible.

**Migration and backward-compatibility implications.** Grant/policy change
only; no data rewrite. Not executed in this sprint.

**Dependencies for later sprints.** Independent of ADR 0005; can ship with 8.1
or later.

**Risks and mitigations.** An unnoticed update/delete usage against
`xp_history` — mitigated by a targeted grep and test run in the implementing
sprint before the grants change.

**Confidence level: High. Decision status: Recommended for approval.**

### Decision 10 — ADR and frozen-architecture boundary, calorie model

**Current problem.** Adding a history domain extends frozen Core Architecture
v1.0, so it needs an ADR; and the earlier draft contradicted itself by storing
both "estimated calories" and "actual calories" when both are estimates.

**Repository evidence.** `architecture-freeze-v1.md` (v1.0 frozen; changes via
ADR); ADRs 0001–0004; `src/lib/store.ts` `estimateKcal` (MET-based estimate,
the only calorie figure the app can produce today).

**Considered options.** A. Implement without an ADR. B. ADR 0005 for the whole
domain. C. Several small ADRs.

**Recommended decision: B**, with the domain defined in §6–§15 and ADR 0005
drafted from the outline in §18. Follow-up ADR 0006 may cover ledger and Goals
write-boundary hardening.

**Calorie model correction.** Store a single value plus provenance:

- `calories_kcal`
- `calories_source` ∈ `estimated | measured | user_entered | unknown`
- `calorie_algorithm_version` (when estimated)
- `calculation_weight_kg` (when relevant)

Estimated calories are never labelled actual calories.
`estimated_duration_sec` and `actual_duration_sec` remain separate because
they describe meaningfully different values.

**Rejected options and reasons.** A violates the freeze process. C fragments a
single coherent domain decision. Storing "estimated" and "actual" calorie
columns is rejected as semantically false.

**Data-integrity implications.** Calorie figures are self-describing and can
be re-derived or filtered by provenance.

**Security and privacy implications.** None beyond the general model.

**UX implications.** The UI can honestly label estimates.

**Migration and backward-compatibility implications.** Algorithm changes bump
`calorie_algorithm_version` instead of rewriting history.

**Dependencies for later sprints.** 8.0B-B (ADR 0005), 8.1.

**Risks and mitigations.** Provenance left `unknown` — mitigated by requiring
the ingestion contract to set it explicitly.

**Confidence level: High. Decision status: Approved direction for ADR
drafting.**

---

## 6. Trusted ingestion and atomicity boundary

The browser must **not** write directly to reward-bearing Progress History
tables. Conceptual flow:

1. The client calls an authenticated TanStack Start server route or server
   function.
2. The trusted server boundary validates the user token.
3. The server derives the user ID from the validated identity.
4. A service-role database client — **without forwarding the user JWT** —
   calls a restricted PostgreSQL transactional function/RPC.
5. That function atomically creates the workout session, its exercises, its
   sets, any supplied Phase 8 auxiliary facts, and the durable
   outbox/dispatch record.
6. The transaction commits completely or creates nothing.

The eventual database function must:

- Use `SECURITY INVOKER`, because it is invoked by the service role.
- Set a safe empty `search_path`.
- Reference relations with fully qualified schema names.
- Have execution revoked from `PUBLIC`, `anon` and `authenticated`.
- Be executable only by `service_role`.
- Receive the server-derived user ID.
- Never trust a browser-provided user ID.

No SQL is written and no endpoint is implemented in this sprint.

---

## 7. Application-level completion coordinator

A future application service, conceptually `WorkoutCompletionCoordinator`, is
an orchestration component — **not** a new domain owner.

Responsibilities:

1. Capture the immutable completion snapshot.
2. Submit the idempotent history-ingestion command.
3. Ensure workout history and the durable dispatch record commit atomically.
4. After commit, idempotently synchronize training-plan runtime through
   `TrainingPlanService`.
5. Dispatch Gamification and Goals processing.
6. Retry incomplete downstream work through durable recovery.

Ownership rules:

- `TrainingPlanService` remains the sole owner and writer of training-plan
  runtime state; the coordinator never writes plan tables directly.
- Progress History owns historical workout facts.
- Gamification owns XP and achievement consequences.
- Goals owns goal-progress consequences.

History must be durable **before** plan-runtime synchronization. If plan
synchronization or a reward consumer fails, persistent delivery state allows
safe retry without creating another workout session. The current direct
dispatch behaviour is removed only in a later implementation sprint.

---

## 8. Durable outbox / dispatch model

A durable outbox or dispatch ledger is written in the **same transaction** as
the workout session, with independent delivery state for:

- Training-plan synchronization
- Gamification
- Goals

The design must support immediate best-effort dispatch after commit, recovery
of pending or failed deliveries, per-consumer attempt tracking, idempotent
downstream handling, and **no rollback of the historical workout** merely
because a downstream consumer is temporarily unavailable. The outbox is
server-owned: it is never readable or writable by `authenticated` or `anon`.

No production schema or executable migration is defined here — contract and
ownership only.

---

## 9. Append-only corrections and child ownership integrity

**Append-only corrections.** The workout session has **no** `voided_at`
column. Corrections use an append-only entity, conceptually
`WorkoutSessionAdjustment` (equivalently `WorkoutSessionEvent`), supporting:

- `kind`: `void` or `correction`
- `target_session_id`
- `replacement_session_id` (when applicable)
- `reason`
- `occurred_at`
- Actor / user ownership metadata

Rules: the original session is never modified; a correction creates a
replacement session plus an adjustment linking it to the original; read models
apply adjustments; voided sessions are excluded from metrics, XP-relevant
projections and normal history totals; the original fact remains available for
audit. Account deletion may cascade as the explicit legal/user-deletion
exception.

**Child ownership integrity.** Where child tables duplicate `user_id` for
efficient RLS, composite ownership constraints are required:

- Parent has uniqueness on `(id, user_id)`.
- Child uses `(session_id, user_id)` referencing the parent `(id, user_id)`.
- Set rows use `(session_exercise_id, user_id)` referencing their parent.
- Equivalent guarantees apply to any additional child entity.

This prevents a child owned by one user from referencing a parent owned by
another user. Indexes are required for every foreign-key column or column
group, every `user_id` used by RLS, and frequently used ownership and lookup
paths.

---

## 10. Idempotency strategy

Every ingestion request carries a canonical `ingestion_key`. Uniqueness is
enforced conceptually with `(user_id, ingestion_key)`. `source` is provenance
metadata and does **not** participate in the uniqueness constraint.

Canonical key rules:

| Case                                | Canonical `ingestion_key`             |
| ----------------------------------- | ------------------------------------- |
| Plan-linked completion              | `planned-workout:{plannedWorkoutId}`  |
| Timer-only ad-hoc workout           | `timer:{stableUuid}`                  |
| First-workout / other ad-hoc flow   | `first-workout:{stableUuid}`          |

The plan-linked key is identical regardless of whether completion originated
from the plan UI, the timer or another workflow. The stable UUID is created
once for the logical completion attempt and reused on retries.

Clarifications:

- `ingestion_key` identifies the incoming **logical command**.
- The workout session ID identifies the **persisted history event**.
- Retrying the same logical command returns or resolves to the already-created
  session.
- Two interfaces completing the same planned workout cannot create duplicate
  history sessions.
- Downstream engines keep their own idempotency (XP source keys, goal claims),
  so retries at any layer are safe.

---

## 11. Pagination and indexes

History timelines use **keyset pagination**, never `OFFSET`. The conceptual
cursor is `(occurred_at, id)`; `id` provides deterministic ordering when
multiple sessions share the same timestamp.

Required conceptual indexes:

- Unique `(user_id, ingestion_key)`
- `(user_id, occurred_at DESC, id DESC)` for timeline pagination
- `(user_id, local_day)` for local-date grouping
- Every foreign-key column or column group
- Child `user_id` columns used by RLS
- Exercise lookup indexes only where justified by later query contracts

---

## 12. Security, RLS and Data API grants

Authenticated users:

- May `SELECT` only their own history through RLS if direct Data API reads
  remain enabled.
- Receive **no** direct `INSERT`, `UPDATE` or `DELETE` grants on history
  tables.
- May **not** execute the ingestion RPC directly.
- May **not** read or write the outbox.

Anonymous users: no access.

Trusted server boundary: performs validated writes through the service-role-only
transaction function, derives the user ID from verified authentication, and
never trusts a client-supplied user ID.

Defense in depth:

- RLS remains enabled on every user-owned history table.
- Ownership policies use the optimized form `(select auth.uid()) = user_id`.
- `user_id` columns used in policies are indexed.
- Data API grants are designed explicitly; RLS is not treated as a grant
  system.
- Any exposed view uses `security_invoker`; otherwise it remains unexposed.
- `SECURITY DEFINER` is never used to bypass permissions.

None of this is implemented in this sprint.

---

## 13. Proposed Progress History domain boundary

```
Timer            First-workout          Plan completion UI
  \                    |                       /
   \                   v                      /
    -->  WorkoutCompletionCoordinator (application layer)
                       |
                       v
        Authenticated server route / server function
                       |  (validates token, derives user_id)
                       v
        service_role  ->  transactional ingestion function
                       |  (session + exercises + sets + facts + outbox)
                       v
                   COMMIT (atomic)
                       |
        outbox dispatch (independent, retryable)
            /              |                \
           v               v                 v
 TrainingPlanService  Gamification      GoalTrackingService
 (plan runtime)       Orchestrator      (goal progress only)
```

Progress / History / Report screens read only from Progress History read
models, never from `planned_workouts` and never from `src/lib/store.ts`.

**Domain name:** `progress-history` (services under
`src/services/progress-history/`, pure rules in `*Rules.ts`, hooks in
`src/hooks/useWorkoutHistory.ts`, presentation under
`src/components/progress/`).

**Non-responsibilities.** Never generates or mutates plans; never awards XP,
levels or achievements; never updates goals; never writes Training, Goals or
Gamification tables; never contains reward amounts or level maths.

---

## 14. Conceptual entity model

No SQL, no migration, no generated types — names are proposals only.

**Immutable historical facts**

- **WorkoutSession** — `id`, `user_id`, `ingestion_key`, `source`,
  `occurred_at`, `tz`, `tz_source`, `local_day`, `source_plan_id?`,
  `source_planned_workout_id?`, snapshots (`plan_name`, `workout_title`,
  `week_number`, `day_number`, `difficulty`), `estimated_duration_sec?`,
  `actual_duration_sec?`, `calories_kcal?`, `calories_source`,
  `calorie_algorithm_version?`, `calculation_weight_kg?`, `notes?`,
  `app_version`, `schema_version`. No `voided_at`; no foreign key to
  training-plan tables.
- **SessionExercise** — `id`, `session_id`, `user_id`, `order_index`,
  `exercise_id?`, `exercise_identity_snapshot` (neutral, non-translated),
  `prescription_snapshot`, `substituted_for_exercise_id?`, `status`, `notes?`.
- **SessionSet** — `id`, `session_exercise_id`, `user_id`, `set_index`,
  `reps?`, `load_kg?`, `assistance_level?`, `duration_sec?`, `hold_sec?`,
  `distance_m?`, `rpe?`, `completed`, `performed_at?`.

**Append-only correction events**

- **WorkoutSessionAdjustment** — `id`, `user_id`, `kind` (`void` |
  `correction`), `target_session_id`, `replacement_session_id?`, `reason`,
  `occurred_at`, actor metadata.

**Mutable operational state (server-owned)**

- **HistoryDispatchOutbox** — `id`, `user_id`, `session_id`, `consumer`
  (`plan_sync` | `gamification` | `goals`), `state`, `attempts`,
  `last_error?`, `next_attempt_at?`. Not exposed to `authenticated` or `anon`.

**Auxiliary Phase 8 facts (not workout children)**

- **HydrationFact** — `user_id`, `local_day`, `tz`, `volume_ml`,
  `recorded_at`.
- **MealAdherenceFact** — `user_id`, `local_day`, `tz`, `meal_key`,
  `completed`, `recorded_at`.
- **DailyTargetSnapshot** — `user_id`, `local_day`, `tz`,
  `calorie_target_kcal`, `calculation_weight_kg`, `recorded_at`.

**Downstream projections** — weekly volume, streaks, personal records and
report aggregates are computed on read, cached in TanStack Query, and never
stored as a second source of truth.

Relationships: `WorkoutSession 1—n SessionExercise 1—n SessionSet`, with
composite ownership constraints (§9). Hydration, meal adherence and daily
targets are **not** children of a workout session.

---

## 15. Legacy transition strategy

1. Ship the new domain; Progress and Weekly Report read canonical data only.
2. Ship per-user namespacing and logout purge (Decision 8).
3. Retire legacy history fields in `src/lib/store.ts` one release later.
4. No legacy data is imported, and no legacy estimate produces rewards.

---

## 16. Dependencies between Phase 8 sprints

| Sprint     | Depends on                     | Delivers                                          |
| ---------- | ------------------------------ | ------------------------------------------------- |
| 8.0B-A     | 8.0A validated                 | This proposal                                     |
| 8.0B-A-C1  | 8.0B-A validation findings     | This closure (documentation only)                 |
| 8.0B-B     | Independent validation         | ADR 0005 + domain contracts                       |
| 8.1        | ADR 0005                       | Schema, RLS/grants, ingestion boundary, outbox    |
| 8.2        | 8.1                            | Coordinator wiring: plan, timer, first-workout    |
| 8.3        | 8.2                            | Progress & History read models and UI             |
| 8.4        | 8.3                            | Local-state isolation and legacy retirement       |
| 8.5        | 8.1                            | Detailed workout-execution capture UI             |
| 9B         | 8.3                            | Food facts, calorie ingestion, CalorieCam         |

---

## 17. Resolved product decisions

| Topic             | Selected direction                                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Legacy data       | Clean start; no automatic and no user-driven import in v1; no rewards from legacy estimates; dev-only export may be considered later |
| Hydration & meals | Phase 8 persists hydration facts, meal-adherence facts and the applicable daily-target snapshot; auxiliary, not workout children |
| Food / CalorieCam | Phase 9B                                                                                                        |
| Timer completion  | No duration threshold; persisted only after explicit completion confirmation **and** valid nonzero workout evidence; accidental or empty sessions are discarded |
| User corrections  | Void or correct through append-only adjustment events; originals are never edited or deleted                    |
| XP history        | Recommend insert-only database enforcement for `xp_history`                                                     |
| Goal progress     | `goal_progress_events` stays a mutable operational ledger; hardening deferred to ADR 0006 / Phase 10 and does not block ADR 0005 |

No item in this table remains open.

---

## 18. Risks and mitigations

| Risk                                        | Mitigation                                                     |
| ------------------------------------------- | ---------------------------------------------------------------- |
| Duplicate history from two interfaces       | Canonical `ingestion_key` with `(user_id, ingestion_key)` unique |
| History committed, rewards lost             | Durable outbox in the same transaction + retry (§8)              |
| Downstream outage rolling back history      | Never roll back; delivery state is independent per consumer      |
| Cross-account local data leakage before 8.4 | Prioritise Decision 8; never auto-adopt unscoped v2              |
| XP ledger tampering from the browser        | Decision 9 insert-only enforcement                               |
| Goal claim deletion enabling replay         | Future ADR 0006 server boundary; not an ADR 0005 blocker         |
| Provenance mutated by plan deletion         | Scalar provenance, no FK, no `ON DELETE SET NULL`                |
| Cross-user child rows                       | Composite `(id, user_id)` ownership constraints (§9)             |
| Timeline pagination drift                   | Keyset cursor `(occurred_at, id)` (§11)                          |
| Calorie semantics confusion                 | Single `calories_kcal` + `calories_source` (Decision 10)         |
| History frozen in one language              | Neutral identity snapshot + read-time localization (Decision 7)  |

---

## 19. ADR 0005 drafting outline and readiness

ADR 0005 does not exist and was **not** created in this sprint. Its drafting
outline:

1. Context — Sprint 8.0A blockers and this validated proposal.
2. Decision — Progress History as an independent immutable domain.
3. Ingestion boundary — authenticated server route/function, service-role RPC.
4. Transaction boundary — session + children + facts + outbox, all-or-nothing.
5. Idempotency — canonical `ingestion_key`, `(user_id, ingestion_key)`.
6. Ownership — domain ownership rules and the completion coordinator.
7. Append-only corrections — adjustment events, no mutation of originals.
8. Security and Data API grants — no authenticated writes, no anon access.
9. RLS — `(select auth.uid()) = user_id`, indexed `user_id`, invoker views.
10. Outbox and recovery — per-consumer delivery state and retry.
11. Query contracts and indexes — keyset pagination and required indexes.
12. Snapshot policy — neutral identity snapshots, read-time localization.
13. Legacy-data policy — clean start, no v1 import, no legacy rewards.
14. Consequences.
15. Rejected alternatives.
16. Migration sequencing.
17. Rollback strategy.
18. Validation requirements.

**Readiness: READY FOR 8.0B-B**

This means the proposal is ready to be independently validated and then
converted into ADR 0005. It does not mean the architecture has been approved
or implemented.
