-- 1. Drop redundant duplicate indexes (identical column sets already covered)
DROP INDEX IF EXISTS public.idx_training_weeks_plan;          -- dup of training_weeks_plan_id_week_number_key
DROP INDEX IF EXISTS public.idx_training_days_plan;           -- dup of training_days_plan_id_week_number_day_number_key
DROP INDEX IF EXISTS public.training_days_plan_week_day_idx;  -- dup of the same unique index
DROP INDEX IF EXISTS public.idx_planned_workouts_plan;        -- dup of planned_workouts_plan_week_day_idx

-- 2. Missing referential integrity on user_id (verified: zero orphan rows)
ALTER TABLE public.training_plans
  ADD CONSTRAINT training_plans_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.training_weeks
  ADD CONSTRAINT training_weeks_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.training_days
  ADD CONSTRAINT training_days_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.planned_workouts
  ADD CONSTRAINT planned_workouts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.generated_workouts
  ADD CONSTRAINT generated_workouts_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_stats
  ADD CONSTRAINT user_stats_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_progression
  ADD CONSTRAINT user_progression_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.xp_history
  ADD CONSTRAINT xp_history_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.level_history
  ADD CONSTRAINT level_history_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_achievements
  ADD CONSTRAINT user_achievements_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.user_achievement_progress
  ADD CONSTRAINT user_achievement_progress_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Scope training RLS policies to `authenticated` (was implicit PUBLIC).
--    auth.uid() is NULL for anon, so effective access is unchanged; this only
--    aligns them with every other table in the schema.
DROP POLICY IF EXISTS "Users manage own weeks" ON public.training_weeks;
CREATE POLICY "Users manage own weeks" ON public.training_weeks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own days" ON public.training_days;
CREATE POLICY "Users manage own days" ON public.training_days
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own planned workouts" ON public.planned_workouts;
CREATE POLICY "Users manage own planned workouts" ON public.planned_workouts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Ensure Data API grants exist for the training tables touched above.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_weeks TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_days TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planned_workouts TO authenticated;
GRANT ALL ON public.training_weeks TO service_role;
GRANT ALL ON public.training_days TO service_role;
GRANT ALL ON public.planned_workouts TO service_role;