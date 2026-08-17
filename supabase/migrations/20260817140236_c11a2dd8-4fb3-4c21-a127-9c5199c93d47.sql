UPDATE public.loan_product_config SET skema = 'flat' WHERE skema = 'sliding';
UPDATE public.loan_product_config SET skema = 'sliding' WHERE skema = 'efektif';
UPDATE public.loan_simulation SET skema = 'flat' WHERE skema = 'sliding';
UPDATE public.loan_simulation SET skema = 'sliding' WHERE skema = 'efektif';