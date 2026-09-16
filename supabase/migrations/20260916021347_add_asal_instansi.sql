-- Create asal_instansi master table (same pattern as jenis_debitur / sektor_ekonomi)
CREATE TABLE public.asal_instansi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kode TEXT NOT NULL,
  keterangan TEXT NOT NULL
);

ALTER TABLE public.asal_instansi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read asal_instansi" ON public.asal_instansi FOR SELECT USING (true);
CREATE POLICY "Anyone can insert asal_instansi" ON public.asal_instansi FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update asal_instansi" ON public.asal_instansi FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete asal_instansi" ON public.asal_instansi FOR DELETE USING (true);

-- Add asal_instansi column to pk (nullable so existing rows stay valid;
-- stores the "kode" of the selected asal_instansi row, same convention as
-- jenis_debitur / jenis_penggunaan / sektor_ekonomi on this table)
ALTER TABLE public.pk ADD COLUMN asal_instansi TEXT;
