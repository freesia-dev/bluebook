
-- Helper: detect demo users
CREATE OR REPLACE FUNCTION public.is_demo_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'demo'
  );
$$;

-- Generic policy replacement for main data tables.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'surat_masuk','surat_keluar','agenda_kredit_entry','sppk','pk','kkmpak',
    'nomor_loan','pengisian_atm','kartu_tertelan','selisih_atm',
    'penyelesaian_selisih','debitur_kontak','wa_template','wa_reminder_log'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- drop legacy permissive insert/update if present
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated can insert %1$s" ON public.%1$I;', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated can update %1$s" ON public.%1$I;', t);

    -- new policies: any authenticated user except demo
    EXECUTE format($p$
      CREATE POLICY "Non-demo can insert %1$s" ON public.%1$I
      FOR INSERT TO authenticated
      WITH CHECK (NOT public.is_demo_user());
    $p$, t);

    EXECUTE format($p$
      CREATE POLICY "Non-demo can update %1$s" ON public.%1$I
      FOR UPDATE TO authenticated
      USING (NOT public.is_demo_user())
      WITH CHECK (NOT public.is_demo_user());
    $p$, t);
  END LOOP;
END $$;
