CREATE TABLE public.xp_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  reason text NOT NULL,
  event_type text NOT NULL,
  source_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  running_total integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.xp_history TO authenticated;
GRANT ALL ON public.xp_history TO service_role;

ALTER TABLE public.xp_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own xp history"
ON public.xp_history FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_xp_history_user_created ON public.xp_history (user_id, created_at DESC);
CREATE UNIQUE INDEX idx_xp_history_unique_source ON public.xp_history (user_id, event_type, source_id) WHERE source_id IS NOT NULL;

CREATE TABLE public.user_stats (
  user_id uuid NOT NULL PRIMARY KEY,
  current_xp integer NOT NULL DEFAULT 0,
  lifetime_xp integer NOT NULL DEFAULT 0,
  level integer NOT NULL DEFAULT 1,
  last_activity_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_stats TO authenticated;
GRANT ALL ON public.user_stats TO service_role;

ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own stats"
ON public.user_stats FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_stats_set_updated_at
BEFORE UPDATE ON public.user_stats
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();