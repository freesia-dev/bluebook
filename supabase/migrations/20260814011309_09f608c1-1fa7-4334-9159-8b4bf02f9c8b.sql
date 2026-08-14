CREATE TABLE public.app_setting (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_setting TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.app_setting TO authenticated;
GRANT ALL ON public.app_setting TO service_role;
ALTER TABLE public.app_setting ENABLE ROW LEVEL SECURITY;
CREATE POLICY "app_setting_read" ON public.app_setting FOR SELECT TO authenticated USING (true);
CREATE POLICY "app_setting_admin_write" ON public.app_setting FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));