-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Anyone can read users for login" ON app_users;
DROP POLICY IF EXISTS "Anyone can insert users" ON app_users;
DROP POLICY IF EXISTS "Anyone can update users" ON app_users;
DROP POLICY IF EXISTS "Anyone can delete users" ON app_users;

DROP POLICY IF EXISTS "Anyone can read surat_masuk" ON surat_masuk;
DROP POLICY IF EXISTS "Anyone can insert surat_masuk" ON surat_masuk;
DROP POLICY IF EXISTS "Anyone can update surat_masuk" ON surat_masuk;
DROP POLICY IF EXISTS "Anyone can delete surat_masuk" ON surat_masuk;

DROP POLICY IF EXISTS "Anyone can read surat_keluar" ON surat_keluar;
DROP POLICY IF EXISTS "Anyone can insert surat_keluar" ON surat_keluar;
DROP POLICY IF EXISTS "Anyone can update surat_keluar" ON surat_keluar;
DROP POLICY IF EXISTS "Anyone can delete surat_keluar" ON surat_keluar;

DROP POLICY IF EXISTS "Anyone can read agenda_kredit_entry" ON agenda_kredit_entry;
DROP POLICY IF EXISTS "Anyone can insert agenda_kredit_entry" ON agenda_kredit_entry;
DROP POLICY IF EXISTS "Anyone can update agenda_kredit_entry" ON agenda_kredit_entry;
DROP POLICY IF EXISTS "Anyone can delete agenda_kredit_entry" ON agenda_kredit_entry;

DROP POLICY IF EXISTS "Anyone can read sppk" ON sppk;
DROP POLICY IF EXISTS "Anyone can insert sppk" ON sppk;
DROP POLICY IF EXISTS "Anyone can update sppk" ON sppk;
DROP POLICY IF EXISTS "Anyone can delete sppk" ON sppk;

DROP POLICY IF EXISTS "Anyone can read pk" ON pk;
DROP POLICY IF EXISTS "Anyone can insert pk" ON pk;
DROP POLICY IF EXISTS "Anyone can update pk" ON pk;
DROP POLICY IF EXISTS "Anyone can delete pk" ON pk;

DROP POLICY IF EXISTS "Anyone can read kkmpak" ON kkmpak;
DROP POLICY IF EXISTS "Anyone can insert kkmpak" ON kkmpak;
DROP POLICY IF EXISTS "Anyone can update kkmpak" ON kkmpak;
DROP POLICY IF EXISTS "Anyone can delete kkmpak" ON kkmpak;

DROP POLICY IF EXISTS "Anyone can read jenis_kredit" ON jenis_kredit;
DROP POLICY IF EXISTS "Anyone can insert jenis_kredit" ON jenis_kredit;
DROP POLICY IF EXISTS "Anyone can update jenis_kredit" ON jenis_kredit;
DROP POLICY IF EXISTS "Anyone can delete jenis_kredit" ON jenis_kredit;

DROP POLICY IF EXISTS "Anyone can read jenis_debitur" ON jenis_debitur;
DROP POLICY IF EXISTS "Anyone can insert jenis_debitur" ON jenis_debitur;
DROP POLICY IF EXISTS "Anyone can update jenis_debitur" ON jenis_debitur;
DROP POLICY IF EXISTS "Anyone can delete jenis_debitur" ON jenis_debitur;

DROP POLICY IF EXISTS "Anyone can read kode_fasilitas" ON kode_fasilitas;
DROP POLICY IF EXISTS "Anyone can insert kode_fasilitas" ON kode_fasilitas;
DROP POLICY IF EXISTS "Anyone can update kode_fasilitas" ON kode_fasilitas;
DROP POLICY IF EXISTS "Anyone can delete kode_fasilitas" ON kode_fasilitas;

DROP POLICY IF EXISTS "Anyone can read sektor_ekonomi" ON sektor_ekonomi;
DROP POLICY IF EXISTS "Anyone can insert sektor_ekonomi" ON sektor_ekonomi;
DROP POLICY IF EXISTS "Anyone can update sektor_ekonomi" ON sektor_ekonomi;
DROP POLICY IF EXISTS "Anyone can delete sektor_ekonomi" ON sektor_ekonomi;

-- Create user_roles table (roles MUST be in separate table)
CREATE TABLE IF NOT EXISTS public.user_roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to check if user is authenticated
CREATE OR REPLACE FUNCTION public.is_authenticated()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.role() = 'authenticated'
$$;

-- User roles policies (admins can manage, users can read their own)
CREATE POLICY "Users can read own role" ON user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can read all roles" ON user_roles
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert roles" ON user_roles
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update roles" ON user_roles
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete roles" ON user_roles
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- app_users policies (authenticated users only)
CREATE POLICY "Authenticated can read app_users" ON app_users
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can insert app_users" ON app_users
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update app_users" ON app_users
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete app_users" ON app_users
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- surat_masuk policies
CREATE POLICY "Authenticated can read surat_masuk" ON surat_masuk
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert surat_masuk" ON surat_masuk
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update surat_masuk" ON surat_masuk
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Admins can delete surat_masuk" ON surat_masuk
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- surat_keluar policies
CREATE POLICY "Authenticated can read surat_keluar" ON surat_keluar
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert surat_keluar" ON surat_keluar
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update surat_keluar" ON surat_keluar
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Admins can delete surat_keluar" ON surat_keluar
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- agenda_kredit_entry policies
CREATE POLICY "Authenticated can read agenda_kredit_entry" ON agenda_kredit_entry
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert agenda_kredit_entry" ON agenda_kredit_entry
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update agenda_kredit_entry" ON agenda_kredit_entry
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Admins can delete agenda_kredit_entry" ON agenda_kredit_entry
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- sppk policies
CREATE POLICY "Authenticated can read sppk" ON sppk
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert sppk" ON sppk
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update sppk" ON sppk
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Admins can delete sppk" ON sppk
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- pk policies
CREATE POLICY "Authenticated can read pk" ON pk
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert pk" ON pk
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update pk" ON pk
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Admins can delete pk" ON pk
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- kkmpak policies
CREATE POLICY "Authenticated can read kkmpak" ON kkmpak
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated can insert kkmpak" ON kkmpak
FOR INSERT TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated can update kkmpak" ON kkmpak
FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Admins can delete kkmpak" ON kkmpak
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Config tables policies (authenticated can read, admins can modify)
CREATE POLICY "Authenticated can read jenis_kredit" ON jenis_kredit
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can insert jenis_kredit" ON jenis_kredit
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update jenis_kredit" ON jenis_kredit
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete jenis_kredit" ON jenis_kredit
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read jenis_debitur" ON jenis_debitur
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can insert jenis_debitur" ON jenis_debitur
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update jenis_debitur" ON jenis_debitur
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete jenis_debitur" ON jenis_debitur
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read kode_fasilitas" ON kode_fasilitas
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can insert kode_fasilitas" ON kode_fasilitas
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update kode_fasilitas" ON kode_fasilitas
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete kode_fasilitas" ON kode_fasilitas
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can read sektor_ekonomi" ON sektor_ekonomi
FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Admins can insert sektor_ekonomi" ON sektor_ekonomi
FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update sektor_ekonomi" ON sektor_ekonomi
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete sektor_ekonomi" ON sektor_ekonomi
FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));