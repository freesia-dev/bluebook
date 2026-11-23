-- ============================================================================
--  Menu Arsip & Khasanah lengkap: peminjaman, kelengkapan map, serah-terima
--  jaminan, opname/rapikan laci.
--  Jalankan seluruh berkas ini sekaligus di Supabase SQL Editor.
--  Jangan menyorot sebagian teks — yang tersorot saja yang dijalankan.
--  Aman dijalankan berulang. Butuh 2026-11-23_arsip_riwayat_debitur.sql
--  sudah dijalankan lebih dulu.
-- ============================================================================
--
--  Yang ditambahkan:
--
--  1. Tabel arsip_pinjam — satu baris = satu kali map dipinjam. Satu map hanya
--     bisa dipegang satu orang dalam satu waktu (dijaga database). Catatan
--     peminjaman tidak bisa dihapus dari aplikasi, hanya ditutup saat map
--     dikembalikan.
--  2. Kolom di arsip_berkas:
--       kelengkapan      daftar centang isi map (PK, SPPK, KTP, dst.)
--       perlu_telusur    map yang tidak ditemukan saat opname
--       diserahkan_*     serah-terima jaminan ke debitur saat kredit lunas
--  3. Tabel arsip_opname — catatan setiap kali laci dirapikan/di-opname.
--  4. Fungsi arsip_rapikan_laci — menyusun ulang nomor map satu laci sesuai
--     urutan scan (001 = paling belakang), memindahkan map yang ternyata ada
--     di laci ini, dan menandai map yang tidak ditemukan.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Kolom baru di arsip_berkas
-- ----------------------------------------------------------------------------
ALTER TABLE public.arsip_berkas ADD COLUMN IF NOT EXISTS kelengkapan      jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.arsip_berkas ADD COLUMN IF NOT EXISTS perlu_telusur    boolean NOT NULL DEFAULT false;
ALTER TABLE public.arsip_berkas ADD COLUMN IF NOT EXISTS diserahkan_at    timestamptz;
ALTER TABLE public.arsip_berkas ADD COLUMN IF NOT EXISTS diserahkan_kepada text;
ALTER TABLE public.arsip_berkas ADD COLUMN IF NOT EXISTS diserahkan_oleh  uuid REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.arsip_berkas ADD COLUMN IF NOT EXISTS catatan_serah    text;

-- ----------------------------------------------------------------------------
-- 2. Peminjaman
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.arsip_pinjam (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brcd               text NOT NULL DEFAULT '143',
  berkas_id          uuid NOT NULL REFERENCES public.arsip_berkas(id) ON DELETE CASCADE,
  peminjam           text NOT NULL,
  keperluan          text,
  dipinjam_at        timestamptz NOT NULL DEFAULT now(),
  tenggat            date NOT NULL,
  diperpanjang       boolean NOT NULL DEFAULT false,
  kembali_at         timestamptz,
  kondisi            text CHECK (kondisi IS NULL OR kondisi IN ('lengkap', 'kurang')),
  catatan_kembali    text,
  dicatat_oleh       uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  dikembalikan_oleh  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- Satu map, satu pemegang.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_arsip_pinjam_terbuka
  ON public.arsip_pinjam (berkas_id) WHERE kembali_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_arsip_pinjam_waktu ON public.arsip_pinjam (brcd, dipinjam_at DESC);

ALTER TABLE public.arsip_pinjam ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "arsip_pinjam_baca"  ON public.arsip_pinjam;
DROP POLICY IF EXISTS "arsip_pinjam_tulis" ON public.arsip_pinjam;
DROP POLICY IF EXISTS "arsip_pinjam_ubah"  ON public.arsip_pinjam;
CREATE POLICY "arsip_pinjam_baca"  ON public.arsip_pinjam FOR SELECT TO authenticated USING (true);
CREATE POLICY "arsip_pinjam_tulis" ON public.arsip_pinjam FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "arsip_pinjam_ubah"  ON public.arsip_pinjam FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
-- Sengaja TANPA kebijakan DELETE: catatan pinjam tidak bisa dihapus diam-diam.

DROP POLICY IF EXISTS "zz_hanya_user_approved"     ON public.arsip_pinjam;
DROP POLICY IF EXISTS "zz_demo_tidak_boleh_tambah" ON public.arsip_pinjam;
DROP POLICY IF EXISTS "zz_demo_tidak_boleh_ubah"   ON public.arsip_pinjam;
CREATE POLICY "zz_hanya_user_approved" ON public.arsip_pinjam
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_approved_user()) WITH CHECK (public.is_approved_user());
CREATE POLICY "zz_demo_tidak_boleh_tambah" ON public.arsip_pinjam
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_demo_user());
CREATE POLICY "zz_demo_tidak_boleh_ubah" ON public.arsip_pinjam
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_demo_user());

-- ----------------------------------------------------------------------------
-- 3. Catatan opname
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.arsip_opname (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brcd         text NOT NULL DEFAULT '143',
  kode_laci    text NOT NULL,
  jumlah_scan  integer NOT NULL DEFAULT 0,
  cocok        integer NOT NULL DEFAULT 0,
  pindah       integer NOT NULL DEFAULT 0,
  telusur      integer NOT NULL DEFAULT 0,
  rincian      jsonb NOT NULL DEFAULT '{}'::jsonb,
  oleh         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_arsip_opname_laci ON public.arsip_opname (brcd, kode_laci, created_at DESC);

ALTER TABLE public.arsip_opname ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "arsip_opname_baca"  ON public.arsip_opname;
DROP POLICY IF EXISTS "arsip_opname_tulis" ON public.arsip_opname;
CREATE POLICY "arsip_opname_baca"  ON public.arsip_opname FOR SELECT TO authenticated USING (true);
CREATE POLICY "arsip_opname_tulis" ON public.arsip_opname FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "zz_hanya_user_approved"     ON public.arsip_opname;
DROP POLICY IF EXISTS "zz_demo_tidak_boleh_tambah" ON public.arsip_opname;
CREATE POLICY "zz_hanya_user_approved" ON public.arsip_opname
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_approved_user()) WITH CHECK (public.is_approved_user());
CREATE POLICY "zz_demo_tidak_boleh_tambah" ON public.arsip_opname
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_demo_user());

-- ----------------------------------------------------------------------------
-- 4. Rapikan laci sesuai urutan scan
--    p_urutan: id map sesuai urutan fisik, dari BELAKANG ke depan.
--    Berjalan dengan hak pengguna biasa (RLS tetap berlaku).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.arsip_rapikan_laci(
  p_brcd text,
  p_kode_laci text,
  p_urutan uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  r         record;
  i         int := 0;
  n         int := coalesce(array_length(p_urutan, 1), 0);
  v_cocok   int := 0;
  v_pindah  int := 0;
  v_telusur int := 0;
  v_pindahan jsonb := '[]'::jsonb;
  v_hilang   jsonb := '[]'::jsonb;
  v_jenis   text;
  v_unit    text;
BEGIN
  -- jenis & unit laci ini, diambil dari isinya sekarang
  SELECT jenis_laci, unit INTO v_jenis, v_unit
  FROM public.arsip_berkas WHERE brcd = p_brcd AND kode_laci = p_kode_laci
  ORDER BY nomor_urut LIMIT 1;

  -- catat dulu siapa yang pindah dan siapa yang hilang
  FOR r IN
    SELECT b.id, b.kode_laci, b.nomor_urut, b.nama_debitur, (b.id = ANY(p_urutan)) AS discan,
           EXISTS (SELECT 1 FROM public.arsip_pinjam p WHERE p.berkas_id = b.id AND p.kembali_at IS NULL) AS dipinjam,
           (b.diserahkan_at IS NOT NULL) AS keluar
    FROM public.arsip_berkas b
    WHERE b.brcd = p_brcd AND (b.kode_laci = p_kode_laci OR b.id = ANY(p_urutan))
  LOOP
    IF r.discan AND r.kode_laci = p_kode_laci THEN
      v_cocok := v_cocok + 1;
    ELSIF r.discan THEN
      v_pindah := v_pindah + 1;
      v_pindahan := v_pindahan || jsonb_build_object('id', r.id, 'nama', r.nama_debitur, 'dari', r.kode_laci);
    ELSIF r.dipinjam OR r.keluar THEN
      NULL;  -- sedang dipinjam / sudah diserahkan: memang tidak ada di laci
    ELSE
      v_telusur := v_telusur + 1;
      v_hilang := v_hilang || jsonb_build_object('id', r.id, 'nama', r.nama_debitur, 'nomor', r.nomor_urut);
    END IF;
  END LOOP;

  -- langkah 1: nomor sementara negatif, supaya tidak bentrok "satu posisi satu map"
  FOR r IN
    SELECT b.id FROM public.arsip_berkas b
    WHERE b.brcd = p_brcd AND (b.kode_laci = p_kode_laci OR b.id = ANY(p_urutan))
    ORDER BY b.kode_laci, b.nomor_urut
  LOOP
    i := i + 1;
    UPDATE public.arsip_berkas SET nomor_urut = -i WHERE id = r.id;
  END LOOP;

  -- langkah 2: map yang discan, sesuai urutan scan
  FOR i IN 1..n LOOP
    UPDATE public.arsip_berkas
    SET kode_laci = p_kode_laci,
        nomor_urut = i,
        perlu_telusur = false,
        jenis_laci = coalesce(v_jenis, jenis_laci),
        unit = coalesce(v_unit, unit)
    WHERE id = p_urutan[i] AND brcd = p_brcd;
  END LOOP;

  -- langkah 3: map yang tidak ikut discan tetap tercatat di laci ini, di ujung
  -- depan. Yang sedang dipinjam atau sudah diserahkan tidak dianggap hilang;
  -- sisanya ditandai perlu ditelusuri.
  i := n;
  FOR r IN
    SELECT b.id,
           (EXISTS (SELECT 1 FROM public.arsip_pinjam p WHERE p.berkas_id = b.id AND p.kembali_at IS NULL)
             OR b.diserahkan_at IS NOT NULL) AS wajar
    FROM public.arsip_berkas b
    WHERE b.brcd = p_brcd AND b.kode_laci = p_kode_laci AND b.nomor_urut < 0
    ORDER BY b.nomor_urut DESC
  LOOP
    i := i + 1;
    UPDATE public.arsip_berkas SET nomor_urut = i, perlu_telusur = NOT r.wajar WHERE id = r.id;
  END LOOP;

  -- Semua map yang discan sudah diberi nomor di langkah 2; pastikan tidak ada sisa.
  IF EXISTS (SELECT 1 FROM public.arsip_berkas WHERE brcd = p_brcd AND nomor_urut < 0) THEN
    RAISE EXCEPTION 'nomor urut tidak lengkap, dibatalkan';
  END IF;

  INSERT INTO public.arsip_opname (brcd, kode_laci, jumlah_scan, cocok, pindah, telusur, rincian, oleh)
  VALUES (p_brcd, p_kode_laci, n, v_cocok, v_pindah, v_telusur,
          jsonb_build_object('pindahan', v_pindahan, 'telusur', v_hilang), auth.uid());

  RETURN jsonb_build_object('jumlah_scan', n, 'cocok', v_cocok, 'pindah', v_pindah,
                            'telusur', v_telusur, 'pindahan', v_pindahan, 'hilang', v_hilang);
END;
$$;

GRANT EXECUTE ON FUNCTION public.arsip_rapikan_laci(text, text, uuid[]) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;


-- ----------------------------------------------------------------------------
-- Periksa hasilnya (hanya membaca)
-- ----------------------------------------------------------------------------
SELECT (SELECT count(*) FROM public.arsip_berkas) AS jumlah_map,
       (SELECT count(*) FROM public.arsip_pinjam) AS jumlah_pinjam,
       (SELECT count(*) FROM public.arsip_opname) AS jumlah_opname,
       EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'arsip_rapikan_laci') AS fungsi_rapikan_ada;
