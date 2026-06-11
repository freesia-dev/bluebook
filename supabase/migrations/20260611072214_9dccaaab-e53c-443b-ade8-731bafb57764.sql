
-- 1. activity_log: enforce user_id = auth.uid()
DROP POLICY IF EXISTS "Authenticated can insert activity_log" ON public.activity_log;
CREATE POLICY "Authenticated can insert activity_log" ON public.activity_log
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 2. mlf_uploads / mlf_data: restrict INSERT to monitoring-capable roles
DROP POLICY IF EXISTS "Authenticated can insert mlf_uploads" ON public.mlf_uploads;
CREATE POLICY "Authorized can insert mlf_uploads" ON public.mlf_uploads
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'user'::app_role)
    OR has_role(auth.uid(), 'officer_rk'::app_role)
    OR has_role(auth.uid(), 'officer_kredit'::app_role)
    OR has_role(auth.uid(), 'staff_admin_kcp'::app_role)
    OR has_role(auth.uid(), 'meranti'::app_role)
  );

DROP POLICY IF EXISTS "Authenticated can insert mlf_data" ON public.mlf_data;
CREATE POLICY "Authorized can insert mlf_data" ON public.mlf_data
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'user'::app_role)
    OR has_role(auth.uid(), 'officer_rk'::app_role)
    OR has_role(auth.uid(), 'officer_kredit'::app_role)
    OR has_role(auth.uid(), 'staff_admin_kcp'::app_role)
    OR has_role(auth.uid(), 'meranti'::app_role)
  );

-- 3. atm_config: restrict SELECT to authenticated role only
DROP POLICY IF EXISTS "Authenticated can read atm_config" ON public.atm_config;
CREATE POLICY "Authenticated can read atm_config" ON public.atm_config
  FOR SELECT TO authenticated
  USING (true);

-- 4. jenis_penggunaan: restrict SELECT to authenticated
DROP POLICY IF EXISTS "Authenticated can read jenis_penggunaan" ON public.jenis_penggunaan;
CREATE POLICY "Authenticated can read jenis_penggunaan" ON public.jenis_penggunaan
  FOR SELECT TO authenticated
  USING (true);

-- 5. can_use_loan_calc: require authenticated user with a role row
CREATE OR REPLACE FUNCTION public.can_use_loan_calc()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL
    AND EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid())
    AND NOT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
        AND role::text IN ('security','ob','teller','cs')
    );
$$;

-- 6. storage.objects documents UPDATE: owner check
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
CREATE POLICY "Authenticated users can update documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND owner = auth.uid())
  WITH CHECK (bucket_id = 'documents' AND owner = auth.uid());
