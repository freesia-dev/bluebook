-- ============================================================================
--  Arsip: kode map permanen, unit laci, dan riwayat debitur
--  Jalankan seluruh berkas ini sekaligus di Supabase SQL Editor.
--  Jangan menyorot sebagian teks — yang tersorot saja yang dijalankan.
--  Aman dijalankan berulang, dan tidak menghapus map yang sudah disortir.
-- ============================================================================
--
--  Yang ditambahkan:
--
--  1. Kode map permanen (BB-M-xxxxxx) untuk setiap map. Kode ini yang nanti
--     dicetak jadi QR di sampul map. Kodenya acak dan tidak pernah berubah,
--     meskipun mapnya pindah laci atau nomor urutnya bergeser. Map yang sudah
--     disortir langsung diberi kode.
--
--  2. Unit (Telihan / Meranti) per map. Berkas Meranti disimpan di laci
--     sendiri, jadi unit ditentukan per laci di layar Sortir Berkas.
--
--  3. Tabel arsip_debitur, yang menyatukan semua map milik satu orang. Map
--     lunas lama (termasuk yang tidak ada di MLF karena sebelum 2026) bisa
--     disambungkan ke debitur yang kreditnya masih aktif, sehingga riwayatnya
--     terbaca dari akad pertama sampai sekarang. Map yang sudah disortir
--     dikelompokkan otomatis menurut nama, dan masih bisa dipisah atau
--     dipindah dari layar riwayat.
--
--  4. Fungsi arsip_balik_urutan, untuk laci yang terlanjur dinomori dari
--     depan. Mulai sekarang nomor 001 = map paling BELAKANG laci.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 0. Pembuat kode acak: 6 huruf/angka tanpa yang mirip (0/O, 1/I)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.arsip_kode_acak(p_awalan text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path = public
AS $$
DECLARE
  huruf constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  hasil text;
  i int;
BEGIN
  LOOP
    hasil := p_awalan;
    FOR i IN 1..6 LOOP
      hasil := hasil || substr(huruf, 1 + floor(random() * length(huruf))::int, 1);
    END LOOP;
    -- pastikan belum pernah dipakai di kedua tabel
    IF NOT EXISTS (SELECT 1 FROM public.arsip_berkas WHERE kode_map = hasil)
       AND NOT EXISTS (SELECT 1 FROM public.arsip_debitur WHERE kode = hasil) THEN
      RETURN hasil;
    END IF;
  END LOOP;
END;
$$;

-- Nama dibandingkan tanpa gelar, tanda baca, dan spasi ganda.
-- Harus sama persis dengan samakanNama() di src/hooks/use-arsip.ts.
CREATE OR REPLACE FUNCTION public.arsip_kunci_nama(p_nama text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT btrim(regexp_replace(
           regexp_replace(
             regexp_replace(upper(coalesce(p_nama, '')), '[^A-Z0-9 ]', ' ', 'g'),
             '\m(H|HJ|HAJI|IR|DRS|DRA|S\s?E|S\s?T|S\s?H|M\s?M|S\s?PD|A\s?MD)\M', ' ', 'g'),
           '\s+', ' ', 'g'))
$$;

-- ----------------------------------------------------------------------------
-- 1. Tabel debitur
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.arsip_debitur (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brcd         text NOT NULL DEFAULT '143',
  kode         text,                       -- BB-D-xxxxxx, permanen
  nama         text NOT NULL,
  nama_kunci   text NOT NULL,              -- arsip_kunci_nama(nama)
  nik          text,
  catatan      text,
  dibuat_oleh  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_arsip_debitur_kode ON public.arsip_debitur (kode);
CREATE INDEX IF NOT EXISTS idx_arsip_debitur_kunci ON public.arsip_debitur (brcd, nama_kunci);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_arsip_debitur_nik
  ON public.arsip_debitur (brcd, nik) WHERE nik IS NOT NULL AND nik <> '';

-- ----------------------------------------------------------------------------
-- 2. Kolom baru di arsip_berkas
-- ----------------------------------------------------------------------------
ALTER TABLE public.arsip_berkas ADD COLUMN IF NOT EXISTS kode_map   text;
ALTER TABLE public.arsip_berkas ADD COLUMN IF NOT EXISTS unit       text NOT NULL DEFAULT 'telihan';
ALTER TABLE public.arsip_berkas ADD COLUMN IF NOT EXISTS debitur_id uuid
  REFERENCES public.arsip_debitur(id) ON DELETE SET NULL;

ALTER TABLE public.arsip_berkas DROP CONSTRAINT IF EXISTS arsip_berkas_unit_check;
ALTER TABLE public.arsip_berkas ADD CONSTRAINT arsip_berkas_unit_check CHECK (unit IN ('telihan', 'meranti'));

CREATE UNIQUE INDEX IF NOT EXISTS uniq_arsip_kode_map ON public.arsip_berkas (kode_map);
CREATE INDEX IF NOT EXISTS idx_arsip_berkas_debitur ON public.arsip_berkas (debitur_id);

COMMENT ON COLUMN public.arsip_berkas.nomor_urut IS 'Urutan map di laci: 1 = paling belakang, naik ke arah depan.';
COMMENT ON COLUMN public.arsip_berkas.kode_map   IS 'Kode permanen map (BB-M-xxxxxx), isi QR di sampul map.';

-- Kode diberikan otomatis saat map/debitur baru dicatat.
CREATE OR REPLACE FUNCTION public.arsip_isi_kode()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'arsip_berkas' THEN
    IF NEW.kode_map IS NULL OR NEW.kode_map = '' THEN
      NEW.kode_map := public.arsip_kode_acak('BB-M-');
    END IF;
  ELSE
    IF NEW.kode IS NULL OR NEW.kode = '' THEN
      NEW.kode := public.arsip_kode_acak('BB-D-');
    END IF;
    NEW.nama_kunci := public.arsip_kunci_nama(NEW.nama);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_arsip_berkas_kode ON public.arsip_berkas;
CREATE TRIGGER trg_arsip_berkas_kode
  BEFORE INSERT OR UPDATE ON public.arsip_berkas
  FOR EACH ROW EXECUTE FUNCTION public.arsip_isi_kode();

DROP TRIGGER IF EXISTS trg_arsip_debitur_kode ON public.arsip_debitur;
CREATE TRIGGER trg_arsip_debitur_kode
  BEFORE INSERT OR UPDATE ON public.arsip_debitur
  FOR EACH ROW EXECUTE FUNCTION public.arsip_isi_kode();

DROP TRIGGER IF EXISTS trg_arsip_debitur_updated ON public.arsip_debitur;
CREATE TRIGGER trg_arsip_debitur_updated
  BEFORE UPDATE ON public.arsip_debitur
  FOR EACH ROW EXECUTE FUNCTION public.sentuh_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Isi data lama: kode map, lalu debitur per nama
-- ----------------------------------------------------------------------------
UPDATE public.arsip_berkas SET kode_map = NULL WHERE kode_map = '';
UPDATE public.arsip_berkas SET kode_map = public.arsip_kode_acak('BB-M-') WHERE kode_map IS NULL;

INSERT INTO public.arsip_debitur (brcd, nama, nama_kunci)
SELECT DISTINCT ON (b.brcd, public.arsip_kunci_nama(b.nama_debitur))
       b.brcd, b.nama_debitur, public.arsip_kunci_nama(b.nama_debitur)
FROM public.arsip_berkas b
WHERE b.debitur_id IS NULL
  AND public.arsip_kunci_nama(b.nama_debitur) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.arsip_debitur d
    WHERE d.brcd = b.brcd AND d.nama_kunci = public.arsip_kunci_nama(b.nama_debitur)
  )
ORDER BY b.brcd, public.arsip_kunci_nama(b.nama_debitur), b.created_at;

UPDATE public.arsip_berkas b
SET debitur_id = d.id
FROM public.arsip_debitur d
WHERE b.debitur_id IS NULL
  AND d.brcd = b.brcd
  AND d.nama_kunci = public.arsip_kunci_nama(b.nama_debitur)
  AND d.id = (SELECT d2.id FROM public.arsip_debitur d2
              WHERE d2.brcd = b.brcd AND d2.nama_kunci = d.nama_kunci
              ORDER BY d2.created_at LIMIT 1);

ALTER TABLE public.arsip_berkas ALTER COLUMN kode_map SET NOT NULL;

-- ----------------------------------------------------------------------------
-- 4. Izin akses arsip_debitur — sama dengan arsip_berkas
-- ----------------------------------------------------------------------------
ALTER TABLE public.arsip_debitur ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "arsip_debitur_baca"  ON public.arsip_debitur;
DROP POLICY IF EXISTS "arsip_debitur_tulis" ON public.arsip_debitur;
DROP POLICY IF EXISTS "arsip_debitur_ubah"  ON public.arsip_debitur;
DROP POLICY IF EXISTS "arsip_debitur_hapus" ON public.arsip_debitur;
CREATE POLICY "arsip_debitur_baca"  ON public.arsip_debitur FOR SELECT TO authenticated USING (true);
CREATE POLICY "arsip_debitur_tulis" ON public.arsip_debitur FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "arsip_debitur_ubah"  ON public.arsip_debitur FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "arsip_debitur_hapus" ON public.arsip_debitur FOR DELETE TO authenticated USING (true);

DROP POLICY IF EXISTS "zz_hanya_user_approved"     ON public.arsip_debitur;
DROP POLICY IF EXISTS "zz_demo_tidak_boleh_tambah" ON public.arsip_debitur;
DROP POLICY IF EXISTS "zz_demo_tidak_boleh_ubah"   ON public.arsip_debitur;
DROP POLICY IF EXISTS "zz_demo_tidak_boleh_hapus"  ON public.arsip_debitur;
CREATE POLICY "zz_hanya_user_approved" ON public.arsip_debitur
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.is_approved_user()) WITH CHECK (public.is_approved_user());
CREATE POLICY "zz_demo_tidak_boleh_tambah" ON public.arsip_debitur
  AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_demo_user());
CREATE POLICY "zz_demo_tidak_boleh_ubah" ON public.arsip_debitur
  AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_demo_user());
CREATE POLICY "zz_demo_tidak_boleh_hapus" ON public.arsip_debitur
  AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.is_demo_user());

-- ----------------------------------------------------------------------------
-- 5. Balik urutan satu laci (untuk laci yang terlanjur dinomori dari depan)
--    Berjalan dengan hak pengguna biasa (RLS tetap berlaku).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.arsip_balik_urutan(p_brcd text, p_kode_laci text)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  terbesar int;
  jumlah   int;
BEGIN
  SELECT max(nomor_urut), count(*) INTO terbesar, jumlah
  FROM public.arsip_berkas
  WHERE brcd = p_brcd AND kode_laci = p_kode_laci;

  IF jumlah IS NULL OR jumlah = 0 THEN
    RETURN 0;
  END IF;

  -- Dua langkah supaya tidak bentrok dengan aturan "satu posisi satu map":
  -- jadikan negatif dulu, lalu balik ke angka positif yang baru.
  UPDATE public.arsip_berkas SET nomor_urut = -nomor_urut
  WHERE brcd = p_brcd AND kode_laci = p_kode_laci;

  UPDATE public.arsip_berkas SET nomor_urut = terbesar + 1 + nomor_urut
  WHERE brcd = p_brcd AND kode_laci = p_kode_laci;

  RETURN jumlah;
END;
$$;

GRANT EXECUTE ON FUNCTION public.arsip_balik_urutan(text, text) TO authenticated;

NOTIFY pgrst, 'reload schema';

COMMIT;


-- ----------------------------------------------------------------------------
-- Periksa hasilnya (hanya membaca, tidak bisa menggagalkan yang di atas)
-- ----------------------------------------------------------------------------
SELECT count(*)                                  AS jumlah_map,
       count(*) FILTER (WHERE kode_map IS NOT NULL)   AS sudah_berkode,
       count(*) FILTER (WHERE debitur_id IS NOT NULL) AS sudah_bertaut_debitur,
       (SELECT count(*) FROM public.arsip_debitur)    AS jumlah_debitur
FROM public.arsip_berkas;
