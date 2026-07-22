
CREATE TABLE public.user_onboarding (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  age INTEGER,
  gender TEXT,
  height_cm INTEGER,
  weight_kg NUMERIC,
  country TEXT,
  language TEXT,
  fitness_level TEXT,
  primary_goal TEXT,
  has_experience BOOLEAN,
  equipment JSONB NOT NULL DEFAULT '[]'::jsonb,
  days_per_week INTEGER,
  workout_duration_min INTEGER,
  target_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
  injuries TEXT,
  motivation TEXT,
  skill_goal TEXT,
  current_performance JSONB NOT NULL DEFAULT '{}'::jsonb,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_onboarding TO authenticated;
GRANT ALL ON public.user_onboarding TO service_role;

ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own onboarding"
  ON public.user_onboarding FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
