
-- 1) debitur_kontak
CREATE TABLE public.debitur_kontak (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  l0lnno TEXT NOT NULL UNIQUE,
  nama TEXT,
  no_hp TEXT,
  catatan TEXT,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_debitur_kontak_l0lnno ON public.debitur_kontak(l0lnno);
ALTER TABLE public.debitur_kontak ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read debitur_kontak" ON public.debitur_kontak FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert debitur_kontak" ON public.debitur_kontak FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update debitur_kontak" ON public.debitur_kontak FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete debitur_kontak" ON public.debitur_kontak FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_debitur_kontak_updated
BEFORE UPDATE ON public.debitur_kontak
FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();

CREATE TRIGGER trg_debitur_kontak_log
AFTER INSERT OR UPDATE OR DELETE ON public.debitur_kontak
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- 2) wa_template
CREATE TABLE public.wa_template (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama_template TEXT NOT NULL,
  isi TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.wa_template ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read wa_template" ON public.wa_template FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert wa_template" ON public.wa_template FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update wa_template" ON public.wa_template FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Admins can delete wa_template" ON public.wa_template FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_wa_template_updated
BEFORE UPDATE ON public.wa_template
FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();

CREATE TRIGGER trg_wa_template_log
AFTER INSERT OR UPDATE OR DELETE ON public.wa_template
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

-- 3) wa_reminder_log
CREATE TABLE public.wa_reminder_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  l0lnno TEXT NOT NULL,
  nama TEXT,
  no_hp TEXT NOT NULL,
  pesan TEXT NOT NULL,
  template_id UUID,
  metode TEXT NOT NULL DEFAULT 'wame',
  status TEXT NOT NULL DEFAULT 'opened',
  kol INTEGER,
  tunggakan NUMERIC,
  upload_id UUID,
  sent_by UUID,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_wa_reminder_log_l0lnno ON public.wa_reminder_log(l0lnno);
CREATE INDEX idx_wa_reminder_log_sent_at ON public.wa_reminder_log(sent_at DESC);
ALTER TABLE public.wa_reminder_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read wa_reminder_log" ON public.wa_reminder_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert wa_reminder_log" ON public.wa_reminder_log FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can delete wa_reminder_log" ON public.wa_reminder_log FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Seed default template
INSERT INTO public.wa_template (nama_template, isi, is_default)
VALUES (
  'Reminder Halus',
  E'Yth. Bapak/Ibu *{nama}*,\n\nKami dari Bank Kaltimtara Cabang Pembantu Telihan ingin mengingatkan bahwa rekening kredit Anda dengan rincian berikut:\n\n• No. Rekening: {no_rek}\n• Produk: {produk}\n• Outstanding: {baki}\n• Tunggakan Pokok: {tungpk}\n• Tunggakan Bunga: {tungbg}\n• *Total Tunggakan: {tunggakan}*\n\nMohon kesediaan Bapak/Ibu untuk segera menyelesaikan kewajiban tersebut guna menjaga kelancaran fasilitas kredit Anda.\n\nApabila telah melakukan pembayaran, mohon abaikan pesan ini.\n\nTerima kasih atas perhatian dan kerja samanya.\n\nHormat kami,\nBank Kaltimtara — Capem Telihan Bontang',
  true
);
