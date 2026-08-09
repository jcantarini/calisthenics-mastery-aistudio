CREATE TABLE public.goal_progress_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES public.user_goals(id) ON DELETE CASCADE,
  source_event_id text NOT NULL,
  source_event_type text NOT NULL,
  progress_delta numeric NOT NULL DEFAULT 0,
  observed_value numeric NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  processed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT goal_progress_events_source_unique UNIQUE (goal_id, source_event_id, source_event_type)
);

CREATE INDEX idx_goal_progress_events_user_goal ON public.goal_progress_events (user_id, goal_id, processed_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.goal_progress_events TO authenticated;
GRANT ALL ON public.goal_progress_events TO service_role;

ALTER TABLE public.goal_progress_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own goal tracking records"
ON public.goal_progress_events
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);