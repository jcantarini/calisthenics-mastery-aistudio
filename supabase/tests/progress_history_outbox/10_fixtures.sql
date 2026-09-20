-- Sprint 8.1A3 — disposable fixtures for the durable dispatch outbox suite.
-- NOT A MIGRATION. Only synthetic UUIDs and synthetic e-mail addresses.

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'user-a@disposable.test'),
  ('00000000-0000-4000-8000-0000000000a2', 'user-b@disposable.test'),
  ('00000000-0000-4000-8000-0000000000a3', 'user-c@disposable.test');

-- Reusable session template (mirrors the core suite helper).
CREATE FUNCTION test.new_session(
  p_id uuid,
  p_user uuid,
  p_key text
) RETURNS uuid
LANGUAGE sql
AS $$
  INSERT INTO public.workout_sessions (
    id, user_id, ingestion_key, command_fingerprint, source,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day,
    workout_title_snapshot, calories_source, app_version, confirmation_received_at
  ) VALUES (
    p_id, p_user, p_key, repeat('a', 64), 'adhoc_workout',
    '2026-09-01T10:00:00Z', 'UTC', 'assumed_utc', DATE '2026-09-01',
    'Disposable session', 'unknown', '0.0.0-test', '2026-09-01T10:30:00Z'
  )
  RETURNING id;
$$;

-- User A sessions
SELECT test.new_session('11000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'outbox-a-1');
SELECT test.new_session('11000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a1', 'outbox-a-2');
SELECT test.new_session('11000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000a1', 'outbox-a-3-void-target');
SELECT test.new_session('11000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-0000000000a1', 'outbox-a-4-correction-target');
SELECT test.new_session('11000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-0000000000a1', 'outbox-a-5-replacement');
SELECT test.new_session('11000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-0000000000a1', 'outbox-a-6-mutability');
SELECT test.new_session('11000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-0000000000a1', 'outbox-a-7-states');
SELECT test.new_session('11000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-0000000000a1', 'outbox-a-8-service-role');
SELECT test.new_session('11000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-0000000000a1', 'outbox-a-9-states');
SELECT test.new_session('11000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a1', 'outbox-a-10-bounds');

-- User B sessions (must never be referenced by a user A outbox row)
SELECT test.new_session('11000000-0000-4000-8000-0000000000b1', '00000000-0000-4000-8000-0000000000a2', 'outbox-b-1');
SELECT test.new_session('11000000-0000-4000-8000-0000000000b2', '00000000-0000-4000-8000-0000000000a2', 'outbox-b-2-void-target');

-- User C session (account-deletion cascade)
SELECT test.new_session('11000000-0000-4000-8000-0000000000c1', '00000000-0000-4000-8000-0000000000a3', 'outbox-c-1');

-- Adjustments -----------------------------------------------------------
INSERT INTO public.workout_session_adjustments (
  id, user_id, adjustment_key, command_fingerprint, kind,
  target_session_id, reason_code, occurred_at, actor_type, actor_id
) VALUES (
  '41000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-0000000000a1',
  'outbox-a-void', repeat('b', 64), 'void',
  '11000000-0000-4000-8000-000000000003',
  'user_requested', '2026-09-02T09:00:00Z', 'user',
  '00000000-0000-4000-8000-0000000000a1'
);

INSERT INTO public.workout_session_adjustments (
  id, user_id, adjustment_key, command_fingerprint, kind,
  target_session_id, replacement_session_id, reason_code, occurred_at, actor_type, actor_id
) VALUES (
  '41000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-0000000000a1',
  'outbox-a-correction', repeat('b', 64), 'correction',
  '11000000-0000-4000-8000-000000000004',
  '11000000-0000-4000-8000-000000000005',
  'user_requested', '2026-09-02T09:30:00Z', 'user',
  '00000000-0000-4000-8000-0000000000a1'
);

INSERT INTO public.workout_session_adjustments (
  id, user_id, adjustment_key, command_fingerprint, kind,
  target_session_id, reason_code, occurred_at, actor_type
) VALUES (
  '41000000-0000-4000-8000-0000000000b1',
  '00000000-0000-4000-8000-0000000000a2',
  'outbox-b-void', repeat('c', 64), 'void',
  '11000000-0000-4000-8000-0000000000b2',
  'system_correction', '2026-09-02T09:00:00Z', 'system'
);

-- Outbox row owned by user C, used by the account-deletion cascade cases.
INSERT INTO public.history_dispatch_outbox (
  id, user_id, session_id, event_kind, consumer
) VALUES (
  '80000000-0000-4000-8000-0000000000c1',
  '00000000-0000-4000-8000-0000000000a3',
  '11000000-0000-4000-8000-0000000000c1',
  'session_completed', 'gamification'
);
