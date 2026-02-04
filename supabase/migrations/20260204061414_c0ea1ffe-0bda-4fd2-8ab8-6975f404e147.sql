-- Create recycle bin table to store all deleted records
CREATE TABLE public.recycle_bin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_id UUID NOT NULL,
  table_name TEXT NOT NULL,
  table_type TEXT, -- for tables with type column (telihan/meranti)
  data JSONB NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  deleted_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.recycle_bin ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only admins can access recycle bin
CREATE POLICY "Admins can read recycle_bin"
ON public.recycle_bin
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert recycle_bin"
ON public.recycle_bin
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete recycle_bin"
ON public.recycle_bin
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Drop existing delete triggers (we'll recreate them to save to recycle bin first)
DROP TRIGGER IF EXISTS trigger_renumber_sppk_after_delete ON public.sppk;
DROP TRIGGER IF EXISTS trigger_renumber_pk_after_delete ON public.pk;
DROP TRIGGER IF EXISTS trigger_renumber_kkmpak_after_delete ON public.kkmpak;
DROP TRIGGER IF EXISTS trigger_renumber_nomor_loan_after_delete ON public.nomor_loan;
DROP TRIGGER IF EXISTS trigger_renumber_surat_masuk_after_delete ON public.surat_masuk;
DROP TRIGGER IF EXISTS trigger_renumber_surat_keluar_after_delete ON public.surat_keluar;
DROP TRIGGER IF EXISTS trigger_renumber_pengisian_atm_after_delete ON public.pengisian_atm;

-- Create combined function for SPPK: save to recycle bin AND renumber
CREATE OR REPLACE FUNCTION public.handle_sppk_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Save to recycle bin
  INSERT INTO public.recycle_bin (original_id, table_name, table_type, data, deleted_by)
  VALUES (OLD.id, 'sppk', OLD.type, to_jsonb(OLD), auth.uid());
  
  -- Renumber remaining records
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY type ORDER BY created_at) as new_nomor
    FROM public.sppk
    WHERE type = OLD.type AND id != OLD.id
  )
  UPDATE public.sppk s
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE s.id = numbered.id AND s.nomor != numbered.new_nomor;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create combined function for PK
CREATE OR REPLACE FUNCTION public.handle_pk_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.recycle_bin (original_id, table_name, table_type, data, deleted_by)
  VALUES (OLD.id, 'pk', OLD.type, to_jsonb(OLD), auth.uid());
  
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY type ORDER BY created_at) as new_nomor
    FROM public.pk
    WHERE type = OLD.type AND id != OLD.id
  )
  UPDATE public.pk p
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE p.id = numbered.id AND p.nomor != numbered.new_nomor;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create combined function for KKMPAK
CREATE OR REPLACE FUNCTION public.handle_kkmpak_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.recycle_bin (original_id, table_name, table_type, data, deleted_by)
  VALUES (OLD.id, 'kkmpak', OLD.type, to_jsonb(OLD), auth.uid());
  
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY type ORDER BY created_at) as new_nomor
    FROM public.kkmpak
    WHERE type = OLD.type AND id != OLD.id
  )
  UPDATE public.kkmpak k
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE k.id = numbered.id AND k.nomor != numbered.new_nomor;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create combined function for Nomor Loan
CREATE OR REPLACE FUNCTION public.handle_nomor_loan_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.recycle_bin (original_id, table_name, table_type, data, deleted_by)
  VALUES (OLD.id, 'nomor_loan', NULL, to_jsonb(OLD), auth.uid());
  
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_nomor
    FROM public.nomor_loan
    WHERE id != OLD.id
  )
  UPDATE public.nomor_loan n
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE n.id = numbered.id AND n.nomor != numbered.new_nomor;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create combined function for Surat Masuk
CREATE OR REPLACE FUNCTION public.handle_surat_masuk_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.recycle_bin (original_id, table_name, table_type, data, deleted_by)
  VALUES (OLD.id, 'surat_masuk', NULL, to_jsonb(OLD), auth.uid());
  
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_nomor
    FROM public.surat_masuk
    WHERE id != OLD.id
  )
  UPDATE public.surat_masuk s
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE s.id = numbered.id AND s.nomor != numbered.new_nomor;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create combined function for Surat Keluar
CREATE OR REPLACE FUNCTION public.handle_surat_keluar_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.recycle_bin (original_id, table_name, table_type, data, deleted_by)
  VALUES (OLD.id, 'surat_keluar', NULL, to_jsonb(OLD), auth.uid());
  
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_nomor
    FROM public.surat_keluar
    WHERE id != OLD.id
  )
  UPDATE public.surat_keluar s
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE s.id = numbered.id AND s.nomor != numbered.new_nomor;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create combined function for Pengisian ATM
CREATE OR REPLACE FUNCTION public.handle_pengisian_atm_delete()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.recycle_bin (original_id, table_name, table_type, data, deleted_by)
  VALUES (OLD.id, 'pengisian_atm', NULL, to_jsonb(OLD), auth.uid());
  
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_nomor
    FROM public.pengisian_atm
    WHERE id != OLD.id
  )
  UPDATE public.pengisian_atm p
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE p.id = numbered.id AND p.nomor != numbered.new_nomor;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create BEFORE DELETE triggers (must be BEFORE to capture OLD data)
CREATE TRIGGER trigger_handle_sppk_delete
BEFORE DELETE ON public.sppk
FOR EACH ROW
EXECUTE FUNCTION public.handle_sppk_delete();

CREATE TRIGGER trigger_handle_pk_delete
BEFORE DELETE ON public.pk
FOR EACH ROW
EXECUTE FUNCTION public.handle_pk_delete();

CREATE TRIGGER trigger_handle_kkmpak_delete
BEFORE DELETE ON public.kkmpak
FOR EACH ROW
EXECUTE FUNCTION public.handle_kkmpak_delete();

CREATE TRIGGER trigger_handle_nomor_loan_delete
BEFORE DELETE ON public.nomor_loan
FOR EACH ROW
EXECUTE FUNCTION public.handle_nomor_loan_delete();

CREATE TRIGGER trigger_handle_surat_masuk_delete
BEFORE DELETE ON public.surat_masuk
FOR EACH ROW
EXECUTE FUNCTION public.handle_surat_masuk_delete();

CREATE TRIGGER trigger_handle_surat_keluar_delete
BEFORE DELETE ON public.surat_keluar
FOR EACH ROW
EXECUTE FUNCTION public.handle_surat_keluar_delete();

CREATE TRIGGER trigger_handle_pengisian_atm_delete
BEFORE DELETE ON public.pengisian_atm
FOR EACH ROW
EXECUTE FUNCTION public.handle_pengisian_atm_delete();

-- Drop old functions that are no longer needed
DROP FUNCTION IF EXISTS public.renumber_sppk_after_delete();
DROP FUNCTION IF EXISTS public.renumber_pk_after_delete();
DROP FUNCTION IF EXISTS public.renumber_kkmpak_after_delete();
DROP FUNCTION IF EXISTS public.renumber_nomor_loan_after_delete();
DROP FUNCTION IF EXISTS public.renumber_surat_masuk_after_delete();
DROP FUNCTION IF EXISTS public.renumber_surat_keluar_after_delete();
DROP FUNCTION IF EXISTS public.renumber_pengisian_atm_after_delete();