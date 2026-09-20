-- Sprint 8.1A1-V1 — behavioural security cases executed under real roles.
-- NOT A MIGRATION.
--
-- Every case runs through test.run() with an explicit SET LOCAL ROLE and,
-- for authenticated, an injected request.jwt.claim.sub consumed by auth.uid().
-- service_role is created with BYPASSRLS, mirroring Supabase.

-- =====================================================================
-- G1 — authenticated user A reads its own rows
-- =====================================================================
SELECT test.run('G-001', 'rls', 'A reads its own workout_sessions rows', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.workout_sessions) = 0 THEN
      RAISE EXCEPTION 'A cannot see its own sessions';
    END IF;
  END $chk$;
$sql$, '00000', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('G-002', 'rls', 'A reads its own workout_session_exercises rows', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.workout_session_exercises) = 0 THEN
      RAISE EXCEPTION 'A cannot see its own exercises';
    END IF;
  END $chk$;
$sql$, '00000', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('G-003', 'rls', 'A reads its own workout_session_sets rows', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.workout_session_sets) = 0 THEN
      RAISE EXCEPTION 'A cannot see its own sets';
    END IF;
  END $chk$;
$sql$, '00000', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('G-004', 'rls', 'A reads its own workout_session_adjustments rows', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.workout_session_adjustments) = 0 THEN
      RAISE EXCEPTION 'A cannot see its own adjustments';
    END IF;
  END $chk$;
$sql$, '00000', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

-- =====================================================================
-- G2 — authenticated user A cannot read B's rows
-- =====================================================================
SELECT test.run('G-005', 'rls', 'A cannot read B workout_sessions rows', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.workout_sessions
        WHERE user_id <> '00000000-0000-4000-8000-0000000000a1') <> 0 THEN
      RAISE EXCEPTION 'cross-user session leak';
    END IF;
  END $chk$;
$sql$, '00000', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('G-006', 'rls', 'A cannot read B workout_session_exercises rows', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.workout_session_exercises
        WHERE user_id <> '00000000-0000-4000-8000-0000000000a1') <> 0 THEN
      RAISE EXCEPTION 'cross-user exercise leak';
    END IF;
  END $chk$;
$sql$, '00000', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('G-007', 'rls', 'A cannot read B workout_session_sets rows', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.workout_session_sets
        WHERE user_id <> '00000000-0000-4000-8000-0000000000a1') <> 0 THEN
      RAISE EXCEPTION 'cross-user set leak';
    END IF;
  END $chk$;
$sql$, '00000', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('G-008', 'rls', 'A cannot read B workout_session_adjustments rows', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.workout_session_adjustments
        WHERE user_id <> '00000000-0000-4000-8000-0000000000a1') <> 0 THEN
      RAISE EXCEPTION 'cross-user adjustment leak';
    END IF;
  END $chk$;
$sql$, '00000', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

-- B sees only its own rows (symmetry check).
SELECT test.run('G-009', 'rls', 'B reads only its own workout_sessions rows', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.workout_sessions) = 0
       OR (SELECT count(*) FROM public.workout_sessions
           WHERE user_id <> '00000000-0000-4000-8000-0000000000a2') <> 0 THEN
      RAISE EXCEPTION 'B visibility incorrect';
    END IF;
  END $chk$;
$sql$, '00000', 'authenticated', '00000000-0000-4000-8000-0000000000a2');

-- =====================================================================
-- G3 — authenticated writes denied (no grants: 42501)
-- =====================================================================
SELECT test.run('G-010', 'grants', 'authenticated INSERT into workout_sessions denied', $sql$
  INSERT INTO public.workout_sessions
    (user_id, ingestion_key, command_fingerprint, source, occurred_at, occurred_timezone,
     occurred_timezone_source, local_day, workout_title_snapshot, calories_source, app_version, confirmation_received_at)
  VALUES ('00000000-0000-4000-8000-0000000000a1','g010',repeat('a',64),'adhoc_workout',
     '2026-09-05T10:00:00Z','UTC','assumed_utc',DATE '2026-09-05','T','unknown','0.0.0-test','2026-09-05T10:30:00Z')
$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('G-011', 'grants', 'authenticated INSERT into workout_session_exercises denied', $sql$
  INSERT INTO public.workout_session_exercises (session_id, user_id, order_index, exercise_key_snapshot, exercise_name_snapshot, prescription_snapshot, status)
  VALUES ('10000000-0000-4000-8000-00000000000d','00000000-0000-4000-8000-0000000000a1',1,'k','N','{"version":1,"planned_sets":1,"reps_text":"1"}'::jsonb,'completed')
$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('G-012', 'grants', 'authenticated INSERT into workout_session_sets denied', $sql$
  INSERT INTO public.workout_session_sets (session_exercise_id, user_id, set_index, reps, is_completed)
  VALUES ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000a1',20,5,true)
$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('G-013', 'grants', 'authenticated INSERT into workout_session_adjustments denied', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, reason_code, occurred_at, actor_type)
  VALUES ('00000000-0000-4000-8000-0000000000a1','g013',repeat('a',64),'void','10000000-0000-4000-8000-00000000000d','system_correction','2026-09-05T10:00:00Z','system')
$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

SELECT test.run('G-014', 'grants', 'authenticated UPDATE on workout_sessions denied',
  $sql$UPDATE public.workout_sessions SET notes = 'x'$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('G-015', 'grants', 'authenticated UPDATE on workout_session_exercises denied',
  $sql$UPDATE public.workout_session_exercises SET notes = 'x'$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('G-016', 'grants', 'authenticated UPDATE on workout_session_sets denied',
  $sql$UPDATE public.workout_session_sets SET reps = 1$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('G-017', 'grants', 'authenticated UPDATE on workout_session_adjustments denied',
  $sql$UPDATE public.workout_session_adjustments SET reason_text = 'x'$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

SELECT test.run('G-018', 'grants', 'authenticated DELETE on workout_sessions denied',
  $sql$DELETE FROM public.workout_sessions$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('G-019', 'grants', 'authenticated DELETE on workout_session_exercises denied',
  $sql$DELETE FROM public.workout_session_exercises$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('G-020', 'grants', 'authenticated DELETE on workout_session_sets denied',
  $sql$DELETE FROM public.workout_session_sets$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('G-021', 'grants', 'authenticated DELETE on workout_session_adjustments denied',
  $sql$DELETE FROM public.workout_session_adjustments$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

-- =====================================================================
-- G4 — anonymous reads and writes denied
-- =====================================================================
SELECT test.run('G-022', 'grants', 'anon SELECT on workout_sessions denied',
  $sql$SELECT count(*) FROM public.workout_sessions$sql$, '42501', 'anon');
SELECT test.run('G-023', 'grants', 'anon SELECT on workout_session_exercises denied',
  $sql$SELECT count(*) FROM public.workout_session_exercises$sql$, '42501', 'anon');
SELECT test.run('G-024', 'grants', 'anon SELECT on workout_session_sets denied',
  $sql$SELECT count(*) FROM public.workout_session_sets$sql$, '42501', 'anon');
SELECT test.run('G-025', 'grants', 'anon SELECT on workout_session_adjustments denied',
  $sql$SELECT count(*) FROM public.workout_session_adjustments$sql$, '42501', 'anon');
SELECT test.run('G-026', 'grants', 'anon INSERT into workout_sessions denied', $sql$
  INSERT INTO public.workout_sessions
    (user_id, ingestion_key, command_fingerprint, source, occurred_at, occurred_timezone,
     occurred_timezone_source, local_day, workout_title_snapshot, calories_source, app_version, confirmation_received_at)
  VALUES ('00000000-0000-4000-8000-0000000000a1','g026',repeat('a',64),'adhoc_workout',
     '2026-09-05T10:00:00Z','UTC','assumed_utc',DATE '2026-09-05','T','unknown','0.0.0-test','2026-09-05T10:30:00Z')
$sql$, '42501', 'anon');
SELECT test.run('G-027', 'grants', 'anon UPDATE on workout_sessions denied',
  $sql$UPDATE public.workout_sessions SET notes = 'x'$sql$, '42501', 'anon');
SELECT test.run('G-028', 'grants', 'anon DELETE on workout_session_sets denied',
  $sql$DELETE FROM public.workout_session_sets$sql$, '42501', 'anon');

-- =====================================================================
-- G5 — service_role: SELECT + INSERT allowed, UPDATE/DELETE denied
-- =====================================================================
SELECT test.run('G-029', 'grants', 'service_role SELECT on workout_sessions allowed and bypasses RLS', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(DISTINCT user_id) FROM public.workout_sessions) < 2 THEN
      RAISE EXCEPTION 'service_role does not see all owners';
    END IF;
  END $chk$;
$sql$, '00000', 'service_role');
SELECT test.run('G-030', 'grants', 'service_role SELECT on workout_session_exercises allowed',
  $sql$SELECT count(*) FROM public.workout_session_exercises$sql$, '00000', 'service_role');
SELECT test.run('G-031', 'grants', 'service_role SELECT on workout_session_sets allowed',
  $sql$SELECT count(*) FROM public.workout_session_sets$sql$, '00000', 'service_role');
SELECT test.run('G-032', 'grants', 'service_role SELECT on workout_session_adjustments allowed',
  $sql$SELECT count(*) FROM public.workout_session_adjustments$sql$, '00000', 'service_role');

SELECT test.run('G-033', 'grants', 'service_role INSERT into workout_sessions allowed', $sql$
  INSERT INTO public.workout_sessions
    (id, user_id, ingestion_key, command_fingerprint, source, occurred_at, occurred_timezone,
     occurred_timezone_source, local_day, workout_title_snapshot, calories_source, app_version, confirmation_received_at)
  VALUES ('10000000-0000-4000-8000-0000000000f1','00000000-0000-4000-8000-0000000000a1','g033',repeat('a',64),'adhoc_workout',
     '2026-09-05T10:00:00Z','UTC','assumed_utc',DATE '2026-09-05','T','unknown','0.0.0-test','2026-09-05T10:30:00Z')
$sql$, '00000', 'service_role');
SELECT test.run('G-034', 'grants', 'service_role INSERT into workout_session_exercises allowed', $sql$
  INSERT INTO public.workout_session_exercises (id, session_id, user_id, order_index, exercise_key_snapshot, exercise_name_snapshot, prescription_snapshot, status)
  VALUES ('20000000-0000-4000-8000-0000000000f1','10000000-0000-4000-8000-0000000000f1','00000000-0000-4000-8000-0000000000a1',0,'k','N','{"version":1,"planned_sets":2,"reps_text":"10"}'::jsonb,'completed')
$sql$, '00000', 'service_role');
SELECT test.run('G-035', 'grants', 'service_role INSERT into workout_session_sets allowed', $sql$
  INSERT INTO public.workout_session_sets (session_exercise_id, user_id, set_index, reps, is_completed)
  VALUES ('20000000-0000-4000-8000-0000000000f1','00000000-0000-4000-8000-0000000000a1',0,10,true)
$sql$, '00000', 'service_role');
SELECT test.run('G-036', 'grants', 'service_role INSERT into workout_session_adjustments allowed', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, reason_code, occurred_at, actor_type)
  VALUES ('00000000-0000-4000-8000-0000000000a1','g036',repeat('a',64),'void','10000000-0000-4000-8000-0000000000f1','system_correction','2026-09-05T10:00:00Z','system')
$sql$, '00000', 'service_role');

SELECT test.run('G-037', 'grants', 'service_role UPDATE on workout_sessions denied',
  $sql$UPDATE public.workout_sessions SET notes = 'x'$sql$, '42501', 'service_role');
SELECT test.run('G-038', 'grants', 'service_role UPDATE on workout_session_exercises denied',
  $sql$UPDATE public.workout_session_exercises SET notes = 'x'$sql$, '42501', 'service_role');
SELECT test.run('G-039', 'grants', 'service_role UPDATE on workout_session_sets denied',
  $sql$UPDATE public.workout_session_sets SET reps = 1$sql$, '42501', 'service_role');
SELECT test.run('G-040', 'grants', 'service_role UPDATE on workout_session_adjustments denied',
  $sql$UPDATE public.workout_session_adjustments SET reason_text = 'x'$sql$, '42501', 'service_role');
SELECT test.run('G-041', 'grants', 'service_role DELETE on workout_sessions denied',
  $sql$DELETE FROM public.workout_sessions$sql$, '42501', 'service_role');
SELECT test.run('G-042', 'grants', 'service_role DELETE on workout_session_exercises denied',
  $sql$DELETE FROM public.workout_session_exercises$sql$, '42501', 'service_role');
SELECT test.run('G-043', 'grants', 'service_role DELETE on workout_session_sets denied',
  $sql$DELETE FROM public.workout_session_sets$sql$, '42501', 'service_role');
SELECT test.run('G-044', 'grants', 'service_role DELETE on workout_session_adjustments denied',
  $sql$DELETE FROM public.workout_session_adjustments$sql$, '42501', 'service_role');

-- =====================================================================
-- G6 — composite ownership still enforced under service_role
-- =====================================================================
SELECT test.run('G-045', 'ownership', 'service_role cannot attach an exercise to another user''s session', $sql$
  INSERT INTO public.workout_session_exercises (session_id, user_id, order_index, exercise_key_snapshot, exercise_name_snapshot, prescription_snapshot, status)
  VALUES ('10000000-0000-4000-8000-0000000000f1','00000000-0000-4000-8000-0000000000a2',7,'k','N','{"version":1,"planned_sets":1,"reps_text":"1"}'::jsonb,'completed')
$sql$, '23503', 'service_role');
SELECT test.run('G-046', 'ownership', 'service_role cannot attach a set to another user''s exercise', $sql$
  INSERT INTO public.workout_session_sets (session_exercise_id, user_id, set_index, reps, is_completed)
  VALUES ('20000000-0000-4000-8000-0000000000f1','00000000-0000-4000-8000-0000000000a2',7,5,true)
$sql$, '23503', 'service_role');
SELECT test.run('G-047', 'ownership', 'service_role cannot target another user''s session in an adjustment', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, reason_code, occurred_at, actor_type)
  VALUES ('00000000-0000-4000-8000-0000000000a2','g047',repeat('a',64),'void','10000000-0000-4000-8000-000000000001','system_correction','2026-09-05T10:00:00Z','system')
$sql$, '23503', 'service_role');
