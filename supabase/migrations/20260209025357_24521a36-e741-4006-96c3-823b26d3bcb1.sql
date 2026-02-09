
-- Add nama_nasabah and nomor_kartu columns to selisih_atm
ALTER TABLE public.selisih_atm
ADD COLUMN nama_nasabah TEXT,
ADD COLUMN nomor_kartu TEXT;
