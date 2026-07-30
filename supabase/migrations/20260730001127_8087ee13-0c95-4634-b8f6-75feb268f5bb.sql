ALTER TABLE public.training_plans
  ADD COLUMN IF NOT EXISTS completed_workouts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS completed_weeks integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_workout_date date,
  ADD COLUMN IF NOT EXISTS next_workout_date date,
  ADD COLUMN IF NOT EXISTS progress_percentage integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS start_date date;

ALTER TABLE public.planned_workouts
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'locked',
  ADD COLUMN IF NOT EXISTS scheduled_date date,
  ADD COLUMN IF NOT EXISTS started_at timestamptz;

ALTER TABLE public.training_days
  ADD COLUMN IF NOT EXISTS scheduled_date date;

CREATE INDEX IF NOT EXISTS planned_workouts_plan_week_day_idx
  ON public.planned_workouts (plan_id, week_number, day_number);

CREATE INDEX IF NOT EXISTS training_days_plan_week_day_idx
  ON public.training_days (plan_id, week_number, day_number);