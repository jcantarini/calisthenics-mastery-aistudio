# Progress History auxiliary facts — regression suite

Sprint 8.1A2. Executable regression coverage for the three auxiliary Phase 8
fact tables: `hydration_facts`, `meal_adherence_facts` and
`daily_target_snapshots`.

**This is test tooling. It contains no migration and is never executed against
a shared, preview or production database.**

## Running it

```bash
supabase/tests/progress_history_auxiliary/run.sh [output-log]
```

`run.sh` creates a throwaway PostgreSQL cluster in a temporary directory
(private unix socket, `listen_addresses=''`), replays every migration in
`supabase/migrations` in filename order, runs the suite and destroys the
cluster. It refuses to run as root and re-executes itself as an unprivileged
local account (`PH_TEST_OS_USER` overrides the choice). Exit status is `0` only
when every inventoried case matched its expected SQLSTATE.

## Files

| File                 | Role                                                           |
| -------------------- | -------------------------------------------------------------- |
| `00_bootstrap.sql`   | Roles, minimal `auth` schema and the `test.run()` case harness |
| `10_fixtures.sql`    | Synthetic users A/B/C and their baseline auxiliary rows        |
| `20_constraints.sql` | Per-entity constraint, idempotency and ownership cases         |
| `30_security.sql`    | RLS, grants and account-deletion cascade under real roles      |
| `40_catalog.sql`     | Catalog assertions plus dumps captured in the log              |
| `90_report.sql`      | Frozen case inventory, per-case report and the failing gate    |

## Inventory and gate

`90_report.sql` declares the frozen inventory of **127** case IDs
independently of the rows a run produces. The suite fails when results are
empty, when an inventoried case is missing, when an unrecorded case ID appears,
or when any case reports an actual SQLSTATE different from its expectation.

Sections: `hydration` (27), `meal` (16), `daily_target` (24), `idempotency`
(7), `ownership` (3), `rls` (7), `grants` (27), `cascade` (3), `catalog` (13).

## What this suite does not cover

Cross-row and ingestion-time rules are deliberately out of scope, because the
schema does not implement them: fingerprint computation and canonicalization,
replay-versus-conflict resolution, IANA timezone validation, `local_day`
derivation, clock-relative occurrence validation, refusing to void a row that
is itself a void, and atomic correction/completion transactions. They belong to
the future trusted-ingestion layer.

Results and evidence:
[`../../../docs/architecture/progress-history-auxiliary-validation.md`](../../../docs/architecture/progress-history-auxiliary-validation.md).
