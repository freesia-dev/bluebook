
CREATE TABLE public.cerdas_config (
  id integer PRIMARY KEY DEFAULT 1,
  nama_program text NOT NULL DEFAULT 'CERDAS',
  aktif boolean NOT NULL DEFAULT true,
  periode_mulai date NOT NULL DEFAULT '2026-06-02',
  periode_selesai date NOT NULL DEFAULT '2026-08-31',
  bunga_debitur_baru numeric NOT NULL DEFAULT 9.5,
  bunga_take_over numeric NOT NULL DEFAULT 9.0,
  bunga_top_up numeric NOT NULL DEFAULT 10.5,
  diskon_provisi_top_up_pct numeric NOT NULL DEFAULT 50,
  cap_tier_1 bigint NOT NULL DEFAULT 1400000,
  cap_tier_2 bigint NOT NULL DEFAULT 3000000,
  cap_tier_3 bigint NOT NULL DEFAULT 5000000,
  plafon_tier_1_max bigint NOT NULL DEFAULT 75000000,
  plafon_tier_2_max bigint NOT NULL DEFAULT 150000000,
  plafon_tier_3_max bigint NOT NULL DEFAULT 300000000,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cerdas_config_single CHECK (id = 1)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cerdas_config TO authenticated;
GRANT ALL ON public.cerdas_config TO service_role;

ALTER TABLE public.cerdas_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read cerdas_config" ON public.cerdas_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert cerdas_config" ON public.cerdas_config
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update cerdas_config" ON public.cerdas_config
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete cerdas_config" ON public.cerdas_config
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.cerdas_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.loan_simulation
  ADD COLUMN IF NOT EXISTS cerdas_skema text,
  ADD COLUMN IF NOT EXISTS cerdas_cap_subsidi bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cerdas_subsidi_bank bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cerdas_selisih_debitur bigint NOT NULL DEFAULT 0;
