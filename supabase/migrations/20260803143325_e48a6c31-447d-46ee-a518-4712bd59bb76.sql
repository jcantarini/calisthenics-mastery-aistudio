CREATE TABLE public.user_progression (
  user_id uuid PRIMARY KEY,
  current_level integer NOT NULL DEFAULT 1,
  current_xp integer NOT NULL DEFAULT 0,
  lifetime_xp integer NOT NULL DEFAULT 0,
  xp_to_next_level integer NOT NULL DEFAULT 250,
  progress_percentage integer NOT NULL DEFAULT 0,
  highest_level integer NOT NULL DEFAULT 1,
  prestige integer NOT NULL DEFAULT 0,
  last_level_up_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_progression TO authenticated;
GRANT ALL ON public.user_progression TO service_role;

ALTER TABLE public.user_progression ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own progression"
ON public.user_progression FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_user_progression_updated_at
BEFORE UPDATE ON public.user_progression
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.level_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  previous_level integer NOT NULL,
  new_level integer NOT NULL,
  levels_gained integer NOT NULL DEFAULT 1,
  lifetime_xp integer NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'xp_update',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.level_history TO authenticated;
GRANT ALL ON public.level_history TO service_role;

ALTER TABLE public.level_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own level history"
ON public.level_history FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX level_history_user_new_level_key
ON public.level_history (user_id, new_level);

CREATE INDEX level_history_user_created_idx
ON public.level_history (user_id, created_at DESC);