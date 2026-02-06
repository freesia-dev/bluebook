
-- Create penyelesaian_selisih table
CREATE TABLE public.penyelesaian_selisih (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor INTEGER NOT NULL,
  tanggal_pengaduan DATE NOT NULL,
  tanggal_penyelesaian DATE,
  petugas TEXT NOT NULL,
  teller TEXT,
  pemimpin TEXT,
  catatan TEXT,
  status TEXT NOT NULL DEFAULT 'Dalam Proses',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.penyelesaian_selisih ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated can read penyelesaian_selisih"
ON public.penyelesaian_selisih FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert penyelesaian_selisih"
ON public.penyelesaian_selisih FOR INSERT WITH CHECK (true);

CREATE POLICY "Authenticated can update penyelesaian_selisih"
ON public.penyelesaian_selisih FOR UPDATE USING (true);

CREATE POLICY "Admins can delete penyelesaian_selisih"
ON public.penyelesaian_selisih FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add status and penyelesaian_id to selisih_atm
ALTER TABLE public.selisih_atm
  ADD COLUMN status TEXT NOT NULL DEFAULT 'Belum Diselesaikan',
  ADD COLUMN penyelesaian_id UUID REFERENCES public.penyelesaian_selisih(id) ON DELETE SET NULL;

-- Delete trigger for penyelesaian_selisih (recycle bin + renumber)
CREATE OR REPLACE FUNCTION public.handle_penyelesaian_selisih_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.recycle_bin (original_id, table_name, table_type, data, deleted_by)
  VALUES (OLD.id, 'penyelesaian_selisih', NULL, to_jsonb(OLD), auth.uid());
  
  -- Reset selisih_atm records linked to this penyelesaian
  UPDATE public.selisih_atm
  SET penyelesaian_id = NULL, status = 'Belum Diselesaikan'
  WHERE penyelesaian_id = OLD.id;
  
  -- Renumber remaining records
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as new_nomor
    FROM public.penyelesaian_selisih
    WHERE id != OLD.id
  )
  UPDATE public.penyelesaian_selisih p
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE p.id = numbered.id AND p.nomor != numbered.new_nomor;
  
  RETURN OLD;
END;
$function$;

CREATE TRIGGER on_penyelesaian_selisih_delete
BEFORE DELETE ON public.penyelesaian_selisih
FOR EACH ROW
EXECUTE FUNCTION public.handle_penyelesaian_selisih_delete();

-- Activity log trigger for penyelesaian_selisih
CREATE TRIGGER log_penyelesaian_selisih_changes
AFTER INSERT OR UPDATE OR DELETE ON public.penyelesaian_selisih
FOR EACH ROW
EXECUTE FUNCTION public.log_activity();
