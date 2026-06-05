
ALTER TABLE public.surat_keluar
  ADD COLUMN IF NOT EXISTS ojk_status TEXT,
  ADD COLUMN IF NOT EXISTS ojk_status_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ojk_status_updated_by UUID,
  ADD COLUMN IF NOT EXISTS ojk_status_updated_by_nama TEXT;

ALTER TABLE public.surat_keluar
  DROP CONSTRAINT IF EXISTS surat_keluar_ojk_status_check;
ALTER TABLE public.surat_keluar
  ADD CONSTRAINT surat_keluar_ojk_status_check
  CHECK (ojk_status IS NULL OR ojk_status IN ('diajukan','diproses','ditolak','selesai'));

UPDATE public.surat_keluar
SET ojk_status = 'diproses',
    ojk_status_updated_at = now()
WHERE ojk_status IS NULL
  AND kode_surat = 'B-4'
  AND (
    nama_penerima ILIKE '%ojk%'
    OR nama_penerima ILIKE '%otoritas jasa keuangan%'
    OR tujuan_surat ILIKE '%ojk%'
    OR tujuan_surat ILIKE '%otoritas jasa keuangan%'
  );

CREATE INDEX IF NOT EXISTS idx_surat_keluar_ojk_status ON public.surat_keluar(ojk_status) WHERE ojk_status IS NOT NULL;
