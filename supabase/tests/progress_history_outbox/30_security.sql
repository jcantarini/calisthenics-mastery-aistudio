-- Sprint 8.1A3 — behavioural security and deletion cases for
-- public.history_dispatch_outbox, executed under real roles. NOT A MIGRATION.
--
-- service_role is created with BYPASSRLS, mirroring Supabase: RLS never
-- constrains it. Outbox safety for user-facing roles rests on the complete
-- absence of grants, and cross-user safety on the composite ownership FKs.

-- =====================================================================
-- S — grant matrix
-- =====================================================================
SELECT test.run('S-001', 'grants', 'authenticated SELECT on the outbox denied',
  $sql$SELECT count(*) FROM public.history_dispatch_outbox$sql$,
  '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

SELECT test.run('S-002', 'grants', 'authenticated INSERT into the outbox denied', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000008',
          'session_completed','gamification')
$sql$, '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

SELECT test.run('S-003', 'grants', 'authenticated UPDATE on the outbox denied',
  $sql$UPDATE public.history_dispatch_outbox SET state = 'delivered'$sql$,
  '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

SELECT test.run('S-004', 'grants', 'authenticated DELETE on the outbox denied',
  $sql$DELETE FROM public.history_dispatch_outbox$sql$,
  '42501', 'authenticated', '00000000-0000-4000-8000-0000000000a1');

SELECT test.run('S-005', 'grants', 'anon SELECT on the outbox denied',
  $sql$SELECT count(*) FROM public.history_dispatch_outbox$sql$, '42501', 'anon');

SELECT test.run('S-006', 'grants', 'anon INSERT into the outbox denied', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000008',
          'session_completed','gamification')
$sql$, '42501', 'anon');

SELECT test.run('S-007', 'grants', 'anon UPDATE on the outbox denied',
  $sql$UPDATE public.history_dispatch_outbox SET state = 'delivered'$sql$, '42501', 'anon');

SELECT test.run('S-008', 'grants', 'anon DELETE on the outbox denied',
  $sql$DELETE FROM public.history_dispatch_outbox$sql$, '42501', 'anon');

SELECT test.run('S-009', 'grants', 'service_role SELECT on the outbox allowed',
  $sql$SELECT count(*) FROM public.history_dispatch_outbox$sql$, '00000', 'service_role');

SELECT test.run('S-010', 'grants', 'service_role INSERT into the outbox allowed', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer)
  VALUES ('80000000-0000-4000-8000-000000000080','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000008','session_completed','gamification')
$sql$, '00000', 'service_role');

SELECT test.run('S-011', 'grants', 'service_role UPDATE on the outbox allowed', $sql$
  UPDATE public.history_dispatch_outbox
  SET state = 'processing', attempt_count = 1, lease_owner = 'worker-service',
      leased_at = '2026-09-04T10:00:00Z', lease_expires_at = '2026-09-04T10:02:00Z',
      updated_at = '2026-09-04T10:00:00Z'
  WHERE id = '80000000-0000-4000-8000-000000000080'
$sql$, '00000', 'service_role');

SELECT test.run('S-012', 'grants', 'service_role DELETE on the outbox allowed (retention boundary)',
  $sql$DELETE FROM public.history_dispatch_outbox WHERE id = '80000000-0000-4000-8000-000000000080'$sql$,
  '00000', 'service_role');

SELECT test.run('S-013', 'grants', 'service_role TRUNCATE on the outbox denied',
  $sql$TRUNCATE public.history_dispatch_outbox$sql$, '42501', 'service_role');

SELECT test.run('S-014', 'grants', 'service_role sees rows of every owner (RLS does not constrain it)', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(DISTINCT user_id) FROM public.history_dispatch_outbox) < 2 THEN
      RAISE EXCEPTION 'service_role does not see all owners';
    END IF;
  END $chk$;
$sql$, '00000', 'service_role');

SELECT test.run('S-015', 'ownership', 'service_role cannot attach a row to another users session', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-0000000000b1',
          'session_completed','goals')
$sql$, '23503', 'service_role');

-- =====================================================================
-- D — deletion boundaries
-- =====================================================================
SELECT test.run('D-001', 'deletion', 'deleting an outbox row succeeds',
  $sql$DELETE FROM public.history_dispatch_outbox WHERE id = '80000000-0000-4000-8000-000000000004'$sql$);

SELECT test.run('D-002', 'deletion', 'the subject session survives the outbox-row deletion', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.workout_sessions
        WHERE id = '11000000-0000-4000-8000-000000000003') <> 1 THEN
      RAISE EXCEPTION 'outbox deletion removed canonical history';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('D-003', 'deletion', 'the adjustment survives the outbox-row deletion', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.workout_session_adjustments
        WHERE id = '41000000-0000-4000-8000-000000000001') <> 1 THEN
      RAISE EXCEPTION 'outbox deletion removed an adjustment';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('D-004', 'cascade', 'user C owns an outbox row before deletion', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.history_dispatch_outbox
        WHERE user_id = '00000000-0000-4000-8000-0000000000a3') = 0 THEN
      RAISE EXCEPTION 'cascade fixture missing';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('D-005', 'cascade', 'deleting the auth user removes their outbox rows',
  $sql$DELETE FROM auth.users WHERE id = '00000000-0000-4000-8000-0000000000a3'$sql$);

SELECT test.run('D-006', 'cascade', 'no outbox row of the deleted user remains', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.history_dispatch_outbox
        WHERE user_id = '00000000-0000-4000-8000-0000000000a3') <> 0 THEN
      RAISE EXCEPTION 'account-deletion cascade incomplete';
    END IF;
  END $chk$;
$sql$);

-- =====================================================================
-- S — effective privileges under the real service_role (8.1A3-C1)
-- =====================================================================
SELECT test.run('S-016', 'grants',
  'service_role effective privileges are exactly the contracted four (no TRUNCATE, REFERENCES or TRIGGER)', $sql$
  DO $chk$
  DECLARE
    v_priv text;
  BEGIN
    FOREACH v_priv IN ARRAY ARRAY['SELECT','INSERT','UPDATE','DELETE'] LOOP
      IF NOT has_table_privilege(current_user, 'public.history_dispatch_outbox', v_priv) THEN
        RAISE EXCEPTION 'service_role lacks the contracted privilege %', v_priv;
      END IF;
    END LOOP;
    FOREACH v_priv IN ARRAY ARRAY['TRUNCATE','REFERENCES','TRIGGER'] LOOP
      IF has_table_privilege(current_user, 'public.history_dispatch_outbox', v_priv) THEN
        RAISE EXCEPTION 'service_role retained the forbidden privilege %', v_priv;
      END IF;
    END LOOP;
  END $chk$;
$sql$, '00000', 'service_role');
