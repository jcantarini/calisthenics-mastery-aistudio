
CREATE TABLE public.training_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  program_slug text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX training_plans_user_idx ON public.training_plans(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_plans TO authenticated;
GRANT ALL ON public.training_plans TO service_role;
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own training plans" ON public.training_plans
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER training_plans_set_updated_at
  BEFORE UPDATE ON public.training_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.generated_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  plan_id uuid REFERENCES public.training_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  difficulty text NOT NULL,
  program_slug text NOT NULL,
  estimated_duration_min integer NOT NULL DEFAULT 30,
  estimated_calories integer NOT NULL DEFAULT 200,
  warmup jsonb NOT NULL DEFAULT '[]'::jsonb,
  exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  cooldown jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  is_first boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX generated_workouts_user_idx ON public.generated_workouts(user_id, created_at DESC);
CREATE INDEX generated_workouts_plan_idx ON public.generated_workouts(plan_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_workouts TO authenticated;
GRANT ALL ON public.generated_workouts TO service_role;
ALTER TABLE public.generated_workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own generated workouts" ON public.generated_workouts
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER generated_workouts_set_updated_at
  BEFORE UPDATE ON public.generated_workouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
