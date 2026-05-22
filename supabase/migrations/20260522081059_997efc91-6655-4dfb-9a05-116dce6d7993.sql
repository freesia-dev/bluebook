-- Update verify_ba_security to use new nomor format:
-- [3 digit urut per tahun]/LOG/SEC/BPD-TLH/[Romawi]/[Tahun]
CREATE OR REPLACE FUNCTION public.verify_ba_security(_token uuid)
RETURNS TABLE(
  tanggal date,
  nomor_ba text,
  ttd_pimpinan_nama text,
  ttd_pimpinan_at timestamptz,
  petugas jsonb,
  total_shift integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  WITH periode AS (
    SELECT DISTINCT tanggal
    FROM public.security_shift
    WHERE ba_signature_token = _token
      AND ttd_pimpinan_at IS NOT NULL
    LIMIT 1
  ),
  rank_in_year AS (
    SELECT t.tanggal,
           (SELECT COUNT(DISTINCT s2.tanggal)
              FROM public.security_shift s2
             WHERE date_part('year', s2.tanggal) = date_part('year', t.tanggal)
               AND s2.tanggal <= t.tanggal) AS urut
    FROM periode t
  ),
  shifts AS (
    SELECT s.*
    FROM public.security_shift s
    JOIN periode p ON p.tanggal = s.tanggal
  ),
  romawi AS (
    SELECT t.tanggal,
           (ARRAY['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'])[EXTRACT(MONTH FROM t.tanggal)::int] AS bln
    FROM periode t
  )
  SELECT
    p.tanggal,
    lpad(r.urut::text, 3, '0') || '/LOG/SEC/BPD-TLH/' || rm.bln || '/' || to_char(p.tanggal, 'YYYY') AS nomor_ba,
    MAX(s.ttd_pimpinan_nama) AS ttd_pimpinan_nama,
    MAX(s.ttd_pimpinan_at) AS ttd_pimpinan_at,
    jsonb_agg(
      jsonb_build_object(
        'shift', s.shift,
        'nama_petugas', s.nama_petugas,
        'is_lembur', s.is_lembur
      )
      ORDER BY CASE s.shift WHEN 'malam' THEN 0 WHEN 'pagi' THEN 1 WHEN 'sore' THEN 2 ELSE 9 END
    ) AS petugas,
    COUNT(*)::int AS total_shift
  FROM periode p
  JOIN shifts s ON s.tanggal = p.tanggal
  JOIN rank_in_year r ON r.tanggal = p.tanggal
  JOIN romawi rm ON rm.tanggal = p.tanggal
  GROUP BY p.tanggal, r.urut, rm.bln;
$$;

GRANT EXECUTE ON FUNCTION public.verify_ba_security(uuid) TO anon, authenticated;

-- RPC to compute nomor BA on the client (used by print page)
CREATE OR REPLACE FUNCTION public.get_ba_security_nomor(_tanggal date)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lpad(
    (SELECT COUNT(DISTINCT s.tanggal)
       FROM public.security_shift s
      WHERE date_part('year', s.tanggal) = date_part('year', _tanggal)
        AND s.tanggal <= _tanggal)::text, 3, '0')
    || '/LOG/SEC/BPD-TLH/'
    || (ARRAY['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'])[EXTRACT(MONTH FROM _tanggal)::int]
    || '/' || to_char(_tanggal, 'YYYY');
$$;

GRANT EXECUTE ON FUNCTION public.get_ba_security_nomor(date) TO anon, authenticated;