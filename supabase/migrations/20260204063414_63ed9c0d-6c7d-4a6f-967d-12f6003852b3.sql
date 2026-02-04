-- Ensure recycle-bin + renumber triggers exist (they were missing)

-- 1) Create handler for agenda_kredit_entry (was not covered)
CREATE OR REPLACE FUNCTION public.handle_agenda_kredit_entry_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.recycle_bin (original_id, table_name, table_type, data, deleted_by)
  VALUES (OLD.id, 'agenda_kredit_entry', NULL, to_jsonb(OLD), auth.uid());

  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS new_nomor
    FROM public.agenda_kredit_entry
    WHERE id != OLD.id
  )
  UPDATE public.agenda_kredit_entry a
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE a.id = numbered.id AND a.nomor != numbered.new_nomor;

  RETURN OLD;
END;
$$;

-- 2) (Re)attach BEFORE DELETE triggers for all modules
DROP TRIGGER IF EXISTS trg_sppk_before_delete ON public.sppk;
CREATE TRIGGER trg_sppk_before_delete
BEFORE DELETE ON public.sppk
FOR EACH ROW
EXECUTE FUNCTION public.handle_sppk_delete();

DROP TRIGGER IF EXISTS trg_pk_before_delete ON public.pk;
CREATE TRIGGER trg_pk_before_delete
BEFORE DELETE ON public.pk
FOR EACH ROW
EXECUTE FUNCTION public.handle_pk_delete();

DROP TRIGGER IF EXISTS trg_kkmpak_before_delete ON public.kkmpak;
CREATE TRIGGER trg_kkmpak_before_delete
BEFORE DELETE ON public.kkmpak
FOR EACH ROW
EXECUTE FUNCTION public.handle_kkmpak_delete();

DROP TRIGGER IF EXISTS trg_nomor_loan_before_delete ON public.nomor_loan;
CREATE TRIGGER trg_nomor_loan_before_delete
BEFORE DELETE ON public.nomor_loan
FOR EACH ROW
EXECUTE FUNCTION public.handle_nomor_loan_delete();

DROP TRIGGER IF EXISTS trg_surat_masuk_before_delete ON public.surat_masuk;
CREATE TRIGGER trg_surat_masuk_before_delete
BEFORE DELETE ON public.surat_masuk
FOR EACH ROW
EXECUTE FUNCTION public.handle_surat_masuk_delete();

DROP TRIGGER IF EXISTS trg_surat_keluar_before_delete ON public.surat_keluar;
CREATE TRIGGER trg_surat_keluar_before_delete
BEFORE DELETE ON public.surat_keluar
FOR EACH ROW
EXECUTE FUNCTION public.handle_surat_keluar_delete();

DROP TRIGGER IF EXISTS trg_pengisian_atm_before_delete ON public.pengisian_atm;
CREATE TRIGGER trg_pengisian_atm_before_delete
BEFORE DELETE ON public.pengisian_atm
FOR EACH ROW
EXECUTE FUNCTION public.handle_pengisian_atm_delete();

DROP TRIGGER IF EXISTS trg_agenda_kredit_entry_before_delete ON public.agenda_kredit_entry;
CREATE TRIGGER trg_agenda_kredit_entry_before_delete
BEFORE DELETE ON public.agenda_kredit_entry
FOR EACH ROW
EXECUTE FUNCTION public.handle_agenda_kredit_entry_delete();
