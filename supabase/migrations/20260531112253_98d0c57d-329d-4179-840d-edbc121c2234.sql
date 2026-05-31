ALTER TABLE public.mlf_data ADD COLUMN IF NOT EXISTS date1 date;
CREATE INDEX IF NOT EXISTS idx_mlf_data_date1 ON public.mlf_data(date1);