-- Add tanggal column to surat_keluar
ALTER TABLE public.surat_keluar ADD COLUMN tanggal timestamp with time zone DEFAULT now();

-- Add tanggal column to sppk
ALTER TABLE public.sppk ADD COLUMN tanggal timestamp with time zone DEFAULT now();

-- Add tanggal column to pk
ALTER TABLE public.pk ADD COLUMN tanggal timestamp with time zone DEFAULT now();

-- Add tanggal column to kkmpak
ALTER TABLE public.kkmpak ADD COLUMN tanggal timestamp with time zone DEFAULT now();

-- Add tanggal column to nomor_loan
ALTER TABLE public.nomor_loan ADD COLUMN tanggal timestamp with time zone DEFAULT now();