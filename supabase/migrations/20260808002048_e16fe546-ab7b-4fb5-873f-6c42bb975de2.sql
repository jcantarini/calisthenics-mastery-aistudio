CREATE TABLE public.user_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  category text NOT NULL,
  progress_type text NOT NULL,
  title text NOT NULL,
  description text,
  target_value numeric NOT NULL DEFAULT 1,
  current_value numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  start_date date NOT NULL DEFAULT (now()::date),
  target_date date,
  completed_at timestamp with time zone,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_goals_status_check CHECK (status IN ('draft','active','paused','completed','cancelled','expired')),
  CONSTRAINT user_goals_target_positive CHECK (target_value > 0),
  CONSTRAINT user_goals_current_nonneg CHECK (current_value >= 0),
  CONSTRAINT user_goals_completed_at_required CHECK (status <> 'completed' OR completed_at IS NOT NULL)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_goals TO authenticated;
GRANT ALL ON public.user_goals TO service_role;

ALTER TABLE public.user_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own goals" ON public.user_goals
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_user_goals_user_status ON public.user_goals (user_id, status, created_at DESC);
CREATE INDEX idx_user_goals_user_target_date ON public.user_goals (user_id, target_date);

CREATE TRIGGER set_user_goals_updated_at
  BEFORE UPDATE ON public.user_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();