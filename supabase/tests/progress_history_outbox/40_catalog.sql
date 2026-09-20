-- Sprint 8.1A3 — catalog assertions for public.history_dispatch_outbox.
-- NOT A MIGRATION.

SELECT test.run('X-001', 'catalog', 'RLS enabled on the outbox', $sql$
  DO $chk$ BEGIN
    IF NOT (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relname = 'history_dispatch_outbox')
    THEN RAISE EXCEPTION 'RLS not enabled on the outbox';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-002', 'catalog', 'no RLS policy exists on the outbox', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'history_dispatch_outbox') <> 0
    THEN RAISE EXCEPTION 'unexpected policy on the outbox';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-003', 'catalog', 'service_role holds exactly SELECT, INSERT, UPDATE, DELETE', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND table_name = 'history_dispatch_outbox'
          AND grantee = 'service_role'
          AND privilege_type IN ('SELECT','INSERT','UPDATE','DELETE')) <> 4
       OR (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND table_name = 'history_dispatch_outbox'
          AND grantee = 'service_role'
          AND privilege_type NOT IN ('SELECT','INSERT','UPDATE','DELETE')) <> 0
    THEN RAISE EXCEPTION 'service_role outbox privilege matrix drifted';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-004', 'catalog', 'anon, authenticated and PUBLIC hold no outbox privilege', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND table_name = 'history_dispatch_outbox'
          AND grantee IN ('anon','authenticated','PUBLIC')) <> 0
    THEN RAISE EXCEPTION 'user-facing role holds an outbox privilege';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-005', 'catalog', 'no TRUNCATE, REFERENCES or TRIGGER grant on the outbox for any application role', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND table_name = 'history_dispatch_outbox'
          AND grantee IN ('anon','authenticated','service_role','PUBLIC')
          AND privilege_type IN ('TRUNCATE','REFERENCES','TRIGGER')) <> 0
    THEN RAISE EXCEPTION 'unexpected TRUNCATE/REFERENCES/TRIGGER grant';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-006', 'catalog', 'partial unique index for completion events exists', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'history_dispatch_outbox'
          AND indexdef ILIKE 'CREATE UNIQUE INDEX%(session_id, event_kind, consumer)%WHERE (adjustment_id IS NULL)') <> 1
    THEN RAISE EXCEPTION 'completion partial unique index missing';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-007', 'catalog', 'partial unique index for adjustment events exists', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'history_dispatch_outbox'
          AND indexdef ILIKE 'CREATE UNIQUE INDEX%(adjustment_id, event_kind, consumer)%WHERE (adjustment_id IS NOT NULL)') <> 1
    THEN RAISE EXCEPTION 'adjustment partial unique index missing';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-008', 'catalog', 'no nullable four-column unique constraint was created', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'history_dispatch_outbox'
          AND indexdef ILIKE '%adjustment_id%'
          AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
          AND indexdef NOT ILIKE '%WHERE%') <> 0
    THEN RAISE EXCEPTION 'a non-partial unique index over adjustment_id exists';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-009', 'catalog', 'worker claim index exists', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'history_dispatch_outbox'
          AND indexdef ILIKE '%(state, next_attempt_at, id)%'
          AND indexdef ILIKE '%WHERE%pending%retry_scheduled%') <> 1
    THEN RAISE EXCEPTION 'claim index missing';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-010', 'catalog', 'lease-expiry sweeper index exists', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'history_dispatch_outbox'
          AND indexdef ILIKE '%(lease_expires_at)%'
          AND indexdef ILIKE '%WHERE%processing%') <> 1
    THEN RAISE EXCEPTION 'lease-expiry index missing';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-011', 'catalog', 'user_id index exists', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'history_dispatch_outbox'
          AND indexdef ILIKE '%(user_id)%') <> 1
    THEN RAISE EXCEPTION 'user_id index missing';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-012', 'catalog', 'composite session index exists', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'history_dispatch_outbox'
          AND indexdef ILIKE '%(session_id, user_id)%') <> 1
    THEN RAISE EXCEPTION 'composite session index missing';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-013', 'catalog', 'partial composite adjustment index exists', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'history_dispatch_outbox'
          AND indexdef ILIKE '%(adjustment_id, user_id)%'
          AND indexdef ILIKE '%WHERE (adjustment_id IS NOT NULL)%') <> 1
    THEN RAISE EXCEPTION 'partial composite adjustment index missing';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-014', 'catalog', 'dead-letter review index exists', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'history_dispatch_outbox'
          AND indexdef ILIKE '%(state, updated_at)%'
          AND indexdef ILIKE '%WHERE%dead_letter%') <> 1
    THEN RAISE EXCEPTION 'dead-letter index missing';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-015', 'catalog', 'delivered-row retention index exists', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_indexes
        WHERE schemaname = 'public' AND tablename = 'history_dispatch_outbox'
          AND indexdef ILIKE '%(state, delivered_at)%'
          AND indexdef ILIKE '%WHERE%delivered%') <> 1
    THEN RAISE EXCEPTION 'retention index missing';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-016', 'catalog', 'user_id foreign key to auth.users cascades on delete', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_constraint
        WHERE conrelid = 'public.history_dispatch_outbox'::regclass
          AND contype = 'f' AND confrelid = 'auth.users'::regclass
          AND confdeltype = 'c') <> 1
    THEN RAISE EXCEPTION 'owner cascade FK missing';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-017', 'catalog', 'composite foreign key to workout_sessions (id, user_id) exists', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_constraint
        WHERE conrelid = 'public.history_dispatch_outbox'::regclass
          AND contype = 'f'
          AND confrelid = 'public.workout_sessions'::regclass
          AND array_length(conkey, 1) = 2) <> 1
    THEN RAISE EXCEPTION 'composite session FK missing';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-018', 'catalog', 'composite foreign key to workout_session_adjustments (id, user_id) exists', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_constraint
        WHERE conrelid = 'public.history_dispatch_outbox'::regclass
          AND contype = 'f'
          AND confrelid = 'public.workout_session_adjustments'::regclass
          AND array_length(conkey, 1) = 2) <> 1
    THEN RAISE EXCEPTION 'composite adjustment FK missing';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-019', 'catalog', 'the outbox references no mutable training-plan table', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_constraint
        WHERE conrelid = 'public.history_dispatch_outbox'::regclass
          AND contype = 'f'
          AND confrelid::regclass::text IN (
            'public.training_plans','public.training_weeks',
            'public.training_days','public.planned_workouts')) <> 0
    THEN RAISE EXCEPTION 'outbox references a mutable plan table';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-020', 'catalog', 'no trigger, view or function was added for the outbox', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
        WHERE c.oid = 'public.history_dispatch_outbox'::regclass AND NOT t.tgisinternal) <> 0
    THEN RAISE EXCEPTION 'unexpected trigger on the outbox';
    END IF;
    IF (SELECT count(*) FROM pg_views
        WHERE schemaname = 'public' AND viewname ILIKE '%dispatch%') <> 0
    THEN RAISE EXCEPTION 'unexpected dispatch view';
    END IF;
    IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND (p.proname ILIKE '%dispatch%' OR p.proname ILIKE '%outbox%')) <> 0
    THEN RAISE EXCEPTION 'unexpected dispatch function';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-021', 'catalog', 'history and auxiliary grants are unchanged (SELECT for authenticated, SELECT+INSERT for service_role)', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND grantee = 'authenticated'
          AND table_name IN ('workout_sessions','workout_session_exercises','workout_session_sets',
                             'workout_session_adjustments','hydration_facts','meal_adherence_facts',
                             'daily_target_snapshots')
          AND privilege_type = 'SELECT') <> 7
       OR (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND grantee = 'authenticated'
          AND table_name IN ('workout_sessions','workout_session_exercises','workout_session_sets',
                             'workout_session_adjustments','hydration_facts','meal_adherence_facts',
                             'daily_target_snapshots')
          AND privilege_type <> 'SELECT') <> 0
       OR (SELECT count(*) FROM information_schema.role_table_grants
        WHERE table_schema = 'public' AND grantee = 'service_role'
          AND table_name IN ('workout_sessions','workout_session_exercises','workout_session_sets',
                             'workout_session_adjustments','hydration_facts','meal_adherence_facts',
                             'daily_target_snapshots')
          AND privilege_type NOT IN ('SELECT','INSERT')) <> 0
    THEN RAISE EXCEPTION 'history or auxiliary grant matrix drifted';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-022', 'catalog', 'contracted column defaults are present', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'history_dispatch_outbox'
          AND ((column_name = 'state' AND column_default LIKE '%pending%')
            OR (column_name = 'attempt_count' AND column_default = '0')
            OR (column_name = 'event_version' AND column_default = '1')
            OR (column_name IN ('next_attempt_at','created_at','updated_at')
                AND column_default = 'now()'))) <> 6
    THEN RAISE EXCEPTION 'outbox defaults drifted';
    END IF;
  END $chk$;
$sql$);

-- =====================================================================
-- Sprint 8.1A3-C1 — default-privilege regression assertions
-- =====================================================================

SELECT test.run('X-023', 'catalog', 'the disposable environment really grants permissive table defaults to service_role', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*)
        FROM pg_default_acl d
        JOIN pg_namespace n ON n.oid = d.defaclnamespace,
             aclexplode(d.defaclacl) a
        JOIN pg_roles g ON g.oid = a.grantee
        WHERE n.nspname = 'public' AND d.defaclobjtype = 'r'
          AND g.rolname = 'service_role'
          AND a.privilege_type = 'TRUNCATE') = 0
    THEN RAISE EXCEPTION 'regression environment not armed: permissive default table privileges are absent';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-024', 'catalog', 'no application role retains any outbox privilege outside the contracted four', $sql$
  DO $chk$
  DECLARE
    v_extra text;
  BEGIN
    SELECT string_agg(DISTINCT coalesce(g.rolname, 'PUBLIC') || ':' || a.privilege_type, ', ')
    INTO v_extra
    FROM pg_class c, aclexplode(c.relacl) a
    LEFT JOIN pg_roles g ON g.oid = a.grantee
    WHERE c.oid = 'public.history_dispatch_outbox'::regclass
      AND (a.grantee = 0 OR coalesce(g.rolname, '') IN ('anon','authenticated','service_role'))
      AND NOT (coalesce(g.rolname, 'PUBLIC') = 'service_role'
               AND a.privilege_type IN ('SELECT','INSERT','UPDATE','DELETE'));
    IF v_extra IS NOT NULL THEN
      RAISE EXCEPTION 'outbox privilege leak: %', v_extra;
    END IF;
  END $chk$;
$sql$);

SELECT test.run('X-025', 'catalog', 'effective outbox privileges per role match the frozen matrix', $sql$
  DO $chk$
  DECLARE
    r record;
  BEGIN
    FOR r IN
      SELECT role_name, priv, expected FROM (VALUES
        ('service_role','SELECT',true),   ('service_role','INSERT',true),
        ('service_role','UPDATE',true),   ('service_role','DELETE',true),
        ('service_role','TRUNCATE',false),('service_role','REFERENCES',false),
        ('service_role','TRIGGER',false),
        ('authenticated','SELECT',false), ('authenticated','INSERT',false),
        ('authenticated','UPDATE',false), ('authenticated','DELETE',false),
        ('authenticated','TRUNCATE',false),
        ('anon','SELECT',false),          ('anon','INSERT',false),
        ('anon','UPDATE',false),          ('anon','DELETE',false),
        ('anon','TRUNCATE',false)
      ) AS t(role_name, priv, expected)
    LOOP
      IF has_table_privilege(r.role_name, 'public.history_dispatch_outbox', r.priv) <> r.expected THEN
        RAISE EXCEPTION 'effective privilege mismatch: % % expected %', r.role_name, r.priv, r.expected;
      END IF;
    END LOOP;
  END $chk$;
$sql$);

SELECT test.run('X-026', 'catalog', 'canonical history and auxiliary privileges survive the outbox privilege reset', $sql$
  DO $chk$
  DECLARE
    v_bad text;
  BEGIN
    SELECT string_agg(DISTINCT c.relname || ':' || coalesce(g.rolname, 'PUBLIC') || ':' || a.privilege_type, ', ')
    INTO v_bad
    FROM pg_class c, aclexplode(c.relacl) a
    LEFT JOIN pg_roles g ON g.oid = a.grantee
    WHERE c.relname IN ('workout_sessions','workout_session_exercises','workout_session_sets',
                        'workout_session_adjustments','hydration_facts','meal_adherence_facts',
                        'daily_target_snapshots')
      AND c.relnamespace = 'public'::regnamespace
      AND (a.grantee = 0 OR coalesce(g.rolname, '') IN ('anon','authenticated','service_role'))
      AND NOT (coalesce(g.rolname, 'PUBLIC') = 'authenticated' AND a.privilege_type = 'SELECT')
      AND NOT (coalesce(g.rolname, 'PUBLIC') = 'service_role' AND a.privilege_type IN ('SELECT','INSERT'));
    IF v_bad IS NOT NULL THEN
      RAISE EXCEPTION 'history/auxiliary privilege drift: %', v_bad;
    END IF;
  END $chk$;
$sql$);
