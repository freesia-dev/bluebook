ALTER TYPE public.loan_skema ADD VALUE IF NOT EXISTS 'flat';
ALTER TABLE public.loan_product_config ADD COLUMN IF NOT EXISTS segmen text NOT NULL DEFAULT 'konsumtif';
ALTER TABLE public.loan_simulation ADD COLUMN IF NOT EXISTS segmen text NOT NULL DEFAULT 'konsumtif';