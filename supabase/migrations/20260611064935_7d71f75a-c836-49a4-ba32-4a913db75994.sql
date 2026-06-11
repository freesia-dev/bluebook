
-- 1) Tambah simpeda_ib ke enum produk tabungan
ALTER TYPE public.cs_produk_tabungan ADD VALUE IF NOT EXISTS 'simpeda_ib';

-- 2) Enum baru untuk produk buku/bilyet
DO $$ BEGIN
  CREATE TYPE public.cs_buku_produk AS ENUM (
    'simpeda','simpeda_ib','prama','tabunganku','simpel','alamin','bilyet_giro','bilyet_deposito','buku_cek'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3) Tambah kolom produk + nomor_seri pada cs_buku_tabungan
ALTER TABLE public.cs_buku_tabungan
  ADD COLUMN IF NOT EXISTS produk public.cs_buku_produk,
  ADD COLUMN IF NOT EXISTS nomor_seri text;

-- 4) Tabel cs_si (Standing Instruction)
CREATE TABLE IF NOT EXISTS public.cs_si (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_urut int NOT NULL,
  kode_si text NOT NULL,
  rekening_debet text NOT NULL,
  rekening_kredit text NOT NULL,
  nama_nasabah text,
  nominal numeric NOT NULL DEFAULT 0,
  tanggal_mulai date NOT NULL,
  tanggal_berakhir date,
  status text NOT NULL DEFAULT 'aktif',
  keterangan text,
  user_input text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (kode_si)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.cs_si TO authenticated;
GRANT ALL ON public.cs_si TO service_role;

ALTER TABLE public.cs_si ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cs_si_select" ON public.cs_si FOR SELECT TO authenticated USING (public.can_view_cs());
CREATE POLICY "cs_si_insert" ON public.cs_si FOR INSERT TO authenticated WITH CHECK (public.can_manage_cs());
CREATE POLICY "cs_si_update" ON public.cs_si FOR UPDATE TO authenticated USING (public.can_manage_cs()) WITH CHECK (public.can_manage_cs());
CREATE POLICY "cs_si_delete" ON public.cs_si FOR DELETE TO authenticated USING (public.can_manage_cs());

CREATE TRIGGER cs_si_activity_log
AFTER INSERT OR UPDATE OR DELETE ON public.cs_si
FOR EACH ROW EXECUTE FUNCTION public.log_activity();
