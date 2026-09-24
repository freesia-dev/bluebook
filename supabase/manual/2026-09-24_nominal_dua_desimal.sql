-- ============================================================================
--  Nominal uang: dari bilangan bulat ke dua angka desimal
--  Jalankan sekali di Supabase SQL Editor, SEBELUM deploy yang memakai
--  <InputNominal> di seluruh kolom uang.
-- ============================================================================
--
--  Kenapa perlu:
--  Semua kolom nominal uang dulu bertipe BIGINT alias bilangan bulat, jadi
--  sen tidak bisa disimpan sama sekali. Selama tipenya masih BIGINT, mengetik
--  "10.000.000,22" akan ditolak database saat disimpan ("invalid input syntax
--  for type bigint"). Skrip ini melebarkan kolomnya jadi numeric(18,2):
--  nilai lama tidak berubah (10000000 jadi 10000000.00) dan mulai sekarang
--  sen ikut tersimpan.
--
--  Aman dijalankan berulang: kolom yang sudah numeric dilewati sendiri.
--  Tidak ada data yang hilang — numeric(18,2) menampung sampai 16 digit di
--  depan koma, jauh di atas nilai rupiah mana pun yang dipakai di sini.
--
--  Perkiraan waktu: tabel-tabel ini kecil (ribuan baris), hitungan detik.
--  ALTER TABLE mengunci tabel selama konversi, jadi sebaiknya dijalankan saat
--  kantor tidak sedang input data.
-- ============================================================================

DO $$
DECLARE
  sasaran CONSTANT text[][] := ARRAY[
    -- [nama tabel, nama kolom]
    ['alamin_config',          'premi_min'],
    ['alamin_underwriting_rule','plafon_min'],
    ['alamin_underwriting_rule','plafon_max'],

    ['call_memo_penagihan',    'tunggakan_pokok'],
    ['call_memo_penagihan',    'tunggakan_bunga'],
    ['call_memo_penagihan',    'total_tunggakan'],
    ['call_memo_penagihan',    'janji_bayar_nominal'],

    ['cerdas_config',          'plafon_tier_1_max'],
    ['cerdas_config',          'plafon_tier_2_max'],
    ['cerdas_config',          'plafon_tier_3_max'],
    ['cerdas_config',          'cap_tier_1_baru'],
    ['cerdas_config',          'cap_tier_2_baru'],
    ['cerdas_config',          'cap_tier_3_baru'],
    ['cerdas_config',          'cap_tier_1_takeover'],
    ['cerdas_config',          'cap_tier_2_takeover'],
    ['cerdas_config',          'cap_tier_3_takeover'],

    ['loan_promo_program',     'plafon_tier_1_max'],
    ['loan_promo_program',     'plafon_tier_2_max'],
    ['loan_promo_program',     'plafon_tier_3_max'],
    ['loan_promo_program',     'cap_tier_1_baru'],
    ['loan_promo_program',     'cap_tier_2_baru'],
    ['loan_promo_program',     'cap_tier_3_baru'],
    ['loan_promo_program',     'cap_tier_1_takeover'],
    ['loan_promo_program',     'cap_tier_2_takeover'],
    ['loan_promo_program',     'cap_tier_3_takeover'],

    ['loan_promo',             'cap_subsidi'],
    ['loan_product_config',    'biaya_notaris'],
    ['loan_product_config',    'biaya_perikatan'],

    ['loan_simulation',        'plafon'],
    ['loan_simulation',        'gaji'],
    ['loan_simulation',        'gaji_pokok'],
    ['loan_simulation',        'ttp'],
    ['loan_simulation',        'angsuran_gaji'],
    ['loan_simulation',        'angsuran_praja'],
    ['loan_simulation',        'asuransi_nominal'],
    ['loan_simulation',        'asuransi_jiwa_beban'],
    ['loan_simulation',        'premi_kredit'],
    ['loan_simulation',        'biaya_notaris'],
    ['loan_simulation',        'biaya_perikatan'],
    ['loan_simulation',        'outstanding_pokok'],
    ['loan_simulation',        'outstanding_bunga'],
    ['loan_simulation',        'cerdas_cap_subsidi'],
    ['loan_simulation',        'cerdas_subsidi_bank'],
    ['loan_simulation',        'cerdas_selisih_debitur'],

    ['sppk',                   'plafon'],
    ['pk',                     'plafon'],
    ['kkmpak',                 'plafon'],
    ['nomor_loan',             'plafon'],
    ['proyeksi_kredit',        'plafon'],

    ['pengisian_atm',          'saldo_buku_besar'],
    ['pengisian_atm',          'jumlah_selisih'],
    ['pengisian_atm',          'jumlah_disetor'],
    ['pengisian_atm',          'setor_ke_rek_titipan'],
    ['selisih_atm',            'nominal']
  ];
  tabel text;
  kolom text;
  tipe_sekarang text;
  jumlah_diubah int := 0;
  jumlah_dilewati int := 0;
BEGIN
  FOR i IN 1 .. array_length(sasaran, 1) LOOP
    tabel := sasaran[i][1];
    kolom := sasaran[i][2];

    SELECT data_type INTO tipe_sekarang
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = tabel AND column_name = kolom;

    IF tipe_sekarang IS NULL THEN
      RAISE NOTICE 'lewati %.% — kolom tidak ada di database ini', tabel, kolom;
      jumlah_dilewati := jumlah_dilewati + 1;
    ELSIF tipe_sekarang = 'numeric' THEN
      jumlah_dilewati := jumlah_dilewati + 1;
    ELSE
      EXECUTE format(
        'ALTER TABLE public.%I ALTER COLUMN %I TYPE numeric(18,2) USING %I::numeric(18,2)',
        tabel, kolom, kolom
      );
      RAISE NOTICE 'diubah %.% dari % ke numeric(18,2)', tabel, kolom, tipe_sekarang;
      jumlah_diubah := jumlah_diubah + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'Selesai: % kolom diubah, % kolom dilewati.', jumlah_diubah, jumlah_dilewati;
END $$;

-- ----------------------------------------------------------------------------
-- Pemeriksaan sesudahnya — semua baris harus bertipe numeric
-- ----------------------------------------------------------------------------
-- SELECT table_name, column_name, data_type, numeric_precision, numeric_scale
-- FROM information_schema.columns
-- WHERE table_schema = 'public'
--   AND column_name IN (
--     'plafon','plafon_min','plafon_max','gaji','gaji_pokok','ttp','nominal',
--     'saldo_buku_besar','jumlah_selisih','outstanding_pokok','outstanding_bunga',
--     'tunggakan_pokok','tunggakan_bunga','total_tunggakan','janji_bayar_nominal'
--   )
-- ORDER BY table_name, column_name;

-- ----------------------------------------------------------------------------
-- Kalau perlu dikembalikan (nilai sen akan dibulatkan dan HILANG)
-- ----------------------------------------------------------------------------
-- ALTER TABLE public.loan_simulation ALTER COLUMN plafon TYPE bigint USING round(plafon)::bigint;
-- ... dan seterusnya untuk kolom lain di daftar di atas.
