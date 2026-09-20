#!/usr/bin/env bash
# Sprint 8.1A3-C1 — failing-before / passing-after evidence for the outbox
# privilege-reset defect. NOT A MIGRATION and never executed against a shared
# database: it only drives the disposable runner of this suite.
#
# Scenario A: permissive default table privileges + the ORIGINAL 20 migrations
#             (the corrective migration is withheld by copying the committed
#             migration files to a temporary directory OUTSIDE the repository;
#             no committed file is ever modified).
#             Expected: service_role retains TRUNCATE/REFERENCES/TRIGGER and
#             the strengthened suite FAILS.
#
# Scenario B: the same permissive defaults + all 21 migrations.
#             Expected: exactly the four contracted privileges remain and the
#             full outbox suite PASSES.
#
# Exit: 0 only when A fails for the intended reason and B passes.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../../.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"
CORRECTIVE="20260914054409_5061790c-527f-4dba-a626-8dd5baee40d4.sql"

WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/ph-outbox-c1-XXXXXX")"
chmod 0777 "$WORKDIR"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

if [ ! -f "$MIGRATIONS_DIR/$CORRECTIVE" ]; then
  echo "corrective migration $CORRECTIVE not found" >&2
  exit 1
fi

# --- Scenario A -------------------------------------------------------
mkdir -p "$WORKDIR/mig20"
cp "$MIGRATIONS_DIR"/*.sql "$WORKDIR/mig20/"
rm -f "$WORKDIR/mig20/$CORRECTIVE"
chmod -R a+rX "$WORKDIR/mig20"
A_COUNT="$(ls -1 "$WORKDIR/mig20"/*.sql | wc -l | tr -d ' ')"
if [ "$A_COUNT" != "20" ]; then
  echo "scenario A setup error: expected 20 migrations, found $A_COUNT" >&2
  exit 1
fi

echo "== Scenario A: permissive defaults + original 20 migrations =="
set +e
PH_MIGRATIONS_DIR="$WORKDIR/mig20" bash "$HERE/run.sh" "$WORKDIR/a.log" >"$WORKDIR/a.out" 2>&1
A_STATUS=$?
set -e

if [ "$A_STATUS" -eq 0 ]; then
  echo "REGRESSION SENSITIVITY LOST: the suite passed without the corrective migration" >&2
  exit 1
fi
if ! grep -q "migrations applied: 20" "$WORKDIR/a.log"; then
  echo "scenario A setup error: the 20-migration sequence did not replay" >&2
  sed -n '1,40p' "$WORKDIR/a.log" >&2
  exit 1
fi
if ! grep -qE "service_role (retained the forbidden privilege|outbox privilege matrix drifted)|outbox privilege leak|unexpected TRUNCATE/REFERENCES/TRIGGER grant|effective privilege mismatch" "$WORKDIR/a.log"; then
  echo "scenario A failed for an unintended reason:" >&2
  grep -n "FAIL" "$WORKDIR/a.log" | head -20 >&2
  exit 1
fi
echo "Scenario A: FAILED as intended — retained privileges detected"
grep -E "outbox privilege leak|retained the forbidden privilege|privilege matrix drifted|effective privilege mismatch|unexpected TRUNCATE" "$WORKDIR/a.log" | head -10 || true

# --- Scenario B -------------------------------------------------------
echo "== Scenario B: permissive defaults + all 21 migrations =="
bash "$HERE/run.sh" "$WORKDIR/b.log" >"$WORKDIR/b.out" 2>&1
if ! grep -q "migrations applied: 21" "$WORKDIR/b.log"; then
  echo "scenario B setup error: the 21-migration sequence did not replay" >&2
  exit 1
fi
grep -E "suite PASSED" "$WORKDIR/b.log" | tail -1

echo "RESULT: PASSED (A failed for the intended reason, B passed)"
