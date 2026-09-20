#!/usr/bin/env bash
# Sprint 8.1A2 — reproducible validation runner for the auxiliary Progress
# History facts. NOT A MIGRATION and never executed against a shared database.
#
# Creates a throwaway PostgreSQL cluster in a temporary directory, listening on
# a private unix socket only, applies all project migrations in filename order,
# runs the auxiliary regression suite and destroys the cluster.
#
# Usage:   supabase/tests/progress_history_auxiliary/run.sh [output-log]
# Exit:    0 only when every inventoried case matched its expected SQLSTATE.

set -euo pipefail

# PostgreSQL refuses to run as root. When invoked as root (CI sandboxes,
# containers), re-execute the whole script as an unprivileged local user.
# Override the account with PH_TEST_OS_USER=<name>.
if [ "$(id -u)" = "0" ] && [ "${PH_TEST_REEXEC:-0}" != "1" ]; then
  PH_TEST_OS_USER="${PH_TEST_OS_USER:-}"
  if [ -z "$PH_TEST_OS_USER" ]; then
    for candidate in pgtest lovable postgres nobody; do
      if id -u "$candidate" >/dev/null 2>&1; then PH_TEST_OS_USER="$candidate"; break; fi
    done
  fi
  if [ -z "$PH_TEST_OS_USER" ]; then
    echo "No unprivileged user available; set PH_TEST_OS_USER." >&2
    exit 1
  fi
  REEXEC_LOG="${1:-/tmp/progress-history-auxiliary-run.log}"
  rm -f "$REEXEC_LOG"
  REEXEC_CMD="PH_TEST_REEXEC=1 PATH=$PATH bash $(printf '%q' "${BASH_SOURCE[0]}") $(printf '%q' "$REEXEC_LOG")"
  PH_UID="$(id -u "$PH_TEST_OS_USER")"
  PH_GID="$(id -g "$PH_TEST_OS_USER")"
  if command -v setpriv >/dev/null 2>&1; then
    exec setpriv --reuid="$PH_UID" --regid="$PH_GID" --init-groups \
      /bin/bash -c "HOME=/tmp $REEXEC_CMD"
  elif command -v runuser >/dev/null 2>&1; then
    exec runuser -u "$PH_TEST_OS_USER" -- /bin/bash -c "$REEXEC_CMD"
  elif command -v su >/dev/null 2>&1; then
    exec su "$PH_TEST_OS_USER" -s /bin/bash -c "$REEXEC_CMD"
  else
    echo "No mechanism available to drop root privileges." >&2
    exit 1
  fi
fi

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$HERE/../../.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"
LOG="${1:-/tmp/progress-history-auxiliary-run.log}"

WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/ph-aux-XXXXXX")"
PGDATA="$WORKDIR/pgdata"
PGSOCK="$WORKDIR/sock"
DBNAME="progress_history_auxiliary_test"

cleanup() {
  if [ -d "$PGDATA" ]; then
    pg_ctl -D "$PGDATA" -m immediate stop >/dev/null 2>&1 || true
  fi
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

mkdir -p "$PGSOCK"

# Never inherit an ambient connection: this suite must not touch a shared or
# production database.
unset PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE PGSERVICE PGOPTIONS || true
export PGPORT=5432

echo "== environment ==" | tee "$LOG"
postgres --version | tee -a "$LOG"

initdb -D "$PGDATA" -U pgtest --auth=trust --encoding=UTF8 --locale=C >>"$LOG" 2>&1
pg_ctl -D "$PGDATA" -o "-k $PGSOCK -c listen_addresses='' -p $PGPORT" -w start >>"$LOG" 2>&1

export PGHOST="$PGSOCK"
export PGUSER="pgtest"
export PGDATABASE="$DBNAME"

createdb -h "$PGSOCK" -p "$PGPORT" -U pgtest "$DBNAME"

psql_run() { psql -v ON_ERROR_STOP=1 -X -q -h "$PGSOCK" -p "$PGPORT" -U pgtest -d "$DBNAME" "$@"; }

echo "== bootstrap ==" | tee -a "$LOG"
psql_run -f "$HERE/00_bootstrap.sql" >>"$LOG" 2>&1

echo "== migrations ==" | tee -a "$LOG"
MIGRATION_COUNT=0
for f in "$MIGRATIONS_DIR"/*.sql; do
  echo "applying $(basename "$f")" | tee -a "$LOG"
  psql_run -f "$f" >>"$LOG" 2>&1
  MIGRATION_COUNT=$((MIGRATION_COUNT + 1))
done
echo "migrations applied: $MIGRATION_COUNT" | tee -a "$LOG"

echo "== fixtures ==" | tee -a "$LOG"
psql_run -f "$HERE/10_fixtures.sql" >>"$LOG" 2>&1

echo "== suite ==" | tee -a "$LOG"
psql_run -f "$HERE/20_constraints.sql" >>"$LOG" 2>&1
psql_run -f "$HERE/30_security.sql" >>"$LOG" 2>&1
psql_run -f "$HERE/40_catalog.sql" >>"$LOG" 2>&1

echo "== report ==" | tee -a "$LOG"
set +e
psql -v ON_ERROR_STOP=1 -X -h "$PGSOCK" -p "$PGPORT" -U pgtest -d "$DBNAME" -f "$HERE/90_report.sql" >>"$LOG" 2>&1
STATUS=$?
set -e

sed -n '/--- Per-case results ---/,$p' "$LOG"

if [ "$STATUS" -ne 0 ]; then
  echo "RESULT: FAILED (see $LOG)"
  exit 1
fi

echo "RESULT: PASSED (full log: $LOG)"
