CREATE TABLE public.user_setting (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_setting TO authenticated;
GRANT ALL ON public.user_setting TO service_role;

ALTER TABLE public.user_setting ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_setting_own_select" ON public.user_setting FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "user_setting_own_insert" ON public.user_setting FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_setting_own_update" ON public.user_setting FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "user_setting_own_delete" ON public.user_setting FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_user_setting_updated_at BEFORE UPDATE ON public.user_setting
FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();