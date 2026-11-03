-- ============================================================================
--  Laporan Pipeline: kolom tanggal angsuran + rencana pencairan
--  Jalankan sekali di Supabase SQL Editor, SEBELUM deploy Laporan Pipeline.
-- ============================================================================
--
--  1. mlf_data.tglbyrak
--     Tanggal angsuran bulanan tiap debitur, kolom T di sheet
--     Master_Loan_Filter berkas MLF. Selama ini tidak pernah ikut disimpan,
--     jadi kolomnya memang belum ada di database. Dipakai untuk menaruh Run
--     Off di minggu yang benar.
--
--     Baris lama akan bernilai kosong (NULL) dan Laporan Pipeline akan jatuh
--     ke tanggal mulai kredit sebagai perkiraan. Supaya akurat, unggah ulang
--     berkas MLF TERBARU satu kali; unggahan berikutnya otomatis terisi.
--
--  2. proyeksi_kredit.tanggal_rencana & .segmen
--     Supaya rencana pencairan manual bisa jatuh ke minggu tertentu dan
--     langsung masuk ke baris segmen yang benar di laporan.
--
--  Aman dijalankan berulang: semua pakai IF NOT EXISTS.
-- ============================================================================

ALTER TABLE public.mlf_data
  ADD COLUMN IF NOT EXISTS tglbyrak date;

COMMENT ON COLUMN public.mlf_data.tglbyrak IS
  'Tanggal angsuran bulanan (kolom T sheet Master_Loan_Filter). Dipakai Laporan Pipeline untuk menentukan minggu Run Off.';

ALTER TABLE public.proyeksi_kredit
  ADD COLUMN IF NOT EXISTS tanggal_rencana date,
  ADD COLUMN IF NOT EXISTS segmen text;

COMMENT ON COLUMN public.proyeksi_kredit.tanggal_rencana IS
  'Perkiraan tanggal cair; menentukan rencana ini masuk minggu keberapa di Laporan Pipeline.';
COMMENT ON COLUMN public.proyeksi_kredit.segmen IS
  'Kode produk portal: mikro_kur, mikro_non_kur, kecil_kur, kecil_mk, kecil_inv, konsumen_multiguna, konsumen_kpr, konsumen_karyawan.';

-- Index ringan: laporan menyaring rencana berdasarkan tanggal
CREATE INDEX IF NOT EXISTS idx_proyeksi_tanggal_rencana
  ON public.proyeksi_kredit (tanggal_rencana);

-- ----------------------------------------------------------------------------
-- Pemeriksaan — ketiga baris harus muncul
-- ----------------------------------------------------------------------------
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'mlf_data' AND column_name = 'tglbyrak') OR
    (table_name = 'proyeksi_kredit' AND column_name IN ('tanggal_rencana', 'segmen'))
  )
ORDER BY table_name, column_name;
