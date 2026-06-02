CREATE TABLE public.loan_promo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  deskripsi text,
  periode_mulai date NOT NULL,
  periode_selesai date NOT NULL,
  aktif boolean NOT NULL DEFAULT true,
  bunga_override numeric,
  provisi_diskon_pct numeric DEFAULT 0,
  gratis_asuransi boolean NOT NULL DEFAULT false,
  cap_subsidi bigint DEFAULT 0,
  target_skema text NOT NULL DEFAULT 'semua',
  syarat text,
  urutan integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_promo TO authenticated;
GRANT ALL ON public.loan_promo TO service_role;

ALTER TABLE public.loan_promo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read loan_promo" ON public.loan_promo
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins insert loan_promo" ON public.loan_promo
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update loan_promo" ON public.loan_promo
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete loan_promo" ON public.loan_promo
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_loan_promo_updated_at
  BEFORE UPDATE ON public.loan_promo
  FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();