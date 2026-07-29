
-- Extend training_plans
ALTER TABLE public.training_plans
  ADD COLUMN IF NOT EXISTS total_weeks integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS current_week integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS current_day integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS primary_goal text,
  ADD COLUMN IF NOT EXISTS target_skill text,
  ADD COLUMN IF NOT EXISTS fitness_level text,
  ADD COLUMN IF NOT EXISTS difficulty text,
  ADD COLUMN IF NOT EXISTS days_per_week integer,
  ADD COLUMN IF NOT EXISTS workout_duration_min integer,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

-- training_weeks
CREATE TABLE IF NOT EXISTS public.training_weeks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  week_number integer NOT NULL,
  objective text NOT NULL,
  difficulty text NOT NULL,
  estimated_duration_min integer NOT NULL DEFAULT 0,
  workout_days_count integer NOT NULL DEFAULT 0,
  recovery_days_count integer NOT NULL DEFAULT 0,
  is_deload boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, week_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_weeks TO authenticated;
GRANT ALL ON public.training_weeks TO service_role;
ALTER TABLE public.training_weeks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own weeks" ON public.training_weeks
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_updated_at_training_weeks
  BEFORE UPDATE ON public.training_weeks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- planned_workouts
CREATE TABLE IF NOT EXISTS public.planned_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  day_number integer NOT NULL,
  name text NOT NULL,
  description text,
  difficulty text NOT NULL,
  program_slug text NOT NULL,
  estimated_duration_min integer NOT NULL DEFAULT 30,
  estimated_calories integer NOT NULL DEFAULT 200,
  warmup jsonb NOT NULL DEFAULT '[]'::jsonb,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  cooldown jsonb NOT NULL DEFAULT '[]'::jsonb,
  progression_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  notes text,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planned_workouts TO authenticated;
GRANT ALL ON public.planned_workouts TO service_role;
ALTER TABLE public.planned_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own planned workouts" ON public.planned_workouts
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_updated_at_planned_workouts
  BEFORE UPDATE ON public.planned_workouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- training_days
CREATE TABLE IF NOT EXISTS public.training_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid NOT NULL REFERENCES public.training_plans(id) ON DELETE CASCADE,
  week_id uuid NOT NULL REFERENCES public.training_weeks(id) ON DELETE CASCADE,
  planned_workout_id uuid REFERENCES public.planned_workouts(id) ON DELETE SET NULL,
  week_number integer NOT NULL,
  day_number integer NOT NULL,
  day_type text NOT NULL,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (plan_id, week_number, day_number)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_days TO authenticated;
GRANT ALL ON public.training_days TO service_role;
ALTER TABLE public.training_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own days" ON public.training_days
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER set_updated_at_training_days
  BEFORE UPDATE ON public.training_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_training_weeks_plan ON public.training_weeks(plan_id, week_number);
CREATE INDEX IF NOT EXISTS idx_planned_workouts_plan ON public.planned_workouts(plan_id, week_number, day_number);
CREATE INDEX IF NOT EXISTS idx_training_days_plan ON public.training_days(plan_id, week_number, day_number);
