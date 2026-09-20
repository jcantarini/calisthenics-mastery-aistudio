-- Sprint 8.1A2 — Auxiliary Progress Facts schema (additive, forward-only)
-- Implements ADR 0005 / Progress History domain contracts §8, §11.3, §15, §16.
-- Three independent auxiliary fact tables. No session_id, no FK to sessions or
-- training plans, no RPC, no view, no trigger, no outbox.

-- =====================================================================
-- 1. public.hydration_facts
-- =====================================================================
CREATE TABLE public.hydration_facts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingestion_key text NOT NULL,
  fact_fingerprint text NOT NULL,
  kind text NOT NULL,
  target_fact_id uuid,
  occurred_at timestamptz NOT NULL,
  occurred_timezone text NOT NULL,
  occurred_timezone_source text NOT NULL,
  local_day date NOT NULL,
  volume_ml integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  contract_version integer NOT NULL DEFAULT 1,
  CONSTRAINT hydration_facts_pkey PRIMARY KEY (id),
  CONSTRAINT hydration_facts_id_user_id_key UNIQUE (id, user_id),
  CONSTRAINT hydration_facts_user_ingestion_key_key UNIQUE (user_id, ingestion_key),
  CONSTRAINT hydration_facts_target_fkey
    FOREIGN KEY (target_fact_id, user_id)
    REFERENCES public.hydration_facts (id, user_id),
  CONSTRAINT hydration_facts_ingestion_key_check
    CHECK (
      char_length(ingestion_key) BETWEEN 1 AND 128
      AND ingestion_key ~ '^hydration:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    ),
  CONSTRAINT hydration_facts_fact_fingerprint_check
    CHECK (fact_fingerprint ~ '^[0-9a-f]{64}$'),
  CONSTRAINT hydration_facts_kind_check
    CHECK (kind IN ('entry', 'void')),
  CONSTRAINT hydration_facts_occurred_timezone_check
    CHECK (char_length(occurred_timezone) BETWEEN 1 AND 64),
  CONSTRAINT hydration_facts_occurred_timezone_source_check
    CHECK (occurred_timezone_source IN ('device', 'user_setting', 'assumed_utc')),
  CONSTRAINT hydration_facts_volume_ml_check
    CHECK (volume_ml IS NULL OR (volume_ml > 0 AND volume_ml <= 10000)),
  CONSTRAINT hydration_facts_kind_shape_check
    CHECK (
      CASE
        WHEN kind = 'entry' THEN target_fact_id IS NULL AND volume_ml IS NOT NULL
        ELSE target_fact_id IS NOT NULL AND volume_ml IS NULL
      END
    ),
  CONSTRAINT hydration_facts_self_target_check
    CHECK (target_fact_id IS NULL OR target_fact_id <> id),
  CONSTRAINT hydration_facts_contract_version_check
    CHECK (contract_version = 1)
);

-- §15: effective-hydration totals after voids
CREATE INDEX hydration_facts_user_day_kind_idx
  ON public.hydration_facts (user_id, local_day, kind, id);
-- §15: composite-FK lookup and at most one direct void per entry
CREATE UNIQUE INDEX hydration_facts_target_user_key
  ON public.hydration_facts (target_fact_id, user_id)
  WHERE target_fact_id IS NOT NULL;

-- =====================================================================
-- 2. public.meal_adherence_facts
-- =====================================================================
CREATE TABLE public.meal_adherence_facts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingestion_key text NOT NULL,
  fact_fingerprint text NOT NULL,
  occurred_at timestamptz NOT NULL,
  occurred_timezone text NOT NULL,
  occurred_timezone_source text NOT NULL,
  local_day date NOT NULL,
  meal_key text NOT NULL,
  adhered boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  contract_version integer NOT NULL DEFAULT 1,
  CONSTRAINT meal_adherence_facts_pkey PRIMARY KEY (id),
  CONSTRAINT meal_adherence_facts_user_ingestion_key_key UNIQUE (user_id, ingestion_key),
  CONSTRAINT meal_adherence_facts_ingestion_key_check
    CHECK (
      char_length(ingestion_key) BETWEEN 1 AND 128
      AND ingestion_key ~ '^meal:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    ),
  CONSTRAINT meal_adherence_facts_fact_fingerprint_check
    CHECK (fact_fingerprint ~ '^[0-9a-f]{64}$'),
  CONSTRAINT meal_adherence_facts_occurred_timezone_check
    CHECK (char_length(occurred_timezone) BETWEEN 1 AND 64),
  CONSTRAINT meal_adherence_facts_occurred_timezone_source_check
    CHECK (occurred_timezone_source IN ('device', 'user_setting', 'assumed_utc')),
  CONSTRAINT meal_adherence_facts_meal_key_check
    CHECK (
      char_length(meal_key) BETWEEN 1 AND 40
      AND meal_key IN ('breakfast', 'lunch', 'dinner', 'snack_1', 'snack_2', 'snack_3')
    ),
  CONSTRAINT meal_adherence_facts_contract_version_check
    CHECK (contract_version = 1)
);

-- §15 / §8.2: deterministic latest-observation selection
CREATE INDEX meal_adherence_facts_user_day_meal_idx
  ON public.meal_adherence_facts (user_id, local_day, meal_key, occurred_at DESC, id DESC);

-- =====================================================================
-- 3. public.daily_target_snapshots
-- =====================================================================
CREATE TABLE public.daily_target_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingestion_key text NOT NULL,
  fact_fingerprint text NOT NULL,
  captured_at timestamptz NOT NULL,
  captured_timezone text NOT NULL,
  captured_timezone_source text NOT NULL,
  local_day date NOT NULL,
  calorie_target_kcal numeric(7, 2) NOT NULL,
  calculation_weight_kg numeric(5, 2),
  target_source text NOT NULL,
  target_algorithm_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  contract_version integer NOT NULL DEFAULT 1,
  CONSTRAINT daily_target_snapshots_pkey PRIMARY KEY (id),
  CONSTRAINT daily_target_snapshots_user_ingestion_key_key UNIQUE (user_id, ingestion_key),
  CONSTRAINT daily_target_snapshots_ingestion_key_check
    CHECK (
      char_length(ingestion_key) BETWEEN 1 AND 128
      AND ingestion_key ~ '^daily-target:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    ),
  CONSTRAINT daily_target_snapshots_fact_fingerprint_check
    CHECK (fact_fingerprint ~ '^[0-9a-f]{64}$'),
  CONSTRAINT daily_target_snapshots_captured_timezone_check
    CHECK (char_length(captured_timezone) BETWEEN 1 AND 64),
  CONSTRAINT daily_target_snapshots_captured_timezone_source_check
    CHECK (captured_timezone_source IN ('device', 'user_setting', 'assumed_utc')),
  CONSTRAINT daily_target_snapshots_calorie_target_kcal_check
    CHECK (calorie_target_kcal > 0 AND calorie_target_kcal <= 20000),
  CONSTRAINT daily_target_snapshots_calculation_weight_kg_check
    CHECK (calculation_weight_kg IS NULL OR (calculation_weight_kg > 0 AND calculation_weight_kg <= 500)),
  CONSTRAINT daily_target_snapshots_target_source_check
    CHECK (target_source IN ('calculated', 'user_entered', 'unknown')),
  CONSTRAINT daily_target_snapshots_target_algorithm_version_check
    CHECK (
      target_algorithm_version IS NULL
      OR char_length(target_algorithm_version) BETWEEN 1 AND 32
    ),
  CONSTRAINT daily_target_snapshots_calculation_fields_check
    CHECK (
      CASE
        WHEN target_source = 'calculated' THEN
          calculation_weight_kg IS NOT NULL AND target_algorithm_version IS NOT NULL
        ELSE
          calculation_weight_kg IS NULL AND target_algorithm_version IS NULL
      END
    ),
  CONSTRAINT daily_target_snapshots_contract_version_check
    CHECK (contract_version = 1)
);

-- §15 / §8.3: deterministic applicable-snapshot selection
CREATE INDEX daily_target_snapshots_user_day_captured_idx
  ON public.daily_target_snapshots (user_id, local_day, captured_at DESC, id DESC);

-- =====================================================================
-- 4. Explicit least-privilege Data API grants (§16)
-- =====================================================================
REVOKE ALL ON public.hydration_facts FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.meal_adherence_facts FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON public.daily_target_snapshots FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON public.hydration_facts TO authenticated;
GRANT SELECT ON public.meal_adherence_facts TO authenticated;
GRANT SELECT ON public.daily_target_snapshots TO authenticated;

GRANT SELECT, INSERT ON public.hydration_facts TO service_role;
GRANT SELECT, INSERT ON public.meal_adherence_facts TO service_role;
GRANT SELECT, INSERT ON public.daily_target_snapshots TO service_role;

-- =====================================================================
-- 5. Row-level security (defense in depth for user-facing roles)
-- =====================================================================
ALTER TABLE public.hydration_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_adherence_facts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_target_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their own hydration facts"
  ON public.hydration_facts
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can read their own meal adherence facts"
  ON public.meal_adherence_facts
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can read their own daily target snapshots"
  ON public.daily_target_snapshots
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);