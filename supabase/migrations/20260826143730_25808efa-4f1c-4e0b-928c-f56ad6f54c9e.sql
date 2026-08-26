ALTER TABLE public.loan_simulation REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.loan_simulation;