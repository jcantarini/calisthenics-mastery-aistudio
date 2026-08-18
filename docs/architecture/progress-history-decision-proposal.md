# Progress & History — Architecture Decision Proposal (Sprint 8.0B-A)

**Status:** PROPOSAL — not approved, not implemented.
**Scope:** documentation only. No executable behaviour changed.
**Successor:** Sprint 8.0B-B creates ADR 0005 and the domain contracts, only
after this proposal is independently reviewed and approved.

Nothing in this document is an implemented fact. Every "recommendation" is a
proposal awaiting approval. Implemented facts are only those recorded in
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
> independent, append-only, snapshot-bearing record — never derived from
> prescription (`planned_workouts`) or from mutable profile data.

Headline recommendations:

| #   | Blocker                     | Recommended direction                                                                        | Confidence | Status                    |
| --- | --------------------------- | -------------------------------------------------------------------------------------------- | ---------- | ------------------------- |
| 1   | Canonical history model     | New independent immutable domain; `planned_workouts` stays prescription/runtime only          | High       | Recommended for approval  |
| 2   | Exercise-performance capture| Persist the full per-exercise/per-set model in Phase 8; detailed capture UI deferred to 8.5    | High       | Recommended for approval  |
| 3   | Timer & ad-hoc sessions     | First-class history entries through one shared ingestion path; one reward pipeline only       | High       | Recommended for approval  |
| 4   | Legacy local data           | Clean start + export-only archive; no automatic import (ownership unprovable)                 | Medium     | Requires product decision |
| 5   | Nutrition/hydration boundary| Staged: Phase 8 stores adherence facts only; food/calorie facts belong to Phase 9B            | Medium     | Requires product decision |
| 6   | Time contract               | Store UTC instant + IANA zone + precomputed local calendar day as a written fact              | High       | Recommended for approval  |
| 7   | Snapshot policy             | Stable IDs + narrow immutable snapshot of values used in calculations or display at the time  | High       | Recommended for approval  |
| 8   | Local-state isolation       | Per-user namespaced key + logout purge + no-inherit rule for unscoped legacy state            | High       | Recommended for approval  |
| 9   | Ledger enforcement          | Enforce insert-only for `xp_history` in DB; keep `goal_progress_events` mutable but re-scoped | Medium     | Requires further evidence |
| 10  | ADR boundary                | New `progress-history` domain; ADR 0005 required before any implementation                    | High       | Recommended for approval  |

Readiness result: see §17.

---

## 2. Validated baseline

- Core Platform Architecture v1.0 — frozen (Sprint 6.6B).
- Phase 7 Goals & Gamification — RELEASE APPROVED.
- Sprint 8.0A + closure 8.0A-C1 — validated; readiness `READY WITH BLOCKERS`.
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
3. `TrainingPlanService` remains the owner of training-plan runtime state
   (RULE 2 / ADR 0002).
4. Historical facts are never reconstructed from mutable plans or profiles.
5. Historical records never change silently when a plan, exercise, profile or
   calorie target changes.
6. Workout ingestion and all downstream events are idempotent.
7. A client-provided `user_id` is never an authorization decision.
8. RLS is mandatory for every user-owned object exposed via the Data API, and
   Data API `GRANT`s are designed explicitly and separately from policies.
9. Any future privileged/server path derives and validates the authenticated
   user itself, because service-role access bypasses RLS.
10. Views must not bypass RLS: `security_invoker` or no public-role grant.
    `SECURITY DEFINER` is never used merely to work around permissions.
11. The Progress domain never writes Goals, XP, Progression or Achievement
    tables and never awards rewards on its own.
12. Core Architecture v1.0 is extended only through ADR 0005.

---

## 4. Consolidated decision matrix

| #   | Decision                     | Recommendation                                                                                     | Data integrity | Security/privacy | Confidence | Status                     |
| --- | ---------------------------- | ---------------------------------------------------------------------------------------------------- | -------------- | ---------------- | ---------- | -------------------------- |
| 1   | Canonical history model      | Independent append-only history domain (`workout_sessions` + performance children)                     | High impact    | Medium           | High       | Recommended for approval   |
| 2   | Exercise-performance capture | Persist session → exercise → set model now; UI in 8.5; nullable actuals                                | High impact    | Low              | High       | Recommended for approval   |
| 3   | Timer / ad-hoc               | One `WorkoutHistoryService.ingest()` entry point; optional plan link; single reward pipeline            | High impact    | Low              | High       | Recommended for approval   |
| 4   | Legacy local data            | Clean start + JSON export; optional user-confirmed import only if product insists                       | Medium         | High             | Medium     | Requires product decision  |
| 5   | Nutrition/hydration          | Phase 8 = adherence + hydration facts; Phase 9B = food/calorie facts and corrections                    | Medium         | Medium           | Medium     | Requires product decision  |
| 6   | Time contract                | `occurred_at timestamptz` + `tz` + `local_day date` written at ingestion                                | High impact    | Low              | High       | Recommended for approval   |
| 7   | Snapshot policy              | IDs always; snapshot only display/calculation inputs; never copy volatile catalog text beyond label     | High impact    | Low              | High       | Recommended for approval   |
| 8   | Local-state isolation        | `barra:state:{userId}:v3`, purge on logout, never inherit unscoped v2                                   | Medium         | High             | High       | Recommended for approval   |
| 9   | Ledger enforcement           | `xp_history` DB-enforced insert-only; `goal_progress_events` stays operational, revisit write boundary  | Medium         | High             | Medium     | Requires further evidence  |
| 10  | ADR boundary                 | New `progress-history` domain, ADR 0005 mandatory, possible ADR 0006 for ledger hardening               | Structural     | Medium           | High       | Recommended for approval   |

---

## 5. Detailed analysis — Decisions 1–10

Each decision follows the required methodology: problem, evidence, options,
recommendation, rejected options, data-integrity, security/privacy, UX,
migration/compatibility, sprint dependencies, risks/mitigations, confidence,
status.

### Decision 1 — Canonical history model

**Problem.** There is no record of what a user actually did. "History" is
recomputed by scanning the active plan for rows whose status is `completed`,
so restarting, regenerating or deleting a plan destroys history, and editing
a plan rewrites the past.

**Evidence.**

- `src/services/training-plan/TrainingPlanService.ts` — `getActivePlan`,
  `completeWorkout`; sole writer of `training_plans`, `training_weeks`,
  `training_days`, `planned_workouts` (ADR 0002).
- `src/services/goals/GoalTrackingService.ts` → `reconcileGoal` replays
  history by reading `TrainingPlanService.getActivePlan(uid)` and filtering
  `workout.status === "completed"` — an explicit reconstruction from mutable
  prescription, bounded to the last 200 rows.
- `docs/architecture/progress-current-state-audit.md` §§ on history
  reconstruction and destroyable history.
- `src/lib/store.ts` — `workoutLog`, `completedSessions`, `streak`: the
  device-local prototype history.

**Options.**

- **A. Extend `planned_workouts`** with actual-performance columns and freeze
  rows after completion.
- **B. Independent immutable history domain** — new tables owned by a new
  service; `planned_workouts` keeps prescription and runtime state only.
- **C. Hybrid** — history table that is only created for plan workouts, with
  ad-hoc sessions kept elsewhere.

**Recommendation: B.** Four concepts are separated explicitly:

| Concept                | Owner                                 | Mutability                        |
| ---------------------- | ------------------------------------- | --------------------------------- |
| Training prescription  | Training (`planned_workouts`)         | Mutable, regenerable              |
| Runtime plan state     | `TrainingPlanService`                 | Mutable state machine             |
| Completed fact         | Progress History (`workout_sessions`) | Append-only + compensating rows   |
| Derived analytics      | Progress History read model           | Recomputed, never stored as truth |

- Authoritative historical source: `workout_sessions` and its children.
- A completed session **references** the planned workout by ID (nullable) and
  snapshots the values it needs; it is not a child of the plan lifecycle.
- Ad-hoc workouts are ordinary sessions with `planned_workout_id = null` and
  `source = 'timer' | 'manual' | 'first_workout'`.
- Plan deletion/restart/regeneration must never delete or alter history; the
  plan reference degrades to a snapshot label (`ON DELETE SET NULL`
  semantics, decided in 8.0B-B).
- Rows are append-only. Corrections are compensating/superseding rows
  (`corrects_session_id`), never in-place edits; user-visible "delete" is a
  tombstone/void record.
- Duplicate ingestion is prevented by a natural idempotency key stored on the
  session (`user_id`, `source`, `source_event_id`) with a unique constraint —
  the same shape already proven by `goal_progress_events`.
- The model needs three levels: **session** (one training event),
  **exercise performance** (one exercise inside it), **set** (one executed
  set). Two levels would make per-set analytics a migration-breaking change.

**Rejected.** A: couples immutable facts to a regenerable prescription table
owned by another service, violates ADR 0002 ownership and constraint 4/5, and
cannot represent ad-hoc sessions. C: two ingestion paths, duplicate
idempotency logic, guaranteed drift.

**Data integrity.** History survives every plan operation; analytics become
reproducible. **Security/privacy.** New user-owned tables, RLS + explicit
grants required; no new PII class. **UX.** Enables a real history timeline,
honest streaks and durable personal records. **Migration.** Additive only;
existing plan reconstruction can stay as a read fallback during one
transition sprint, clearly labelled. **Dependencies.** 8.0B-B (ADR + schema),
8.1 (ingestion), 8.5 (execution UI). **Risks.** Double-counting during the
transition — mitigated by ingesting only forward from the migration date and
provenance-tagging any backfill. **Confidence: High. Status: Recommended for
approval.**

### Decision 2 — Exercise-performance capture

**Problem.** Actual sets, reps, load, hold time and RPE are not persisted at
all; prescription is the only surviving number, and actual duration is
computed transiently and discarded.

**Evidence.** Audit §§ on discarded duration and missing set data;
`src/services/workout-generator/workoutTypes.ts` defines prescription only;
`src/routes/_authenticated/timer.tsx` computes an MET-based estimate through
`estimateKcal` in `src/lib/store.ts` and writes only to local state.

**Options.** A. Summary-only history (duration + calories) now, detail later.
B. Full session/exercise/set persistence now, UI later. C. Full persistence
and full UI now.

**Recommendation: B.** The persistence model must support, from the first
migration, per exercise: canonical exercise ID, display-name snapshot,
prescription snapshot, completion/skip state, substitution reference, notes,
order index; and per set: set index, reps, load or assistance level, duration,
hold time, distance, RPE/perceived difficulty, completed flag, optional
timestamps. All actuals nullable, so a summary-only ingestion in 8.1 is a
valid degenerate case of the same model.

**Rejected.** A creates a compatibility dead end: adding set-level rows later
would retro-invalidate every aggregate computed from the summary. C inflates
Phase 8 scope and delays the ingestion boundary that Goals/XP depend on.

**Minimum conceptual contract.** `WorkoutHistoryService.ingest(session)`
accepts a session with `exercises[]`, each with `sets[]`; a caller that knows
nothing beyond duration submits zero exercises. **Confidence: High. Status:
Recommended for approval.**

### Decision 3 — Timer and ad-hoc sessions

**Problem.** Timer sessions never reach the canonical flow: they only mutate
local state, so they grant no XP, unlock no achievements and move no Goals —
while a plan completion does all three.

**Evidence.** `src/routes/_authenticated/timer.tsx` calls
`logWorkoutSession` (`src/lib/store.ts`); `TrainingPlanService.completeWorkout`
is what reaches `GamificationOrchestrator` (ADR 0004) and
`GoalTrackingService.trackSafely`; `src/routes/_authenticated/first-workout.tsx`
is a third path.

**Recommendation.** Timer, first-workout and plan completion all funnel into a
single ingestion boundary: `WorkoutHistoryService.ingest()` persists the
session, then emits exactly one canonical `workout_completed` event that the
existing `GamificationOrchestrator` and `GoalTrackingService` consume. The
Progress domain emits; it never awards.

- Sessions with no plan link are valid and default to `source = 'timer'`.
- An optional `planned_workout_id` may be supplied when the timer was started
  from a planned workout; in that case `TrainingPlanService.completeWorkout`
  is invoked for runtime state and ingestion is performed once, keyed by the
  planned workout ID, so plan-side and timer-side completion cannot both
  produce a session.
- Accidental/incomplete sessions: a minimum-duration threshold (product
  decision, proposed 60 s) and an explicit discard action; below threshold the
  session is not ingested and no event is emitted.
- Idempotency is the session's `source_event_id`; the reward pipeline keeps
  its existing per-event idempotency (`xp_history` source keys,
  `goal_progress_events` claims), so a retry is a no-op end to end.

**Rejected.** Letting the timer call the Orchestrator directly (a second
reward path, violates constraint 11) and keeping timer sessions local
(perpetuates the dual-truth problem). **Confidence: High. Status: Recommended
for approval.**

### Decision 4 — Legacy local-data transition

**Problem.** `barra:state:v2` holds `workoutLog`, `completedSessions`,
`streak`, goals, `dietLog`, profile and diet/hydration reminders, is not
namespaced by `user_id`, and survives logout — so the signed-in account may
not be the account that produced the data.

**Evidence.** `src/lib/store.ts` (`KEY = "barra:state:v2"`, `useAppState`);
`src/routes/_authenticated/perfil.tsx` logout calls
`supabase.auth.signOut()` without clearing the key; audit §§ on cross-account
local-data isolation.

**Options.** A. Automatic import on first login. B. User-confirmed one-time
import. C. Read-only legacy compatibility period. D. Clean start, no import.
E. Export-only/archival.

**Recommendation: D + E** — clean start for canonical history, with a
one-time "download my local data" JSON export offered before the legacy key is
retired. If product requires continuity, the only acceptable alternative is
**B** with: explicit ownership confirmation, `provenance = 'legacy_local'` on
every imported row, `imported_at`, a single import batch ID enabling one-click
rollback, and duplicate detection on (`local_day`, `source`, `duration`).

**Rejected.** A — imports data of unprovable ownership into an authenticated
account; a privacy defect, not a convenience. C alone — extends the dual-truth
window indefinitely.

**Consequences.** Imported data is estimated (MET-based calories, no sets), so
it must never feed personal records or XP; imported sessions are display-only
and emit no events. Legacy fields may be removed one release after export
ships and after Progress/Weekly Report read exclusively from the new domain.
**Confidence: Medium. Status: Requires product decision.**

### Decision 5 — Nutrition and hydration boundary

**Problem.** Nutrition and hydration have local browser persistence only, are
not user-scoped, and historical calorie figures are recomputed from the
*current* profile, so past days change when weight changes.

**Evidence.** `src/lib/nutrition.ts` (BMR/TDEE from current profile),
`src/lib/store.ts` `dietLog`/`DietDayLog`, `src/routes/_authenticated/dieta.tsx`,
`src/routes/_authenticated/relatorio.tsx`.

**Recommendation: staged model.**

| Concept                       | Phase                     |
| ----------------------------- | ------------------------- |
| Meal-plan prescription        | Derived, not stored       |
| Recorded meal completion      | Phase 8 (adherence fact)  |
| Hydration fact (ml, local day)| Phase 8                   |
| Recorded food/calorie fact    | Phase 9B                  |
| Estimated values              | Phase 9B, flagged         |
| User-corrected CalorieCam     | Phase 9B, flagged         |
| Historical snapshot of target | Phase 8 (target + weight) |

Phase 8 reports can honestly display: meals-checked adherence, hydration
totals and streaks, and the calorie target that was in force on that day —
never "calories eaten". **Rejected.** Deferring everything to 9B (loses the
adherence series users already keep) and building food logging in Phase 8
(duplicates 9B). **Confidence: Medium. Status: Requires product decision.**

### Decision 6 — Time and timezone contract

**Problem.** `todayKey()` in `src/lib/store.ts` builds day keys from the
device's local date, while services and Supabase use UTC `timestamptz`;
grouping therefore shifts when the device timezone changes.

**Recommendation — one contract.**

Written facts at ingestion time:

- `occurred_at timestamptz` — the UTC instant (authoritative ordering).
- `tz` — the user's IANA zone resolved at write time (e.g. `America/Sao_Paulo`).
- `local_day date` — the calendar day in `tz` at write time. This is a
  **fact**, not a derivation, and it never changes afterwards.

Derived at read time: weeks, months, streaks, ISO week boundaries, all
computed from `local_day` (never from `occurred_at` re-localized to the
current device zone). Scheduled plan dates remain calendar dates without a
zone. Backfilled entries carry the `tz` supplied for the historical event plus
`backfilled = true`; when the zone is unknown, the profile zone is used and
marked `tz_source = 'assumed'`. DST is handled implicitly because `local_day`
was fixed at write time; travel changes only future rows.

This prevents off-by-one grouping, retroactive reinterpretation and mixed
JS-local/UTC arithmetic. **Confidence: High. Status: Recommended for
approval.**

### Decision 7 — Historical snapshot policy

**Problem.** Every display value today resolves from mutable current sources
(plan, catalog, profile), so history rewrites itself.

**Recommendation.**

| Value                                 | Treatment                              |
| ------------------------------------- | -------------------------------------- |
| `user_id`, session ID                 | Stable ID                              |
| Plan ID, planned-workout ID           | Stable ID, nullable reference          |
| Plan name, workout title              | Immutable snapshot                     |
| Exercise canonical ID                 | Stable ID                              |
| Exercise display name at completion   | Immutable snapshot (single label only) |
| Exercise prescription at completion   | Immutable snapshot                     |
| Actual performance (sets/reps/RPE...) | Immutable fact                         |
| Difficulty / level at completion      | Immutable snapshot                     |
| Estimated + actual duration           | Both stored                            |
| Estimated + actual calories           | Both stored, each flagged as estimate  |
| Body weight used in calculation       | Immutable snapshot                     |
| Calorie target of the day             | Immutable snapshot                     |
| Program week + day number             | Immutable snapshot                     |
| Source type, source event ID          | Immutable fact                         |
| App / schema version                  | Immutable stamp                        |
| Locale-sensitive text, i18n strings   | **Not copied** — resolved at read time |
| Media, video URLs, exercise cues      | **Not copied** — current catalog       |
| Achievement/XP amounts                | **Not copied** — owned by gamification |

Rule of thumb: snapshot anything that was *used in a calculation* or *shown as
the identity of the event*; resolve everything presentational from the current
catalog. **Confidence: High. Status: Recommended for approval.**

### Decision 8 — Local-state user isolation

**Problem.** `barra:state:v2` is a single unscoped key that survives logout,
so a second account on the same browser inherits the first account's profile,
workouts, goals, diet and reminders. RLS does not protect localStorage.

**Recommended transition design** (implementation deferred):

1. Namespaced key `barra:state:{userId}:v3`, resolved after the session is
   hydrated; no read before the user is known.
2. Logout removes the active namespaced key and any anonymous scratch key.
3. Pre-authentication state lives under `barra:state:anon:v3` and is never
   promoted to a user namespace automatically.
4. When a different user signs in, no legacy or foreign namespace is read.
5. Upgrade path from unscoped v2: the data's owner cannot be proven, so it is
   never auto-adopted. It is offered as an export (Decision 4) and then
   removed; a strictly optional "this data is mine" adoption prompt is the
   only path into a namespace.
6. Diet/hydration reminder state moves with the namespaced key; it stays
   local-only until a canonical owner exists.
7. `barra:workout-reminders:v1` (`src/lib/workout-reminders.ts`) is already a
   cache of the RLS-protected `workout_reminder_settings` table and must also
   be purged on logout; the two reminder systems stay separate, and the naming
   overlap is documented as debt, not merged in Phase 8.

**Confidence: High. Status: Recommended for approval.**

### Decision 9 — Ledger enforcement

**`xp_history`.** `XPService` is insert-only and corrects with negative
compensating rows, but the table grants `SELECT, INSERT, UPDATE, DELETE` to
`authenticated` under a `FOR ALL` ownership policy, so a user can rewrite
their own XP ledger from the browser. Append-only is currently an application
convention, not a database invariant.

Recommendation: enforce insert-only in the database — revoke `UPDATE`/`DELETE`
from `authenticated`, split the `FOR ALL` policy into explicit `SELECT` and
`INSERT` policies with `auth.uid() = user_id`, and keep reads and inserts
working unchanged (no service change required, since the service already only
selects and inserts). Balance corrections continue as compensating rows.
Effort is small; the reason this is *Requires further technical evidence* is
that a full check for any incidental `update`/`delete` usage against
`xp_history`, and the same question for `user_progression` and
`user_achievements`, has not been performed in this documentation sprint.

**`goal_progress_events`.** This is an operational idempotency/state ledger:
`GoalTrackingService` inserts claims, `settle`s them with an `UPDATE` and
`release`s them with a `DELETE`. It must not be made append-only — deletion is
part of the retry contract, and the unique constraint only protects duplicates
while the row exists. Recommendation: keep the current write model for Phase 8
and record, as a later hardening candidate, moving claim/settle/release behind
a server boundary (server function or RPC) so the browser cannot delete a
claim and re-trigger a goal update. No grants, policies, services or
migrations change in this sprint. **Confidence: Medium. Status: Requires
further technical evidence.**

### Decision 10 — ADR and frozen-architecture boundary

**Proposed domain name:** `progress-history` (services under
`src/services/progress-history/`, pure rules in `*Rules.ts`, hooks in
`src/hooks/useWorkoutHistory.ts`, presentation under
`src/components/progress/`).

**Responsibilities.** Own the historical tables; ingest completed sessions
from every source through one idempotent boundary; emit the canonical
`workout_completed` event; expose read models for Progress, History and the
Weekly Report; own the snapshot and timezone contracts.

**Non-responsibilities.** Never generates or mutates plans; never awards XP,
levels or achievements; never updates goals; never writes Training, Goals or
Gamification tables; never contains reward amounts or level maths.

**Dependency direction.** Components → Hooks → `WorkoutHistoryService` →
history rules → Supabase. `TrainingPlanService` and the timer call *into*
ingestion; ingestion calls *out* to `GamificationOrchestrator` and
`GoalTrackingService` via the existing event contracts (ADR 0003/0004). The
Progress domain never imports Goals or Gamification internals.

**Write ownership:** history tables only. **Read ownership:** history +
derived analytics; it may read plan and catalog data for enrichment, never
write it. **Event boundary:** exactly one emission point per ingested session.
**Analytics boundary:** aggregates are computed, cached in TanStack Query, and
never stored as a second source of truth.

**ADR 0005 is required before implementation** — it extends frozen Core
Architecture v1.0 with a new domain, a new event producer and a new
persistence contract. A separate ADR (0006) may be required for ledger
immutability hardening (Decision 9) and, if product approves canonical
nutrition persistence in Phase 9B, another for the nutrition boundary.
**Confidence: High. Status: Recommended for approval.**

---

## 6. Proposed Progress History domain boundary

```
Timer            First-workout          TrainingPlanService.completeWorkout
  \                    |                          /
   \                   v                         /
    ----->  WorkoutHistoryService.ingest(session)  <-----
                       |  (persist, idempotent)
                       v
              workout_completed (single emission)
                    /        \
                   v          v
   GamificationOrchestrator   GoalTrackingService.trackSafely
      (XP -> Level -> Ach.)        (goal progress only)
```

Progress/History/Report screens read only from
`WorkoutHistoryService` read models, never from `planned_workouts` and never
from `src/lib/store.ts`.

---

## 7. Conceptual entity model

No SQL, no migration, no generated types — names are proposals only.

- **WorkoutSession** — `id`, `user_id`, `source`, `source_event_id`,
  `occurred_at`, `tz`, `local_day`, `plan_id?`, `planned_workout_id?`,
  snapshots (`plan_name`, `workout_title`, `week_number`, `day_number`,
  `difficulty`), `estimated_duration_sec`, `actual_duration_sec`,
  `estimated_kcal`, `body_weight_kg?`, `notes?`, `provenance`,
  `app_version`, `schema_version`, `corrects_session_id?`, `voided_at?`.
- **SessionExercise** — `id`, `session_id`, `user_id`, `order_index`,
  `exercise_id`, `exercise_name_snapshot`, `prescription_snapshot`,
  `substituted_for_exercise_id?`, `status` (completed/skipped),
  `notes?`.
- **SessionSet** — `id`, `session_exercise_id`, `user_id`, `set_index`,
  `reps?`, `load_kg?`, `assistance_level?`, `duration_sec?`, `hold_sec?`,
  `distance_m?`, `rpe?`, `completed`, `performed_at?`.
- **HydrationEntry** (Phase 8) — `user_id`, `local_day`, `tz`, `volume_ml`,
  `recorded_at`.
- **MealAdherenceEntry** (Phase 8) — `user_id`, `local_day`, `tz`, `meal_key`,
  `completed`, `calorie_target_snapshot`, `recorded_at`.

Relationships: `WorkoutSession 1—n SessionExercise 1—n SessionSet`; optional
non-owning references to `planned_workouts` and the exercise catalog.

---

## 8. Conceptual event and data-flow model

1. A source completes a workout and builds an ingestion payload including its
   `source_event_id`.
2. `WorkoutHistoryService.ingest` inserts the session inside one transaction
   (session + exercises + sets); a unique-violation on
   (`user_id`, `source`, `source_event_id`) returns the existing session and
   emits nothing.
3. On a genuinely new insert, one `workout_completed` event is emitted with
   the session ID as the event ID.
4. `GamificationOrchestrator` runs XP → Progression → Achievements with its
   existing idempotency; `GoalTrackingService` claims the event in
   `goal_progress_events`.
5. Read models (weekly volume, streaks, personal records) are derived on read.

---

## 9. Conceptual security, ownership and RLS model

- Every history table is user-owned with `user_id` and RLS enabled.
- Policies: `SELECT` and `INSERT` with `auth.uid() = user_id`; `UPDATE` and
  `DELETE` withheld from `authenticated` for immutable rows (void/correction
  is an insert). Child tables carry `user_id` so their policies do not need a
  join.
- Grants are designed separately from policies: `GRANT SELECT, INSERT` to
  `authenticated`, `GRANT ALL` to `service_role`, no `anon` grant.
- Any reporting view uses `security_invoker = true` or is not granted to API
  roles. `SECURITY DEFINER` is not used to bypass permissions.
- `user_id` always comes from the verified session on the write path; a
  client-supplied ID is treated as a hint and validated, never trusted.
- Any future privileged server path derives and validates the user itself
  because service-role bypasses RLS; `client.server.ts` remains unused by
  these flows unless ADR 0005 says otherwise.

---

## 10. Idempotency strategy

- Session level: unique (`user_id`, `source`, `source_event_id`).
- Plan-linked sessions use the planned workout ID as `source_event_id`, so a
  plan completion and a timer completion of the same workout collapse to one.
- Emission happens only on a genuinely new insert.
- Downstream engines keep their own idempotency (XP source keys, goal claims),
  so retries at any layer are safe.
- Corrections are new rows referencing the corrected session; they emit
  compensating events rather than replaying the original.

---

## 11. Timezone and snapshot strategy

Facts written at ingestion: `occurred_at` (UTC), `tz`, `local_day`, and every
snapshot listed in Decision 7. Derived at read: weeks, months, streaks,
averages, personal records, all locale-sensitive labels. Old rows are never
reinterpreted when the device or profile timezone changes.

---

## 12. Legacy transition strategy

1. Ship the new domain and dual-read Progress/Report (canonical first, legacy
   labelled "local, not synced").
2. Ship local export (Decision 4) and per-user namespacing (Decision 8).
3. Switch Progress and Weekly Report to canonical-only reads.
4. Remove legacy history fields from `src/lib/store.ts` one release later.
No local data is migrated or deleted in this sprint.

---

## 13. Dependencies between Phase 8 sprints

| Sprint | Depends on                                   | Delivers                                    |
| ------ | -------------------------------------------- | ------------------------------------------- |
| 8.0B-A | 8.0A validated                               | This proposal                               |
| 8.0B-B | Approval of this proposal                    | ADR 0005 + domain contracts                 |
| 8.1    | ADR 0005                                     | Schema, RLS/grants, ingestion service       |
| 8.2    | 8.1                                          | Plan + timer + first-workout ingestion      |
| 8.3    | 8.2                                          | Progress & History read models and UI       |
| 8.4    | 8.3, Decision 4/8 approval                   | Local-state isolation, export, legacy retire|
| 8.5    | 8.1                                          | Detailed workout-execution capture UI       |
| 9B     | Decision 5 approval                          | CalorieCam & nutrition facts                |

---

## 14. Risks and mitigations

| Risk                                              | Mitigation                                                 |
| ------------------------------------------------- | ---------------------------------------------------------- |
| Double counting during dual-read                  | Ingest forward-only; provenance tags; no legacy events      |
| Cross-account local data leakage before 8.4       | Prioritise Decision 8; never auto-adopt unscoped v2         |
| XP ledger tampering from the browser              | Decision 9 hardening, tracked as its own ADR candidate      |
| Goal claim deletion enabling replay               | Later server/RPC boundary for `goal_progress_events`        |
| Snapshot bloat                                    | Snapshot only calculation/identity values (Decision 7)      |
| Timezone drift after travel                       | `local_day` fixed at write time                             |
| Scope creep into Goals/Gamification               | Constraint 11 + single emission point                       |
| Set-level model arriving late                     | Persist the three-level model from the first migration      |

---

## 15. Product decisions still requiring confirmation

1. Legacy local data: clean start + export (recommended) vs. confirmed import.
2. Nutrition/hydration split between Phase 8 and Phase 9B.
3. Minimum timer duration that counts as a real session (proposed 60 s).
4. Whether imported/estimated sessions may ever contribute to streaks.
5. Whether users may void a historical session, and how it is displayed.

---

## 16. Proposed content outline for ADR 0005

1. Title — Progress History as an independent immutable domain.
2. Status / context (Sprint 8.0A blockers, this proposal).
3. Decision: domain, ownership, dependency direction, single ingestion point.
4. Entity and event contracts.
5. Idempotency contract.
6. Time and snapshot contract.
7. Security, RLS and grant model.
8. Non-responsibilities and relationship to ADRs 0002/0003/0004.
9. Consequences, rejected alternatives, follow-up ADR candidates.

ADR 0005 does not exist and was not created in this sprint.

---

## 17. Readiness decision

**READY WITH OPEN DECISIONS.**

Decisions 1, 2, 3, 6, 7, 8 and 10 are recommended for approval and are
sufficient to draft ADR 0005. Decisions 4 and 5 require product confirmation,
and Decision 9 requires a targeted technical check of ledger write usage
before its hardening scope is fixed. Sprint 8.0B-B may begin once Decisions 4
and 5 are answered; Decision 9 can be deferred to its own ADR without blocking
ADR 0005.
