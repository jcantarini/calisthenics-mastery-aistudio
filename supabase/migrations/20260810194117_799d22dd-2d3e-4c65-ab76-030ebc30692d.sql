ALTER TABLE public.user_goals
  ADD COLUMN IF NOT EXISTS difficulty text NOT NULL DEFAULT 'medium';

ALTER TABLE public.user_goals
  DROP CONSTRAINT IF EXISTS user_goals_difficulty_check;

ALTER TABLE public.user_goals
  ADD CONSTRAINT user_goals_difficulty_check
  CHECK (difficulty IN ('easy', 'medium', 'hard', 'epic'));