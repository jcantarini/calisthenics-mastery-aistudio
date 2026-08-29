# Progress History Domain Contracts — ADR 0005 Companion

**Status:** DRAFT (Sprint 8.0B-B2A, corrected by 8.0B-B2A-C1 and 8.0B-B2A-C2) · Pending independent validation · Not implemented

---

## 1. Status, scope and authority

This document is the normative implementation contract companion to
[ADR 0005 — Progress History Domain and Trusted Workout Completion](./decisions/0005-progress-history-domain.md).

- It does **not** change the decisions in ADR 0005. It refines them into
  implementable, frozen detail.
- It is **not** executable schema, migration or application code. No SQL and no
  TypeScript appear here.
- **No part of Progress History has been implemented.** No table, policy,
  grant, function, outbox, service, hook, route or component exists.
- This contract becomes authoritative only after it passes independent
  validation and Sprint 8.0B-B2B accepts it.
- ADR 0005 remains **Proposed** until that acceptance sprint passes validation.

**Authority order.** ADR 0005 governs. Where this document adds detail, the
detail must remain inside ADR 0005's boundaries. If a future need contradicts
ADR 0005, a new ADR is required — this contract may not be used to override it.

**Architectural sources.** `progress-current-state-audit.md` (facts),
`progress-history-decision-proposal.md` (validated decision analysis),
ADR 0005, `architecture-freeze-v1.md`, `conventions.md`, ADRs 0001–0004.

**Out of scope.** Detailed food facts, consumed-calorie ingestion and
CalorieCam (Phase 9B). Goals write-boundary hardening beyond ADR 0005. Any
worker, service or UI implementation.

---

## 2. Contract-wide invariants

| #   | Invariant                                                                                                          | Implementation-contract implication                                                                               |
| --- | ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| I1  | Completed workout history is independent of mutable prescription data.                                             | No FK from history to `training_plans`/`planned_workouts`; provenance stored as immutable scalars (§5).           |
| I2  | One logical completion creates at most one canonical session.                                                      | Unique `(user_id, ingestion_key)` on `public.workout_sessions` (§11, §15).                                        |
| I3  | The browser cannot write reward-bearing history.                                                                   | No `INSERT/UPDATE/DELETE` grant to `authenticated`; no RPC execute grant (§16).                                   |
| I4  | The trusted server derives `user_id`.                                                                              | `user_id` is a separate server-derived argument, never a payload field (§9).                                      |
| I5  | A client-supplied `user_id` is never accepted as authority.                                                        | Any `user_id`-like field in the payload is a contract violation → `PH_INVALID_COMMAND_VERSION` / rejected schema. |
| I6  | Session, children, supplied auxiliary facts and dispatch rows commit atomically.                                   | One transactional function call per completion (§9, §17).                                                         |
| I7  | Original historical facts are immutable.                                                                           | No `UPDATE` path exists for fact tables in any role except account-deletion cascade (§17).                        |
| I8  | Corrections are append-only.                                                                                       | `public.workout_session_adjustments` insert-only; originals never edited (§7).                                    |
| I9  | Historical provenance never uses a foreign key to mutable training-plan rows.                                      | Source plan/planned-workout IDs are plain UUID scalars, no FK, no `ON DELETE SET NULL` (§5).                      |
| I10 | Training-plan runtime remains writable only through `TrainingPlanService`.                                         | The outbox `training_plan_sync` consumer calls the service; it never touches plan tables (§12, §13).              |
| I11 | Progress History never directly awards XP or changes Goals.                                                        | Outbox delivers facts; consumers own their own writes (§13).                                                      |
| I12 | Downstream delivery is durable and independently retryable.                                                        | One outbox row per `(logical event, consumer)`; per-consumer state machine (§12).                                 |
| I13 | Historical dates, snapshots and calculation inputs never silently change.                                          | `local_day`, timezone, snapshots and `calculation_weight_kg` are write-once (§5, §9).                             |
| I14 | User account deletion is the only ordinary hard-deletion exception.                                                | `user_id → auth.users(id) ON DELETE CASCADE`; no other delete path (§17).                                         |
| I15 | Canonical reports never reconstruct history from `planned_workouts`, current profile values or `src/lib/store.ts`. | Read models bind exclusively to Progress History tables after cutover (§14).                                      |
| I16 | All direct user access is separately controlled by grants and RLS.                                                 | Grants are designed independently of RLS; RLS is defense in depth (§16).                                          |

---

## 3. Naming, types and versioning conventions

| Concern             | Frozen convention                                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema              | All entities live in `public`.                                                                                                                                                                          |
| Table names         | Plural, snake*case, domain-prefixed where ambiguous (`workout_session*\*`, `history_dispatch_outbox`).                                                                                                  |
| Primary key         | `id`, UUID, server-generated at insert.                                                                                                                                                                 |
| Ownership column    | `user_id`, UUID, references `auth.users(id) ON DELETE CASCADE`, never nullable.                                                                                                                         |
| UTC instants        | Logical type "UTC timestamp" — timezone-aware instant stored in UTC.                                                                                                                                    |
| Local dates         | Logical type "local date" — calendar day, no time, no zone; precomputed at ingestion, never recomputed.                                                                                                 |
| Timezone names      | Constrained text holding a valid IANA zone name (e.g. `Europe/Berlin`), max 64 characters.                                                                                                              |
| Enumerations        | Constrained text with an explicitly frozen allowed-value list in this contract (implementation may use a check).                                                                                        |
| Money/quantity      | Decimal with explicit scale stated per field; never floating binary for stored user-visible quantities.                                                                                                 |
| Non-negativity      | Every quantity field listed as non-negative is constrained `>= 0`; positive-only fields are constrained `> 0`.                                                                                          |
| Ordering indexes    | All `order_index` / `set_index` values are **zero-based**, contiguous, unique within their parent.                                                                                                      |
| Contract version    | `contract_version`, bounded integer, current value `1`, present on every fact and adjustment row.                                                                                                       |
| Event version       | `event_version`, bounded integer, current value `1`, present on every outbox row and delivered envelope.                                                                                                |
| Command version     | `command_version`, bounded integer, current supported value `1`.                                                                                                                                        |
| Function versioning | Version suffix in the function name (`..._v1`); a breaking change creates `..._v2`, never mutates `_v1` semantics.                                                                                      |
| Error codes         | Stable uppercase `PH_*` identifiers; codes are never reused with a different meaning.                                                                                                                   |
| Timestamps metadata | `created_at` (server clock, write-once) on every table; `updated_at` only on mutable operational state (outbox).                                                                                        |
| Text bounds         | Every free-text field has an explicit maximum length; unbounded text is forbidden.                                                                                                                      |
| Catalog identifiers | Exercise and focus catalog identities are **constrained text**, not UUIDs (repository evidence: `e1`, `e2`, `e3`), matching `^[A-Za-z0-9_.:-]{1,64}$`, stored as immutable scalars with no foreign key. |
| Structured objects  | Any stored object field is versioned, has an exact nested field matrix, a maximum serialized size and a canonical serialization (§6.1.1).                                                               |
| Fingerprints        | Every fingerprint is SHA-256 hex (64 lowercase characters) over a canonical UTF-8 NFC JSON serialization with sorted keys (§11.1).                                                                      |

---

## 4. Physical entity inventory

| Physical name                        | Classification                         | Owner            | Mutability                                    |
| ------------------------------------ | -------------------------------------- | ---------------- | --------------------------------------------- |
| `public.workout_sessions`            | Immutable historical fact              | Progress History | Insert-only (delete only via account cascade) |
| `public.workout_session_exercises`   | Immutable historical fact              | Progress History | Insert-only (delete only via account cascade) |
| `public.workout_session_sets`        | Immutable historical fact              | Progress History | Insert-only (delete only via account cascade) |
| `public.workout_session_adjustments` | Append-only correction event           | Progress History | Insert-only                                   |
| `public.history_dispatch_outbox`     | Mutable server-owned operational state | Progress History | Insert + restricted state updates by worker   |
| `public.hydration_facts`             | Auxiliary append-only fact             | Progress History | Insert-only                                   |
| `public.meal_adherence_facts`        | Auxiliary append-only fact             | Progress History | Insert-only                                   |
| `public.daily_target_snapshots`      | Auxiliary append-only fact             | Progress History | Insert-only                                   |
| History read models (§14)            | Downstream read model / projection     | Progress History | Derived; no independent storage in Phase 8    |

**Boundaries.** Hydration, meal adherence and daily-target snapshots are
**not** workout-session children: they carry no `session_id`, are keyed by
their own idempotency key and `local_day`, and survive independently of any
workout. Detailed food facts, consumed-calorie events and CalorieCam entities
are deliberately absent — they remain Phase 9B.

---

## 5. Workout session contract

`public.workout_sessions` — immutable canonical record of one completed
workout.

| Field                        | Logical type                | Required | Source/owner                             | Mutability | Constraints and allowed values                                                  | Purpose                                           |
| ---------------------------- | --------------------------- | -------- | ---------------------------------------- | ---------- | ------------------------------------------------------------------------------- | ------------------------------------------------- |
| `id`                         | UUID                        | Required | Server-generated                         | Write-once | Primary key                                                                     | Canonical session identity                        |
| `user_id`                    | UUID                        | Required | Server-derived from verified session     | Write-once | FK `auth.users(id) ON DELETE CASCADE`                                           | Ownership                                         |
| `ingestion_key`              | Constrained text (max 128)  | Required | Client-proposed, server-validated        | Write-once | Matches a frozen key form (§11); unique with `user_id`                          | Idempotency identity                              |
| `command_fingerprint`        | Constrained text (64, hex)  | Required | Server-computed from canonical payload   | Write-once | SHA-256 hex of the canonicalized immutable command subset (§11)                 | Detect incompatible reuse of an ingestion key     |
| `source`                     | Constrained text            | Required | Client-declared, server-validated        | Write-once | `plan_workout` \| `timer_session` \| `first_workout` \| `adhoc_workout`         | Provenance only; not part of uniqueness           |
| `created_at`                 | UTC timestamp               | Required | Database clock                           | Write-once | Default now                                                                     | Row creation time (not the event time)            |
| `occurred_at`                | UTC timestamp               | Required | Client-observed, server-validated        | Write-once | Not more than 48 h in the past nor 5 min in the future relative to server clock | Event occurrence instant                          |
| `occurred_timezone`          | Constrained text (max 64)   | Required | Client-observed, server-validated        | Write-once | Valid IANA zone name                                                            | Zone captured at ingestion                        |
| `occurred_timezone_source`   | Constrained text            | Required | Client-declared, server-validated        | Write-once | `device` \| `user_setting` \| `assumed_utc`                                     | Honesty about zone provenance                     |
| `local_day`                  | Local date                  | Required | Server-derived from `occurred_at` + zone | Write-once | Never recalculated after ingestion                                              | Historical calendar-day grouping                  |
| `source_plan_id`             | UUID                        | Nullable | Copied from trusted application state    | Write-once | **No FK**; required when `source = plan_workout`                                | Immutable plan provenance                         |
| `source_planned_workout_id`  | UUID                        | Nullable | Copied from trusted application state    | Write-once | **No FK**; required when `source = plan_workout`                                | Plan-sync target identity                         |
| `plan_name_snapshot`         | Constrained text (max 160)  | Nullable | Snapshot at ingestion                    | Write-once | Neutral stored value; never re-resolved                                         | Stable historical display                         |
| `workout_title_snapshot`     | Constrained text (max 160)  | Required | Snapshot at ingestion                    | Write-once | Non-empty; neutral identity, not a translated UI string                         | Stable historical display                         |
| `week_number_snapshot`       | Bounded integer             | Nullable | Snapshot at ingestion                    | Write-once | `>= 1` when present                                                             | Plan position at completion time                  |
| `day_number_snapshot`        | Bounded integer             | Nullable | Snapshot at ingestion                    | Write-once | `>= 1` when present                                                             | Plan position at completion time                  |
| `difficulty_snapshot`        | Constrained text            | Nullable | Snapshot at ingestion                    | Write-once | `beginner` \| `intermediate` \| `advanced`                                      | Historical difficulty context                     |
| `estimated_duration_seconds` | Bounded integer             | Nullable | Snapshot of prescription                 | Write-once | `>= 0`, `<= 86400`                                                              | Prescribed duration                               |
| `actual_duration_seconds`    | Bounded integer             | Nullable | Client-observed, server-validated        | Write-once | `>= 0`, `<= 86400`; distinct from estimated                                     | Measured duration                                 |
| `calories_kcal`              | Decimal(7,2)                | Nullable | Derived or user-entered                  | Write-once | `>= 0`; required non-null when `calories_source <> 'unknown'`                   | Energy fact                                       |
| `calories_source`            | Constrained text            | Required | Server-validated                         | Write-once | `estimated` \| `measured` \| `user_entered` \| `unknown`                        | Provenance; forbids labelling estimates as actual |
| `calorie_algorithm_version`  | Constrained text (max 32)   | Nullable | Server-supplied                          | Write-once | Required when `calories_source = 'estimated'`; forbidden otherwise              | Reproducibility of estimates                      |
| `calculation_weight_kg`      | Decimal(5,2)                | Nullable | Snapshot of profile at ingestion         | Write-once | `> 0` when present; required when `calories_source = 'estimated'`               | Historical calculation input                      |
| `notes`                      | Constrained text (max 2000) | Nullable | User-entered                             | Write-once | Never overwritten on replay                                                     | User annotation                                   |
| `app_version`                | Constrained text (max 32)   | Required | Client-declared                          | Write-once | Non-empty; non-semantic diagnostics only                                        | Diagnostics and provenance                        |
| `confirmation_received_at`   | UTC timestamp               | Required | Server clock at first accepted write     | Write-once | Never client-supplied; not fingerprinted (§9.2, §11.1)                          | When the trusted server received the confirmation |
| `contract_version`           | Bounded integer             | Required | Server-set                               | Write-once | Currently `1`                                                                   | Schema/contract evolution                         |

**Time semantics.** `occurred_at` is the event instant; `created_at` is the
database write instant; `local_day` is the historical calendar day derived once
from `occurred_at` in `occurred_timezone`. Travel or a timezone setting change
never rewrites `local_day` (I13).

**Source vocabulary.** `plan_workout` (plan-linked completion),
`timer_session` (timer-only ad-hoc), `first_workout` (onboarding first
workout), `adhoc_workout` (other explicitly supported ad-hoc completion). UI
route names are never used as source values.

**Field derivation classes.** Server-generated: `id`, `created_at`,
`local_day`, `command_fingerprint`, `contract_version`. Server-derived:
`user_id`. Client-observed and server-validated: `occurred_at`,
`occurred_timezone`, `occurred_timezone_source`, `actual_duration_seconds`,
`app_version`, `notes`. Copied from trusted application state: plan provenance
and all snapshot fields, `estimated_duration_seconds`, calorie fields.

### 5.1 Difficulty normalization (frozen)

Repository evidence (`src/services/workout-generator/workoutTypes.ts`,
`Difficulty`) shows the Training domain uses Portuguese source values, while
Progress History stores canonical, language-neutral history values.

| Repository value | Canonical history value |
| ---------------- | ----------------------- |
| `iniciante`      | `beginner`              |
| `intermediario`  | `intermediate`          |
| `avancado`       | `advanced`              |

Frozen rules:

- `workout_sessions.difficulty_snapshot` stores **only** the canonical history
  value (`beginner` \| `intermediate` \| `advanced`).
- The trusted coordinator performs the mapping **before** ingestion; the
  ingestion command accepts only canonical values.
- An unknown or unmapped source value is **rejected** with
  `PH_INVALID_DIFFICULTY` (§10). It is never silently defaulted to `beginner`
  or to null.
- The mapping preserves meaning only. The canonical value is not a translated
  UI label; read models localize it at render time (§14).
- A later change to the user's profile, plan or locale never alters the stored
  snapshot.
- `difficulty_snapshot` participates in the session command fingerprint
  (§11.1), so ingesting the same key with a different difficulty is an
  ingestion-key conflict, not a replay.

---

## 6. Session exercise and set contracts

### 6.1 `public.workout_session_exercises`

| Field                         | Logical type                | Required | Source/owner                | Mutability | Constraints and allowed values                                                                                   | Purpose                                 |
| ----------------------------- | --------------------------- | -------- | --------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `id`                          | UUID                        | Required | Server-generated            | Write-once | Primary key                                                                                                      | Exercise-row identity                   |
| `session_id`                  | UUID                        | Required | Server                      | Write-once | FK `(session_id, user_id) → workout_sessions(id, user_id)` ON DELETE CASCADE                                     | Same-user parent link                   |
| `user_id`                     | UUID                        | Required | Server-derived              | Write-once | Must equal parent `user_id`                                                                                      | Ownership and RLS                       |
| `order_index`                 | Bounded integer             | Required | Client-observed             | Write-once | Zero-based, contiguous, unique per session                                                                       | Deterministic ordering                  |
| `exercise_id`                 | Constrained text (max 64)   | Nullable | Catalog identifier snapshot | Write-once | Matches `^[A-Za-z0-9_.:-]{1,64}$`; **no FK**; null when the performed exercise has no canonical catalog identity | Current-catalog label resolution        |
| `exercise_key_snapshot`       | Constrained text (max 80)   | Required | Snapshot at ingestion       | Write-once | Non-empty neutral, non-translated identity key                                                                   | Stable identity independent of language |
| `exercise_name_snapshot`      | Constrained text (max 160)  | Required | Snapshot at ingestion       | Write-once | Neutral (source-language canonical) name, not a localized UI string                                              | Fallback display                        |
| `prescription_snapshot`       | Structured object (§6.1.1)  | Required | Snapshot of prescription    | Write-once | Versioned bounded object per §6.1.1; canonical serialization ≤ 2048 bytes                                        | Historical prescription fact            |
| `substituted_for_exercise_id` | Constrained text (max 64)   | Nullable | Client-observed             | Write-once | Same pattern as `exercise_id`; **no FK**; present only when a substitution occurred                              | Substitution provenance                 |
| `status`                      | Constrained text            | Required | Client-observed             | Write-once | `completed` \| `partially_completed` \| `skipped`                                                                | Execution outcome                       |
| `notes`                       | Constrained text (max 1000) | Nullable | User-entered                | Write-once | —                                                                                                                | User annotation                         |
| `created_at`                  | UTC timestamp               | Required | Database clock              | Write-once | Default now                                                                                                      | Audit                                   |
| `contract_version`            | Bounded integer             | Required | Server-set                  | Write-once | Currently `1`                                                                                                    | Contract evolution                      |

Frozen rules:

- Status vocabulary is exactly `completed`, `partially_completed`, `skipped`.
- `order_index` is **zero-based**, contiguous from `0`, unique per session.
- Every exercise row must carry a neutral snapshot pair
  (`exercise_key_snapshot`, `exercise_name_snapshot`); translated UI strings are
  never canonical identity.
- **Localization fallback:** if `exercise_id` resolves in the current catalog,
  read models display the current localized label; otherwise they display
  `exercise_name_snapshot` verbatim (§14.6).
- A `skipped` exercise may have zero sets or only non-completed sets.

**Exercise identity is repository-compatible constrained text.** Repository
evidence (`src/services/workout-generator/workoutTypes.ts`,
`WorkoutExercise.id`) shows the existing catalog uses stable short string
identifiers such as `e1`, `e2`, `e3` — not UUIDs. `exercise_id` and
`substituted_for_exercise_id` are therefore bounded text identifiers. They are
immutable scalars with **no** database foreign key, so catalog evolution never
rewrites or deletes historical identity.

**Substitution semantics (frozen).**

- `exercise_id` identifies the exercise **actually performed**, and only when
  that performed exercise has a stable canonical catalog identity.
- `substituted_for_exercise_id` identifies the **originally prescribed**
  exercise, and is non-null only when a substitution occurred.
- When the performed replacement has no canonical catalog identity,
  `exercise_id` is null; `substituted_for_exercise_id` may still be present.
- The performed replacement always requires its own
  `exercise_key_snapshot` and `exercise_name_snapshot`; a substitution never
  reuses the original exercise's neutral snapshots.
- `exercise_id` and `substituted_for_exercise_id` must differ when both are
  non-null.
- A read model must never resolve the original exercise's localized catalog
  label and display it as the performed exercise (§14.6).
- Repository evidence shows the current generator may retain the original
  exercise `id` while changing `name` and recording `substitutedFrom`. The
  future coordinator / source adapter **must normalize** that representation
  into this contract before trusted ingestion: move the original identifier
  into `substituted_for_exercise_id` and set `exercise_id` to the performed
  exercise's canonical identifier, or null when it has none. This normalization
  is a Sprint 8.2 source-wiring dependency and authorizes no code change here.
- A payload violating any of these rules is rejected with
  `PH_INVALID_EXERCISE_IDENTITY` (§10).

#### 6.1.1 `prescription_snapshot` structured contract

`prescription_snapshot` is a bounded, versioned structured object — never
arbitrary unversioned text and never an undefined object. It records the
**prescription** only; actual performance lives exclusively in
`workout_session_sets` and never overwrites, merges into or back-fills this
snapshot.

| Field               | Logical type               | Required | Constraints and allowed values                                                              | Purpose                                      |
| ------------------- | -------------------------- | -------- | ------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `version`           | Bounded integer            | Required | Currently `1`; an unsupported value is rejected with `PH_INVALID_PRESCRIPTION_SNAPSHOT`     | Snapshot-shape evolution                     |
| `planned_sets`      | Bounded integer            | Required | `>= 0`, `<= 100`                                                                            | Prescribed set count                         |
| `reps_text`         | Constrained text (max 40)  | Required | Non-empty, trimmed, neutral source text (e.g. `8-12`, `AMRAP`, `30s`); never translated     | Prescribed repetition scheme as written      |
| `rest_text`         | Constrained text (max 40)  | Nullable | Trimmed neutral source text (e.g. `60s`, `90-120s`); null when the source prescribed none   | Prescribed rest as written                   |
| `rest_seconds`      | Bounded integer            | Nullable | `>= 0`, `<= 3600`; present **only** when `rest_text` is deterministically a single duration | Normalized rest for aggregation              |
| `tempo`             | Constrained text (max 24)  | Nullable | Trimmed neutral tempo notation (e.g. `3-1-1-0`) when the source supplies it                 | Prescribed tempo                             |
| `focus_key`         | Constrained text (max 64)  | Nullable | Matches `^[A-Za-z0-9_.:-]{1,64}$`; neutral focus identifier                                 | Stable focus identity for read models        |
| `focus_text`        | Constrained text (max 120) | Nullable | Trimmed neutral source text; required when `focus_key` is null and a focus was prescribed   | Neutral focus fallback                       |
| `prescription_note` | Constrained text (max 400) | Nullable | Trimmed neutral source text                                                                 | Explicit cue/note needed to preserve meaning |

Frozen rules:

- Required: `version`, `planned_sets`, `reps_text`. Every other field is
  optional and, when not supplied, is **omitted** rather than sent as an
  explicit null (§11.1 canonicalization).
- `rest_seconds` is derived only when the source rest prescription is a single
  unambiguous duration; a range or free text leaves it null and keeps
  `rest_text`. `rest_seconds` never replaces `rest_text`.
- No field of this object may be a translated UI string.
- Canonical serialization: UTF-8 JSON, NFC-normalized, keys sorted
  lexicographically ascending, no insignificant whitespace, integers without a
  decimal part, omitted optionals absent. The canonical serialization must not
  exceed **2048 bytes**; a larger payload is rejected with
  `PH_INVALID_PRESCRIPTION_SNAPSHOT`.
- The stored value is exactly the canonical serialization of the accepted
  input, so the snapshot round-trips byte-identically for fingerprinting
  (§11.1).

### 6.2 `public.workout_session_sets`

| Field                 | Logical type     | Required | Source/owner    | Mutability | Constraints and allowed values                                                                 | Purpose                 |
| --------------------- | ---------------- | -------- | --------------- | ---------- | ---------------------------------------------------------------------------------------------- | ----------------------- |
| `id`                  | UUID             | Required | Server          | Write-once | Primary key                                                                                    | Set identity            |
| `session_exercise_id` | UUID             | Required | Server          | Write-once | FK `(session_exercise_id, user_id) → workout_session_exercises(id, user_id)` ON DELETE CASCADE | Same-user parent link   |
| `user_id`             | UUID             | Required | Server-derived  | Write-once | Must equal parent `user_id`                                                                    | Ownership and RLS       |
| `set_index`           | Bounded integer  | Required | Client-observed | Write-once | Zero-based, contiguous, unique per exercise                                                    | Deterministic ordering  |
| `reps`                | Bounded integer  | Nullable | Client-observed | Write-once | `>= 0`, `<= 1000`                                                                              | Repetition evidence     |
| `load_kg`             | Decimal(6,2)     | Nullable | Client-observed | Write-once | `>= 0`, `<= 1000`                                                                              | External load           |
| `assistance_level`    | Constrained text | Nullable | Client-observed | Write-once | `none` \| `band_light` \| `band_medium` \| `band_heavy` \| `partner` \| `machine`              | Calisthenics assistance |
| `duration_seconds`    | Bounded integer  | Nullable | Client-observed | Write-once | `>= 0`, `<= 86400`                                                                             | Timed set evidence      |
| `hold_seconds`        | Bounded integer  | Nullable | Client-observed | Write-once | `>= 0`, `<= 86400`                                                                             | Isometric hold evidence |
| `distance_m`          | Decimal(8,2)     | Nullable | Client-observed | Write-once | `>= 0`, `<= 100000`                                                                            | Distance evidence       |
| `rpe`                 | Decimal(3,1)     | Nullable | User-entered    | Write-once | Borg CR10 scale: `1.0`–`10.0`, steps of `0.5`                                                  | Perceived effort        |
| `is_completed`        | Boolean          | Required | Client-observed | Write-once | —                                                                                              | Completion status       |
| `performed_at`        | UTC timestamp    | Nullable | Client-observed | Write-once | When present, within the session window `[occurred_at - 24 h, occurred_at + 5 min]`            | Set-level timing        |
| `created_at`          | UTC timestamp    | Required | Database clock  | Write-once | Default now                                                                                    | Audit                   |
| `contract_version`    | Bounded integer  | Required | Server-set      | Write-once | Currently `1`                                                                                  | Contract evolution      |

Frozen rules:

- **Completed set:** `is_completed = true` **and** at least one measurable
  field (`reps`, `duration_seconds`, `hold_seconds`, `distance_m`) is present
  and strictly greater than zero.
- **Valid nonzero workout evidence:** the session contains at least one
  completed set as defined above.
- **Skipped/incomplete representation:** incomplete work is persisted with
  `is_completed = false` (and, at exercise level, status
  `partially_completed` or `skipped`). Nothing is deleted to represent a skip.
- **Empty workouts are rejected.** A session with zero exercises, or with no
  completed set, fails validation with `PH_EMPTY_WORKOUT`.
- **Timer and ad-hoc completions** are persisted only when the command carries
  explicit completion confirmation (§9) **and** valid nonzero workout
  evidence. No arbitrary elapsed-time threshold is used.

### 6.3 Composite ownership

- `public.workout_sessions` carries a unique constraint on `(id, user_id)`.
- `public.workout_session_exercises` carries a unique constraint on
  `(id, user_id)` and references the parent through `(session_id, user_id)`.
- `public.workout_session_sets` references its parent through
  `(session_exercise_id, user_id)`.
- Consequence: a child owned by user A can never reference a parent owned by
  user B, independently of RLS.

---

## 7. Append-only adjustment contract

`public.workout_session_adjustments` — the only mechanism for voiding or
correcting history. Originals are never edited.

### 7.1 Adjustment entity contract

| Field                    | Logical type               | Required | Source/owner               | Mutability | Constraints and allowed values                                                                                                                                     | Purpose                      |
| ------------------------ | -------------------------- | -------- | -------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| `id`                     | UUID                       | Required | Server-generated           | Write-once | Primary key                                                                                                                                                        | Adjustment identity          |
| `user_id`                | UUID                       | Required | Server-derived             | Write-once | FK `auth.users(id) ON DELETE CASCADE`                                                                                                                              | Ownership                    |
| `adjustment_key`         | Constrained text (max 128) | Required | Client-proposed            | Write-once | Unique with `user_id`; frozen key forms of §7.2                                                                                                                    | Command idempotency          |
| `command_fingerprint`    | Constrained text (64)      | Required | Server-computed            | Write-once | 64 lowercase hex, SHA-256, inputs frozen in §7.2                                                                                                                   | Replay/conflict detection    |
| `kind`                   | Constrained text           | Required | Server-validated           | Write-once | `void` \| `correction`                                                                                                                                             | Adjustment semantics         |
| `target_session_id`      | UUID                       | Required | Client-proposed, validated | Write-once | FK `(target_session_id, user_id) → workout_sessions(id, user_id)`                                                                                                  | Session being adjusted       |
| `replacement_session_id` | UUID                       | Nullable | Server-created             | Write-once | FK `(replacement_session_id, user_id) → workout_sessions(id, user_id)`; required iff `kind = 'correction'`; forbidden when `kind = 'void'`; `<> target_session_id` | New canonical session        |
| `reason_code`            | Constrained text (max 64)  | Required | Client-declared, validated | Write-once | `^[a-z0-9_]{1,64}$`; neutral, non-translated, stable identifier                                                                                                    | Machine-readable audit       |
| `reason_text`            | Constrained text (max 500) | Nullable | User-supplied              | Write-once | Trimmed; non-empty when present; never used as a machine key                                                                                                       | Human audit detail           |
| `occurred_at`            | UTC timestamp              | Required | Server clock at request    | Write-once | Normalized per §11 (UTC, second precision)                                                                                                                         | When the adjustment happened |
| `actor_type`             | Constrained text           | Required | Server-derived             | Write-once | `user` \| `system` (§7.1 actor semantics)                                                                                                                          | Who adjusted                 |
| `actor_id`               | UUID                       | Nullable | Server-derived             | Write-once | Required and equal to `user_id` when `actor_type = 'user'`; null when `actor_type = 'system'`                                                                      | Verified actor identity      |
| `created_at`             | UTC timestamp              | Required | Database clock             | Write-once | Default now; database precision retained (§11)                                                                                                                     | Audit                        |
| `contract_version`       | Bounded integer            | Required | Server-set                 | Write-once | Currently `1`                                                                                                                                                      | Contract evolution           |

The earlier ambiguous combined `reason` field is **withdrawn**; every reader and
read model uses `reason_code` plus optional `reason_text`.

Frozen entity rules:

- A `void` has no replacement session; a `correction` must have one.
- Target and replacement must belong to the same `user_id` (enforced by the
  composite FKs).
- Target and replacement must be different sessions.
- Original sessions are never edited or deleted; a replacement is a **new**
  immutable canonical session with its own `ingestion_key`
  (`correction:{originalSessionId}:{stableUuid}`) created in the same
  transaction as the adjustment.
- Read models resolve the effective session purely by reading adjustments —
  never by mutating any original row.
- Account deletion remains the explicit hard-deletion exception.

**Actor semantics (frozen, v1).**

| `actor_type` | `actor_id`                                          | Permitted origin                                                                                       |
| ------------ | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `user`       | Required; exactly the verified owner's `user_id`     | An authenticated request from the owner through the trusted server boundary                            |
| `system`     | Null                                                 | An explicitly trusted internal workflow (maintenance, reconciliation) running under the service role   |

A `support` actor type is **not** part of v1 and is removed: no verified support
identity exists in the platform today, so it would be unenforceable. Neither
`actor_type` nor `actor_id` is ever client-supplied; the trusted server derives
both from the verified request context.

### 7.2 Adjustment idempotency and graph integrity

Frozen `adjustment_key` forms:

- `void:{targetSessionId}:{stableUuid}`
- `correction:{targetSessionId}:{stableUuid}`

Frozen resolution rules:

- Uniqueness is `(user_id, adjustment_key)`.
- Same key **+ equivalent** `command_fingerprint` → idempotent replay: the
  existing adjustment is returned, nothing is written, no replacement session is
  created.
- Same key **+ different** `command_fingerprint` → stable conflict
  `PH_ADJUSTMENT_KEY_CONFLICT`; the whole transaction fails.
- At most one adjustment may directly target a given session (unique
  `(target_session_id)`). A second attempt returns `PH_ADJUSTMENT_CONFLICT`.
- A replacement session may belong to at most one correction (unique non-null
  `(replacement_session_id)`).
- Replacement sessions are created inside the adjustment transaction. A client
  may never supply an arbitrary existing session as the replacement; the
  replacement row ID is never accepted from the payload.
- Because each session has at most one direct adjustment, each replacement is
  newly created, and no replacement is shared, the adjustment graph is a forest
  of simple paths: it cannot branch, merge or form a cycle.
- To adjust again, the user adjusts the current effective (replacement)
  session, producing another deterministic link rather than rewriting an
  earlier link.
- Effective-session resolution follows `correction` links until a session with
  no adjustment (effective) or a `void` (excluded) is reached; chain depth is
  bounded to 32 links, beyond which resolution returns
  `PH_ADJUSTMENT_CHAIN_CORRUPT` to readers (§14.4) and
  `PH_ADJUSTMENT_CONFLICT` to the operator issuing a further adjustment.

**Adjustment `command_fingerprint` inputs (frozen).**

| Group             | Fingerprinted values                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Command identity  | `command_version`, `adjustment_key`                                                           |
| Adjustment intent | `kind`, `target_session_id`, `reason_code`, `reason_text`                                     |
| Replacement       | For `kind = correction`: the full session `command_fingerprint` (§11.1) of the replacement    |
| Verified actor    | `actor_type`, `actor_id`                                                                      |

Canonicalization is exactly §11.1's (UTF-8 JSON, NFC, sorted keys, absent and
`null` identical, UTC second-precision timestamps, SHA-256 lowercase hex).
Server-generated row IDs, `created_at`, `contract_version` and transport
metadata are excluded.

### 7.3 Trusted adjustment command and result

Future function: `public.adjust_workout_session_v1`.

**Conceptual signature (implementation-neutral, no SQL):**

| Position | Argument      | Logical type       | Notes                                              |
| -------- | ------------- | ------------------ | -------------------------------------------------- |
| 1        | `p_user_id`   | UUID               | Server-derived only; never from the client payload |
| 2        | `p_command`   | Versioned document | Adjustment command below                           |
| Returns  | `p_result`    | Versioned document | Adjustment result below                            |

**Adjustment-command input matrix:**

| Field                    | Logical type               | Required                          | Origin          | Constraints                                              |
| ------------------------ | -------------------------- | --------------------------------- | --------------- | -------------------------------------------------------- |
| `command_version`        | Bounded integer            | Required                          | Client          | Currently `1`                                            |
| `adjustment_key`         | Constrained text (max 128) | Required                          | Client          | Frozen key forms of §7.2                                 |
| `kind`                   | Constrained text           | Required                          | Client          | `void` \| `correction`                                   |
| `target_session_id`      | UUID                       | Required                          | Client          | Must be an existing same-user session                    |
| `reason_code`            | Constrained text (max 64)  | Required                          | Client          | `^[a-z0-9_]{1,64}$`                                      |
| `reason_text`            | Constrained text (max 500) | Optional                          | User-entered    | Trimmed; non-empty when present                          |
| `replacement_completion` | Versioned command (§9)     | Required when `kind = correction` | Client          | A complete completion command; forbidden for `kind=void` |

The client must **not** supply: `user_id`, actor authority, `actor_type`,
`actor_id`, any replacement database row ID, any outbox field, any database
timestamp, any fingerprint, or any `contract_version`. Supplying any of them is
a structural violation.

**Adjustment-result matrix:**

| Field                    | Logical type     | Required | Meaning                                                  |
| ------------------------ | ---------------- | -------- | -------------------------------------------------------- |
| `result_version`         | Bounded integer  | Required | Currently `1`                                            |
| `ok`                     | Boolean          | Required | Whether the adjustment succeeded                         |
| `adjustment_id`          | UUID             | Required on success | Stored adjustment identity                    |
| `target_session_id`      | UUID             | Required on success | Echo of the adjusted session                  |
| `replacement_session_id` | UUID             | Required for corrections | New immutable session                    |
| `adjustment_key`         | Constrained text | Required on success | Echo of the accepted key                      |
| `outcome`                | Constrained text | Required on success | `created` \| `replayed`                       |
| `error_code`             | Constrained text | Required on failure | Stable code from §10                          |
| `error_detail`           | Structured object | Optional | Non-sensitive diagnostic context, no user PII |

**Security (identical to ingestion, §16).** `SECURITY INVOKER`, empty safe
`search_path`, fully qualified relation names, execution revoked from `PUBLIC`,
`anon` and `authenticated`, execution granted only to `service_role`. The
trusted server authenticates the request and derives both user and actor
identity. `authenticated` and `anon` have **no** insert privilege on the
adjustment table.

The correction replacement session and its children, the adjustment row and all
outbox rows commit atomically in one transaction (§17). No executable SQL is
defined here.

**Downstream consequences.** Every committed adjustment creates outbox rows in
the same transaction: `session_void` or `session_correction` events for the
`gamification` and `goals` consumers, and for `training_plan_sync` when the
target session carries a `source_planned_workout_id`. Progress History never
writes XP, levels, achievements or goal progress itself; consumers reverse or
recompute their own projections idempotently.

---

## 8. Auxiliary Phase 8 fact contracts

Auxiliary facts are **not** workout children. They carry no `session_id`.

### 8.1 `public.hydration_facts`

| Field                      | Logical type               | Required                     | Source/owner     | Mutability | Constraints and allowed values                                                             | Purpose                   |
| -------------------------- | -------------------------- | ---------------------------- | ---------------- | ---------- | -------------------------------------------------------------------------------------------- | ------------------------- |
| `id`                       | UUID                       | Required                     | Server-generated | Write-once | Primary key; also unique as `(id, user_id)`                                                | Fact identity             |
| `user_id`                  | UUID                       | Required                     | Server-derived   | Write-once | FK `auth.users(id) ON DELETE CASCADE`                                                      | Ownership                 |
| `ingestion_key`            | Constrained text (max 128) | Required                     | Client-proposed  | Write-once | Unique with `user_id`; form `hydration:{stableUuid}`                                       | Idempotency               |
| `fact_fingerprint`         | Constrained text (64)      | Required                     | Server-computed  | Write-once | 64 lowercase hex, SHA-256; inputs frozen in §11.3                                          | Replay/conflict detection |
| `kind`                     | Constrained text           | Required                     | Client-declared  | Write-once | `entry` \| `void`                                                                          | Append-only event type    |
| `target_fact_id`           | UUID                       | Required when `kind = void`  | Client-proposed  | Write-once | Forbidden when `kind = entry`; FK `(target_fact_id, user_id) → hydration_facts(id, user_id)` | Voided entry              |
| `occurred_at`              | UTC timestamp              | Required                     | Client-observed  | Write-once | Same window rule as §5; normalized per §11 (UTC, second precision)                         | Event instant             |
| `occurred_timezone`        | Constrained text (max 64)  | Required                     | Client-observed  | Write-once | Valid IANA zone                                                                            | Zone at ingestion         |
| `occurred_timezone_source` | Constrained text           | Required                     | Client-declared  | Write-once | `device` \| `user_setting` \| `assumed_utc`                                                | Zone provenance           |
| `local_day`                | Local date                 | Required                     | Server-derived   | Write-once | Never recalculated                                                                         | Daily grouping            |
| `volume_ml`                | Bounded integer            | Required when `kind = entry` | Client-observed  | Write-once | `> 0`, `<= 10000`; absent/null when `kind = void`; never negative                          | Hydration amount          |
| `created_at`               | UTC timestamp              | Required                     | Database clock   | Write-once | Default now; database precision retained (§11)                                             | Audit                     |
| `contract_version`         | Bounded integer            | Required                     | Server-set       | Write-once | Currently `1`                                                                              | Contract evolution        |

Frozen rules:

- **Entry event:** `kind = entry`, positive `volume_ml`, no `target_fact_id`.
- **Void event:** `kind = void`, required same-user `target_fact_id`,
  `volume_ml` absent/null. The target must be an existing hydration `entry`
  row; a void may never target another void. At most one direct void per
  target, enforced by partial uniqueness on non-null
  `(target_fact_id, user_id)` (§15).
- Uniqueness is `(user_id, ingestion_key)`; composite ownership is
  `(id, user_id)`; the self-reference is same-user `(target_fact_id, user_id)`.
- `fact_fingerprint` is required and immutable.
- No hydration row is ever updated or deleted, and no negative volume is
  storable.

**Correcting a mistaken entry (atomic, §17).**

1. Append a `void` event targeting the incorrect entry.
2. Append a new `entry` event carrying the corrected volume.

Effective hydration totals sum **only** `entry` rows that are not targeted by a
void (§14.5). The earlier statement that a corrected total is appended and all
facts are then summed is withdrawn: it double-counted.

### 8.2 `public.meal_adherence_facts`

| Field                      | Logical type               | Required | Source/owner     | Mutability | Constraints and allowed values                                                         | Purpose              |
| -------------------------- | -------------------------- | -------- | ---------------- | ---------- | -------------------------------------------------------------------------------------- | -------------------- |
| `id`                       | UUID                       | Required | Server-generated | Write-once | Primary key                                                                            | Fact identity        |
| `user_id`                  | UUID                       | Required | Server-derived   | Write-once | FK `auth.users(id) ON DELETE CASCADE`                                                  | Ownership            |
| `ingestion_key`            | Constrained text (max 128) | Required | Client-proposed  | Write-once | Unique with `user_id`; form `meal:{stableUuid}`                                        | Idempotency          |
| `fact_fingerprint`         | Constrained text (64)      | Required | Server-computed  | Write-once | 64 lowercase hex, SHA-256; inputs frozen in §11.3                                      | Replay/conflict detection |
| `occurred_at`              | UTC timestamp              | Required | Client-observed  | Write-once | Same window rule as §5                                                                 | Observation instant  |
| `occurred_timezone`        | Constrained text (max 64)  | Required | Client-observed  | Write-once | Valid IANA zone                                                                        | Zone at ingestion    |
| `occurred_timezone_source` | Constrained text           | Required | Client-declared  | Write-once | `device` \| `user_setting` \| `assumed_utc`                                            | Zone provenance      |
| `local_day`                | Local date                 | Required | Server-derived   | Write-once | Never recalculated                                                                     | Daily grouping       |
| `meal_key`                 | Constrained text (max 40)  | Required | Client-declared  | Write-once | Closed v1 enum: `breakfast` \| `lunch` \| `dinner` \| `snack_1` \| `snack_2` \| `snack_3` | Stable meal identity |
| `adhered`                  | Boolean                    | Required | Client-observed  | Write-once | —                                                                                      | Adherence value      |
| `created_at`               | UTC timestamp              | Required | Database clock   | Write-once | Default now                                                                            | Audit                |
| `contract_version`         | Bounded integer            | Required | Server-set       | Write-once | Currently `1`                                                                          | Contract evolution   |

**Deterministic read semantics.** When several append-only observations exist
for the same `(user_id, local_day, meal_key)`, the effective value is the one
with the greatest `occurred_at`, tie-broken by the greatest `created_at`, then
the greatest `id`. Translated meal labels are never stored; `meal_key` is
canonical and UI resolves the localized label.

### 8.3 `public.daily_target_snapshots`

| Field                      | Logical type               | Required | Source/owner     | Mutability | Constraints and allowed values                                    | Purpose                      |
| -------------------------- | -------------------------- | -------- | ---------------- | ---------- | ----------------------------------------------------------------- | ---------------------------- |
| `id`                       | UUID                       | Required | Server-generated | Write-once | Primary key                                                       | Snapshot identity            |
| `user_id`                  | UUID                       | Required | Server-derived   | Write-once | FK `auth.users(id) ON DELETE CASCADE`                             | Ownership                    |
| `ingestion_key`            | Constrained text (max 128) | Required | Client-proposed  | Write-once | Unique with `user_id`; form `daily-target:{stableUuid}`           | Idempotency                  |
| `fact_fingerprint`         | Constrained text (64)      | Required | Server-computed  | Write-once | 64 lowercase hex, SHA-256; inputs frozen in §11.3                 | Replay/conflict detection    |
| `captured_at`              | UTC timestamp              | Required | Client-observed  | Write-once | Same window rule as §5                                            | Capture instant              |
| `captured_timezone`        | Constrained text (max 64)  | Required | Client-observed  | Write-once | Valid IANA zone                                                   | Zone at capture              |
| `captured_timezone_source` | Constrained text           | Required | Client-declared  | Write-once | `device` \| `user_setting` \| `assumed_utc`                       | Zone provenance              |
| `local_day`                | Local date                 | Required | Server-derived   | Write-once | Never recalculated                                                | Daily grouping               |
| `calorie_target_kcal`      | Decimal(7,2)               | Required | Derived/entered  | Write-once | `> 0`, `<= 20000`                                                 | Applicable daily target      |
| `calculation_weight_kg`    | Decimal(5,2)               | Nullable | Snapshot         | Write-once | `> 0` when present; required when `target_source = 'calculated'`  | Historical calculation input |
| `target_source`            | Constrained text           | Required | Server-validated | Write-once | `calculated` \| `user_entered` \| `unknown`                       | Provenance                   |
| `target_algorithm_version` | Constrained text (max 32)  | Nullable | Server-supplied  | Write-once | Required when `target_source = 'calculated'`; forbidden otherwise | Reproducibility              |
| `created_at`               | UTC timestamp              | Required | Database clock   | Write-once | Default now                                                       | Audit                        |
| `contract_version`         | Bounded integer            | Required | Server-set       | Write-once | Currently `1`                                                     | Contract evolution           |

**Multiplicity.** Several snapshots may exist for one `local_day` (for example
after a profile change). The applicable snapshot for a day is the one with the
greatest `captured_at`, tie-broken by greatest `created_at`, then greatest
`id`.

### 8.4 Auxiliary-fact boundaries

- Auxiliary facts are not workout children and have no `session_id`.
- They never grant workout XP.
- They may be supplied inside the trusted completion command **only** when the
  product has explicit applicable user input (an actual hydration entry, an
  actual meal check, an actual target capture) — never synthesized.
- When included, they commit atomically with the session without becoming
  owned by it: no FK to the session, no cascade from the session.
- Each auxiliary fact has its own `(user_id, ingestion_key)` idempotency.
- Standalone auxiliary-fact ingestion, if added later, must use an equivalent
  trusted server boundary and service-role-only function.
- No detailed nutrition or consumed-calorie logging is defined here (Phase 9B).

---

## 9. Trusted ingestion command and result

Future function: `public.ingest_workout_completion_v1`.

**Conceptual signature (implementation-neutral, no SQL):**

| Position | Argument                   | Logical type                | Notes                                              |
| -------- | -------------------------- | --------------------------- | -------------------------------------------------- |
| 1        | `p_user_id`                | UUID                        | Server-derived only; never from the client payload |
| 2        | `p_command`                | Versioned structured object | The completion command described below             |
| Returns  | `ingest_workout_result_v1` | Versioned structured object | The result described below                         |

Security and execution requirements for the future function:

- `SECURITY INVOKER`.
- Empty safe `search_path`.
- Fully qualified relation names.
- Execute revoked from `PUBLIC`, `anon`, `authenticated`.
- Execute granted only to `service_role`.
- Called by the trusted server boundary with a service-role client that does
  **not** forward the browser user JWT.
- Commits session, children, supplied auxiliary facts and dispatch rows in one
  transaction.
- Returns the existing session on a valid idempotent replay.

**Command payload matrices are distinct from database-row matrices.** §5, §6
and §8 describe stored rows, which include server-owned fields. The matrices
in §9.1 and §9.3–§9.9 describe the **client-supplied command** only. A nested
object of the command is defined solely by its own matrix here; "per §6.1"
never implies that the client may send row-level fields.

**Forbidden in every level of the command payload.** The client never supplies:
row IDs (`id`, `session_id`, `session_exercise_id`, `target_fact_id` of a row it
did not create through this contract), `user_id` or any other authoritative
user identifier, `created_at` / `updated_at`, `contract_version` /
`event_version`, `command_fingerprint` / `fact_fingerprint`, any outbox field,
`local_day`, `confirmation_received_at`, or actor authority. Presence of any of
these is a contract violation and the command is rejected.

### 9.1 Command input matrix (top level)

| Field                        | Logical type                | Required                              | Origin          | Constraints, bounds and cross-field validation                                         |
| ---------------------------- | --------------------------- | ------------------------------------- | --------------- | -------------------------------------------------------------------------------------- |
| `command_version`            | Bounded integer             | Required                              | Client          | Must be `1`, else `PH_INVALID_COMMAND_VERSION`                                         |
| `ingestion_key`              | Constrained text (max 128)  | Required                              | Client          | Matches a frozen key form (§11); trimmed; must be consistent with `source`             |
| `source`                     | Constrained text            | Required                              | Client          | `plan_workout` \| `timer_session` \| `first_workout` \| `adhoc_workout`                |
| `occurred_at`                | UTC timestamp               | Required                              | Client-observed | New-write window rule of §5 and §9.2                                                   |
| `timezone`                   | Constrained text (max 64)   | Required                              | Client-observed | Valid IANA zone                                                                        |
| `timezone_source`            | Constrained text            | Required                              | Client          | `device` \| `user_setting` \| `assumed_utc`                                            |
| `completion_confirmed`       | Boolean                     | Required                              | Client          | Must be `true`; the explicit user-action signal (§9.2)                                 |
| `plan_provenance`            | Structured object (§9.3)    | Required when `source = plan_workout` | Client/trusted  | Forbidden when `source <> plan_workout`                                                |
| `workout_title`              | Constrained text (max 160)  | Required                              | Trusted state   | Non-empty, trimmed, neutral and non-translated                                         |
| `difficulty`                 | Constrained text            | Optional                              | Trusted state   | Canonical history value only (§5.1), else `PH_INVALID_DIFFICULTY`                      |
| `estimated_duration_seconds` | Bounded integer             | Optional                              | Trusted state   | `>= 0`, `<= 86400`; never substituted for the actual duration                          |
| `actual_duration_seconds`    | Bounded integer             | Optional                              | Client-observed | `>= 0`, `<= 86400`                                                                     |
| `calories`                   | Structured object (§9.4)    | Required                              | Trusted state   | Provenance rules of §5                                                                 |
| `exercises`                  | Ordered list (§9.5)         | Required                              | Client-observed | 1–60 items; `order_index` zero-based, contiguous, unique                               |
| `auxiliary_facts`            | Structured object           | Optional                              | Client-observed | `{ hydration[0..20] (§9.8), meal_adherence[0..12] (§9.9), daily_target[0..2] (§9.9) }` |
| `notes`                      | Constrained text (max 2000) | Optional                              | User-entered    | Trimmed                                                                                |
| `app_version`                | Constrained text (max 32)   | Required                              | Client          | Non-empty; non-semantic diagnostics, excluded from the fingerprint (§11.1)             |

**Nonzero-evidence rule.** The command must contain at least one exercise with
at least one completed set (§6.2). `completion_confirmed` alone can never
fabricate nonzero exercise evidence; a confirmed but empty command is rejected
with `PH_EMPTY_WORKOUT`. No arbitrary timer-duration threshold is used as a
substitute for evidence.

**Payload limits (frozen).** Total serialized command ≤ 256 KiB; ≤ 60
exercises; ≤ 100 sets per exercise; ≤ 2000 sets per command; ≤ 20 hydration
facts, ≤ 12 meal-adherence facts, ≤ 2 daily-target snapshots per command. A
command exceeding any limit is rejected with `PH_PAYLOAD_TOO_LARGE`. Unbounded
payloads are forbidden.

### 9.2 Confirmation, occurrence window and replay timing (frozen)

- The client supplies `completion_confirmed = true` as the explicit
  user-action signal. It supplies **no** confirmation timestamp;
  `confirmed_at` is removed from the command.
- The trusted server records the confirmation-received time from **its own
  clock** on the first accepted write, stored as the server-derived,
  write-once session field `confirmation_received_at` (UTC timestamp,
  required, server-generated). It is never client-supplied and never
  fingerprinted (§11.1).
- Confirmation is a signal of intent only; it cannot substitute for completed
  sets (§9.1 nonzero-evidence rule).
- **Occurrence-window validation applies only when creating a new session.**
  The `occurred_at` freshness rule of §5 is a new-write rule.
- Processing order for every ingestion call is fixed: (1) validate command
  shape and version; (2) look up `(user_id, ingestion_key)`; (3) if a row
  exists, verify ownership and compare `command_fingerprint`; (4) return
  `outcome = replayed` on equivalence, or `PH_INGESTION_KEY_CONFLICT` on
  divergence; (5) only when no row exists, apply the occurrence-window and
  remaining new-write validations.
- Consequently a valid replay of an already-persisted command still returns the
  existing session long after the original occurrence window has elapsed, and
  is never rejected merely because it is now old.

### 9.3 `plan_provenance` input matrix

| Field                | Logical type               | Required | Origin        | Constraints                                                       |
| -------------------- | -------------------------- | -------- | ------------- | ----------------------------------------------------------------- |
| `plan_id`            | UUID                       | Required | Trusted state | Stored as an immutable scalar; no FK                              |
| `planned_workout_id` | UUID                       | Required | Trusted state | Must be the workout referenced by the `planned-workout:` key form |
| `plan_name`          | Constrained text (max 160) | Optional | Trusted state | Trimmed neutral snapshot                                          |
| `week_number`        | Bounded integer            | Optional | Trusted state | `>= 1`, `<= 520`                                                  |
| `day_number`         | Bounded integer            | Optional | Trusted state | `>= 1`, `<= 7`                                                    |

Server-derived for this object: nothing. Forbidden: any row ID from
`workout_sessions`, any `user_id`.

### 9.4 `calories` input matrix

| Field                   | Logical type              | Required                           | Origin               | Constraints                                              |
| ----------------------- | ------------------------- | ---------------------------------- | -------------------- | -------------------------------------------------------- |
| `kcal`                  | Decimal(7,2)              | Required unless `source = unknown` | Derived/user-entered | `>= 0`, `<= 20000`                                       |
| `source`                | Constrained text          | Required                           | Trusted state        | `estimated` \| `measured` \| `user_entered` \| `unknown` |
| `algorithm_version`     | Constrained text (max 32) | Required when `source = estimated` | Trusted state        | Forbidden for any other source                           |
| `calculation_weight_kg` | Decimal(5,2)              | Required when `source = estimated` | Profile snapshot     | `> 0`, `<= 500`                                          |

Violations of these cross-field rules yield
`PH_INVALID_CALORIE_PROVENANCE`.

### 9.5 `exercises[]` input matrix

| Field                         | Logical type                | Required | Origin          | Constraints                                                                                        |
| ----------------------------- | --------------------------- | -------- | --------------- | -------------------------------------------------------------------------------------------------- |
| `order_index`                 | Bounded integer             | Required | Client-observed | Zero-based, contiguous from `0`, unique within the command                                         |
| `exercise_id`                 | Constrained text (max 64)   | Optional | Trusted state   | `^[A-Za-z0-9_.:-]{1,64}$`; identifies the exercise **performed**; omitted when none (§6.1)         |
| `exercise_key_snapshot`       | Constrained text (max 80)   | Required | Trusted state   | Non-empty neutral key of the performed exercise                                                    |
| `exercise_name_snapshot`      | Constrained text (max 160)  | Required | Trusted state   | Non-empty neutral name of the performed exercise; never a translated UI string                     |
| `substituted_for_exercise_id` | Constrained text (max 64)   | Optional | Trusted state   | Same pattern; the originally prescribed exercise; must differ from `exercise_id` when both present |
| `prescription_snapshot`       | Structured object (§9.6)    | Required | Trusted state   | Per §6.1.1                                                                                         |
| `status`                      | Constrained text            | Required | Client-observed | `completed` \| `partially_completed` \| `skipped`                                                  |
| `notes`                       | Constrained text (max 1000) | Optional | User-entered    | Trimmed                                                                                            |
| `sets`                        | Ordered list (§9.7)         | Required | Client-observed | 0–100 items; may be empty only when `status = skipped`                                             |

Server-derived for each stored exercise row: `id`, `session_id`, `user_id`,
`created_at`, `contract_version`. None of these may appear in the payload.

### 9.6 `exercises[].prescription_snapshot` input matrix

Exactly the field matrix of §6.1.1 (`version`, `planned_sets`, `reps_text`,
`rest_text`, `rest_seconds`, `tempo`, `focus_key`, `focus_text`,
`prescription_note`), all client/trusted-state supplied, with no server-derived
fields. The server canonicalizes and re-serializes the accepted object before
storage; the stored value is byte-identical to that canonical form. An invalid
object yields `PH_INVALID_PRESCRIPTION_SNAPSHOT`.

### 9.7 `exercises[].sets[]` input matrix

| Field              | Logical type     | Required | Origin          | Constraints                                                                                  |
| ------------------ | ---------------- | -------- | --------------- | -------------------------------------------------------------------------------------------- |
| `set_index`        | Bounded integer  | Required | Client-observed | Zero-based, contiguous from `0`, unique within its exercise                                  |
| `reps`             | Bounded integer  | Optional | Client-observed | `>= 0`, `<= 1000`                                                                            |
| `load_kg`          | Decimal(6,2)     | Optional | Client-observed | `>= 0`, `<= 1000`                                                                            |
| `assistance_level` | Constrained text | Optional | Client-observed | Frozen vocabulary of §6.2                                                                    |
| `duration_seconds` | Bounded integer  | Optional | Client-observed | `>= 0`, `<= 86400`                                                                           |
| `hold_seconds`     | Bounded integer  | Optional | Client-observed | `>= 0`, `<= 86400`                                                                           |
| `distance_m`       | Decimal(8,2)     | Optional | Client-observed | `>= 0`, `<= 100000`                                                                          |
| `rpe`              | Decimal(3,1)     | Optional | Client-observed | `>= 1.0`, `<= 10.0`                                                                          |
| `is_completed`     | Boolean          | Required | Client-observed | A completed set requires at least one nonzero performance measure (§6.2)                     |
| `performed_at`     | UTC timestamp    | Optional | Client-observed | Within the session's occurrence window; non-decreasing across `set_index` within an exercise |

Server-derived for each stored set row: `id`, `session_exercise_id`,
`user_id`, `created_at`, `contract_version`. Violations yield
`PH_INVALID_SET`.

### 9.8 `auxiliary_facts.hydration[]` input matrix

| Field            | Logical type               | Required                     | Origin          | Constraints                                                                       |
| ---------------- | -------------------------- | ---------------------------- | --------------- | --------------------------------------------------------------------------------- |
| `ingestion_key`  | Constrained text (max 128) | Required                     | Client          | Frozen hydration key form (§8.1); unique within the command                       |
| `kind`           | Constrained text           | Required                     | Client          | `entry` \| `void`                                                                 |
| `volume_ml`      | Bounded integer            | Required when `kind = entry` | Client-observed | `> 0`, `<= 10000`; forbidden when `kind = void`                                   |
| `target_fact_id` | UUID                       | Required when `kind = void`  | Client          | Must reference an existing same-user hydration `entry` row; forbidden for `entry` |
| `occurred_at`    | UTC timestamp              | Required                     | Client-observed | Session occurrence window rules of §8.1                                           |
| `timezone`       | Constrained text (max 64)  | Required                     | Client-observed | Valid IANA zone; stored as `occurred_timezone`                                    |
| `timezone_source` | Constrained text          | Required                     | Client-declared | `device` \| `user_setting` \| `assumed_utc`; stored as `occurred_timezone_source` |

`target_fact_id` is the single permitted client-supplied row identifier in the
whole command, because a void is meaningless without its target; the server
still verifies same-user ownership and rejects a cross-user target with
`PH_CROSS_USER_VIOLATION`. Server-derived: `id`, `user_id`, `local_day`,
`fact_fingerprint`, `created_at`, `contract_version`.

### 9.9 `auxiliary_facts.meal_adherence[]` and `auxiliary_facts.daily_target[]` input matrices

`meal_adherence[]`:

| Field           | Logical type               | Required | Origin          | Constraints                                                       |
| --------------- | -------------------------- | -------- | --------------- | ----------------------------------------------------------------- |
| `ingestion_key` | Constrained text (max 128) | Required | Client          | Frozen key form (§8.2); unique within the command                 |
| `meal_key`      | Constrained text (max 40)  | Required | Client-declared | Closed v1 enum of §8.2: `breakfast` \| `lunch` \| `dinner` \| `snack_1` \| `snack_2` \| `snack_3` |
| `adhered`       | Boolean                    | Required | Client-observed | —                                                                 |
| `occurred_at`   | UTC timestamp              | Required | Client-observed | Window rules of §8.2; normalized per §11                          |
| `timezone`      | Constrained text (max 64)  | Required | Client-observed | Valid IANA zone; stored as `occurred_timezone`                    |
| `timezone_source` | Constrained text         | Required | Client-declared | `device` \| `user_setting` \| `assumed_utc`; stored as `occurred_timezone_source` |

`daily_target[]`:

| Field                      | Logical type               | Required                            | Origin          | Constraints                                       |
| -------------------------- | -------------------------- | ----------------------------------- | --------------- | ------------------------------------------------- |
| `ingestion_key`            | Constrained text (max 128) | Required                            | Client          | Frozen key form (§8.3); unique within the command |
| `calorie_target_kcal`      | Decimal(7,2)               | Required                            | Trusted state   | `> 0`, `<= 20000`                                 |
| `target_source`            | Constrained text           | Required                            | Trusted state   | Frozen vocabulary of §8.3                         |
| `target_algorithm_version` | Constrained text (max 32)  | Required when the target is derived | Trusted state   | Forbidden otherwise                               |
| `calculation_weight_kg`    | Decimal(5,2)               | Optional                            | Trusted state   | `> 0`, `<= 500`                                   |
| `captured_at`              | UTC timestamp              | Required                            | Trusted state   | Within the session occurrence window              |
| `timezone`                 | Constrained text (max 64)  | Required                            | Client-observed | Valid IANA zone; stored as `captured_timezone`    |
| `timezone_source`          | Constrained text           | Required                            | Client-declared | `device` \| `user_setting` \| `assumed_utc`; stored as `captured_timezone_source` |

For both lists the server derives `id`, `user_id`, `local_day`,
`fact_fingerprint`, `created_at` and `contract_version`. Structural violations
yield `PH_INVALID_AUXILIARY_FACT`; a reused key with a different value yields
`PH_AUXILIARY_FACT_CONFLICT` (§11.3).

### 9.10 Result matrix

| Field                | Logical type     | Required | Meaning                                                                      |
| -------------------- | ---------------- | -------- | ---------------------------------------------------------------------------- |
| `result_version`     | Bounded integer  | Required | Currently `1`                                                                |
| `ok`                 | Boolean          | Required | Whether ingestion succeeded                                                  |
| `session_id`         | UUID             | Nullable | Canonical session; present when `ok`                                         |
| `ingestion_key`      | Constrained text | Nullable | Echo of the accepted key; present when `ok`                                  |
| `outcome`            | Constrained text | Nullable | `created` \| `replayed`; present when `ok`                                   |
| `dispatch_summary`   | List of objects  | Nullable | `[{ consumer, event_kind, state, created }]` per created/existing outbox row |
| `error_code`         | Constrained text | Nullable | Stable `PH_*` code; present when not `ok`                                    |
| `error_retryable`    | Boolean          | Nullable | Whether the caller may retry unchanged; present when not `ok`                |
| `error_display_safe` | Boolean          | Nullable | Whether the code may be localized and shown to the user                      |

The result never contains raw database errors, SQL text or stack traces.

---

## 10. Validation and error taxonomy

| Class                        | Code                                | Retryable | Client-display safe (after localization) |
| ---------------------------- | ----------------------------------- | --------- | ---------------------------------------- |
| Authentication / boundary    | `PH_UNAUTHENTICATED`                | No        | Yes                                      |
| Domain validation            | `PH_INVALID_COMMAND_VERSION`        | No        | Internal-only                            |
| Domain validation            | `PH_PAYLOAD_TOO_LARGE`              | No        | Yes                                      |
| Domain validation            | `PH_INVALID_INGESTION_KEY`          | No        | Internal-only                            |
| Idempotency conflict         | `PH_INGESTION_KEY_CONFLICT`         | No        | Yes                                      |
| Domain validation            | `PH_UNSUPPORTED_SOURCE`             | No        | Internal-only                            |
| Domain validation            | `PH_INVALID_OCCURRED_AT`            | No        | Yes                                      |
| Domain validation            | `PH_INVALID_TIMEZONE`               | No        | Yes                                      |
| Domain validation            | `PH_EMPTY_WORKOUT`                  | No        | Yes                                      |
| Domain validation            | `PH_COMPLETION_NOT_CONFIRMED`       | No        | Yes                                      |
| Domain validation            | `PH_INVALID_EXERCISE`               | No        | Yes                                      |
| Domain validation            | `PH_INVALID_SET`                    | No        | Yes                                      |
| Authorization / ownership    | `PH_CROSS_USER_VIOLATION`           | No        | Internal-only                            |
| Domain validation            | `PH_INVALID_CALORIE_PROVENANCE`     | No        | Internal-only                            |
| Domain validation            | `PH_INVALID_AUXILIARY_FACT`         | No        | Yes                                      |
| Domain validation            | `PH_INVALID_ADJUSTMENT`             | No        | Yes                                      |
| Idempotency / state conflict | `PH_ADJUSTMENT_CONFLICT`            | No        | Yes                                      |
| Domain validation            | `PH_INVALID_DIFFICULTY`             | No        | Internal-only                            |
| Domain validation            | `PH_INVALID_EXERCISE_IDENTITY`      | No        | Internal-only                            |
| Domain validation            | `PH_INVALID_PRESCRIPTION_SNAPSHOT`  | No        | Internal-only                            |
| Idempotency conflict         | `PH_AUXILIARY_FACT_CONFLICT`        | No        | Yes                                      |
| Idempotency / state conflict | `PH_ADJUSTMENT_KEY_CONFLICT`        | No        | Yes                                      |
| Data integrity               | `PH_ADJUSTMENT_CHAIN_CORRUPT`       | No        | Internal-only                            |
| Retryable downstream         | `PH_DISPATCH_SEMANTICS_UNSUPPORTED` | Yes       | Internal-only                            |
| Persistence                  | `PH_PERSISTENCE_FAILURE`            | Yes       | Yes (generic message)                    |
| Retryable downstream         | `PH_DISPATCH_DELIVERY_FAILURE`      | Yes       | Internal-only                            |
| Retryable downstream         | `PH_DISPATCH_CONSUMER_UNAVAILABLE`  | Yes       | Internal-only                            |

Disambiguation of the codes added by this revision:

| Code                                | Exactly one condition                                                                                                                                                                              |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PH_INVALID_DIFFICULTY`             | The command's `difficulty` is not one of the canonical history values, i.e. the coordinator failed to normalize it (§5.1).                                                                         |
| `PH_INVALID_EXERCISE_IDENTITY`      | An exercise identifier violates §6.1: bad pattern/length, equal performed and substituted identifiers, or a substitution without its own neutral snapshots.                                        |
| `PH_INVALID_PRESCRIPTION_SNAPSHOT`  | The `prescription_snapshot` object violates §6.1.1: unsupported `version`, missing required field, out-of-bounds value or oversized serialization.                                                 |
| `PH_INVALID_EXERCISE`               | An exercise row is invalid for a reason **other** than identity or prescription (ordering, status vocabulary, set-count bounds).                                                                   |
| `PH_AUXILIARY_FACT_CONFLICT`        | An auxiliary `ingestion_key` is reused with a different `fact_fingerprint` (§11.3).                                                                                                                |
| `PH_INVALID_AUXILIARY_FACT`         | An auxiliary fact is structurally invalid (bad kind/target/volume combination, bounds, unknown meal key) — not a key conflict.                                                                     |
| `PH_INGESTION_KEY_CONFLICT`         | A session `ingestion_key` is reused with a different session `command_fingerprint` (§11.1).                                                                                                        |
| `PH_ADJUSTMENT_KEY_CONFLICT`        | An `adjustment_key` is reused with a different adjustment `command_fingerprint` (§7.2).                                                                                                            |
| `PH_ADJUSTMENT_CONFLICT`            | The adjustment is structurally allowed but conflicts with existing graph state: the target already has a direct adjustment, or the proposed replacement session already serves another correction. |
| `PH_INVALID_ADJUSTMENT`             | The adjustment command is invalid on its own terms (unknown kind, missing target, cross-user target, target equal to replacement, missing replacement for a correction).                           |
| `PH_ADJUSTMENT_CHAIN_CORRUPT`       | Effective-session resolution detected a revisit, a missing replacement or the maximum chain depth (§14.4).                                                                                         |
| `PH_DISPATCH_SEMANTICS_UNSUPPORTED` | A consumer cannot yet apply the delivered void/correction semantics; the event stays durable and is never marked delivered (§12, §13).                                                             |

Rules:

- No two conditions share a code, and no code is reused with a second meaning.
- Downstream failure codes never surface in the ingestion result; ingestion
  succeeds once history and dispatch rows commit.
- Internal-only codes are logged server-side and mapped to a generic localized
  message for the user; client-display-safe codes may be localized and shown.
- Retryability is a property of the code, as tabulated above; only persistence
  and dispatch codes are retryable.
- Sensitive database errors and stack traces are never stored in user-visible
  result fields or in the outbox `last_error_summary` (which is sanitized to a
  bounded, code-plus-safe-text form).
- `PH_DISPATCH_SEMANTICS_UNSUPPORTED` is a delivery **failure**. It is never
  translated into a successful delivery or a no-op acknowledgement (§12).

---

## 11. Idempotency and replay contract

Canonical session uniqueness: **`(user_id, ingestion_key)`**.

Frozen key forms:

| Completion                        | Key form                                      |
| --------------------------------- | --------------------------------------------- |
| Plan-linked completion            | `planned-workout:{plannedWorkoutId}`          |
| Timer-only ad-hoc completion      | `timer:{stableUuid}`                          |
| First-workout / ad-hoc completion | `first-workout:{stableUuid}`                  |
| Correction replacement session    | `correction:{originalSessionId}:{stableUuid}` |

Rules:

- The same planned workout uses the same key regardless of which UI completed
  it.
- The stable UUID is generated once by the client at the moment the user
  confirms completion, persisted with the pending command, and reused across
  every retry of that same command.
- `source` is provenance only and is not part of uniqueness.
- **Replay:** same key + fingerprint-equivalent immutable command → return the
  original `session_id` with `outcome = replayed`; no new child rows, no new
  auxiliary facts, no new dispatch rows.
- **Conflict:** same key + materially different immutable payload →
  `PH_INGESTION_KEY_CONFLICT`; nothing is written and nothing is overwritten.
- `notes` and every other stored field are never overwritten during replay.

### 11.1 Session command fingerprint (frozen)

**Completeness rule.** `command_fingerprint` covers **every** client-supplied
or trusted-snapshot value whose change would alter a stored immutable
historical fact. Any such change must therefore produce
`PH_INGESTION_KEY_CONFLICT` and can never be accepted as a silent replay. The
earlier narrower definition, which excluded difficulty, duration, plan and
display snapshots, prescription snapshots, substitution identity, exercise and
set status, assistance, RPE, performed time, notes and auxiliary facts, is
withdrawn.

Included, in full:

| Group             | Fingerprinted values                                                                                                                                                                                                  |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Command identity  | `command_version`, `ingestion_key`, `source`                                                                                                                                                                          |
| Occurrence        | `occurred_at`, `timezone`, `timezone_source`, `completion_confirmed`                                                                                                                                                  |
| Plan provenance   | `plan_provenance.plan_id`, `.planned_workout_id`, `.plan_name`, `.week_number`, `.day_number`                                                                                                                         |
| Session snapshots | `workout_title`, `difficulty`, `estimated_duration_seconds`, `actual_duration_seconds`, `notes`                                                                                                                       |
| Calories          | `calories.kcal`, `.source`, `.algorithm_version`, `.calculation_weight_kg`                                                                                                                                            |
| Exercise identity | Per exercise: `order_index`, `exercise_id`, `exercise_key_snapshot`, `exercise_name_snapshot`, `substituted_for_exercise_id`, `status`, `notes`                                                                       |
| Prescription      | Per exercise: the full canonical `prescription_snapshot` serialization (§6.1.1)                                                                                                                                       |
| Set performance   | Per set: `set_index`, `reps`, `load_kg`, `assistance_level`, `duration_seconds`, `hold_seconds`, `distance_m`, `rpe`, `is_completed`, `performed_at`                                                                  |
| Auxiliary facts   | Per supplied fact, in every auxiliary list: its `ingestion_key`, its fact type, and its full canonical fact value (the same inputs as its `fact_fingerprint`, §11.3), including hydration `kind` and `target_fact_id` |

Excluded, exhaustively — and only because none of these is a client-authored
immutable historical fact:

- Server-generated row IDs (`id` of every table).
- Server-derived `user_id`.
- Database timestamps (`created_at`, `updated_at`).
- Server-generated `contract_version` and `event_version`.
- Pure transport metadata never persisted as a historical fact (request ID,
  trace headers, retry counters).
- The server-recorded confirmation-receipt time (`confirmation_received_at`,
  §9.2), because the server derives it from its own clock on the first accepted
  write.
- `app_version`, which is explicitly classified as **non-semantic
  diagnostics**: it is stored for support purposes only and a retry from an
  upgraded client must still replay rather than conflict.

**Canonicalization (frozen).**

| Concern         | Rule                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Encoding        | UTF-8 JSON, Unicode **NFC** normalization applied to every string before hashing                                                                                   |
| Object keys     | Sorted lexicographically ascending by code point; no insignificant whitespace                                                                                      |
| List order      | Exercises ordered by `order_index` ascending, sets by `set_index` ascending, auxiliary facts by their `ingestion_key` ascending                                    |
| Null vs omitted | An optional field that is absent and an optional field explicitly `null` canonicalize **identically** (both omitted), so transport-only differences never conflict |
| Decimals        | Fixed scale per the field's declared scale, plain decimal notation, no exponent, no trailing zero beyond the declared scale, `-0` forbidden                        |
| Integers        | Plain, no decimal point                                                                                                                                            |
| Timestamps      | UTC, ISO-8601 with `Z`, truncated to **second** precision — identical to the stored value (see the precision rule below)                                           |
| Local dates     | `YYYY-MM-DD`                                                                                                                                                       |
| Booleans        | `true` / `false` literals                                                                                                                                          |
| Text            | Trimmed of leading/trailing whitespace; interior whitespace preserved verbatim                                                                                     |
| Hash            | SHA-256, lowercase hex, 64 characters                                                                                                                              |

A materially changed immutable fact therefore always yields a different
fingerprint and `PH_INGESTION_KEY_CONFLICT`, never a silent replay.

### 11.2 Independent idempotency

- Auxiliary facts: `(user_id, ingestion_key)` per auxiliary table, combined
  with the independent `fact_fingerprint` comparison of §11.3.
- Adjustment commands: `(user_id, adjustment_key)` with an independent
  `command_fingerprint` (§7.2).
- Consumer idempotency (§13) is independent of ingestion idempotency: each
  consumer deduplicates on the delivered event identity.

### 11.3 Auxiliary-fact fingerprints and conflict detection (frozen)

Unique `(user_id, ingestion_key)` alone cannot detect a **reused key carrying a
different value**. Every auxiliary table therefore carries a required,
immutable `fact_fingerprint` (constrained text, 64 lowercase hex, SHA-256,
write-once, server-computed).

| Fact table               | Canonical fact-fingerprint inputs                                                                                                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `hydration_facts`        | `ingestion_key`, `kind`, `target_fact_id`, `volume_ml`, `occurred_at`, `occurred_timezone`, `occurred_timezone_source`, `local_day`      |
| `meal_adherence_facts`   | `ingestion_key`, `meal_key`, `adhered`, `occurred_at`, `occurred_timezone`, `occurred_timezone_source`, `local_day`                      |
| `daily_target_snapshots` | `ingestion_key`, `local_day`, `calorie_target_kcal`, `target_source`, `target_algorithm_version`, `calculation_weight_kg`, `captured_at` |

Canonicalization is exactly §11.1's.

Frozen resolution rules:

- Same key **+ equivalent** `fact_fingerprint` → idempotent replay: the
  existing row is returned, nothing is written, no error.
- Same key **+ different** `fact_fingerprint` → stable conflict
  `PH_AUXILIARY_FACT_CONFLICT` (§10). The whole ingestion transaction fails; no
  partial history is committed.
- A changed value is **never** silently skipped and never overwrites the stored
  fact.
- Auxiliary-fact conflicts are reported independently of
  `PH_INGESTION_KEY_CONFLICT` so the failing fact is diagnosable.

---

## 12. Durable dispatch / outbox contract

`public.history_dispatch_outbox` — mutable server-owned delivery state. It is
**not** canonical history and is never read by clients.

| Field                | Logical type               | Required | Source/owner     | Mutability              | Constraints and allowed values                                                                                | Purpose                   |
| -------------------- | -------------------------- | -------- | ---------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------- |
| `id`                 | UUID                       | Required | Server-generated | Write-once              | Primary key                                                                                                   | Row identity              |
| `user_id`            | UUID                       | Required | Server-derived   | Write-once              | FK `auth.users(id) ON DELETE CASCADE`                                                                         | Ownership/partitioning    |
| `session_id`         | UUID                       | Required | Server           | Write-once              | FK `(session_id, user_id) → workout_sessions(id, user_id)`                                                    | Canonical event subject   |
| `adjustment_id`      | UUID                       | Nullable | Server           | Write-once              | FK `(adjustment_id, user_id) → workout_session_adjustments(id, user_id)`; required for void/correction events | Correction subject        |
| `event_kind`         | Constrained text           | Required | Server           | Write-once              | `session_completed` \| `session_voided` \| `session_corrected`                                                | Delivered semantics       |
| `consumer`           | Constrained text           | Required | Server           | Write-once              | `training_plan_sync` \| `gamification` \| `goals`                                                             | Delivery target           |
| `state`              | Constrained text           | Required | Worker           | Mutable (state machine) | `pending` \| `processing` \| `retry_scheduled` \| `delivered` \| `dead_letter`                                | Delivery progress         |
| `attempt_count`      | Bounded integer            | Required | Worker           | Mutable                 | `>= 0`; incremented on each claim                                                                             | Retry accounting          |
| `next_attempt_at`    | UTC timestamp              | Required | Worker           | Mutable                 | Initially `created_at`                                                                                        | Backoff scheduling        |
| `leased_at`          | UTC timestamp              | Nullable | Worker           | Mutable                 | Set on claim, cleared on terminal state                                                                       | Lease start               |
| `lease_expires_at`   | UTC timestamp              | Nullable | Worker           | Mutable                 | `leased_at + lease duration` (frozen default 120 s)                                                           | Abandoned-worker recovery |
| `lease_owner`        | Constrained text (max 100) | Nullable | Worker           | Mutable                 | Worker instance identifier                                                                                    | Ownership of the claim    |
| `last_error_code`    | Constrained text (max 64)  | Nullable | Worker           | Mutable                 | Stable `PH_*` code                                                                                            | Diagnostics               |
| `last_error_summary` | Constrained text (max 500) | Nullable | Worker           | Mutable                 | Sanitized; no SQL, no stack traces, no PII beyond identifiers                                                 | Diagnostics               |
| `delivered_at`       | UTC timestamp              | Nullable | Worker           | Write-once on delivery  | Set only in `delivered`                                                                                       | Completion audit          |
| `created_at`         | UTC timestamp              | Required | Database clock   | Write-once              | Default now                                                                                                   | Audit                     |
| `updated_at`         | UTC timestamp              | Required | Worker/DB        | Mutable                 | Updated on every state change                                                                                 | Audit                     |
| `event_version`      | Bounded integer            | Required | Server           | Write-once              | Currently `1`                                                                                                 | Envelope evolution        |

**State machine.**

| From              | To                | Trigger                                                                                                      |
| ----------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| —                 | `pending`         | Row created atomically with the history event                                                                |
| `pending`         | `processing`      | Atomic worker claim (`next_attempt_at <= now`)                                                               |
| `retry_scheduled` | `processing`      | Atomic worker claim after backoff elapsed                                                                    |
| `processing`      | `delivered`       | Consumer applied, or idempotently confirmed it already applied, its **complete** semantic obligation (§13.4) |
| `processing`      | `retry_scheduled` | Retryable failure and `attempt_count < 10`                                                                   |
| `processing`      | `retry_scheduled` | `PH_DISPATCH_SEMANTICS_UNSUPPORTED`: the consumer cannot yet apply void/correction semantics                 |
| `processing`      | `dead_letter`     | Non-retryable failure, or `attempt_count >= 10`                                                              |
| `processing`      | `retry_scheduled` | Lease expiry recovery by a sweeper (abandoned worker)                                                        |
| `dead_letter`     | `pending`         | Explicit operator manual replay (resets lease, keeps counts)                                                 |

A row is **never** marked `delivered` merely because the consumer has no
implementation for its semantics; see §13.4.

Frozen operational rules:

- **Atomic claim:** a claim selects eligible rows (`state IN (pending,
retry_scheduled)` and `next_attempt_at <= now`), locks them skipping locked
  rows, and transitions them to `processing` with `leased_at`,
  `lease_expires_at` and `lease_owner` in the same statement.
- **Lease recovery:** rows in `processing` with `lease_expires_at < now` are
  returned to `retry_scheduled` by a sweeper; the attempt already counted is
  retained.
- **Attempt count** increments on each claim, not on each error.
- **Backoff** is owned by the outbox worker: exponential with jitter, base 30 s,
  factor 2, cap 1 h, maximum 10 attempts before `dead_letter`.
- **Dead-letter** rows are retained for operator inspection and manual replay;
  they are never deleted automatically.
- **Per-consumer independence:** one consumer failing never blocks another.
- **History is never deleted** because a delivery failed or dead-lettered.
- **No user access:** `anon` and `authenticated` receive no grants and no RLS
  policy on this table.

### 12.1 Duplicate protection under PostgreSQL null semantics (frozen)

The earlier single unique constraint `(session_id, event_kind, consumer,
adjustment_id)` is **withdrawn**: under ordinary PostgreSQL unique-null
semantics two null `adjustment_id` rows are never equal, so it would not
prevent duplicate completion deliveries. It is replaced by two **partial
unique constraints**:

| Event class       | Uniqueness                                                                       |
| ----------------- | -------------------------------------------------------------------------------- |
| Completion events | Unique `(session_id, event_kind, consumer)` where `adjustment_id IS NULL`        |
| Adjustment events | Unique `(adjustment_id, event_kind, consumer)` where `adjustment_id IS NOT NULL` |

Guarantees: at most one completion delivery per session/event/consumer, and at
most one adjustment delivery per adjustment/event/consumer. Both hold without
relying on null comparison.

Subject resolution, frozen exactly:

| `event_kind`        | `session_id` is…                                                                  | `adjustment_id`              |
| ------------------- | --------------------------------------------------------------------------------- | ---------------------------- |
| `session_completed` | the completed session                                                             | **forbidden** (must be null) |
| `session_voided`    | the target / original session                                                     | **mandatory**                |
| `session_corrected` | the target / original session; the replacement is resolved through the adjustment | **mandatory**                |

**Plan synchronization.** A `training_plan_sync` row is created only when the
subject session carries a non-null `source_planned_workout_id`. When it is
null, no row is created and the plan-sync outcome is the deterministic
not-applicable state (recorded implicitly by the absence of the row, which the
`dispatch_summary` reports as absent). The worker calls `TrainingPlanService`
and never writes plan tables directly.

**Gamification and Goals** rows are always created for every
`session_completed`, `session_voided` and `session_corrected` event. Consumers
keep their domain ownership; Progress History computes no rewards or goal
progress.

No worker implementation is produced in this sprint.

---

## 13. Downstream consumer contracts

**Minimum stable event envelope** delivered to every consumer:

| Field                       | Logical type     | Required | Notes                                                          |
| --------------------------- | ---------------- | -------- | -------------------------------------------------------------- |
| `event_id`                  | UUID             | Required | The outbox row `id`                                            |
| `event_kind`                | Constrained text | Required | `session_completed` \| `session_voided` \| `session_corrected` |
| `event_version`             | Bounded integer  | Required | Currently `1`                                                  |
| `user_id`                   | UUID             | Required | Server-derived owner                                           |
| `session_id`                | UUID             | Required | Canonical session                                              |
| `adjustment_id`             | UUID             | Nullable | Present for void/correction                                    |
| `occurred_at`               | UTC timestamp    | Required | Historical event instant (not delivery time)                   |
| `local_day`                 | Local date       | Required | Historical calendar day                                        |
| `dedup_key`                 | Constrained text | Required | `{consumer}:{event_kind}:{session_id}:{adjustment_id\|none}`   |
| `source`                    | Constrained text | Required | Immutable provenance                                           |
| `source_planned_workout_id` | UUID             | Nullable | Immutable provenance, plan-linked events only                  |
| `replacement_session_id`    | UUID             | Nullable | Correction events only                                         |

The envelope carries immutable facts only. Mutable reward calculations (XP
amounts, goal increments, level deltas) are never copied into the outbox.

### Training-plan synchronization

- Only `TrainingPlanService` writes plan runtime (ADR 0002, I10).
- Plan-linked completion targets `source_planned_workout_id`.
- Replays deliver no new event, so a plan workout can never be completed twice.
- Ad-hoc workouts (`timer_session`, `first_workout`, `adhoc_workout`) create no
  plan-sync work and never mutate unrelated plan runtime.

### Gamification

- Delivery goes through the existing `GamificationOrchestrator` (ADR 0004).
- Progress History supplies facts, never XP amounts.
- `xp_history` remains a downstream ledger; ADR 0005 recommends future
  insert-only database enforcement.
- `session_completed`, `session_voided` and `session_corrected` handling must
  be idempotent on `dedup_key`.

### Goals

- Delivery goes through the Goals-owned service boundary
  (`GoalTrackingService`).
- Progress History supplies facts, never goal increments.
- `goal_progress_events` remains mutable operational state under its existing
  retry contract; further hardening is outside ADR 0005.

### 13.4 Delivery-completeness rule (frozen)

The earlier allowance for consumers to acknowledge void and correction events
as no-ops "until reversal ships" is **withdrawn**: it would discard the durable
obligation to reverse or recompute downstream projections.

- An outbox row may become `delivered` **only** after the consumer has applied,
  or idempotently confirmed it already applied, its **complete** semantic
  obligation for that event.
- A consumer that cannot yet apply void or correction semantics must fail the
  delivery with `PH_DISPATCH_SEMANTICS_UNSUPPORTED`. The row stays in
  `retry_scheduled` and, after the bounded attempt budget, moves to
  `dead_letter`.
- The outbox row itself is the durable recovery record; it is retained and
  never deleted while the obligation is outstanding.
- A no-op acknowledgement is valid **only** when the consumer can prove the
  event has no applicable domain consequence for it (for example a goal that
  never counted the voided session). "Handling is not implemented yet" is never
  such a proof.
- **Implementation dependency.** Consumer support for void and correction must
  ship **before** the product enables user-facing void/correction actions.
  History storage and the adjustment RPC may exist earlier, but no correction
  event may be silently lost.
- When consumer support ships, retained `dead_letter` and pending rows are
  reprocessed through operator manual replay, so no obligation is skipped.
- No history write is ever skipped, delayed or rolled back because of this
  dependency, and Progress History still never edits Gamification or Goals
  directly.

---

## 14. Read models, ordering and pagination

Every read model below specifies its authoritative tables, exact output fields,
adjustment behaviour, ordering, pagination or bounded-window rule, localization
fallback, empty state and implementation phase. No read model reads
`planned_workouts`, `src/lib/store.ts` or current mutable profile values (I15).

| Read model                       | Consumer/screen                   | Authoritative sources                                                       | Adjustment behaviour                                              | Ordering                                          | Pagination                     | Localization fallback                            | Empty state                     | Phase |
| -------------------------------- | --------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------- | ------------------------------ | ------------------------------------------------ | ------------------------------- | ----- |
| Workout history timeline item    | History list (`/progresso`)       | `workout_sessions`, `workout_session_adjustments`                           | Voided excluded; corrected replaced by replacement session        | `occurred_at DESC, id DESC`                       | Keyset on `(occurred_at, id)`  | Current catalog label, else neutral snapshot     | Neutral "no workouts yet" state | 8.3   |
| Workout history session detail   | Session detail view               | `workout_sessions`, `..._exercises`, `..._sets`, `..._adjustments`          | Shows effective session; original remains readable for audit      | Exercises `order_index ASC`, sets `set_index ASC` | None (bounded children)        | Per exercise, catalog label else snapshot        | Not reachable when no session   | 8.3   |
| Weekly progress summary          | Weekly Report (`/relatorio`)      | `workout_sessions`, `..._sets`, `..._adjustments`, `daily_target_snapshots` | Voided excluded from totals; corrections counted once (effective) | Weeks descending by week start                    | Bounded window (last 12 weeks) | Not applicable (aggregates)                      | Zeroed KPIs with neutral copy   | 8.3   |
| Effective-session resolution     | Shared projection for all readers | `workout_sessions`, `workout_session_adjustments`                           | Follows `correction` chain; excludes terminal `void`              | Deterministic by chain                            | Not paginated                  | Not applicable                                   | Not applicable                  | 8.3   |
| Auxiliary daily progress summary | Diet/diary daily and weekly views | `hydration_facts`, `meal_adherence_facts`, `daily_target_snapshots`         | Hydration voids applied; latest meal observation wins             | `local_day DESC`                                  | Keyset on `local_day`          | `meal_key` resolved to localized label at render | Zeroed daily totals             | 8.3   |

### 14.1 Workout history timeline item — output matrix

Authoritative tables: `public.workout_sessions`,
`public.workout_session_adjustments`.

| Output field                 | Logical type         | Nullable | Derivation                                                                                 |
| ---------------------------- | -------------------- | -------- | ------------------------------------------------------------------------------------------ |
| `session_id`                 | UUID                 | No       | Effective session ID from §14.4                                                            |
| `root_session_id`            | UUID                 | No       | Root of the correction chain; equals `session_id` when never corrected                     |
| `is_corrected_result`        | Boolean              | No       | `true` when `session_id <> root_session_id`                                                |
| `occurred_at`                | UTC timestamp        | No       | Effective session `occurred_at`                                                            |
| `local_day`                  | Local date           | No       | Effective session `local_day` (never recomputed)                                           |
| `occurred_timezone`          | Constrained text     | No       | Effective session `occurred_timezone`                                                      |
| `source`                     | Constrained text     | No       | Effective session `source`                                                                 |
| `workout_title_snapshot`     | Constrained text     | No       | Stable title snapshot; never re-resolved                                                   |
| `plan_name_snapshot`         | Constrained text     | Yes      | Immutable plan-name snapshot                                                               |
| `week_number_snapshot`       | Bounded integer      | Yes      | Immutable plan position                                                                    |
| `day_number_snapshot`        | Bounded integer      | Yes      | Immutable plan position                                                                    |
| `difficulty_snapshot`        | Constrained text     | Yes      | Canonical history value (`beginner`/`intermediate`/`advanced`), never re-derived           |
| `exercise_summary`           | Ordered list of text | No       | Up to 3 display labels resolved per §14.6, then `+N` overflow count                        |
| `exercise_count`             | Bounded integer      | No       | Count of exercise rows on the effective session                                            |
| `completed_set_count`        | Bounded integer      | No       | Count of sets meeting the completed-set rule (§6.2)                                        |
| `actual_duration_seconds`    | Bounded integer      | Yes      | Measured duration only; never filled from the estimate                                     |
| `estimated_duration_seconds` | Bounded integer      | Yes      | Prescribed duration, exposed as a **separate** field                                       |
| `calories_kcal`              | Decimal(7,2)         | Yes      | Stored value                                                                               |
| `calories_source`            | Constrained text     | No       | Stored provenance; UI must label estimates as estimates                                    |
| `calorie_algorithm_version`  | Constrained text     | Yes      | Stored value when estimated                                                                |
| `adjustment_state`           | Constrained text     | No       | `none` \| `corrected` (effective replacement shown); voided sessions are excluded entirely |
| `cursor_occurred_at`         | UTC timestamp        | No       | Cursor component (equals `occurred_at`)                                                    |
| `cursor_id`                  | UUID                 | No       | Cursor component (equals `session_id`)                                                     |
| `cursor`                     | Constrained text     | No       | Opaque `v1:`-prefixed encoding of `(cursor_occurred_at, cursor_id)`                        |

Page sizes (frozen): default **20** items, maximum **50** items. A requested
size above the maximum is clamped, not rejected.

### 14.2 Workout session detail — output matrix

Authoritative tables: `public.workout_sessions`,
`public.workout_session_exercises`, `public.workout_session_sets`,
`public.workout_session_adjustments`.

Session level:

| Output field                                                                                                                                                        | Derivation                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `session_id`, `root_session_id`, `occurred_at`, `local_day`, `occurred_timezone`, `occurred_timezone_source`, `source`                                              | Effective session columns                                                                                                                     |
| `source_plan_id`, `source_planned_workout_id`, `plan_name_snapshot`, `week_number_snapshot`, `day_number_snapshot`, `workout_title_snapshot`, `difficulty_snapshot` | Immutable provenance/snapshot scalars                                                                                                         |
| `actual_duration_seconds`, `estimated_duration_seconds`                                                                                                             | Reported separately; never substituted for one another                                                                                        |
| `calories_kcal`, `calories_source`, `calorie_algorithm_version`, `calculation_weight_kg`                                                                            | Calorie provenance block                                                                                                                      |
| `notes`                                                                                                                                                             | Stored user note                                                                                                                              |
| `effective_state`                                                                                                                                                   | `effective` \| `voided` \| `superseded` (§14.4)                                                                                               |
| `adjustment_audit`                                                                                                                                                  | `{ adjustment_id, kind, reason_code, reason_text, occurred_at, actor_type, target_session_id, replacement_session_id }` when an adjustment targets this session |
| `chain_depth`                                                                                                                                                       | Number of correction links traversed from the root                                                                                            |

Exercise level (ordered by `order_index ASC`):

| Output field                                                   | Derivation                                                                                          |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `session_exercise_id`, `order_index`, `status`, `notes`        | Stored columns                                                                                      |
| `exercise_id`                                                  | Stable text catalog identifier of the exercise actually performed, or null                          |
| `display_label`                                                | Resolved per §14.6                                                                                  |
| `exercise_key_snapshot`, `exercise_name_snapshot`              | Neutral stored identity/fallback                                                                    |
| `substituted_for_exercise_id`, `substituted_for_display_label` | Original prescribed identity, rendered only inside an explicit "substituted for" affordance (§14.6) |
| `prescription_snapshot`                                        | Full versioned structured object (§6.1.1), never merged with actual performance                     |
| `sets`                                                         | Ordered set list below                                                                              |

Set level (ordered by `set_index ASC`):
`set_id`, `set_index`, `reps`, `load_kg`, `assistance_level`,
`duration_seconds`, `hold_seconds`, `distance_m`, `rpe`, `is_completed`,
`performed_at` — all stored actual-performance values, never derived from the
prescription snapshot.

Bounded by construction (≤ 60 exercises, ≤ 100 sets each); no pagination.
Empty state is unreachable: a session always has at least one completed set.

### 14.3 Weekly progress summary — output matrix and formulas

Authoritative tables: `public.workout_sessions`, `public.workout_session_sets`,
`public.workout_session_adjustments`, `public.daily_target_snapshots`.

Eligible population per week: effective sessions (§14.4) whose `local_day`
falls in the Monday–Sunday week window; voided sessions and superseded
originals are excluded entirely.

| Output field                       | Logical type    | Exact formula                                                                                                                                                                     |
| ---------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `week_start_local_day`             | Local date      | Monday of the week (§14.7)                                                                                                                                                        |
| `week_end_local_day`               | Local date      | Sunday of the same week                                                                                                                                                           |
| `effective_workout_count`          | Integer         | Count of eligible effective sessions                                                                                                                                              |
| `active_local_day_count`           | Integer         | Count of distinct `local_day` values among eligible sessions                                                                                                                      |
| `actual_duration_seconds_total`    | Integer         | Sum of `actual_duration_seconds` over eligible sessions, treating null as 0                                                                                                       |
| `actual_duration_sessions_counted` | Integer         | Count of eligible sessions with non-null `actual_duration_seconds` (honesty denominator)                                                                                          |
| `estimated_duration_seconds_total` | Integer         | Sum of `estimated_duration_seconds`, reported **separately**; never substituted for the actual total                                                                              |
| `completed_set_count`              | Integer         | Count of sets of eligible sessions satisfying the completed-set rule (§6.2)                                                                                                       |
| `total_reps`                       | Integer         | Sum of `reps` over completed sets where `reps` is non-null                                                                                                                        |
| `reps_sets_counted`                | Integer         | Count of completed sets contributing to `total_reps`                                                                                                                              |
| `timed_duration_seconds_total`     | Integer         | Sum of `duration_seconds` over completed sets where non-null                                                                                                                      |
| `hold_seconds_total`               | Integer         | Sum of `hold_seconds` over completed sets where non-null                                                                                                                          |
| `distance_m_total`                 | Decimal(10,2)   | Sum of `distance_m` over completed sets where non-null                                                                                                                            |
| `calories_measured_total`          | Decimal(9,2)    | Sum of `calories_kcal` where `calories_source = 'measured'`                                                                                                                       |
| `calories_user_entered_total`      | Decimal(9,2)    | Sum of `calories_kcal` where `calories_source = 'user_entered'`                                                                                                                   |
| `calories_estimated_total`         | Decimal(9,2)    | Sum of `calories_kcal` where `calories_source = 'estimated'`                                                                                                                      |
| `calories_unknown_session_count`   | Integer         | Count of eligible sessions with `calories_source = 'unknown'`                                                                                                                     |
| `active_day_streak_days`           | Integer         | Longest run of consecutive `local_day` values with ≥ 1 eligible session, computed strictly inside this week window                                                                |
| `applicable_daily_targets`         | List of objects | Per `local_day` in the window, the applicable `daily_target_snapshots` row selected by §8.3 ordering, exposing `calorie_target_kcal`, `target_source`, `target_algorithm_version` |

Frozen aggregate rules:

- The undefined term "volume" is not used by this model. Repetitions, timed
  seconds, hold seconds and distance are reported as separate totals because
  they are not commensurable.
- Estimated and measured calories are never summed into one number.
- Estimated duration is never used to fill a missing actual duration.
- Null measurements contribute 0 to a sum but are excluded from their
  `*_counted` denominator, so partial data is never presented as complete.
- Any streak longer than the current week window is not exposed by this model.

Bounded window: the last 12 weeks, ordered by `week_start_local_day DESC`. No
offset pagination. Empty state returns every numeric field as `0`, every list
empty, and `applicable_daily_targets` empty.

### 14.4 Effective-session resolution — output matrix

Authoritative tables: `public.workout_sessions`,
`public.workout_session_adjustments`.

Definitions:

- **Root session** — a session that is not the `replacement_session_id` of any
  correction.
- **Direct adjustment** — the at-most-one adjustment whose
  `target_session_id` is the session (unique constraint, §15).
- **Traversal** — from any session, follow `correction` links through
  `replacement_session_id` until a session with no direct adjustment (the
  effective session) or a `void` adjustment (the chain is voided) is reached.

| Output field           | Logical type     | Meaning                                                                                               |
| ---------------------- | ---------------- | ----------------------------------------------------------------------------------------------------- |
| `root_session_id`      | UUID             | Chain root                                                                                            |
| `effective_session_id` | UUID             | Terminal non-voided session; null when the chain terminates in a `void`                               |
| `state`                | Constrained text | `effective` \| `voided` \| `chain_error`                                                              |
| `chain_depth`          | Integer          | Number of correction links traversed (0 for an unadjusted session)                                    |
| `chain_session_ids`    | Ordered list     | Root → terminal session IDs, for audit views only                                                     |
| `terminal_adjustment`  | Object           | `{ adjustment_id, kind, reason_code, reason_text, occurred_at, actor_type }` when the chain terminates in an adjustment |
| `integrity_error_code` | Constrained text | Null, or `PH_ADJUSTMENT_CHAIN_CORRUPT` when `state = 'chain_error'`                                   |

Cycle, corruption and bound handling (frozen):

- Uniqueness on `(target_session_id)` and on non-null
  `(replacement_session_id)` makes branching, merging and cycles impossible by
  construction (§15).
- Should traversal nevertheless revisit a session, exceed the frozen maximum
  depth of **32** links, or find a correction whose replacement is missing,
  resolution returns `state = 'chain_error'`,
  `integrity_error_code = PH_ADJUSTMENT_CHAIN_CORRUPT`, and
  `effective_session_id = null`.
- A `chain_error` result is **never** returned as ordinary valid data. The
  timeline and weekly summary exclude it from totals and surface it as a
  neutral integrity notice; the detail view shows the audit chain read-only.
  No potentially incorrect session is silently presented as the effective one.

### 14.5 Auxiliary daily progress summary — output matrix

Authoritative tables: `public.hydration_facts`,
`public.meal_adherence_facts`, `public.daily_target_snapshots`.

| Output field                   | Logical type     | Derivation                                                                                                                       |
| ------------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `local_day`                    | Local date       | Grouping key; the historical local calendar day captured at ingestion, never recomputed for the current timezone                 |
| `timezone_note`                | Constrained text | The `occurred_timezone` of the day's first effective hydration/meal fact, exposed so the UI can explain travel days              |
| `hydration_total_ml`           | Integer          | Sum of `volume_ml` over rows with `kind = 'entry'` that are **not** targeted by any `kind = 'void'` row of the same user         |
| `hydration_entry_count`        | Integer          | Count of those same effective entry rows                                                                                         |
| `hydration_voided_entry_count` | Integer          | Count of `entry` rows targeted by a void, exposed for transparency and never subtracted twice                                    |
| `meal_adherence`               | List of objects  | One entry per `meal_key` observed that day: `{ meal_key, adhered, observed_at }`, using the §8.2 latest-observation rule         |
| `meals_adhered_count`          | Integer          | Count of effective meal observations with `adhered = true`                                                                       |
| `meals_observed_count`         | Integer          | Count of effective meal observations                                                                                             |
| `applicable_daily_target`      | Object           | The §8.3 applicable snapshot: `{ calorie_target_kcal, target_source, target_algorithm_version, calculation_weight_kg }`, or null |

Void rows never contribute a volume, positive or negative; they only remove
their target entry from the effective set. Ordering is `local_day DESC`,
keyset on `local_day` with a bounded maximum window of 92 days per request.
Empty state returns `hydration_total_ml = 0`, all counts `0`, `meal_adherence`
empty and `applicable_daily_target = null`.

### 14.6 Exercise label resolution (frozen)

- If `exercise_id` is non-null and resolves in the current catalog, display the
  current localized catalog label for that identifier.
- Otherwise display `exercise_name_snapshot` verbatim.
- `substituted_for_exercise_id` is resolved **only** for the explicit
  "substituted for X" affordance. A read model must never resolve the original
  prescribed exercise's localized label and present it as the performed
  exercise. When only `substituted_for_exercise_id` resolves and `exercise_id`
  is null, the performed exercise is displayed from
  `exercise_name_snapshot`.

**Timeline pagination (frozen).**

- Ordering: `occurred_at DESC, id DESC`.
- Cursor: the tuple `(occurred_at, id)` of the last returned row.
- Next-page predicate: `occurred_at < cursor.occurred_at OR (occurred_at =
cursor.occurred_at AND id < cursor.id)`.
- `OFFSET` is never used.
- The cursor is exposed as a stable opaque string with a version prefix
  (`v1:` followed by the encoded tuple); a cursor with an unknown version is
  rejected and the client restarts from the first page.
- Ties are broken exclusively by `id`.
- Default page size 20, maximum 50.

**Canonical-source rule.** After cutover, Progress, History and Weekly Report
read canonical Progress History data only. They never reconstruct completed
history from `planned_workouts`, `src/lib/store.ts` or current mutable profile
values (I15).

**Adjustment and provenance rules for all read models.**

- Voided sessions are excluded from ordinary totals and reward-relevant
  projections.
- Corrected sessions are replaced by their replacement session; one logical
  completion is counted once.
- Original rows are preserved and remain available for audit views.
- Exercise labels follow §14.6.
- Calories and derived metrics use the captured historical inputs
  (`calculation_weight_kg`, `calorie_algorithm_version`), never current profile
  values.
- Difficulty is displayed from the canonical stored snapshot, localized at
  render; the stored value never changes when the user's profile or locale
  changes (§5.1).

### 14.7 Week boundary

**Week boundary (frozen).** Repository evidence is mixed across existing
prototype surfaces, so this contract selects one deterministic rule: a
reporting week starts on **Monday** and ends on Sunday, computed on
`local_day` (the historical local calendar day), not on UTC. Justification:
the product's primary locale set (pt-BR, en, it, es, fr) uses Monday-first
calendars, training plans are already structured in Monday-anchored weeks
(`training_weeks.week_number` with day 1 as the first training day), and using
`local_day` keeps historical weeks stable under timezone travel (I13).

---

## 15. Constraints and index contract

### `public.workout_sessions`

| Object                                                        | Type   | Purpose / query contract                                                 |
| ------------------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| `(user_id, ingestion_key)`                                    | Unique | Canonical idempotency (I2, §11)                                          |
| `(id, user_id)`                                               | Unique | Composite-ownership target for children and outbox                       |
| `(user_id, occurred_at DESC, id DESC)`                        | Index  | Timeline keyset pagination (§14)                                         |
| `(user_id, local_day)`                                        | Index  | Daily/weekly grouping for Weekly Report                                  |
| `(user_id, source_planned_workout_id)` partial where not null | Index  | Plan-sync lookup and duplicate-completion checks                         |
| `user_id`                                                     | Index  | RLS ownership path (leading column of the timeline index satisfies this) |

### `public.workout_session_exercises`

| Object                                                  | Type        | Purpose / query contract                                         |
| ------------------------------------------------------- | ----------- | ---------------------------------------------------------------- |
| `(session_id, user_id) → workout_sessions(id, user_id)` | Foreign key | Same-user parent relationship                                    |
| `(id, user_id)`                                         | Unique      | Composite-ownership target for sets                              |
| `(session_id, order_index)`                             | Unique      | Deterministic ordering, no duplicate positions                   |
| `(session_id, user_id)`                                 | Index       | Composite-FK referential lookup; session-detail fetch            |
| `(user_id)`                                             | Index       | RLS ownership path and `auth.users` cascade                      |
| `(user_id, exercise_id)` partial where not null         | Index       | Per-exercise history read model (§14 detail/aggregate); text key |

No further exercise indexes are added; speculative indexes without a defined
query consumer are forbidden.

### `public.workout_session_sets`

| Object                                                                    | Type        | Purpose / query contract                      |
| ------------------------------------------------------------------------- | ----------- | --------------------------------------------- |
| `(session_exercise_id, user_id) → workout_session_exercises(id, user_id)` | Foreign key | Same-user parent relationship                 |
| `(session_exercise_id, set_index)`                                        | Unique      | Deterministic set ordering                    |
| `(session_exercise_id, user_id)`                                          | Index       | Composite-FK referential lookup; detail fetch |
| `(user_id)`                                                               | Index       | RLS ownership path and `auth.users` cascade   |

### `public.workout_session_adjustments`

| Object                                                              | Type        | Purpose / query contract                                       |
| ------------------------------------------------------------------- | ----------- | -------------------------------------------------------------- |
| `(target_session_id, user_id) → workout_sessions(id, user_id)`      | Foreign key | Same-user target                                               |
| `(replacement_session_id, user_id) → workout_sessions(id, user_id)` | Foreign key | Same-user replacement                                          |
| `(id, user_id)`                                                     | Unique      | Composite-ownership target for outbox rows                     |
| `(user_id, adjustment_key)`                                         | Unique      | Adjustment-command idempotency (§7.2)                          |
| `(target_session_id)`                                               | Unique      | At most one direct adjustment per session (§7 determinism)     |
| `(replacement_session_id)` partial where not null                   | Unique      | A replacement session may serve at most one correction (§7.2)  |
| `(target_session_id, user_id)`                                      | Index       | Composite-FK referential lookup and same-user chain resolution |
| `(replacement_session_id, user_id)` partial where not null          | Index       | Composite-FK referential lookup and reverse chain resolution   |
| `(user_id, occurred_at DESC, id DESC)`                              | Index       | Audit timeline ordering; also satisfies the RLS `user_id` path |

The unique constraint on `(replacement_session_id)` (non-null rows only)
replaces the previous non-unique lookup index. It is what makes correction
chains a forest of simple paths: a replacement session cannot be shared by two
corrections, so no branching or merging is possible.

### `public.history_dispatch_outbox`

| Object                                                                                | Type        | Purpose / query contract                                       |
| ------------------------------------------------------------------------------------- | ----------- | -------------------------------------------------------------- |
| `(session_id, event_kind, consumer)` partial where `adjustment_id IS NULL`            | Unique      | One completion delivery per session/event/consumer (§12.1)     |
| `(adjustment_id, event_kind, consumer)` partial where `adjustment_id IS NOT NULL`     | Unique      | One adjustment delivery per adjustment/event/consumer (§12.1)  |
| `(state, next_attempt_at, id)` partial where `state IN ('pending','retry_scheduled')` | Index       | Worker claim scan                                              |
| `(lease_expires_at)` partial where `state = 'processing'`                             | Index       | Lease-expiry sweeper                                           |
| `(session_id, user_id) → workout_sessions(id, user_id)`                               | Foreign key | Composite ownership to the subject session                     |
| `(adjustment_id, user_id) → workout_session_adjustments(id, user_id)`                 | Foreign key | Composite ownership for adjustment events                      |
| `user_id → auth.users(id) ON DELETE CASCADE`                                          | Foreign key | Ownership / account-deletion cascade                           |
| `(user_id)`                                                                           | Index       | FK deletion performance, account-deletion cascade, diagnostics |
| `(session_id, user_id)`                                                               | Index       | Composite-FK referential lookup; per-session dispatch review   |
| `(adjustment_id, user_id)` partial where not null                                     | Index       | Composite-FK referential lookup for adjustment events          |
| `(state, updated_at)` partial where `state = 'dead_letter'`                           | Index       | Operator dead-letter review                                    |
| `(state, delivered_at)` partial where `state = 'delivered'`                           | Index       | 90-day retention maintenance boundary (§17)                    |

The `(user_id)` index is **required** even though authenticated users never
query this table: PostgreSQL does not index the referencing side of
`user_id → auth.users(id)` automatically, and an account deletion would
otherwise force a sequential scan of the whole outbox. The earlier claim that no
`user_id` index was required is withdrawn.

### Auxiliary facts

| Table                    | Object                                                      | Type        | Purpose / query contract                                         |
| ------------------------ | ----------------------------------------------------------- | ----------- | ---------------------------------------------------------------- |
| `hydration_facts`        | `(user_id, ingestion_key)`                                  | Unique      | Per-user idempotency                                             |
| `hydration_facts`        | `(user_id, local_day, kind, id)`                            | Index       | Effective-hydration totals after voids (§14.5)                   |
| `hydration_facts`        | `(target_fact_id, user_id)` partial where not null          | Unique      | Composite-FK lookup and at most one direct void per entry (§8.1) |
| `hydration_facts`        | `(target_fact_id, user_id) → hydration_facts(id, user_id)`  | Foreign key | Same-user self-referential void target                           |
| `hydration_facts`        | `(id, user_id)`                                             | Unique      | Composite-ownership target for void events                       |
| `meal_adherence_facts`   | `(user_id, ingestion_key)`                                  | Unique      | Per-user idempotency                                             |
| `meal_adherence_facts`   | `(user_id, local_day, meal_key, occurred_at DESC, id DESC)` | Index       | Deterministic latest-observation selection (§8.2)                |
| `daily_target_snapshots` | `(user_id, ingestion_key)`                                  | Unique      | Per-user idempotency                                             |
| `daily_target_snapshots` | `(user_id, local_day, captured_at DESC, id DESC)`           | Index       | Deterministic applicable-snapshot selection (§8.3)               |
| All three                | `user_id`                                                   | Index       | RLS ownership path (satisfied by the leading column above)       |
| All three                | `user_id → auth.users(id) ON DELETE CASCADE`                | Foreign key | Ownership / account-deletion cascade (indexed as above)          |

`fact_fingerprint` is deliberately **not** indexed: it is only ever read after a
row has already been located through `(user_id, ingestion_key)` (§11.3).

### Composite foreign-key index review (frozen)

| Referencing side                          | Composite FK group                  | Index that satisfies referential lookup     | Justification                                                                                                           |
| ----------------------------------------- | ----------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `workout_session_exercises`               | `(session_id, user_id)`             | `(session_id, user_id)`                     | Full composite group indexed with the group's leading column first.                                                     |
| `workout_session_sets`                    | `(session_exercise_id, user_id)`    | `(session_exercise_id, user_id)`            | Full composite group indexed.                                                                                           |
| `workout_session_adjustments` target      | `(target_session_id, user_id)`      | `(target_session_id, user_id)`              | Full composite group indexed; the additional unique on `(target_session_id)` alone enforces one-adjustment-per-session. |
| `workout_session_adjustments` replacement | `(replacement_session_id, user_id)` | `(replacement_session_id, user_id)` partial | Full composite group indexed for non-null rows, which are the only rows the FK constrains.                              |
| `history_dispatch_outbox` session         | `(session_id, user_id)`             | `(session_id, user_id)`                     | Full composite group indexed.                                                                                           |
| `history_dispatch_outbox` adjustment      | `(adjustment_id, user_id)`          | `(adjustment_id, user_id)` partial          | Full composite group indexed for non-null rows.                                                                         |
| `hydration_facts` void target             | `(target_fact_id, user_id)`         | `(target_fact_id, user_id)` partial unique  | Full composite group indexed for non-null rows and simultaneously enforces one direct void per entry.                   |
| Every table's `user_id → auth.users(id)`  | `(user_id)`                         | Leading-column index listed per table       | Each table has an index whose leading column is `user_id`; the outbox has a dedicated `(user_id)` index.                |

Where an index over a globally unique child identifier alone would have been
used (for example `(session_id)` instead of `(session_id, user_id)`), the full
composite group is indexed instead. No composite foreign key relies on partial
coverage.

Every foreign-key path and every RLS ownership path listed above is indexed,
including `history_dispatch_outbox.user_id`.

---

## 16. Security, RLS and Data API grant matrix

**Direct authenticated Data API reads are ENABLED** for
`workout_sessions`, `workout_session_exercises`, `workout_session_sets`,
`workout_session_adjustments`, `hydration_facts`, `meal_adherence_facts` and
`daily_target_snapshots` (own rows only, `SELECT` only). They are **DISABLED**
for `history_dispatch_outbox`. This is a definitive selection, not conditional.

**Least privilege (frozen).** No entity in this domain receives `ALL` for any
role. Every grant is the explicit minimum set of operations required by the
trusted functions and workers that touch it.

| Entity                                           | `anon` | `authenticated`                        | `service_role`                           | Trusted server route/function | Outbox worker                      |
| ------------------------------------------------ | ------ | -------------------------------------- | ---------------------------------------- | ----------------------------- | ---------------------------------- |
| `public.workout_sessions`                        | None   | `SELECT` (own, RLS)                    | `SELECT`, `INSERT`                       | Writes via RPC only           | `SELECT` via service role          |
| `public.workout_session_exercises`               | None   | `SELECT` (own, RLS)                    | `SELECT`, `INSERT`                       | Writes via RPC only           | `SELECT` via service role          |
| `public.workout_session_sets`                    | None   | `SELECT` (own, RLS)                    | `SELECT`, `INSERT`                       | Writes via RPC only           | `SELECT` via service role          |
| `public.workout_session_adjustments`             | None   | `SELECT` (own, RLS)                    | `SELECT`, `INSERT`                       | Writes via RPC only           | `SELECT` via service role          |
| `public.hydration_facts`                         | None   | `SELECT` (own, RLS)                    | `SELECT`, `INSERT`                       | Writes via RPC only           | No access needed                   |
| `public.meal_adherence_facts`                    | None   | `SELECT` (own, RLS)                    | `SELECT`, `INSERT`                       | Writes via RPC only           | No access needed                   |
| `public.daily_target_snapshots`                  | None   | `SELECT` (own, RLS)                    | `SELECT`, `INSERT`                       | Writes via RPC only           | No access needed                   |
| `public.history_dispatch_outbox`                 | None   | None                                   | `SELECT`, `INSERT`, `UPDATE`, `DELETE`\* | Insert via RPC only           | `SELECT`/`UPDATE` via service role |
| Read-model views (§14, if materialized as views) | None   | `SELECT` (own, via `security_invoker`) | `SELECT`                                 | Not applicable                | Not applicable                     |
| `public.ingest_workout_completion_v1`            | None   | None                                   | `EXECUTE`                                | Calls via service role        | No                                 |
| `public.adjust_workout_session_v1`               | None   | None                                   | `EXECUTE`                                | Calls via service role        | No                                 |
| Outbox claim/recovery functions                  | None   | None                                   | `EXECUTE`                                | No                            | Calls via service role             |
| Outbox retention-maintenance function            | None   | None                                   | `EXECUTE`                                | No                            | Server-only maintenance boundary   |

\* Outbox `DELETE` exists **only** to serve the 90-day `delivered`-row retention
policy and is exercised only through the restricted server-only maintenance
boundary described in §17. It confers no deletion right over canonical history,
adjustments or auxiliary facts.

**Immutability of history under these grants.** History, adjustment and
auxiliary tables have **no** `UPDATE` and **no** `DELETE` grant for any role.
Therefore no ordinary code path — trusted server, worker or client — can rewrite
or erase a historical fact. The only row removal remains the `auth.users`
deletion cascade (I14, §17). Mutable operational state exists exclusively in
`public.history_dispatch_outbox`.

**Anonymous users:** no grants, no policies, no function execution — no access
of any kind.

**Authenticated users:** own-row `SELECT` only on the seven exposed tables; no
`INSERT`, `UPDATE` or `DELETE` on any history, adjustment or auxiliary table;
no outbox access; no execution of any ingestion, adjustment, outbox or
maintenance function; no ability to supply an authoritative user ID.

**Trusted server and service role:**

- Authenticates the request before any database write.
- Derives `user_id` from the verified session.
- Uses a service-role client that does **not** forward the browser user JWT.
- Calls only the restricted transactional functions.
- Never exposes service-role credentials to the browser.

**Service-role security clarification (explicit).**

- Supabase `service_role` **bypasses RLS**. RLS therefore does not and cannot
  constrain a service-role caller.
- Service-role safety rests on three other mechanisms only: server-only
  credential isolation (the key exists solely in the server runtime and never
  reaches the browser), explicit least-privilege grants (above), and restricted
  trusted functions that own all validation and ownership derivation.
- RLS protects user-facing (`anon`, `authenticated`) access as defense in depth
  and must never be described in this domain as restricting `service_role`.
- Any statement elsewhere that "RLS prevents cross-user access" applies to
  user-facing roles only; for service-role paths the equivalent guarantee comes
  from server-derived `user_id` plus the composite ownership constraints (§6.3).

**RLS:**

- Enabled on every user-owned history and auxiliary-fact table, and on the
  outbox (which simply has no user-facing policy).
- Ownership policy form: `(select auth.uid()) = user_id` (optimized form,
  evaluated once per statement).
- Every RLS `user_id` path is indexed (§15).
- Composite ownership constraints prevent cross-user child references
  independently of RLS and independently of the calling role.
- Grants are designed separately from RLS and are the primary access control.

**Views and functions:**

- Exposed views use `security_invoker`; any view that cannot is not exposed.
- Ingestion, adjustment, outbox and maintenance functions use
  `SECURITY INVOKER`, an empty safe `search_path` and fully qualified relation
  names.
- Execution revoked from `PUBLIC`, `anon`, `authenticated`; granted only to
  `service_role`.
- `SECURITY DEFINER` is not used anywhere in this domain to bypass
  permissions.

No grants or policies are implemented in this sprint.

---

## 17. Transaction, deletion and retention boundaries

**New completion (single transaction).** Create the session, all exercise
rows, all set rows, all explicitly supplied auxiliary facts, and all required
dispatch rows. Either everything commits or nothing is created.

**Idempotent replay.** Look up `(user_id, ingestion_key)` first, compare the
recomputed `command_fingerprint` (§11.1), and on equivalence return the existing
session; create no children, no auxiliary facts and no dispatch rows; overwrite
nothing. Reject incompatible payload reuse with `PH_INGESTION_KEY_CONFLICT`.
Replay lookup precedes occurrence-window validation (§9.2), so a genuine replay
never fails merely because the original occurrence window has elapsed.

**Auxiliary-fact write (inside the same transaction).** For each supplied
auxiliary fact, look up `(user_id, ingestion_key)`, compare the recomputed
`fact_fingerprint` (§11.3), and either insert, treat as replay, or fail the whole
transaction with `PH_AUXILIARY_FACT_CONFLICT`.

**Void (single transaction).** Create the append-only void adjustment
(`kind = void`) and the required downstream dispatch rows. The original session
is not edited.

**Correction (single transaction).** Create the replacement immutable session
and its children, the append-only correction adjustment, and the required
downstream dispatch rows. The original session is neither edited nor deleted.

**Adjustment replay (single transaction).** Look up
`(user_id, adjustment_key)`, compare the stored `command_fingerprint`, and
return the existing adjustment on equivalence or
`PH_ADJUSTMENT_KEY_CONFLICT` on divergence (§7.2). No replacement session is
created on replay.

**Hydration correction (single transaction).** Append one `void` event
targeting the incorrect entry and one new `entry` event carrying the corrected
volume. Both rows commit together or neither is created. The original row is
never edited (§8.1).

**Downstream failure.** Never rolls back committed history. Retry state is
persisted in the outbox. Per-consumer progress remains independent.

**Deletion and retention.**

- No ordinary hard delete or update path exists for historical facts,
  adjustments or auxiliary facts. No role — including `service_role` — receives
  an ordinary `UPDATE` or `DELETE` grant on them (§16).
- User/account deletion cascades from `auth.users` as the explicit
  legal/user-deletion exception.
- Operational cleanup never erases canonical history because an outbox row was
  delivered or dead-lettered.
- **Outbox retention:** `delivered` rows may be purged after 90 days;
  `dead_letter` rows are retained until an operator resolves them and are never
  purged automatically. Purging happens **only** through a restricted
  server-only maintenance boundary (a dedicated `service_role`-only maintenance
  function whose scope is limited to `history_dispatch_outbox` rows in state
  `delivered` older than the retention window). No deletion right over
  canonical history, adjustments or auxiliary facts is granted or implied.
  History retention is entirely independent of outbox retention.

---

## 18. Migration and rollback sequence

Documentation-only. No migration file is created in this sprint.

Expected implementation sequence:

1. Create schema objects, constraints and indexes.
2. Apply explicit grants and RLS.
3. Create trusted ingestion and adjustment functions.
4. Add outbox claim/recovery infrastructure.
5. Implement `WorkoutCompletionCoordinator`.
6. Wire plan, timer and first-workout completion sources, including the source
   adapter that normalizes generator difficulty values (§5.1) and generator
   substitution representation (§6.1) before ingestion.
7. Activate idempotent downstream consumers for `session_completed`.
8. Add canonical read models and UI.
9. Cut Progress and Weekly Report directly to canonical history.
10. Ship consumer reversal/recompute support for `session_voided` and
    `session_corrected` in Gamification, Goals and plan sync, then replay any
    retained `retry_scheduled` / `dead_letter` adjustment events.
11. Only after step 10 succeeds, enable user-facing void and correction
    actions in the product.
12. Isolate and retire legacy local history state.

**Cutover gating rule (frozen).** History storage of adjustments may exist
before consumer support, but user-facing void/correction actions must not be
enabled until step 10 completes. No adjustment event is ever discarded or
acknowledged as delivered to obtain a green dashboard (§12, §13.4).

Rollback principles:

- Before cutover, additive unused schema may be disabled or removed through a
  reviewed reverse migration.
- After trusted ingestion begins, rollback must never delete committed
  canonical history.
- The trusted completion route may be disabled while preserving stored facts.
- Downstream dispatch may be paused and resumed.
- Failed consumers are recovered through the durable outbox, not by rewriting
  history.
- The app must not fall back to reconstructed plan history at any point.
- Roll forward is preferred once canonical writes exist.
- Backup and validation are required before any destructive operation.

---

## 19. Validation and ADR acceptance gate

This contract contains no unresolved open questions, deferred decisions or
placeholder text. Every detail required for implementation is frozen above, and
every choice remains inside ADR 0005's decisions.

**Correction record (Sprint 8.0B-B2A-C1).** The independent validation of the
8.0B-B2A draft identified sixteen contract defects. They are corrected in this
revision: repository-compatible text exercise identifiers and substitution
semantics (§3, §6.1, §9.4, §11, §14, §15); explicit difficulty normalization
(§5.1, §9.1); a versioned structured prescription snapshot (§6.1.1, §9.5);
complete nested command-payload input matrices (§9.3–§9.9); a
semantically complete session fingerprint with frozen canonicalization (§11.1);
independent auxiliary-fact fingerprints and conflict detection (§8, §11.3);
append-only hydration void/entry semantics that no longer double-count
(§8.1, §14.5, §15); adjustment-key idempotency, replacement-session
uniqueness and the full `public.adjust_workout_session_v1` contract (§7.1–§7.3);
null-safe outbox uniqueness through partial unique constraints (§12.1, §15);
the outbox `user_id` index and composite foreign-key index review (§15);
removal of unsafe no-op delivery acknowledgement (§12, §13.4, §18);
least-privilege service-role grants with an explicit RLS/service-role
clarification (§16); server-derived confirmation time and replay-safe
occurrence-window validation (§9.2); complete read-model output matrices and
aggregate formulas (§14); and a reconciled error taxonomy (§10).

This revision remains a **Draft**. It has **not** been independently validated,
ADR 0005 remains **Proposed**, and nothing has been implemented.

Remaining blockers: **none.**

Acceptance path:

1. This draft passes independent validation.
2. Sprint 8.0B-B2B either corrects the contract or ratifies it.
3. Only then does ADR 0005 move from Proposed to Accepted, and only then may
   Sprint 8.1 begin schema implementation.

The marker below means: detailed contracts have been drafted; they have not
yet been independently validated; ADR 0005 remains Proposed; no implementation
is authorized; Sprint 8.0B-B2B will either correct this contract or ratify
ADR 0005.

CONTRACT DRAFT COMPLETE — READY FOR 8.0B-B2B VALIDATION
