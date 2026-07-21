
CREATE TABLE public.workout_reminder_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT true,
  sound BOOLEAN NOT NULL DEFAULT true,
  vibration BOOLEAN NOT NULL DEFAULT true,
  reminders JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workout_reminder_settings TO authenticated;
GRANT ALL ON public.workout_reminder_settings TO service_role;

ALTER TABLE public.workout_reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own reminder settings"
  ON public.workout_reminder_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_workout_reminder_settings_updated_at
  BEFORE UPDATE ON public.workout_reminder_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
