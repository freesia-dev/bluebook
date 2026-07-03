
ALTER TABLE public.loan_simulation
  ADD COLUMN IF NOT EXISTS gaji_pokok bigint,
  ADD COLUMN IF NOT EXISTS ttp bigint,
  ADD COLUMN IF NOT EXISTS asuransi_jiwa_beban bigint,
  ADD COLUMN IF NOT EXISTS premi_kredit bigint,
  ADD COLUMN IF NOT EXISTS outstanding_pokok bigint,
  ADD COLUMN IF NOT EXISTS outstanding_bunga bigint;
