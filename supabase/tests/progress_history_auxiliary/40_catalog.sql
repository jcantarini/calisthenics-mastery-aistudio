-- Sprint 8.1A2 — catalog assertions and dumps for the auxiliary facts.
-- NOT A MIGRATION.

SELECT test.run('X-001', 'catalog', 'RLS enabled on all three auxiliary tables', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
          AND c.relrowsecurity) <> 3
    THEN RAISE EXCEPTION 'RLS not enabled on all three auxiliary tables';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-002', 'catalog', 'exactly one SELECT policy per auxiliary table, scoped to authenticated', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
          AND cmd = 'SELECT' AND roles = '{authenticated}') <> 3
    THEN RAISE EXCEPTION 'unexpected auxiliary policy catalogue';
    END IF;
    IF (SELECT count(*) FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
          AND cmd <> 'SELECT') <> 0
    THEN RAISE EXCEPTION 'non-SELECT policy present on an auxiliary table';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-003', 'catalog', 'anon and PUBLIC hold no privilege on any auxiliary table', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND grantee IN ('anon','PUBLIC')
          AND table_name IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')) <> 0
    THEN RAISE EXCEPTION 'anon or PUBLIC holds privileges';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-004', 'catalog', 'authenticated holds SELECT only on the three auxiliary tables', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND grantee = 'authenticated'
          AND table_name IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
          AND privilege_type <> 'SELECT') <> 0
       OR (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND grantee = 'authenticated'
          AND table_name IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
          AND privilege_type = 'SELECT') <> 3
    THEN RAISE EXCEPTION 'authenticated privilege matrix drifted';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-005', 'catalog', 'service_role holds SELECT and INSERT only on the three auxiliary tables', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND grantee = 'service_role'
          AND table_name IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
          AND privilege_type NOT IN ('SELECT','INSERT')) <> 0
       OR (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND grantee = 'service_role'
          AND table_name IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
          AND privilege_type IN ('SELECT','INSERT')) <> 6
    THEN RAISE EXCEPTION 'service_role privilege matrix drifted';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-006', 'catalog', 'no trigger, view, function or RPC added for the auxiliary facts', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND NOT t.tgisinternal
          AND c.relname IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')) <> 0
    THEN RAISE EXCEPTION 'unexpected trigger on an auxiliary table';
    END IF;
    IF (SELECT count(*) FROM pg_views WHERE schemaname = 'public'
        AND (viewname LIKE '%hydration%' OR viewname LIKE '%meal_adherence%' OR viewname LIKE '%daily_target%')) <> 0
    THEN RAISE EXCEPTION 'unexpected auxiliary view';
    END IF;
    IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND (p.proname LIKE '%hydration%' OR p.proname LIKE '%meal_adherence%' OR p.proname LIKE '%daily_target%')) <> 0
    THEN RAISE EXCEPTION 'unexpected auxiliary function';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-007', 'catalog', 'contracted uniqueness present on all three auxiliary tables', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_constraint
        WHERE conname IN ('hydration_facts_user_ingestion_key_key',
                          'meal_adherence_facts_user_ingestion_key_key',
                          'daily_target_snapshots_user_ingestion_key_key')) <> 3
    THEN RAISE EXCEPTION 'per-user ingestion-key uniqueness missing';
    END IF;
    IF (SELECT count(*) FROM pg_constraint WHERE conname = 'hydration_facts_id_user_id_key') <> 1
    THEN RAISE EXCEPTION 'hydration composite ownership key missing';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-008', 'catalog', 'contracted auxiliary indexes present', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public'
        AND indexname IN ('hydration_facts_user_day_kind_idx',
                          'hydration_facts_target_user_key',
                          'meal_adherence_facts_user_day_meal_idx',
                          'daily_target_snapshots_user_day_captured_idx')) <> 4
    THEN RAISE EXCEPTION 'contracted auxiliary index missing';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-009', 'catalog', 'partial void-target index is unique and restricted to non-null targets', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_indexes WHERE schemaname = 'public'
        AND indexname = 'hydration_facts_target_user_key'
        AND indexdef LIKE 'CREATE UNIQUE INDEX%'
        AND indexdef LIKE '%WHERE (target_fact_id IS NOT NULL)%') <> 1
    THEN RAISE EXCEPTION 'void-target index is not a partial unique index';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-010', 'catalog', 'each auxiliary table cascades from auth.users and indexes the ownership path', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_constraint c
        WHERE c.contype = 'f' AND c.confdeltype = 'c'
          AND c.conrelid::regclass::text IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
          AND c.confrelid = 'auth.users'::regclass) <> 3
    THEN RAISE EXCEPTION 'auth.users ON DELETE CASCADE missing';
    END IF;
    IF (SELECT count(DISTINCT tablename) FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
          AND indexdef LIKE '%(user_id,%') <> 3
    THEN RAISE EXCEPTION 'ownership path not indexed on every auxiliary table';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-011', 'catalog', 'auxiliary defaults are as contracted', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
          AND column_name = 'id' AND column_default = 'gen_random_uuid()') <> 3
    THEN RAISE EXCEPTION 'id default drifted';
    END IF;
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
          AND column_name = 'created_at' AND column_default = 'now()') <> 3
    THEN RAISE EXCEPTION 'created_at default drifted';
    END IF;
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
          AND column_name = 'contract_version' AND column_default = '1') <> 3
    THEN RAISE EXCEPTION 'contract_version default drifted';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-012', 'catalog', 'auxiliary tables carry no updated_at or mutable status column', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
          AND column_name IN ('updated_at','status','voided_at')) <> 0
    THEN RAISE EXCEPTION 'mutable-state column present on an auxiliary table';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-013', 'catalog', 'the four core history tables and their policies are untouched', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')
          AND c.relrowsecurity) <> 4
    THEN RAISE EXCEPTION 'core RLS drifted';
    END IF;
    IF (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND grantee = 'anon'
          AND table_name IN ('workout_sessions','workout_session_exercises','workout_session_sets','workout_session_adjustments')) <> 0
    THEN RAISE EXCEPTION 'core anon grants drifted';
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
  AND c.relname IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
ORDER BY c.relname;

\echo '--- Policies ---'
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
ORDER BY tablename, policyname;

\echo '--- Effective grants ---'
SELECT table_name, grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
  AND grantee IN ('anon','authenticated','service_role','PUBLIC')
ORDER BY table_name, grantee, privilege_type;

\echo '--- Foreign keys ---'
SELECT c.conrelid::regclass AS table_name, c.conname, pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.contype = 'f'
  AND c.conrelid::regclass::text IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
ORDER BY 1, 2;

\echo '--- Indexes ---'
SELECT tablename, indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
ORDER BY tablename, indexname;

\echo '--- Check constraints ---'
SELECT c.conrelid::regclass AS table_name, count(*) AS check_constraints
FROM pg_constraint c
WHERE c.contype = 'c'
  AND c.conrelid::regclass::text IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
GROUP BY 1 ORDER BY 1;
