-- =============================================================================
--  PENGETATAN ATURAN AKSES DATABASE (RLS) — Bluebook Telihan
--  Dibuat: 22 Sep 2026
--
--  ⚠️  JANGAN dijalankan sebelum dibaca. File ini SENGAJA tidak ada di folder
--      supabase/migrations supaya tidak terjalankan otomatis.
--
--  Cara pakai (Supabase → SQL Editor), jalankan PER BAGIAN, lalu tes aplikasi:
--    Bagian 1  → wajib, aman, menutup celah yang bisa diakses TANPA login.
--    Bagian 2  → sangat disarankan: akun yang belum di-approve admin dan akun
--                demo tidak bisa membaca/mengubah data lewat API.
--    Bagian 3  → cara membatalkan (rollback) kalau ada masalah.
--
--  Setelah tiap bagian: login pakai akun biasa, admin, dan demo; buka Dashboard,
--  Surat Masuk, Agenda Kredit, Simulasi, ATM, Monitoring. Semua harus normal.
-- =============================================================================


-- =============================================================================
--  BAGIAN 1 — Tutup akses tanpa login
-- =============================================================================
BEGIN;

-- 1a. asal_instansi: sebelumnya SIAPA PUN (tanpa login) bisa baca/tambah/ubah/hapus.
DROP POLICY IF EXISTS "Anyone can read asal_instansi"   ON public.asal_instansi;
DROP POLICY IF EXISTS "Anyone can insert asal_instansi" ON public.asal_instansi;
DROP POLICY IF EXISTS "Anyone can update asal_instansi" ON public.asal_instansi;
DROP POLICY IF EXISTS "Anyone can delete asal_instansi" ON public.asal_instansi;

CREATE POLICY "Authenticated can read asal_instansi"
  ON public.asal_instansi FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert asal_instansi"
  ON public.asal_instansi FOR INSERT TO authenticated WITH CHECK (NOT public.is_demo_user());
CREATE POLICY "Authenticated can update asal_instansi"
  ON public.asal_instansi FOR UPDATE TO authenticated USING (NOT public.is_demo_user());
CREATE POLICY "Admins can delete asal_instansi"
  ON public.asal_instansi FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 1b. Lima tabel ini namanya "Authenticated can insert/update", tapi policy-nya
--     tidak punya "TO authenticated" → berlaku juga untuk pengunjung TANPA login.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['kartu_tertelan','nomor_loan','pengisian_atm','penyelesaian_selisih','selisih_atm'] LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated can insert ' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'Authenticated can update ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (true)', 'Authenticated can insert ' || t, t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (true)', 'Authenticated can update ' || t, t);
  END LOOP;
END $$;

COMMIT;


-- =============================================================================
--  BAGIAN 2 — Akun belum di-approve & akun demo
--
--  Masalah: pendaftaran akun terbuka. Akun baru berstatus "pending" sudah
--  dianggap "authenticated" oleh database, jadi walaupun di aplikasi dia cuma
--  melihat layar "menunggu persetujuan", lewat API dia sudah bisa membaca
--  hampir semua tabel. Akun demo juga seharusnya hanya-baca.
--
--  Solusi: policy RESTRICTIVE (menjadi syarat TAMBAHAN di atas policy yang
--  sudah ada, tidak menggantikannya):
--    • semua akses data wajib dari akun berstatus 'approved'
--    • akun demo tidak boleh tambah/ubah/hapus
--  Dikecualikan: profiles, user_roles (dibutuhkan untuk cek status login),
--  app_setting (konfigurasi tampilan).
-- =============================================================================
BEGIN;

CREATE OR REPLACE FUNCTION public.is_approved_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND status = 'approved'
  );
$$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relrowsecurity
      AND c.relname NOT IN ('profiles', 'user_roles', 'app_setting')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'zz_hanya_user_approved', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.is_approved_user()) WITH CHECK (public.is_approved_user())',
      'zz_hanya_user_approved', t);

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'zz_demo_tidak_boleh_tambah', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'zz_demo_tidak_boleh_ubah', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'zz_demo_tidak_boleh_hapus', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_demo_user())', 'zz_demo_tidak_boleh_tambah', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_demo_user())', 'zz_demo_tidak_boleh_ubah', t);
    EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.is_demo_user())', 'zz_demo_tidak_boleh_hapus', t);
  END LOOP;
END $$;

COMMIT;


-- =============================================================================
--  BAGIAN 3 — ROLLBACK (jalankan HANYA kalau Bagian 2 bikin masalah)
-- =============================================================================
-- DO $$
-- DECLARE r record;
-- BEGIN
--   FOR r IN
--     SELECT tablename, policyname FROM pg_policies
--     WHERE schemaname = 'public' AND policyname LIKE 'zz\_%'
--   LOOP
--     EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
--   END LOOP;
-- END $$;
