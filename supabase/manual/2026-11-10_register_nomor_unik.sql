-- ============================================================================
--  Register kredit: nomor dokumen tidak boleh kembar
--  Jalankan BERTAHAP di Supabase SQL Editor. Baca dulu tiap blok.
-- ============================================================================
--
--  Yang terjadi selama ini:
--
--  Menghapus satu entri memindahkannya ke Recycle Bin, tetapi nomornya
--  langsung dianggap bebas. Entri berikutnya memakai nomor itu lagi. Saat
--  entri lama dipulihkan, pemulihan memberinya nomor urut baru TETAPI tetap
--  membawa nomor dokumen lamanya — sehingga dua baris memegang nomor PK yang
--  sama, sementara nomor urut dan nomor dokumennya sendiri bercerita berbeda.
--
--  Sisi aplikasi sudah diperbaiki: nomor yang diparkir di Recycle Bin tidak
--  dipakai ulang, pemulihan mempertahankan nomor asli selama masih bebas, dan
--  kalau terpaksa berganti nomor, nomor dokumennya ikut disesuaikan.
--
--  Berkas ini membereskan data yang sudah terlanjur bentrok, lalu memasang
--  pagar di database supaya kejadian ini tidak bisa terulang diam-diam.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- BLOK 1 — Lihat dulu barisnya (aman, hanya membaca)
--          Baris yang nomor urutnya tidak sama dengan angka di nomor dokumen.
-- ----------------------------------------------------------------------------
SELECT 'pk' AS tabel, type, nomor, nomor_pk AS nomor_dokumen, nama_debitur, tanggal::date
FROM public.pk WHERE nomor_pk ~ '^\d+' AND left(nomor_pk, 3)::int <> nomor
UNION ALL
SELECT 'sppk', type, nomor, nomor_sppk, nama_debitur, tanggal::date
FROM public.sppk WHERE nomor_sppk ~ '^\d+' AND left(nomor_sppk, 3)::int <> nomor
UNION ALL
SELECT 'kkmpak', type, nomor, nomor_kk, nama_debitur, tanggal::date
FROM public.kkmpak WHERE nomor_kk ~ '^\d+' AND left(nomor_kk, 3)::int <> nomor
ORDER BY 1, 2, 3;


-- ----------------------------------------------------------------------------
-- BLOK 2 — Nomor dokumen yang kembar (aman, hanya membaca)
-- ----------------------------------------------------------------------------
SELECT 'pk' AS tabel, type, nomor_pk AS nomor_dokumen, count(*) AS baris,
       string_agg(nomor || ' ' || nama_debitur, '  |  ' ORDER BY nomor) AS isi
FROM public.pk GROUP BY type, nomor_pk HAVING count(*) > 1
UNION ALL
SELECT 'sppk', type, nomor_sppk, count(*),
       string_agg(nomor || ' ' || nama_debitur, '  |  ' ORDER BY nomor)
FROM public.sppk GROUP BY type, nomor_sppk HAVING count(*) > 1
UNION ALL
SELECT 'kkmpak', type, nomor_kk, count(*),
       string_agg(nomor || ' ' || nama_debitur, '  |  ' ORDER BY nomor)
FROM public.kkmpak GROUP BY type, nomor_kk HAVING count(*) > 1
ORDER BY 1, 2, 3;


-- ----------------------------------------------------------------------------
-- BLOK 3 — Buang entri yang memang tidak diinginkan
--
--          JANGAN dijalankan sebelum kamu putuskan sendiri baris mana yang
--          salah. Nomor PK adalah nomor dokumen yang sudah diteken; aplikasi
--          tidak boleh menebaknya. Hapus lewat menu Agenda Kredit di Bluebook
--          (supaya masuk Recycle Bin dan tercatat di Activity Log), bukan
--          lewat SQL — kecuali memang baris uji coba.
-- ----------------------------------------------------------------------------
-- contoh, sesuaikan sendiri:
-- DELETE FROM public.pk WHERE type = 'telihan' AND nama_debitur = 'ABAIKAN INI';


-- ----------------------------------------------------------------------------
-- BLOK 4 — Samakan nomor urut dengan nomor dokumennya
--
--          Dipakai setelah BLOK 2 bersih (tidak ada nomor dokumen kembar).
--          Nomor dokumen dianggap yang benar, karena itulah yang tercetak di
--          berkas; nomor urut mengikutinya. Dibungkus transaksi: kalau ada
--          yang bentrok, tidak ada satu pun yang berubah.
-- ----------------------------------------------------------------------------
-- BEGIN;
--   UPDATE public.pk SET nomor = left(nomor_pk, 3)::int
--   WHERE nomor_pk ~ '^\d+' AND left(nomor_pk, 3)::int <> nomor;
--
--   -- periksa dulu hasilnya sebelum COMMIT
--   SELECT type, nomor, nomor_pk, nama_debitur FROM public.pk
--   WHERE type = 'telihan' ORDER BY nomor DESC LIMIT 15;
-- COMMIT;   -- atau ROLLBACK; kalau hasilnya tidak seperti yang kamu harapkan


-- ----------------------------------------------------------------------------
-- BLOK 5 — Pagar di database
--
--          Setelah data rapi, pasang ini. Mulai saat itu, nomor urut maupun
--          nomor dokumen yang kembar akan DITOLAK database, bukan tersimpan
--          diam-diam. Kalau salah satu perintah gagal, berarti masih ada
--          kembar yang belum dibereskan — kembali ke BLOK 2.
-- ----------------------------------------------------------------------------
-- CREATE UNIQUE INDEX IF NOT EXISTS uniq_pk_type_nomor      ON public.pk (type, nomor);
-- CREATE UNIQUE INDEX IF NOT EXISTS uniq_pk_type_dokumen    ON public.pk (type, nomor_pk);
-- CREATE UNIQUE INDEX IF NOT EXISTS uniq_sppk_type_nomor    ON public.sppk (type, nomor);
-- CREATE UNIQUE INDEX IF NOT EXISTS uniq_sppk_type_dokumen  ON public.sppk (type, nomor_sppk);
-- CREATE UNIQUE INDEX IF NOT EXISTS uniq_kkmpak_type_nomor  ON public.kkmpak (type, nomor);
-- CREATE UNIQUE INDEX IF NOT EXISTS uniq_kkmpak_type_dok_kk ON public.kkmpak (type, nomor_kk);
