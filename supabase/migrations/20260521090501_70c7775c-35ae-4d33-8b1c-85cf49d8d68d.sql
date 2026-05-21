-- ============ SECURITY SHIFT ============
CREATE TABLE public.security_shift (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal date NOT NULL,
  shift text NOT NULL CHECK (shift IN ('pagi','sore','malam')),
  nama_petugas text NOT NULL,
  petugas_user_id uuid,
  jam_mulai timestamptz NOT NULL DEFAULT now(),
  jam_selesai timestamptz,
  status text NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif','selesai')),
  is_lembur boolean NOT NULL DEFAULT false,
  parent_shift_id uuid REFERENCES public.security_shift(id) ON DELETE SET NULL,
  -- Serah terima
  kondisi_akhir text,
  serah_terima_ke_nama text,
  serah_terima_ke_user_id uuid,
  serah_terima_at timestamptz,
  catatan_serah_terima text,
  -- BA approval
  ttd_pimpinan_nama text,
  ttd_pimpinan_user_id uuid,
  ttd_pimpinan_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_security_shift_tanggal ON public.security_shift(tanggal DESC);
CREATE INDEX idx_security_shift_status ON public.security_shift(status);

ALTER TABLE public.security_shift ENABLE ROW LEVEL SECURITY;

-- Helper: allowed roles for security module
CREATE OR REPLACE FUNCTION public.can_access_security_log()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('admin','security','staff_admin_kcp','pemimpin')
  );
$$;

CREATE OR REPLACE FUNCTION public.can_edit_security_log()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('admin','security','staff_admin_kcp')
  ) AND NOT public.is_demo_user();
$$;

CREATE OR REPLACE FUNCTION public.can_sign_security_ba()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('admin','pemimpin')
  );
$$;

CREATE POLICY "Allowed roles read security_shift"
  ON public.security_shift FOR SELECT TO authenticated
  USING (public.can_access_security_log());

CREATE POLICY "Editors insert security_shift"
  ON public.security_shift FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_security_log());

CREATE POLICY "Editors update security_shift"
  ON public.security_shift FOR UPDATE TO authenticated
  USING (public.can_edit_security_log() OR public.can_sign_security_ba())
  WITH CHECK (public.can_edit_security_log() OR public.can_sign_security_ba());

CREATE POLICY "Admins delete security_shift"
  ON public.security_shift FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER trg_security_shift_updated_at
BEFORE UPDATE ON public.security_shift
FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();

-- ============ SECURITY LOG ENTRY ============
CREATE TABLE public.security_log_entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid NOT NULL REFERENCES public.security_shift(id) ON DELETE CASCADE,
  waktu_kejadian timestamptz NOT NULL DEFAULT now(),
  jenis text NOT NULL DEFAULT 'kejadian' CHECK (jenis IN ('kejadian','serah_terima','mulai_shift','akhir_shift')),
  kejadian text NOT NULL,
  foto_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  video_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid
);

CREATE INDEX idx_security_log_entry_shift ON public.security_log_entry(shift_id, waktu_kejadian);

ALTER TABLE public.security_log_entry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allowed roles read security_log_entry"
  ON public.security_log_entry FOR SELECT TO authenticated
  USING (public.can_access_security_log());

CREATE POLICY "Editors insert security_log_entry"
  ON public.security_log_entry FOR INSERT TO authenticated
  WITH CHECK (public.can_edit_security_log());

CREATE POLICY "Editors update security_log_entry"
  ON public.security_log_entry FOR UPDATE TO authenticated
  USING (public.can_edit_security_log())
  WITH CHECK (public.can_edit_security_log());

CREATE POLICY "Admins delete security_log_entry"
  ON public.security_log_entry FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_security_log_entry_updated_at
BEFORE UPDATE ON public.security_log_entry
FOR EACH ROW EXECUTE FUNCTION public.update_profiles_updated_at();

-- Activity log
CREATE TRIGGER trg_log_security_shift
AFTER INSERT OR UPDATE OR DELETE ON public.security_shift
FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER trg_log_security_log_entry
AFTER INSERT OR UPDATE OR DELETE ON public.security_log_entry
FOR EACH ROW EXECUTE FUNCTION public.log_activity();