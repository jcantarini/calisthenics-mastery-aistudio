-- Sprint 8.1A1-V1 / V1-C1 — result report and gate. NOT A MIGRATION.
-- Exits the psql run with a non-zero status when any case failed, when a
-- case from the expected inventory is missing, or when an unexpected case
-- appears.
--
-- The expected inventory below is declared independently of test.results:
-- it is the frozen list of the 169 regression case IDs of the suite and is
-- never derived from the rows actually produced by a run. An empty or
-- partial results table therefore fails the gate.

CREATE TABLE test.expected_cases (case_id text PRIMARY KEY);

INSERT INTO test.expected_cases (case_id) VALUES
('C-001'),('C-002'),('C-003'),
('G-001'),('G-002'),('G-003'),('G-004'),('G-005'),('G-006'),('G-007'),('G-008'),
('G-009'),('G-010'),('G-011'),('G-012'),('G-013'),('G-014'),('G-015'),('G-016'),
('G-017'),('G-018'),('G-019'),('G-020'),('G-021'),('G-022'),('G-023'),('G-024'),
('G-025'),('G-026'),('G-027'),('G-028'),('G-029'),('G-030'),('G-031'),('G-032'),
('G-033'),('G-034'),('G-035'),('G-036'),('G-037'),('G-038'),('G-039'),('G-040'),
('G-041'),('G-042'),('G-043'),('G-044'),('G-045'),('G-046'),('G-047'),
('I-001'),('I-002'),
('J-001'),('J-002'),('J-003'),('J-004'),('J-005'),('J-006'),('J-007'),
('J-008'),('J-009'),('J-010'),('J-011'),('J-012'),('J-013'),('J-014'),
('K-001'),('K-002'),('K-003'),('K-004'),('K-005'),('K-006'),('K-007'),
('N-001'),('N-002'),('N-003'),('N-004'),('N-005'),('N-006'),('N-007'),('N-008'),
('N-009'),('N-010'),('N-011'),('N-012'),('N-013'),('N-014'),('N-015'),('N-016'),
('N-017'),('N-018'),('N-019'),('N-020'),('N-021'),('N-022'),('N-023'),('N-024'),
('N-025'),('N-026'),('N-027'),('N-028'),('N-029'),('N-030'),('N-031'),('N-032'),
('N-033'),('N-034'),('N-035'),('N-036'),('N-037'),('N-038'),('N-039'),('N-040'),
('N-041'),('N-042'),('N-043'),('N-044'),('N-045'),('N-046'),('N-047'),('N-048'),
('N-049'),('N-050'),
('O-001'),('O-002'),('O-003'),('O-004'),('O-005'),
('P-001'),('P-002'),('P-003'),('P-004'),('P-005'),('P-006'),('P-007'),('P-008'),
('P-009'),('P-010'),('P-011'),('P-012'),('P-013'),('P-014'),('P-015'),
('S-001'),('S-002'),('S-003'),('S-004'),('S-005'),('S-006'),('S-007'),('S-008'),
('S-009'),('S-010'),
('V-001'),('V-002'),('V-003'),('V-004'),('V-005'),('V-006'),('V-007'),('V-008'),
('V-009'),('V-010'),('V-011'),('V-012'),
('X-001'),('X-002'),('X-003'),('X-004');

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

-- Gate: raises (and, with ON_ERROR_STOP=1, fails the run) on any failure,
-- on an empty or incomplete results table, on a missing expected case, on
-- an unexpected case, or on any row whose status is not PASS.
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
    RAISE EXCEPTION 'progress_history_core suite FAILED: %', array_to_string(v_problems, '; ');
  END IF;

  RAISE NOTICE 'progress_history_core suite PASSED: % / % case(s)', v_recorded, v_expected;
END
$gate$;
