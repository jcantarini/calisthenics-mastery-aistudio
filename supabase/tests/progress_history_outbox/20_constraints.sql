-- Sprint 8.1A3 — structural cases for public.history_dispatch_outbox.
-- NOT A MIGRATION.
--
-- Only guarantees actually implemented by the schema are asserted here.
-- Claim/ack/recovery, lease and backoff behaviour, operator replay, retention
-- cleanup and cross-row transactional atomicity belong to the restricted
-- server-only functions of a later sprint and are deliberately NOT tested.

-- =====================================================================
-- B — valid rows, enum coverage, defaults and bounds
-- =====================================================================
SELECT test.run('B-001', 'shape', 'completion row for the gamification consumer', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer)
  VALUES ('80000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000001','session_completed','gamification')
$sql$);

SELECT test.run('B-002', 'shape', 'completion row for the goals consumer', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer)
  VALUES ('80000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000001','session_completed','goals')
$sql$);

SELECT test.run('B-003', 'shape', 'completion row for the training_plan_sync consumer', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer)
  VALUES ('80000000-0000-4000-8000-000000000003','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000001','session_completed','training_plan_sync')
$sql$);

SELECT test.run('B-004', 'shape', 'void row carries its adjustment and target session', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, adjustment_id, event_kind, consumer)
  VALUES ('80000000-0000-4000-8000-000000000004','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000003','41000000-0000-4000-8000-000000000001',
          'session_voided','gamification')
$sql$);

SELECT test.run('B-005', 'shape', 'correction row carries its adjustment and target session', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, adjustment_id, event_kind, consumer)
  VALUES ('80000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000004','41000000-0000-4000-8000-000000000002',
          'session_corrected','goals')
$sql$);

SELECT test.run('B-006', 'shape', 'contracted defaults are applied on insert', $sql$
  DO $chk$
  DECLARE r public.history_dispatch_outbox%ROWTYPE;
  BEGIN
    INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer)
    VALUES ('80000000-0000-4000-8000-000000000006','00000000-0000-4000-8000-0000000000a1',
            '11000000-0000-4000-8000-000000000002','session_completed','gamification');
    SELECT * INTO r FROM public.history_dispatch_outbox
      WHERE id = '80000000-0000-4000-8000-000000000006';
    IF r.state <> 'pending' OR r.attempt_count <> 0 OR r.event_version <> 1
       OR r.next_attempt_at IS NULL OR r.created_at IS NULL OR r.updated_at IS NULL
       OR r.adjustment_id IS NOT NULL OR r.leased_at IS NOT NULL
       OR r.lease_expires_at IS NOT NULL OR r.lease_owner IS NOT NULL
       OR r.last_error_code IS NOT NULL OR r.last_error_summary IS NOT NULL
       OR r.delivered_at IS NOT NULL THEN
      RAISE EXCEPTION 'outbox defaults drifted';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('B-007', 'shape', 'state pending is storable', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer, state)
  VALUES ('80000000-0000-4000-8000-000000000007','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000007','session_completed','gamification','pending')
$sql$);

SELECT test.run('B-008', 'shape', 'state processing with a lease is storable', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer,
    state, attempt_count, leased_at, lease_expires_at, lease_owner)
  VALUES ('80000000-0000-4000-8000-000000000008','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000007','session_completed','goals',
          'processing', 1, '2026-09-03T10:00:00Z', '2026-09-03T10:02:00Z', 'worker-1')
$sql$);

SELECT test.run('B-009', 'shape', 'state retry_scheduled is storable', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer,
    state, attempt_count, next_attempt_at, last_error_code, last_error_summary)
  VALUES ('80000000-0000-4000-8000-000000000009','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000007','session_completed','training_plan_sync',
          'retry_scheduled', 2, '2026-09-03T10:05:00Z', 'PH_DISPATCH_SEMANTICS_UNSUPPORTED',
          'consumer cannot apply void semantics yet')
$sql$);

SELECT test.run('B-010', 'shape', 'state delivered with delivered_at is storable', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer,
    state, attempt_count, delivered_at)
  VALUES ('80000000-0000-4000-8000-00000000000a','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000009','session_completed','gamification',
          'delivered', 1, '2026-09-03T10:10:00Z')
$sql$);

SELECT test.run('B-011', 'shape', 'state dead_letter with diagnostics is storable', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer,
    state, attempt_count, last_error_code, last_error_summary)
  VALUES ('80000000-0000-4000-8000-00000000000b','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000009','session_completed','goals',
          'dead_letter', 10, 'PH_DISPATCH_FAILED', 'attempt budget exhausted')
$sql$);

SELECT test.run('B-012', 'shape', 'attempt_count boundary value 0 accepted', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer, attempt_count)
  VALUES ('80000000-0000-4000-8000-00000000000c','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000009','session_completed','training_plan_sync', 0)
$sql$);

SELECT test.run('B-013', 'shape', 'attempt_count above the operational budget is accepted by the schema', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer, attempt_count)
  VALUES ('80000000-0000-4000-8000-00000000000d','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-00000000000a','session_completed','gamification', 99)
$sql$);

SELECT test.run('B-014', 'shape', 'maximum text lengths accepted (100 / 64 / 500)', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer,
    lease_owner, last_error_code, last_error_summary)
  VALUES ('80000000-0000-4000-8000-00000000000e','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-00000000000a','session_completed','goals',
          repeat('w', 100), repeat('E', 64), repeat('s', 500))
$sql$);

SELECT test.run('B-015', 'shape', 'all optional worker columns may stay null', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer,
    leased_at, lease_expires_at, lease_owner, last_error_code, last_error_summary, delivered_at)
  VALUES ('80000000-0000-4000-8000-00000000000f','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-00000000000a','session_completed','training_plan_sync',
          NULL, NULL, NULL, NULL, NULL, NULL)
$sql$);

-- =====================================================================
-- N — rejected values (23514 check, 23502 not-null, 23503 referential)
-- =====================================================================
SELECT test.run('N-001', 'enums', 'unknown event_kind rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_started','gamification')
$sql$, '23514');

SELECT test.run('N-002', 'enums', 'unknown consumer rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','analytics')
$sql$, '23514');

SELECT test.run('N-003', 'enums', 'unknown state rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer, state)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','gamification','queued')
$sql$, '23514');

SELECT test.run('N-004', 'bounds', 'negative attempt_count rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer, attempt_count)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','gamification', -1)
$sql$, '23514');

SELECT test.run('N-005', 'bounds', 'event_version 2 rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer, event_version)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','gamification', 2)
$sql$, '23514');

SELECT test.run('N-006', 'bounds', 'event_version 0 rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer, event_version)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','gamification', 0)
$sql$, '23514');

SELECT test.run('N-007', 'bounds', 'lease_owner over 100 characters rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer, lease_owner)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','gamification', repeat('w', 101))
$sql$, '23514');

SELECT test.run('N-008', 'bounds', 'empty lease_owner rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer, lease_owner)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','gamification', '')
$sql$, '23514');

SELECT test.run('N-009', 'bounds', 'last_error_code over 64 characters rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer, last_error_code)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','gamification', repeat('E', 65))
$sql$, '23514');

SELECT test.run('N-010', 'bounds', 'empty last_error_code rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer, last_error_code)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','gamification', '')
$sql$, '23514');

SELECT test.run('N-011', 'bounds', 'last_error_summary over 500 characters rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer, last_error_summary)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','gamification', repeat('s', 501))
$sql$, '23514');

SELECT test.run('N-012', 'bounds', 'empty last_error_summary rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer, last_error_summary)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','gamification', '')
$sql$, '23514');

SELECT test.run('N-013', 'shape', 'session_completed with an adjustment rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, adjustment_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000003',
          '41000000-0000-4000-8000-000000000001','session_completed','gamification')
$sql$, '23514');

SELECT test.run('N-014', 'shape', 'session_voided without an adjustment rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000003',
          'session_voided','gamification')
$sql$, '23514');

SELECT test.run('N-015', 'shape', 'session_corrected without an adjustment rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000004',
          'session_corrected','goals')
$sql$, '23514');

SELECT test.run('N-016', 'not_null', 'user_id null rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer)
  VALUES (NULL,'11000000-0000-4000-8000-000000000001','session_completed','gamification')
$sql$, '23502');

SELECT test.run('N-017', 'not_null', 'session_id null rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1',NULL,'session_completed','gamification')
$sql$, '23502');

SELECT test.run('N-018', 'not_null', 'event_kind null rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',NULL,'gamification')
$sql$, '23502');

SELECT test.run('N-019', 'not_null', 'consumer null rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001','session_completed',NULL)
$sql$, '23502');

SELECT test.run('N-020', 'not_null', 'state null rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer, state)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','gamification',NULL)
$sql$, '23502');

SELECT test.run('N-021', 'not_null', 'attempt_count null rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer, attempt_count)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','gamification',NULL)
$sql$, '23502');

SELECT test.run('N-022', 'not_null', 'next_attempt_at null rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer, next_attempt_at)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','gamification',NULL)
$sql$, '23502');

SELECT test.run('N-023', 'not_null', 'created_at null rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer, created_at)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','gamification',NULL)
$sql$, '23502');

SELECT test.run('N-024', 'not_null', 'updated_at null rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer, updated_at)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','gamification',NULL)
$sql$, '23502');

SELECT test.run('N-025', 'not_null', 'event_version null rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer, event_version)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000001',
          'session_completed','gamification',NULL)
$sql$, '23502');

SELECT test.run('N-026', 'referential', 'unknown session_id rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-0000000000ff',
          'session_completed','gamification')
$sql$, '23503');

SELECT test.run('N-027', 'referential', 'unknown adjustment_id rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, adjustment_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000003',
          '41000000-0000-4000-8000-0000000000ff','session_voided','gamification')
$sql$, '23503');

SELECT test.run('N-028', 'ownership', 'user A row cannot reference a session owned by B', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-0000000000b1',
          'session_completed','gamification')
$sql$, '23503');

SELECT test.run('N-029', 'ownership', 'user A row cannot reference an adjustment owned by B', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, adjustment_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000003',
          '41000000-0000-4000-8000-0000000000b1','session_voided','gamification')
$sql$, '23503');

SELECT test.run('N-030', 'referential', 'unknown owner rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000ff','11000000-0000-4000-8000-000000000002',
          'session_completed','training_plan_sync')
$sql$, '23503');

-- =====================================================================
-- U — duplicate protection under PostgreSQL null semantics (§12.1)
-- =====================================================================
SELECT test.run('U-001', 'uniqueness', 'duplicate completion for the same session and consumer rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000002',
          'session_completed','gamification')
$sql$, '23505');

SELECT test.run('U-002', 'uniqueness', 'same completion for a different consumer accepted', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer)
  VALUES ('80000000-0000-4000-8000-000000000020','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000002','session_completed','goals')
$sql$);

SELECT test.run('U-003', 'uniqueness', 'duplicate adjustment delivery for the same consumer rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (user_id, session_id, adjustment_id, event_kind, consumer)
  VALUES ('00000000-0000-4000-8000-0000000000a1','11000000-0000-4000-8000-000000000003',
          '41000000-0000-4000-8000-000000000001','session_voided','gamification')
$sql$, '23505');

SELECT test.run('U-004', 'uniqueness', 'same adjustment delivered to a different consumer accepted', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, adjustment_id, event_kind, consumer)
  VALUES ('80000000-0000-4000-8000-000000000021','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000003','41000000-0000-4000-8000-000000000001',
          'session_voided','goals')
$sql$);

SELECT test.run('U-005', 'uniqueness', 'same adjustment with a different event_kind accepted', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, adjustment_id, event_kind, consumer)
  VALUES ('80000000-0000-4000-8000-000000000022','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000003','41000000-0000-4000-8000-000000000001',
          'session_corrected','gamification')
$sql$);

SELECT test.run('U-006', 'uniqueness', 'same consumer for a different session accepted', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer)
  VALUES ('80000000-0000-4000-8000-000000000060','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000006','session_completed','gamification')
$sql$);

SELECT test.run('U-007', 'uniqueness', 'duplicate primary key rejected', $sql$
  INSERT INTO public.history_dispatch_outbox (id, user_id, session_id, event_kind, consumer)
  VALUES ('80000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000a1',
          '11000000-0000-4000-8000-000000000006','session_completed','goals')
$sql$, '23505');

-- =====================================================================
-- M — mutable operational state (the schema allows the transitions; the
-- state machine itself is enforced by future restricted functions)
-- =====================================================================
SELECT test.run('M-001', 'mutability', 'claim-shaped update to processing accepted', $sql$
  UPDATE public.history_dispatch_outbox
  SET state = 'processing', attempt_count = attempt_count + 1,
      leased_at = '2026-09-03T11:00:00Z', lease_expires_at = '2026-09-03T11:02:00Z',
      lease_owner = 'worker-7', updated_at = '2026-09-03T11:00:00Z'
  WHERE id = '80000000-0000-4000-8000-000000000060'
$sql$);

SELECT test.run('M-002', 'mutability', 'attempt_count beyond the operational budget accepted', $sql$
  UPDATE public.history_dispatch_outbox SET attempt_count = 25
  WHERE id = '80000000-0000-4000-8000-000000000060'
$sql$);

SELECT test.run('M-003', 'mutability', 'delivery-shaped update accepted', $sql$
  UPDATE public.history_dispatch_outbox
  SET state = 'delivered', delivered_at = '2026-09-03T11:01:00Z',
      leased_at = NULL, lease_expires_at = NULL, lease_owner = NULL,
      updated_at = '2026-09-03T11:01:00Z'
  WHERE id = '80000000-0000-4000-8000-000000000060'
$sql$);

SELECT test.run('M-004', 'mutability', 'dead-letter-shaped update accepted', $sql$
  UPDATE public.history_dispatch_outbox
  SET state = 'dead_letter', last_error_code = 'PH_DISPATCH_FAILED',
      last_error_summary = 'non-retryable failure', updated_at = '2026-09-03T11:05:00Z'
  WHERE id = '80000000-0000-4000-8000-000000000060'
$sql$);

SELECT test.run('M-005', 'mutability', 'update to an unknown state rejected', $sql$
  UPDATE public.history_dispatch_outbox SET state = 'done'
  WHERE id = '80000000-0000-4000-8000-000000000060'
$sql$, '23514');

SELECT test.run('M-006', 'mutability', 'update to a negative attempt_count rejected', $sql$
  UPDATE public.history_dispatch_outbox SET attempt_count = -5
  WHERE id = '80000000-0000-4000-8000-000000000060'
$sql$, '23514');

SELECT test.run('M-007', 'mutability', 'update breaking the event_kind / adjustment_id shape rejected', $sql$
  UPDATE public.history_dispatch_outbox SET event_kind = 'session_voided'
  WHERE id = '80000000-0000-4000-8000-000000000060'
$sql$, '23514');
