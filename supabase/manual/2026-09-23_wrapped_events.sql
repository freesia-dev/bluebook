-- ============================================================================
-- Bluebook — tabel kejadian ringan untuk "Bluebook Wrapped"
-- Dijalankan manual di SQL Editor Supabase (bukan migrasi otomatis).
-- Tanggal: 23 September 2026
--
-- Kenapa perlu tabel baru?
--   Sebagian besar angka Wrapped bisa dihitung dari yang sudah ada: activity_log
--   (siapa menambah/mengubah apa dan kapan), loan_simulation, surat_masuk, dan
--   seterusnya. Yang TIDAK terekam di mana pun cuma dua hal:
--     1. berapa kali Ctrl+K dipakai,
--     2. hari-hari apa saja seseorang membuka Bluebook (untuk "runtutan hari").
--   Dua hal itu yang dicatat di sini — satu baris kecil per kejadian, tanpa data
--   nasabah sama sekali.
--
-- Aman dijalankan berulang (IF NOT EXISTS / DROP POLICY IF EXISTS).
-- Rollback ada di bagian paling bawah (masih dikomentari).
-- ============================================================================

-- ── 1. Tabel ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.app_event (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  user_nama  text,
  -- 'buka_harian' | 'command_palette' | 'simulasi_simpan' | 'export' | ...
  jenis      text NOT NULL,
  -- Keterangan tambahan yang TIDAK mengandung data nasabah (mis. {"halaman":"/dashboard"})
  meta       jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.app_event IS
  'Kejadian pemakaian aplikasi (bukan data nasabah) untuk Bluebook Wrapped & statistik pemakaian.';

CREATE INDEX IF NOT EXISTS app_event_user_waktu_idx ON public.app_event (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS app_event_jenis_waktu_idx ON public.app_event (jenis, created_at DESC);

-- ── 2. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.app_event ENABLE ROW LEVEL SECURITY;

-- Hanya user yang sudah disetujui, dan hanya boleh menulis atas nama dirinya.
DROP POLICY IF EXISTS "app_event: tulis kejadian sendiri" ON public.app_event;
CREATE POLICY "app_event: tulis kejadian sendiri"
  ON public.app_event FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_approved_user());

-- Baca: kejadian sendiri; admin boleh semua (untuk Wrapped tingkat kantor).
DROP POLICY IF EXISTS "app_event: baca kejadian sendiri" ON public.app_event;
CREATE POLICY "app_event: baca kejadian sendiri"
  ON public.app_event FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Tidak ada policy UPDATE/DELETE: catatan kejadian memang tidak boleh diubah.
-- Admin tetap bisa membersihkan lewat SQL Editor kalau perlu.

-- ── 3. Pembersih otomatis (opsional) ────────────────────────────────────────
-- Wrapped hanya butuh data tahun berjalan. Jalankan sesekali kalau tabelnya
-- sudah besar, atau pasang di pg_cron kalau nanti diaktifkan:
--   DELETE FROM public.app_event WHERE created_at < now() - interval '2 years';

-- ── 4. Rollback (buka komentar kalau mau dibatalkan) ────────────────────────
-- DROP TABLE IF EXISTS public.app_event;
