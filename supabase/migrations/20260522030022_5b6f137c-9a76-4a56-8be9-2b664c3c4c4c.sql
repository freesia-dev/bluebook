-- 1. Token column for BA signature
ALTER TABLE public.security_shift
  ADD COLUMN IF NOT EXISTS ba_signature_token uuid;

CREATE INDEX IF NOT EXISTS idx_security_shift_ba_token
  ON public.security_shift (ba_signature_token)
  WHERE ba_signature_token IS NOT NULL;

-- 2. Public verify RPC (returns minimal BA summary)
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
  shifts AS (
    SELECT s.*
    FROM public.security_shift s
    JOIN periode p ON p.tanggal = s.tanggal
  )
  SELECT
    p.tanggal,
    to_char(p.tanggal, 'DDMM') || '/BA-SEC/KCP-TLH/' || to_char(p.tanggal, 'YYYY') AS nomor_ba,
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
  GROUP BY p.tanggal;
$$;

-- Allow anonymous users to verify (this is the whole point of QR verify)
GRANT EXECUTE ON FUNCTION public.verify_ba_security(uuid) TO anon, authenticated;
