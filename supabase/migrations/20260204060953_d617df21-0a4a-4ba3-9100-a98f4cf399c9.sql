-- Function to renumber rows after delete for any table with 'nomor' column
-- This function renumbers all records sequentially after a deletion

-- Function for SPPK table
CREATE OR REPLACE FUNCTION public.renumber_sppk_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  -- Renumber all records of the same type, ordered by created_at
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY type ORDER BY created_at) as new_nomor
    FROM public.sppk
    WHERE type = OLD.type
  )
  UPDATE public.sppk s
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE s.id = numbered.id AND s.nomor != numbered.new_nomor;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function for PK table
CREATE OR REPLACE FUNCTION public.renumber_pk_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY type ORDER BY created_at) as new_nomor
    FROM public.pk
    WHERE type = OLD.type
  )
  UPDATE public.pk p
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE p.id = numbered.id AND p.nomor != numbered.new_nomor;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function for KKMPAK table
CREATE OR REPLACE FUNCTION public.renumber_kkmpak_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY type ORDER BY created_at) as new_nomor
    FROM public.kkmpak
    WHERE type = OLD.type
  )
  UPDATE public.kkmpak k
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE k.id = numbered.id AND k.nomor != numbered.new_nomor;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function for Nomor Loan table
CREATE OR REPLACE FUNCTION public.renumber_nomor_loan_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_nomor
    FROM public.nomor_loan
  )
  UPDATE public.nomor_loan n
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE n.id = numbered.id AND n.nomor != numbered.new_nomor;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function for Surat Masuk table
CREATE OR REPLACE FUNCTION public.renumber_surat_masuk_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_nomor
    FROM public.surat_masuk
  )
  UPDATE public.surat_masuk s
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE s.id = numbered.id AND s.nomor != numbered.new_nomor;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function for Surat Keluar table
CREATE OR REPLACE FUNCTION public.renumber_surat_keluar_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_nomor
    FROM public.surat_keluar
  )
  UPDATE public.surat_keluar s
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE s.id = numbered.id AND s.nomor != numbered.new_nomor;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function for Pengisian ATM table
CREATE OR REPLACE FUNCTION public.renumber_pengisian_atm_after_delete()
RETURNS TRIGGER AS $$
BEGIN
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_nomor
    FROM public.pengisian_atm
  )
  UPDATE public.pengisian_atm p
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE p.id = numbered.id AND p.nomor != numbered.new_nomor;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for each table
CREATE TRIGGER trigger_renumber_sppk_after_delete
AFTER DELETE ON public.sppk
FOR EACH ROW
EXECUTE FUNCTION public.renumber_sppk_after_delete();

CREATE TRIGGER trigger_renumber_pk_after_delete
AFTER DELETE ON public.pk
FOR EACH ROW
EXECUTE FUNCTION public.renumber_pk_after_delete();

CREATE TRIGGER trigger_renumber_kkmpak_after_delete
AFTER DELETE ON public.kkmpak
FOR EACH ROW
EXECUTE FUNCTION public.renumber_kkmpak_after_delete();

CREATE TRIGGER trigger_renumber_nomor_loan_after_delete
AFTER DELETE ON public.nomor_loan
FOR EACH ROW
EXECUTE FUNCTION public.renumber_nomor_loan_after_delete();

CREATE TRIGGER trigger_renumber_surat_masuk_after_delete
AFTER DELETE ON public.surat_masuk
FOR EACH ROW
EXECUTE FUNCTION public.renumber_surat_masuk_after_delete();

CREATE TRIGGER trigger_renumber_surat_keluar_after_delete
AFTER DELETE ON public.surat_keluar
FOR EACH ROW
EXECUTE FUNCTION public.renumber_surat_keluar_after_delete();

CREATE TRIGGER trigger_renumber_pengisian_atm_after_delete
AFTER DELETE ON public.pengisian_atm
FOR EACH ROW
EXECUTE FUNCTION public.renumber_pengisian_atm_after_delete();