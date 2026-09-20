-- Progress History core schema (Sprint 8.1A1)
-- Implements ADR 0005 and the ratified Progress History domain contracts:
-- four immutable / append-only core entities only. No ingestion RPC, no
-- adjustment RPC, no outbox, no auxiliary facts, no views, no triggers.

-- =====================================================================
-- 1. public.workout_sessions
-- =====================================================================
CREATE TABLE public.workout_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingestion_key text NOT NULL,
  command_fingerprint text NOT NULL,
  source text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  occurred_at timestamptz NOT NULL,
  occurred_timezone text NOT NULL,
  occurred_timezone_source text NOT NULL,
  local_day date NOT NULL,
  source_plan_id uuid,
  source_planned_workout_id uuid,
  plan_name_snapshot text,
  workout_title_snapshot text NOT NULL,
  week_number_snapshot integer,
  day_number_snapshot integer,
  difficulty_snapshot text,
  estimated_duration_seconds integer,
  actual_duration_seconds integer,
  calories_kcal numeric(7, 2),
  calories_source text NOT NULL,
  calorie_algorithm_version text,
  calculation_weight_kg numeric(5, 2),
  notes text,
  app_version text NOT NULL,
  confirmation_received_at timestamptz NOT NULL,
  contract_version integer NOT NULL DEFAULT 1,
  CONSTRAINT workout_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT workout_sessions_id_user_id_key UNIQUE (id, user_id),
  CONSTRAINT workout_sessions_user_ingestion_key_key UNIQUE (user_id, ingestion_key),
  CONSTRAINT workout_sessions_ingestion_key_check
    CHECK (char_length(ingestion_key) BETWEEN 1 AND 128),
  CONSTRAINT workout_sessions_command_fingerprint_check
    CHECK (command_fingerprint ~ '^[0-9a-f]{64}$'),
  CONSTRAINT workout_sessions_source_check
    CHECK (source IN ('plan_workout', 'timer_session', 'first_workout', 'adhoc_workout')),
  CONSTRAINT workout_sessions_occurred_timezone_check
    CHECK (char_length(occurred_timezone) BETWEEN 1 AND 64),
  CONSTRAINT workout_sessions_occurred_timezone_source_check
    CHECK (occurred_timezone_source IN ('device', 'user_setting', 'assumed_utc')),
  CONSTRAINT workout_sessions_plan_name_snapshot_check
    CHECK (plan_name_snapshot IS NULL OR char_length(plan_name_snapshot) BETWEEN 1 AND 160),
  CONSTRAINT workout_sessions_workout_title_snapshot_check
    CHECK (char_length(workout_title_snapshot) BETWEEN 1 AND 160),
  CONSTRAINT workout_sessions_week_number_snapshot_check
    CHECK (week_number_snapshot IS NULL OR (week_number_snapshot >= 1 AND week_number_snapshot <= 520)),
  CONSTRAINT workout_sessions_day_number_snapshot_check
    CHECK (day_number_snapshot IS NULL OR (day_number_snapshot >= 1 AND day_number_snapshot <= 7)),
  CONSTRAINT workout_sessions_difficulty_snapshot_check
    CHECK (difficulty_snapshot IS NULL OR difficulty_snapshot IN ('beginner', 'intermediate', 'advanced')),
  CONSTRAINT workout_sessions_estimated_duration_seconds_check
    CHECK (estimated_duration_seconds IS NULL OR (estimated_duration_seconds >= 0 AND estimated_duration_seconds <= 86400)),
  CONSTRAINT workout_sessions_actual_duration_seconds_check
    CHECK (actual_duration_seconds IS NULL OR (actual_duration_seconds >= 0 AND actual_duration_seconds <= 86400)),
  CONSTRAINT workout_sessions_calories_kcal_check
    CHECK (calories_kcal IS NULL OR (calories_kcal >= 0 AND calories_kcal <= 20000)),
  CONSTRAINT workout_sessions_calories_source_check
    CHECK (calories_source IN ('estimated', 'measured', 'user_entered', 'unknown')),
  CONSTRAINT workout_sessions_calories_required_check
    CHECK (calories_source = 'unknown' OR calories_kcal IS NOT NULL),
  CONSTRAINT workout_sessions_calorie_algorithm_version_check
    CHECK (
      (calories_source = 'estimated' AND calorie_algorithm_version IS NOT NULL
        AND char_length(calorie_algorithm_version) BETWEEN 1 AND 32)
      OR (calories_source <> 'estimated' AND calorie_algorithm_version IS NULL)
    ),
  CONSTRAINT workout_sessions_calculation_weight_kg_check
    CHECK (calculation_weight_kg IS NULL OR (calculation_weight_kg > 0 AND calculation_weight_kg <= 500)),
  CONSTRAINT workout_sessions_calculation_weight_required_check
    CHECK (calories_source <> 'estimated' OR calculation_weight_kg IS NOT NULL),
  CONSTRAINT workout_sessions_notes_check
    CHECK (notes IS NULL OR char_length(notes) BETWEEN 1 AND 2000),
  CONSTRAINT workout_sessions_app_version_check
    CHECK (char_length(app_version) BETWEEN 1 AND 32),
  CONSTRAINT workout_sessions_plan_provenance_check
    CHECK (
      source <> 'plan_workout'
      OR (source_plan_id IS NOT NULL AND source_planned_workout_id IS NOT NULL)
    ),
  CONSTRAINT workout_sessions_contract_version_check
    CHECK (contract_version = 1)
);

CREATE INDEX workout_sessions_timeline_idx
  ON public.workout_sessions (user_id, occurred_at DESC, id DESC);
CREATE INDEX workout_sessions_user_local_day_idx
  ON public.workout_sessions (user_id, local_day);
CREATE INDEX workout_sessions_user_source_planned_workout_idx
  ON public.workout_sessions (user_id, source_planned_workout_id)
  WHERE source_planned_workout_id IS NOT NULL;

-- =====================================================================
-- 2. public.workout_session_exercises
-- =====================================================================
CREATE TABLE public.workout_session_exercises (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_index integer NOT NULL,
  exercise_id text,
  exercise_key_snapshot text NOT NULL,
  exercise_name_snapshot text NOT NULL,
  prescription_snapshot jsonb NOT NULL,
  substituted_for_exercise_id text,
  status text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  contract_version integer NOT NULL DEFAULT 1,
  CONSTRAINT workout_session_exercises_pkey PRIMARY KEY (id),
  CONSTRAINT workout_session_exercises_id_user_id_key UNIQUE (id, user_id),
  CONSTRAINT workout_session_exercises_session_order_key UNIQUE (session_id, order_index),
  CONSTRAINT workout_session_exercises_session_fkey
    FOREIGN KEY (session_id, user_id)
    REFERENCES public.workout_sessions (id, user_id) ON DELETE CASCADE,
  CONSTRAINT workout_session_exercises_order_index_check
    CHECK (order_index >= 0 AND order_index <= 1000),
  CONSTRAINT workout_session_exercises_exercise_id_check
    CHECK (exercise_id IS NULL OR exercise_id ~ '^[A-Za-z0-9_.:-]{1,64}$'),
  CONSTRAINT workout_session_exercises_substituted_for_check
    CHECK (substituted_for_exercise_id IS NULL OR substituted_for_exercise_id ~ '^[A-Za-z0-9_.:-]{1,64}$'),
  CONSTRAINT workout_session_exercises_substitution_distinct_check
    CHECK (
      exercise_id IS NULL
      OR substituted_for_exercise_id IS NULL
      OR exercise_id <> substituted_for_exercise_id
    ),
  CONSTRAINT workout_session_exercises_exercise_key_snapshot_check
    CHECK (char_length(exercise_key_snapshot) BETWEEN 1 AND 80),
  CONSTRAINT workout_session_exercises_exercise_name_snapshot_check
    CHECK (char_length(exercise_name_snapshot) BETWEEN 1 AND 160),
  CONSTRAINT workout_session_exercises_status_check
    CHECK (status IN ('completed', 'partially_completed', 'skipped')),
  CONSTRAINT workout_session_exercises_notes_check
    CHECK (notes IS NULL OR char_length(notes) BETWEEN 1 AND 1000),
  CONSTRAINT workout_session_exercises_prescription_object_check
    CHECK (jsonb_typeof(prescription_snapshot) = 'object'),
  CONSTRAINT workout_session_exercises_prescription_size_check
    CHECK (octet_length(prescription_snapshot::text) <= 2048),
  CONSTRAINT workout_session_exercises_prescription_version_check
    CHECK (
      jsonb_typeof(prescription_snapshot -> 'version') = 'number'
      AND (prescription_snapshot ->> 'version')::integer = 1
    ),
  CONSTRAINT workout_session_exercises_prescription_planned_sets_check
    CHECK (
      jsonb_typeof(prescription_snapshot -> 'planned_sets') = 'number'
      AND (prescription_snapshot ->> 'planned_sets')::integer >= 0
      AND (prescription_snapshot ->> 'planned_sets')::integer <= 100
    ),
  CONSTRAINT workout_session_exercises_prescription_reps_text_check
    CHECK (
      jsonb_typeof(prescription_snapshot -> 'reps_text') = 'string'
      AND char_length(prescription_snapshot ->> 'reps_text') BETWEEN 1 AND 40
    ),
  CONSTRAINT workout_session_exercises_prescription_rest_text_check
    CHECK (
      prescription_snapshot -> 'rest_text' IS NULL
      OR (
        jsonb_typeof(prescription_snapshot -> 'rest_text') = 'string'
        AND char_length(prescription_snapshot ->> 'rest_text') BETWEEN 1 AND 40
      )
    ),
  CONSTRAINT workout_session_exercises_prescription_rest_seconds_check
    CHECK (
      prescription_snapshot -> 'rest_seconds' IS NULL
      OR (
        jsonb_typeof(prescription_snapshot -> 'rest_seconds') = 'number'
        AND (prescription_snapshot ->> 'rest_seconds')::integer >= 0
        AND (prescription_snapshot ->> 'rest_seconds')::integer <= 3600
      )
    ),
  CONSTRAINT workout_session_exercises_prescription_tempo_check
    CHECK (
      prescription_snapshot -> 'tempo' IS NULL
      OR (
        jsonb_typeof(prescription_snapshot -> 'tempo') = 'string'
        AND char_length(prescription_snapshot ->> 'tempo') BETWEEN 1 AND 24
      )
    ),
  CONSTRAINT workout_session_exercises_prescription_focus_key_check
    CHECK (
      prescription_snapshot -> 'focus_key' IS NULL
      OR (
        jsonb_typeof(prescription_snapshot -> 'focus_key') = 'string'
        AND (prescription_snapshot ->> 'focus_key') ~ '^[A-Za-z0-9_.:-]{1,64}$'
      )
    ),
  CONSTRAINT workout_session_exercises_prescription_focus_text_check
    CHECK (
      prescription_snapshot -> 'focus_text' IS NULL
      OR (
        jsonb_typeof(prescription_snapshot -> 'focus_text') = 'string'
        AND char_length(prescription_snapshot ->> 'focus_text') BETWEEN 1 AND 120
      )
    ),
  CONSTRAINT workout_session_exercises_prescription_note_check
    CHECK (
      prescription_snapshot -> 'prescription_note' IS NULL
      OR (
        jsonb_typeof(prescription_snapshot -> 'prescription_note') = 'string'
        AND char_length(prescription_snapshot ->> 'prescription_note') BETWEEN 1 AND 400
      )
    ),
  CONSTRAINT workout_session_exercises_contract_version_check
    CHECK (contract_version = 1)
);

CREATE INDEX workout_session_exercises_session_user_idx
  ON public.workout_session_exercises (session_id, user_id);
CREATE INDEX workout_session_exercises_user_idx
  ON public.workout_session_exercises (user_id);
CREATE INDEX workout_session_exercises_user_exercise_idx
  ON public.workout_session_exercises (user_id, exercise_id)
  WHERE exercise_id IS NOT NULL;

-- =====================================================================
-- 3. public.workout_session_sets
-- =====================================================================
CREATE TABLE public.workout_session_sets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  session_exercise_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_index integer NOT NULL,
  reps integer,
  load_kg numeric(6, 2),
  assistance_level text,
  duration_seconds integer,
  hold_seconds integer,
  distance_m numeric(8, 2),
  rpe numeric(3, 1),
  is_completed boolean NOT NULL,
  performed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  contract_version integer NOT NULL DEFAULT 1,
  CONSTRAINT workout_session_sets_pkey PRIMARY KEY (id),
  CONSTRAINT workout_session_sets_exercise_set_index_key UNIQUE (session_exercise_id, set_index),
  CONSTRAINT workout_session_sets_exercise_fkey
    FOREIGN KEY (session_exercise_id, user_id)
    REFERENCES public.workout_session_exercises (id, user_id) ON DELETE CASCADE,
  CONSTRAINT workout_session_sets_set_index_check
    CHECK (set_index >= 0 AND set_index <= 1000),
  CONSTRAINT workout_session_sets_reps_check
    CHECK (reps IS NULL OR (reps >= 0 AND reps <= 1000)),
  CONSTRAINT workout_session_sets_load_kg_check
    CHECK (load_kg IS NULL OR (load_kg >= 0 AND load_kg <= 1000)),
  CONSTRAINT workout_session_sets_assistance_level_check
    CHECK (
      assistance_level IS NULL
      OR assistance_level IN ('none', 'band_light', 'band_medium', 'band_heavy', 'partner', 'machine')
    ),
  CONSTRAINT workout_session_sets_duration_seconds_check
    CHECK (duration_seconds IS NULL OR (duration_seconds >= 0 AND duration_seconds <= 86400)),
  CONSTRAINT workout_session_sets_hold_seconds_check
    CHECK (hold_seconds IS NULL OR (hold_seconds >= 0 AND hold_seconds <= 86400)),
  CONSTRAINT workout_session_sets_distance_m_check
    CHECK (distance_m IS NULL OR (distance_m >= 0 AND distance_m <= 100000)),
  CONSTRAINT workout_session_sets_rpe_check
    CHECK (rpe IS NULL OR (rpe >= 1.0 AND rpe <= 10.0 AND (rpe * 2) = trunc(rpe * 2))),
  CONSTRAINT workout_session_sets_completed_evidence_check
    CHECK (
      is_completed = false
      OR COALESCE(reps, 0) > 0
      OR COALESCE(duration_seconds, 0) > 0
      OR COALESCE(hold_seconds, 0) > 0
      OR COALESCE(distance_m, 0) > 0
    ),
  CONSTRAINT workout_session_sets_contract_version_check
    CHECK (contract_version = 1)
);

CREATE INDEX workout_session_sets_exercise_user_idx
  ON public.workout_session_sets (session_exercise_id, user_id);
CREATE INDEX workout_session_sets_user_idx
  ON public.workout_session_sets (user_id);

-- =====================================================================
-- 4. public.workout_session_adjustments
-- =====================================================================
CREATE TABLE public.workout_session_adjustments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  adjustment_key text NOT NULL,
  command_fingerprint text NOT NULL,
  kind text NOT NULL,
  target_session_id uuid NOT NULL,
  replacement_session_id uuid,
  reason_code text NOT NULL,
  reason_text text,
  occurred_at timestamptz NOT NULL,
  actor_type text NOT NULL,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  contract_version integer NOT NULL DEFAULT 1,
  CONSTRAINT workout_session_adjustments_pkey PRIMARY KEY (id),
  CONSTRAINT workout_session_adjustments_id_user_id_key UNIQUE (id, user_id),
  CONSTRAINT workout_session_adjustments_user_key_key UNIQUE (user_id, adjustment_key),
  CONSTRAINT workout_session_adjustments_target_session_key UNIQUE (target_session_id),
  CONSTRAINT workout_session_adjustments_target_fkey
    FOREIGN KEY (target_session_id, user_id)
    REFERENCES public.workout_sessions (id, user_id),
  CONSTRAINT workout_session_adjustments_replacement_fkey
    FOREIGN KEY (replacement_session_id, user_id)
    REFERENCES public.workout_sessions (id, user_id),
  CONSTRAINT workout_session_adjustments_adjustment_key_check
    CHECK (char_length(adjustment_key) BETWEEN 1 AND 128),
  CONSTRAINT workout_session_adjustments_command_fingerprint_check
    CHECK (command_fingerprint ~ '^[0-9a-f]{64}$'),
  CONSTRAINT workout_session_adjustments_kind_check
    CHECK (kind IN ('void', 'correction')),
  CONSTRAINT workout_session_adjustments_replacement_rule_check
    CHECK (
      (kind = 'correction' AND replacement_session_id IS NOT NULL)
      OR (kind = 'void' AND replacement_session_id IS NULL)
    ),
  CONSTRAINT workout_session_adjustments_distinct_sessions_check
    CHECK (replacement_session_id IS NULL OR replacement_session_id <> target_session_id),
  CONSTRAINT workout_session_adjustments_reason_code_check
    CHECK (reason_code ~ '^[a-z0-9_]{1,64}$'),
  CONSTRAINT workout_session_adjustments_reason_text_check
    CHECK (reason_text IS NULL OR char_length(reason_text) BETWEEN 1 AND 500),
  CONSTRAINT workout_session_adjustments_actor_type_check
    CHECK (actor_type IN ('user', 'system')),
  CONSTRAINT workout_session_adjustments_actor_id_check
    CHECK (
      (actor_type = 'user' AND actor_id IS NOT NULL AND actor_id = user_id)
      OR (actor_type = 'system' AND actor_id IS NULL)
    ),
  CONSTRAINT workout_session_adjustments_contract_version_check
    CHECK (contract_version = 1)
);

CREATE UNIQUE INDEX workout_session_adjustments_replacement_session_key
  ON public.workout_session_adjustments (replacement_session_id)
  WHERE replacement_session_id IS NOT NULL;
CREATE INDEX workout_session_adjustments_target_user_idx
  ON public.workout_session_adjustments (target_session_id, user_id);
CREATE INDEX workout_session_adjustments_replacement_user_idx
  ON public.workout_session_adjustments (replacement_session_id, user_id)
  WHERE replacement_session_id IS NOT NULL;
CREATE INDEX workout_session_adjustments_user_timeline_idx
  ON public.workout_session_adjustments (user_id, occurred_at DESC, id DESC);

-- =====================================================================
-- 5. Explicit least-privilege Data API grants
-- =====================================================================
REVOKE ALL ON public.workout_sessions FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.workout_session_exercises FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.workout_session_sets FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.workout_session_adjustments FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON public.workout_sessions TO authenticated;
GRANT SELECT ON public.workout_session_exercises TO authenticated;
GRANT SELECT ON public.workout_session_sets TO authenticated;
GRANT SELECT ON public.workout_session_adjustments TO authenticated;

GRANT SELECT, INSERT ON public.workout_sessions TO service_role;
GRANT SELECT, INSERT ON public.workout_session_exercises TO service_role;
GRANT SELECT, INSERT ON public.workout_session_sets TO service_role;
GRANT SELECT, INSERT ON public.workout_session_adjustments TO service_role;

-- =====================================================================
-- 6. Row-level security (defense in depth for user-facing roles)
-- =====================================================================
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_session_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_session_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_session_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own workout sessions"
  ON public.workout_sessions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can read their own session exercises"
  ON public.workout_session_exercises
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can read their own session sets"
  ON public.workout_session_sets
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can read their own session adjustments"
  ON public.workout_session_adjustments
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);