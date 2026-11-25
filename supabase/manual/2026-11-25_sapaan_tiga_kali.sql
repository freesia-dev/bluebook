-- ============================================================================
--  Sapaan tiga kali sehari (pagi, siang, sore)
--  Jalankan seluruh berkas ini sekaligus di Supabase SQL Editor.
--  Aman dijalankan berulang.
-- ============================================================================
--  Dulu sapaan dilacak per hari lewat profiles.last_greeting_date. Sekarang
--  sapaan muncul di tiga waktu, jadi dicatat juga waktunya, contoh
--  "2026-11-25|siang". Sebelum kolom ini ada, aplikasi tetap jalan dengan cara
--  lama (sekali sehari).
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_greeting_slot text;

COMMENT ON COLUMN public.profiles.last_greeting_slot IS
  'Sapaan terakhir yang sudah ditampilkan: "YYYY-MM-DD|pagi|siang|sore".';

NOTIFY pgrst, 'reload schema';

SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name LIKE 'last_greeting%';
