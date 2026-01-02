-- Create nomor_loan table
CREATE TABLE public.nomor_loan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor INTEGER NOT NULL,
  nomor_loan TEXT NOT NULL,
  nama_debitur TEXT NOT NULL,
  nomor_pk TEXT NOT NULL,
  jenis_kredit TEXT NOT NULL,
  produk_kredit TEXT NOT NULL,
  plafon BIGINT NOT NULL,
  jangka_waktu TEXT NOT NULL,
  skema TEXT NOT NULL,
  unit_kerja TEXT NOT NULL,
  pk_id UUID REFERENCES public.pk(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nomor_loan ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated can read nomor_loan"
ON public.nomor_loan FOR SELECT
USING (true);

CREATE POLICY "Authenticated can insert nomor_loan"
ON public.nomor_loan FOR INSERT
WITH CHECK (true);

CREATE POLICY "Authenticated can update nomor_loan"
ON public.nomor_loan FOR UPDATE
USING (true);

CREATE POLICY "Admins can delete nomor_loan"
ON public.nomor_loan FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));