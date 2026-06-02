
-- Fix: Restrict SELECT policies to authenticated role only (were public)
DROP POLICY IF EXISTS "Authenticated can read kartu_tertelan" ON public.kartu_tertelan;
CREATE POLICY "Authenticated can read kartu_tertelan" ON public.kartu_tertelan
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can read nomor_loan" ON public.nomor_loan;
CREATE POLICY "Authenticated can read nomor_loan" ON public.nomor_loan
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can read pengisian_atm" ON public.pengisian_atm;
CREATE POLICY "Authenticated can read pengisian_atm" ON public.pengisian_atm
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can read selisih_atm" ON public.selisih_atm;
CREATE POLICY "Authenticated can read selisih_atm" ON public.selisih_atm
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can read penyelesaian_selisih" ON public.penyelesaian_selisih;
CREATE POLICY "Authenticated can read penyelesaian_selisih" ON public.penyelesaian_selisih
  FOR SELECT TO authenticated USING (true);

-- Fix: activity_log INSERT should be restricted to authenticated (was public/anon)
DROP POLICY IF EXISTS "Authenticated can insert activity_log" ON public.activity_log;
CREATE POLICY "Authenticated can insert activity_log" ON public.activity_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);

-- Tighten activity_log SELECTs to authenticated
DROP POLICY IF EXISTS "Admins can read activity_log" ON public.activity_log;
CREATE POLICY "Admins can read activity_log" ON public.activity_log
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can read own activity_log" ON public.activity_log;
CREATE POLICY "Users can read own activity_log" ON public.activity_log
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Tighten DELETE admin policies on financial tables to authenticated role
DROP POLICY IF EXISTS "Admins can delete kartu_tertelan" ON public.kartu_tertelan;
CREATE POLICY "Admins can delete kartu_tertelan" ON public.kartu_tertelan
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete nomor_loan" ON public.nomor_loan;
CREATE POLICY "Admins can delete nomor_loan" ON public.nomor_loan
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete pengisian_atm" ON public.pengisian_atm;
CREATE POLICY "Admins can delete pengisian_atm" ON public.pengisian_atm
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete selisih_atm" ON public.selisih_atm;
CREATE POLICY "Admins can delete selisih_atm" ON public.selisih_atm
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Admins can delete penyelesaian_selisih" ON public.penyelesaian_selisih;
CREATE POLICY "Admins can delete penyelesaian_selisih" ON public.penyelesaian_selisih
  FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Revoke anon access on financial / sensitive tables (defense in depth)
REVOKE ALL ON public.kartu_tertelan FROM anon;
REVOKE ALL ON public.nomor_loan FROM anon;
REVOKE ALL ON public.pengisian_atm FROM anon;
REVOKE ALL ON public.selisih_atm FROM anon;
REVOKE ALL ON public.penyelesaian_selisih FROM anon;
REVOKE ALL ON public.activity_log FROM anon;
