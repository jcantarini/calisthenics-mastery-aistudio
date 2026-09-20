# Progress History Auxiliary Facts — Validation Report

**Sprint:** 8.1A2
**Scope:** Physical schema, security matrix and executable regression evidence
for the three auxiliary Phase 8 facts — `public.hydration_facts`,
`public.meal_adherence_facts` and `public.daily_target_snapshots`.
**Status:** `8.1A2 — INDEPENDENTLY VALIDATED`

The gate was closed by an independent reviewer; the approval record is in
[`progress-history-core-validation.md`](./progress-history-core-validation.md)
§12. Everything below is the original implementation and local-execution
record of the sprint, preserved unchanged.

This report records results produced by the authoring executor running the
committed suite in `supabase/tests/progress_history_auxiliary/` against a
disposable PostgreSQL cluster. No production, preview or shared database was
used, read or modified. The sprint adds exactly one additive migration; the
eighteen pre-existing migrations are unchanged byte-for-byte, and their hashes
are now frozen inside the CI orchestrator.

This sprint does **not** complete the Progress History domain: it delivers
schema and security only, with no ingestion path, RPC, outbox, view, service,
hook, route or UI.

---

## 1. Environment

| Item          | Value                                                                        |
| ------------- | ---------------------------------------------------------------------------- |
| PostgreSQL    | 17.9, disposable cluster created by the suite runner                         |
| Cluster       | `initdb -U pgtest --auth=trust --encoding=UTF8 --locale=C`                   |
| Network       | `listen_addresses=''` — private unix socket inside a temporary directory     |
| Lifetime      | Created and destroyed by `run.sh`; `test.results` discarded with the cluster |
| Migrations    | All 19 project migrations replayed in filename order from scratch            |
| Shared DB use | None                                                                         |

## 2. Delivered schema

One additive migration creates three independent auxiliary fact tables. They
carry no `session_id` and no foreign key to workout sessions, training plans or
the exercise catalog; translated labels are never used as identities.

| Table                    | Purpose                                         |
| ------------------------ | ----------------------------------------------- |
| `hydration_facts`        | Hydration `entry` rows and their `void` rows    |
| `meal_adherence_facts`   | Append-only per-meal adherence observations     |
| `daily_target_snapshots` | Point-in-time capture of a day's calorie target |

Shared contract shape on all three: `id`, `user_id`, `ingestion_key`,
`fact_fingerprint`, occurrence/capture timestamp, IANA timezone text plus
timezone source, `local_day`, `contract_version` defaulting to `1`,
`created_at`, and no `updated_at`, status or soft-delete column.

Enforced in schema:

- unique `(user_id, ingestion_key)` per table, with the contracted key prefix
  (`hydration:`, `meal:`, `daily-target:`) followed by a UUID;
- `fact_fingerprint` restricted to 64 lowercase hexadecimal characters;
- `contract_version` fixed at `1`;
- hydration: `kind` in (`entry`, `void`); an `entry` carries `volume_ml` in
  `1..10000` and no target; a `void` carries a mandatory `target_fact_id` and
  no volume; self-targeting rejected; composite `(id, user_id)` uniqueness and
  a composite foreign key so a void can only target the same user's row; a
  partial unique index allows at most one direct void per target;
- meal adherence: canonical `meal_key` vocabulary, mandatory `adhered`, and
  **no** uniqueness that would block multiple observations for the same meal
  and day;
- daily targets: `calorie_target_kcal` in `0.01..20000`; `target_source`
  `calculated` requires both `calculation_weight_kg` (`0.01..500`) and a
  bounded `target_algorithm_version`, while every other source forbids both;
  multiple
  snapshots per local day are allowed;
- ownership: direct `user_id` foreign key to `auth.users(id) ON DELETE CASCADE`
  on each table, and an index on every ownership/RLS lookup path.

## 3. Security matrix

Identical to the frozen core matrix, applied to the three new tables:

| Role            | Privileges              | RLS effect                       |
| --------------- | ----------------------- | -------------------------------- |
| `anon`          | none                    | no access at all                 |
| `authenticated` | `SELECT` only           | own rows, `auth.uid() = user_id` |
| `service_role`  | `SELECT`, `INSERT` only | bypasses RLS by role property    |
| `PUBLIC`        | none                    | —                                |

No role in this matrix holds `UPDATE`, `DELETE`, `TRUNCATE`, `REFERENCES`,
`TRIGGER` or `ALL`. Table owners and database superusers sit outside the matrix
and retain their inherent privileges by definition; RLS is therefore described
here as protection for user-facing roles only, and it does not restrict
`service_role` or superusers. Account-deletion cascade remains the single
explicit deletion path. No view, function, trigger, RPC or server endpoint was
added.

## 4. Regression suite

`supabase/tests/progress_history_auxiliary/` replays all 19 migrations on a
fresh disposable cluster and executes a frozen inventory of **127** cases
(54 positive, 73 negative). The inventory in `90_report.sql` is declared
independently of observed results: an empty run, a missing case, an unexpected
case or a wrong expected SQLSTATE fails the suite.

| Section        | Cases | Positive | Negative | Failures |
| -------------- | ----- | -------- | -------- | -------- |
| `hydration`    | 27    | 5        | 22       | 0        |
| `meal`         | 16    | 8        | 8        | 0        |
| `daily_target` | 24    | 7        | 17       | 0        |
| `idempotency`  | 7     | 3        | 4        | 0        |
| `ownership`    | 3     | 2        | 1        | 0        |
| `rls`          | 7     | 7        | 0        | 0        |
| `grants`       | 27    | 6        | 21       | 0        |
| `cascade`      | 3     | 3        | 0        | 0        |
| `catalog`      | 13    | 13       | 0        | 0        |
| **Total**      | 127   | 54       | 73       | **0**    |

Rejection SQLSTATE distribution: `23514` (41), `42501` (21), `23505` (5),
`23502` (3), `23503` (3).

Coverage includes valid rows and boundary values per entity; invalid enums,
key prefixes, fingerprints, numerics and conditional-null combinations;
duplicate per-user ingestion keys and the same key accepted for a different
user; hydration void ownership, missing target, self-target and duplicate
direct void; multiple meal observations and multiple daily snapshots remaining
storable; required indexes, constraints and defaults; own-row and cross-user
`SELECT` under `authenticated`; `anon` denied; `authenticated` writes denied;
`service_role` inserts allowed and mutations denied; and account-deletion
cascade executed with the administrative test role.

## 5. Gate self-tests (negative scenarios)

Four mutations were applied to disposable copies of the suite **outside** the
repository; each had to fail:

| Scenario                                | Result                                                |
| --------------------------------------- | ----------------------------------------------------- |
| A — no case file executed               | exit 1, `no results recorded (empty suite execution)` |
| B — one inventoried case removed        | exit 1, `1 expected case(s) missing`                  |
| C — case ID outside the inventory added | exit 1, `1 unexpected case(s) recorded`               |
| D — wrong expected SQLSTATE on a case   | exit 1, `1 case(s) FAILED`                            |

## 6. CI integration

`supabase/tests/progress_history_core/run-ci.sh` now runs both suites in one
job and requires both. Preserved unchanged: the exact PostgreSQL package pin,
the four protected baseline hashes, the core 169/169 gate, the four core
negative scenarios, the installation/logging error handling validated in V2,
the final worktree/integrity checks and the evidence-upload ordering.

Extended: the migration-count expectation moved from 18 to 19 and is now
accompanied by an explicit frozen list of the eighteen pre-existing migration
hashes, so the new count cannot be satisfied by rewriting history; the
execution-input manifest now also hashes every auxiliary script and SQL file
(39 monitored entries); the auxiliary suite must report `127 / 127` and its
four negative scenarios must be rejected. A failed or skipped auxiliary suite
fails the job.

## 7. Executor run (local, disposable)

| Item                     | Value                              |
| ------------------------ | ---------------------------------- |
| PostgreSQL               | 17.9                               |
| Migrations replayed      | 19                                 |
| Core suite               | 169 / 169, zero failures           |
| Auxiliary suite          | 127 / 127, zero failures           |
| Core negative scenarios  | 4 / 4 rejected as intended         |
| Aux negative scenarios   | 4 / 4 rejected as intended         |
| Baseline enforcement     | PASS                               |
| Baseline self-check      | PASS (mutated baseline rejected)   |
| Execution-input manifest | 39 entries, unchanged before/after |
| Verdict                  | `CI VALIDATION PASSED`             |

Baseline hashes verified before and after the work:

| File                                  | SHA-256                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `package.json`                        | `ae920346cd1def8c08a87fa0cc2179d3d7436532951489cce45fadc79a4b7bb6` |
| `bun.lock`                            | `184c717a13a2b402067877f9689afcd83edf96945a9e94f952c73fcb81805058` |
| `src/integrations/supabase/client.ts` | `1aefd6de51f1b3cfb570636f376a35da86ab21ade7c9cd7c1f67053622d27834` |
| `src/integrations/supabase/types.ts`  | `a671afdd4bd77cb2db0ffde707fd3d14d45bd005d8120a88e6677c49087feb18` |

`@lovable.dev/vite-tanstack-config` remains pinned to `2.12.0`;
`src/integrations/supabase/previewAuthStorage.ts` and `package-lock.json`
remain absent.

**Not executed (`NOT RUN`):** application tests, typecheck, lint and build —
this slice is database-only. **GitHub Actions:** the sandbox executor has no
GitHub credentials, so no workflow run was dispatched or inspected for this
sprint, and no run URL, run ID or artifact hash is claimed here. Independent
re-execution in CI is required before the status changes.

## 8. Deferred to trusted ingestion (not implemented here)

Schema constraints alone do not make ingestion safe. The following remain
contract responsibilities of the future trusted-ingestion layer:

- fingerprint computation and payload canonicalization;
- replay-versus-conflict resolution on a reused ingestion key;
- IANA timezone validation and `local_day` derivation from occurrence;
- clock-relative occurrence validation (no clock-dependent CHECK exists);
- refusing to void a hydration row that is itself a void, and cross-row rules
  in general;
- atomic transactions for correction and completion flows.

No clock-dependent CHECK constraint was introduced, and no claim of complete
ingestion safety is made on the basis of schema constraints.
