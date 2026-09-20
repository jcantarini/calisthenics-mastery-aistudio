-- Sprint 8.1A2 — behavioural security cases for the auxiliary facts,
-- executed under real roles. NOT A MIGRATION.
--
-- service_role is created with BYPASSRLS, mirroring Supabase: RLS is therefore
-- asserted for user-facing roles only, and service-role safety rests on the
-- explicit least-privilege grants asserted below.

-- =====================================================================
-- R — own-row visibility under authenticated
-- =====================================================================
SELECT test.run('R-001', 'rls', 'A reads its own hydration_facts rows', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.hydration_facts) = 0 THEN
      RAISE EXCEPTION 'A cannot see its own hydration facts';
    END IF;
  END $chk$;
$sql$, '00000', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

SELECT test.run('R-002', 'rls', 'A reads its own meal_adherence_facts rows', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.meal_adherence_facts) = 0 THEN
      RAISE EXCEPTION 'A cannot see its own meal facts';
    END IF;
  END $chk$;
$sql$, '00000', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

SELECT test.run('R-003', 'rls', 'A reads its own daily_target_snapshots rows', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.daily_target_snapshots) = 0 THEN
      RAISE EXCEPTION 'A cannot see its own daily targets';
    END IF;
  END $chk$;
$sql$, '00000', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

SELECT test.run('R-004', 'rls', 'A cannot read other users hydration_facts rows', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.hydration_facts
        WHERE user_id <> '00000000-0000-4000-8000-0000000000a1') <> 0 THEN
      RAISE EXCEPTION 'cross-user hydration leak';
    END IF;
  END $chk$;
$sql$, '00000', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

SELECT test.run('R-005', 'rls', 'A cannot read other users meal_adherence_facts rows', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.meal_adherence_facts
        WHERE user_id <> '00000000-0000-4000-8000-0000000000a1') <> 0 THEN
      RAISE EXCEPTION 'cross-user meal leak';
    END IF;
  END $chk$;
$sql$, '00000', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

SELECT test.run('R-006', 'rls', 'A cannot read other users daily_target_snapshots rows', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.daily_target_snapshots
        WHERE user_id <> '00000000-0000-4000-8000-0000000000a1') <> 0 THEN
      RAISE EXCEPTION 'cross-user daily target leak';
    END IF;
  END $chk$;
$sql$, '00000', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

SELECT test.run('R-007', 'rls', 'B sees only its own auxiliary rows', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.hydration_facts) = 0
       OR (SELECT count(*) FROM public.hydration_facts
           WHERE user_id <> '00000000-0000-4000-8000-0000000000a2') <> 0
       OR (SELECT count(*) FROM public.meal_adherence_facts
           WHERE user_id <> '00000000-0000-4000-8000-0000000000a2') <> 0
       OR (SELECT count(*) FROM public.daily_target_snapshots
           WHERE user_id <> '00000000-0000-4000-8000-0000000000a2') <> 0 THEN
      RAISE EXCEPTION 'B visibility incorrect';
    END IF;
  END $chk$;
$sql$, '00000', 'authenticated', '00000000-0000-4000-8000-0000000000a2');

-- =====================================================================
-- P1 — authenticated writes denied (no grants: 42501)
-- =====================================================================
SELECT test.run('P-001', 'grants', 'authenticated INSERT into hydration_facts denied', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000401',
    repeat('a',64),'entry','2026-09-04T10:00:00Z','UTC','assumed_utc',DATE '2026-09-04',100)
$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

SELECT test.run('P-002', 'grants', 'authenticated INSERT into meal_adherence_facts denied', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-000000000402',
    repeat('a',64),'2026-09-04T08:00:00Z','UTC','assumed_utc',DATE '2026-09-04','lunch',true)
$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

SELECT test.run('P-003', 'grants', 'authenticated INSERT into daily_target_snapshots denied', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day, calorie_target_kcal, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000403',
    repeat('a',64),'2026-09-04T06:00:00Z','UTC','assumed_utc',DATE '2026-09-04',2000.00,'unknown')
$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

SELECT test.run('P-004', 'grants', 'authenticated UPDATE on hydration_facts denied',
  $sql$UPDATE public.hydration_facts SET volume_ml = 1$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('P-005', 'grants', 'authenticated UPDATE on meal_adherence_facts denied',
  $sql$UPDATE public.meal_adherence_facts SET adhered = false$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('P-006', 'grants', 'authenticated UPDATE on daily_target_snapshots denied',
  $sql$UPDATE public.daily_target_snapshots SET calorie_target_kcal = 1$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

SELECT test.run('P-007', 'grants', 'authenticated DELETE on hydration_facts denied',
  $sql$DELETE FROM public.hydration_facts$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('P-008', 'grants', 'authenticated DELETE on meal_adherence_facts denied',
  $sql$DELETE FROM public.meal_adherence_facts$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');
SELECT test.run('P-009', 'grants', 'authenticated DELETE on daily_target_snapshots denied',
  $sql$DELETE FROM public.daily_target_snapshots$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

-- =====================================================================
-- P2 — anonymous access denied entirely
-- =====================================================================
SELECT test.run('P-010', 'grants', 'anon SELECT on hydration_facts denied',
  $sql$SELECT count(*) FROM public.hydration_facts$sql$, '42501', 'anon');
SELECT test.run('P-011', 'grants', 'anon SELECT on meal_adherence_facts denied',
  $sql$SELECT count(*) FROM public.meal_adherence_facts$sql$, '42501', 'anon');
SELECT test.run('P-012', 'grants', 'anon SELECT on daily_target_snapshots denied',
  $sql$SELECT count(*) FROM public.daily_target_snapshots$sql$, '42501', 'anon');
SELECT test.run('P-013', 'grants', 'anon INSERT into hydration_facts denied', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000404',
    repeat('a',64),'entry','2026-09-04T10:00:00Z','UTC','assumed_utc',DATE '2026-09-04',100)
$sql$, '42501', 'anon');
SELECT test.run('P-014', 'grants', 'anon UPDATE on meal_adherence_facts denied',
  $sql$UPDATE public.meal_adherence_facts SET adhered = false$sql$, '42501', 'anon');
SELECT test.run('P-015', 'grants', 'anon DELETE on daily_target_snapshots denied',
  $sql$DELETE FROM public.daily_target_snapshots$sql$, '42501', 'anon');

-- =====================================================================
-- P3 — service_role: SELECT + INSERT allowed, UPDATE/DELETE denied
-- =====================================================================
SELECT test.run('P-016', 'grants', 'service_role SELECT on hydration_facts allowed and bypasses RLS', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(DISTINCT user_id) FROM public.hydration_facts) < 2 THEN
      RAISE EXCEPTION 'service_role does not see all owners';
    END IF;
  END $chk$;
$sql$, '00000', 'service_role');
SELECT test.run('P-017', 'grants', 'service_role SELECT on meal_adherence_facts allowed',
  $sql$SELECT count(*) FROM public.meal_adherence_facts$sql$, '00000', 'service_role');
SELECT test.run('P-018', 'grants', 'service_role SELECT on daily_target_snapshots allowed',
  $sql$SELECT count(*) FROM public.daily_target_snapshots$sql$, '00000', 'service_role');

SELECT test.run('P-019', 'grants', 'service_role INSERT into hydration_facts allowed', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000405',
    repeat('a',64),'entry','2026-09-04T10:00:00Z','UTC','assumed_utc',DATE '2026-09-04',450)
$sql$, '00000', 'service_role');
SELECT test.run('P-020', 'grants', 'service_role INSERT into meal_adherence_facts allowed', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-000000000406',
    repeat('a',64),'2026-09-04T08:00:00Z','UTC','assumed_utc',DATE '2026-09-04','dinner',true)
$sql$, '00000', 'service_role');
SELECT test.run('P-021', 'grants', 'service_role INSERT into daily_target_snapshots allowed', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day, calorie_target_kcal, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000407',
    repeat('a',64),'2026-09-04T06:00:00Z','UTC','assumed_utc',DATE '2026-09-04',2300.00,'unknown')
$sql$, '00000', 'service_role');

SELECT test.run('P-022', 'grants', 'service_role UPDATE on hydration_facts denied',
  $sql$UPDATE public.hydration_facts SET volume_ml = 1$sql$, '42501', 'service_role');
SELECT test.run('P-023', 'grants', 'service_role UPDATE on meal_adherence_facts denied',
  $sql$UPDATE public.meal_adherence_facts SET adhered = false$sql$, '42501', 'service_role');
SELECT test.run('P-024', 'grants', 'service_role UPDATE on daily_target_snapshots denied',
  $sql$UPDATE public.daily_target_snapshots SET calorie_target_kcal = 1$sql$, '42501', 'service_role');
SELECT test.run('P-025', 'grants', 'service_role DELETE on hydration_facts denied',
  $sql$DELETE FROM public.hydration_facts$sql$, '42501', 'service_role');
SELECT test.run('P-026', 'grants', 'service_role DELETE on meal_adherence_facts denied',
  $sql$DELETE FROM public.meal_adherence_facts$sql$, '42501', 'service_role');
SELECT test.run('P-027', 'grants', 'service_role DELETE on daily_target_snapshots denied',
  $sql$DELETE FROM public.daily_target_snapshots$sql$, '42501', 'service_role');

SELECT test.run('P-028', 'ownership', 'service_role cannot void another user hydration entry', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind, target_fact_id,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day)
  VALUES ('00000000-0000-4000-8000-0000000000a2','hydration:00000000-0000-4000-8000-000000000408',
    repeat('a',64),'void','50000000-0000-4000-8000-000000000001',
    '2026-09-04T10:00:00Z','UTC','assumed_utc',DATE '2026-09-04')
$sql$, '23503', 'service_role');

-- =====================================================================
-- C — account-deletion cascade (administrative role only)
-- =====================================================================
SELECT test.run('C-001', 'cascade', 'user C owns auxiliary rows before deletion', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.hydration_facts WHERE user_id = '00000000-0000-4000-8000-0000000000a3') = 0
       OR (SELECT count(*) FROM public.meal_adherence_facts WHERE user_id = '00000000-0000-4000-8000-0000000000a3') = 0
       OR (SELECT count(*) FROM public.daily_target_snapshots WHERE user_id = '00000000-0000-4000-8000-0000000000a3') = 0 THEN
      RAISE EXCEPTION 'cascade fixtures missing';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('C-002', 'cascade', 'deleting the auth user removes their auxiliary rows',
  $sql$DELETE FROM auth.users WHERE id = '00000000-0000-4000-8000-0000000000a3'$sql$);

SELECT test.run('C-003', 'cascade', 'no auxiliary row of the deleted user remains', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.hydration_facts WHERE user_id = '00000000-0000-4000-8000-0000000000a3') <> 0
       OR (SELECT count(*) FROM public.meal_adherence_facts WHERE user_id = '00000000-0000-4000-8000-0000000000a3') <> 0
       OR (SELECT count(*) FROM public.daily_target_snapshots WHERE user_id = '00000000-0000-4000-8000-0000000000a3') <> 0 THEN
      RAISE EXCEPTION 'account-deletion cascade incomplete';
    END IF;
  END $chk$;
$sql$);
