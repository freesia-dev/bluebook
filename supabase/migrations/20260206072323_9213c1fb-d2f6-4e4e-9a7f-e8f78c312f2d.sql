
-- ============================================
-- FIX 1: Remove duplicate BEFORE DELETE triggers
-- ============================================

DROP TRIGGER IF EXISTS trigger_handle_kkmpak_delete ON public.kkmpak;
DROP TRIGGER IF EXISTS trigger_handle_nomor_loan_delete ON public.nomor_loan;
DROP TRIGGER IF EXISTS trigger_handle_pengisian_atm_delete ON public.pengisian_atm;
DROP TRIGGER IF EXISTS trigger_handle_pk_delete ON public.pk;
DROP TRIGGER IF EXISTS trigger_handle_sppk_delete ON public.sppk;
DROP TRIGGER IF EXISTS trigger_handle_surat_keluar_delete ON public.surat_keluar;
DROP TRIGGER IF EXISTS trigger_handle_surat_masuk_delete ON public.surat_masuk;

-- ============================================
-- FIX 2: Clean up existing duplicate entries in recycle_bin
-- Keep only one entry per original_id + deleted_at combination
-- ============================================

DELETE FROM public.recycle_bin
WHERE id NOT IN (
  SELECT MIN(id::text)::uuid
  FROM public.recycle_bin 
  GROUP BY original_id, deleted_at
);

-- ============================================
-- FIX 3: Update pengisian_atm delete trigger to renumber by tanggal
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_pengisian_atm_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.recycle_bin (original_id, table_name, table_type, data, deleted_by)
  VALUES (OLD.id, 'pengisian_atm', NULL, to_jsonb(OLD), auth.uid());
  
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY tanggal, created_at) as new_nomor
    FROM public.pengisian_atm
    WHERE id != OLD.id
  )
  UPDATE public.pengisian_atm p
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE p.id = numbered.id AND p.nomor != numbered.new_nomor;
  
  RETURN OLD;
END;
$function$;
