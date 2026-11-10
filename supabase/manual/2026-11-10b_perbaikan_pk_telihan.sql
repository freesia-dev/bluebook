-- ============================================================================
--  Perbaikan data PK Telihan yang terlanjur bentrok
--  Jalankan di Supabase SQL Editor. Baca BLOK 1 dulu sebelum BLOK 2.
-- ============================================================================
--
--  Keadaan sekarang (empat baris, nomor urut tidak cocok dengan dokumennya):
--
--    nomor 177  dokumen 179  SELLY AGUSTIN        Rp 10.000.000   9 Nov
--    nomor 178  dokumen 180  SELVIA DWI UTAMI     Rp 23.000.000   9 Nov
--    nomor 182  dokumen 177  BUDIANSYAH ISKANDAR  Rp 12.000.000   5 Nov
--    nomor 183  dokumen 178  RINA SINGGI          Rp 21.000.000   9 Nov
--
--  Dan tiga baris yang menurut keputusanmu tidak dipakai:
--
--    nomor 179  ABAIKAN INI                       Rp 21.000.000   baris uji coba
--    nomor 180  SELVIA DWI UTAMI                  Rp 12.000.000   kembaran, yang
--                                                                 dipakai 23 juta
--    nomor 183  RINA SINGGI dokumen 178           Rp 21.000.000   kembaran, yang
--                                                                 dipakai dokumen 181
--
--  Sesudah perbaikan, register Telihan berbunyi:
--
--    176 NADYA FARADIVA OLFIARDI
--    177 BUDIANSYAH ISKANDAR
--    179 SELLY AGUSTIN
--    180 SELVIA DWI UTAMI        (Rp 23.000.000)
--    181 RINA SINGGI
--
--  Nomor 178 sengaja dibiarkan kosong: dokumen itu tidak jadi dipakai siapa
--  pun. PK berikutnya akan mendapat nomor 182.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- BLOK 1 — Lihat dulu baris yang akan dihapus (aman, hanya membaca)
--          Pastikan ketiganya memang yang kamu maksud.
-- ----------------------------------------------------------------------------
SELECT nomor, nomor_pk, nama_debitur, plafon, tanggal::date, 'AKAN DIHAPUS' AS tindakan
FROM public.pk
WHERE type = 'telihan'
  AND (
       (nomor = 179 AND nama_debitur = 'ABAIKAN INI')
    OR (nomor = 180 AND plafon = 12000000)
    OR (nomor = 183 AND nomor_pk LIKE '178/%')
  )
ORDER BY nomor;


-- ----------------------------------------------------------------------------
-- BLOK 2 — Perbaikan, dalam satu transaksi
--
--          Jalankan seluruh blok ini sekaligus. Hasilnya ditampilkan sebelum
--          COMMIT: kalau tidak sesuai, ganti COMMIT dengan ROLLBACK dan tidak
--          ada satu pun yang berubah.
-- ----------------------------------------------------------------------------
BEGIN;

  -- 1. Buang tiga baris yang tidak dipakai.
  --    Pemicu di tabel ini otomatis menyalinnya ke Recycle Bin dan mencatatnya
  --    di Activity Log, jadi masih bisa dilihat kembali kalau perlu.
  DELETE FROM public.pk
  WHERE type = 'telihan' AND nomor = 179 AND nama_debitur = 'ABAIKAN INI';

  DELETE FROM public.pk
  WHERE type = 'telihan' AND nomor = 180 AND plafon = 12000000;

  DELETE FROM public.pk
  WHERE type = 'telihan' AND nomor = 183 AND nomor_pk LIKE '178/%';

  -- 2. Samakan nomor urut dengan angka pada nomor dokumennya.
  --    Nomor dokumen yang dianggap benar — itulah yang tercetak di berkas.
  UPDATE public.pk
  SET nomor = left(nomor_pk, 3)::int
  WHERE type = 'telihan'
    AND nomor_pk ~ '^[0-9]+'
    AND left(nomor_pk, 3)::int <> nomor;

  -- 3. Keluarkan ketiga baris tadi dari Recycle Bin.
  --    Penomoran yang baru memperlakukan nomor di Recycle Bin sebagai masih
  --    terpakai; kalau ketiganya dibiarkan di sana, PK berikutnya akan loncat
  --    ke 184. Ketiganya bukan dokumen sungguhan, jadi nomornya dibebaskan.
  DELETE FROM public.recycle_bin
  WHERE table_name = 'pk'
    AND table_type = 'telihan'
    AND (data->>'nomor')::int IN (179, 180, 183)
    AND deleted_at >= now() - interval '5 minutes';

  -- 4. Periksa hasilnya sebelum menutup transaksi.
  SELECT nomor, nomor_pk, nama_debitur, plafon, tanggal::date
  FROM public.pk
  WHERE type = 'telihan' AND nomor >= 174
  ORDER BY nomor;

COMMIT;
-- ROLLBACK;   -- pakai ini kalau hasil di atas tidak seperti yang kamu harapkan


-- ----------------------------------------------------------------------------
-- BLOK 3 — Pastikan sudah bersih (aman, hanya membaca)
--          Keduanya harus mengembalikan nol baris.
-- ----------------------------------------------------------------------------
SELECT 'nomor urut tidak cocok dokumen' AS masalah, nomor, nomor_pk, nama_debitur
FROM public.pk
WHERE nomor_pk ~ '^[0-9]+' AND left(nomor_pk, 3)::int <> nomor
UNION ALL
SELECT 'nomor dokumen kembar', nomor, nomor_pk, nama_debitur
FROM public.pk a
WHERE EXISTS (
  SELECT 1 FROM public.pk b
  WHERE b.type = a.type AND b.nomor_pk = a.nomor_pk AND b.id <> a.id
);


-- ----------------------------------------------------------------------------
-- BLOK 4 — Pasang pagarnya
--          Setelah BLOK 3 bersih. Mulai saat itu database sendiri yang menolak
--          nomor kembar, tidak lagi bergantung pada kebenaran aplikasi.
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pk_type_nomor      ON public.pk (type, nomor);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pk_type_dokumen    ON public.pk (type, nomor_pk);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sppk_type_nomor    ON public.sppk (type, nomor);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sppk_type_dokumen  ON public.sppk (type, nomor_sppk);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_kkmpak_type_nomor  ON public.kkmpak (type, nomor);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_kkmpak_type_dok_kk ON public.kkmpak (type, nomor_kk);
