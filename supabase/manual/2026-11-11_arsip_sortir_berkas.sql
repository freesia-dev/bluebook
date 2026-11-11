-- ============================================================================
--  Menu Sortir Berkas — tabel penyimpan hasil pemetaan + pencarian dari MLF
--  Jalankan seluruh berkas ini sekaligus di Supabase SQL Editor.
--  Jangan menyorot sebagian teks — yang tersorot saja yang dijalankan.
--  Aman dijalankan berulang.
-- ============================================================================
--
--  Dua hal yang dibuat di sini:
--
--  1. Tabel public.arsip_berkas — tempat hasil sortir disimpan. Satu baris =
--     satu map fisik = satu akad/PK, dengan kode laci dan nomor urutnya.
--     Tabel ini bukan tabel sementara: menu arsip yang lengkap nanti memakai
--     tabel yang sama, jadi pekerjaan menyortir hari ini tidak terbuang.
--
--  2. Fungsi public.arsip_master() — daftar seluruh rekening kredit yang
--     pernah terlihat di MLF cabang ini, satu baris per rekening, lengkap
--     dengan statusnya: masih 'aktif' kalau ia ada di unggahan MLF terakhir,
--     atau 'lunas' kalau ia pernah ada lalu hilang. Aplikasi mengunduh daftar
--     ini sekali lalu mencarinya di HP, jadi mengetik nama terasa seketika
--     dan tidak menunggu jaringan tiap huruf.
--
--  Fungsinya SECURITY DEFINER dengan satu pemeriksaan izin di awal — alasannya
--  sama persis dengan mlf_arrears: kebijakan RLS zz_hanya_user_approved
--  memanggil is_approved_user() untuk SETIAP baris, dan pada tabel mlf_data
--  yang ratusan ribu baris itu menghabiskan jatah waktu PostgREST. Hak akses
--  tidak berubah — pengguna yang belum approved tetap tidak mendapat apa pun.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Tabel hasil sortir
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.arsip_berkas (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brcd          text NOT NULL DEFAULT '143',

  -- lokasi fisik
  kode_laci     text NOT NULL,            -- B3.2 (berkas) atau J1.3 (khasanah)
  nomor_urut    integer NOT NULL,         -- urutan map dari depan laci
  jenis_laci    text NOT NULL DEFAULT 'produktif'
                CHECK (jenis_laci IN ('produktif', 'konsumtif', 'jaminan')),

  -- identitas berkas (satu map = satu akad)
  nama_debitur  text NOT NULL,
  nomor_pk      text,
  no_rekening   text,                     -- l0lnno di MLF; pengikat paling pasti
  tanggal_akad  date,
  jatuh_tempo   date,
  plafon        numeric,
  jenis_kredit  text,                     -- group2 di MLF

  -- hasil pencocokan saat disortir
  status_kredit text NOT NULL DEFAULT 'tidak_dikenali'
                CHECK (status_kredit IN ('aktif', 'lunas', 'tidak_dikenali')),
  sumber        text NOT NULL DEFAULT 'mlf'
                CHECK (sumber IN ('mlf', 'manual')),
  catatan       text,

  dicatat_oleh  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Satu posisi hanya boleh dipakai satu map.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_arsip_posisi
  ON public.arsip_berkas (brcd, kode_laci, nomor_urut);

-- Satu rekening hanya boleh tercatat di satu tempat (map ganda akan ketahuan).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_arsip_rekening
  ON public.arsip_berkas (brcd, no_rekening)
  WHERE no_rekening IS NOT NULL AND no_rekening <> '';

CREATE INDEX IF NOT EXISTS idx_arsip_laci ON public.arsip_berkas (brcd, kode_laci, nomor_urut);
CREATE INDEX IF NOT EXISTS idx_arsip_nama ON public.arsip_berkas (brcd, nama_debitur);

-- updated_at ikut berubah sendiri
CREATE OR REPLACE FUNCTION public.sentuh_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_arsip_berkas_updated ON public.arsip_berkas;
CREATE TRIGGER trg_arsip_berkas_updated
  BEFORE UPDATE ON public.arsip_berkas
  FOR EACH ROW EXECUTE FUNCTION public.sentuh_updated_at();

-- ----------------------------------------------------------------------------
-- 2. Izin akses — mengikuti pola tabel lain di Bluebook
-- ----------------------------------------------------------------------------
ALTER TABLE public.arsip_berkas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arsip_berkas_baca"  ON public.arsip_berkas;
DROP POLICY IF EXISTS "arsip_berkas_tulis" ON public.arsip_berkas;
DROP POLICY IF EXISTS "arsip_berkas_ubah"  ON public.arsip_berkas;
DROP POLICY IF EXISTS "arsip_berkas_hapus" ON public.arsip_berkas;

CREATE POLICY "arsip_berkas_baca"  ON public.arsip_berkas FOR SELECT TO authenticated USING (true);
CREATE POLICY "arsip_berkas_tulis" ON public.arsip_berkas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "arsip_berkas_ubah"  ON public.arsip_berkas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "arsip_berkas_hapus" ON public.arsip_berkas FOR DELETE TO authenticated USING (true);

-- Kebijakan pembatas yang sama dengan tabel lain: hanya pengguna approved,
-- dan akun demo tidak boleh mengubah apa pun.
DROP POLICY IF EXISTS "zz_hanya_user_approved"      ON public.arsip_berkas;
DROP POLICY IF EXISTS "zz_demo_tidak_boleh_tambah"  ON public.arsip_berkas;
DROP POLICY IF EXISTS "zz_demo_tidak_boleh_ubah"    ON public.arsip_berkas;
DROP POLICY IF EXISTS "zz_demo_tidak_boleh_hapus"   ON public.arsip_berkas;

CREATE POLICY "zz_hanya_user_approved" ON public.arsip_berkas
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_approved_user()) WITH CHECK (public.is_approved_user());
CREATE POLICY "zz_demo_tidak_boleh_tambah" ON public.arsip_berkas
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_demo_user());
CREATE POLICY "zz_demo_tidak_boleh_ubah" ON public.arsip_berkas
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_demo_user());
CREATE POLICY "zz_demo_tidak_boleh_hapus" ON public.arsip_berkas
  AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.is_demo_user());

COMMIT;


-- ============================================================================
-- 3. Daftar induk rekening untuk pencocokan
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_mlf_data_brcd_jobdate
  ON public.mlf_data (brcd, jobdate);

CREATE OR REPLACE FUNCTION public.arsip_master(p_brcd text DEFAULT '143')
RETURNS TABLE (
  no_rekening   text,
  nama_debitur  text,
  nomor_pk      text,
  tanggal_akad  date,
  jatuh_tempo   date,
  plafon        numeric,
  baki          numeric,
  kol           integer,
  jenis_kredit  text,
  produk        text,
  status        text,          -- 'aktif' | 'lunas'
  terakhir_lihat date          -- jobdate terakhir rekening ini muncul di MLF
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jd_terakhir date;
BEGIN
  -- Satu pemeriksaan izin, bukan satu per baris.
  IF NOT public.is_approved_user() THEN
    RAISE EXCEPTION 'tidak berwenang';
  END IF;

  SELECT max(m.jobdate) INTO jd_terakhir
  FROM public.mlf_data m
  WHERE m.brcd = p_brcd;

  IF jd_terakhir IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH ringkas AS (
    SELECT
      m.l0lnno                                                   AS rek,
      max(m.jobdate)                                             AS jd_akhir,
      (array_agg(m.l0name  ORDER BY m.jobdate DESC))[1]          AS nama,
      (array_agg(m.l0narr  ORDER BY m.jobdate DESC))[1]          AS pk,
      (array_agg(m.date    ORDER BY m.jobdate DESC))[1]          AS akad,
      (array_agg(m.date1   ORDER BY m.jobdate DESC))[1]          AS tempo,
      (array_agg(m.pla     ORDER BY m.jobdate DESC))[1]          AS pla,
      (array_agg(m.baki    ORDER BY m.jobdate DESC))[1]          AS bak,
      (array_agg(m.kol     ORDER BY m.jobdate DESC))[1]          AS kolek,
      (array_agg(m.group2  ORDER BY m.jobdate DESC))[1]          AS gol,
      (array_agg(m.lytitl  ORDER BY m.jobdate DESC))[1]          AS prd
    FROM public.mlf_data m
    WHERE m.brcd = p_brcd
      AND m.l0lnno IS NOT NULL
      AND m.l0lnno <> ''
    GROUP BY m.l0lnno
  )
  SELECT
    r.rek,
    r.nama,
    r.pk,
    r.akad::date,
    r.tempo::date,
    r.pla,
    r.bak,
    r.kolek::integer,
    r.gol,
    r.prd,
    CASE WHEN r.jd_akhir = jd_terakhir THEN 'aktif' ELSE 'lunas' END,
    r.jd_akhir::date
  FROM ringkas r
  ORDER BY r.akad NULLS LAST, r.nama;
END;
$$;

GRANT EXECUTE ON FUNCTION public.arsip_master(text) TO authenticated;


-- ----------------------------------------------------------------------------
-- Periksa hasilnya
-- ----------------------------------------------------------------------------
SELECT status, count(*) AS jumlah
FROM public.arsip_master('143')
GROUP BY status
ORDER BY status;
