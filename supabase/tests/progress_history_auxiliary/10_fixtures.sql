-- Sprint 8.1A2 — disposable fixtures for the auxiliary facts suite.
-- NOT A MIGRATION. Only synthetic UUIDs and synthetic e-mail addresses.

INSERT INTO auth.users (id, email) VALUES
  ('00000000-0000-4000-8000-0000000000a1', 'user-a@disposable.test'),
  ('00000000-0000-4000-8000-0000000000a2', 'user-b@disposable.test'),
  ('00000000-0000-4000-8000-0000000000a3', 'user-c@disposable.test');

-- ---------------------------------------------------------------------
-- Hydration fixtures
-- ---------------------------------------------------------------------
-- A: entry used as a valid void target (no void yet).
INSERT INTO public.hydration_facts (
  id, user_id, ingestion_key, fact_fingerprint, kind,
  occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml
) VALUES (
  '50000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-0000000000a1',
  'hydration:00000000-0000-4000-8000-000000000001',
  repeat('a', 64), 'entry',
  '2026-09-01T10:00:00Z', 'UTC', 'assumed_utc', DATE '2026-09-01', 500
);

-- A: entry that already carries one direct void (duplicate-void case).
INSERT INTO public.hydration_facts (
  id, user_id, ingestion_key, fact_fingerprint, kind,
  occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml
) VALUES (
  '50000000-0000-4000-8000-000000000002',
  '00000000-0000-4000-8000-0000000000a1',
  'hydration:00000000-0000-4000-8000-000000000002',
  repeat('a', 64), 'entry',
  '2026-09-01T11:00:00Z', 'UTC', 'assumed_utc', DATE '2026-09-01', 250
);

INSERT INTO public.hydration_facts (
  id, user_id, ingestion_key, fact_fingerprint, kind, target_fact_id,
  occurred_at, occurred_timezone, occurred_timezone_source, local_day
) VALUES (
  '50000000-0000-4000-8000-00000000000a',
  '00000000-0000-4000-8000-0000000000a1',
  'hydration:00000000-0000-4000-8000-00000000000a',
  repeat('b', 64), 'void',
  '50000000-0000-4000-8000-000000000002',
  '2026-09-01T11:30:00Z', 'UTC', 'assumed_utc', DATE '2026-09-01'
);

-- B: entry (must never be reachable by A, and never voidable by A).
INSERT INTO public.hydration_facts (
  id, user_id, ingestion_key, fact_fingerprint, kind,
  occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml
) VALUES (
  '50000000-0000-4000-8000-000000000003',
  '00000000-0000-4000-8000-0000000000a2',
  'hydration:00000000-0000-4000-8000-000000000003',
  repeat('c', 64), 'entry',
  '2026-09-01T10:00:00Z', 'UTC', 'assumed_utc', DATE '2026-09-01', 700
);

-- C: cascade fixture.
INSERT INTO public.hydration_facts (
  id, user_id, ingestion_key, fact_fingerprint, kind,
  occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml
) VALUES (
  '50000000-0000-4000-8000-000000000004',
  '00000000-0000-4000-8000-0000000000a3',
  'hydration:00000000-0000-4000-8000-000000000004',
  repeat('d', 64), 'entry',
  '2026-09-01T10:00:00Z', 'UTC', 'assumed_utc', DATE '2026-09-01', 300
);

-- ---------------------------------------------------------------------
-- Meal adherence fixtures
-- ---------------------------------------------------------------------
INSERT INTO public.meal_adherence_facts (
  id, user_id, ingestion_key, fact_fingerprint,
  occurred_at, occurred_timezone, occurred_timezone_source, local_day,
  meal_key, adhered
) VALUES
  ('60000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000a1',
   'meal:00000000-0000-4000-8000-000000000001',
   repeat('a', 64),
   '2026-09-01T08:00:00Z', 'UTC', 'assumed_utc', DATE '2026-09-01',
   'breakfast', true),
  ('60000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-0000000000a2',
   'meal:00000000-0000-4000-8000-000000000002',
   repeat('c', 64),
   '2026-09-01T08:00:00Z', 'UTC', 'assumed_utc', DATE '2026-09-01',
   'breakfast', false),
  ('60000000-0000-4000-8000-000000000003',
   '00000000-0000-4000-8000-0000000000a3',
   'meal:00000000-0000-4000-8000-000000000003',
   repeat('d', 64),
   '2026-09-01T08:00:00Z', 'UTC', 'assumed_utc', DATE '2026-09-01',
   'lunch', true);

-- ---------------------------------------------------------------------
-- Daily target fixtures
-- ---------------------------------------------------------------------
INSERT INTO public.daily_target_snapshots (
  id, user_id, ingestion_key, fact_fingerprint,
  captured_at, captured_timezone, captured_timezone_source, local_day,
  calorie_target_kcal, calculation_weight_kg, target_source, target_algorithm_version
) VALUES
  ('70000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-0000000000a1',
   'daily-target:00000000-0000-4000-8000-000000000001',
   repeat('a', 64),
   '2026-09-01T06:00:00Z', 'UTC', 'assumed_utc', DATE '2026-09-01',
   2400.00, 78.50, 'calculated', 'tdee-v1'),
  ('70000000-0000-4000-8000-000000000002',
   '00000000-0000-4000-8000-0000000000a2',
   'daily-target:00000000-0000-4000-8000-000000000002',
   repeat('c', 64),
   '2026-09-01T06:00:00Z', 'UTC', 'assumed_utc', DATE '2026-09-01',
   2100.00, NULL, 'user_entered', NULL),
  ('70000000-0000-4000-8000-000000000003',
   '00000000-0000-4000-8000-0000000000a3',
   'daily-target:00000000-0000-4000-8000-000000000003',
   repeat('d', 64),
   '2026-09-01T06:00:00Z', 'UTC', 'assumed_utc', DATE '2026-09-01',
   1900.00, NULL, 'unknown', NULL);
