-- ============ Daftar AO ============
CREATE TABLE public.loan_ao (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  jabatan text,
  is_active boolean NOT NULL DEFAULT true,
  urutan integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_ao TO authenticated;
GRANT ALL ON public.loan_ao TO service_role;

ALTER TABLE public.loan_ao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loan_ao_select" ON public.loan_ao
  FOR SELECT TO authenticated USING (public.is_authenticated());
CREATE POLICY "loan_ao_insert" ON public.loan_ao
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "loan_ao_update" ON public.loan_ao
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "loan_ao_delete" ON public.loan_ao
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_loan_ao_updated
  BEFORE UPDATE ON public.loan_ao
  FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();

-- ============ Program Promo (multi program, menggantikan cerdas_config) ============
CREATE TABLE public.loan_promo_program (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode text NOT NULL DEFAULT 'custom',
  nama_program text NOT NULL,
  deskripsi text,
  aktif boolean NOT NULL DEFAULT true,
  periode_mulai date NOT NULL,
  periode_selesai date NOT NULL,
  bunga_debitur_baru numeric NOT NULL DEFAULT 0,
  bunga_take_over numeric NOT NULL DEFAULT 0,
  bunga_top_up numeric NOT NULL DEFAULT 0,
  diskon_provisi_top_up_pct numeric NOT NULL DEFAULT 0,
  plafon_tier_1_max bigint NOT NULL DEFAULT 0,
  plafon_tier_2_max bigint NOT NULL DEFAULT 0,
  plafon_tier_3_max bigint NOT NULL DEFAULT 0,
  cap_tier_1_baru bigint NOT NULL DEFAULT 0,
  cap_tier_2_baru bigint NOT NULL DEFAULT 0,
  cap_tier_3_baru bigint NOT NULL DEFAULT 0,
  cap_tier_4_baru bigint NOT NULL DEFAULT 0,
  cap_tier_1_takeover bigint NOT NULL DEFAULT 0,
  cap_tier_2_takeover bigint NOT NULL DEFAULT 0,
  cap_tier_3_takeover bigint NOT NULL DEFAULT 0,
  cap_tier_4_takeover bigint NOT NULL DEFAULT 0,
  urutan integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_promo_program TO authenticated;
GRANT ALL ON public.loan_promo_program TO service_role;

ALTER TABLE public.loan_promo_program ENABLE ROW LEVEL SECURITY;

CREATE POLICY "loan_promo_program_select" ON public.loan_promo_program
  FOR SELECT TO authenticated USING (public.is_authenticated());
CREATE POLICY "loan_promo_program_insert" ON public.loan_promo_program
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "loan_promo_program_update" ON public.loan_promo_program
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "loan_promo_program_delete" ON public.loan_promo_program
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_loan_promo_program_updated
  BEFORE UPDATE ON public.loan_promo_program
  FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();

-- ============ Produk: biaya dinamis + aturan DSR ============
ALTER TABLE public.loan_product_config
  ADD COLUMN IF NOT EXISTS biaya_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dsr_rules jsonb NOT NULL DEFAULT '[]'::jsonb;

-- ============ Simulasi: field baru ============
ALTER TABLE public.loan_simulation
  ADD COLUMN IF NOT EXISTS biaya_items jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS angsuran_gaji bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS angsuran_praja bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS dsr_basis text NOT NULL DEFAULT 'gaji',
  ADD COLUMN IF NOT EXISTS dsr_max_pct numeric NOT NULL DEFAULT 100;
