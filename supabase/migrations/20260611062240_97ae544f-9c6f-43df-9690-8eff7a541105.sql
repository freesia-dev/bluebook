
-- Enums
DO $$ BEGIN
  CREATE TYPE public.cs_produk_tabungan AS ENUM ('simpeda','prama','simpel','tabunganku','giro','alamin','taspen','si');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cs_jenis_kartu AS ENUM ('simpeda','prama','tabunganku');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cs_mutasi_tipe AS ENUM ('masuk','keluar');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.cs_deposito_status AS ENUM ('aktif','cair','pindah');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Helper: can manage CS (admin + cs)
CREATE OR REPLACE FUNCTION public.can_manage_cs()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('admin','cs')
  ) AND NOT public.is_demo_user();
$$;

CREATE OR REPLACE FUNCTION public.can_view_cs()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('admin','cs','demo','pemimpin')
  );
$$;

-- 1) cs_cif
CREATE TABLE public.cs_cif (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_urut integer NOT NULL,
  cif text NOT NULL UNIQUE,
  nama text NOT NULL,
  tanggal_input date NOT NULL DEFAULT CURRENT_DATE,
  user_input text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cs_cif TO authenticated;
GRANT ALL ON public.cs_cif TO service_role;
ALTER TABLE public.cs_cif ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_cif_select" ON public.cs_cif FOR SELECT TO authenticated USING (public.can_view_cs());
CREATE POLICY "cs_cif_insert" ON public.cs_cif FOR INSERT TO authenticated WITH CHECK (public.can_manage_cs());
CREATE POLICY "cs_cif_update" ON public.cs_cif FOR UPDATE TO authenticated USING (public.can_manage_cs()) WITH CHECK (public.can_manage_cs());
CREATE POLICY "cs_cif_delete" ON public.cs_cif FOR DELETE TO authenticated USING (public.can_manage_cs());
CREATE INDEX idx_cs_cif_nama ON public.cs_cif (nama);
CREATE INDEX idx_cs_cif_tanggal ON public.cs_cif (tanggal_input DESC);

-- 2) cs_rekening
CREATE TABLE public.cs_rekening (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  produk public.cs_produk_tabungan NOT NULL,
  nomor_urut integer NOT NULL,
  nomor_rekening text NOT NULL,
  cif_id uuid REFERENCES public.cs_cif(id) ON DELETE SET NULL,
  cif text,
  nama text NOT NULL,
  tanggal_buka date NOT NULL DEFAULT CURRENT_DATE,
  keterangan text,
  user_input text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (produk, nomor_rekening)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cs_rekening TO authenticated;
GRANT ALL ON public.cs_rekening TO service_role;
ALTER TABLE public.cs_rekening ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_rek_select" ON public.cs_rekening FOR SELECT TO authenticated USING (public.can_view_cs());
CREATE POLICY "cs_rek_insert" ON public.cs_rekening FOR INSERT TO authenticated WITH CHECK (public.can_manage_cs());
CREATE POLICY "cs_rek_update" ON public.cs_rekening FOR UPDATE TO authenticated USING (public.can_manage_cs()) WITH CHECK (public.can_manage_cs());
CREATE POLICY "cs_rek_delete" ON public.cs_rekening FOR DELETE TO authenticated USING (public.can_manage_cs());
CREATE INDEX idx_cs_rek_produk_tanggal ON public.cs_rekening (produk, tanggal_buka DESC);
CREATE INDEX idx_cs_rek_cif ON public.cs_rekening (cif);

-- 3) cs_kartu_atm_mutasi
CREATE TABLE public.cs_kartu_atm_mutasi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  jenis_kartu public.cs_jenis_kartu NOT NULL,
  tipe public.cs_mutasi_tipe NOT NULL,
  jumlah integer NOT NULL CHECK (jumlah > 0),
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  keterangan text,
  user_input text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cs_kartu_atm_mutasi TO authenticated;
GRANT ALL ON public.cs_kartu_atm_mutasi TO service_role;
ALTER TABLE public.cs_kartu_atm_mutasi ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_kartu_select" ON public.cs_kartu_atm_mutasi FOR SELECT TO authenticated USING (public.can_view_cs());
CREATE POLICY "cs_kartu_insert" ON public.cs_kartu_atm_mutasi FOR INSERT TO authenticated WITH CHECK (public.can_manage_cs());
CREATE POLICY "cs_kartu_update" ON public.cs_kartu_atm_mutasi FOR UPDATE TO authenticated USING (public.can_manage_cs()) WITH CHECK (public.can_manage_cs());
CREATE POLICY "cs_kartu_delete" ON public.cs_kartu_atm_mutasi FOR DELETE TO authenticated USING (public.can_manage_cs());

-- 4) cs_buku_tabungan
CREATE TABLE public.cs_buku_tabungan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipe public.cs_mutasi_tipe NOT NULL,
  jumlah integer NOT NULL CHECK (jumlah > 0),
  tanggal date NOT NULL DEFAULT CURRENT_DATE,
  cif text,
  nama text,
  nomor_rekening text,
  keterangan text,
  user_input text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cs_buku_tabungan TO authenticated;
GRANT ALL ON public.cs_buku_tabungan TO service_role;
ALTER TABLE public.cs_buku_tabungan ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_buku_select" ON public.cs_buku_tabungan FOR SELECT TO authenticated USING (public.can_view_cs());
CREATE POLICY "cs_buku_insert" ON public.cs_buku_tabungan FOR INSERT TO authenticated WITH CHECK (public.can_manage_cs());
CREATE POLICY "cs_buku_update" ON public.cs_buku_tabungan FOR UPDATE TO authenticated USING (public.can_manage_cs()) WITH CHECK (public.can_manage_cs());
CREATE POLICY "cs_buku_delete" ON public.cs_buku_tabungan FOR DELETE TO authenticated USING (public.can_manage_cs());

-- 5) cs_bilyet_deposito
CREATE TABLE public.cs_bilyet_deposito (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_urut integer NOT NULL,
  nomor_bilyet text NOT NULL UNIQUE,
  cif text,
  nama text NOT NULL,
  nominal numeric(18,2) NOT NULL DEFAULT 0,
  jangka_waktu_bulan integer,
  tanggal_terbit date NOT NULL DEFAULT CURRENT_DATE,
  tanggal_jatuh_tempo date,
  status public.cs_deposito_status NOT NULL DEFAULT 'aktif',
  keterangan text,
  user_input text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cs_bilyet_deposito TO authenticated;
GRANT ALL ON public.cs_bilyet_deposito TO service_role;
ALTER TABLE public.cs_bilyet_deposito ENABLE ROW LEVEL SECURITY;
CREATE POLICY "cs_dep_select" ON public.cs_bilyet_deposito FOR SELECT TO authenticated USING (public.can_view_cs());
CREATE POLICY "cs_dep_insert" ON public.cs_bilyet_deposito FOR INSERT TO authenticated WITH CHECK (public.can_manage_cs());
CREATE POLICY "cs_dep_update" ON public.cs_bilyet_deposito FOR UPDATE TO authenticated USING (public.can_manage_cs()) WITH CHECK (public.can_manage_cs());
CREATE POLICY "cs_dep_delete" ON public.cs_bilyet_deposito FOR DELETE TO authenticated USING (public.can_manage_cs());

-- updated_at triggers
CREATE TRIGGER trg_cs_cif_updated_at BEFORE UPDATE ON public.cs_cif FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();
CREATE TRIGGER trg_cs_rek_updated_at BEFORE UPDATE ON public.cs_rekening FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();
CREATE TRIGGER trg_cs_kartu_updated_at BEFORE UPDATE ON public.cs_kartu_atm_mutasi FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();
CREATE TRIGGER trg_cs_buku_updated_at BEFORE UPDATE ON public.cs_buku_tabungan FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();
CREATE TRIGGER trg_cs_dep_updated_at BEFORE UPDATE ON public.cs_bilyet_deposito FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();

-- activity log triggers
CREATE TRIGGER trg_cs_cif_log AFTER INSERT OR UPDATE OR DELETE ON public.cs_cif FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER trg_cs_rek_log AFTER INSERT OR UPDATE OR DELETE ON public.cs_rekening FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER trg_cs_kartu_log AFTER INSERT OR UPDATE OR DELETE ON public.cs_kartu_atm_mutasi FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER trg_cs_buku_log AFTER INSERT OR UPDATE OR DELETE ON public.cs_buku_tabungan FOR EACH ROW EXECUTE FUNCTION public.log_activity();
CREATE TRIGGER trg_cs_dep_log AFTER INSERT OR UPDATE OR DELETE ON public.cs_bilyet_deposito FOR EACH ROW EXECUTE FUNCTION public.log_activity();
