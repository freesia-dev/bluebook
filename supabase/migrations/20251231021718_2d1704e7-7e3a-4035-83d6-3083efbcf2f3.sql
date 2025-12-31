-- Add tanggal_masuk column for backdate support
ALTER TABLE public.surat_masuk ADD COLUMN IF NOT EXISTS tanggal_masuk TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.agenda_kredit_entry ADD COLUMN IF NOT EXISTS tanggal_masuk TIMESTAMPTZ DEFAULT now();

-- Enable realtime for dashboard updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.surat_masuk;
ALTER PUBLICATION supabase_realtime ADD TABLE public.surat_keluar;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sppk;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pk;
ALTER PUBLICATION supabase_realtime ADD TABLE public.kkmpak;
ALTER PUBLICATION supabase_realtime ADD TABLE public.agenda_kredit_entry;