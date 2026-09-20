-- Sprint 8.1A3-C1 — Outbox privilege reset.
-- Corrective, additive and privilege-only: GRANT never removes other
-- privileges, so a database whose default privileges are permissive could
-- leave TRUNCATE, REFERENCES or TRIGGER available to service_role on
-- public.history_dispatch_outbox. This migration resets the privilege set and
-- re-grants exactly the four contracted privileges (§16).
--
-- The table, its data, indexes, constraints, RLS state and deliberate absence
-- of policies are untouched. No schema-wide default privilege is changed and
-- no grant on canonical history or auxiliary facts is affected.

REVOKE ALL ON TABLE public.history_dispatch_outbox
  FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.history_dispatch_outbox TO service_role;