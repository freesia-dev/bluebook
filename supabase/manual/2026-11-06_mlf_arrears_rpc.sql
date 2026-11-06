-- ============================================================================
--  Hari Tunggak & Bayar Terakhir: pindahkan perhitungan ke database
--  Jalankan sekali di Supabase SQL Editor.
-- ============================================================================
--
--  Masalahnya: halaman Laporan Kredit dan Monitoring Dashboard menarik SELURUH
--  riwayat snapshot MLF ke browser, seribu baris per permintaan. Kalau MLF
--  diunggah hampir tiap hari, riwayat satu cabang bisa ratusan ribu baris —
--  artinya ratusan permintaan berurutan, dan kolomnya tidak pernah selesai
--  dihitung ("menghitung…" terus).
--
--  Fungsi ini mengerjakan ringkasannya di Postgres dan mengembalikan satu baris
--  per nomor loan (sekitar enam ratus baris), jadi browser cukup satu permintaan.
--  Logika penaksiran harinya tetap di aplikasi supaya mudah diperiksa; yang
--  dipindah ke sini hanya penyisiran riwayatnya.
--
--  Aman dijalankan berulang.
-- ============================================================================

-- Index pendukung: penyisiran selalu per cabang, per nomor loan, urut tanggal
CREATE INDEX IF NOT EXISTS idx_mlf_data_brcd_loan_jobdate
  ON public.mlf_data (brcd, l0lnno, jobdate);

CREATE OR REPLACE FUNCTION public.mlf_arrears(
  p_brcd text DEFAULT '143',
  p_jobdate_max date DEFAULT NULL
)
RETURNS TABLE (
  l0lnno          text,
  latest_jobdate  date,
  first_jobdate   date,
  tunggakan       numeric,
  tungpk          numeric,
  angsuran_pokok  numeric,
  clean_jobdate   date,   -- snapshot terakhir yang masih lancar
  dirty_jobdate   date,   -- snapshot menunggak pertama sesudahnya
  payments        jsonb   -- maksimal 5 pembayaran terakhir, terbaru dulu
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH s AS (
    -- Satu baris per (loan, tanggal snapshot). Kalau satu tanggal pernah
    -- diunggah dua kali, yang dipakai baris terakhir yang masuk.
    SELECT DISTINCT ON (d.l0lnno, d.jobdate)
           d.l0lnno::text                                              AS loan,
           d.jobdate::date                                             AS jobdate,
           COALESCE(d.baki, 0)::numeric                                AS baki,
           COALESCE(d.tungpk, 0)::numeric                              AS tungpk,
           COALESCE(d.tungpk, 0)::numeric + COALESCE(d.tungbg, 0)::numeric AS tung,
           COALESCE(d.pla, 0)::numeric                                 AS pla,
           d.date::date                                                AS mulai,
           d.date1::date                                               AS tempo
    FROM public.mlf_data d
    WHERE d.brcd = p_brcd
      AND d.l0lnno IS NOT NULL
      AND (p_jobdate_max IS NULL OR d.jobdate <= p_jobdate_max)
    ORDER BY d.l0lnno, d.jobdate, d.id
  ),
  w AS (
    SELECT s.*,
           LAG(baki) OVER (PARTITION BY loan ORDER BY jobdate) AS prev_baki,
           LAG(tung) OVER (PARTITION BY loan ORDER BY jobdate) AS prev_tung,
           MAX(jobdate) OVER (PARTITION BY loan)               AS max_jd,
           MIN(jobdate) OVER (PARTITION BY loan)               AS min_jd
    FROM s
  ),
  bayar AS (
    -- Pembayaran = penurunan baki debet, atau penurunan tunggakan bila lebih besar
    SELECT loan, jobdate,
           GREATEST(COALESCE(prev_baki - baki, 0),
                    GREATEST(COALESCE(prev_tung - tung, 0), 0)) AS amount
    FROM w
  ),
  bayar5 AS (
    SELECT loan,
           jsonb_agg(jsonb_build_object('jobdate', jobdate, 'amount', amount)
                     ORDER BY jobdate DESC) AS payments
    FROM (
      SELECT loan, jobdate, amount,
             ROW_NUMBER() OVER (PARTITION BY loan ORDER BY jobdate DESC) AS rn
      FROM bayar
      WHERE amount >= 1000
    ) t
    WHERE rn <= 5
    GROUP BY loan
  ),
  bersih AS (
    SELECT loan, MAX(jobdate) AS clean_jobdate
    FROM w WHERE tung <= 0 GROUP BY loan
  ),
  terakhir AS (
    SELECT * FROM w WHERE jobdate = max_jd
  )
  SELECT
    t.loan,
    t.jobdate,
    t.min_jd,
    t.tung,
    t.tungpk,
    CASE
      WHEN t.mulai IS NULL OR t.tempo IS NULL THEN 0
      ELSE (
        SELECT CASE WHEN bln > 0 AND t.pla > 0 THEN t.pla / bln ELSE 0 END
        FROM (
          SELECT GREATEST(0,
            (EXTRACT(YEAR FROM t.tempo) - EXTRACT(YEAR FROM t.mulai)) * 12
            + (EXTRACT(MONTH FROM t.tempo) - EXTRACT(MONTH FROM t.mulai))
            + CASE WHEN EXTRACT(DAY FROM t.tempo) - EXTRACT(DAY FROM t.mulai) >= 15
                   THEN 1 ELSE 0 END
          ) AS bln
        ) x
      )
    END::numeric AS angsuran_pokok,
    b.clean_jobdate,
    (SELECT MIN(x.jobdate) FROM w x
      WHERE x.loan = t.loan AND b.clean_jobdate IS NOT NULL AND x.jobdate > b.clean_jobdate),
    COALESCE(p.payments, '[]'::jsonb)
  FROM terakhir t
  LEFT JOIN bersih b ON b.loan = t.loan
  LEFT JOIN bayar5 p ON p.loan = t.loan;
$$;

GRANT EXECUTE ON FUNCTION public.mlf_arrears(text, date) TO authenticated;

-- ----------------------------------------------------------------------------
-- Pemeriksaan — harus mengembalikan ratusan baris dalam hitungan detik
-- ----------------------------------------------------------------------------
SELECT count(*) AS jumlah_loan FROM public.mlf_arrears('143', NULL);

SELECT l0lnno, latest_jobdate, tunggakan, angsuran_pokok, clean_jobdate, dirty_jobdate,
       jsonb_array_length(payments) AS jml_pembayaran
FROM public.mlf_arrears('143', NULL)
WHERE tunggakan > 0
ORDER BY tunggakan DESC
LIMIT 10;
