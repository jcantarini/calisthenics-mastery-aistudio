# Progress History Core — Reproducible Validation Report

**Sprint:** 8.1A1-V1-C1
**Scope:** Executable, reproducible evidence for the Progress History core schema
delivered by Sprint 8.1A1 (base migration + corrections C1 and C2).
**Status:** `8.1A1-V2 — INDEPENDENTLY VALIDATED` (see section 11)
(supersedes `8.1A1-V2 — PENDING INDEPENDENT CI REVIEW` and
`8.1A1-V1-C1 — PENDING INDEPENDENT VALIDATION`; sections 1–9 keep the V1-C1
executor record unchanged, section 10 the CI validation record and section 11
the independent approval.)

This report records results produced by the executor running the committed
suite in `supabase/tests/progress_history_core/` against the final restored
source, plus the independent CI validation recorded in section 11. No
production, preview or shared database was used, read or modified. Sections
1–10 describe a repository state with exactly 18 migrations; Sprint 8.1A2
later added exactly one additive migration for the auxiliary facts (19 in
total) without editing any of the 18, and its evidence lives in
[`progress-history-auxiliary-validation.md`](./progress-history-auxiliary-validation.md).

---

## 1. Environment

| Item              | Value                                                            |
| ----------------- | ---------------------------------------------------------------- |
| Database engine   | `postgres (PostgreSQL) 17.9`                                     |
| Cluster           | Disposable, created by `initdb` in a private temporary directory |
| Connectivity      | Unix socket only (`listen_addresses=''`)                         |
| Ambient `PG*` env | Unset by the runner before `initdb`                              |
| Lifetime          | Created and destroyed by a single `run.sh` execution             |
| Data              | Synthetic users and rows only; no real user data                 |

## 2. Command

```bash
bash supabase/tests/progress_history_core/run.sh /tmp/ph-core-run.log
# exit status: 0
```

The runner executes, in this order: disposable cluster creation (`initdb` +
`pg_ctl` on a private unix socket) → `00_bootstrap.sql` (roles, minimal `auth`
surface, `test.run` harness) → every file in `supabase/migrations/` in filename
order → `10_fixtures.sql` (synthetic users and baseline rows) →
`20_constraints.sql`, `30_security.sql`, `40_catalog.sql` → `90_report.sql`
(per-case report, totals and the pass/fail gate) → cluster destruction.

## 3. Inputs under validation

Migrations replayed (18, SHA-256):

```text
af4ce4c4cf1bd312c9430bca3f5ce0c26178b98de7d06801c29b3091776abe8b  20260720012001_e34119a3-7999-48e1-b2c0-093282486c0b.sql
88d5fdb61b180f44531996092c88ad8f7d1b13f454ee1cdff9ea8eaa7cc8e593  20260720012031_8f846968-6b49-4016-af54-7789840ef2a1.sql
ea047395845f3378596486f8bfb1228d567685e8e59bf0ae01c97dfaa6e0f940  20260721151115_4d2eab82-93f7-4313-bf6b-8544092c0f90.sql
b966e697affb0eb9a4cce1b90ddbdbc33c547010c5699b6043c8379697ac53df  20260722101759_85ab1989-54bb-48b5-ab7e-6f643c9bf9ec.sql
28d494c8c1a00f4315402384fed03343c1113f92a28f960701026bd1a79b96f1  20260727020658_2aef8d1c-6a9f-426d-b72d-630c61987104.sql
ad469a07524007ef165e768feb247a6f350c90baae7df09f9b82409ea16b43f1  20260728055434_a94af019-195f-4dae-bac2-d390fb5c9b5a.sql
e272b5c03be8473b3d3ea8ba37826dadde53101813e68bc9863781aaed2db091  20260729095438_cbe534c2-df48-4aab-915b-ee5bfb09c752.sql
8aaee108f3c0a575d515f0aea121675b79428ff4e33723471c8ee10715490ba1  20260730001127_8087ee13-0c95-4634-b8f6-75feb268f5bb.sql
d141cd1737a319df9206363951e98a4ffb065bb716f5f150b02fc5447ab3ff19  20260801001711_0abd946b-44eb-4948-b5bb-dfed99a65b06.sql
6076161152e17fe31f41bc289d7742c568aa618049e2ea8503ff735a6e560937  20260802000333_9577a2a0-8636-44b6-a172-03739a2204fb.sql
f6e7756b86d3440018827ee7d0efaa1dd86d88a54e5557835bfd94c09d59b65b  20260803143325_e48a6c31-447d-46ee-a518-4712bd59bb76.sql
12f0a153d64ff3d034a6099455b20f7107ac5cf20acd480ff808ff2b889825b2  20260807120629_70103660-be9b-427d-aab0-2ed519feb16d.sql
d3c88fad56e43f5660157a50b293b285a7f102ea11fb8e878f2afb868cc57f3c  20260808002048_e16fe546-ab7b-4fb5-873f-6c42bb975de2.sql
41799dba4b349495a5b7f4ef0fc20aed843957b3214b2bc1882f499f6b0b3802  20260809001054_a430a773-6ac9-495b-86f3-71be84501707.sql
607c0c063f235865e6fe18ea2180e76662917d5a41001fb6b096f906930be00e  20260810194117_799d22dd-2d3e-4c65-ab76-030ebc30692d.sql
f9a9644a915681f958af2b86f6a9b8745291d924b093205ae1556a63e88e8667  20260905091619_6d9b2958-e1e3-412e-9006-2b724e4c82ae.sql
e6cd54a005439c0ef4fc769f1744e8a526482f72f2701a180d0aca03ecb34988  20260907051059_31daeead-1516-4f01-9181-10499728c3ee.sql
03d98a805aa1bc1acd4b35df14f58e0d86f9fc3504a45cc54d6dcc34dcb2ea06  20260908051821_a5c7fdb9-b140-42cd-80ff-420e77cc363a.sql
```

Validation artifacts (SHA-256):

```text
e5ba094a065bf2d8fee9d6858807c0d6c1c24cf646d1d55760565a5adb8542e1  supabase/tests/progress_history_core/00_bootstrap.sql
e6fe80f735e972eede2f3081bb0470024a4a3e04eb0177f218db3a7795951927  supabase/tests/progress_history_core/10_fixtures.sql
d50247c751532424e5daa3aadbe0da8a018f3cdedfcd6618c05ee17bc141610e  supabase/tests/progress_history_core/20_constraints.sql
1fe6cac0b112f56a0fd433058597248a289d3b89dc8e6534fbf945ff238d72c6  supabase/tests/progress_history_core/30_security.sql
1c3806142a926e3d62e09c4f4407ce0e2d0b14f195c982b13f760d7fdb4a76a8  supabase/tests/progress_history_core/40_catalog.sql
b4577f825a2dad5be78e35fff8665d6dbb7d2066fdcad87be0129d6ead0ed229  supabase/tests/progress_history_core/90_report.sql
d115969f93f0b037479215879e1af351a797784800a9819d0b7b6c7ca373e18e  supabase/tests/progress_history_core/README.md
a2ea55357d585368043f262eccbc2a684a33c16244c7c30f4f6bde38fa8ef584  supabase/tests/progress_history_core/run.sh
```

Baseline files verified unchanged at the end of the run (SHA-256):

```text
ae920346cd1def8c08a87fa0cc2179d3d7436532951489cce45fadc79a4b7bb6  package.json
184c717a13a2b402067877f9689afcd83edf96945a9e94f952c73fcb81805058  bun.lock
1aefd6de51f1b3cfb570636f376a35da86ab21ade7c9cd7c1f67053622d27834  src/integrations/supabase/client.ts
a671afdd4bd77cb2db0ffde707fd3d14d45bd005d8120a88e6677c49087feb18  src/integrations/supabase/types.ts
```

`supabase/migrations/` holds exactly 18 files; `package-lock.json` is absent;
`src/integrations/supabase/` contains only `auth-attacher.ts`,
`auth-middleware.ts`, `client.server.ts`, `client.ts` and `types.ts`
(`previewAuthStorage.ts` absent, and no source file imports it).

## 4. Results

Every case asserts an expected SQLSTATE (`00000` = must succeed).

```text
--- Totals by section ---
   section    | cases | positive | negative | failures
--------------+-------+----------+----------+----------
 adjustments  |    14 |        2 |       12 |        0
 cascade      |     3 |        3 |        0 |        0
 catalog      |     7 |        7 |        0 |        0
 grants       |    35 |        8 |       27 |        0
 idempotency  |     2 |        1 |        1 |        0
 ordering     |     5 |        2 |        3 |        0
 ownership    |     7 |        0 |        7 |        0
 prescription |    65 |       15 |       50 |        0
 provenance   |    12 |        4 |        8 |        0
 rls          |     9 |        9 |        0 |        0
 sets         |    10 |        4 |        6 |        0
(11 rows)

--- Grand total ---
 expected_cases | total_cases | positive_cases | negative_cases | passed | failed
----------------+-------------+----------------+----------------+--------+--------
            169 |         169 |             55 |            114 |    169 |      0
(1 row)

--- Rejection SQLSTATE distribution ---
 expected_sqlstate | cases
-------------------+-------
 23502             |     1
 23503             |     7
 23505             |     6
 23514             |    73
 42501             |    27
(5 rows)
```

### 4.1 Per-case outcomes

```text
--- Per-case results ---
 case_id |   section    |     executed_as     | expected_sqlstate | actual_sqlstate | status |                             description
---------+--------------+---------------------+-------------------+-----------------+--------+----------------------------------------------------------------------
 P-001   | prescription | bootstrap_superuser | 00000             | 00000           | PASS   | minimal valid object
 P-002   | prescription | bootstrap_superuser | 00000             | 00000           | PASS   | fully populated valid object
 P-003   | prescription | bootstrap_superuser | 00000             | 00000           | PASS   | planned_sets lower bound 0
 P-004   | prescription | bootstrap_superuser | 00000             | 00000           | PASS   | planned_sets upper bound 100
 P-005   | prescription | bootstrap_superuser | 00000             | 00000           | PASS   | reps_text lower bound 1 char
 P-006   | prescription | bootstrap_superuser | 00000             | 00000           | PASS   | reps_text upper bound 40 chars
 P-007   | prescription | bootstrap_superuser | 00000             | 00000           | PASS   | rest_seconds lower bound 0
 P-008   | prescription | bootstrap_superuser | 00000             | 00000           | PASS   | rest_seconds upper bound 3600
 P-009   | prescription | bootstrap_superuser | 00000             | 00000           | PASS   | legitimate internal whitespace in reps_text
 P-010   | prescription | bootstrap_superuser | 00000             | 00000           | PASS   | tempo upper bound 24 chars
 P-011   | prescription | bootstrap_superuser | 00000             | 00000           | PASS   | focus_text upper bound 120 chars
 P-012   | prescription | bootstrap_superuser | 00000             | 00000           | PASS   | prescription_note upper bound 400 chars
 P-013   | prescription | bootstrap_superuser | 00000             | 00000           | PASS   | rest_text upper bound 40 chars
 P-014   | prescription | bootstrap_superuser | 00000             | 00000           | PASS   | focus_key with every allowed character class
 P-015   | prescription | bootstrap_superuser | 00000             | 00000           | PASS   | planned_sets integral value in decimal notation
 N-001   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | missing required version
 N-002   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | missing required planned_sets
 N-003   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | missing required reps_text
 N-004   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | unknown key rejected by closed matrix
 N-005   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | version explicit JSON null
 N-006   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | planned_sets explicit JSON null
 N-007   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | reps_text explicit JSON null
 N-008   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | rest_text explicit JSON null
 N-009   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | rest_seconds explicit JSON null
 N-010   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | tempo explicit JSON null
 N-011   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | focus_key explicit JSON null
 N-012   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | focus_text explicit JSON null
 N-013   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | prescription_note explicit JSON null
 N-014   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | version as numeric string "1"
 N-015   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | planned_sets as non-numeric string "abc"
 N-016   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | planned_sets as numeric string "3"
 N-017   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | reps_text as number
 N-018   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | rest_seconds as non-numeric string "abc"
 N-019   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | version other than 1
 N-020   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | planned_sets below lower bound
 N-021   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | planned_sets above upper bound
 N-022   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | planned_sets fractional
 N-023   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | rest_seconds below lower bound
 N-024   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | rest_seconds above upper bound
 N-025   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | rest_seconds fractional
 N-026   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | reps_text one character beyond maximum
 N-027   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | reps_text empty string
 N-028   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | reps_text with leading space
 N-029   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | reps_text with trailing space
 N-030   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | reps_text wrapped in tabs
 N-031   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | reps_text wrapped in line breaks
 N-032   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | reps_text whitespace only
 N-033   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | short reps_text padded with 3000 spaces
 N-034   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | rest_text one character beyond maximum
 N-035   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | rest_text whitespace only
 N-036   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | tempo one character beyond maximum
 N-037   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | focus_text one character beyond maximum
 N-038   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | prescription_note one character beyond maximum
 N-039   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | focus_key with disallowed character
 N-040   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | focus_key one character beyond maximum
 N-041   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | payload is a JSON array
 N-042   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | payload is a JSON string
 N-043   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | payload is a JSON number
 N-044   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | payload is a JSON boolean
 N-045   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | payload is JSON null
 N-046   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | payload is an empty object
 N-047   | prescription | bootstrap_superuser | 23502             | 23502           | PASS   | payload is SQL NULL (NOT NULL violation)
 N-048   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | focus_text with leading space
 N-049   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | tempo with trailing line break
 N-050   | prescription | bootstrap_superuser | 23514             | 23514           | PASS   | prescription_note whitespace only
 O-001   | ordering     | bootstrap_superuser | 00000             | 00000           | PASS   | exercise order_index lower bound 0
 O-002   | ordering     | bootstrap_superuser | 00000             | 00000           | PASS   | exercise order_index upper bound 59
 O-003   | ordering     | bootstrap_superuser | 23514             | 23514           | PASS   | exercise order_index -1 rejected
 O-004   | ordering     | bootstrap_superuser | 23514             | 23514           | PASS   | exercise order_index 60 rejected
 O-005   | ordering     | bootstrap_superuser | 23505             | 23505           | PASS   | duplicate exercise order position rejected
 S-001   | sets         | bootstrap_superuser | 00000             | 00000           | PASS   | set_index lower bound 0
 S-002   | sets         | bootstrap_superuser | 00000             | 00000           | PASS   | set_index upper bound 99
 S-003   | sets         | bootstrap_superuser | 23514             | 23514           | PASS   | set_index -1 rejected
 S-004   | sets         | bootstrap_superuser | 23514             | 23514           | PASS   | set_index 100 rejected
 S-005   | sets         | bootstrap_superuser | 23505             | 23505           | PASS   | duplicate set position rejected
 S-006   | sets         | bootstrap_superuser | 23514             | 23514           | PASS   | completed set without evidence rejected
 S-007   | sets         | bootstrap_superuser | 00000             | 00000           | PASS   | rpe half-point value accepted
 S-008   | sets         | bootstrap_superuser | 23514             | 23514           | PASS   | rpe off-grid value rejected
 S-009   | sets         | bootstrap_superuser | 23514             | 23514           | PASS   | rpe below lower bound rejected
 S-010   | sets         | bootstrap_superuser | 00000             | 00000           | PASS   | rpe upper bound 10 accepted
 V-001   | provenance   | bootstrap_superuser | 00000             | 00000           | PASS   | plan_workout with both plan references
 V-002   | provenance   | bootstrap_superuser | 23514             | 23514           | PASS   | plan_workout without source_plan_id
 V-003   | provenance   | bootstrap_superuser | 23514             | 23514           | PASS   | plan_workout without source_planned_workout_id
 V-004   | provenance   | bootstrap_superuser | 23514             | 23514           | PASS   | plan_workout without any plan reference
 V-005   | provenance   | bootstrap_superuser | 23514             | 23514           | PASS   | adhoc_workout carrying source_plan_id
 V-006   | provenance   | bootstrap_superuser | 23514             | 23514           | PASS   | adhoc_workout carrying source_planned_workout_id
 V-007   | provenance   | bootstrap_superuser | 23514             | 23514           | PASS   | adhoc_workout carrying plan_name_snapshot
 V-008   | provenance   | bootstrap_superuser | 23514             | 23514           | PASS   | adhoc_workout carrying week_number_snapshot
 V-009   | provenance   | bootstrap_superuser | 23514             | 23514           | PASS   | adhoc_workout carrying day_number_snapshot
 V-010   | provenance   | bootstrap_superuser | 00000             | 00000           | PASS   | timer_session without plan fields
 V-011   | provenance   | bootstrap_superuser | 00000             | 00000           | PASS   | first_workout without plan fields
 V-012   | provenance   | bootstrap_superuser | 00000             | 00000           | PASS   | plan_workout with full plan snapshot fields
 I-001   | idempotency  | bootstrap_superuser | 23505             | 23505           | PASS   | duplicate ingestion_key for the same user rejected
 I-002   | idempotency  | bootstrap_superuser | 00000             | 00000           | PASS   | same ingestion_key accepted for a different user
 X-001   | ownership    | bootstrap_superuser | 23503             | 23503           | PASS   | exercise under another user's session rejected
 X-002   | ownership    | bootstrap_superuser | 23503             | 23503           | PASS   | set under another user's exercise rejected
 X-003   | ownership    | bootstrap_superuser | 23503             | 23503           | PASS   | adjustment targeting another user's session rejected
 X-004   | ownership    | bootstrap_superuser | 23503             | 23503           | PASS   | adjustment replacing with another user's session rejected
 J-001   | adjustments  | bootstrap_superuser | 00000             | 00000           | PASS   | valid correction with replacement session
 J-002   | adjustments  | bootstrap_superuser | 23514             | 23514           | PASS   | void carrying a replacement session rejected
 J-003   | adjustments  | bootstrap_superuser | 23514             | 23514           | PASS   | correction without replacement session rejected
 J-004   | adjustments  | bootstrap_superuser | 23514             | 23514           | PASS   | replacement identical to target rejected
 J-005   | adjustments  | bootstrap_superuser | 23514             | 23514           | PASS   | user actor without actor_id rejected
 J-006   | adjustments  | bootstrap_superuser | 23514             | 23514           | PASS   | user actor different from owner rejected
 J-007   | adjustments  | bootstrap_superuser | 23514             | 23514           | PASS   | system actor carrying actor_id rejected
 J-008   | adjustments  | bootstrap_superuser | 23505             | 23505           | PASS   | duplicate adjustment_key for the same user rejected
 J-009   | adjustments  | bootstrap_superuser | 23505             | 23505           | PASS   | second adjustment for the same target session rejected
 J-010   | adjustments  | bootstrap_superuser | 23505             | 23505           | PASS   | replacement session reused by a second correction rejected
 J-011   | adjustments  | bootstrap_superuser | 23514             | 23514           | PASS   | malformed command_fingerprint rejected
 J-012   | adjustments  | bootstrap_superuser | 23514             | 23514           | PASS   | reason_code outside allowed pattern rejected
 J-013   | adjustments  | bootstrap_superuser | 23514             | 23514           | PASS   | reason_text one character beyond maximum rejected
 J-014   | adjustments  | bootstrap_superuser | 00000             | 00000           | PASS   | valid system void accepted
 C-001   | cascade      | bootstrap_superuser | 00000             | 00000           | PASS   | disposable user C owns one row in each history table
 C-002   | cascade      | bootstrap_superuser | 00000             | 00000           | PASS   | deleting the auth user succeeds
 C-003   | cascade      | bootstrap_superuser | 00000             | 00000           | PASS   | all history rows for the deleted user are gone
 G-001   | rls          | authenticated       | 00000             | 00000           | PASS   | A reads its own workout_sessions rows
 G-002   | rls          | authenticated       | 00000             | 00000           | PASS   | A reads its own workout_session_exercises rows
 G-003   | rls          | authenticated       | 00000             | 00000           | PASS   | A reads its own workout_session_sets rows
 G-004   | rls          | authenticated       | 00000             | 00000           | PASS   | A reads its own workout_session_adjustments rows
 G-005   | rls          | authenticated       | 00000             | 00000           | PASS   | A cannot read B workout_sessions rows
 G-006   | rls          | authenticated       | 00000             | 00000           | PASS   | A cannot read B workout_session_exercises rows
 G-007   | rls          | authenticated       | 00000             | 00000           | PASS   | A cannot read B workout_session_sets rows
 G-008   | rls          | authenticated       | 00000             | 00000           | PASS   | A cannot read B workout_session_adjustments rows
 G-009   | rls          | authenticated       | 00000             | 00000           | PASS   | B reads only its own workout_sessions rows
 G-010   | grants       | authenticated       | 42501             | 42501           | PASS   | authenticated INSERT into workout_sessions denied
 G-011   | grants       | authenticated       | 42501             | 42501           | PASS   | authenticated INSERT into workout_session_exercises denied
 G-012   | grants       | authenticated       | 42501             | 42501           | PASS   | authenticated INSERT into workout_session_sets denied
 G-013   | grants       | authenticated       | 42501             | 42501           | PASS   | authenticated INSERT into workout_session_adjustments denied
 G-014   | grants       | authenticated       | 42501             | 42501           | PASS   | authenticated UPDATE on workout_sessions denied
 G-015   | grants       | authenticated       | 42501             | 42501           | PASS   | authenticated UPDATE on workout_session_exercises denied
 G-016   | grants       | authenticated       | 42501             | 42501           | PASS   | authenticated UPDATE on workout_session_sets denied
 G-017   | grants       | authenticated       | 42501             | 42501           | PASS   | authenticated UPDATE on workout_session_adjustments denied
 G-018   | grants       | authenticated       | 42501             | 42501           | PASS   | authenticated DELETE on workout_sessions denied
 G-019   | grants       | authenticated       | 42501             | 42501           | PASS   | authenticated DELETE on workout_session_exercises denied
 G-020   | grants       | authenticated       | 42501             | 42501           | PASS   | authenticated DELETE on workout_session_sets denied
 G-021   | grants       | authenticated       | 42501             | 42501           | PASS   | authenticated DELETE on workout_session_adjustments denied
 G-022   | grants       | anon                | 42501             | 42501           | PASS   | anon SELECT on workout_sessions denied
 G-023   | grants       | anon                | 42501             | 42501           | PASS   | anon SELECT on workout_session_exercises denied
 G-024   | grants       | anon                | 42501             | 42501           | PASS   | anon SELECT on workout_session_sets denied
 G-025   | grants       | anon                | 42501             | 42501           | PASS   | anon SELECT on workout_session_adjustments denied
 G-026   | grants       | anon                | 42501             | 42501           | PASS   | anon INSERT into workout_sessions denied
 G-027   | grants       | anon                | 42501             | 42501           | PASS   | anon UPDATE on workout_sessions denied
 G-028   | grants       | anon                | 42501             | 42501           | PASS   | anon DELETE on workout_session_sets denied
 G-029   | grants       | service_role        | 00000             | 00000           | PASS   | service_role SELECT on workout_sessions allowed and bypasses RLS
 G-030   | grants       | service_role        | 00000             | 00000           | PASS   | service_role SELECT on workout_session_exercises allowed
 G-031   | grants       | service_role        | 00000             | 00000           | PASS   | service_role SELECT on workout_session_sets allowed
 G-032   | grants       | service_role        | 00000             | 00000           | PASS   | service_role SELECT on workout_session_adjustments allowed
 G-033   | grants       | service_role        | 00000             | 00000           | PASS   | service_role INSERT into workout_sessions allowed
 G-034   | grants       | service_role        | 00000             | 00000           | PASS   | service_role INSERT into workout_session_exercises allowed
 G-035   | grants       | service_role        | 00000             | 00000           | PASS   | service_role INSERT into workout_session_sets allowed
 G-036   | grants       | service_role        | 00000             | 00000           | PASS   | service_role INSERT into workout_session_adjustments allowed
 G-037   | grants       | service_role        | 42501             | 42501           | PASS   | service_role UPDATE on workout_sessions denied
 G-038   | grants       | service_role        | 42501             | 42501           | PASS   | service_role UPDATE on workout_session_exercises denied
 G-039   | grants       | service_role        | 42501             | 42501           | PASS   | service_role UPDATE on workout_session_sets denied
 G-040   | grants       | service_role        | 42501             | 42501           | PASS   | service_role UPDATE on workout_session_adjustments denied
 G-041   | grants       | service_role        | 42501             | 42501           | PASS   | service_role DELETE on workout_sessions denied
 G-042   | grants       | service_role        | 42501             | 42501           | PASS   | service_role DELETE on workout_session_exercises denied
 G-043   | grants       | service_role        | 42501             | 42501           | PASS   | service_role DELETE on workout_session_sets denied
 G-044   | grants       | service_role        | 42501             | 42501           | PASS   | service_role DELETE on workout_session_adjustments denied
 G-045   | ownership    | service_role        | 23503             | 23503           | PASS   | service_role cannot attach an exercise to another user's session
 G-046   | ownership    | service_role        | 23503             | 23503           | PASS   | service_role cannot attach a set to another user's exercise
 G-047   | ownership    | service_role        | 23503             | 23503           | PASS   | service_role cannot target another user's session in an adjustment
 K-001   | catalog      | bootstrap_superuser | 00000             | 00000           | PASS   | RLS enabled on all four history tables
 K-002   | catalog      | bootstrap_superuser | 00000             | 00000           | PASS   | exactly one SELECT policy per history table, scoped to authenticated
 K-003   | catalog      | bootstrap_superuser | 00000             | 00000           | PASS   | anon holds no privilege on any history table
 K-004   | catalog      | bootstrap_superuser | 00000             | 00000           | PASS   | authenticated holds SELECT only
 K-005   | catalog      | bootstrap_superuser | 00000             | 00000           | PASS   | service_role holds SELECT and INSERT only
 K-006   | catalog      | bootstrap_superuser | 00000             | 00000           | PASS   | no trigger, function, view or RPC added by the history domain
 K-007   | catalog      | bootstrap_superuser | 00000             | 00000           | PASS   | no residual 2048-byte prescription size constraint
(169 rows)
```

## 5. Catalog evidence

```text
--- RLS flags ---
           relname           | relrowsecurity | relforcerowsecurity
-----------------------------+----------------+---------------------
 workout_session_adjustments | t              | f
 workout_session_exercises   | t              | f
 workout_session_sets        | t              | f
 workout_sessions            | t              | f
(4 rows)

--- Policies ---
          tablename          |                  policyname                  |  cmd   |      roles      |                  qual
-----------------------------+----------------------------------------------+--------+-----------------+-----------------------------------------
 workout_session_adjustments | Users can read their own session adjustments | SELECT | {authenticated} | (( SELECT auth.uid() AS uid) = user_id)
 workout_session_exercises   | Users can read their own session exercises   | SELECT | {authenticated} | (( SELECT auth.uid() AS uid) = user_id)
 workout_session_sets        | Users can read their own session sets        | SELECT | {authenticated} | (( SELECT auth.uid() AS uid) = user_id)
 workout_sessions            | Users can read their own workout sessions    | SELECT | {authenticated} | (( SELECT auth.uid() AS uid) = user_id)
(4 rows)

--- Effective grants ---
         table_name          |    grantee    | privilege_type
-----------------------------+---------------+----------------
 workout_session_adjustments | authenticated | SELECT
 workout_session_adjustments | service_role  | INSERT
 workout_session_adjustments | service_role  | SELECT
 workout_session_exercises   | authenticated | SELECT
 workout_session_exercises   | service_role  | INSERT
 workout_session_exercises   | service_role  | SELECT
 workout_session_sets        | authenticated | SELECT
 workout_session_sets        | service_role  | INSERT
 workout_session_sets        | service_role  | SELECT
 workout_sessions            | authenticated | SELECT
 workout_sessions            | service_role  | INSERT
 workout_sessions            | service_role  | SELECT
(12 rows)

--- Foreign keys ---
         table_name          |                   conname                    |                                                   definition
-----------------------------+----------------------------------------------+----------------------------------------------------------------------------------------------------------------
 workout_sessions            | workout_sessions_user_id_fkey                | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
 workout_session_exercises   | workout_session_exercises_session_fkey       | FOREIGN KEY (session_id, user_id) REFERENCES workout_sessions(id, user_id) ON DELETE CASCADE
 workout_session_exercises   | workout_session_exercises_user_id_fkey       | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
 workout_session_sets        | workout_session_sets_exercise_fkey           | FOREIGN KEY (session_exercise_id, user_id) REFERENCES workout_session_exercises(id, user_id) ON DELETE CASCADE
 workout_session_sets        | workout_session_sets_user_id_fkey            | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
 workout_session_adjustments | workout_session_adjustments_replacement_fkey | FOREIGN KEY (replacement_session_id, user_id) REFERENCES workout_sessions(id, user_id)
 workout_session_adjustments | workout_session_adjustments_target_fkey      | FOREIGN KEY (target_session_id, user_id) REFERENCES workout_sessions(id, user_id)
 workout_session_adjustments | workout_session_adjustments_user_id_fkey     | FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
(8 rows)

--- Indexes ---
          tablename          |                      indexname                      |                                                                                           indexdef
-----------------------------+-----------------------------------------------------+-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 workout_session_adjustments | workout_session_adjustments_id_user_id_key          | CREATE UNIQUE INDEX workout_session_adjustments_id_user_id_key ON public.workout_session_adjustments USING btree (id, user_id)
 workout_session_adjustments | workout_session_adjustments_pkey                    | CREATE UNIQUE INDEX workout_session_adjustments_pkey ON public.workout_session_adjustments USING btree (id)
 workout_session_adjustments | workout_session_adjustments_replacement_session_key | CREATE UNIQUE INDEX workout_session_adjustments_replacement_session_key ON public.workout_session_adjustments USING btree (replacement_session_id) WHERE (replacement_session_id IS NOT NULL)
 workout_session_adjustments | workout_session_adjustments_replacement_user_idx    | CREATE INDEX workout_session_adjustments_replacement_user_idx ON public.workout_session_adjustments USING btree (replacement_session_id, user_id) WHERE (replacement_session_id IS NOT NULL)
 workout_session_adjustments | workout_session_adjustments_target_session_key      | CREATE UNIQUE INDEX workout_session_adjustments_target_session_key ON public.workout_session_adjustments USING btree (target_session_id)
 workout_session_adjustments | workout_session_adjustments_target_user_idx         | CREATE INDEX workout_session_adjustments_target_user_idx ON public.workout_session_adjustments USING btree (target_session_id, user_id)
 workout_session_adjustments | workout_session_adjustments_user_key_key            | CREATE UNIQUE INDEX workout_session_adjustments_user_key_key ON public.workout_session_adjustments USING btree (user_id, adjustment_key)
 workout_session_adjustments | workout_session_adjustments_user_timeline_idx       | CREATE INDEX workout_session_adjustments_user_timeline_idx ON public.workout_session_adjustments USING btree (user_id, occurred_at DESC, id DESC)
 workout_session_exercises   | workout_session_exercises_id_user_id_key            | CREATE UNIQUE INDEX workout_session_exercises_id_user_id_key ON public.workout_session_exercises USING btree (id, user_id)
 workout_session_exercises   | workout_session_exercises_pkey                      | CREATE UNIQUE INDEX workout_session_exercises_pkey ON public.workout_session_exercises USING btree (id)
 workout_session_exercises   | workout_session_exercises_session_order_key         | CREATE UNIQUE INDEX workout_session_exercises_session_order_key ON public.workout_session_exercises USING btree (session_id, order_index)
 workout_session_exercises   | workout_session_exercises_session_user_idx          | CREATE INDEX workout_session_exercises_session_user_idx ON public.workout_session_exercises USING btree (session_id, user_id)
 workout_session_exercises   | workout_session_exercises_user_exercise_idx         | CREATE INDEX workout_session_exercises_user_exercise_idx ON public.workout_session_exercises USING btree (user_id, exercise_id) WHERE (exercise_id IS NOT NULL)
 workout_session_exercises   | workout_session_exercises_user_idx                  | CREATE INDEX workout_session_exercises_user_idx ON public.workout_session_exercises USING btree (user_id)
 workout_session_sets        | workout_session_sets_exercise_set_index_key         | CREATE UNIQUE INDEX workout_session_sets_exercise_set_index_key ON public.workout_session_sets USING btree (session_exercise_id, set_index)
 workout_session_sets        | workout_session_sets_exercise_user_idx              | CREATE INDEX workout_session_sets_exercise_user_idx ON public.workout_session_sets USING btree (session_exercise_id, user_id)
 workout_session_sets        | workout_session_sets_pkey                           | CREATE UNIQUE INDEX workout_session_sets_pkey ON public.workout_session_sets USING btree (id)
 workout_session_sets        | workout_session_sets_user_idx                       | CREATE INDEX workout_session_sets_user_idx ON public.workout_session_sets USING btree (user_id)
 workout_sessions            | workout_sessions_id_user_id_key                     | CREATE UNIQUE INDEX workout_sessions_id_user_id_key ON public.workout_sessions USING btree (id, user_id)
 workout_sessions            | workout_sessions_pkey                               | CREATE UNIQUE INDEX workout_sessions_pkey ON public.workout_sessions USING btree (id)
 workout_sessions            | workout_sessions_timeline_idx                       | CREATE INDEX workout_sessions_timeline_idx ON public.workout_sessions USING btree (user_id, occurred_at DESC, id DESC)
 workout_sessions            | workout_sessions_user_ingestion_key_key             | CREATE UNIQUE INDEX workout_sessions_user_ingestion_key_key ON public.workout_sessions USING btree (user_id, ingestion_key)
 workout_sessions            | workout_sessions_user_local_day_idx                 | CREATE INDEX workout_sessions_user_local_day_idx ON public.workout_sessions USING btree (user_id, local_day)
 workout_sessions            | workout_sessions_user_source_planned_workout_idx    | CREATE INDEX workout_sessions_user_source_planned_workout_idx ON public.workout_sessions USING btree (user_id, source_planned_workout_id) WHERE (source_planned_workout_id IS NOT NULL)
(24 rows)

--- Check constraints ---
         table_name          | check_constraints
-----------------------------+-------------------
 workout_sessions            |                22
 workout_session_exercises   |                20
 workout_session_sets        |                10
 workout_session_adjustments |                10
(4 rows)

== report ==
```

## 6. Gate self-test (V1-C1 execution)

The empty-results branch of the gate previously appended an untyped literal to
the problem array. It now uses `array_append(..., '...'::text)`, so the empty
suite reaches the intended gate exception instead of a conversion error.

To prove the runner cannot report success silently, four deliberately broken
runs were executed against scratch copies of the suite under `/tmp/gate/`
(outside the repository, pointing at byte-identical copies of the same 18
migrations). Nothing broken was committed. Each run is reported with its real
runner exit status and the real gate message from its log.

| #   | Injected defect                                                 | Actual gate message                                                                                                                               | `run.sh` exit |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 1   | Constraint, security and catalog suites skipped (empty results) | `progress_history_core suite FAILED: no results recorded (empty suite execution); 169 expected case(s) missing; recorded 0 case(s), expected 169` | 1             |
| 2   | Case `K-007` removed from `40_catalog.sql`                      | `progress_history_core suite FAILED: 1 expected case(s) missing; recorded 168 case(s), expected 169`                                              | 1             |
| 3   | Extra case `Z-999` appended to `40_catalog.sql`                 | `progress_history_core suite FAILED: 1 unexpected case(s) recorded; recorded 170 case(s), expected 169`                                           | 1             |
| 4   | `K-007` expectation changed from `00000` to `23514`             | `progress_history_core suite FAILED: 1 case(s) FAILED; 1 case(s) without PASS status`                                                             | 1             |

Each failure message names the injected defect; none of the four failed through
a SQL conversion error, a missing executable or a setup failure. The unmodified
committed suite run remains: 169 expected IDs, 169 recorded cases, 0 failures,
`run.sh` exit `0`.

## 7. Repository checks (final restored source)

Executed at the repository root with Bun, after restoring the baseline files
(`package.json`, `bun.lock`, `src/integrations/supabase/client.ts`) to their
expected bytes and removing the reintroduced
`src/integrations/supabase/previewAuthStorage.ts`. No earlier revision's result
is reused as evidence.

| Command                                                                                   | Exit | Outcome                                                                   |
| ----------------------------------------------------------------------------------------- | ---- | ------------------------------------------------------------------------- |
| `bun run typecheck`                                                                       | 0    | No TypeScript errors                                                      |
| `bun run test:run`                                                                        | 0    | 23 test files, 355 tests, all passing                                     |
| `bun run lint`                                                                            | 0    | 0 errors, 13 pre-existing `react-refresh/only-export-components` warnings |
| `bun run build`                                                                           | 0    | Production build succeeded                                                |
| `bunx prettier --check docs/architecture/ supabase/tests/progress_history_core/README.md` | 0    | Clean                                                                     |
| `bash -n supabase/tests/progress_history_core/run.sh`                                     | 0    | Valid shell syntax                                                        |

No dependency was installed and no lockfile or generated type file was
regenerated for these checks.

## 8. What this report does and does not establish

Established by execution:

- All 18 migrations apply cleanly, in order, to an empty PostgreSQL 17 cluster.
- Structural CHECK constraints reject malformed prescription snapshots with
  `23514` and never surface `22P02`.
- Numeric, textual, ordering, provenance, idempotency and adjustment rules
  behave exactly as specified in the ratified domain contract.
- Composite ownership foreign keys prevent cross-user rows; deleting an auth
  user removes all of that user's history rows.
- Under real roles: `anon` has no privilege, `authenticated` may only read its
  own rows, `service_role` may read and insert but not update or delete.
- The domain adds no trigger, function, view or RPC, and no residual
  2048-byte prescription size constraint exists.

Not established, and deliberately out of scope:

- Canonical serialization and the exact 2048-byte prescription-snapshot limit
  remain unimplemented in the database and will be enforced by the trusted
  ingestion boundary before storage and fingerprinting.
- The bootstrap reproduces a minimal Supabase-like surface (`anon`,
  `authenticated`, `service_role`, `auth.users`, `auth.uid()`); it is not the
  hosted platform, so platform-level behaviour (GoTrue, PostgREST, connection
  pooling, hosted role configuration) is not covered.
- The ingestion boundary, outbox, coordinator and any UI are not implemented
  and therefore not validated.
- Results were produced by the same agent that authored the suite; independent
  re-execution is required before this evidence may be treated as accepted.

## 9. Status

`8.1A1-V1-C1 — PENDING INDEPENDENT VALIDATION`

---

## 10. CI validation record (Sprint 8.1A1-V2)

Sections 1–9 above remain the **executor** record of the V1-C1 run and are not
restated here. This section records the continuous-integration validation
layer added by Sprint 8.1A1-V2. It distinguishes three different things:
workflow creation, local orchestration execution by the executor, and an
independent GitHub Actions run.

### 10.1 Artifacts created

| File                                             | SHA-256                                                            | Purpose                                                             |
| ------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------- |
| `.github/workflows/progress-history-core.yml`    | `d82824e57c5b36efca997b353f6dfb7dc3e58d87d40be8a9e9ea303ef61d6f00` | GitHub Actions job (Ubuntu 24.04, pinned PostgreSQL 17.9 from PGDG) |
| `supabase/tests/progress_history_core/run-ci.sh` | `a187b5488bf69c49946ddcdeb1e633067e49881ec5f044aa961a6733d7fd1cad` | Baseline enforcement + normal suite + four negative scenarios       |

The committed runner `run.sh`, the SQL case files, `90_report.sql`, the 18
migrations, generated types and all application source are unchanged.

### 10.2 Workflow definition

- Triggers: `workflow_dispatch`, plus `push` and `pull_request` filtered to the
  workflow file, `supabase/migrations/**` and
  `supabase/tests/progress_history_core/**`.
- Permissions: `contents: read` only. No `pull_request_target`, no write scope,
  no deployment, no repository-settings change.
- Runner: `ubuntu-24.04`, `actions/checkout@v4` with `persist-credentials: false`.
- PostgreSQL tooling is pinned to the exact PGDG package version
  `17.9-1.pgdg24.04+1` for both `postgresql-17` and `postgresql-client-17`
  (verified present in the `noble-pgdg` package index), matching the 17.9
  evidence of the V1-C1 executor run. `apt-get install` uses the exact version
  specifier, so an unavailable pin fails the job instead of silently
  installing another patch release; a `dpkg-query` assertion re-checks the
  installed version after installation.
- `initdb`/`postgres` execute as the runner's real non-root `runner` account.
- No application secrets, Supabase keys or production credentials are used;
  the suite builds its own disposable cluster with synthetic data only.
- Ordering: the artifact directory is created **before** the PostgreSQL
  installation step, then installation, provenance, the suite step, then the
  worktree assertion producing `git-status.txt`, then `final-integrity.txt`,
  then the artifact upload (`if: always()`), and only afterwards the step that
  fails the job when the worktree was modified — so the uploaded bundle always
  contains the final integrity result.
- Installation evidence: GitHub executes `run:` steps with `bash -e`, and
  `set -uo pipefail` does not clear that inherited `errexit`. The step
  therefore disables `errexit` explicitly around the installation pipeline,
  keeps fail-fast inside the installation subprocess (`set -euo pipefail`, so a
  failed command prevents every later installation command), captures
  `PIPESTATUS` immediately into an array before any other command replaces it,
  and records `install exit status`, the log-write status, `install-status=` and
  `PG_INSTALL_OK=` **before** exiting with the original nonzero installation
  code. A logging failure is never reported as successful evidence: it emits an
  error annotation and fails the step even when the installation itself
  succeeded. The exact package pin is unchanged and no
  `continue-on-error` is used. When installation fails the job stays failed,
  provenance and the suite are skipped, `final-integrity.txt` reports
  `suite execution: NOT RUN (PostgreSQL tooling unavailable)`, and the partial
  evidence is still uploaded.
- Empty-artifact semantics: the final collection step re-creates its own output
  directory if needed and classifies each artifact as **absent** (evidence
  unavailable), **present and empty** (nothing recorded / no differences) or
  **present and nonempty** (content to inspect).
- Integrity verdict: the final step never infers equality from the existence of
  an empty `hashes-diff.txt`. It performs its own comparison of
  `hashes-before.txt` and `hashes-after.txt`, writing
  `hashes-verify-diff.txt` and `hashes-verify-error.txt`, and maps the
  comparison exit status to four distinct outcomes: `0` → `PASS (fresh
comparison …)`, `1` → `FAIL (differences recorded …)`, any other status →
  `FAIL (comparison error …)`, and absent or empty manifests →
  `NOT RUN (hash capture incomplete — never inferred as PASS)`. The verdict is
  exported as `INTEGRITY_OK`; the runner-produced `hashes-diff.txt` is retained
  as evidence only.
- Deferred gate: a final step, running after evidence collection **and** after
  the artifact upload, fails the job when the worktree was modified or when
  `INTEGRITY_OK` is not `true`, so an integrity failure can never be reduced to
  an informational line while the evidence bundle is still preserved.

### 10.3 Orchestration contract (`run-ci.sh`)

The script fails the CI validation (non-zero exit) unless **all** of the
following hold:

1. Baseline enforcement, before any PostgreSQL work: the four frozen inputs
   must match these exact SHA-256 values —
   `package.json` `ae920346…4b7bb6`, `bun.lock` `184c717a…805058`,
   `src/integrations/supabase/client.ts` `1aefd6de…d27834`,
   `src/integrations/supabase/types.ts` `a671afdd…7feb18` — plus
   `previewAuthStorage.ts` absent, `package-lock.json` absent, exactly 18
   migrations and `@lovable.dev/vite-tanstack-config` exactly `2.12.0`. A
   missing file or any mismatch aborts with a clear non-zero result and
   PostgreSQL is never started.
2. Baseline-enforcement self-check: a temporary copy of the baseline receives a
   one-byte mutation and must be rejected by the same enforcement routine. The
   committed baseline is never modified by this check.
3. Normal suite: the committed `run.sh` exits `0` and the gate reports
   `progress_history_core suite PASSED: 169 / 169 case(s)`.
4. Four negative scenarios, each on a **separate** disposable copy of the suite
   with identical migrations and a fresh cluster, each proven mutated
   (`diff -rq` against the committed suite must differ), each exiting non-zero
   with its intended gate message. A setup failure, a missing executable or an
   absent gate message is treated as a CI failure, never as a passed negative
   test.
5. Post-run integrity: the before/after hash sets are identical.

The execution-input manifest hashed before and after the run covers the four
baseline files, the workflow file, `run.sh`, `run-ci.sh`, the 18 migrations and
the suite SQL files (31 entries).

Final evidence collection runs from a bash `EXIT` trap, so `hashes-after.txt`,
`hashes-diff.txt` and a status block are produced even when execution aborts
early — including a failed normal suite. The trap never converts a failure into
success: it preserves the original failure reason, treats an integrity-check
failure as a validation failure, and labels every phase that could not run as
`NOT RUN`.

Logs and temporary databases are written outside tracked project files
(`/tmp/ph-core-artifacts`, disposable `mktemp -d` clusters) and are not
committed.

### 10.4 Executor orchestration run (local, not CI)

`bash supabase/tests/progress_history_core/run-ci.sh /tmp/ph-core-artifacts`
executed by the executor in the disposable sandbox, PostgreSQL 17.9, overall
exit status `0`:

| Phase                              | Result | Evidence                                                                                                              |
| ---------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------- |
| Baseline enforcement               | PASS   | four exact hashes matched, 18 migrations, config `2.12.0`, forbidden files absent                                     |
| Baseline self-check (mutated copy) | PASS   | mutated temporary copy rejected, committed baseline untouched                                                         |
| Normal suite                       | PASS   | exit 0, `progress_history_core suite PASSED: 169 / 169 case(s)`                                                       |
| A — empty results                  | PASS   | exit 1, `no results recorded (empty suite execution); 169 expected case(s) missing; recorded 0 case(s), expected 169` |
| B — missing expected case          | PASS   | exit 1, `1 expected case(s) missing; recorded 168 case(s), expected 169`                                              |
| C — unexpected case                | PASS   | exit 1, `1 unexpected case(s) recorded; recorded 170 case(s), expected 169`                                           |
| D — wrong SQLSTATE expectation     | PASS   | exit 1, `1 case(s) FAILED; 1 case(s) without PASS status`                                                             |
| Post-run integrity                 | PASS   | before/after manifests identical                                                                                      |

A prior run of the same script in a workspace where the platform had
re-injected drifted `package.json`, `bun.lock` and `client.ts` (and recreated
`previewAuthStorage.ts`) aborted at phase 1 with
`CI VALIDATION FAILED: validated baseline not present — refusing to run PostgreSQL`,
the finalizer still produced `hashes-after.txt`/`hashes-diff.txt`, and every
later phase was reported as `NOT RUN`. This is the negative demonstration of
baseline enforcement and of the always-on finalizer.

Both runs are still **executor** evidence: they demonstrate that the
orchestration script and its gate behave as specified, not that an independent
CI run occurred.

### 10.5 GitHub Actions execution

Target repository: `https://github.com/jcantarini/calisthenics-mastery`,
branch `sprint-8.1`.

Three distinct facts must not be conflated:

1. **The GitHub repository supplied by the sprint** — `jcantarini/calisthenics-mastery`.
   Its existence or state is **not** determined by this sandbox; no claim is
   made here that it is absent.
2. **The sandbox's configured git remote** — `origin` points to the
   Lovable-hosted repository (`git.private.lovable-gcp.code.storage/...`) with
   an S3 mirror as `secondary`. No GitHub remote is configured here. A local
   `sprint-8.1` branch exists in this sandbox.
3. **Executor access to GitHub Actions** — **unavailable**. The sandbox has no
   GitHub credentials (`GITHUB_TOKEN` unset), no `gh` CLI, and an unauthenticated
   `GET https://api.github.com/repos/jcantarini/calisthenics-mastery` returns
   `404` (the expected response for both a private and a nonexistent
   repository — it distinguishes neither).

Consequently the executor **cannot dispatch a workflow, cannot push to
`sprint-8.1` on GitHub and cannot read run results**. No run URL, run ID,
tested commit SHA or artifact is recorded, and none is inferred. Whether a run
already exists on GitHub is unknown from here; this section asserts only the
executor's access limitation.

Manual invocation by a reviewer with repository access:

- Workflow location: `.github/workflows/progress-history-core.yml`
  (job `regression-suite`).
- UI: **Actions → Progress History core regression suite → Run workflow**
  on the chosen ref.
- CLI: `gh workflow run progress-history-core.yml --ref <branch>`, then
  `gh run watch` and
  `gh run download <run-id> -n progress-history-core-evidence-<run-id>`.
- Or simply push a change touching `supabase/migrations/**` or
  `supabase/tests/progress_history_core/**`.

#### 10.5.1 Verified GitHub Actions run (independent reviewer)

The independent reviewer, who **does** have GitHub access, executed the
workflow and verified the result. This run validates the **preceding** commit
`ece9cc28ef6093a5a6dc2ba4b2b15442c1f52afc`; it does **not** validate the
correction commit introduced by this follow-up (see 10.6, Defect 3).

| Field                                      | Value                                                                       |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| Workflow run URL                           | https://github.com/jcantarini/calisthenics-mastery/actions/runs/34781039833 |
| Workflow run ID                            | `34781039833`                                                               |
| Tested commit SHA                          | `ece9cc28ef6093a5a6dc2ba4b2b15442c1f52afc`                                  |
| Branch                                     | `sprint-8.1`                                                                |
| PostgreSQL server/client                   | 17.9 — package `17.9-1.pgdg24.04+1`                                         |
| Baseline enforcement + negative self-check | PASS                                                                        |
| Normal suite                               | 169/169 PASS                                                                |
| Negative scenarios A–D                     | 4/4 rejected for their expected reasons                                     |
| Monitored input files                      | 31; before/after hashes identical and matching the reviewed ZIP             |
| Worktree                                   | clean                                                                       |
| Artifact                                   | `progress-history-core-evidence-34781039833` (ID `10325401135`)             |
| Artifact ZIP SHA-256                       | `a3fa2ef0017bb165e21aeb3a278f0941f3f75adb5af53cbd13f51b72d3770cbf`          |

The reviewer also confirmed that the submitted ZIP matches all 309 repository
files at the tested commit.

A run for the correction commit of 10.6 Defect 3 is **pending**; no URL or SHA
is recorded for it, and none is inferred. The executor's sandbox limitation
recorded above is unchanged and is a separate fact from the reviewer's working
GitHub access.

### 10.6 Correction record — evidence defects (V2 follow-up)

Three independently reproduced evidence defects of the workflow were corrected.
Only `.github/workflows/progress-history-core.yml` and the documentation were
touched; `run-ci.sh` (`a187b548…`), `run.sh`, the SQL cases, the 18 migrations
and all application source are unchanged.

**Defect 1 — installation failure not recorded under GitHub's real shell.**
Under `bash -e` the inherited `errexit` killed the outer shell at the failed
pipeline before `PIPESTATUS` could be read, so exit status, `install-status`
and `PG_INSTALL_OK` were never written. Corrected as described in 10.2.

Isolated checks, executed locally with temporary mocked `sudo`, `curl` and
`lsb_release` (no real apt/sudo operation, nothing installed), running the
actual step body extracted from the workflow under `bash -e`:

| Check                         | Result                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| Installation succeeds         | PASS — step exit `0`, `install-status=OK`, `PG_INSTALL_OK=true`, log status `0`                  |
| Installation fails with `42`  | PASS — step exit `42`, `install exit status: 42`, `install-status=FAILED`, `PG_INSTALL_OK=false` |
| Fail-fast inside installation | PASS — `1` mocked `sudo` invocation on failure vs `5` on success: later commands never ran       |
| Failure recorded before exit  | PASS — outputs, environment values and log line present before the nonzero exit                  |

**Defect 2 — integrity PASS inferred from an old empty diff.** With different
`hashes-before.txt`/`hashes-after.txt` but a preexisting empty
`hashes-diff.txt`, the previous step reported
`PASS (hashes captured and identical)`. Corrected as described in 10.2.

Isolated checks on the actual finalization step body with disposable fixtures:

| Fixture                                      | Result                                                                        |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| Equal manifests                              | PASS — `PASS (fresh comparison …)`, `INTEGRITY_OK=true`                       |
| Different manifests + preexisting empty diff | PASS — `FAIL (fresh comparison recorded differences …)`, `INTEGRITY_OK=false` |
| Missing `hashes-after.txt`                   | PASS — `NOT RUN (hash capture incomplete — never inferred as PASS)`           |
| Recorded differences                         | PASS — `FAIL (…differences…)`, `INTEGRITY_OK=false`                           |
| Comparison error (unreadable manifest path)  | PASS — `FAIL (comparison error, status 2 …)`, `INTEGRITY_OK=false`            |
| Deferred gate matrix                         | PASS — exit `0` only when worktree clean **and** `INTEGRITY_OK=true`          |

The comparison-error fixture was produced by making a manifest path
unreadable as a file (directory in its place); a permission-based variant is
not usable in this executor, which runs as `root`.

**Defect 3 — original installation failure lost while logging its status.**
The first pipeline was already guarded, but the _second_ pipeline — the one
that appends `install exit status` / `install log write status` through `tee`
— still ran with `errexit` enabled. A failing `tee` there killed the shell
before `record_rc` was captured and before the original installation failure
was handled, so the job exited `1` instead of preserving the installation code.
The fix wraps only that block in `set +e` / `set -e`; the installation
function, the integrity comparison and the deferred gate are unchanged.

Isolated checks on the actual step body extracted from the workflow, run under
`bash -e` with disposable mocks outside the repository (`sudo`, `curl`,
`lsb_release`, `tee`; the `sudo tee` mock consumes its standard input so no
artificial `SIGPIPE` is introduced; no real `apt` or `sudo` operation, nothing
installed):

| Scenario                                 | Result                                                              |
| ---------------------------------------- | ------------------------------------------------------------------- |
| A — installation ok, logging ok          | PASS — exit `0`, `install-status=OK`, `PG_INSTALL_OK=true`          |
| B — installation fails `42`, logging ok  | PASS — exit `42`, `install-status=FAILED`, `PG_INSTALL_OK=false`    |
| C — installation ok, `tee` fails         | PASS — exit `1`, `install-status=LOG-FAILED`, `PG_INSTALL_OK=false` |
| D — installation fails `42`, `tee` fails | PASS — exit `42`, `install-status=FAILED`, `PG_INSTALL_OK=false`    |

In B and D the failure inside `install_pg` still prevented every subsequent
installation command (internal `set -euo pipefail` preserved).

Not executed (`NOT RUN`): `bun install`, application tests, typecheck, lint,
build, and any real `apt`/PostgreSQL installation in these isolated checks.
These local mock checks are **not** a GitHub Actions execution.

### 10.7 Status (historical, at the time of section 10)

`8.1A1-V2 — PENDING INDEPENDENT CI REVIEW`

A real GitHub Actions run (10.5.1) passed for commit
`ece9cc28ef6093a5a6dc2ba4b2b15442c1f52afc`: baseline enforcement PASS, suite
169/169, four negative scenarios rejected, 31 monitored inputs unchanged,
worktree clean. That run validates the **preceding** commit only. The Defect 3
correction recorded in 10.6 had **not** yet been executed in CI at that point,
so the gate stayed open. Section 11 records its closure.

---

## 11. Independent validation record (gate closure for 8.1A1-V2)

The independent reviewer inspected the GitHub Actions execution and the
uploaded artifact for the corrected commit. The reviewer is recorded as having
**inspected** that execution and artifact; this record does not claim who
dispatched the workflow.

| Item                     | Value                                                               |
| ------------------------ | ------------------------------------------------------------------- |
| Workflow run             | `34781722548`                                                       |
| Commit validated         | `6e16ed128d12eea8cec779cd42198e5c5d3b0dac`                          |
| Artifact                 | `progress-history-core-evidence-34781722548` (ID `10325113470`)     |
| Artifact ZIP SHA-256     | `1fa334c58857ab5d89b962e35217c872623ced90755b10e3bdc82c1b25cf6cdd`  |
| Artifact content         | ZIP matching the 309 repository files of the tested tree            |
| PostgreSQL               | 17.9 (pinned PGDG package `17.9-1.pgdg24.04+1`), disposable cluster |
| Core suite               | 169 / 169 cases, zero failures                                      |
| Negative scenarios       | 4 / 4 rejected for their intended reason                            |
| Baseline enforcement     | PASS (four frozen inputs exact, forbidden files absent, pin 2.12.0) |
| Execution-input manifest | 31 entries, unchanged before/after                                  |
| Worktree                 | clean after testing                                                 |
| Isolated scenarios A–D   | 4 / 4 PASS (installation/logging error handling)                    |

**Resulting status:** `8.1A1-V2 — INDEPENDENTLY VALIDATED`. The 8.1A1 gate is
closed and Sprint 8.1A2 (auxiliary facts schema) was authorized on this basis.

This approval is **historical and closed**. It says nothing about Sprint 8.1A2,
whose own evidence is recorded separately in
[`progress-history-auxiliary-validation.md`](./progress-history-auxiliary-validation.md)
and which remains `8.1A2 — IMPLEMENTED, PENDING INDEPENDENT VALIDATION`.

---

## 12. Independent validation record (gate closure for 8.1A2)

The independent reviewer inspected the GitHub Actions execution and the
uploaded artifact for the auxiliary-facts commit. The reviewer is recorded as
having **inspected** that execution and artifact; this record does not claim
who dispatched the workflow.

| Item                     | Value                                                               |
| ------------------------ | ------------------------------------------------------------------- |
| Workflow run             | `34783008196`                                                       |
| Commit validated         | `7e0029168ec1042b8f93648d281141d2eedea797`                          |
| Artifact                 | `progress-history-core-evidence-34783008196` (ID `10326040374`)     |
| Artifact ZIP SHA-256     | `7f6e049c20b3d58c85f0fc58dd3200271e50a65a540c162bf7cde13aac7c18f5`  |
| Artifact content         | ZIP matching the 319 repository files of the tested tree            |
| Migrations replayed      | 19                                                                  |
| Core suite               | 169 / 169 cases, zero failures                                      |
| Auxiliary suite          | 127 / 127 cases, zero failures                                      |
| Negative scenarios       | 8 / 8 rejected for their intended reason                            |
| Baseline enforcement     | PASS (four frozen inputs exact, forbidden files absent, pin 2.12.0) |
| Execution-input manifest | 39 entries, unchanged before/after                                  |
| Worktree                 | clean after testing                                                 |

**Resulting status:** `8.1A2 — INDEPENDENTLY VALIDATED`. The 8.1A2 gate is
closed and Sprint 8.1A3 (durable dispatch outbox schema) was authorized on this
basis.

This approval is **historical and closed**. It says nothing about Sprint 8.1A3,
whose own evidence is recorded separately in
[`progress-history-outbox-validation.md`](./progress-history-outbox-validation.md)
and which remains `8.1A3 — IMPLEMENTED, PENDING INDEPENDENT VALIDATION`.
