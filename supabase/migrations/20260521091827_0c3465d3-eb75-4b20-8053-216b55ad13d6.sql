CREATE OR REPLACE FUNCTION public.get_security_users()
RETURNS TABLE(user_id uuid, nama text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.nama
  FROM public.profiles p
  JOIN public.user_roles ur ON ur.user_id = p.user_id
  WHERE ur.role::text = 'security'
    AND p.status = 'approved'
  ORDER BY p.nama;
$$;

GRANT EXECUTE ON FUNCTION public.get_security_users() TO authenticated;