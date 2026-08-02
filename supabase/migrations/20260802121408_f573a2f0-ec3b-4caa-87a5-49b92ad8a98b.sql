ALTER TABLE public.loan_simulation ADD COLUMN IF NOT EXISTS pipeline_history jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.wa_template ADD COLUMN IF NOT EXISTS kategori text NOT NULL DEFAULT 'tagihan';
ALTER TABLE public.wa_reminder_log ADD COLUMN IF NOT EXISTS kategori text NOT NULL DEFAULT 'tagihan';