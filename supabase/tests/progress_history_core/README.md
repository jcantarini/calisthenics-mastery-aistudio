# Progress History core — database regression suite

Executable validation artifacts for Sprint 8.1A1 (ADR 0005 / Progress History
domain contracts). **Nothing in this directory is a migration.** These files
are never applied to the preview or production database; the runner builds a
throwaway PostgreSQL cluster, applies the project migrations to it and
destroys it.

## Run locally

```bash
supabase/tests/progress_history_core/run.sh [log-path]
```

Default log path: `/tmp/progress-history-core-run.log`.
Exit code `0` only when every case matched its expected SQLSTATE.

Requirements: a local PostgreSQL 17 installation on `PATH`
(`initdb`, `pg_ctl`, `psql`, `createdb`). The runner drops root privileges
automatically when started as root (`PH_TEST_OS_USER` overrides the account).

## Run in CI

```bash
supabase/tests/progress_history_core/run-ci.sh [artifact-dir]
```

Default artifact directory: `/tmp/ph-core-artifacts`. The script enforces the
frozen baseline, runs the committed core `run.sh` unchanged and its four
negative scenarios, then the auxiliary suite
([`../progress_history_auxiliary/`](../progress_history_auxiliary/README.md))
and its four negative scenarios. It exits `0` only when the baseline is exact,
both suites pass (core `169/169`, auxiliary `127/127`), all eight negative
scenarios fail for their intended reason and the post-run integrity check is
clean. A failed or skipped auxiliary suite fails the job.

### Baseline enforcement

Before any PostgreSQL work, the script requires exact SHA-256 values for
`package.json`, `bun.lock`, `src/integrations/supabase/client.ts` and
`src/integrations/supabase/types.ts`, plus: no `previewAuthStorage.ts`, no
`package-lock.json`, exactly 21 migrations — the 20 pre-existing migrations
verified byte-for-byte against a frozen hash list plus the single additive
Sprint 8.1A3-C1 outbox privilege-reset migration — and
the portable AI Studio baseline (Bun 1.3.3, no Lovable runtime packages; see `docs/architecture/ai-studio-migration-audit.md`). Any missing file or
mismatch aborts with a clear non-zero result. A focused self-check then mutates
a temporary copy of the baseline and confirms it is rejected; the committed
baseline is never modified.

### Final evidence collection

An `EXIT` trap always attempts the final capture, including after an early
failure: it writes `hashes-after.txt` and `hashes-diff.txt` whenever the inputs
are accessible, records the original failure and the final exit status, labels
phases that could not run as `NOT RUN`, treats an integrity-check failure as a
validation failure and never turns a failure into success. The monitored
execution-input manifest covers both suites' scripts and SQL files.

The GitHub Actions job lives in
[`.github/workflows/progress-history-core.yml`](../../../.github/workflows/progress-history-core.yml)
and runs on `workflow_dispatch`, and on `push`/`pull_request` touching the
workflow file, `supabase/migrations/**`,
`supabase/tests/progress_history_core/**` or
`supabase/tests/progress_history_auxiliary/**`. It uses `contents: read` only,

installs the pinned PGDG packages `postgresql-17` and `postgresql-client-17`
version `17.9-1.pgdg24.04+1`, runs `initdb`/`postgres` as the non-root `runner`
account and needs no secrets or Supabase credentials.

The artifact directory is created before the PostgreSQL installation step, and
every later collection step re-creates it if needed. Installation output goes to
`postgres-install.log`. GitHub runs steps with `bash -e`, so the step disables
`errexit` explicitly around the installation pipeline (while keeping fail-fast
inside the installation subprocess) and reads `PIPESTATUS` immediately. The real
exit status, the log-write status, `install-status` and `PG_INSTALL_OK` are
recorded **before** the step exits with the original nonzero code; a logging
failure fails the step instead of being reported as successful evidence. A
failed installation is reported as
`suite execution: NOT RUN (PostgreSQL tooling unavailable)`, and its partial
evidence is uploaded rather than replaced by a missing-directory error.

### Execution artifacts

Uploaded with `if: always()` as `progress-history-core-evidence-<run id>`
(Actions → the run → Artifacts), containing `provenance.txt`,
`postgres-install.log`, `summary.txt`, `normal-suite.log`, the four
`negative-*.log` files, their stdout captures, `hashes-before.txt` /
`hashes-after.txt` / `hashes-diff.txt`, `hashes-verify-diff.txt` /
`hashes-verify-error.txt`, `git-status.txt` and
`final-integrity.txt`. The worktree assertion and the integrity record are
produced **before** the upload, so the bundle always contains them. Logs are
never committed to the repository.

`final-integrity.txt` distinguishes an **absent** artifact (evidence
unavailable) from one that is **present and empty** (no differences recorded)
and one that is **present and nonempty** (content to inspect). The integrity
verdict is never inferred from an existing empty `hashes-diff.txt`: the final
step re-compares `hashes-before.txt` and `hashes-after.txt` itself and maps the
comparison status to `PASS (fresh comparison …)`, `FAIL (…differences…)`,
`FAIL (comparison error …)` or
`NOT RUN (hash capture incomplete — never inferred as PASS)`. A last step,
running after the artifact upload, fails the job when the worktree was modified
or the integrity verdict is not `PASS`.

The PostgreSQL installation step records evidence without losing the original
failure: both its installation pipeline and its status-logging pipeline run
with `errexit` disabled, so a failing `tee` can never mask the installation
exit code. The step reports `install-status=OK`, `FAILED` (exiting with the
original installation code) or `LOG-FAILED` (installation succeeded but
evidence logging did not, exiting nonzero).

### Negative scenarios

Each scenario copies the suite and the 18 migrations into a fresh temporary
directory, applies one defect, asserts via `diff -rq` that the mutation was
really applied, and runs the suite against a brand-new disposable cluster:

| Scenario            | Injected defect                                | Required gate message         |
| ------------------- | ---------------------------------------------- | ----------------------------- |
| `empty`             | case files emptied, nothing executed           | `no results recorded`         |
| `missing-case`      | case `K-007` removed                           | `expected case(s) missing`    |
| `unexpected-case`   | case `Z-999` added, absent from the inventory  | `unexpected case(s) recorded` |
| `wrong-expectation` | case `K-001` given the wrong expected SQLSTATE | `case(s) FAILED`              |

A non-zero exit alone is not enough: the intended gate message must appear.
A setup failure, missing executable or SQL conversion error fails the CI job
and never counts as a passed negative test.

## Files

| File                 | Purpose                                                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `run.sh`             | Disposable-cluster bootstrap, migration replay, suite execution, cleanup                                                        |
| `run-ci.sh`          | CI orchestration: all three suites, twelve negative scenarios, the 8.1A3-C1 default-grant regression, hash and integrity checks |
| `00_bootstrap.sql`   | Minimal Supabase-like surface (`anon`/`authenticated`/`service_role`, `auth.uid`)                                               |
| `10_fixtures.sql`    | Synthetic disposable users and baseline rows                                                                                    |
| `20_constraints.sql` | Prescription JSON, ordering, provenance, idempotency, ownership, adjustments, cascade                                           |
| `30_security.sql`    | Behavioural RLS and grant checks executed under real roles                                                                      |
| `40_catalog.sql`     | Catalog assertions plus grant/policy/index/foreign-key dumps                                                                    |
| `90_report.sql`      | Per-case report, totals and the pass/fail gate                                                                                  |

## Conventions

- Every case has a stable ID (`P-`, `N-`, `O-`, `S-`, `V-`, `I-`, `X-`, `J-`,
  `C-`, `G-`, `K-`), a description and an expected SQLSTATE.
  `00000` means "must succeed".
- `test.run()` executes each case in its own subtransaction, optionally under
  `SET LOCAL ROLE` with an injected `request.jwt.claim.sub`, and records the
  returned SQLSTATE.
- Rejections assert their real SQLSTATE: `23514` CHECK, `23505` unique,
  `23503` foreign key, `23502` NOT NULL, `42501` insufficient privilege.
- No credentials and no real user data appear in any artifact.

The reviewable report lives at
[`docs/architecture/progress-history-core-validation.md`](../../../docs/architecture/progress-history-core-validation.md).
