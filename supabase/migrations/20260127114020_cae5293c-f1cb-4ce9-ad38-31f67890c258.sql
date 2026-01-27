-- Create table for ATM configuration (petugas, pemimpin, dll)
CREATE TABLE public.atm_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nama TEXT NOT NULL,
  jabatan TEXT NOT NULL,
  keterangan TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.atm_config ENABLE ROW LEVEL SECURITY;

-- RLS policies for atm_config
CREATE POLICY "Authenticated can read atm_config" ON public.atm_config FOR SELECT USING (true);
CREATE POLICY "Admins can insert atm_config" ON public.atm_config FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can update atm_config" ON public.atm_config FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins can delete atm_config" ON public.atm_config FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create table for ATM pengisian database
CREATE TABLE public.pengisian_atm (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nomor INTEGER NOT NULL,
  hari TEXT NOT NULL,
  tanggal DATE NOT NULL,
  jam TEXT NOT NULL,
  
  -- Sisa Cartridge
  sisa_cartridge_1 INTEGER NOT NULL DEFAULT 0,
  sisa_cartridge_2 INTEGER NOT NULL DEFAULT 0,
  sisa_cartridge_3 INTEGER NOT NULL DEFAULT 0,
  sisa_cartridge_4 INTEGER NOT NULL DEFAULT 0,
  
  -- Tambah Cartridge  
  tambah_cartridge_1 INTEGER NOT NULL DEFAULT 0,
  tambah_cartridge_2 INTEGER NOT NULL DEFAULT 0,
  tambah_cartridge_3 INTEGER NOT NULL DEFAULT 0,
  tambah_cartridge_4 INTEGER NOT NULL DEFAULT 0,
  
  -- Saldo dan Kartu
  saldo_buku_besar BIGINT NOT NULL DEFAULT 0,
  kartu_tertelan INTEGER NOT NULL DEFAULT 0,
  terbilang TEXT,
  notes TEXT,
  
  -- Selisih
  jumlah_selisih BIGINT NOT NULL DEFAULT 0,
  keterangan_selisih TEXT,
  
  -- Setoran
  nama_teller TEXT,
  jumlah_disetor BIGINT NOT NULL DEFAULT 0,
  setor_ke_rek_titipan BIGINT NOT NULL DEFAULT 0,
  yang_menyerahkan TEXT,
  teller_selisih TEXT,
  retracts INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_input TEXT NOT NULL
);

-- Enable RLS
ALTER TABLE public.pengisian_atm ENABLE ROW LEVEL SECURITY;

-- RLS policies for pengisian_atm
CREATE POLICY "Authenticated can read pengisian_atm" ON public.pengisian_atm FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert pengisian_atm" ON public.pengisian_atm FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can update pengisian_atm" ON public.pengisian_atm FOR UPDATE USING (true);
CREATE POLICY "Admins can delete pengisian_atm" ON public.pengisian_atm FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create table for kartu tertelan detail
CREATE TABLE public.kartu_tertelan (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pengisian_atm_id UUID REFERENCES public.pengisian_atm(id) ON DELETE CASCADE,
  nomor_kartu TEXT NOT NULL,
  nama_nasabah TEXT,
  bank TEXT NOT NULL DEFAULT 'BANKALTIMTARA',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kartu_tertelan ENABLE ROW LEVEL SECURITY;

-- RLS policies for kartu_tertelan
CREATE POLICY "Authenticated can read kartu_tertelan" ON public.kartu_tertelan FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert kartu_tertelan" ON public.kartu_tertelan FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can update kartu_tertelan" ON public.kartu_tertelan FOR UPDATE USING (true);
CREATE POLICY "Admins can delete kartu_tertelan" ON public.kartu_tertelan FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));

-- Create table for selisih detail
CREATE TABLE public.selisih_atm (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pengisian_atm_id UUID REFERENCES public.pengisian_atm(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL,
  no_reff TEXT,
  nominal BIGINT NOT NULL DEFAULT 0,
  keterangan TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.selisih_atm ENABLE ROW LEVEL SECURITY;

-- RLS policies for selisih_atm
CREATE POLICY "Authenticated can read selisih_atm" ON public.selisih_atm FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert selisih_atm" ON public.selisih_atm FOR INSERT WITH CHECK (true);
CREATE POLICY "Authenticated can update selisih_atm" ON public.selisih_atm FOR UPDATE USING (true);
CREATE POLICY "Admins can delete selisih_atm" ON public.selisih_atm FOR DELETE USING (has_role(auth.uid(), 'admin'::app_role));