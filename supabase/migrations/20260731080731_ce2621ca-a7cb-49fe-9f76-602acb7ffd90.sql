ALTER TABLE public.loan_simulation
  ADD COLUMN IF NOT EXISTS pipeline_status text NOT NULL DEFAULT 'simulasi',
  ADD COLUMN IF NOT EXISTS pipeline_note text,
  ADD COLUMN IF NOT EXISTS pipeline_updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_loan_simulation_pipeline_status ON public.loan_simulation (pipeline_status);