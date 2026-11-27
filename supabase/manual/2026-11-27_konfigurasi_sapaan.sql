-- ============================================================================
--  Konfigurasi Layar Sapaan + tombol reset sapaan per pengguna
--  Jalankan seluruh berkas ini sekaligus di Supabase SQL Editor.
--  Aman dijalankan berulang.
-- ============================================================================
--  1. Pastikan kolom last_greeting_slot ada (kalau SQL 2026-11-25 belum
--     sempat dijalankan).
--  2. Fungsi reset_sapaan(p_user_id):
--       - admin boleh me-reset siapa saja, atau semua akun (p_user_id = NULL)
--       - pengguna biasa hanya boleh me-reset dirinya sendiri
--     Setelah di-reset, sapaan waktu yang sedang berjalan muncul lagi saat
--     Bluebook dibuka/diaktifkan kembali (dicek tiap 5 menit).
--  Pengaturan tampilannya sendiri disimpan di tabel app_setting
--  (key = 'sapaan_config') yang sudah ada — tidak perlu tabel baru.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_greeting_slot text;

CREATE OR REPLACE FUNCTION public.reset_sapaan(p_user_id uuid DEFAULT NULL)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_admin boolean := public.has_role(auth.uid(), 'admin');
  v_jumlah integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Harus login';
  END IF;
  IF NOT v_admin AND (p_user_id IS NULL OR p_user_id <> auth.uid()) THEN
    RAISE EXCEPTION 'Hanya admin yang boleh me-reset sapaan pengguna lain';
  END IF;

  UPDATE public.profiles
     SET last_greeting_slot = NULL,
         last_greeting_date = NULL
   WHERE p_user_id IS NULL OR user_id = p_user_id;
  GET DIAGNOSTICS v_jumlah = ROW_COUNT;
  RETURN v_jumlah;
END;
$$;

REVOKE ALL ON FUNCTION public.reset_sapaan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reset_sapaan(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';

-- Cek: harus muncul satu baris reset_sapaan
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'reset_sapaan';
