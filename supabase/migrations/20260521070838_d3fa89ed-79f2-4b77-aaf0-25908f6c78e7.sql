-- Create table
CREATE TABLE public.call_memo_penagihan (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor integer NOT NULL,
  tanggal date NOT NULL,
  jam text NOT NULL DEFAULT '',
  l0lnno text,
  nama_debitur text NOT NULL,
  no_hp text,
  no_rek text,
  produk text,
  tunggakan_pokok bigint NOT NULL DEFAULT 0,
  tunggakan_bunga bigint NOT NULL DEFAULT 0,
  total_tunggakan bigint NOT NULL DEFAULT 0,
  jenis_aktivitas text NOT NULL DEFAULT 'call',
  hasil text,
  janji_bayar_tanggal date,
  janji_bayar_nominal bigint,
  status_komitmen text NOT NULL DEFAULT 'belum_ada',
  petugas_penagih text NOT NULL,
  saksi text,
  lampiran_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  catatan_tambahan text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_call_memo_tanggal ON public.call_memo_penagihan (tanggal DESC);
CREATE INDEX idx_call_memo_l0lnno ON public.call_memo_penagihan (l0lnno);

ALTER TABLE public.call_memo_penagihan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read call_memo_penagihan"
  ON public.call_memo_penagihan FOR SELECT TO authenticated USING (true);

CREATE POLICY "Non-demo can insert call_memo_penagihan"
  ON public.call_memo_penagihan FOR INSERT TO authenticated
  WITH CHECK (NOT is_demo_user());

CREATE POLICY "Non-demo can update call_memo_penagihan"
  ON public.call_memo_penagihan FOR UPDATE TO authenticated
  USING (NOT is_demo_user()) WITH CHECK (NOT is_demo_user());

CREATE POLICY "Admins can delete call_memo_penagihan"
  ON public.call_memo_penagihan FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger
CREATE TRIGGER update_call_memo_updated_at
  BEFORE UPDATE ON public.call_memo_penagihan
  FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();

-- Delete handler: archive to recycle bin + renumber
CREATE OR REPLACE FUNCTION public.handle_call_memo_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.recycle_bin (original_id, table_name, table_type, data, deleted_by)
  VALUES (OLD.id, 'call_memo_penagihan', NULL, to_jsonb(OLD), auth.uid());

  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY tanggal, created_at) AS new_nomor
    FROM public.call_memo_penagihan
    WHERE id != OLD.id
  )
  UPDATE public.call_memo_penagihan c
  SET nomor = numbered.new_nomor
  FROM numbered
  WHERE c.id = numbered.id AND c.nomor != numbered.new_nomor;

  RETURN OLD;
END;
$$;

CREATE TRIGGER call_memo_delete_trigger
  BEFORE DELETE ON public.call_memo_penagihan
  FOR EACH ROW EXECUTE FUNCTION public.handle_call_memo_delete();

-- Activity log triggers
CREATE TRIGGER call_memo_activity_log
  AFTER INSERT OR UPDATE OR DELETE ON public.call_memo_penagihan
  FOR EACH ROW EXECUTE FUNCTION public.log_activity();