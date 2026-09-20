-- Sprint 8.1A1-C1 — Progress History core contract corrections (forward-only)

-- 2. Ordering bounds
ALTER TABLE public.workout_session_exercises
  DROP CONSTRAINT workout_session_exercises_order_index_check;
ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_order_index_check
  CHECK (order_index >= 0 AND order_index <= 59);

ALTER TABLE public.workout_session_sets
  DROP CONSTRAINT workout_session_sets_set_index_check;
ALTER TABLE public.workout_session_sets
  ADD CONSTRAINT workout_session_sets_set_index_check
  CHECK (set_index >= 0 AND set_index <= 99);

-- 3. Plan provenance (complete frozen rule)
ALTER TABLE public.workout_sessions
  DROP CONSTRAINT workout_sessions_plan_provenance_check;
ALTER TABLE public.workout_sessions
  ADD CONSTRAINT workout_sessions_plan_provenance_check
  CHECK (
    CASE
      WHEN source = 'plan_workout' THEN
        source_plan_id IS NOT NULL
        AND source_planned_workout_id IS NOT NULL
      ELSE
        source_plan_id IS NULL
        AND source_planned_workout_id IS NULL
        AND plan_name_snapshot IS NULL
        AND week_number_snapshot IS NULL
        AND day_number_snapshot IS NULL
    END
  );

-- 4. prescription_snapshot validation
ALTER TABLE public.workout_session_exercises
  DROP CONSTRAINT workout_session_exercises_prescription_size_check;
ALTER TABLE public.workout_session_exercises
  DROP CONSTRAINT workout_session_exercises_prescription_version_check;
ALTER TABLE public.workout_session_exercises
  DROP CONSTRAINT workout_session_exercises_prescription_planned_sets_check;
ALTER TABLE public.workout_session_exercises
  DROP CONSTRAINT workout_session_exercises_prescription_reps_text_check;
ALTER TABLE public.workout_session_exercises
  DROP CONSTRAINT workout_session_exercises_prescription_rest_text_check;
ALTER TABLE public.workout_session_exercises
  DROP CONSTRAINT workout_session_exercises_prescription_rest_seconds_check;
ALTER TABLE public.workout_session_exercises
  DROP CONSTRAINT workout_session_exercises_prescription_tempo_check;
ALTER TABLE public.workout_session_exercises
  DROP CONSTRAINT workout_session_exercises_prescription_focus_key_check;
ALTER TABLE public.workout_session_exercises
  DROP CONSTRAINT workout_session_exercises_prescription_focus_text_check;
ALTER TABLE public.workout_session_exercises
  DROP CONSTRAINT workout_session_exercises_prescription_note_check;

-- 4.2 closed field matrix
ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_keys_check
  CHECK (
    jsonb_typeof(prescription_snapshot) = 'object'
    AND (
      prescription_snapshot - ARRAY[
        'version',
        'planned_sets',
        'reps_text',
        'rest_text',
        'rest_seconds',
        'tempo',
        'focus_key',
        'focus_text',
        'prescription_note'
      ]
    ) = '{}'::jsonb
  );

-- 4.3 / 4.4 required fields, explicit presence, safe typing
ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_version_check
  CHECK (
    prescription_snapshot ? 'version'
    AND jsonb_typeof(prescription_snapshot -> 'version') = 'number'
    AND (prescription_snapshot ->> 'version')::numeric = 1
  );

ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_planned_sets_check
  CHECK (
    prescription_snapshot ? 'planned_sets'
    AND jsonb_typeof(prescription_snapshot -> 'planned_sets') = 'number'
    AND (prescription_snapshot ->> 'planned_sets')::numeric
        = trunc((prescription_snapshot ->> 'planned_sets')::numeric)
    AND (prescription_snapshot ->> 'planned_sets')::numeric >= 0
    AND (prescription_snapshot ->> 'planned_sets')::numeric <= 100
  );

ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_reps_text_check
  CHECK (
    prescription_snapshot ? 'reps_text'
    AND jsonb_typeof(prescription_snapshot -> 'reps_text') = 'string'
    AND char_length(btrim(prescription_snapshot ->> 'reps_text')) BETWEEN 1 AND 40
  );

-- 4.5 optional fields: omitted, or present with a valid value of the expected type
ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_rest_text_check
  CHECK (
    NOT (prescription_snapshot ? 'rest_text')
    OR (
      jsonb_typeof(prescription_snapshot -> 'rest_text') = 'string'
      AND char_length(btrim(prescription_snapshot ->> 'rest_text')) BETWEEN 1 AND 40
    )
  );

ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_rest_seconds_check
  CHECK (
    NOT (prescription_snapshot ? 'rest_seconds')
    OR (
      jsonb_typeof(prescription_snapshot -> 'rest_seconds') = 'number'
      AND (prescription_snapshot ->> 'rest_seconds')::numeric
          = trunc((prescription_snapshot ->> 'rest_seconds')::numeric)
      AND (prescription_snapshot ->> 'rest_seconds')::numeric >= 0
      AND (prescription_snapshot ->> 'rest_seconds')::numeric <= 3600
    )
  );

ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_tempo_check
  CHECK (
    NOT (prescription_snapshot ? 'tempo')
    OR (
      jsonb_typeof(prescription_snapshot -> 'tempo') = 'string'
      AND char_length(btrim(prescription_snapshot ->> 'tempo')) BETWEEN 1 AND 24
    )
  );

ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_focus_key_check
  CHECK (
    NOT (prescription_snapshot ? 'focus_key')
    OR (
      jsonb_typeof(prescription_snapshot -> 'focus_key') = 'string'
      AND (prescription_snapshot ->> 'focus_key') ~ '^[A-Za-z0-9_.:-]{1,64}$'
    )
  );

ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_focus_text_check
  CHECK (
    NOT (prescription_snapshot ? 'focus_text')
    OR (
      jsonb_typeof(prescription_snapshot -> 'focus_text') = 'string'
      AND char_length(btrim(prescription_snapshot ->> 'focus_text')) BETWEEN 1 AND 120
    )
  );

ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_note_check
  CHECK (
    NOT (prescription_snapshot ? 'prescription_note')
    OR (
      jsonb_typeof(prescription_snapshot -> 'prescription_note') = 'string'
      AND char_length(btrim(prescription_snapshot ->> 'prescription_note')) BETWEEN 1 AND 400
    )
  );