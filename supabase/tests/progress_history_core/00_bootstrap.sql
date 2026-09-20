-- Sprint 8.1A1-V1 — disposable-environment bootstrap.
-- NOT A MIGRATION. Never applied to preview/production.
--
-- Provides the minimal Supabase-like surface the 18 project migrations need:
--   * roles: anon, authenticated, service_role
--   * schema auth with auth.users and auth.uid()
-- and the test harness used by the regression suite.

-- ---------------------------------------------------------------------
-- Roles (no passwords, NOLOGIN: reached through SET ROLE only)
-- ---------------------------------------------------------------------
CREATE ROLE anon NOLOGIN NOINHERIT;
CREATE ROLE authenticated NOLOGIN NOINHERIT;
CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- ---------------------------------------------------------------------
-- Minimal auth schema
-- ---------------------------------------------------------------------
CREATE SCHEMA auth;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

CREATE TABLE auth.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Mirrors PostgREST/GoTrue behaviour closely enough for RLS evaluation:
-- the claim is injected per transaction with set_config().
CREATE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

-- ---------------------------------------------------------------------
-- Test harness
-- ---------------------------------------------------------------------
CREATE SCHEMA test;

CREATE TABLE test.results (
  seq bigserial PRIMARY KEY,
  case_id text NOT NULL UNIQUE,
  section text NOT NULL,
  description text NOT NULL,
  executed_as text NOT NULL,
  expected_sqlstate text NOT NULL,
  actual_sqlstate text NOT NULL,
  status text NOT NULL,
  message text
);

-- p_expected: '00000' means the statement must succeed.
-- p_role:     NULL means "run as the bootstrap superuser".
-- p_sub:      value injected as request.jwt.claim.sub for auth.uid().
CREATE FUNCTION test.run(
  p_id text,
  p_section text,
  p_description text,
  p_sql text,
  p_expected text DEFAULT '00000',
  p_role text DEFAULT NULL,
  p_sub text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_state text;
  v_msg text;
BEGIN
  BEGIN
    PERFORM set_config('request.jwt.claim.sub', COALESCE(p_sub, ''), true);
    IF p_role IS NOT NULL THEN
      EXECUTE format('SET LOCAL ROLE %I', p_role);
    END IF;
    EXECUTE p_sql;
    v_state := '00000';
    v_msg := NULL;
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_state = RETURNED_SQLSTATE, v_msg = MESSAGE_TEXT;
  END;

  RESET ROLE;

  INSERT INTO test.results (
    case_id, section, description, executed_as,
    expected_sqlstate, actual_sqlstate, status, message
  )
  VALUES (
    p_id, p_section, p_description, COALESCE(p_role, 'bootstrap_superuser'),
    p_expected, v_state,
    CASE WHEN v_state = p_expected THEN 'PASS' ELSE 'FAIL' END,
    left(coalesce(v_msg, ''), 200)
  );
END;
$$;
