CREATE TABLE public.achievements (
  id text PRIMARY KEY,
  category text NOT NULL,
  target_value numeric NOT NULL DEFAULT 1,
  xp_reward integer NOT NULL DEFAULT 0,
  rarity text NOT NULL DEFAULT 'common',
  is_hidden boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.achievements TO authenticated;
GRANT ALL ON public.achievements TO service_role;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read achievements catalog"
  ON public.achievements FOR SELECT TO authenticated USING (true);

CREATE TABLE public.user_achievement_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id text NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  current_value numeric NOT NULL DEFAULT 0,
  target_value numeric NOT NULL DEFAULT 1,
  progress_percentage integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_uap_user ON public.user_achievement_progress(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_achievement_progress TO authenticated;
GRANT ALL ON public.user_achievement_progress TO service_role;
ALTER TABLE public.user_achievement_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own achievement progress"
  ON public.user_achievement_progress FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_uap_updated_at BEFORE UPDATE ON public.user_achievement_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id text NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  xp_awarded integer NOT NULL DEFAULT 0,
  source_event_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_ua_user_unlocked ON public.user_achievements(user_id, unlocked_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own achievements"
  ON public.user_achievements FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

INSERT INTO public.achievements (id, category, target_value, xp_reward, rarity, is_hidden) VALUES
  ('profile_completed','onboarding',1,50,'common',false),
  ('assessment_completed','onboarding',1,50,'common',false),
  ('workouts_1','workouts',1,50,'common',false),
  ('workouts_5','workouts',5,100,'common',false),
  ('workouts_10','workouts',10,100,'uncommon',false),
  ('workouts_25','workouts',25,200,'rare',false),
  ('workouts_50','workouts',50,400,'epic',false),
  ('workouts_100','workouts',100,1000,'legendary',false),
  ('streak_3','consistency',3,50,'common',false),
  ('streak_7','consistency',7,100,'uncommon',false),
  ('streak_14','consistency',14,200,'rare',false),
  ('streak_30','consistency',30,400,'epic',false),
  ('streak_100','consistency',100,1000,'legendary',false),
  ('week_1','programs',1,100,'common',false),
  ('program_1','programs',1,200,'rare',false),
  ('programs_3','programs',3,400,'epic',false),
  ('programs_10','programs',10,1000,'legendary',false),
  ('pushups_100','strength',100,100,'common',false),
  ('pushups_500','strength',500,200,'rare',false),
  ('pullups_10_session','strength',10,200,'rare',false),
  ('pullups_25','strength',25,100,'uncommon',false),
  ('pullups_100','strength',100,400,'epic',false),
  ('plank_60','strength',60,100,'uncommon',false),
  ('plank_120','strength',120,200,'rare',false),
  ('skill_l_sit','skills',1,200,'rare',false),
  ('skill_handstand','skills',1,400,'epic',false),
  ('skill_muscle_up','skills',1,400,'epic',false),
  ('skill_front_lever','skills',1,1000,'legendary',false),
  ('skill_back_lever','skills',1,400,'epic',false),
  ('skill_human_flag','skills',1,1000,'legendary',true),
  ('skill_planche','skills',1,1000,'legendary',true),
  ('goals_1','goals',1,50,'common',false),
  ('goals_5','goals',5,100,'uncommon',false),
  ('goals_10','goals',10,200,'rare',false)
ON CONFLICT (id) DO NOTHING;