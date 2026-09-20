# Sprints 8.1A3 / 8.1A3-C1 — Durable dispatch outbox: schema, security, privilege reset and validation record

**Status:** `8.1A3-C1 — INDEPENDENTLY VALIDATED`

Independent validation passed for original commit `c143d5451f51f2d08ea4749a6dc87a9e40c35fa3`,
[CI run 34811137868](https://github.com/jcantarini/calisthenics-mastery/actions/runs/34811137868).
The local execution notes below are historical. Restoration into AI Studio is
tracked separately in [the migration audit](./ai-studio-migration-audit.md).

Storage slice only. This sprint created the physical table
`public.history_dispatch_outbox` defined by
[`progress-history-domain-contracts.md`](./progress-history-domain-contracts.md)
§12, §12.1, §15 and §16, plus its executable regression coverage. It activates
no ingestion, no worker, no consumer and no product behaviour.

## 1. Preceding gate

Sprint 8.1A2 (auxiliary facts) passed independent validation; the record is in
[`progress-history-core-validation.md`](./progress-history-core-validation.md)
§12. That approval is historical and closed and says nothing about this sprint.

## 2. Migration

One additive migration was created through the migration tooling. The nineteen
previous migrations are byte-for-byte unchanged; the repository now holds
twenty.

Implemented exactly as contracted:

- identity and ownership: `id` primary key, `user_id` foreign key to
  `auth.users(id) ON DELETE CASCADE`;
- same-user composite foreign keys `(session_id, user_id) →
workout_sessions(id, user_id)` and `(adjustment_id, user_id) →
workout_session_adjustments(id, user_id)`, so a row can never point at another
  user's session or adjustment;
- frozen enums: `event_kind` (`session_completed`, `session_voided`,
  `session_corrected`), `consumer` (`training_plan_sync`, `gamification`,
  `goals`), `state` (`pending`, `processing`, `retry_scheduled`, `delivered`,
  `dead_letter`);
- `attempt_count` integral and `>= 0`. The ten-attempt budget is deliberately
  **not** a CHECK: it is an operational rule of the future restricted worker
  functions, and encoding it in the schema would block legitimate operator
  replay accounting;
- `event_version` fixed at `1`; text bounds `lease_owner` 1–100,
  `last_error_code` 1–64, `last_error_summary` 1–500; the remaining worker
  columns nullable as contracted;
- defaults: `state` `pending`, `attempt_count` `0`, `event_version` `1`,
  `next_attempt_at` / `created_at` / `updated_at` `now()`;
- row-local subject resolution (§12.1): `session_completed` forbids
  `adjustment_id`; `session_voided` and `session_corrected` require it;
- duplicate protection through **two partial unique indexes** —
  `(session_id, event_kind, consumer) WHERE adjustment_id IS NULL` and
  `(adjustment_id, event_kind, consumer) WHERE adjustment_id IS NOT NULL` —
  never a single four-column nullable unique constraint, which PostgreSQL null
  semantics would leave ineffective;
- the complete §15 index set: claim eligibility, lease expiry, `user_id`, the
  full composite session group, the partial composite adjustment group,
  dead-letter review and delivered-row retention.

No foreign key points at a mutable training-plan table. No XP, goal increment
or reward value is stored. No trigger, function, view or RPC was created.

## 3. Security matrix (§16)

| Role            | Outbox privileges                      | RLS effect             |
| --------------- | -------------------------------------- | ---------------------- |
| `PUBLIC`        | none                                   | not applicable         |
| `anon`          | none                                   | no policy, no access   |
| `authenticated` | none                                   | no policy, no access   |
| `service_role`  | `SELECT`, `INSERT`, `UPDATE`, `DELETE` | bypasses RLS by design |

RLS is enabled and the table carries **no** policy: user-facing roles have no
grant and therefore no access at all. `service_role` bypasses RLS; its safety
rests on server-only credential isolation, these explicit grants and the
composite ownership foreign keys — never on RLS. No role holds `ALL`,
`TRUNCATE`, `REFERENCES` or `TRIGGER`. Grants on the history and auxiliary
tables are unchanged.

The `DELETE` grant exists only to make the future 90-day `delivered`-row
retention boundary of §17 possible through a restricted server-only
maintenance function. It is not a cleanup implementation and it enforces
nothing by itself. Deleting an outbox row never cascades into sessions,
adjustments or auxiliary facts; account deletion remains the single explicit
ownership cascade.

## 4. Regression coverage

`supabase/tests/progress_history_outbox/` replays all twenty migrations on a
disposable PostgreSQL 17.9 cluster (private unix socket, `listen_addresses=''`,
trust authentication, synthetic users only) and executes a frozen inventory of
**102 cases (56 positive, 46 negative)**.

| Section | Cases | Focus                                                                           |
| ------- | ----- | ------------------------------------------------------------------------------- |
| `B-`    | 15    | Valid rows for every event kind, consumer and state; defaults; boundary values  |
| `N-`    | 30    | Rejected enums, numerics, lengths, event shapes, nulls, missing/cross-user refs |
| `U-`    | 7     | Partial-unique duplicate protection and per-consumer independence               |
| `M-`    | 7     | Mutable state updates accepted and invalid updates rejected                     |
| `S-`    | 15    | Grant matrix under real roles and composite ownership on the server path        |
| `D-`    | 6     | Outbox deletion leaves history intact; account-deletion cascade                 |
| `X-`    | 22    | Catalog assertions for RLS, policies, grants, indexes, FKs and defaults         |

Recorded run: **102 / 102 PASS, zero failures**. Rejections reported their real
SQLSTATE: `23514` CHECK, `23505` unique, `23503` foreign key, `23502` NOT NULL,
`42501` insufficient privilege. The core suite stays at 169 / 169 and the
auxiliary suite at 127 / 127.

The expected inventory is declared in `90_report.sql` independently of observed
results: an empty run, a missing case, an unexpected case or a wrong expected
SQLSTATE fails the gate. Four negative scenarios prove that gate on disposable
copies of the suite.

## 5. CI integration

`supabase/tests/progress_history_core/run-ci.sh` now runs and requires all
three suites and twelve negative scenarios. Preserved unchanged: the exact
PostgreSQL package pin, the four protected baseline hashes, the core 169/169
gate and its negatives, the installation/logging error handling validated in
8.1A1-V2, the final worktree and integrity checks and the evidence upload
ordering. Changed only as required by this sprint: the explicit migration count
`19 → 20`, the frozen migration list extended to the nineteen pre-existing
migrations verified byte-for-byte, the input manifest extended with the new
runner and SQL files, and the new outbox suite plus its negatives captured in
the artifact and in the final verdict. A failed or skipped outbox suite fails
the job.

## 6. Local execution evidence

| Item                 | Value                                                               |
| -------------------- | ------------------------------------------------------------------- |
| PostgreSQL           | 17.9, disposable cluster, private socket, destroyed after run       |
| Migrations replayed  | 20 (19 pre-existing byte-for-byte + 1 new)                          |
| Core suite           | 169 / 169                                                           |
| Auxiliary suite      | 127 / 127                                                           |
| Outbox suite         | 102 / 102 (56 positive, 46 negative)                                |
| Negative scenarios   | 12 / 12 rejected for their intended reason                          |
| Baseline enforcement | PASS (four frozen inputs exact, forbidden files absent, pin 2.12.0) |
| Post-run integrity   | PASS (execution inputs unchanged)                                   |

Baseline hashes verified before and after the work: `package.json`
`ae920346cd1def8c08a87fa0cc2179d3d7436532951489cce45fadc79a4b7bb6`, `bun.lock`
`184c717a13a2b402067877f9689afcd83edf96945a9e94f952c73fcb81805058`,
`src/integrations/supabase/client.ts`
`1aefd6de51f1b3cfb570636f376a35da86ab21ade7c9cd7c1f67053622d27834`,
`src/integrations/supabase/types.ts`
`a671afdd4bd77cb2db0ffde707fd3d14d45bd005d8120a88e6677c49087feb18`;
`@lovable.dev/vite-tanstack-config` pinned to `2.12.0`;
`src/integrations/supabase/previewAuthStorage.ts` and `package-lock.json`
remain absent.

**Not executed (`NOT RUN`):** application tests, typecheck, lint and build —
this slice is database-only. **GitHub Actions:** the sandbox executor has no
GitHub credentials, so no workflow run was dispatched or inspected for this
sprint, and no run URL, run ID or artifact hash is claimed here. Independent
re-execution in CI is required before the status changes.

## 7. Deliberately not implemented

- claim, acknowledgement and lease-recovery functions; lease duration, retry
  and backoff behaviour; operator manual replay; retention cleanup;
- the ingestion and adjustment RPCs, the `WorkoutCompletionCoordinator`,
  outbox workers and downstream consumers;
- future restricted functions must still enforce the state-transition matrix
  and attempt budget, ownership and lease validation, `updated_at`
  maintenance, write-once identity, the match between an adjustment's kind and
  the event kind and target, the plan-sync delivery rule, atomicity with the
  historical facts, complete consumer semantics (§13.4), and retention plus
  diagnostic sanitization.

The Progress History domain is **not** complete: ingestion, dispatch, read
models, services and UI do not exist.

---

# Sprint 8.1A3-C1 — Outbox privilege reset and default-grant regression

## 8. The defect

The Sprint 8.1A3 migration granted `SELECT`, `INSERT`, `UPDATE` and `DELETE` to
`service_role` **without first revoking** the privileges the role may already
hold on a newly created table. On any database where the `public` schema
carries permissive default table privileges (`ALTER DEFAULT PRIVILEGES ...
GRANT ALL ON TABLES`), `service_role` therefore also retained `TRUNCATE`,
`REFERENCES`, `TRIGGER` and — on PostgreSQL 17 — `MAINTAIN`. That is a
deviation from the frozen §16 matrix, which allows exactly four privileges.

The core and auxiliary migrations were already written as `REVOKE ALL` followed
by an explicit grant, so only the outbox table was affected.

## 9. Why the earlier suite did not detect it

The disposable cluster of the 8.1A3 suite was created with PostgreSQL's own
minimal defaults: no role inherited anything on newly created tables, so the
missing `REVOKE` had no observable effect there. The suite also asserted grants
mostly by their presence, not by the **absence of everything else**. Both gaps
are now closed:

- `00_bootstrap.sql` arms the throwaway cluster with
  `ALTER DEFAULT PRIVILEGES FOR ROLE pgtest IN SCHEMA public GRANT ALL ON
TABLES TO service_role` **before** the migrations replay, reproducing a
  permissive host;
- the new cases assert the complete effective privilege matrix and reject any
  privilege outside the contracted four, including future privilege kinds.

## 10. The corrective migration

One additive migration (21 in total; the twenty previous ones byte-for-byte
unchanged) revokes **all** privileges on `public.history_dispatch_outbox` from
`PUBLIC`, `anon`, `authenticated` and `service_role`, then grants back only
`SELECT`, `INSERT`, `UPDATE` and `DELETE` to `service_role`.

Unchanged by design: the table, its rows, indexes, constraints and foreign
keys; RLS enabled with no policy; schema-wide default privileges; the grants on
the four history tables and the three auxiliary fact tables. No RPC, view,
trigger or function was created. `service_role` still bypasses RLS by design —
the reset narrows what that role may do, it does not make RLS constrain it.

## 11. New regression cases

The frozen inventory grows from 102 to **107 cases (61 positive, 46
negative)**:

| Case    | Assertion                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------ |
| `S-016` | Under the real `service_role`, effective privileges are exactly the four contracted ones         |
| `X-023` | The test environment really is armed with permissive default table privileges                    |
| `X-024` | No application role retains any outbox privilege outside the contracted four (catches new kinds) |
| `X-025` | The effective per-role matrix matches §16 for `service_role`, `authenticated` and `anon`         |
| `X-026` | The history and auxiliary grants survived the reset unchanged                                    |

`X-023` matters most: without it a future change could silently restore minimal
defaults and make the whole regression vacuous.

## 12. Failing-before / passing-after evidence

`supabase/tests/progress_history_outbox/regression-default-grants.sh` runs two
disposable clusters, both with permissive defaults:

| Scenario                                    | Result                                                       |
| ------------------------------------------- | ------------------------------------------------------------ |
| A — original 20 migrations (reset withheld) | Suite **FAILS**: `S-016`, `X-003`, `X-005`, `X-024`, `X-025` |
| B — all 21 migrations                       | Suite **PASSES** 107 / 107                                   |

Scenario A reported the leak explicitly: `service_role:MAINTAIN,
service_role:REFERENCES, service_role:TRIGGER, service_role:TRUNCATE`. The
script copies the committed migrations to a temporary directory outside the
repository and points `run.sh` at it through `PH_MIGRATIONS_DIR`; no committed
migration is modified.

## 13. CI integration

`run-ci.sh` now requires exactly **21** migrations (the twenty previous ones
verified byte-for-byte against the frozen hash list), the outbox gate at
**107 / 107**, and the new default-grant regression as a mandatory step whose
failure fails the job. Preserved unchanged: the PostgreSQL package pin, the
four protected baseline hashes, the core 169/169 and auxiliary 127/127 gates,
the twelve negative scenarios, the installation/logging error handling
validated in 8.1A1-V2, the final worktree and integrity checks and the evidence
upload ordering.

## 14. Local execution evidence

| Item                     | Value                                                         |
| ------------------------ | ------------------------------------------------------------- |
| PostgreSQL               | 17.9, disposable cluster, private socket, destroyed after run |
| Migrations replayed      | 21 (20 pre-existing byte-for-byte + 1 privilege reset)        |
| Baseline enforcement     | PASS · self-check PASS                                        |
| Core suite               | 169 / 169                                                     |
| Auxiliary suite          | 127 / 127                                                     |
| Outbox suite             | 107 / 107 (61 positive, 46 negative)                          |
| Negative scenarios       | 12 / 12 rejected for their intended reason                    |
| Default-grant regression | PASS (fails without the reset, passes with it)                |
| Post-run integrity       | PASS (execution inputs unchanged)                             |
| Final verdict            | `exit status: 0`                                              |

Baseline re-verified before and after: `package.json`
`ae920346cd1def8c08a87fa0cc2179d3d7436532951489cce45fadc79a4b7bb6`, `bun.lock`
`184c717a13a2b402067877f9689afcd83edf96945a9e94f952c73fcb81805058`,
`src/integrations/supabase/client.ts`
`1aefd6de51f1b3cfb570636f376a35da86ab21ade7c9cd7c1f67053622d27834`,
`src/integrations/supabase/types.ts`
`a671afdd4bd77cb2db0ffde707fd3d14d45bd005d8120a88e6677c49087feb18`;
`@lovable.dev/vite-tanstack-config` pinned to `2.12.0`;
`previewAuthStorage.ts` and `package-lock.json` remain absent.

**Not executed (`NOT RUN`):** application tests, typecheck, lint and build —
this slice is database-only. **GitHub Actions:** the sandbox executor has no
GitHub credentials, so no workflow run was dispatched or inspected for this
sprint; no run URL, run ID or artifact hash is claimed here. The previously
inspected run `34809920146` predates this correction and passed under the old
minimal-privilege environment, so it does not evidence the reset. Independent
re-execution in CI is required before the status changes.

## 15. Scope

Schema and privileges only. No ingestion, worker, consumer, read model,
service, hook or UI exists. The Progress History domain is **not** complete.
