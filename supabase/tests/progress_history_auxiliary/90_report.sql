-- Sprint 8.1A2 — auxiliary suite result report and gate. NOT A MIGRATION.
--
-- The expected inventory below is declared independently of test.results: it
-- is the frozen list of the 127 auxiliary regression case IDs and is never
-- derived from the rows a run happens to produce. An empty or partial results
-- table therefore fails the gate, as do missing cases, unexpected cases and
-- any case whose actual SQLSTATE differs from its expectation.

CREATE TABLE test.expected_cases (case_id text PRIMARY KEY);

INSERT INTO test.expected_cases (case_id) VALUES
('H-001'),('H-002'),('H-003'),('H-004'),('H-005'),('H-006'),('H-007'),('H-008'),
('H-009'),('H-010'),('H-011'),('H-012'),('H-013'),('H-014'),('H-015'),('H-016'),
('H-017'),('H-018'),('H-019'),('H-020'),('H-021'),('H-022'),('H-023'),('H-024'),
('H-025'),('H-026'),('H-027'),
('M-001'),('M-002'),('M-003'),('M-004'),('M-005'),('M-006'),('M-007'),('M-008'),
('M-009'),('M-010'),('M-011'),('M-012'),('M-013'),('M-014'),('M-015'),('M-016'),
('D-001'),('D-002'),('D-003'),('D-004'),('D-005'),('D-006'),('D-007'),('D-008'),
('D-009'),('D-010'),('D-011'),('D-012'),('D-013'),('D-014'),('D-015'),('D-016'),
('D-017'),('D-018'),('D-019'),('D-020'),('D-021'),('D-022'),('D-023'),('D-024'),
('I-001'),('I-002'),('I-003'),('I-004'),('I-005'),('I-006'),('I-007'),
('O-001'),('O-002'),
('R-001'),('R-002'),('R-003'),('R-004'),('R-005'),('R-006'),('R-007'),
('P-001'),('P-002'),('P-003'),('P-004'),('P-005'),('P-006'),('P-007'),('P-008'),
('P-009'),('P-010'),('P-011'),('P-012'),('P-013'),('P-014'),('P-015'),('P-016'),
('P-017'),('P-018'),('P-019'),('P-020'),('P-021'),('P-022'),('P-023'),('P-024'),
('P-025'),('P-026'),('P-027'),('P-028'),
('C-001'),('C-002'),('C-003'),
('X-001'),('X-002'),('X-003'),('X-004'),('X-005'),('X-006'),('X-007'),('X-008'),
('X-009'),('X-010'),('X-011'),('X-012'),('X-013');

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
    RAISE EXCEPTION 'progress_history_auxiliary suite FAILED: %', array_to_string(v_problems, '; ');
  END IF;

  RAISE NOTICE 'progress_history_auxiliary suite PASSED: % / % case(s)', v_recorded, v_expected;
END
$gate$;
