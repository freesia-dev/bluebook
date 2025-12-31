-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create users table (for app-specific user data, NOT auth.users)
CREATE TABLE public.app_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read users (for login)
CREATE POLICY "Anyone can read users for login" 
ON public.app_users FOR SELECT 
USING (true);

-- Policy: Only admins can insert/update/delete (we'll handle this in app logic for now)
CREATE POLICY "Anyone can insert users" 
ON public.app_users FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update users" 
ON public.app_users FOR UPDATE 
USING (true);

CREATE POLICY "Anyone can delete users" 
ON public.app_users FOR DELETE 
USING (true);

-- Create surat_masuk table
CREATE TABLE public.surat_masuk (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor INTEGER NOT NULL,
  nomor_agenda TEXT NOT NULL,
  kode_surat TEXT NOT NULL,
  nomor_surat_masuk TEXT NOT NULL,
  nama_pengirim TEXT NOT NULL,
  perihal TEXT NOT NULL,
  tujuan_disposisi TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Belum Disposisi',
  keterangan TEXT,
  user_input TEXT NOT NULL,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.surat_masuk ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read surat_masuk" ON public.surat_masuk FOR SELECT USING (true);
CREATE POLICY "Anyone can insert surat_masuk" ON public.surat_masuk FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update surat_masuk" ON public.surat_masuk FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete surat_masuk" ON public.surat_masuk FOR DELETE USING (true);

-- Create surat_keluar table
CREATE TABLE public.surat_keluar (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor INTEGER NOT NULL,
  nomor_agenda TEXT NOT NULL,
  kode_surat TEXT NOT NULL,
  nama_penerima TEXT NOT NULL,
  perihal TEXT NOT NULL,
  tujuan_surat TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Belum Dikirim',
  keterangan TEXT,
  user_input TEXT NOT NULL,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.surat_keluar ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read surat_keluar" ON public.surat_keluar FOR SELECT USING (true);
CREATE POLICY "Anyone can insert surat_keluar" ON public.surat_keluar FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update surat_keluar" ON public.surat_keluar FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete surat_keluar" ON public.surat_keluar FOR DELETE USING (true);

-- Create agenda_kredit_entry table
CREATE TABLE public.agenda_kredit_entry (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor INTEGER NOT NULL,
  nomor_agenda TEXT NOT NULL,
  kode_surat TEXT NOT NULL,
  nomor_surat_masuk TEXT NOT NULL,
  nama_pengirim TEXT NOT NULL,
  perihal TEXT NOT NULL,
  tujuan_disposisi TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Belum Disposisi',
  keterangan TEXT,
  user_input TEXT NOT NULL,
  file_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.agenda_kredit_entry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read agenda_kredit_entry" ON public.agenda_kredit_entry FOR SELECT USING (true);
CREATE POLICY "Anyone can insert agenda_kredit_entry" ON public.agenda_kredit_entry FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update agenda_kredit_entry" ON public.agenda_kredit_entry FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete agenda_kredit_entry" ON public.agenda_kredit_entry FOR DELETE USING (true);

-- Create SPPK table
CREATE TABLE public.sppk (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor INTEGER NOT NULL,
  nomor_sppk TEXT NOT NULL,
  nama_debitur TEXT NOT NULL,
  jenis_kredit TEXT NOT NULL,
  plafon BIGINT NOT NULL,
  jangka_waktu TEXT NOT NULL,
  marketing TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('telihan', 'meranti')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.sppk ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sppk" ON public.sppk FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sppk" ON public.sppk FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sppk" ON public.sppk FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sppk" ON public.sppk FOR DELETE USING (true);

-- Create PK table
CREATE TABLE public.pk (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor INTEGER NOT NULL,
  nomor_pk TEXT NOT NULL,
  nama_debitur TEXT NOT NULL,
  jenis_kredit TEXT NOT NULL,
  plafon BIGINT NOT NULL,
  jangka_waktu TEXT NOT NULL,
  jenis_debitur TEXT NOT NULL,
  kode_fasilitas TEXT NOT NULL,
  sektor_ekonomi TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('telihan', 'meranti')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pk ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read pk" ON public.pk FOR SELECT USING (true);
CREATE POLICY "Anyone can insert pk" ON public.pk FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update pk" ON public.pk FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete pk" ON public.pk FOR DELETE USING (true);

-- Create KKMPAK table
CREATE TABLE public.kkmpak (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor INTEGER NOT NULL,
  nomor_kk TEXT NOT NULL,
  nomor_mpak TEXT NOT NULL,
  nama_debitur TEXT NOT NULL,
  jenis_kredit TEXT NOT NULL,
  plafon BIGINT NOT NULL,
  jangka_waktu TEXT NOT NULL,
  jenis_debitur TEXT NOT NULL,
  kode_fasilitas TEXT NOT NULL,
  sektor_ekonomi TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('telihan', 'meranti')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kkmpak ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read kkmpak" ON public.kkmpak FOR SELECT USING (true);
CREATE POLICY "Anyone can insert kkmpak" ON public.kkmpak FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update kkmpak" ON public.kkmpak FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete kkmpak" ON public.kkmpak FOR DELETE USING (true);

-- Create jenis_kredit table
CREATE TABLE public.jenis_kredit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  produk_kredit TEXT NOT NULL
);

ALTER TABLE public.jenis_kredit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read jenis_kredit" ON public.jenis_kredit FOR SELECT USING (true);
CREATE POLICY "Anyone can insert jenis_kredit" ON public.jenis_kredit FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update jenis_kredit" ON public.jenis_kredit FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete jenis_kredit" ON public.jenis_kredit FOR DELETE USING (true);

-- Create jenis_debitur table
CREATE TABLE public.jenis_debitur (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kode TEXT NOT NULL,
  keterangan TEXT NOT NULL
);

ALTER TABLE public.jenis_debitur ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read jenis_debitur" ON public.jenis_debitur FOR SELECT USING (true);
CREATE POLICY "Anyone can insert jenis_debitur" ON public.jenis_debitur FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update jenis_debitur" ON public.jenis_debitur FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete jenis_debitur" ON public.jenis_debitur FOR DELETE USING (true);

-- Create kode_fasilitas table
CREATE TABLE public.kode_fasilitas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kode TEXT NOT NULL,
  keterangan TEXT NOT NULL
);

ALTER TABLE public.kode_fasilitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read kode_fasilitas" ON public.kode_fasilitas FOR SELECT USING (true);
CREATE POLICY "Anyone can insert kode_fasilitas" ON public.kode_fasilitas FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update kode_fasilitas" ON public.kode_fasilitas FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete kode_fasilitas" ON public.kode_fasilitas FOR DELETE USING (true);

-- Create sektor_ekonomi table
CREATE TABLE public.sektor_ekonomi (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  kode TEXT NOT NULL,
  keterangan TEXT NOT NULL
);

ALTER TABLE public.sektor_ekonomi ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read sektor_ekonomi" ON public.sektor_ekonomi FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sektor_ekonomi" ON public.sektor_ekonomi FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sektor_ekonomi" ON public.sektor_ekonomi FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sektor_ekonomi" ON public.sektor_ekonomi FOR DELETE USING (true);

-- Insert default users
INSERT INTO public.app_users (nama, username, password, role, keterangan) VALUES
  ('Administrator', 'admin', 'admin123', 'admin', 'Admin Utama Sistem'),
  ('User Demo', 'user', 'user123', 'user', 'User Demo');

-- Insert default jenis kredit
INSERT INTO public.jenis_kredit (nama, produk_kredit) VALUES
  ('Kredit Modal Kerja', 'KMK Umum'),
  ('Kredit Investasi', 'KI Umum'),
  ('Kredit Konsumtif', 'KK Pegawai'),
  ('Kredit Multiguna', 'Multiguna'),
  ('KPR', 'KPR Griya');

-- Insert default jenis debitur
INSERT INTO public.jenis_debitur (kode, keterangan) VALUES
  ('001', 'Perorangan'),
  ('002', 'Badan Usaha'),
  ('003', 'Koperasi');

-- Insert default kode fasilitas
INSERT INTO public.kode_fasilitas (kode, keterangan) VALUES
  ('01', 'Rekening Koran'),
  ('02', 'Demand Loan'),
  ('03', 'Fixed Loan');

-- Insert default sektor ekonomi
INSERT INTO public.sektor_ekonomi (kode, keterangan) VALUES
  ('0101', 'Pertanian'),
  ('0201', 'Pertambangan'),
  ('0301', 'Industri Pengolahan'),
  ('0401', 'Perdagangan');