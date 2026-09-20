-- Sprint 8.1A1-V1 — disposable fixtures. NOT A MIGRATION.
-- Only synthetic UUIDs and synthetic e-mail addresses; no real user data.

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'user-a@disposable.test'),
  ('00000000-0000-4000-8000-0000000000a2', 'user-b@disposable.test'),
  ('00000000-0000-4000-8000-0000000000a3', 'user-c@disposable.test');

-- Reusable session template. calories_source = 'unknown' keeps the
-- calorie sub-constraints out of unrelated cases.
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

SELECT test.new_session('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-0000000000a1', 'fixture-a-main');
SELECT test.new_session('10000000-0000-4000-8000-000000000002', '00000000-0000-4000-8000-0000000000a2', 'fixture-b-main');
SELECT test.new_session('10000000-0000-4000-8000-000000000003', '00000000-0000-4000-8000-0000000000a1', 'fixture-a-json-neg');
SELECT test.new_session('10000000-0000-4000-8000-000000000004', '00000000-0000-4000-8000-0000000000a1', 'fixture-a-json-pos');
SELECT test.new_session('10000000-0000-4000-8000-000000000005', '00000000-0000-4000-8000-0000000000a1', 'fixture-a-ordering');
SELECT test.new_session('10000000-0000-4000-8000-000000000006', '00000000-0000-4000-8000-0000000000a1', 'fixture-a-adj-target-1');
SELECT test.new_session('10000000-0000-4000-8000-000000000007', '00000000-0000-4000-8000-0000000000a1', 'fixture-a-adj-repl-1');
SELECT test.new_session('10000000-0000-4000-8000-000000000008', '00000000-0000-4000-8000-0000000000a1', 'fixture-a-adj-target-2');
SELECT test.new_session('10000000-0000-4000-8000-000000000009', '00000000-0000-4000-8000-0000000000a1', 'fixture-a-adj-target-3');
SELECT test.new_session('10000000-0000-4000-8000-00000000000a', '00000000-0000-4000-8000-0000000000a2', 'fixture-b-adj-target');
SELECT test.new_session('10000000-0000-4000-8000-00000000000b', '00000000-0000-4000-8000-0000000000a2', 'fixture-b-repl');
SELECT test.new_session('10000000-0000-4000-8000-00000000000c', '00000000-0000-4000-8000-0000000000a3', 'fixture-c-cascade');
SELECT test.new_session('10000000-0000-4000-8000-00000000000d', '00000000-0000-4000-8000-0000000000a1', 'fixture-a-service-role');

-- Baseline exercise + set for user A (visibility and cross-user parents).
INSERT INTO public.workout_session_exercises (
  id, session_id, user_id, order_index, exercise_key_snapshot,
  exercise_name_snapshot, prescription_snapshot, status
) VALUES (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-0000000000a1',
  0, 'pullup', 'Pull-up',
  '{"version":1,"planned_sets":3,"reps_text":"8-12"}'::jsonb,
  'completed'
);

INSERT INTO public.workout_session_sets (
  id, session_exercise_id, user_id, set_index, reps, is_completed
) VALUES (
  '30000000-0000-4000-8000-000000000001',
  '20000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-0000000000a1',
  0, 10, true
);

INSERT INTO public.workout_session_adjustments (
  id, user_id, adjustment_key, command_fingerprint, kind,
  target_session_id, reason_code, occurred_at, actor_type, actor_id
) VALUES (
  '40000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-0000000000a1',
  'fixture-a-void', repeat('b', 64), 'void',
  '10000000-0000-4000-8000-000000000006',
  'user_requested', '2026-09-02T09:00:00Z', 'user',
  '00000000-0000-4000-8000-0000000000a1'
);

-- Baseline rows for user B (must stay invisible to A).
INSERT INTO public.workout_session_exercises (
  id, session_id, user_id, order_index, exercise_key_snapshot,
  exercise_name_snapshot, prescription_snapshot, status
) VALUES (
  '20000000-0000-4000-8000-0000000000b1',
  '10000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-0000000000a2',
  0, 'dip', 'Dip',
  '{"version":1,"planned_sets":4,"reps_text":"6-10"}'::jsonb,
  'completed'
);

INSERT INTO public.workout_session_sets (
  id, session_exercise_id, user_id, set_index, reps, is_completed
) VALUES (
  '30000000-0000-4000-8000-0000000000b1',
  '20000000-0000-4000-8000-0000000000b1',
  '00000000-0000-4000-8000-0000000000a2',
  0, 8, true
);

INSERT INTO public.workout_session_adjustments (
  id, user_id, adjustment_key, command_fingerprint, kind,
  target_session_id, reason_code, occurred_at, actor_type
) VALUES (
  '40000000-0000-4000-8000-0000000000b1',
  '00000000-0000-4000-8000-0000000000a2',
  'fixture-b-void', repeat('c', 64), 'void',
  '10000000-0000-4000-8000-00000000000a',
  'system_correction', '2026-09-02T09:00:00Z', 'system'
);

-- Cascade fixtures for disposable user C.
INSERT INTO public.workout_session_exercises (
  id, session_id, user_id, order_index, exercise_key_snapshot,
  exercise_name_snapshot, prescription_snapshot, status
) VALUES (
  '20000000-0000-4000-8000-0000000000c1',
  '10000000-0000-4000-8000-00000000000c',
  '00000000-0000-4000-8000-0000000000a3',
  0, 'squat', 'Squat',
  '{"version":1,"planned_sets":3,"reps_text":"15"}'::jsonb,
  'completed'
);

INSERT INTO public.workout_session_sets (
  id, session_exercise_id, user_id, set_index, reps, is_completed
) VALUES (
  '30000000-0000-4000-8000-0000000000c1',
  '20000000-0000-4000-8000-0000000000c1',
  '00000000-0000-4000-8000-0000000000a3',
  0, 15, true
);

INSERT INTO public.workout_session_adjustments (
  id, user_id, adjustment_key, command_fingerprint, kind,
  target_session_id, reason_code, occurred_at, actor_type
) VALUES (
  '40000000-0000-4000-8000-0000000000c1',
  '00000000-0000-4000-8000-0000000000a3',
  'fixture-c-void', repeat('d', 64), 'void',
  '10000000-0000-4000-8000-00000000000c',
  'system_correction', '2026-09-02T09:00:00Z', 'system'
);

-- Exercise used by the set-ordering cases.
INSERT INTO public.workout_session_exercises (
  id, session_id, user_id, order_index, exercise_key_snapshot,
  exercise_name_snapshot, prescription_snapshot, status
) VALUES (
  '20000000-0000-4000-8000-0000000000d1',
  '10000000-0000-4000-8000-000000000005',
  '00000000-0000-4000-8000-0000000000a1',
  30, 'row', 'Row',
  '{"version":1,"planned_sets":3,"reps_text":"10"}'::jsonb,
  'completed'
);
