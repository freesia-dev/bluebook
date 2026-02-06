
-- Create activity_log table for audit trail
CREATE TABLE public.activity_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  user_name text,
  action text NOT NULL, -- 'create', 'update', 'delete'
  table_name text NOT NULL,
  record_id uuid,
  old_data jsonb,
  new_data jsonb,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Admin can read all logs
CREATE POLICY "Admins can read activity_log"
ON public.activity_log
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Authenticated users can read their own logs  
CREATE POLICY "Users can read own activity_log"
ON public.activity_log
FOR SELECT
USING (user_id = auth.uid());

-- System/triggers can insert logs (authenticated users)
CREATE POLICY "Authenticated can insert activity_log"
ON public.activity_log
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);
CREATE INDEX idx_activity_log_table_name ON public.activity_log(table_name);
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);

-- Create trigger function for auto-logging
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _action text;
  _old_data jsonb;
  _new_data jsonb;
  _record_id uuid;
  _description text;
  _user_name text;
BEGIN
  -- Determine action
  IF TG_OP = 'INSERT' THEN
    _action := 'create';
    _new_data := to_jsonb(NEW);
    _record_id := NEW.id;
    _description := 'Menambahkan data baru di ' || TG_TABLE_NAME;
  ELSIF TG_OP = 'UPDATE' THEN
    _action := 'update';
    _old_data := to_jsonb(OLD);
    _new_data := to_jsonb(NEW);
    _record_id := NEW.id;
    _description := 'Mengubah data di ' || TG_TABLE_NAME;
  ELSIF TG_OP = 'DELETE' THEN
    _action := 'delete';
    _old_data := to_jsonb(OLD);
    _record_id := OLD.id;
    _description := 'Menghapus data di ' || TG_TABLE_NAME;
  END IF;

  -- Get user name from profiles
  SELECT nama INTO _user_name 
  FROM public.profiles 
  WHERE user_id = auth.uid() 
  LIMIT 1;

  -- Insert log entry
  INSERT INTO public.activity_log (user_id, user_name, action, table_name, record_id, old_data, new_data, description)
  VALUES (auth.uid(), COALESCE(_user_name, 'System'), _action, TG_TABLE_NAME, _record_id, _old_data, _new_data, _description);

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach triggers to all major tables
CREATE TRIGGER log_surat_masuk_activity
AFTER INSERT OR UPDATE OR DELETE ON public.surat_masuk
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_surat_keluar_activity
AFTER INSERT OR UPDATE OR DELETE ON public.surat_keluar
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_sppk_activity
AFTER INSERT OR UPDATE OR DELETE ON public.sppk
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_pk_activity
AFTER INSERT OR UPDATE OR DELETE ON public.pk
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_kkmpak_activity
AFTER INSERT OR UPDATE OR DELETE ON public.kkmpak
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_nomor_loan_activity
AFTER INSERT OR UPDATE OR DELETE ON public.nomor_loan
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_pengisian_atm_activity
AFTER INSERT OR UPDATE OR DELETE ON public.pengisian_atm
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER log_agenda_kredit_entry_activity
AFTER INSERT OR UPDATE OR DELETE ON public.agenda_kredit_entry
FOR EACH ROW EXECUTE FUNCTION public.log_activity();
