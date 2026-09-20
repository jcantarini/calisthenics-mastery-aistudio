-- Sprint 8.1A3 — outbox suite result report and gate. NOT A MIGRATION.
--
-- The expected inventory below is declared independently of test.results: it
-- is the frozen list of the 107 outbox regression case IDs and is never
-- derived from the rows a run happens to produce. An empty or partial results
-- table therefore fails the gate, as do missing cases, unexpected cases and
-- any case whose actual SQLSTATE differs from its expectation.

CREATE TABLE test.expected_cases (case_id text PRIMARY KEY);

INSERT INTO test.expected_cases (case_id) VALUES
('B-001'),('B-002'),('B-003'),('B-004'),('B-005'),('B-006'),('B-007'),('B-008'),
('B-009'),('B-010'),('B-011'),('B-012'),('B-013'),('B-014'),('B-015'),('N-001'),
('N-002'),('N-003'),('N-004'),('N-005'),('N-006'),('N-007'),('N-008'),('N-009'),
('N-010'),('N-011'),('N-012'),('N-013'),('N-014'),('N-015'),('N-016'),('N-017'),
('N-018'),('N-019'),('N-020'),('N-021'),('N-022'),('N-023'),('N-024'),('N-025'),
('N-026'),('N-027'),('N-028'),('N-029'),('N-030'),('U-001'),('U-002'),('U-003'),
('U-004'),('U-005'),('U-006'),('U-007'),('M-001'),('M-002'),('M-003'),('M-004'),
('M-005'),('M-006'),('M-007'),('S-001'),('S-002'),('S-003'),('S-004'),('S-005'),
('S-006'),('S-007'),('S-008'),('S-009'),('S-010'),('S-011'),('S-012'),('S-013'),
('S-014'),('S-015'),('S-016'),('D-001'),('D-002'),('D-003'),('D-004'),('D-005'),('D-006'),
('X-001'),('X-002'),('X-003'),('X-004'),('X-005'),('X-006'),('X-007'),('X-008'),
('X-009'),('X-010'),('X-011'),('X-012'),('X-013'),('X-014'),('X-015'),('X-016'),
('X-017'),('X-018'),('X-019'),('X-020'),('X-021'),('X-022'),('X-023'),('X-024'),
('X-025'),('X-026');

\echo '--- Per-case results ---'
SELECT case_id, section, executed_as, expected_sqlstate, actual_sqlstate, status, description
FROM test.results
ORDER BY seq;

\echo '--- Totals by section ---'
SELECT section,
       count(*) AS cases,
       count(*) FILTER (WHERE expected_sqlstate = '00000') AS positive,
       count(*) FILTER (WHERE expected_sqlstate <> '00000') AS negative,
       count(*) FILTER (WHERE status = 'FAIL') AS failures
FROM test.results
GROUP BY section
ORDER BY section;

\echo '--- Grand total ---'
SELECT (SELECT count(*) FROM test.expected_cases) AS expected_cases,
       count(*) AS total_cases,
       count(*) FILTER (WHERE expected_sqlstate = '00000') AS positive_cases,
       count(*) FILTER (WHERE expected_sqlstate <> '00000') AS negative_cases,
       count(*) FILTER (WHERE status = 'PASS') AS passed,
       count(*) FILTER (WHERE status = 'FAIL') AS failed
FROM test.results;

\echo '--- Rejection SQLSTATE distribution ---'
SELECT expected_sqlstate, count(*) AS cases
FROM test.results
WHERE expected_sqlstate <> '00000'
GROUP BY expected_sqlstate
ORDER BY expected_sqlstate;

\echo '--- Failures (must be empty) ---'
SELECT case_id, section, description, expected_sqlstate, actual_sqlstate, message
FROM test.results
WHERE status = 'FAIL'
ORDER BY seq;

\echo '--- Missing expected cases (must be empty) ---'
SELECT e.case_id
FROM test.expected_cases e
LEFT JOIN test.results r USING (case_id)
WHERE r.case_id IS NULL
ORDER BY e.case_id;

\echo '--- Unexpected cases (must be empty) ---'
SELECT r.case_id
FROM test.results r
LEFT JOIN test.expected_cases e USING (case_id)
WHERE e.case_id IS NULL
ORDER BY r.case_id;

-- Gate: raises (and, with ON_ERROR_STOP=1, fails the run) on any failure, on
-- an empty or incomplete results table, on a missing expected case, on an
-- unexpected case, or on any row whose status is not PASS.
DO $gate$
DECLARE
  v_expected integer;
  v_recorded integer;
  v_failed integer;
  v_not_pass integer;
  v_missing integer;
  v_unexpected integer;
  v_problems text[] := ARRAY[]::text[];
BEGIN
  SELECT count(*) INTO v_expected FROM test.expected_cases;
  SELECT count(*) INTO v_recorded FROM test.results;
  SELECT count(*) INTO v_failed FROM test.results WHERE status = 'FAIL';
  SELECT count(*) INTO v_not_pass FROM test.results WHERE status <> 'PASS';

  SELECT count(*) INTO v_missing
  FROM test.expected_cases e
  LEFT JOIN test.results r USING (case_id)
  WHERE r.case_id IS NULL;

  SELECT count(*) INTO v_unexpected
  FROM test.results r
  LEFT JOIN test.expected_cases e USING (case_id)
  WHERE e.case_id IS NULL;

  IF v_recorded = 0 THEN
    v_problems := array_append(v_problems, 'no results recorded (empty suite execution)'::text);
  END IF;
  IF v_missing > 0 THEN
    v_problems := v_problems || format('%s expected case(s) missing', v_missing);
  END IF;
  IF v_unexpected > 0 THEN
    v_problems := v_problems || format('%s unexpected case(s) recorded', v_unexpected);
  END IF;
  IF v_failed > 0 THEN
    v_problems := v_problems || format('%s case(s) FAILED', v_failed);
  END IF;
  IF v_not_pass > 0 THEN
    v_problems := v_problems || format('%s case(s) without PASS status', v_not_pass);
  END IF;
  IF v_recorded <> v_expected THEN
    v_problems := v_problems || format('recorded %s case(s), expected %s', v_recorded, v_expected);
  END IF;

  IF array_length(v_problems, 1) IS NOT NULL THEN
    RAISE EXCEPTION 'progress_history_outbox suite FAILED: %', array_to_string(v_problems, '; ');
  END IF;

  RAISE NOTICE 'progress_history_outbox suite PASSED: % / % case(s)', v_recorded, v_expected;
END
$gate$;
