
DO $$ BEGIN
  CREATE TYPE loan_skema AS ENUM ('anuitas','efektif','sliding');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE public.loan_product_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nama text NOT NULL,
  skema loan_skema NOT NULL DEFAULT 'anuitas',
  max_tenor_bulan int NOT NULL DEFAULT 120,
  bunga_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  asuransi_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  provisi_options jsonb NOT NULL DEFAULT '[]'::jsonb,
  biaya_notaris bigint NOT NULL DEFAULT 0,
  biaya_perikatan bigint NOT NULL DEFAULT 0,
  blokir_angsuran int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  urutan int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_product_config TO authenticated;
GRANT ALL ON public.loan_product_config TO service_role;
ALTER TABLE public.loan_product_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read loan_product_config" ON public.loan_product_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert loan_product_config" ON public.loan_product_config FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins update loan_product_config" ON public.loan_product_config FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins delete loan_product_config" ON public.loan_product_config FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.pension_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pilihan_karir text NOT NULL UNIQUE,
  usia_pensiun int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pension_rule TO authenticated;
GRANT ALL ON public.pension_rule TO service_role;
ALTER TABLE public.pension_rule ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read pension_rule" ON public.pension_rule FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert pension_rule" ON public.pension_rule FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins update pension_rule" ON public.pension_rule FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));
CREATE POLICY "Admins delete pension_rule" ON public.pension_rule FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE public.loan_simulation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_ktp text,
  nama_debitur text NOT NULL,
  tanggal_lahir date,
  pekerjaan text,
  instansi text,
  pilihan_karir text,
  product_id uuid REFERENCES public.loan_product_config(id) ON DELETE SET NULL,
  product_nama text,
  skema loan_skema NOT NULL DEFAULT 'anuitas',
  plafon bigint NOT NULL DEFAULT 0,
  tenor_bulan int NOT NULL DEFAULT 12,
  tanggal_akad date,
  gaji bigint NOT NULL DEFAULT 0,
  bunga_pa numeric NOT NULL DEFAULT 0,
  asuransi_pct numeric NOT NULL DEFAULT 0,
  provisi_pct numeric NOT NULL DEFAULT 0,
  biaya_notaris bigint NOT NULL DEFAULT 0,
  biaya_perikatan bigint NOT NULL DEFAULT 0,
  blokir_angsuran int NOT NULL DEFAULT 0,
  ada_pelunasan boolean NOT NULL DEFAULT false,
  pelunasan_bulan_ke int,
  nama_ao text,
  hasil_ringkasan jsonb,
  tabel_angsuran jsonb,
  created_by uuid,
  created_by_nama text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.loan_simulation TO authenticated;
GRANT ALL ON public.loan_simulation TO service_role;
ALTER TABLE public.loan_simulation ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_use_loan_calc()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('security','ob','teller','cs')
  );
$$;

CREATE POLICY "Allowed roles read loan_simulation" ON public.loan_simulation FOR SELECT TO authenticated USING (can_use_loan_calc());
CREATE POLICY "Non-demo insert loan_simulation" ON public.loan_simulation FOR INSERT TO authenticated WITH CHECK (can_use_loan_calc() AND NOT is_demo_user());
CREATE POLICY "Owner or admin update loan_simulation" ON public.loan_simulation FOR UPDATE TO authenticated USING ((created_by = auth.uid() OR has_role(auth.uid(),'admin'::app_role)) AND NOT is_demo_user());
CREATE POLICY "Owner or admin delete loan_simulation" ON public.loan_simulation FOR DELETE TO authenticated USING (created_by = auth.uid() OR has_role(auth.uid(),'admin'::app_role));

INSERT INTO public.pension_rule (pilihan_karir, usia_pensiun) VALUES
  ('PNS Fungsional', 60),
  ('PNS Struktural', 58),
  ('PPPK Penuh Waktu', 58),
  ('PPPK Paruh Waktu', 58),
  ('Pensiunan', 75)
ON CONFLICT (pilihan_karir) DO NOTHING;

INSERT INTO public.loan_product_config (nama, skema, max_tenor_bulan, bunga_options, asuransi_options, provisi_options, urutan) VALUES
  ('Personal Loan PNSD', 'anuitas', 180, '[{"label":"10%","value":10},{"label":"11%","value":11},{"label":"12%","value":12}]'::jsonb, '[{"label":"0.5%","value":0.5},{"label":"1%","value":1}]'::jsonb, '[{"label":"1%","value":1},{"label":"1.5%","value":1.5}]'::jsonb, 1),
  ('Personal Loan PPPK', 'anuitas', 60, '[{"label":"11%","value":11},{"label":"12%","value":12}]'::jsonb, '[{"label":"1%","value":1}]'::jsonb, '[{"label":"1%","value":1}]'::jsonb, 2),
  ('Multiguna', 'anuitas', 120, '[{"label":"12%","value":12},{"label":"13%","value":13}]'::jsonb, '[{"label":"1%","value":1}]'::jsonb, '[{"label":"1%","value":1}]'::jsonb, 3),
  ('Personal Loan Flagging (Pra-Pensiun)', 'anuitas', 120, '[{"label":"11%","value":11}]'::jsonb, '[{"label":"1%","value":1}]'::jsonb, '[{"label":"1%","value":1}]'::jsonb, 4),
  ('Personal Loan Pensiunan PNSD', 'anuitas', 180, '[{"label":"10%","value":10},{"label":"11%","value":11}]'::jsonb, '[{"label":"1.5%","value":1.5}]'::jsonb, '[{"label":"1%","value":1}]'::jsonb, 5),
  ('Personal Loan Bankaltimtara Sejahtera', 'efektif', 120, '[{"label":"10%","value":10}]'::jsonb, '[{"label":"1%","value":1}]'::jsonb, '[{"label":"1%","value":1}]'::jsonb, 6),
  ('Produktif Sliding', 'sliding', 60, '[{"label":"12%","value":12},{"label":"14%","value":14}]'::jsonb, '[{"label":"0.5%","value":0.5}]'::jsonb, '[{"label":"1%","value":1}]'::jsonb, 7),
  ('Produktif Anuitas', 'anuitas', 60, '[{"label":"12%","value":12},{"label":"14%","value":14}]'::jsonb, '[{"label":"0.5%","value":0.5}]'::jsonb, '[{"label":"1%","value":1}]'::jsonb, 8);

CREATE TRIGGER trg_loan_product_updated BEFORE UPDATE ON public.loan_product_config FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();
CREATE TRIGGER trg_loan_simulation_updated BEFORE UPDATE ON public.loan_simulation FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();
