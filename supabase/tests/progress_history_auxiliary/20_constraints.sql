-- Sprint 8.1A2 — auxiliary facts: constraint, bound and idempotency cases.
-- NOT A MIGRATION.
--
-- Every case runs through test.run(). Positive cases expect '00000';
-- negative cases expect the SQLSTATE the schema must raise:
--   23514 check violation, 23505 unique violation,
--   23503 foreign-key violation, 23502 not-null violation.
--
-- Cross-row rules that are deliberately NOT enforced here (trusted-ingestion
-- duties, §8.4 / §11.3): fingerprint computation and canonicalization,
-- replay-versus-conflict resolution, IANA timezone validation, local_day
-- derivation, clock-relative occurrence windows, "a void must target an
-- entry, never a void", and atomic multi-fact transactions.

-- =====================================================================
-- H — hydration_facts
-- =====================================================================
SELECT test.run('H-001', 'hydration', 'entry with minimum volume 1 accepted', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000101',
    repeat('a',64),'entry','2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02',1)
$sql$);

SELECT test.run('H-002', 'hydration', 'entry with maximum volume 10000 accepted', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000102',
    repeat('a',64),'entry','2026-09-02T10:00:00Z','America/Sao_Paulo','device',DATE '2026-09-02',10000)
$sql$);

SELECT test.run('H-003', 'hydration', 'void targeting an own entry accepted', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind, target_fact_id,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000103',
    repeat('a',64),'void','50000000-0000-4000-8000-000000000001',
    '2026-09-02T10:05:00Z','UTC','assumed_utc',DATE '2026-09-02')
$sql$);

SELECT test.run('H-004', 'hydration', 'timezone source user_setting accepted', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000104',
    repeat('a',64),'entry','2026-09-02T10:00:00Z','Europe/Lisbon','user_setting',DATE '2026-09-02',330)
$sql$);

SELECT test.run('H-005', 'hydration', 'timezone of maximum length 64 accepted', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000105',
    repeat('a',64),'entry','2026-09-02T10:00:00Z',repeat('z',64),'device',DATE '2026-09-02',200)
$sql$);

SELECT test.run('H-006', 'hydration', 'volume 0 rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000106',
    repeat('a',64),'entry','2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02',0)
$sql$, '23514');

SELECT test.run('H-007', 'hydration', 'negative volume rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000107',
    repeat('a',64),'entry','2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02',-1)
$sql$, '23514');

SELECT test.run('H-008', 'hydration', 'volume above 10000 rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000108',
    repeat('a',64),'entry','2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02',10001)
$sql$, '23514');

SELECT test.run('H-009', 'hydration', 'entry without volume rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000109',
    repeat('a',64),'entry','2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02')
$sql$, '23514');

SELECT test.run('H-010', 'hydration', 'entry carrying a target rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind, target_fact_id,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-00000000010a',
    repeat('a',64),'entry','50000000-0000-4000-8000-000000000001',
    '2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02',100)
$sql$, '23514');

SELECT test.run('H-011', 'hydration', 'void carrying a volume rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind, target_fact_id,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-00000000010b',
    repeat('a',64),'void','50000000-0000-4000-8000-000000000001',
    '2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02',100)
$sql$, '23514');

SELECT test.run('H-012', 'hydration', 'void without target rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-00000000010c',
    repeat('a',64),'void','2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02')
$sql$, '23514');

SELECT test.run('H-013', 'hydration', 'unknown kind rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-00000000010d',
    repeat('a',64),'correction','2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02',100)
$sql$, '23514');

SELECT test.run('H-014', 'hydration', 'ingestion key without the hydration prefix rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','water:00000000-0000-4000-8000-00000000010e',
    repeat('a',64),'entry','2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02',100)
$sql$, '23514');

SELECT test.run('H-015', 'hydration', 'ingestion key with a foreign prefix rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-00000000010f',
    repeat('a',64),'entry','2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02',100)
$sql$, '23514');

SELECT test.run('H-016', 'hydration', 'ingestion key without a UUID suffix rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:not-a-uuid',
    repeat('a',64),'entry','2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02',100)
$sql$, '23514');

SELECT test.run('H-017', 'hydration', 'uppercase fingerprint rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000110',
    repeat('A',64),'entry','2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02',100)
$sql$, '23514');

SELECT test.run('H-018', 'hydration', 'fingerprint of 63 characters rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000111',
    repeat('a',63),'entry','2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02',100)
$sql$, '23514');

SELECT test.run('H-019', 'hydration', 'non-hex fingerprint rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000112',
    repeat('z',64),'entry','2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02',100)
$sql$, '23514');

SELECT test.run('H-020', 'hydration', 'unknown timezone source rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000113',
    repeat('a',64),'entry','2026-09-02T10:00:00Z','UTC','guessed',DATE '2026-09-02',100)
$sql$, '23514');

SELECT test.run('H-021', 'hydration', 'timezone longer than 64 characters rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000114',
    repeat('a',64),'entry','2026-09-02T10:00:00Z',repeat('z',65),'device',DATE '2026-09-02',100)
$sql$, '23514');

SELECT test.run('H-022', 'hydration', 'contract_version other than 1 rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml, contract_version)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000115',
    repeat('a',64),'entry','2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02',100,2)
$sql$, '23514');

SELECT test.run('H-023', 'hydration', 'missing local_day rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000116',
    repeat('a',64),'entry','2026-09-02T10:00:00Z','UTC','assumed_utc',100)
$sql$, '23502');

SELECT test.run('H-024', 'hydration', 'self-targeting void rejected', $sql$
  INSERT INTO public.hydration_facts (id, user_id, ingestion_key, fact_fingerprint, kind, target_fact_id,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day)
  VALUES ('50000000-0000-4000-8000-000000000117','00000000-0000-4000-8000-0000000000a1',
    'hydration:00000000-0000-4000-8000-000000000117',repeat('a',64),'void',
    '50000000-0000-4000-8000-000000000117',
    '2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02')
$sql$, '23514');

SELECT test.run('H-025', 'hydration', 'void targeting another user entry rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind, target_fact_id,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000118',
    repeat('a',64),'void','50000000-0000-4000-8000-000000000003',
    '2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02')
$sql$, '23503');

SELECT test.run('H-026', 'hydration', 'void targeting a non-existent fact rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind, target_fact_id,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000119',
    repeat('a',64),'void','50000000-0000-4000-8000-0000000000ff',
    '2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02')
$sql$, '23503');

SELECT test.run('H-027', 'hydration', 'second direct void on the same target rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind, target_fact_id,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-00000000011a',
    repeat('a',64),'void','50000000-0000-4000-8000-000000000002',
    '2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02')
$sql$, '23505');

-- =====================================================================
-- M — meal_adherence_facts
-- =====================================================================
SELECT test.run('M-001', 'meal', 'meal_key breakfast accepted', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-000000000201',
    repeat('a',64),'2026-09-02T08:00:00Z','UTC','assumed_utc',DATE '2026-09-02','breakfast',true)
$sql$);
SELECT test.run('M-002', 'meal', 'meal_key lunch accepted', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-000000000202',
    repeat('a',64),'2026-09-02T12:00:00Z','UTC','assumed_utc',DATE '2026-09-02','lunch',true)
$sql$);
SELECT test.run('M-003', 'meal', 'meal_key dinner accepted', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-000000000203',
    repeat('a',64),'2026-09-02T20:00:00Z','UTC','assumed_utc',DATE '2026-09-02','dinner',false)
$sql$);
SELECT test.run('M-004', 'meal', 'meal_key snack_1 accepted', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-000000000204',
    repeat('a',64),'2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02','snack_1',true)
$sql$);
SELECT test.run('M-005', 'meal', 'meal_key snack_2 accepted', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-000000000205',
    repeat('a',64),'2026-09-02T16:00:00Z','UTC','assumed_utc',DATE '2026-09-02','snack_2',false)
$sql$);
SELECT test.run('M-006', 'meal', 'meal_key snack_3 accepted', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-000000000206',
    repeat('a',64),'2026-09-02T22:00:00Z','UTC','assumed_utc',DATE '2026-09-02','snack_3',true)
$sql$);

SELECT test.run('M-007', 'meal', 'second observation for the same day and meal accepted (append-only)', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-000000000207',
    repeat('a',64),'2026-09-02T09:00:00Z','UTC','assumed_utc',DATE '2026-09-02','breakfast',false)
$sql$);

SELECT test.run('M-008', 'meal', 'three observations now exist for that day and meal', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.meal_adherence_facts
        WHERE user_id = '00000000-0000-4000-8000-0000000000a1'
          AND local_day = DATE '2026-09-02' AND meal_key = 'breakfast') <> 2 THEN
      RAISE EXCEPTION 'append-only meal observations not storable';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('M-009', 'meal', 'unknown meal_key rejected', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-000000000208',
    repeat('a',64),'2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02','brunch',true)
$sql$, '23514');

SELECT test.run('M-010', 'meal', 'translated meal label rejected as meal_key', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-000000000209',
    repeat('a',64),'2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02','Café da manhã',true)
$sql$, '23514');

SELECT test.run('M-011', 'meal', 'uppercase meal_key rejected', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-00000000020a',
    repeat('a',64),'2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02','LUNCH',true)
$sql$, '23514');

SELECT test.run('M-012', 'meal', 'ingestion key with a foreign prefix rejected', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-00000000020b',
    repeat('a',64),'2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02','lunch',true)
$sql$, '23514');

SELECT test.run('M-013', 'meal', 'invalid fingerprint rejected', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-00000000020c',
    repeat('a',65),'2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02','lunch',true)
$sql$, '23514');

SELECT test.run('M-014', 'meal', 'unknown timezone source rejected', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-00000000020d',
    repeat('a',64),'2026-09-02T10:00:00Z','UTC','server',DATE '2026-09-02','lunch',true)
$sql$, '23514');

SELECT test.run('M-015', 'meal', 'missing adherence value rejected', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-00000000020e',
    repeat('a',64),'2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02','lunch')
$sql$, '23502');

SELECT test.run('M-016', 'meal', 'contract_version other than 1 rejected', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered, contract_version)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-00000000020f',
    repeat('a',64),'2026-09-02T10:00:00Z','UTC','assumed_utc',DATE '2026-09-02','lunch',true,2)
$sql$, '23514');

-- =====================================================================
-- D — daily_target_snapshots
-- =====================================================================
SELECT test.run('D-001', 'daily_target', 'calculated snapshot with weight and algorithm version accepted', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, calculation_weight_kg, target_source, target_algorithm_version)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000301',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    2500.00,80.00,'calculated','tdee-v1')
$sql$);

SELECT test.run('D-002', 'daily_target', 'user_entered snapshot without calculation fields accepted', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000302',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    2200.00,'user_entered')
$sql$);

SELECT test.run('D-003', 'daily_target', 'unknown source without calculation fields accepted', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000303',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    1800.00,'unknown')
$sql$);

SELECT test.run('D-004', 'daily_target', 'minimum positive calorie target accepted', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000304',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    0.01,'unknown')
$sql$);

SELECT test.run('D-005', 'daily_target', 'maximum calorie target 20000 accepted', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000305',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    20000.00,'unknown')
$sql$);

SELECT test.run('D-006', 'daily_target', 'maximum calculation weight 500 accepted', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, calculation_weight_kg, target_source, target_algorithm_version)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000306',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    3000.00,500.00,'calculated','tdee-v1')
$sql$);

SELECT test.run('D-007', 'daily_target', 'several snapshots for the same local day remain storable', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM public.daily_target_snapshots
        WHERE user_id = '00000000-0000-4000-8000-0000000000a1'
          AND local_day = DATE '2026-09-02') < 2 THEN
      RAISE EXCEPTION 'multiple daily snapshots not storable';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('D-008', 'daily_target', 'calorie target 0 rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000307',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',0,'unknown')
$sql$, '23514');

SELECT test.run('D-009', 'daily_target', 'negative calorie target rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000308',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',-1,'unknown')
$sql$, '23514');

SELECT test.run('D-010', 'daily_target', 'calorie target above 20000 rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000309',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',20000.01,'unknown')
$sql$, '23514');

SELECT test.run('D-011', 'daily_target', 'calculated snapshot without weight rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, target_source, target_algorithm_version)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-00000000030a',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    2500.00,'calculated','tdee-v1')
$sql$, '23514');

SELECT test.run('D-012', 'daily_target', 'calculated snapshot without algorithm version rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, calculation_weight_kg, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-00000000030b',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    2500.00,80.00,'calculated')
$sql$, '23514');

SELECT test.run('D-013', 'daily_target', 'user_entered snapshot carrying a weight rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, calculation_weight_kg, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-00000000030c',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    2500.00,80.00,'user_entered')
$sql$, '23514');

SELECT test.run('D-014', 'daily_target', 'user_entered snapshot carrying an algorithm version rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, target_source, target_algorithm_version)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-00000000030d',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    2500.00,'user_entered','tdee-v1')
$sql$, '23514');

SELECT test.run('D-015', 'daily_target', 'unknown source carrying a weight rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, calculation_weight_kg, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-00000000030e',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    2500.00,80.00,'unknown')
$sql$, '23514');

SELECT test.run('D-016', 'daily_target', 'calculation weight 0 rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, calculation_weight_kg, target_source, target_algorithm_version)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-00000000030f',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    2500.00,0,'calculated','tdee-v1')
$sql$, '23514');

SELECT test.run('D-017', 'daily_target', 'calculation weight above 500 rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, calculation_weight_kg, target_source, target_algorithm_version)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000310',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    2500.00,500.01,'calculated','tdee-v1')
$sql$, '23514');

SELECT test.run('D-018', 'daily_target', 'unknown target source rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000311',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    2500.00,'imported')
$sql$, '23514');

SELECT test.run('D-019', 'daily_target', 'algorithm version longer than 32 characters rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, calculation_weight_kg, target_source, target_algorithm_version)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000312',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    2500.00,80.00,'calculated',repeat('v',33))
$sql$, '23514');

SELECT test.run('D-020', 'daily_target', 'ingestion key with a foreign prefix rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','target:00000000-0000-4000-8000-000000000313',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    2500.00,'unknown')
$sql$, '23514');

SELECT test.run('D-021', 'daily_target', 'invalid fingerprint rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000314',
    'not-a-fingerprint','2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    2500.00,'unknown')
$sql$, '23514');

SELECT test.run('D-022', 'daily_target', 'unknown timezone source rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000315',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','cloud',DATE '2026-09-02',
    2500.00,'unknown')
$sql$, '23514');

SELECT test.run('D-023', 'daily_target', 'contract_version other than 1 rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, target_source, contract_version)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000316',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02',
    2500.00,'unknown',2)
$sql$, '23514');

SELECT test.run('D-024', 'daily_target', 'missing calorie target rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000317',
    repeat('a',64),'2026-09-02T06:00:00Z','UTC','assumed_utc',DATE '2026-09-02','unknown')
$sql$, '23502');

-- =====================================================================
-- I — per-user ingestion-key idempotency
-- =====================================================================
SELECT test.run('I-001', 'idempotency', 'duplicate hydration key for the same user rejected', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000001',
    repeat('e',64),'entry','2026-09-03T10:00:00Z','UTC','assumed_utc',DATE '2026-09-03',400)
$sql$, '23505');

SELECT test.run('I-002', 'idempotency', 'same hydration key accepted for a different user', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a2','hydration:00000000-0000-4000-8000-000000000001',
    repeat('e',64),'entry','2026-09-03T10:00:00Z','UTC','assumed_utc',DATE '2026-09-03',400)
$sql$);

SELECT test.run('I-003', 'idempotency', 'duplicate meal key for the same user rejected', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a1','meal:00000000-0000-4000-8000-000000000001',
    repeat('e',64),'2026-09-03T08:00:00Z','UTC','assumed_utc',DATE '2026-09-03','breakfast',true)
$sql$, '23505');

SELECT test.run('I-004', 'idempotency', 'same meal key accepted for a different user', $sql$
  INSERT INTO public.meal_adherence_facts (user_id, ingestion_key, fact_fingerprint,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, meal_key, adhered)
  VALUES ('00000000-0000-4000-8000-0000000000a2','meal:00000000-0000-4000-8000-000000000001',
    repeat('e',64),'2026-09-03T08:00:00Z','UTC','assumed_utc',DATE '2026-09-03','breakfast',true)
$sql$);

SELECT test.run('I-005', 'idempotency', 'duplicate daily-target key for the same user rejected', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a1','daily-target:00000000-0000-4000-8000-000000000001',
    repeat('e',64),'2026-09-03T06:00:00Z','UTC','assumed_utc',DATE '2026-09-03',2000.00,'unknown')
$sql$, '23505');

SELECT test.run('I-006', 'idempotency', 'same daily-target key accepted for a different user', $sql$
  INSERT INTO public.daily_target_snapshots (user_id, ingestion_key, fact_fingerprint,
    captured_at, captured_timezone, captured_timezone_source, local_day,
    calorie_target_kcal, target_source)
  VALUES ('00000000-0000-4000-8000-0000000000a2','daily-target:00000000-0000-4000-8000-000000000001',
    repeat('e',64),'2026-09-03T06:00:00Z','UTC','assumed_utc',DATE '2026-09-03',2000.00,'unknown')
$sql$);

SELECT test.run('I-007', 'idempotency', 'a reused key with a different fingerprint is still rejected by the key constraint alone', $sql$
  INSERT INTO public.hydration_facts (user_id, ingestion_key, fact_fingerprint, kind,
    occurred_at, occurred_timezone, occurred_timezone_source, local_day, volume_ml)
  VALUES ('00000000-0000-4000-8000-0000000000a1','hydration:00000000-0000-4000-8000-000000000002',
    repeat('f',64),'entry','2026-09-03T10:00:00Z','UTC','assumed_utc',DATE '2026-09-03',999)
$sql$, '23505');

-- =====================================================================
-- O — ownership rows referenced by other suites (no-op assertions)
-- =====================================================================
SELECT test.run('O-001', 'ownership', 'auxiliary facts carry no session_id column', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
          AND column_name = 'session_id') <> 0 THEN
      RAISE EXCEPTION 'auxiliary fact table exposes session_id';
    END IF;
  END $chk$;
$sql$);

SELECT test.run('O-002', 'ownership', 'auxiliary facts hold no foreign key to sessions or training plans', $sql$
  DO $chk$ BEGIN
    IF (SELECT count(*) FROM pg_constraint c
        WHERE c.contype = 'f'
          AND c.conrelid::regclass::text IN ('hydration_facts','meal_adherence_facts','daily_target_snapshots')
          AND c.confrelid::regclass::text IN
            ('workout_sessions','workout_session_exercises','workout_session_sets',
             'workout_session_adjustments','training_plans','training_weeks','training_days','planned_workouts')) <> 0 THEN
      RAISE EXCEPTION 'auxiliary fact table references session or plan tables';
    END IF;
  END $chk$;
$sql$);
