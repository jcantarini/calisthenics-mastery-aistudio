-- Sprint 8.1A1-V1 — catalog assertions and dumps. NOT A MIGRATION.

-- =====================================================================
-- K — catalog assertions (recorded as cases)
-- =====================================================================
SELECT test.run('K-001', 'catalog', 'RLS enabled on all four history tables', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')
          AND c.relrowsecurity) <> 4
    THEN RAISE EXCEPTION 'RLS not enabled on all four tables';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('K-002', 'catalog', 'exactly one SELECT policy per history table, scoped to authenticated', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')
          AND cmd = 'SELECT' AND roles = '{authenticated}') <> 4
    THEN RAISE EXCEPTION 'unexpected policy catalogue';
    END IF;
    IF (SELECT count(*) FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')
          AND cmd <> 'SELECT') <> 0
    THEN RAISE EXCEPTION 'non-SELECT policy present';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('K-003', 'catalog', 'anon holds no privilege on any history table', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND grantee = 'anon'
          AND table_name IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')) <> 0
    THEN RAISE EXCEPTION 'anon holds privileges';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('K-004', 'catalog', 'authenticated holds SELECT only', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND grantee = 'authenticated'
          AND table_name IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')
          AND privilege_type <> 'SELECT') <> 0
       OR (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND grantee = 'authenticated'
          AND table_name IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')
          AND privilege_type = 'SELECT') <> 4
    THEN RAISE EXCEPTION 'authenticated privilege matrix drifted';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('K-005', 'catalog', 'service_role holds SELECT and INSERT only', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND grantee = 'service_role'
          AND table_name IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')
          AND privilege_type NOT IN ('SELECT','INSERT')) <> 0
       OR (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND grantee = 'service_role'
          AND table_name IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')
          AND privilege_type IN ('SELECT','INSERT')) <> 8
    THEN RAISE EXCEPTION 'service_role privilege matrix drifted';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('K-006', 'catalog', 'no trigger, function, view or RPC added by the history domain', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND NOT t.tgisinternal
          AND c.relname IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')) <> 0
    THEN RAISE EXCEPTION 'unexpected trigger on a history table';
    END IF;
    IF (SELECT count(*) FROM pg_views WHERE schemaname = 'public' AND viewname LIKE 'workout_session%') <> 0
    THEN RAISE EXCEPTION 'unexpected view';
    END IF;
    IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname LIKE '%workout_session%') <> 0
    THEN RAISE EXCEPTION 'unexpected function';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('K-007', 'catalog', 'no residual 2048-byte prescription size constraint', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_constraint
        WHERE conname = 'workout_session_exercises_prescription_size_check') <> 0
    THEN RAISE EXCEPTION 'size check still present';
    END IF;
  END $chk$;
$sql$);

-- =====================================================================
-- Catalog dumps (captured in the run log)
-- =====================================================================
\echo '--- RLS flags ---'
SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')
ORDER BY c.relname;

\echo '--- Policies ---'
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')
ORDER BY tablename, policyname;

\echo '--- Effective grants ---'
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')
  AND grantee IN ('anon','authenticated','service_role','PUBLIC')
ORDER BY table_name, grantee, privilege_type;

\echo '--- Foreign keys ---'
SELECT c.conrelid::regclass AS table_name, c.conname, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.contype = 'f'
  AND c.conrelid::regclass::text IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')
ORDER BY 1, 2;

\echo '--- Indexes ---'
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')
ORDER BY tablename, indexname;

\echo '--- Check constraints ---'
SELECT c.conrelid::regclass AS table_name, count(*) AS check_constraints
FROM pg_constraint c
WHERE c.contype = 'c'
  AND c.conrelid::regclass::text IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')
GROUP BY 1 ORDER BY 1;
