-- Create jenis_penggunaan table
CREATE TABLE public.jenis_penggunaan (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kode text NOT NULL,
  keterangan text NOT NULL
);

-- Enable RLS
ALTER TABLE public.jenis_penggunaan ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Authenticated can read jenis_penggunaan"
ON public.jenis_penggunaan
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert jenis_penggunaan"
ON public.jenis_penggunaan
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update jenis_penggunaan"
ON public.jenis_penggunaan
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete jenis_penggunaan"
ON public.jenis_penggunaan
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Rename column in pk table from kode_fasilitas to jenis_penggunaan
ALTER TABLE public.pk RENAME COLUMN kode_fasilitas TO jenis_penggunaan;