-- Menambahkan kolom untuk melacak kapan terakhir kali sapaan/penyemangat
-- harian ditampilkan ke user (dipakai fitur "sapaan pertama login hari ini").
-- Disimpan per user di tabel profiles (bukan localStorage) supaya konsisten
-- meskipun user login dari device/browser yang berbeda-beda di hari yang sama.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_greeting_date date;

COMMENT ON COLUMN public.profiles.last_greeting_date IS
  'Tanggal terakhir kali sapaan penyemangat harian ditampilkan ke user ini (Asia/Makassar).';
