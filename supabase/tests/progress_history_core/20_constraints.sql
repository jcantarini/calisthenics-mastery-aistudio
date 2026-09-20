-- Sprint 8.1A1-V1 — structural regression cases. NOT A MIGRATION.
-- Every case has a stable ID, an expected SQLSTATE and an assertion.
-- '00000' = the statement must succeed.

-- Negative prescription payloads reuse order_index 0 in the "negative"
-- session: rejected rows never persist, so no unique collision can mask a
-- CHECK violation. Positive payloads use the dedicated "positive" session.
CREATE FUNCTION test.presc_neg(p_json text) RETURNS text
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT format(
    'INSERT INTO public.workout_session_exercises '
    '(session_id, user_id, order_index, exercise_key_snapshot, exercise_name_snapshot, prescription_snapshot, status) '
    'VALUES (''10000000-0000-4000-8000-000000000003'', ''00000000-0000-4000-8000-0000000000a1'', '
    '0, ''k'', ''N'', %s, ''completed'')',
    p_json
  );
$fn$;

CREATE FUNCTION test.presc_pos(p_json text, p_order int) RETURNS text
LANGUAGE sql IMMUTABLE AS $fn$
  SELECT format(
    'INSERT INTO public.workout_session_exercises '
    '(session_id, user_id, order_index, exercise_key_snapshot, exercise_name_snapshot, prescription_snapshot, status) '
    'VALUES (''10000000-0000-4000-8000-000000000004'', ''00000000-0000-4000-8000-0000000000a1'', '
    '%s, ''k'', ''N'', %s, ''completed'')',
    p_order, p_json
  );
$fn$;

-- =====================================================================
-- Section P — prescription_snapshot, accepted payloads
-- =====================================================================
SELECT test.run('P-001', 'prescription', 'minimal valid object',
  test.presc_pos($$'{"version":1,"planned_sets":3,"reps_text":"8-12"}'::jsonb$$, 0));
SELECT test.run('P-002', 'prescription', 'fully populated valid object',
  test.presc_pos($$'{"version":1,"planned_sets":4,"reps_text":"8-12","rest_text":"90s","rest_seconds":90,"tempo":"2-0-1-0","focus_key":"upper.pull","focus_text":"Back and biceps","prescription_note":"Slow eccentric"}'::jsonb$$, 1));
SELECT test.run('P-003', 'prescription', 'planned_sets lower bound 0',
  test.presc_pos($$'{"version":1,"planned_sets":0,"reps_text":"AMRAP"}'::jsonb$$, 2));
SELECT test.run('P-004', 'prescription', 'planned_sets upper bound 100',
  test.presc_pos($$'{"version":1,"planned_sets":100,"reps_text":"1"}'::jsonb$$, 3));
SELECT test.run('P-005', 'prescription', 'reps_text lower bound 1 char',
  test.presc_pos($$'{"version":1,"planned_sets":3,"reps_text":"5"}'::jsonb$$, 4));
SELECT test.run('P-006', 'prescription', 'reps_text upper bound 40 chars',
  test.presc_pos($$jsonb_build_object('version',1,'planned_sets',3,'reps_text',repeat('r',40))$$, 5));
SELECT test.run('P-007', 'prescription', 'rest_seconds lower bound 0',
  test.presc_pos($$'{"version":1,"planned_sets":3,"reps_text":"10","rest_seconds":0}'::jsonb$$, 6));
SELECT test.run('P-008', 'prescription', 'rest_seconds upper bound 3600',
  test.presc_pos($$'{"version":1,"planned_sets":3,"reps_text":"10","rest_seconds":3600}'::jsonb$$, 7));
SELECT test.run('P-009', 'prescription', 'legitimate internal whitespace in reps_text',
  test.presc_pos($$'{"version":1,"planned_sets":3,"reps_text":"8 - 12 reps per side"}'::jsonb$$, 8));
SELECT test.run('P-010', 'prescription', 'tempo upper bound 24 chars',
  test.presc_pos($$jsonb_build_object('version',1,'planned_sets',3,'reps_text','10','tempo',repeat('t',24))$$, 9));
SELECT test.run('P-011', 'prescription', 'focus_text upper bound 120 chars',
  test.presc_pos($$jsonb_build_object('version',1,'planned_sets',3,'reps_text','10','focus_text',repeat('f',120))$$, 10));
SELECT test.run('P-012', 'prescription', 'prescription_note upper bound 400 chars',
  test.presc_pos($$jsonb_build_object('version',1,'planned_sets',3,'reps_text','10','prescription_note',repeat('n',400))$$, 11));
SELECT test.run('P-013', 'prescription', 'rest_text upper bound 40 chars',
  test.presc_pos($$jsonb_build_object('version',1,'planned_sets',3,'reps_text','10','rest_text',repeat('s',40))$$, 12));
SELECT test.run('P-014', 'prescription', 'focus_key with every allowed character class',
  test.presc_pos($$'{"version":1,"planned_sets":3,"reps_text":"10","focus_key":"aZ0_.:-"}'::jsonb$$, 13));
SELECT test.run('P-015', 'prescription', 'planned_sets integral value in decimal notation',
  test.presc_pos($$'{"version":1,"planned_sets":3.0,"reps_text":"10"}'::jsonb$$, 14));

-- =====================================================================
-- Section N — prescription_snapshot, rejected payloads (CHECK = 23514)
-- =====================================================================
SELECT test.run('N-001', 'prescription', 'missing required version', test.presc_neg($$'{"planned_sets":3,"reps_text":"10"}'::jsonb$$), '23514');
SELECT test.run('N-002', 'prescription', 'missing required planned_sets', test.presc_neg($$'{"version":1,"reps_text":"10"}'::jsonb$$), '23514');
SELECT test.run('N-003', 'prescription', 'missing required reps_text', test.presc_neg($$'{"version":1,"planned_sets":3}'::jsonb$$), '23514');
SELECT test.run('N-004', 'prescription', 'unknown key rejected by closed matrix', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10","extra":"x"}'::jsonb$$), '23514');
SELECT test.run('N-005', 'prescription', 'version explicit JSON null', test.presc_neg($$'{"version":null,"planned_sets":3,"reps_text":"10"}'::jsonb$$), '23514');
SELECT test.run('N-006', 'prescription', 'planned_sets explicit JSON null', test.presc_neg($$'{"version":1,"planned_sets":null,"reps_text":"10"}'::jsonb$$), '23514');
SELECT test.run('N-007', 'prescription', 'reps_text explicit JSON null', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":null}'::jsonb$$), '23514');
SELECT test.run('N-008', 'prescription', 'rest_text explicit JSON null', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10","rest_text":null}'::jsonb$$), '23514');
SELECT test.run('N-009', 'prescription', 'rest_seconds explicit JSON null', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10","rest_seconds":null}'::jsonb$$), '23514');
SELECT test.run('N-010', 'prescription', 'tempo explicit JSON null', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10","tempo":null}'::jsonb$$), '23514');
SELECT test.run('N-011', 'prescription', 'focus_key explicit JSON null', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10","focus_key":null}'::jsonb$$), '23514');
SELECT test.run('N-012', 'prescription', 'focus_text explicit JSON null', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10","focus_text":null}'::jsonb$$), '23514');
SELECT test.run('N-013', 'prescription', 'prescription_note explicit JSON null', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10","prescription_note":null}'::jsonb$$), '23514');
SELECT test.run('N-014', 'prescription', 'version as numeric string "1"', test.presc_neg($$'{"version":"1","planned_sets":3,"reps_text":"10"}'::jsonb$$), '23514');
SELECT test.run('N-015', 'prescription', 'planned_sets as non-numeric string "abc"', test.presc_neg($$'{"version":1,"planned_sets":"abc","reps_text":"10"}'::jsonb$$), '23514');
SELECT test.run('N-016', 'prescription', 'planned_sets as numeric string "3"', test.presc_neg($$'{"version":1,"planned_sets":"3","reps_text":"10"}'::jsonb$$), '23514');
SELECT test.run('N-017', 'prescription', 'reps_text as number', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":12}'::jsonb$$), '23514');
SELECT test.run('N-018', 'prescription', 'rest_seconds as non-numeric string "abc"', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10","rest_seconds":"abc"}'::jsonb$$), '23514');
SELECT test.run('N-019', 'prescription', 'version other than 1', test.presc_neg($$'{"version":2,"planned_sets":3,"reps_text":"10"}'::jsonb$$), '23514');
SELECT test.run('N-020', 'prescription', 'planned_sets below lower bound', test.presc_neg($$'{"version":1,"planned_sets":-1,"reps_text":"10"}'::jsonb$$), '23514');
SELECT test.run('N-021', 'prescription', 'planned_sets above upper bound', test.presc_neg($$'{"version":1,"planned_sets":101,"reps_text":"10"}'::jsonb$$), '23514');
SELECT test.run('N-022', 'prescription', 'planned_sets fractional', test.presc_neg($$'{"version":1,"planned_sets":2.5,"reps_text":"10"}'::jsonb$$), '23514');
SELECT test.run('N-023', 'prescription', 'rest_seconds below lower bound', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10","rest_seconds":-1}'::jsonb$$), '23514');
SELECT test.run('N-024', 'prescription', 'rest_seconds above upper bound', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10","rest_seconds":3601}'::jsonb$$), '23514');
SELECT test.run('N-025', 'prescription', 'rest_seconds fractional', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10","rest_seconds":1.5}'::jsonb$$), '23514');
SELECT test.run('N-026', 'prescription', 'reps_text one character beyond maximum', test.presc_neg($$jsonb_build_object('version',1,'planned_sets',3,'reps_text',repeat('r',41))$$), '23514');
SELECT test.run('N-027', 'prescription', 'reps_text empty string', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":""}'::jsonb$$), '23514');
SELECT test.run('N-028', 'prescription', 'reps_text with leading space', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":" 10"}'::jsonb$$), '23514');
SELECT test.run('N-029', 'prescription', 'reps_text with trailing space', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10 "}'::jsonb$$), '23514');
SELECT test.run('N-030', 'prescription', 'reps_text wrapped in tabs', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"\t10\t"}'::jsonb$$), '23514');
SELECT test.run('N-031', 'prescription', 'reps_text wrapped in line breaks', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"\n10\n"}'::jsonb$$), '23514');
SELECT test.run('N-032', 'prescription', 'reps_text whitespace only', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"   "}'::jsonb$$), '23514');
SELECT test.run('N-033', 'prescription', 'short reps_text padded with 3000 spaces', test.presc_neg($$jsonb_build_object('version',1,'planned_sets',3,'reps_text',repeat(' ',3000) || '8')$$), '23514');
SELECT test.run('N-034', 'prescription', 'rest_text one character beyond maximum', test.presc_neg($$jsonb_build_object('version',1,'planned_sets',3,'reps_text','10','rest_text',repeat('s',41))$$), '23514');
SELECT test.run('N-035', 'prescription', 'rest_text whitespace only', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10","rest_text":"  "}'::jsonb$$), '23514');
SELECT test.run('N-036', 'prescription', 'tempo one character beyond maximum', test.presc_neg($$jsonb_build_object('version',1,'planned_sets',3,'reps_text','10','tempo',repeat('t',25))$$), '23514');
SELECT test.run('N-037', 'prescription', 'focus_text one character beyond maximum', test.presc_neg($$jsonb_build_object('version',1,'planned_sets',3,'reps_text','10','focus_text',repeat('f',121))$$), '23514');
SELECT test.run('N-038', 'prescription', 'prescription_note one character beyond maximum', test.presc_neg($$jsonb_build_object('version',1,'planned_sets',3,'reps_text','10','prescription_note',repeat('n',401))$$), '23514');
SELECT test.run('N-039', 'prescription', 'focus_key with disallowed character', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10","focus_key":"bad key"}'::jsonb$$), '23514');
SELECT test.run('N-040', 'prescription', 'focus_key one character beyond maximum', test.presc_neg($$jsonb_build_object('version',1,'planned_sets',3,'reps_text','10','focus_key',repeat('k',65))$$), '23514');
SELECT test.run('N-041', 'prescription', 'payload is a JSON array', test.presc_neg($$'[]'::jsonb$$), '23514');
SELECT test.run('N-042', 'prescription', 'payload is a JSON string', test.presc_neg($$'"text"'::jsonb$$), '23514');
SELECT test.run('N-043', 'prescription', 'payload is a JSON number', test.presc_neg($$'5'::jsonb$$), '23514');
SELECT test.run('N-044', 'prescription', 'payload is a JSON boolean', test.presc_neg($$'true'::jsonb$$), '23514');
SELECT test.run('N-045', 'prescription', 'payload is JSON null', test.presc_neg($$'null'::jsonb$$), '23514');
SELECT test.run('N-046', 'prescription', 'payload is an empty object', test.presc_neg($$'{}'::jsonb$$), '23514');
SELECT test.run('N-047', 'prescription', 'payload is SQL NULL (NOT NULL violation)', test.presc_neg($$NULL::jsonb$$), '23502');
SELECT test.run('N-048', 'prescription', 'focus_text with leading space', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10","focus_text":" back"}'::jsonb$$), '23514');
SELECT test.run('N-049', 'prescription', 'tempo with trailing line break', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10","tempo":"2-0-1-0\n"}'::jsonb$$), '23514');
SELECT test.run('N-050', 'prescription', 'prescription_note whitespace only', test.presc_neg($$'{"version":1,"planned_sets":3,"reps_text":"10","prescription_note":"\t "}'::jsonb$$), '23514');

-- =====================================================================
-- Section O — exercise ordering bounds and uniqueness
-- =====================================================================
SELECT test.run('O-001', 'ordering', 'exercise order_index lower bound 0', $sql$
  INSERT INTO public.workout_session_exercises (session_id, user_id, order_index, exercise_key_snapshot, exercise_name_snapshot, prescription_snapshot, status)
  VALUES ('10000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-0000000000a1',0,'k','N','{"version":1,"planned_sets":1,"reps_text":"1"}'::jsonb,'completed')
$sql$);
SELECT test.run('O-002', 'ordering', 'exercise order_index upper bound 59', $sql$
  INSERT INTO public.workout_session_exercises (session_id, user_id, order_index, exercise_key_snapshot, exercise_name_snapshot, prescription_snapshot, status)
  VALUES ('10000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-0000000000a1',59,'k','N','{"version":1,"planned_sets":1,"reps_text":"1"}'::jsonb,'completed')
$sql$);
SELECT test.run('O-003', 'ordering', 'exercise order_index -1 rejected', $sql$
  INSERT INTO public.workout_session_exercises (session_id, user_id, order_index, exercise_key_snapshot, exercise_name_snapshot, prescription_snapshot, status)
  VALUES ('10000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-0000000000a1',-1,'k','N','{"version":1,"planned_sets":1,"reps_text":"1"}'::jsonb,'completed')
$sql$, '23514');
SELECT test.run('O-004', 'ordering', 'exercise order_index 60 rejected', $sql$
  INSERT INTO public.workout_session_exercises (session_id, user_id, order_index, exercise_key_snapshot, exercise_name_snapshot, prescription_snapshot, status)
  VALUES ('10000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-0000000000a1',60,'k','N','{"version":1,"planned_sets":1,"reps_text":"1"}'::jsonb,'completed')
$sql$, '23514');
SELECT test.run('O-005', 'ordering', 'duplicate exercise order position rejected', $sql$
  INSERT INTO public.workout_session_exercises (session_id, user_id, order_index, exercise_key_snapshot, exercise_name_snapshot, prescription_snapshot, status)
  VALUES ('10000000-0000-4000-8000-000000000005','00000000-0000-4000-8000-0000000000a1',0,'k','N','{"version":1,"planned_sets":1,"reps_text":"1"}'::jsonb,'completed')
$sql$, '23505');

-- =====================================================================
-- Section S — set ordering, bounds and evidence
-- =====================================================================
SELECT test.run('S-001', 'sets', 'set_index lower bound 0', $sql$
  INSERT INTO public.workout_session_sets (session_exercise_id, user_id, set_index, reps, is_completed)
  VALUES ('20000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000a1',0,5,true)
$sql$);
SELECT test.run('S-002', 'sets', 'set_index upper bound 99', $sql$
  INSERT INTO public.workout_session_sets (session_exercise_id, user_id, set_index, reps, is_completed)
  VALUES ('20000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000a1',99,5,true)
$sql$);
SELECT test.run('S-003', 'sets', 'set_index -1 rejected', $sql$
  INSERT INTO public.workout_session_sets (session_exercise_id, user_id, set_index, reps, is_completed)
  VALUES ('20000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000a1',-1,5,true)
$sql$, '23514');
SELECT test.run('S-004', 'sets', 'set_index 100 rejected', $sql$
  INSERT INTO public.workout_session_sets (session_exercise_id, user_id, set_index, reps, is_completed)
  VALUES ('20000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000a1',100,5,true)
$sql$, '23514');
SELECT test.run('S-005', 'sets', 'duplicate set position rejected', $sql$
  INSERT INTO public.workout_session_sets (session_exercise_id, user_id, set_index, reps, is_completed)
  VALUES ('20000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000a1',0,5,true)
$sql$, '23505');
SELECT test.run('S-006', 'sets', 'completed set without evidence rejected', $sql$
  INSERT INTO public.workout_session_sets (session_exercise_id, user_id, set_index, is_completed)
  VALUES ('20000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000a1',10,true)
$sql$, '23514');
SELECT test.run('S-007', 'sets', 'rpe half-point value accepted', $sql$
  INSERT INTO public.workout_session_sets (session_exercise_id, user_id, set_index, reps, rpe, is_completed)
  VALUES ('20000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000a1',11,5,7.5,true)
$sql$);
SELECT test.run('S-008', 'sets', 'rpe off-grid value rejected', $sql$
  INSERT INTO public.workout_session_sets (session_exercise_id, user_id, set_index, reps, rpe, is_completed)
  VALUES ('20000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000a1',12,5,7.3,true)
$sql$, '23514');
SELECT test.run('S-009', 'sets', 'rpe below lower bound rejected', $sql$
  INSERT INTO public.workout_session_sets (session_exercise_id, user_id, set_index, reps, rpe, is_completed)
  VALUES ('20000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000a1',13,5,0.5,true)
$sql$, '23514');
SELECT test.run('S-010', 'sets', 'rpe upper bound 10 accepted', $sql$
  INSERT INTO public.workout_session_sets (session_exercise_id, user_id, set_index, reps, rpe, is_completed)
  VALUES ('20000000-0000-4000-8000-0000000000d1','00000000-0000-4000-8000-0000000000a1',14,5,10.0,true)
$sql$);

-- =====================================================================
-- Section V — plan provenance combinations
-- =====================================================================
CREATE FUNCTION test.session_sql(p_key text, p_source text, p_extra_cols text DEFAULT '', p_extra_vals text DEFAULT '')
RETURNS text LANGUAGE sql IMMUTABLE AS $fn$
  SELECT format(
    'INSERT INTO public.workout_sessions '
    '(user_id, ingestion_key, command_fingerprint, source, occurred_at, occurred_timezone, '
    'occurred_timezone_source, local_day, workout_title_snapshot, calories_source, app_version, '
    'confirmation_received_at%s) VALUES '
    '(''00000000-0000-4000-8000-0000000000a1'', %L, repeat(''a'',64), %L, '
    '''2026-09-03T10:00:00Z'', ''UTC'', ''assumed_utc'', DATE ''2026-09-03'', ''T'', ''unknown'', ''0.0.0-test'', '
    '''2026-09-03T10:30:00Z''%s)',
    p_extra_cols, p_key, p_source, p_extra_vals
  );
$fn$;

SELECT test.run('V-001', 'provenance', 'plan_workout with both plan references', test.session_sql('v001','plan_workout',
  ', source_plan_id, source_planned_workout_id', ', gen_random_uuid(), gen_random_uuid()'));
SELECT test.run('V-002', 'provenance', 'plan_workout without source_plan_id', test.session_sql('v002','plan_workout',
  ', source_planned_workout_id', ', gen_random_uuid()'), '23514');
SELECT test.run('V-003', 'provenance', 'plan_workout without source_planned_workout_id', test.session_sql('v003','plan_workout',
  ', source_plan_id', ', gen_random_uuid()'), '23514');
SELECT test.run('V-004', 'provenance', 'plan_workout without any plan reference', test.session_sql('v004','plan_workout'), '23514');
SELECT test.run('V-005', 'provenance', 'adhoc_workout carrying source_plan_id', test.session_sql('v005','adhoc_workout',
  ', source_plan_id', ', gen_random_uuid()'), '23514');
SELECT test.run('V-006', 'provenance', 'adhoc_workout carrying source_planned_workout_id', test.session_sql('v006','adhoc_workout',
  ', source_planned_workout_id', ', gen_random_uuid()'), '23514');
SELECT test.run('V-007', 'provenance', 'adhoc_workout carrying plan_name_snapshot', test.session_sql('v007','adhoc_workout',
  ', plan_name_snapshot', ', ''Plan A'''), '23514');
SELECT test.run('V-008', 'provenance', 'adhoc_workout carrying week_number_snapshot', test.session_sql('v008','adhoc_workout',
  ', week_number_snapshot', ', 2'), '23514');
SELECT test.run('V-009', 'provenance', 'adhoc_workout carrying day_number_snapshot', test.session_sql('v009','adhoc_workout',
  ', day_number_snapshot', ', 3'), '23514');
SELECT test.run('V-010', 'provenance', 'timer_session without plan fields', test.session_sql('v010','timer_session'));
SELECT test.run('V-011', 'provenance', 'first_workout without plan fields', test.session_sql('v011','first_workout'));
SELECT test.run('V-012', 'provenance', 'plan_workout with full plan snapshot fields', test.session_sql('v012','plan_workout',
  ', source_plan_id, source_planned_workout_id, plan_name_snapshot, week_number_snapshot, day_number_snapshot',
  ', gen_random_uuid(), gen_random_uuid(), ''Plan A'', 2, 3'));

-- =====================================================================
-- Section I — ingestion idempotency
-- =====================================================================
SELECT test.run('I-001', 'idempotency', 'duplicate ingestion_key for the same user rejected',
  test.session_sql('fixture-a-main','adhoc_workout'), '23505');
SELECT test.run('I-002', 'idempotency', 'same ingestion_key accepted for a different user', $sql$
  INSERT INTO public.workout_sessions
    (user_id, ingestion_key, command_fingerprint, source, occurred_at, occurred_timezone,
     occurred_timezone_source, local_day, workout_title_snapshot, calories_source, app_version, confirmation_received_at)
  VALUES ('00000000-0000-4000-8000-0000000000a2','fixture-a-main',repeat('a',64),'adhoc_workout',
     '2026-09-03T10:00:00Z','UTC','assumed_utc',DATE '2026-09-03','T','unknown','0.0.0-test','2026-09-03T10:30:00Z')
$sql$);

-- =====================================================================
-- Section X — composite ownership (cross-user references)
-- =====================================================================
SELECT test.run('X-001', 'ownership', 'exercise under another user''s session rejected', $sql$
  INSERT INTO public.workout_session_exercises (session_id, user_id, order_index, exercise_key_snapshot, exercise_name_snapshot, prescription_snapshot, status)
  VALUES ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000a2',5,'k','N','{"version":1,"planned_sets":1,"reps_text":"1"}'::jsonb,'completed')
$sql$, '23503');
SELECT test.run('X-002', 'ownership', 'set under another user''s exercise rejected', $sql$
  INSERT INTO public.workout_session_sets (session_exercise_id, user_id, set_index, reps, is_completed)
  VALUES ('20000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-0000000000a2',5,5,true)
$sql$, '23503');
SELECT test.run('X-003', 'ownership', 'adjustment targeting another user''s session rejected', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, reason_code, occurred_at, actor_type)
  VALUES ('00000000-0000-4000-8000-0000000000a1','x003',repeat('e',64),'void','10000000-0000-4000-8000-000000000002','system_correction','2026-09-04T10:00:00Z','system')
$sql$, '23503');
SELECT test.run('X-004', 'ownership', 'adjustment replacing with another user''s session rejected', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, replacement_session_id, reason_code, occurred_at, actor_type)
  VALUES ('00000000-0000-4000-8000-0000000000a1','x004',repeat('e',64),'correction','10000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-00000000000b','system_correction','2026-09-04T10:00:00Z','system')
$sql$, '23503');

-- =====================================================================
-- Section J — adjustments
-- =====================================================================
SELECT test.run('J-001', 'adjustments', 'valid correction with replacement session', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, replacement_session_id, reason_code, occurred_at, actor_type, actor_id)
  VALUES ('00000000-0000-4000-8000-0000000000a1','j001',repeat('f',64),'correction','10000000-0000-4000-8000-000000000008','10000000-0000-4000-8000-000000000007','user_requested','2026-09-04T10:00:00Z','user','00000000-0000-4000-8000-0000000000a1')
$sql$);
SELECT test.run('J-002', 'adjustments', 'void carrying a replacement session rejected', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, replacement_session_id, reason_code, occurred_at, actor_type)
  VALUES ('00000000-0000-4000-8000-0000000000a1','j002',repeat('f',64),'void','10000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-00000000000d','system_correction','2026-09-04T10:00:00Z','system')
$sql$, '23514');
SELECT test.run('J-003', 'adjustments', 'correction without replacement session rejected', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, reason_code, occurred_at, actor_type)
  VALUES ('00000000-0000-4000-8000-0000000000a1','j003',repeat('f',64),'correction','10000000-0000-4000-8000-000000000009','system_correction','2026-09-04T10:00:00Z','system')
$sql$, '23514');
SELECT test.run('J-004', 'adjustments', 'replacement identical to target rejected', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, replacement_session_id, reason_code, occurred_at, actor_type)
  VALUES ('00000000-0000-4000-8000-0000000000a1','j004',repeat('f',64),'correction','10000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000009','system_correction','2026-09-04T10:00:00Z','system')
$sql$, '23514');
SELECT test.run('J-005', 'adjustments', 'user actor without actor_id rejected', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, reason_code, occurred_at, actor_type)
  VALUES ('00000000-0000-4000-8000-0000000000a1','j005',repeat('f',64),'void','10000000-0000-4000-8000-000000000009','user_requested','2026-09-04T10:00:00Z','user')
$sql$, '23514');
SELECT test.run('J-006', 'adjustments', 'user actor different from owner rejected', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, reason_code, occurred_at, actor_type, actor_id)
  VALUES ('00000000-0000-4000-8000-0000000000a1','j006',repeat('f',64),'void','10000000-0000-4000-8000-000000000009','user_requested','2026-09-04T10:00:00Z','user','00000000-0000-4000-8000-0000000000a2')
$sql$, '23514');
SELECT test.run('J-007', 'adjustments', 'system actor carrying actor_id rejected', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, reason_code, occurred_at, actor_type, actor_id)
  VALUES ('00000000-0000-4000-8000-0000000000a1','j007',repeat('f',64),'void','10000000-0000-4000-8000-000000000009','system_correction','2026-09-04T10:00:00Z','system','00000000-0000-4000-8000-0000000000a1')
$sql$, '23514');
SELECT test.run('J-008', 'adjustments', 'duplicate adjustment_key for the same user rejected', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, reason_code, occurred_at, actor_type)
  VALUES ('00000000-0000-4000-8000-0000000000a1','fixture-a-void',repeat('f',64),'void','10000000-0000-4000-8000-000000000009','system_correction','2026-09-04T10:00:00Z','system')
$sql$, '23505');
SELECT test.run('J-009', 'adjustments', 'second adjustment for the same target session rejected', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, reason_code, occurred_at, actor_type)
  VALUES ('00000000-0000-4000-8000-0000000000a1','j009',repeat('f',64),'void','10000000-0000-4000-8000-000000000006','system_correction','2026-09-04T10:00:00Z','system')
$sql$, '23505');
SELECT test.run('J-010', 'adjustments', 'replacement session reused by a second correction rejected', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, replacement_session_id, reason_code, occurred_at, actor_type)
  VALUES ('00000000-0000-4000-8000-0000000000a1','j010',repeat('f',64),'correction','10000000-0000-4000-8000-000000000009','10000000-0000-4000-8000-000000000007','system_correction','2026-09-04T10:00:00Z','system')
$sql$, '23505');
SELECT test.run('J-011', 'adjustments', 'malformed command_fingerprint rejected', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, reason_code, occurred_at, actor_type)
  VALUES ('00000000-0000-4000-8000-0000000000a1','j011','NOT-A-HASH','void','10000000-0000-4000-8000-000000000009','system_correction','2026-09-04T10:00:00Z','system')
$sql$, '23514');
SELECT test.run('J-012', 'adjustments', 'reason_code outside allowed pattern rejected', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, reason_code, occurred_at, actor_type)
  VALUES ('00000000-0000-4000-8000-0000000000a1','j012',repeat('f',64),'void','10000000-0000-4000-8000-000000000009','User Requested','2026-09-04T10:00:00Z','system')
$sql$, '23514');
SELECT test.run('J-013', 'adjustments', 'reason_text one character beyond maximum rejected', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, reason_code, reason_text, occurred_at, actor_type)
  VALUES ('00000000-0000-4000-8000-0000000000a1','j013',repeat('f',64),'void','10000000-0000-4000-8000-000000000009','system_correction',repeat('x',501),'2026-09-04T10:00:00Z','system')
$sql$, '23514');
SELECT test.run('J-014', 'adjustments', 'valid system void accepted', $sql$
  INSERT INTO public.workout_session_adjustments (user_id, adjustment_key, command_fingerprint, kind, target_session_id, reason_code, occurred_at, actor_type)
  VALUES ('00000000-0000-4000-8000-0000000000a1','j014',repeat('f',64),'void','10000000-0000-4000-8000-000000000009','system_correction','2026-09-04T10:00:00Z','system')
$sql$);

-- =====================================================================
-- Section C — account-deletion cascade (disposable user C)
-- =====================================================================
SELECT test.run('C-001', 'cascade', 'disposable user C owns one row in each history table', $sql$
  DO $chk$
  BEGIN
    IF (SELECT count(*) FROM public.workout_sessions WHERE user_id = '00000000-0000-4000-8000-0000000000a3') <> 1
       OR (SELECT count(*) FROM public.workout_session_exercises WHERE user_id = '00000000-0000-4000-8000-0000000000a3') <> 1
       OR (SELECT count(*) FROM public.workout_session_sets WHERE user_id = '00000000-0000-4000-8000-0000000000a3') <> 1
       OR (SELECT count(*) FROM public.workout_session_adjustments WHERE user_id = '00000000-0000-4000-8000-0000000000a3') <> 1
    THEN RAISE EXCEPTION 'unexpected pre-delete fixture counts';
    END IF;
  END
  $chk$;
$sql$);
SELECT test.run('C-002', 'cascade', 'deleting the auth user succeeds', $sql$
  DELETE FROM auth.users WHERE id = '00000000-0000-4000-8000-0000000000a3'
$sql$);
SELECT test.run('C-003', 'cascade', 'all history rows for the deleted user are gone', $sql$
  DO $chk$
  BEGIN
    IF (SELECT count(*) FROM public.workout_sessions WHERE user_id = '00000000-0000-4000-8000-0000000000a3') <> 0
       OR (SELECT count(*) FROM public.workout_session_exercises WHERE user_id = '00000000-0000-4000-8000-0000000000a3') <> 0
       OR (SELECT count(*) FROM public.workout_session_sets WHERE user_id = '00000000-0000-4000-8000-0000000000a3') <> 0
       OR (SELECT count(*) FROM public.workout_session_adjustments WHERE user_id = '00000000-0000-4000-8000-0000000000a3') <> 0
    THEN RAISE EXCEPTION 'cascade left residual rows';
    END IF;
  END
  $chk$;
$sql$);
