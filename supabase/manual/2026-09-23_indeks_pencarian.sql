-- ============================================================================
-- Bluebook — indeks untuk pencarian global (kotak cari & Ctrl+K)
-- Dijalankan manual di SQL Editor Supabase (bukan migrasi otomatis).
-- Tanggal: 23 September 2026
--
-- Masalahnya: pencarian global memakai ILIKE '%kata%' di banyak kolom sekaligus.
-- Tanpa indeks khusus, Postgres membaca SELURUH isi tabel setiap kali seseorang
-- mengetik. Sekarang masih terasa cepat karena datanya belum banyak, tapi makin
-- lama makin berat — dan semua orang memakai kotak cari yang sama.
--
-- Solusinya: ekstensi pg_trgm + indeks GIN trigram, satu-satunya jenis indeks
-- yang bisa dipakai Postgres untuk ILIKE dengan '%' di depan.
--
-- Aman dijalankan berulang: setiap indeks dilewati kalau tabel/kolomnya tidak
-- ada atau indeksnya sudah dibuat. Tidak ada data yang diubah sama sekali.
-- Perkiraan waktu: beberapa detik untuk data sebesar sekarang.
--
-- Catatan: sengaja TIDAK memakai CREATE INDEX CONCURRENTLY, karena perintah itu
-- tidak bisa dijalankan di dalam blok transaksi seperti di SQL Editor. Tabelnya
-- kecil, jadi penguncian hanya sepersekian detik.
-- ============================================================================

-- Di Supabase, ekstensi biasanya terpasang di skema "extensions". Baris ini
-- memastikan gin_trgm_ops tetap ketemu di mana pun ia terpasang.
SET search_path = public, extensions;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

DO $$
DECLARE
  -- Daftar kolom yang benar-benar dicari, disalin dari src/lib/global-search-specs.ts
  daftar text[][] := ARRAY[
    ['surat_masuk',           'nama_pengirim,perihal,nomor_agenda,nomor_surat_masuk,kode_surat,tujuan_disposisi'],
    ['surat_keluar',          'nama_penerima,perihal,nomor_agenda,kode_surat,tujuan_surat'],
    ['agenda_kredit_entry',   'nama_pengirim,perihal,nomor_agenda,nomor_surat_masuk'],
    ['sppk',                  'nama_debitur,nomor_sppk,jenis_kredit,marketing'],
    ['pk',                    'nama_debitur,nomor_pk,jenis_kredit,sektor_ekonomi'],
    ['kkmpak',                'nama_debitur,nomor_kk,nomor_mpak,jenis_kredit'],
    ['nomor_loan',            'nomor_loan,nama_debitur,nomor_pk,jenis_kredit,unit_kerja'],
    ['loan_simulation',       'nama_debitur,nomor_ktp,instansi,nama_ao,product_nama'],
    ['cs_cif',                'cif,nama'],
    ['cs_rekening',           'nomor_rekening,nama,cif'],
    ['cs_bilyet_deposito',    'nomor_bilyet,nama,cif'],
    ['cs_si',                 'kode_si,nama_nasabah,rekening_debet,rekening_kredit'],
    ['call_memo_penagihan',   'nama_debitur,l0lnno,no_hp,no_rek,petugas_penagih'],
    ['debitur_kontak',        'l0lnno,nama,no_hp'],
    ['proyeksi_kredit',       'nama_debitur,unit,jenis_kredit'],
    ['security_shift',        'nama_petugas,shift,serah_terima_ke_nama']
  ];
  baris    text[];
  nama_tbl text;
  kolom    text;
  nama_idx text;
  tipe     text;
  ekspresi text;
  dibuat   int := 0;
  dilewati int := 0;
BEGIN
  FOREACH baris SLICE 1 IN ARRAY daftar LOOP
    nama_tbl := baris[1];

    -- Tabelnya belum ada di database ini? Lewati saja.
    IF to_regclass('public.' || quote_ident(nama_tbl)) IS NULL THEN
      RAISE NOTICE 'Tabel % tidak ada — dilewati.', nama_tbl;
      CONTINUE;
    END IF;

    FOREACH kolom IN ARRAY string_to_array(baris[2], ',') LOOP
      -- Kolomnya sudah berganti nama? Lewati, jangan sampai gagal semua.
      SELECT data_type INTO tipe FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = nama_tbl AND column_name = kolom;

      IF tipe IS NULL THEN
        RAISE NOTICE 'Kolom %.% tidak ada — dilewati.', nama_tbl, kolom;
        dilewati := dilewati + 1;
        CONTINUE;
      END IF;

      -- Nama indeks dipendekkan supaya tidak melebihi batas 63 karakter Postgres
      nama_idx := left('cari_' || nama_tbl || '_' || kolom || '_trgm', 63);

      -- gin_trgm_ops hanya menerima tipe text; kolom varchar/char dicast dulu
      -- (cast ini tetap dikenali perencana query saat menjalankan ILIKE).
      IF tipe = 'text' THEN
        ekspresi := format('%I', kolom);
      ELSIF tipe IN ('character varying', 'character') THEN
        ekspresi := format('(%I::text)', kolom);
      ELSE
        RAISE NOTICE 'Kolom %.% bertipe % — bukan teks, dilewati.', nama_tbl, kolom, tipe;
        dilewati := dilewati + 1;
        CONTINUE;
      END IF;

      EXECUTE format(
        'CREATE INDEX IF NOT EXISTS %I ON public.%I USING gin (%s gin_trgm_ops)',
        nama_idx, nama_tbl, ekspresi
      );
      dibuat := dibuat + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Selesai. % indeks disiapkan, % kolom dilewati.', dibuat, dilewati;
END $$;

-- Sekalian: indeks untuk pengurutan yang dipakai hampir di semua halaman daftar
-- (ORDER BY created_at DESC). Ini indeks biasa, bukan trigram.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'surat_masuk','surat_keluar','agenda_kredit_entry','sppk','pk','kkmpak',
    'nomor_loan','loan_simulation','activity_log'
  ] LOOP
    IF to_regclass('public.' || quote_ident(t)) IS NOT NULL
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = t AND column_name = 'created_at'
       )
    THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (created_at DESC)', left('urut_' || t || '_created_at', 63), t);
    END IF;
  END LOOP;
END $$;

-- ── Cara membatalkan (buka komentar kalau perlu) ────────────────────────────
-- DO $$
-- DECLARE i record;
-- BEGIN
--   FOR i IN SELECT indexname FROM pg_indexes
--            WHERE schemaname = 'public' AND (indexname LIKE 'cari\_%\_trgm' OR indexname LIKE 'urut\_%\_created\_at')
--   LOOP
--     EXECUTE format('DROP INDEX IF EXISTS public.%I', i.indexname);
--   END LOOP;
-- END $$;
