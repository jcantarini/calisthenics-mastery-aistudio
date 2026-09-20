# Progress History — durable dispatch outbox regression suite (Sprints 8.1A3 and 8.1A3-C1)

Executable regression coverage for `public.history_dispatch_outbox`, the
mutable server-owned delivery state defined by
[`progress-history-domain-contracts.md`](../../../docs/architecture/progress-history-domain-contracts.md)
§12, §12.1, §15 and §16.

**Not a migration.** `run.sh` builds a throwaway PostgreSQL 17 cluster in a
temporary directory, listening on a private unix socket only, replays all
project migrations in filename order, runs the suite and destroys the cluster.
It never connects to a shared or production database and never needs
credentials.

```bash
supabase/tests/progress_history_outbox/run.sh [output-log]
```

Exit code `0` only when every inventoried case matched its expected SQLSTATE.
PostgreSQL refuses to run as root; when started as root the runner re-executes
itself as an unprivileged account (`PH_TEST_OS_USER` overrides the choice).

## Inventory

The frozen inventory is **107 cases** (61 positive, 46 negative), declared in
`90_report.sql` independently of the rows a run produces. An empty run, a
missing case, an unexpected case or a wrong expected SQLSTATE fails the gate.

| Prefix | Cases | Coverage                                                                                             |
| ------ | ----- | ---------------------------------------------------------------------------------------------------- |
| `B-`   | 15    | Valid completion / void / correction rows, every consumer and state, defaults, bounds                |
| `N-`   | 30    | Invalid enums, numerics, text lengths, event-shape combinations, nulls, missing and cross-user refs  |
| `U-`   | 7     | Partial-unique duplicate protection and per-consumer independence (§12.1)                            |
| `M-`   | 7     | Mutable operational state: claim-, delivery- and dead-letter-shaped updates and their rejections     |
| `S-`   | 16    | Grant matrix under real roles (`anon`, `authenticated`, `service_role`) and composite ownership      |
| `D-`   | 6     | Outbox deletion never touches history; account-deletion cascade                                      |
| `X-`   | 26    | Catalog: RLS, absence of policies, effective privileges, indexes, foreign keys, defaults, neighbours |

## Files

| File                           | Purpose                                                                     |
| ------------------------------ | --------------------------------------------------------------------------- |
| `run.sh`                       | Disposable-cluster bootstrap, migration replay, suite execution, cleanup    |
| `00_bootstrap.sql`             | Minimal Supabase-like surface (roles, `auth.users`, `auth.uid`) and harness |
| `10_fixtures.sql`              | Synthetic disposable users, sessions, adjustments and one outbox row        |
| `20_constraints.sql`           | Shape, enum, bound, null, referential, uniqueness and mutability cases      |
| `30_security.sql`              | Behavioural grant checks under real roles, deletion and cascade boundaries  |
| `40_catalog.sql`               | Catalog assertions for RLS, grants, indexes, foreign keys and defaults      |
| `90_report.sql`                | Per-case report, totals and the frozen pass/fail gate                       |
| `regression-default-grants.sh` | Failing-before / passing-after evidence for the 8.1A3-C1 privilege reset    |

## Default table privileges (Sprint 8.1A3-C1)

`00_bootstrap.sql` deliberately arms the disposable cluster with permissive
default table privileges (`ALTER DEFAULT PRIVILEGES ... GRANT ALL ON TABLES TO
service_role`) before the migrations replay. The original outbox migration
granted the four contracted privileges without first revoking inherited ones,
so under such defaults `service_role` also retained `TRUNCATE`, `REFERENCES`,
`TRIGGER` and `MAINTAIN`. The privilege-reset migration revokes everything from
`PUBLIC`, `anon`, `authenticated` and `service_role` and re-grants only
`SELECT`, `INSERT`, `UPDATE` and `DELETE` to `service_role`.

`regression-default-grants.sh` proves both directions on disposable clusters:
with the twenty original migrations the suite fails on `S-016`, `X-003`,
`X-005`, `X-024` and `X-025`; with the reset applied it passes 107 / 107.
`PH_MIGRATIONS_DIR` lets that script point `run.sh` at a temporary copy of the
committed migrations; no committed file is modified.

## Deliberately out of scope

The suite asserts only guarantees the schema actually implements. The
following belong to the restricted server-only functions of a later sprint and
are **not** tested here, because they do not exist:

- atomic claim, acknowledgement, lease recovery and backoff scheduling;
- the state-machine transition matrix, the ten-attempt budget and
  `updated_at` maintenance;
- operator manual replay of dead-letter rows;
- the 90-day retention cleanup of `delivered` rows (the `DELETE` grant only
  makes that future boundary possible; it does not enforce it);
- write-once identity, matching an adjustment's kind and target, plan-sync
  delivery rules, and atomicity with the historical facts.

The reviewable report lives at
[`docs/architecture/progress-history-outbox-validation.md`](../../../docs/architecture/progress-history-outbox-validation.md).
