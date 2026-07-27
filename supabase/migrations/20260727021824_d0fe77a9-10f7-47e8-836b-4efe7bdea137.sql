DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %I.%I(%s) FROM anon, PUBLIC',
                   r.nspname, r.proname, r.args);
  END LOOP;
END $$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_authenticated() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_demo_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_readonly_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_security_log() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_sign_security_ba() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_security_log() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_comment_security_log() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_manage_cs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_view_cs() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_use_loan_calc() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ba_security_nomor(date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_security_audit_token(date, date, timestamptz, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_security_audit_report(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.verify_ba_security(uuid) TO authenticated, anon;