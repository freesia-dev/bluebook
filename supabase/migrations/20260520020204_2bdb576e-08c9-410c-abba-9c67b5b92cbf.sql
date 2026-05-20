
-- 1) Add new enum values to app_role
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'meranti';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'officer_rk';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'officer_kredit';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'staff_admin_kcp';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pemimpin';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'teller';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'cs';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'security';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'ob';

-- 2) Create is_readonly_user() (demo + pemimpin). Cannot reference new enum
--    values in same tx as ADD VALUE, so we build the function with text cast.
CREATE OR REPLACE FUNCTION public.is_readonly_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('demo', 'pemimpin')
  );
$$;
