-- Revoke EXECUTE from anon on internal SECURITY DEFINER helper functions.
-- Keep authenticated able to call them (RLS policies rely on them).
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.has_role(uuid, app_role)',
    'public.is_authenticated()',
    'public.is_demo_user()',
    'public.is_readonly_user()',
    'public.can_edit_security_log()',
    'public.can_sign_security_ba()',
    'public.can_access_security_log()',
    'public.can_comment_security_log()',
    'public.can_manage_cs()',
    'public.can_view_cs()',
    'public.can_use_loan_calc()',
    'public.get_security_users()',
    'public.get_ba_security_nomor(date)',
    'public.create_security_audit_token(date, date, timestamptz, text)',
    'public.get_security_audit_report(uuid)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, PUBLIC', fn);
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'skip missing %', fn;
    END;
  END LOOP;
END $$;

-- verify_ba_security tetap boleh dipanggil anon karena dipakai halaman verifikasi publik via token.

-- Storage: batasi LIST/SELECT objects di bucket documents ke authenticated saja.
DROP POLICY IF EXISTS "documents_anon_list_deny" ON storage.objects;
CREATE POLICY "documents_authenticated_only_list"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

-- Hapus policy lama yang mungkin memberi akses SELECT ke anon
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname ILIKE '%public%read%documents%'
  LOOP
    EXECUTE format('DROP POLICY %I ON storage.objects', p.policyname);
  END LOOP;
END $$;