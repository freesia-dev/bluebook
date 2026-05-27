
CREATE TABLE public.kondisi_kantor_template (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  label text NOT NULL,
  urutan integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.kondisi_kantor_template TO authenticated;
GRANT ALL ON public.kondisi_kantor_template TO service_role;

ALTER TABLE public.kondisi_kantor_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read kondisi_kantor_template"
ON public.kondisi_kantor_template FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins insert kondisi_kantor_template"
ON public.kondisi_kantor_template FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update kondisi_kantor_template"
ON public.kondisi_kantor_template FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete kondisi_kantor_template"
ON public.kondisi_kantor_template FOR DELETE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.kondisi_kantor_template (label, urutan) VALUES
  ('Kantor aman terkendali, semua pintu & jendela terkunci, CCTV berfungsi normal.', 10),
  ('Kondisi normal, tidak ada kejadian menonjol selama shift.', 20),
  ('Area kantor bersih dan rapi, lampu eksterior menyala normal.', 30),
  ('CCTV & alarm berfungsi, brankas terkunci.', 40),
  ('Genset & panel listrik aman, tidak ada gangguan.', 50);

CREATE OR REPLACE FUNCTION public.verify_ba_security(_token uuid)
 RETURNS TABLE(tanggal date, nomor_ba text, ttd_pimpinan_nama text, ttd_pimpinan_at timestamp with time zone, petugas jsonb, total_shift integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
      ORDER BY CASE s.shift WHEN 'pagi' THEN 0 WHEN 'sore' THEN 1 WHEN 'malam' THEN 2 ELSE 9 END
    ) AS petugas,
    COUNT(*)::int AS total_shift
  FROM periode p
  JOIN shifts s ON s.tanggal = p.tanggal
  JOIN rank_in_year r ON r.tanggal = p.tanggal
  JOIN romawi rm ON rm.tanggal = p.tanggal
  GROUP BY p.tanggal, r.urut, rm.bln;
$function$;
