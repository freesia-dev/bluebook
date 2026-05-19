
CREATE TABLE public.mlf_uploads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  jobdate DATE NOT NULL,
  filename TEXT NOT NULL,
  total_rows INTEGER NOT NULL DEFAULT 0,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.mlf_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  upload_id UUID NOT NULL REFERENCES public.mlf_uploads(id) ON DELETE CASCADE,
  jobdate DATE NOT NULL,
  brcd TEXT,
  brname TEXT,
  kol INTEGER,
  lytitl TEXT,
  ecname TEXT,
  l0lnno TEXT,
  l0name TEXT,
  l0narr TEXT,
  pla NUMERIC,
  baki NUMERIC,
  tungpk NUMERIC,
  tungbg NUMERIC,
  cad NUMERIC,
  group1 TEXT,
  group2 TEXT,
  l0usid TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_mlf_data_upload ON public.mlf_data(upload_id);
CREATE INDEX idx_mlf_data_brcd_jobdate ON public.mlf_data(brcd, jobdate);

ALTER TABLE public.mlf_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mlf_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read mlf_uploads" ON public.mlf_uploads FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert mlf_uploads" ON public.mlf_uploads FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete mlf_uploads" ON public.mlf_uploads FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can read mlf_data" ON public.mlf_data FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert mlf_data" ON public.mlf_data FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete mlf_data" ON public.mlf_data FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
