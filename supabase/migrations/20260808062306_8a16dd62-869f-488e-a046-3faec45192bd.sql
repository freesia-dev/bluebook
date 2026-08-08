CREATE TABLE public.proyeksi_kredit (
  id uuid primary key default gen_random_uuid(),
  unit text not null default 'telihan',
  nama_debitur text not null,
  jenis_kredit text not null default 'Konsumtif',
  plafon bigint not null default 0,
  jangka_waktu_bulan integer not null default 0,
  keterangan text,
  periode date,
  created_by uuid,
  created_by_nama text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.proyeksi_kredit TO authenticated;
GRANT ALL ON public.proyeksi_kredit TO service_role;

ALTER TABLE public.proyeksi_kredit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view proyeksi" ON public.proyeksi_kredit
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated can insert proyeksi" ON public.proyeksi_kredit
FOR INSERT TO authenticated WITH CHECK (NOT public.is_readonly_user());

CREATE POLICY "Authenticated can update proyeksi" ON public.proyeksi_kredit
FOR UPDATE TO authenticated USING (NOT public.is_readonly_user());

CREATE POLICY "Authenticated can delete proyeksi" ON public.proyeksi_kredit
FOR DELETE TO authenticated USING (NOT public.is_readonly_user());