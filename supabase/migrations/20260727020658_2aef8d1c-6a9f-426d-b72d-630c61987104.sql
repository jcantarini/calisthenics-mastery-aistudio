
CREATE TABLE public.fitness_assessment (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pushups text,
  pullups text,
  dips text,
  plank text,
  squats text,
  mobility text,
  skills jsonb NOT NULL DEFAULT '[]'::jsonb,
  skipped jsonb NOT NULL DEFAULT '[]'::jsonb,
  score integer,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fitness_assessment TO authenticated;
GRANT ALL ON public.fitness_assessment TO service_role;

ALTER TABLE public.fitness_assessment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own assessment"
  ON public.fitness_assessment
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_fitness_assessment_updated_at
  BEFORE UPDATE ON public.fitness_assessment
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
