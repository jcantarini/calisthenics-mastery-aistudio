#!/usr/bin/env bash
# Sprint 8.1A1-V2 / 8.1A2 / 8.1A3 / 8.1A3-C1 — CI orchestration for the
# Progress History
# suites.
# NOT A MIGRATION. Never executed against a shared or production database.
#
# Runs, in one job:
#   0. baseline enforcement (exact SHA-256 of the four frozen inputs, the
#      frozen hashes of the twenty pre-existing migrations and the exact
#      migration count) plus a focused self-check proving a mutated baseline
#      is rejected;
#   1. the committed core runner unchanged (normal suite, must exit 0);
#   2. four negative scenarios on separate disposable copies of the core
#      suite, each of which must exit non-zero with its intended gate message;
#   3. the committed auxiliary runner unchanged (must exit 0 at 127 / 127)
#      plus its own four negative scenarios;
#   4. the committed outbox runner unchanged (must exit 0 at 107 / 107) plus
#      its own four negative scenarios;
#   5. the default-grant regression of Sprint 8.1A3-C1: with permissive default
#      table privileges in force, the suite must FAIL on the original twenty
#      migrations and PASS with the privilege-reset migration applied;
#   6. final integrity capture, which always runs — including after an early
#      failure — via an EXIT trap.
#
# Usage:  supabase/tests/progress_history_core/run-ci.sh [artifact-dir]
# Exit:   0 only when the baseline is exact, all three suites pass, all twelve
#         negative scenarios fail for the expected reason, the default-grant
#         regression holds in both directions and the post-run integrity check
#         is clean.

set -uo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../../.." && pwd)"
ARTIFACTS="${1:-/tmp/ph-core-artifacts}"
SUITE_REL="supabase/tests/progress_history_core"
AUX_SUITE_REL="supabase/tests/progress_history_auxiliary"
AUX_HERE="$REPO_ROOT/$AUX_SUITE_REL"
OUTBOX_SUITE_REL="supabase/tests/progress_history_outbox"
OUTBOX_HERE="$REPO_ROOT/$OUTBOX_SUITE_REL"
WORKFLOW_REL=".github/workflows/progress-history-core.yml"

mkdir -p "$ARTIFACTS"
# run.sh drops root privileges when started as root; the artifact directory
# must stay writable for the unprivileged account it re-executes as.
chmod 777 "$ARTIFACTS" 2>/dev/null || true
SUMMARY="$ARTIFACTS/summary.txt"
: >"$SUMMARY"

# Tracks the first real failure so the finalizer never masks it.
FAILURE_REASON=""
BASELINE_STATUS="NOT RUN"
BASELINE_SELFCHECK_STATUS="NOT RUN"
NORMAL_STATUS="NOT RUN"
NEGATIVE_STATUS="NOT RUN"
AUX_STATUS="NOT RUN"
AUX_NEGATIVE_STATUS="NOT RUN"
OUTBOX_STATUS="NOT RUN"
OUTBOX_NEGATIVE_STATUS="NOT RUN"
OUTBOX_GRANT_REGRESSION_STATUS="NOT RUN"
INTEGRITY_STATUS="NOT RUN"

log() { echo "$*" | tee -a "$SUMMARY"; }

record_failure() {
  [ -n "$FAILURE_REASON" ] || FAILURE_REASON="$1"
  log "CI VALIDATION FAILED: $1"
}

fail_ci() {
  record_failure "$*"
  exit 1
}


# ---------------------------------------------------------------------
# Execution-input manifest (baseline files, runner, orchestrator, workflow,
# SQL cases and migrations)
# ---------------------------------------------------------------------
hash_inputs() {
  (
    cd "$REPO_ROOT"
    sha256sum package.json bun.lock \
      src/integrations/supabase/client.ts src/integrations/supabase/types.ts \
      "$WORKFLOW_REL" "$SUITE_REL/run.sh" "$SUITE_REL/run-ci.sh" \
      "$AUX_SUITE_REL/run.sh" "$OUTBOX_SUITE_REL/run.sh" \
      "$OUTBOX_SUITE_REL/regression-default-grants.sh" \
      supabase/migrations/*.sql "$SUITE_REL"/*.sql "$AUX_SUITE_REL"/*.sql \
      "$OUTBOX_SUITE_REL"/*.sql
  )
}


# ---------------------------------------------------------------------
# Finalizer — always attempts the integrity capture, even on early failure.
# Never converts a failure into success.
# ---------------------------------------------------------------------
finalize() {
  local prior_exit=$?
  trap - EXIT

  log ""
  log "== post-run integrity (finalizer) =="
  if hash_inputs >"$ARTIFACTS/hashes-after.txt" 2>"$ARTIFACTS/hashes-after.err"; then
    if diff -u "$ARTIFACTS/hashes-before.txt" "$ARTIFACTS/hashes-after.txt" \
      >"$ARTIFACTS/hashes-diff.txt" 2>&1; then
      INTEGRITY_STATUS="PASS (inputs unchanged)"
      log "checked-out project files unchanged after testing"
    else
      INTEGRITY_STATUS="FAIL (inputs changed during testing)"
      log "PROJECT FILES CHANGED DURING TESTING:"
      cat "$ARTIFACTS/hashes-diff.txt" | tee -a "$SUMMARY"
      record_failure "execution inputs changed during testing"
    fi
  else
    INTEGRITY_STATUS="NOT RUN (inputs inaccessible)"
    log "integrity capture could not run — see hashes-after.err"
    record_failure "integrity capture could not run"
  fi

  local final_exit=0
  if [ "$prior_exit" -ne 0 ] || [ -n "$FAILURE_REASON" ]; then
    final_exit=1
    [ "$prior_exit" -eq 0 ] || final_exit="$prior_exit"
  fi

  log ""
  log "== final status =="
  log "baseline enforcement:     $BASELINE_STATUS"
  log "baseline self-check:      $BASELINE_SELFCHECK_STATUS"
  log "core suite:               $NORMAL_STATUS"
  log "core negative scenarios:  $NEGATIVE_STATUS"
  log "auxiliary suite:          $AUX_STATUS"
  log "auxiliary negatives:      $AUX_NEGATIVE_STATUS"
  log "outbox suite:             $OUTBOX_STATUS"
  log "outbox negatives:         $OUTBOX_NEGATIVE_STATUS"
  log "outbox grant regression:  $OUTBOX_GRANT_REGRESSION_STATUS"
  log "post-run integrity:       $INTEGRITY_STATUS"
  log "original failure:         ${FAILURE_REASON:-<none>}"
  log "exit status:              $final_exit"
  if [ "$final_exit" -eq 0 ]; then
    log "CI VALIDATION PASSED: baseline exact, core suite 169/169, auxiliary suite 127/127, outbox suite 107/107, twelve negative scenarios rejected as intended, default-grant regression holds in both directions, inputs unchanged"
  fi
  exit "$final_exit"

}
trap finalize EXIT

# ---------------------------------------------------------------------
# Provenance
# ---------------------------------------------------------------------
log "== provenance =="
log "commit:            ${GITHUB_SHA:-$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo unknown)}"
log "workflow run id:   ${GITHUB_RUN_ID:-n/a}"
log "postgres version:  $(postgres --version 2>/dev/null || echo 'postgres NOT FOUND')"
command -v initdb >/dev/null 2>&1 || fail_ci "initdb not found on PATH"
command -v psql >/dev/null 2>&1 || fail_ci "psql not found on PATH"
log "os user:           $(id -un) (uid $(id -u))"

hash_inputs >"$ARTIFACTS/hashes-before.txt" || fail_ci "unable to hash execution inputs"
log "execution-input manifest: hashes-before.txt ($(wc -l <"$ARTIFACTS/hashes-before.txt") files)"

# ---------------------------------------------------------------------
# 0. Baseline enforcement — exact SHA-256 of the four frozen inputs
# ---------------------------------------------------------------------
BASELINE_FILES=(
  "package.json:cfc902148a19b3a4e97b754619541b76a224ae45fe3f2e69955392914d04f582"
  "bun.lock:67301a19d3568a7ce27bcd8f67a34a6dc3f5f6e52e7b90c1aa1eac6a36781a46"
  "src/integrations/supabase/client.ts:69337fec7bd5c6e9d788b2a74978b2f13a029e05586322d5e1b36a71a140a5cc"
  "src/integrations/supabase/types.ts:a671afdd4bd77cb2db0ffde707fd3d14d45bd005d8120a88e6677c49087feb18"
)

# The twenty migrations that existed before Sprint 8.1A3-C1 (eighteen core, the
# Sprint 8.1A2 auxiliary-facts migration and the Sprint 8.1A3 outbox migration).
# Their content is frozen: Sprint 8.1A3-C1 adds exactly one new migration —
# the outbox privilege reset — and changes none of these. Declared
# explicitly so the count check can never be satisfied by silently rewriting
# history.
FROZEN_MIGRATIONS=(
  "20260720012001_e34119a3-7999-48e1-b2c0-093282486c0b.sql:af4ce4c4cf1bd312c9430bca3f5ce0c26178b98de7d06801c29b3091776abe8b"
  "20260720012031_8f846968-6b49-4016-af54-7789840ef2a1.sql:88d5fdb61b180f44531996092c88ad8f7d1b13f454ee1cdff9ea8eaa7cc8e593"
  "20260721151115_4d2eab82-93f7-4313-bf6b-8544092c0f90.sql:ea047395845f3378596486f8bfb1228d567685e8e59bf0ae01c97dfaa6e0f940"
  "20260722101759_85ab1989-54bb-48b5-ab7e-6f643c9bf9ec.sql:b966e697affb0eb9a4cce1b90ddbdbc33c547010c5699b6043c8379697ac53df"
  "20260727020658_2aef8d1c-6a9f-426d-b72d-630c61987104.sql:28d494c8c1a00f4315402384fed03343c1113f92a28f960701026bd1a79b96f1"
  "20260728055434_a94af019-195f-4dae-bac2-d390fb5c9b5a.sql:ad469a07524007ef165e768feb247a6f350c90baae7df09f9b82409ea16b43f1"
  "20260729095438_cbe534c2-df48-4aab-915b-ee5bfb09c752.sql:e272b5c03be8473b3d3ea8ba37826dadde53101813e68bc9863781aaed2db091"
  "20260730001127_8087ee13-0c95-4634-b8f6-75feb268f5bb.sql:8aaee108f3c0a575d515f0aea121675b79428ff4e33723471c8ee10715490ba1"
  "20260801001711_0abd946b-44eb-4948-b5bb-dfed99a65b06.sql:d141cd1737a319df9206363951e98a4ffb065bb716f5f150b02fc5447ab3ff19"
  "20260802000333_9577a2a0-8636-44b6-a172-03739a2204fb.sql:6076161152e17fe31f41bc289d7742c568aa618049e2ea8503ff735a6e560937"
  "20260803143325_e48a6c31-447d-46ee-a518-4712bd59bb76.sql:f6e7756b86d3440018827ee7d0efaa1dd86d88a54e5557835bfd94c09d59b65b"
  "20260807120629_70103660-be9b-427d-aab0-2ed519feb16d.sql:12f0a153d64ff3d034a6099455b20f7107ac5cf20acd480ff808ff2b889825b2"
  "20260808002048_e16fe546-ab7b-4fb5-873f-6c42bb975de2.sql:d3c88fad56e43f5660157a50b293b285a7f102ea11fb8e878f2afb868cc57f3c"
  "20260809001054_a430a773-6ac9-495b-86f3-71be84501707.sql:41799dba4b349495a5b7f4ef0fc20aed843957b3214b2bc1882f499f6b0b3802"
  "20260810194117_799d22dd-2d3e-4c65-ab76-030ebc30692d.sql:607c0c063f235865e6fe18ea2180e76662917d5a41001fb6b096f906930be00e"
  "20260905091619_6d9b2958-e1e3-412e-9006-2b724e4c82ae.sql:f9a9644a915681f958af2b86f6a9b8745291d924b093205ae1556a63e88e8667"
  "20260907051059_31daeead-1516-4f01-9181-10499728c3ee.sql:e6cd54a005439c0ef4fc769f1744e8a526482f72f2701a180d0aca03ecb34988"
  "20260908051821_a5c7fdb9-b140-42cd-80ff-420e77cc363a.sql:03d98a805aa1bc1acd4b35df14f58e0d86f9fc3504a45cc54d6dcc34dcb2ea06"
  "20260913205226_0fedf7a2-014e-4c9e-97e1-bda3ceeacdc2.sql:66900d4ae1a6b8ac3d94577c3aca7e4d693bd66873ce6176a468c714e94a157a"
  "20260914050905_09e67dd9-1806-4543-866b-b87b2aa7aa25.sql:64c5b8c9bfda57cdebe2e770e24e79e2fcbe8bce597e8a3f8624dc42972377ea"
)


# enforce_baseline <root> [quiet]
# Returns non-zero when a baseline file is missing or has an unexpected hash,
# a forbidden file exists, the migration count is wrong or the pinned
# AI Studio dependency boundary differs (see ai-studio-migration-audit.md).
enforce_baseline() {
  local root="$1" quiet="${2:-}" rc=0 entry rel want got count
  _b() { [ -n "$quiet" ] || log "$*"; }

  for entry in "${BASELINE_FILES[@]}"; do
    rel="${entry%%:*}"
    want="${entry##*:}"
    if [ ! -f "$root/$rel" ]; then
      _b "baseline MISSING: $rel"
      rc=1
      continue
    fi
    got="$(sha256sum "$root/$rel" | awk '{print $1}')"
    if [ "$got" = "$want" ]; then
      _b "baseline OK:      $rel ($got)"
    else
      _b "baseline MISMATCH: $rel"
      _b "  expected: $want"
      _b "  actual:   $got"
      rc=1
    fi
  done

  if [ -e "$root/src/integrations/supabase/previewAuthStorage.ts" ]; then
    _b "baseline VIOLATION: src/integrations/supabase/previewAuthStorage.ts must remain absent"
    rc=1
  fi
  if [ -e "$root/package-lock.json" ]; then
    _b "baseline VIOLATION: package-lock.json must remain absent"
    rc=1
  fi

  count=$(ls "$root"/supabase/migrations/*.sql 2>/dev/null | wc -l | tr -d ' ')
  if [ "$count" = "21" ]; then
    _b "baseline OK:      21 migrations (20 pre-existing + 1 outbox privilege reset)"
  else
    _b "baseline VIOLATION: expected 21 migrations, found $count"
    rc=1
  fi

  # The twenty pre-existing migrations must remain byte-for-byte identical.
  for entry in "${FROZEN_MIGRATIONS[@]}"; do
    rel="supabase/migrations/${entry%%:*}"
    want="${entry##*:}"
    if [ ! -f "$root/$rel" ]; then
      _b "baseline MISSING: $rel"
      rc=1
      continue
    fi
    got="$(sha256sum "$root/$rel" | awk '{print $1}')"
    if [ "$got" != "$want" ]; then
      _b "baseline MISMATCH: $rel"
      _b "  expected: $want"
      _b "  actual:   $got"
      rc=1
    fi
  done
  _b "baseline OK:      ${#FROZEN_MIGRATIONS[@]} pre-existing migrations verified byte-for-byte"


  if grep -q '"@lovable.dev/' "$root/package.json"; then
    _b "baseline VIOLATION: Lovable runtime packages must remain absent"
    rc=1
  elif grep -q '"packageManager": "bun@1.3.3"' "$root/package.json"; then
    _b "baseline OK:      AI Studio portable baseline; Bun 1.3.3"
  else
    _b "baseline VIOLATION: packageManager must remain bun@1.3.3"
    rc=1
  fi

  return $rc
}

log ""
log "== baseline enforcement =="
enforce_baseline "$REPO_ROOT"
BASELINE_RC=$?
if [ "$BASELINE_RC" -eq 0 ]; then
  BASELINE_STATUS="PASS"
else
  BASELINE_STATUS="FAIL (baseline not exact)"
  fail_ci "validated baseline not present — refusing to run PostgreSQL"
fi

# Focused self-check: a mutated copy of the baseline must be rejected.
log ""
log "== baseline enforcement self-check =="
SELF_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ph-baseline-XXXXXX")"
mkdir -p "$SELF_DIR/src/integrations/supabase" "$SELF_DIR/supabase/migrations"
cp "$REPO_ROOT/package.json" "$REPO_ROOT/bun.lock" "$SELF_DIR/"
cp "$REPO_ROOT"/src/integrations/supabase/client.ts \
  "$REPO_ROOT"/src/integrations/supabase/types.ts "$SELF_DIR/src/integrations/supabase/"
cp "$REPO_ROOT"/supabase/migrations/*.sql "$SELF_DIR/supabase/migrations/"
printf '\n' >>"$SELF_DIR/bun.lock" # single-byte mutation of one baseline input
if enforce_baseline "$SELF_DIR" quiet >/dev/null 2>&1; then
  BASELINE_SELFCHECK_STATUS="FAIL (mutated baseline accepted)"
  rm -rf "$SELF_DIR"
  fail_ci "baseline enforcement accepted a mutated baseline"
else
  BASELINE_SELFCHECK_STATUS="PASS (mutated baseline rejected)"
  log "mutated baseline copy rejected as expected (committed baseline untouched)"
fi
rm -rf "$SELF_DIR"

# ---------------------------------------------------------------------
# 1. Normal suite — committed runner, unchanged
# ---------------------------------------------------------------------
log ""
log "== normal suite =="
NORMAL_LOG="$ARTIFACTS/normal-suite.log"
bash "$HERE/run.sh" "$NORMAL_LOG" >"$ARTIFACTS/normal-suite.stdout" 2>&1
NORMAL_EXIT=$?
log "exit code: $NORMAL_EXIT"
grep -E 'suite PASSED|suite FAILED' "$NORMAL_LOG" | tee -a "$SUMMARY" || true
if [ "$NORMAL_EXIT" -ne 0 ]; then
  NORMAL_STATUS="FAIL (exit $NORMAL_EXIT)"
  NEGATIVE_STATUS="NOT RUN (normal suite failed)"
  fail_ci "normal suite exited $NORMAL_EXIT (see normal-suite.log)"
fi
if ! grep -q 'progress_history_core suite PASSED: 169 / 169 case(s)' "$NORMAL_LOG"; then
  NORMAL_STATUS="FAIL (unexpected case count)"
  NEGATIVE_STATUS="NOT RUN (normal suite failed)"
  fail_ci "normal suite did not report 169 / 169 passing cases"
fi
NORMAL_STATUS="PASS (169 / 169)"

# ---------------------------------------------------------------------
# 2. Negative scenarios — disposable copies, one fresh cluster each
# ---------------------------------------------------------------------
# Each scenario: name | mutation function | expected substring in gate message
run_negative() {
  local name="$1" mutate="$2" expect="$3"
  local work
  work="$(mktemp -d "${TMPDIR:-/tmp}/ph-neg-${name}-XXXXXX")"
  mkdir -p "$work/supabase/migrations" "$work/$SUITE_REL"
  cp "$REPO_ROOT"/supabase/migrations/*.sql "$work/supabase/migrations/"
  cp "$HERE"/*.sql "$HERE"/run.sh "$work/$SUITE_REL/"
  chmod +x "$work/$SUITE_REL/run.sh"
  # run.sh drops root privileges when started as root: the disposable copy
  # must stay readable and traversable for that unprivileged account.
  chmod -R a+rX "$work" 2>/dev/null || true

  "$mutate" "$work/$SUITE_REL" || {
    log "[$name] mutation helper failed"
    return 1
  }

  # Prove the mutation was really applied.
  if diff -rq "$HERE" "$work/$SUITE_REL" --exclude=README.md --exclude=run-ci.sh >/dev/null 2>&1; then
    log "[$name] MUTATION NOT APPLIED — scenario invalid"
    return 1
  fi

  local nlog="$ARTIFACTS/negative-$name.log"
  bash "$work/$SUITE_REL/run.sh" "$nlog" >"$ARTIFACTS/negative-$name.stdout" 2>&1
  local code=$?
  local msg
  msg="$(grep -o 'progress_history_core suite FAILED: .*' "$nlog" | head -1)"
  log "[$name] exit=$code"
  log "[$name] gate: ${msg:-<no gate message>}"
  rm -rf "$work"

  if [ "$code" -eq 0 ]; then
    log "[$name] EXPECTED NON-ZERO EXIT"
    return 1
  fi
  if [ -z "$msg" ]; then
    log "[$name] no gate message — setup failure, not a valid negative test"
    return 1
  fi
  case "$msg" in
  *"$expect"*) return 0 ;;
  *)
    log "[$name] gate message did not contain: $expect"
    return 1
    ;;
  esac
}

# A — empty results: never execute any case file.
mutate_empty() {
  local s="$1"
  : >"$s/20_constraints.sql"
  : >"$s/30_security.sql"
  : >"$s/40_catalog.sql"
}

# B — missing expected case: delete one recorded case (K-007).
mutate_missing() {
  local s="$1"
  python3 - "$s/40_catalog.sql" <<'PY'
import re, sys
p = sys.argv[1]
src = open(p).read()
start = src.index("SELECT test.run('K-007'")
end = src.index("$sql$);", start) + len("$sql$);")
open(p, "w").write(src[:start] + src[end:])
PY
}

# C — unexpected case: record a case ID absent from the frozen inventory.
mutate_unexpected() {
  local s="$1"
  printf "\nSELECT test.run('Z-999', 'catalog', 'injected unexpected case', 'SELECT 1');\n" >>"$s/40_catalog.sql"
}

# D — wrong SQLSTATE expectation on an existing case.
mutate_wrong_expectation() {
  local s="$1"
  python3 - "$s/40_catalog.sql" <<'PY'
import sys
p = sys.argv[1]
src = open(p).read()
i = src.index("SELECT test.run('K-001'")
j = src.index("$sql$);", i)
open(p, "w").write(src[:j] + "$sql$, '23514');" + src[j + len("$sql$);"):])
PY
}

log ""
log "== negative scenarios (core) =="
NEG_FAILED=0
run_negative empty mutate_empty "no results recorded" || NEG_FAILED=1
run_negative missing-case mutate_missing "expected case(s) missing" || NEG_FAILED=1
run_negative unexpected-case mutate_unexpected "unexpected case(s) recorded" || NEG_FAILED=1
run_negative wrong-expectation mutate_wrong_expectation "case(s) FAILED" || NEG_FAILED=1

if [ "$NEG_FAILED" -eq 0 ]; then
  NEGATIVE_STATUS="PASS (4 / 4 rejected as intended)"
else
  NEGATIVE_STATUS="FAIL (one or more scenarios invalid)"
  fail_ci "one or more negative scenarios did not fail for the expected reason"
fi

# ---------------------------------------------------------------------
# 3. Auxiliary suite (Sprint 8.1A2) — committed runner, unchanged
# ---------------------------------------------------------------------
log ""
log "== auxiliary suite =="
[ -x "$AUX_HERE/run.sh" ] || fail_ci "auxiliary runner missing or not executable"
AUX_LOG="$ARTIFACTS/auxiliary-suite.log"
bash "$AUX_HERE/run.sh" "$AUX_LOG" >"$ARTIFACTS/auxiliary-suite.stdout" 2>&1
AUX_EXIT=$?
log "exit code: $AUX_EXIT"
grep -E 'suite PASSED|suite FAILED' "$AUX_LOG" | tee -a "$SUMMARY" || true
if [ "$AUX_EXIT" -ne 0 ]; then
  AUX_STATUS="FAIL (exit $AUX_EXIT)"
  AUX_NEGATIVE_STATUS="NOT RUN (auxiliary suite failed)"
  fail_ci "auxiliary suite exited $AUX_EXIT (see auxiliary-suite.log)"
fi
if ! grep -q 'progress_history_auxiliary suite PASSED: 127 / 127 case(s)' "$AUX_LOG"; then
  AUX_STATUS="FAIL (unexpected case count)"
  AUX_NEGATIVE_STATUS="NOT RUN (auxiliary suite failed)"
  fail_ci "auxiliary suite did not report 127 / 127 passing cases"
fi
AUX_STATUS="PASS (127 / 127)"

# ---------------------------------------------------------------------
# 4. Auxiliary negative scenarios — disposable copies, fresh cluster each
# ---------------------------------------------------------------------
run_negative_aux() {
  local name="$1" mutate="$2" expect="$3"
  local work
  work="$(mktemp -d "${TMPDIR:-/tmp}/ph-augneg-${name}-XXXXXX")"
  mkdir -p "$work/supabase/migrations" "$work/$AUX_SUITE_REL"
  cp "$REPO_ROOT"/supabase/migrations/*.sql "$work/supabase/migrations/"
  cp "$AUX_HERE"/*.sql "$AUX_HERE"/run.sh "$work/$AUX_SUITE_REL/"
  chmod +x "$work/$AUX_SUITE_REL/run.sh"
  chmod -R a+rX "$work" 2>/dev/null || true

  "$mutate" "$work/$AUX_SUITE_REL" || {
    log "[aux-$name] mutation helper failed"
    return 1
  }

  if diff -rq "$AUX_HERE" "$work/$AUX_SUITE_REL" --exclude=README.md >/dev/null 2>&1; then
    log "[aux-$name] MUTATION NOT APPLIED — scenario invalid"
    return 1
  fi

  local nlog="$ARTIFACTS/auxiliary-negative-$name.log"
  bash "$work/$AUX_SUITE_REL/run.sh" "$nlog" >"$ARTIFACTS/auxiliary-negative-$name.stdout" 2>&1
  local code=$?
  local msg
  msg="$(grep -o 'progress_history_auxiliary suite FAILED: .*' "$nlog" | head -1)"
  log "[aux-$name] exit=$code"
  log "[aux-$name] gate: ${msg:-<no gate message>}"
  rm -rf "$work"

  if [ "$code" -eq 0 ]; then
    log "[aux-$name] EXPECTED NON-ZERO EXIT"
    return 1
  fi
  if [ -z "$msg" ]; then
    log "[aux-$name] no gate message — setup failure, not a valid negative test"
    return 1
  fi
  case "$msg" in
  *"$expect"*) return 0 ;;
  *)
    log "[aux-$name] gate message did not contain: $expect"
    return 1
    ;;
  esac
}

# A — empty results: never execute any auxiliary case file.
mutate_aux_empty() {
  local s="$1"
  : >"$s/20_constraints.sql"
  : >"$s/30_security.sql"
  : >"$s/40_catalog.sql"
}

# B — missing expected case: delete one recorded case (X-013).
mutate_aux_missing() {
  local s="$1"
  python3 - "$s/40_catalog.sql" <<'PY'
import sys
p = sys.argv[1]
src = open(p).read()
start = src.index("SELECT test.run('X-013'")
end = src.index("$sql$);", start) + len("$sql$);")
open(p, "w").write(src[:start] + src[end:])
PY
}

# C — unexpected case: record a case ID absent from the frozen inventory.
mutate_aux_unexpected() {
  local s="$1"
  printf "\nSELECT test.run('Z-999', 'catalog', 'injected unexpected case', 'SELECT 1');\n" >>"$s/40_catalog.sql"
}

# D — wrong SQLSTATE expectation on an existing case.
mutate_aux_wrong_expectation() {
  local s="$1"
  python3 - "$s/40_catalog.sql" <<'PY'
import sys
p = sys.argv[1]
src = open(p).read()
i = src.index("SELECT test.run('X-001'")
j = src.index("$sql$);", i)
open(p, "w").write(src[:j] + "$sql$, '23514');" + src[j + len("$sql$);"):])
PY
}

log ""
log "== negative scenarios (auxiliary) =="
AUX_NEG_FAILED=0
run_negative_aux empty mutate_aux_empty "no results recorded" || AUX_NEG_FAILED=1
run_negative_aux missing-case mutate_aux_missing "expected case(s) missing" || AUX_NEG_FAILED=1
run_negative_aux unexpected-case mutate_aux_unexpected "unexpected case(s) recorded" || AUX_NEG_FAILED=1
run_negative_aux wrong-expectation mutate_aux_wrong_expectation "case(s) FAILED" || AUX_NEG_FAILED=1

if [ "$AUX_NEG_FAILED" -eq 0 ]; then
  AUX_NEGATIVE_STATUS="PASS (4 / 4 rejected as intended)"
else
  AUX_NEGATIVE_STATUS="FAIL (one or more scenarios invalid)"
  fail_ci "one or more auxiliary negative scenarios did not fail for the expected reason"
fi

# ---------------------------------------------------------------------
# 5. Outbox suite (Sprint 8.1A3) — committed runner, unchanged
# ---------------------------------------------------------------------
log ""
log "== outbox suite =="
[ -x "$OUTBOX_HERE/run.sh" ] || fail_ci "outbox runner missing or not executable"
OUTBOX_LOG="$ARTIFACTS/outbox-suite.log"
bash "$OUTBOX_HERE/run.sh" "$OUTBOX_LOG" >"$ARTIFACTS/outbox-suite.stdout" 2>&1
OUTBOX_EXIT=$?
log "exit code: $OUTBOX_EXIT"
grep -E 'suite PASSED|suite FAILED' "$OUTBOX_LOG" | tee -a "$SUMMARY" || true
if [ "$OUTBOX_EXIT" -ne 0 ]; then
  OUTBOX_STATUS="FAIL (exit $OUTBOX_EXIT)"
  OUTBOX_NEGATIVE_STATUS="NOT RUN (outbox suite failed)"
  fail_ci "outbox suite exited $OUTBOX_EXIT (see outbox-suite.log)"
fi
if ! grep -q 'progress_history_outbox suite PASSED: 107 / 107 case(s)' "$OUTBOX_LOG"; then
  OUTBOX_STATUS="FAIL (unexpected case count)"
  OUTBOX_NEGATIVE_STATUS="NOT RUN (outbox suite failed)"
  fail_ci "outbox suite did not report 107 / 107 passing cases"
fi
OUTBOX_STATUS="PASS (107 / 107)"

# ---------------------------------------------------------------------
# 6. Outbox negative scenarios — disposable copies, fresh cluster each
# ---------------------------------------------------------------------
run_negative_outbox() {
  local name="$1" mutate="$2" expect="$3"
  local work
  work="$(mktemp -d "${TMPDIR:-/tmp}/ph-outneg-${name}-XXXXXX")"
  mkdir -p "$work/supabase/migrations" "$work/$OUTBOX_SUITE_REL"
  cp "$REPO_ROOT"/supabase/migrations/*.sql "$work/supabase/migrations/"
  cp "$OUTBOX_HERE"/*.sql "$OUTBOX_HERE"/run.sh "$work/$OUTBOX_SUITE_REL/"
  chmod +x "$work/$OUTBOX_SUITE_REL/run.sh"
  chmod -R a+rX "$work" 2>/dev/null || true

  "$mutate" "$work/$OUTBOX_SUITE_REL" || {
    log "[outbox-$name] mutation helper failed"
    return 1
  }

  if diff -rq "$OUTBOX_HERE" "$work/$OUTBOX_SUITE_REL" --exclude=README.md >/dev/null 2>&1; then
    log "[outbox-$name] MUTATION NOT APPLIED — scenario invalid"
    return 1
  fi

  local nlog="$ARTIFACTS/outbox-negative-$name.log"
  bash "$work/$OUTBOX_SUITE_REL/run.sh" "$nlog" >"$ARTIFACTS/outbox-negative-$name.stdout" 2>&1
  local code=$?
  local msg
  msg="$(grep -o 'progress_history_outbox suite FAILED: .*' "$nlog" | head -1)"
  log "[outbox-$name] exit=$code"
  log "[outbox-$name] gate: ${msg:-<no gate message>}"
  rm -rf "$work"

  if [ "$code" -eq 0 ]; then
    log "[outbox-$name] EXPECTED NON-ZERO EXIT"
    return 1
  fi
  if [ -z "$msg" ]; then
    log "[outbox-$name] no gate message — setup failure, not a valid negative test"
    return 1
  fi
  case "$msg" in
  *"$expect"*) return 0 ;;
  *)
    log "[outbox-$name] gate message did not contain: $expect"
    return 1
    ;;
  esac
}

# A — empty results: never execute any outbox case file.
mutate_outbox_empty() {
  local s="$1"
  : >"$s/20_constraints.sql"
  : >"$s/30_security.sql"
  : >"$s/40_catalog.sql"
}

# B — missing expected case: delete one recorded case (X-022).
mutate_outbox_missing() {
  local s="$1"
  python3 - "$s/40_catalog.sql" <<'PY'
import sys
p = sys.argv[1]
src = open(p).read()
start = src.index("SELECT test.run('X-022'")
end = src.index("$sql$);", start) + len("$sql$);")
open(p, "w").write(src[:start] + src[end:])
PY
}

# C — unexpected case: record a case ID absent from the frozen inventory.
mutate_outbox_unexpected() {
  local s="$1"
  printf "\nSELECT test.run('Z-999', 'catalog', 'injected unexpected case', 'SELECT 1');\n" >>"$s/40_catalog.sql"
}

# D — wrong SQLSTATE expectation on an existing case.
mutate_outbox_wrong_expectation() {
  local s="$1"
  python3 - "$s/40_catalog.sql" <<'PY'
import sys
p = sys.argv[1]
src = open(p).read()
i = src.index("SELECT test.run('X-001'")
j = src.index("$sql$);", i)
open(p, "w").write(src[:j] + "$sql$, '23514');" + src[j + len("$sql$);"):])
PY
}

log ""
log "== negative scenarios (outbox) =="
OUTBOX_NEG_FAILED=0
run_negative_outbox empty mutate_outbox_empty "no results recorded" || OUTBOX_NEG_FAILED=1
run_negative_outbox missing-case mutate_outbox_missing "expected case(s) missing" || OUTBOX_NEG_FAILED=1
run_negative_outbox unexpected-case mutate_outbox_unexpected "unexpected case(s) recorded" || OUTBOX_NEG_FAILED=1
run_negative_outbox wrong-expectation mutate_outbox_wrong_expectation "case(s) FAILED" || OUTBOX_NEG_FAILED=1

if [ "$OUTBOX_NEG_FAILED" -eq 0 ]; then
  OUTBOX_NEGATIVE_STATUS="PASS (4 / 4 rejected as intended)"
else
  OUTBOX_NEGATIVE_STATUS="FAIL (one or more scenarios invalid)"
  fail_ci "one or more outbox negative scenarios did not fail for the expected reason"
fi

# ---------------------------------------------------------------------
# 7. Default-grant regression (Sprint 8.1A3-C1)
# ---------------------------------------------------------------------
log ""
log "== default-grant regression (8.1A3-C1) =="
GRANT_REG="$OUTBOX_HERE/regression-default-grants.sh"
[ -f "$GRANT_REG" ] || fail_ci "default-grant regression script missing"
GRANT_REG_LOG="$ARTIFACTS/outbox-grant-regression.log"
bash "$GRANT_REG" >"$GRANT_REG_LOG" 2>&1
GRANT_REG_EXIT=$?
log "exit code: $GRANT_REG_EXIT"
grep -E "Scenario A|suite PASSED|RESULT:" "$GRANT_REG_LOG" | tee -a "$SUMMARY" || true
if [ "$GRANT_REG_EXIT" -ne 0 ]; then
  OUTBOX_GRANT_REGRESSION_STATUS="FAIL (exit $GRANT_REG_EXIT)"
  fail_ci "default-grant regression failed (see outbox-grant-regression.log)"
fi
OUTBOX_GRANT_REGRESSION_STATUS="PASS (fails without the reset, passes with it)"

# The EXIT trap performs the final integrity capture and prints the verdict.
exit 0
