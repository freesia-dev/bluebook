-- ============================================================================
--  Susulan: 4 kolom cap Tier 4 yang terlewat
--  Jalankan sekali di Supabase SQL Editor.
-- ============================================================================
--
--  Tier 4 (plafon di atas batas Tier 3) tidak punya kolom plafon_tier_4_max,
--  hanya kolom cap-nya, jadi ikut terlewat waktu daftar kolom disusun.
--  Skrip ini melengkapinya. Nilai lama tetap utuh, aman dijalankan berulang.
-- ============================================================================

ALTER TABLE public.cerdas_config
  ALTER COLUMN cap_tier_4_baru     TYPE numeric(18,2) USING cap_tier_4_baru::numeric(18,2),
  ALTER COLUMN cap_tier_4_takeover TYPE numeric(18,2) USING cap_tier_4_takeover::numeric(18,2);

ALTER TABLE public.loan_promo_program
  ALTER COLUMN cap_tier_4_baru     TYPE numeric(18,2) USING cap_tier_4_baru::numeric(18,2),
  ALTER COLUMN cap_tier_4_takeover TYPE numeric(18,2) USING cap_tier_4_takeover::numeric(18,2);

-- Pemeriksaan: keempat baris harus menampilkan numeric
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name LIKE 'cap_tier_4%'
ORDER BY table_name, column_name;
