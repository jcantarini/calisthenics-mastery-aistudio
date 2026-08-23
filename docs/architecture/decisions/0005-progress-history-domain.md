# 0005 — Progress History Domain and Trusted Workout Completion

**Status:** Proposed (Sprint 8.0B-B2A) · Contract draft pending independent validation · Extends Core Architecture v1.0

> This ADR is **architectural documentation only**. Progress History is **not
> implemented**. No table, RLS policy, grant, database function, outbox
> processor, service, hook, route or component exists for this domain.
> Database schema, RLS, RPCs, outbox processing and application services begin
> only after this ADR and its companion contracts are accepted.
> Sprint 8.0B-B2A drafted the detailed domain contracts in
> [progress-history-domain-contracts.md](../progress-history-domain-contracts.md);
> that draft has **not** yet passed independent validation, this ADR is **not
> Accepted**, and Sprint 8.0B-B2B is the acceptance gate that will either
> correct the contract or ratify this ADR.

Evidence and full analysis are not duplicated here. See
[progress-current-state-audit.md](../progress-current-state-audit.md) (facts)
and
[progress-history-decision-proposal.md](../progress-history-decision-proposal.md)
(validated decision analysis). The normative implementation contract companion
is
[progress-history-domain-contracts.md](../progress-history-domain-contracts.md)
(DRAFT). Where a detail required by implementation is not frozen by the
validated proposal, it is frozen in that contract companion within the
boundaries of this ADR and is deliberately not invented in this ADR.


---

## 1. Context

Sprint 8.0A audited Progress, History and Weekly Report and concluded
`READY WITH BLOCKERS`. The audit established that the app has no canonical
record of a completed workout: Progress-like surfaces read either mutable
training-plan prescription rows (`planned_workouts`) or device-local prototype
state (`src/lib/store.ts`), and completion happens through several unrelated
surfaces (plan runtime, timer, first workout) with different side effects.

Sprint 8.0B-A converted the audit blockers into ten evidence-based decisions,
corrected in 8.0B-A-C1 and 8.0B-A-C2. That proposal was independently
validated after 8.0B-A-C2 and is the sole architectural basis for this ADR.

Core Architecture v1.0 is frozen
([architecture-freeze-v1.md](../architecture-freeze-v1.md)); it is extended
through ADRs, and this ADR is that extension. It builds on ADR 0001 (service
layer boundaries), ADR 0002 (training plan as single source of truth), ADR
0003 (event-driven gamification) and ADR 0004 (gamification orchestrator).

## 2. Decision

Introduce **Progress History** as an independent domain owning immutable
records of completed workouts and related historical progress facts.

**Ownership.** Progress History does **not** own or modify training-plan
prescription, training-plan runtime, XP calculation, levels, achievements,
goal calculation or nutrition food logging. `planned_workouts` remains mutable
prescription/runtime data and must never be treated as canonical workout
history.

**Canonical model.** The canonical completed-workout model is: workout
session; session exercise; session set; append-only workout adjustment;
durable dispatch/outbox record. Hydration, meal adherence and daily-target
snapshots are Phase 8 auxiliary progress facts, not workout children. Detailed
food facts, calorie ingestion and CalorieCam remain Phase 9B.

**Trusted write boundary.** The browser cannot write reward-bearing history.
Writes flow through a trusted server boundary into a restricted transactional
database function executed only by the service role.

**Coordinator.** A future application-level `WorkoutCompletionCoordinator`
orchestrates completion without becoming a domain owner.

**Durable dispatch.** Plan synchronization, Gamification and Goals are
delivered through durable per-consumer dispatch state created in the same
transaction as the history record.

## 3. Architectural invariants

1. Completed history is independent from training prescription.
2. One logical completion creates at most one canonical session.
3. Historical records are append-only.
4. Corrections never rewrite originals.
5. Browser clients cannot write reward-bearing history.
6. History and durable dispatch records commit atomically.
7. Training-plan runtime remains owned by `TrainingPlanService`.
8. Progress History never awards XP or modifies Goals directly.
9. Downstream failures are retried and never erase history.
10. User ownership is server-derived and database-enforced.
11. Historical local dates and snapshots never silently change.
12. Canonical reports never reconstruct history from mutable sources.

## 4. Trusted completion flow

Conceptual flow, in order:

1. Authenticated client request from any completion surface.
2. Trusted TanStack Start server route or server function receives it.
3. The server validates the user identity.
4. The server derives the user ID (never trusting a client-supplied ID).
5. A service-role client, **without forwarding the user JWT**, calls a
   restricted transactional PostgreSQL function.
6. Workout session, children, supplied auxiliary facts and durable dispatch
   records commit atomically.
7. Downstream consumers process only after commit.

The future database function must conceptually use `SECURITY INVOKER`, an
empty safe `search_path`, fully qualified relation names, execution revoked
from `PUBLIC`, `anon` and `authenticated`, and execution granted only to
`service_role`. No executable SQL is defined in this sprint; the exact
signature, payload shape and error taxonomy are contract details for Sprint
8.0B-B2.

## 5. Ownership and transaction boundaries

`WorkoutCompletionCoordinator` (future, application level):

- captures the immutable completion snapshot;
- submits the idempotent ingestion command;
- ensures history and dispatch records commit atomically;
- synchronizes plan runtime through `TrainingPlanService` **after** commit;
- dispatches Gamification and Goals;
- supports durable retries.

`TrainingPlanService` remains the sole writer of training-plan runtime
(ADR 0002). Gamification remains reached through the orchestrator (ADR 0004).
A downstream failure never rolls back or deletes the historical workout, and
every consumer remains idempotent and retryable.

## 6. Idempotency

Canonical ingestion uniqueness is `(user_id, ingestion_key)`. `source` is
provenance only and is **not** part of uniqueness.

Canonical keys:

- Plan-linked completion — `planned-workout:{plannedWorkoutId}`
- Timer-only ad-hoc completion — `timer:{stableUuid}`
- First-workout/ad-hoc completion — `first-workout:{stableUuid}`

The same planned workout uses the same key regardless of which UI completed
it. Key generation timing, storage of the client-stable UUID and conflict
response semantics are contract details for Sprint 8.0B-B2.

## 7. Append-only history and corrections

Original workout sessions are never modified or silently deleted. Voids and
corrections are expressed as append-only adjustment events containing,
conceptually: kind; target session; replacement session when applicable;
reason; occurrence time; actor/ownership metadata.

Read models apply adjustment events and exclude voided sessions from ordinary
metrics and reward-relevant projections. Account deletion is the explicit
legal/user-deletion exception.

Historical provenance to mutable plan data is stored as **immutable scalars**:
source plan ID, source planned-workout ID, plan-name snapshot, week/day
snapshot. No foreign keys from historical records to mutable/deletable
training-plan rows, and no `ON DELETE SET NULL` rewriting of provenance.

## 8. Security, RLS and Data API access

- Authenticated users may directly read only their own exposed history under
  RLS, if direct Data API reads remain enabled.
- Authenticated and anonymous roles receive no direct history `INSERT`,
  `UPDATE`, `DELETE`, no outbox access and no ingestion RPC execution.
- RLS remains enabled as defense in depth.
- Ownership policies use `(select auth.uid()) = user_id`.
- Every RLS ownership column is indexed.
- Data API grants are designed separately from RLS.
- Exposed views use `security_invoker`; otherwise they remain unexposed.

**Child ownership.** Where child tables duplicate `user_id`: parent uniqueness
on `(id, user_id)`, child relationship using `(parent_id, user_id)`, and
equivalent protection through the whole session → exercise → set hierarchy.
Every foreign-key path and RLS ownership path is indexed.

## 9. Time, snapshots and calorie provenance

**Time.** Store the UTC occurrence instant, the IANA timezone captured at
ingestion, a precomputed local calendar day, and the timezone source when
assumed. Historical local dates are never recalculated when the user travels
or changes timezone.

**Snapshots.** Store the canonical exercise ID when available, a neutral
non-translated exercise identity snapshot, the prescription snapshot, actual
performance facts, relevant calculation inputs, and plan/week/day identity
snapshots. Translated UI strings are never snapshotted as canonical identity;
displays use the current localized catalog label and fall back to the neutral
stored snapshot.

**Calories.** Use `calories_kcal`, `calories_source`,
`calorie_algorithm_version` when estimated, and `calculation_weight_kg` when
applicable. Supported source meanings: estimated, measured, user entered,
unknown. Estimated calories are never labelled as actual calories.

## 10. Query and pagination contracts

Progress, History and Weekly Report must eventually read canonical Progress
History data only. They must not reconstruct history from `planned_workouts`,
`src/lib/store.ts` or current mutable profile values.

Timelines use deterministic keyset pagination on `occurred_at` and `id`.
Offset pagination is not used. Concrete read-model shapes, aggregate
definitions and index lists are contract details for Sprint 8.0B-B2.

## 11. Legacy-data and staged product boundaries

The application is not publicly released. Therefore: no automatic legacy
import; no user-driven legacy import in v1; no plan-derived historical
fallback; no rewards from legacy or inferred records. Canonical history begins
at the trusted-ingestion cutover.

**Ledger boundary.** This ADR recommends future insert-only database
enforcement for `xp_history`. `goal_progress_events` remains a mutable
operational ledger under its existing retry contract; further Goals
write-boundary hardening may be addressed by ADR 0006 or Phase 10 and does not
block this ADR.

Staging: Phase 8 covers workout history and auxiliary progress facts; detailed
food facts, calorie ingestion and CalorieCam are Phase 9B.

## 12. Reasons

- Rewards must be reproducible and consistent across every completion surface;
  that requires one canonical, idempotent ingestion path.
- History that lives in mutable prescription rows is destroyed by ordinary
  plan edits and regeneration, making reporting dishonest.
- A trusted server boundary is the only way to keep reward-bearing writes out
  of reach of a browser client while keeping RLS as defense in depth.
- Atomic history + dispatch state is the only way to guarantee that a
  completed workout is never lost because a downstream consumer failed.
- Append-only records with neutral snapshots keep past facts stable across
  localization changes, plan deletion, timezone travel and algorithm updates.

## 13. Rejected alternatives

| Rejected                                              | Reason                                                                      |
| ----------------------------------------------------- | --------------------------------------------------------------------------- |
| Extending `planned_workouts` into history             | Prescription rows are mutable and regenerable; history would be destroyed.  |
| Reconstructing history from the current plan          | Produces retroactively changing, unverifiable facts.                        |
| Separate ingestion flows for timer/plan/first workout | Divergent rewards and duplicate records for one logical completion.         |
| Direct authenticated browser inserts                  | Reward-bearing writes become client-forgeable.                              |
| History and rewards without a durable outbox          | A consumer failure silently loses rewards or the workout.                   |
| Mutating sessions with `voided_at`                    | Rewrites the original fact; breaks append-only auditability.                |
| Foreign keys from history to deletable plan rows      | Plan deletion would erase or null historical provenance.                    |
| `(user_id, source, source_event_id)` uniqueness       | Same completion from two surfaces would duplicate; `source` is provenance.  |
| Offset pagination                                     | Non-deterministic under concurrent inserts; unstable timelines.             |
| Importing unscoped legacy local data                  | `barra:state:v2` has no user isolation; would fabricate rewardable history. |
| Snapshotting translated UI strings                    | Freezes history in one language and corrupts identity matching.             |
| Implementing the domain without an ADR                | Core Architecture v1.0 is frozen; extension requires a recorded decision.   |

## 14. Consequences

**Positive**

- Durable, reproducible history independent of plan mutation.
- Consistent rewards across all completion surfaces.
- Safe retries with no duplicate sessions and no lost workouts.
- Honest reporting with explicit calorie and estimation provenance.
- Stable localization and calculation provenance over time.
- Clear domain ownership boundaries with Training, Gamification and Goals.
- Future set-level analytics without schema redesign.

**Negative / accepted costs**

- New tables plus server-side ingestion infrastructure to build and maintain.
- Eventual consistency: rewards and plan sync land after the history commit.
- Outbox recovery and retry complexity, including poison-message handling.
- Additional RLS, grant and index design work per table.
- Empty pre-cutover history for pre-release users (clean start).
- More storage from snapshots and per-set child rows.
- Operational monitoring requirements for dispatch lag and failures.

## 15. Implementation sequence

Acceptance of this ADR does not authorize implementation, and this sprint
implements nothing. Expected sequence:

1. **8.0B-B1** — ADR 0005 draft and decision traceability (this sprint).
2. **8.0B-B2** — detailed domain contracts and final ADR acceptance.
3. **8.1** — schema, constraints, indexes, RLS/grants, trusted ingestion,
   outbox.
4. **8.2** — completion coordinator and source wiring.
5. **8.3** — canonical read models and Progress/History UI.
6. **8.4** — local-state isolation and legacy retirement.
7. **8.5** — detailed workout-execution capture.
8. **Phase 9B** — food facts, calorie ingestion and CalorieCam.

## 16. Validation and acceptance gate

This ADR stays **Proposed** until:

1. it passes independent validation as drafted;
2. Sprint 8.0B-B2 freezes the detailed domain contracts (table and column
   contracts, RPC signature and error taxonomy, outbox state machine, read
   models and index list, adjustment-event taxonomy);
3. the resulting deliverable passes independent validation.

Only then is the status changed to Accepted. Any decision that contradicts or
materially expands the validated proposal requires a new ADR rather than an
edit to this one.
