-- Sprint 8.1A1-C2 — prescription_snapshot validation hardening (forward-only)
-- CASE-guarded numeric conversions + original-length, trimmed text bounds.

ALTER TABLE public.workout_session_exercises
  DROP CONSTRAINT workout_session_exercises_prescription_keys_check;
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
ALTER TABLE public.workout_session_exercises
  DROP CONSTRAINT workout_session_exercises_prescription_object_check;

-- Object requirement (evaluated standalone so scalar payloads fail cleanly).
ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_object_check
  CHECK (jsonb_typeof(prescription_snapshot) = 'object');

-- Closed key matrix; the jsonb subtraction runs only for objects.
ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_keys_check
  CHECK (
    CASE
      WHEN jsonb_typeof(prescription_snapshot) = 'object' THEN
        (
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
      ELSE false
    END
  );

-- Required numeric: version === 1
ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_version_check
  CHECK (
    CASE
      WHEN jsonb_typeof(prescription_snapshot) = 'object'
       AND jsonb_typeof(prescription_snapshot -> 'version') = 'number' THEN
        (prescription_snapshot ->> 'version')::numeric = 1
      ELSE false
    END
  );

-- Required numeric: planned_sets integral 0..100
ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_planned_sets_check
  CHECK (
    CASE
      WHEN jsonb_typeof(prescription_snapshot) = 'object'
       AND jsonb_typeof(prescription_snapshot -> 'planned_sets') = 'number' THEN
        (prescription_snapshot ->> 'planned_sets')::numeric
          = trunc((prescription_snapshot ->> 'planned_sets')::numeric)
        AND (prescription_snapshot ->> 'planned_sets')::numeric >= 0
        AND (prescription_snapshot ->> 'planned_sets')::numeric <= 100
      ELSE false
    END
  );

-- Optional numeric: rest_seconds integral 0..3600
ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_rest_seconds_check
  CHECK (
    CASE
      WHEN jsonb_typeof(prescription_snapshot) <> 'object' THEN false
      WHEN NOT (prescription_snapshot ? 'rest_seconds') THEN true
      WHEN jsonb_typeof(prescription_snapshot -> 'rest_seconds') = 'number' THEN
        (prescription_snapshot ->> 'rest_seconds')::numeric
          = trunc((prescription_snapshot ->> 'rest_seconds')::numeric)
        AND (prescription_snapshot ->> 'rest_seconds')::numeric >= 0
        AND (prescription_snapshot ->> 'rest_seconds')::numeric <= 3600
      ELSE false
    END
  );

-- Required text: reps_text, original length 1..40, stored already trimmed
ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_reps_text_check
  CHECK (
    CASE
      WHEN jsonb_typeof(prescription_snapshot) = 'object'
       AND jsonb_typeof(prescription_snapshot -> 'reps_text') = 'string' THEN
        char_length(prescription_snapshot ->> 'reps_text') BETWEEN 1 AND 40
        AND (prescription_snapshot ->> 'reps_text')
            = btrim(prescription_snapshot ->> 'reps_text', E' \t\n\r\f\u000B')
      ELSE false
    END
  );

-- Optional text: rest_text 1..40
ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_rest_text_check
  CHECK (
    CASE
      WHEN jsonb_typeof(prescription_snapshot) <> 'object' THEN false
      WHEN NOT (prescription_snapshot ? 'rest_text') THEN true
      WHEN jsonb_typeof(prescription_snapshot -> 'rest_text') = 'string' THEN
        char_length(prescription_snapshot ->> 'rest_text') BETWEEN 1 AND 40
        AND (prescription_snapshot ->> 'rest_text')
            = btrim(prescription_snapshot ->> 'rest_text', E' \t\n\r\f\u000B')
      ELSE false
    END
  );

-- Optional text: tempo 1..24
ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_tempo_check
  CHECK (
    CASE
      WHEN jsonb_typeof(prescription_snapshot) <> 'object' THEN false
      WHEN NOT (prescription_snapshot ? 'tempo') THEN true
      WHEN jsonb_typeof(prescription_snapshot -> 'tempo') = 'string' THEN
        char_length(prescription_snapshot ->> 'tempo') BETWEEN 1 AND 24
        AND (prescription_snapshot ->> 'tempo')
            = btrim(prescription_snapshot ->> 'tempo', E' \t\n\r\f\u000B')
      ELSE false
    END
  );

-- Optional identifier: focus_key (existing rule preserved)
ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_focus_key_check
  CHECK (
    CASE
      WHEN jsonb_typeof(prescription_snapshot) <> 'object' THEN false
      WHEN NOT (prescription_snapshot ? 'focus_key') THEN true
      WHEN jsonb_typeof(prescription_snapshot -> 'focus_key') = 'string' THEN
        (prescription_snapshot ->> 'focus_key') ~ '^[A-Za-z0-9_.:-]{1,64}$'
      ELSE false
    END
  );

-- Optional text: focus_text 1..120
ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_focus_text_check
  CHECK (
    CASE
      WHEN jsonb_typeof(prescription_snapshot) <> 'object' THEN false
      WHEN NOT (prescription_snapshot ? 'focus_text') THEN true
      WHEN jsonb_typeof(prescription_snapshot -> 'focus_text') = 'string' THEN
        char_length(prescription_snapshot ->> 'focus_text') BETWEEN 1 AND 120
        AND (prescription_snapshot ->> 'focus_text')
            = btrim(prescription_snapshot ->> 'focus_text', E' \t\n\r\f\u000B')
      ELSE false
    END
  );

-- Optional text: prescription_note 1..400
ALTER TABLE public.workout_session_exercises
  ADD CONSTRAINT workout_session_exercises_prescription_note_check
  CHECK (
    CASE
      WHEN jsonb_typeof(prescription_snapshot) <> 'object' THEN false
      WHEN NOT (prescription_snapshot ? 'prescription_note') THEN true
      WHEN jsonb_typeof(prescription_snapshot -> 'prescription_note') = 'string' THEN
        char_length(prescription_snapshot ->> 'prescription_note') BETWEEN 1 AND 400
        AND (prescription_snapshot ->> 'prescription_note')
            = btrim(prescription_snapshot ->> 'prescription_note', E' \t\n\r\f\u000B')
      ELSE false
    END
  );