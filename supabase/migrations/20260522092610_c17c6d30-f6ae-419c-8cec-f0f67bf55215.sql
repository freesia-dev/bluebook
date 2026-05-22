
-- 1. Add new role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'team_leader_security';

-- 2. New column: incident flag
ALTER TABLE public.security_log_entry
  ADD COLUMN IF NOT EXISTS is_insiden boolean NOT NULL DEFAULT false;

-- 3. Comments table
CREATE TABLE IF NOT EXISTS public.security_log_comment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id uuid REFERENCES public.security_shift(id) ON DELETE CASCADE,
  entry_id uuid REFERENCES public.security_log_entry(id) ON DELETE CASCADE,
  komentar text NOT NULL,
  created_by uuid,
  created_by_nama text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT comment_target_check CHECK (shift_id IS NOT NULL OR entry_id IS NOT NULL)
);

ALTER TABLE public.security_log_comment ENABLE ROW LEVEL SECURITY;

-- 4. Audit token table
CREATE TABLE IF NOT EXISTS public.security_audit_token (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  periode_dari date NOT NULL,
  periode_sampai date NOT NULL,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_by uuid,
  created_by_nama text,
  catatan text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.security_audit_token ENABLE ROW LEVEL SECURITY;

-- 5. Helper function: who can comment
CREATE OR REPLACE FUNCTION public.can_comment_security_log()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('admin','team_leader_security')
  );
$$;

-- 6. Update existing access helpers to include TL
CREATE OR REPLACE FUNCTION public.can_access_security_log()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('admin','security','staff_admin_kcp','pemimpin','team_leader_security')
  );
$$;

-- 7. RLS for comments
CREATE POLICY "Allowed roles read comments"
  ON public.security_log_comment FOR SELECT TO authenticated
  USING (can_access_security_log());

CREATE POLICY "TL and admin insert comments"
  ON public.security_log_comment FOR INSERT TO authenticated
  WITH CHECK (can_comment_security_log());

CREATE POLICY "Owner or admin delete comments"
  ON public.security_log_comment FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

-- 8. RLS for audit tokens (admin only)
CREATE POLICY "Admins manage audit tokens select"
  ON public.security_audit_token FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage audit tokens insert"
  ON public.security_audit_token FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage audit tokens update"
  ON public.security_audit_token FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage audit tokens delete"
  ON public.security_audit_token FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- 9. Create token RPC
CREATE OR REPLACE FUNCTION public.create_security_audit_token(
  _dari date, _sampai date, _expires_at timestamptz, _catatan text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _new_token uuid;
  _nama text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Hanya admin yang boleh membuat token audit';
  END IF;
  IF _sampai < _dari THEN
    RAISE EXCEPTION 'Tanggal sampai harus >= tanggal dari';
  END IF;
  IF _expires_at <= now() THEN
    RAISE EXCEPTION 'Expired harus di masa depan';
  END IF;

  SELECT nama INTO _nama FROM public.profiles WHERE user_id = auth.uid() LIMIT 1;

  INSERT INTO public.security_audit_token(periode_dari, periode_sampai, expires_at, created_by, created_by_nama, catatan)
  VALUES (_dari, _sampai, _expires_at, auth.uid(), _nama, _catatan)
  RETURNING token INTO _new_token;

  RETURN _new_token;
END;
$$;

-- 10. Public audit report RPC
CREATE OR REPLACE FUNCTION public.get_security_audit_report(_token uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _t public.security_audit_token%ROWTYPE;
  _result jsonb;
BEGIN
  SELECT * INTO _t FROM public.security_audit_token WHERE token = _token;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Token tidak ditemukan');
  END IF;
  IF _t.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'Token telah dicabut');
  END IF;
  IF _t.expires_at <= now() THEN
    RETURN jsonb_build_object('error', 'Token telah kadaluarsa');
  END IF;

  SELECT jsonb_build_object(
    'periode_dari', _t.periode_dari,
    'periode_sampai', _t.periode_sampai,
    'expires_at', _t.expires_at,
    'created_by_nama', _t.created_by_nama,
    'created_at', _t.created_at,
    'catatan', _t.catatan,
    'shifts', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id,
        'tanggal', s.tanggal,
        'shift', s.shift,
        'nama_petugas', s.nama_petugas,
        'jam_mulai', s.jam_mulai,
        'jam_selesai', s.jam_selesai,
        'status', s.status,
        'is_lembur', s.is_lembur,
        'ttd_pimpinan_nama', s.ttd_pimpinan_nama,
        'ttd_pimpinan_at', s.ttd_pimpinan_at,
        'ba_signature_token', s.ba_signature_token
      ) ORDER BY s.tanggal DESC, s.jam_mulai)
      FROM public.security_shift s
      WHERE s.tanggal BETWEEN _t.periode_dari AND _t.periode_sampai
    ), '[]'::jsonb),
    'entries', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', e.id,
        'shift_id', e.shift_id,
        'jenis', e.jenis,
        'kejadian', e.kejadian,
        'waktu_kejadian', e.waktu_kejadian,
        'is_insiden', e.is_insiden,
        'foto_urls', e.foto_urls,
        'video_url', e.video_url,
        'tanggal', s.tanggal,
        'shift', s.shift,
        'nama_petugas', s.nama_petugas
      ) ORDER BY e.waktu_kejadian DESC)
      FROM public.security_log_entry e
      JOIN public.security_shift s ON s.id = e.shift_id
      WHERE s.tanggal BETWEEN _t.periode_dari AND _t.periode_sampai
    ), '[]'::jsonb),
    'comments', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', c.id,
        'shift_id', c.shift_id,
        'entry_id', c.entry_id,
        'komentar', c.komentar,
        'created_by_nama', c.created_by_nama,
        'created_at', c.created_at
      ) ORDER BY c.created_at DESC)
      FROM public.security_log_comment c
      LEFT JOIN public.security_shift s ON s.id = c.shift_id
      LEFT JOIN public.security_log_entry e ON e.id = c.entry_id
      LEFT JOIN public.security_shift se ON se.id = e.shift_id
      WHERE COALESCE(s.tanggal, se.tanggal) BETWEEN _t.periode_dari AND _t.periode_sampai
    ), '[]'::jsonb)
  ) INTO _result;

  RETURN _result;
END;
$$;

-- 11. Allow anon to call the report RPC
GRANT EXECUTE ON FUNCTION public.get_security_audit_report(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_security_audit_token(date, date, timestamptz, text) TO authenticated;

-- 12. Index for performance
CREATE INDEX IF NOT EXISTS idx_security_log_comment_shift ON public.security_log_comment(shift_id);
CREATE INDEX IF NOT EXISTS idx_security_log_comment_entry ON public.security_log_comment(entry_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_token_token ON public.security_audit_token(token);
