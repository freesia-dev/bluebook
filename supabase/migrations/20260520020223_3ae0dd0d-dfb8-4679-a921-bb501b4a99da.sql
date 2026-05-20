
-- Expand is_demo_user() to also cover 'pemimpin' so all existing RLS policies
-- that block writes for demo users now also block writes for pemimpin —
-- without having to touch every policy on every table.
CREATE OR REPLACE FUNCTION public.is_demo_user()
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
