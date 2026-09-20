-- Sprint 8.1A3 — Durable dispatch outbox schema (additive, forward-only)
-- Implements ADR 0005 / Progress History domain contracts §12, §12.1, §15, §16.
-- Storage only: no claim/ack/recovery function, no worker, no trigger, no RPC.

CREATE TABLE public.history_dispatch_outbox (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id uuid NOT NULL,
  adjustment_id uuid,
  event_kind text NOT NULL,
  consumer text NOT NULL,
  state text NOT NULL DEFAULT 'pending',
  attempt_count integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  leased_at timestamptz,
  lease_expires_at timestamptz,
  lease_owner text,
  last_error_code text,
  last_error_summary text,
  delivered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  event_version integer NOT NULL DEFAULT 1,
  CONSTRAINT history_dispatch_outbox_pkey PRIMARY KEY (id),
  CONSTRAINT history_dispatch_outbox_session_fkey
    FOREIGN KEY (session_id, user_id)
    REFERENCES public.workout_sessions (id, user_id),
  CONSTRAINT history_dispatch_outbox_adjustment_fkey
    FOREIGN KEY (adjustment_id, user_id)
    REFERENCES public.workout_session_adjustments (id, user_id),
  CONSTRAINT history_dispatch_outbox_event_kind_check
    CHECK (event_kind IN ('session_completed', 'session_voided', 'session_corrected')),
  CONSTRAINT history_dispatch_outbox_consumer_check
    CHECK (consumer IN ('training_plan_sync', 'gamification', 'goals')),
  CONSTRAINT history_dispatch_outbox_state_check
    CHECK (state IN ('pending', 'processing', 'retry_scheduled', 'delivered', 'dead_letter')),
  CONSTRAINT history_dispatch_outbox_attempt_count_check
    CHECK (attempt_count >= 0),
  CONSTRAINT history_dispatch_outbox_event_version_check
    CHECK (event_version = 1),
  CONSTRAINT history_dispatch_outbox_lease_owner_check
    CHECK (lease_owner IS NULL OR char_length(lease_owner) BETWEEN 1 AND 100),
  CONSTRAINT history_dispatch_outbox_last_error_code_check
    CHECK (last_error_code IS NULL OR char_length(last_error_code) BETWEEN 1 AND 64),
  CONSTRAINT history_dispatch_outbox_last_error_summary_check
    CHECK (last_error_summary IS NULL OR char_length(last_error_summary) BETWEEN 1 AND 500),
  -- §12.1 subject resolution: completion events forbid an adjustment,
  -- void/correction events require one.
  CONSTRAINT history_dispatch_outbox_event_shape_check
    CHECK (
      CASE
        WHEN event_kind = 'session_completed' THEN adjustment_id IS NULL
        ELSE adjustment_id IS NOT NULL
      END
    )
);

-- §12.1 duplicate protection under PostgreSQL null semantics: two partial
-- unique indexes, never one nullable four-column unique constraint.
CREATE UNIQUE INDEX history_dispatch_outbox_completion_key
  ON public.history_dispatch_outbox (session_id, event_kind, consumer)
  WHERE adjustment_id IS NULL;

CREATE UNIQUE INDEX history_dispatch_outbox_adjustment_key
  ON public.history_dispatch_outbox (adjustment_id, event_kind, consumer)
  WHERE adjustment_id IS NOT NULL;

-- §15 index contract
CREATE INDEX history_dispatch_outbox_claim_idx
  ON public.history_dispatch_outbox (state, next_attempt_at, id)
  WHERE state IN ('pending', 'retry_scheduled');

CREATE INDEX history_dispatch_outbox_lease_expiry_idx
  ON public.history_dispatch_outbox (lease_expires_at)
  WHERE state = 'processing';

CREATE INDEX history_dispatch_outbox_user_idx
  ON public.history_dispatch_outbox (user_id);

CREATE INDEX history_dispatch_outbox_session_user_idx
  ON public.history_dispatch_outbox (session_id, user_id);

CREATE INDEX history_dispatch_outbox_adjustment_user_idx
  ON public.history_dispatch_outbox (adjustment_id, user_id)
  WHERE adjustment_id IS NOT NULL;

CREATE INDEX history_dispatch_outbox_dead_letter_idx
  ON public.history_dispatch_outbox (state, updated_at)
  WHERE state = 'dead_letter';

CREATE INDEX history_dispatch_outbox_delivered_retention_idx
  ON public.history_dispatch_outbox (state, delivered_at)
  WHERE state = 'delivered';

-- §16 security matrix: mutable server-owned operational state.
-- No user-facing access at all; service_role bypasses RLS by design.
REVOKE ALL ON TABLE public.history_dispatch_outbox FROM PUBLIC;
REVOKE ALL ON TABLE public.history_dispatch_outbox FROM anon;
REVOKE ALL ON TABLE public.history_dispatch_outbox FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.history_dispatch_outbox TO service_role;

ALTER TABLE public.history_dispatch_outbox ENABLE ROW LEVEL SECURITY;
-- Deliberately no policy: anon and authenticated must never read this table.