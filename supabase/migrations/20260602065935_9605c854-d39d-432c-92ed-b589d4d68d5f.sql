-- Schema additions for Al-Amin insurance & jenis kelamin
ALTER TABLE public.loan_simulation
  ADD COLUMN IF NOT EXISTS jenis_kelamin text,
  ADD COLUMN IF NOT EXISTS asuransi_provider text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS asuransi_nominal bigint NOT NULL DEFAULT 0;

ALTER TABLE public.loan_product_config
  ADD COLUMN IF NOT EXISTS asuransi_provider_default text NOT NULL DEFAULT 'manual';

CREATE TABLE IF NOT EXISTS public.alamin_tarif (
  umur integer NOT NULL,
  tenor_bulan integer NOT NULL,
  rate numeric(10,4) NOT NULL,
  PRIMARY KEY (umur, tenor_bulan)
);

GRANT SELECT ON public.alamin_tarif TO authenticated;
GRANT ALL ON public.alamin_tarif TO service_role;

ALTER TABLE public.alamin_tarif ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read alamin_tarif" ON public.alamin_tarif
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert alamin_tarif" ON public.alamin_tarif
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update alamin_tarif" ON public.alamin_tarif
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete alamin_tarif" ON public.alamin_tarif
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.alamin_underwriting_rule (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  urutan integer NOT NULL DEFAULT 0,
  kode text NOT NULL,
  keterangan text NOT NULL,
  umur_min integer NOT NULL,
  umur_max integer NOT NULL,
  plafon_min bigint NOT NULL,
  plafon_max bigint NOT NULL,
  tenor_max_bulan integer,
  x_plus_n integer NOT NULL DEFAULT 70
);

GRANT SELECT ON public.alamin_underwriting_rule TO authenticated;
GRANT ALL ON public.alamin_underwriting_rule TO service_role;

ALTER TABLE public.alamin_underwriting_rule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read alamin_uw" ON public.alamin_underwriting_rule
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert alamin_uw" ON public.alamin_underwriting_rule
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update alamin_uw" ON public.alamin_underwriting_rule
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete alamin_uw" ON public.alamin_underwriting_rule
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.alamin_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  ujroh_pct numeric(5,2) NOT NULL DEFAULT 10,
  pajak_pct numeric(5,2) NOT NULL DEFAULT 2,
  premi_min bigint NOT NULL DEFAULT 5000,
  x_plus_n_default integer NOT NULL DEFAULT 70,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.alamin_config TO authenticated;
GRANT ALL ON public.alamin_config TO service_role;

ALTER TABLE public.alamin_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read alamin_config" ON public.alamin_config
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins update alamin_config" ON public.alamin_config
  FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert alamin_config" ON public.alamin_config
  FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.alamin_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- Seed underwriting rules (24 rules from Excel "Keterangan" sheet)
INSERT INTO public.alamin_underwriting_rule (urutan, kode, keterangan, umur_min, umur_max, plafon_min, plafon_max, tenor_max_bulan, x_plus_n) VALUES
(1,'NM','Non Medis (Melampirkan SPAPP)',17,64,0,100000000,240,70),
(2,'D','Melakukan Pemeriksaan Medical D',65,69,0,100000000,NULL,70),
(3,'NM','Non Medis (Melampirkan SPAPP)',17,55,100000001,300000000,NULL,70),
(4,'A','Melakukan Pemeriksaan Medical A',56,64,100000001,300000000,NULL,70),
(5,'D','Melakukan Pemeriksaan Medical D',65,69,100000001,300000000,NULL,70),
(6,'NM','Non Medis (Melampirkan SPAPP)',17,55,300000001,500000000,NULL,70),
(7,'B','Melakukan Pemeriksaan Medical B',56,64,300000001,500000000,NULL,70),
(8,'D','Melakukan Pemeriksaan Medical D',65,69,300000001,500000000,NULL,70),
(9,'NM','Non Medis (Melampirkan SPAPP)',17,55,500000001,600000000,NULL,70),
(10,'C','Melakukan Pemeriksaan Medical C',56,64,500000001,600000000,NULL,70),
(11,'D','Melakukan Pemeriksaan Medical D',65,69,500000001,600000000,NULL,70),
(12,'NM','Non Medis (Melampirkan SPAPP)',17,50,600000001,800000000,NULL,70),
(13,'A','Melakukan Pemeriksaan Medical A',51,55,600000001,800000000,NULL,70),
(14,'C','Melakukan Pemeriksaan Medical C',56,60,600000001,800000000,NULL,70),
(15,'D','Melakukan Pemeriksaan Medical D',61,69,600000001,800000000,NULL,70),
(16,'NM','Non Medis (Melampirkan SPAPP)',17,50,800000001,1000000000,NULL,70),
(17,'B','Melakukan Pemeriksaan Medical B',51,55,800000001,1000000000,NULL,70),
(18,'C','Melakukan Pemeriksaan Medical C',56,60,800000001,1000000000,NULL,70),
(19,'D','Melakukan Pemeriksaan Medical D',61,69,800000001,1000000000,NULL,70),
(20,'NM','Non Medis (Melampirkan SPAPP)',17,45,1000000001,1500000000,NULL,65),
(21,'B','Melakukan Pemeriksaan Medical B',46,50,1000000001,1500000000,NULL,70),
(22,'C','Melakukan Pemeriksaan Medical C',51,55,1000000001,1500000000,NULL,70),
(23,'D','Melakukan Pemeriksaan Medical D',56,69,1000000001,1500000000,NULL,70),
(24,'E','Melakukan Pemeriksaan Medical E',17,69,1500000001,5000000000,NULL,70);