-- Susunan dashboard pribadi tiap user (fitur "Atur dashboard").
-- Disimpan di profiles supaya ikut pindah device/browser.
-- Format: { "<halaman>": { "v": 1, "items": [{ "id": "...", "size": "s|m|l", "hidden": false }] } }
-- Aman kalau belum dijalankan: aplikasi otomatis pakai penyimpanan lokal browser.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS dashboard_layout jsonb;

COMMENT ON COLUMN public.profiles.dashboard_layout IS
  'Susunan widget dashboard pribadi per halaman (urutan, ukuran, disembunyikan).';
