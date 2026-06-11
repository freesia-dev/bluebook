import { supabase } from '@/integrations/supabase/client';

export type CSProduk = 'simpeda' | 'simpeda_ib' | 'prama' | 'simpel' | 'tabunganku' | 'giro' | 'alamin' | 'taspen';
export type CSJenisKartu = 'simpeda' | 'prama' | 'tabunganku';
export type CSMutasiTipe = 'masuk' | 'keluar';
export type CSDepositoStatus = 'aktif' | 'cair' | 'pindah';
export type CSBukuProduk = 'simpeda' | 'simpeda_ib' | 'prama' | 'tabunganku' | 'simpel' | 'alamin' | 'bilyet_giro' | 'bilyet_deposito' | 'buku_cek';

export const PRODUK_LABELS: Record<CSProduk, string> = {
  simpeda: 'Simpeda',
  simpeda_ib: 'Simpeda IB',
  prama: 'Prama',
  simpel: 'Simpel',
  tabunganku: 'TabunganKu',
  giro: 'Giro',
  alamin: 'Al-Amin',
  taspen: 'Taspen',
};

export const BUKU_PRODUK_LABELS: Record<CSBukuProduk, string> = {
  simpeda: 'Simpeda',
  simpeda_ib: 'Simpeda IB',
  prama: 'Prama',
  tabunganku: 'TabunganKu',
  simpel: 'Simpel',
  alamin: 'Al-Amin',
  bilyet_giro: 'Bilyet Giro',
  bilyet_deposito: 'Bilyet Deposito',
  buku_cek: 'Buku Cek',
};

export const KARTU_LABELS: Record<CSJenisKartu, string> = {
  simpeda: 'Simpeda',
  prama: 'Prama',
  tabunganku: 'TabunganKu',
};

// ============ CIF ============
export interface CSCif {
  id: string;
  nomor_urut: number;
  cif: string;
  nama: string;
  tanggal_input: string;
  user_input: string | null;
  created_at: string;
}

export async function getCifList(): Promise<CSCif[]> {
  const { data, error } = await supabase.from('cs_cif').select('*').order('nomor_urut', { ascending: true });
  if (error) throw error;
  return (data || []) as CSCif[];
}

export async function getNextCifNomor(): Promise<number> {
  const { data } = await supabase.from('cs_cif').select('nomor_urut').order('nomor_urut', { ascending: false }).limit(1);
  return ((data?.[0]?.nomor_urut as number) || 0) + 1;
}

export async function getNextCifText(): Promise<string> {
  const { data } = await supabase.from('cs_cif').select('cif').order('created_at', { ascending: false }).limit(1);
  const last = data?.[0]?.cif as string | undefined;
  if (!last) return '';
  const m = String(last).match(/^(\D*)(\d+)$/);
  if (!m) return '';
  const inc = (BigInt(m[2]) + 1n).toString().padStart(m[2].length, '0');
  return m[1] + inc;
}

export async function addCif(input: Omit<CSCif, 'id' | 'created_at'>) {
  const { error } = await supabase.from('cs_cif').insert(input);
  if (error) throw error;
}

export async function updateCif(id: string, input: Partial<CSCif>) {
  const { error } = await supabase.from('cs_cif').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteCif(id: string) {
  const { error } = await supabase.from('cs_cif').delete().eq('id', id);
  if (error) throw error;
}

// ============ Rekening ============
export interface CSRekening {
  id: string;
  produk: CSProduk;
  nomor_urut: number;
  nomor_rekening: string;
  cif_id: string | null;
  cif: string | null;
  nama: string;
  tanggal_buka: string;
  keterangan: string | null;
  user_input: string | null;
  created_at: string;
}

export async function getRekeningList(produk: CSProduk): Promise<CSRekening[]> {
  const { data, error } = await supabase.from('cs_rekening').select('*').eq('produk', produk).order('nomor_urut', { ascending: true });
  if (error) throw error;
  return (data || []) as CSRekening[];
}

export async function getNextRekeningNomor(produk: CSProduk): Promise<number> {
  const { data } = await supabase.from('cs_rekening').select('nomor_urut').eq('produk', produk).order('nomor_urut', { ascending: false }).limit(1);
  return ((data?.[0]?.nomor_urut as number) || 0) + 1;
}

export async function getNextRekeningNumber(produk: CSProduk): Promise<string> {
  const { data } = await supabase.from('cs_rekening').select('nomor_rekening').eq('produk', produk).order('created_at', { ascending: false }).limit(1);
  const last = data?.[0]?.nomor_rekening as string | undefined;
  if (!last) return '';
  // Increment trailing numeric portion
  const m = last.match(/^(.*?)(\d+)$/);
  if (!m) return '';
  const inc = (BigInt(m[2]) + 1n).toString().padStart(m[2].length, '0');
  return m[1] + inc;
}

export async function addRekening(input: Omit<CSRekening, 'id' | 'created_at'>) {
  const { error } = await supabase.from('cs_rekening').insert(input);
  if (error) throw error;
}

export async function updateRekening(id: string, input: Partial<CSRekening>) {
  const { error } = await supabase.from('cs_rekening').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteRekening(id: string) {
  const { error } = await supabase.from('cs_rekening').delete().eq('id', id);
  if (error) throw error;
}

// ============ Kartu ATM ============
export interface CSKartuMutasi {
  id: string;
  jenis_kartu: CSJenisKartu;
  tipe: CSMutasiTipe;
  jumlah: number;
  tanggal: string;
  keterangan: string | null;
  user_input: string | null;
  created_at: string;
}

export async function getKartuMutasi(): Promise<CSKartuMutasi[]> {
  const { data, error } = await supabase.from('cs_kartu_atm_mutasi').select('*').order('tanggal', { ascending: false });
  if (error) throw error;
  return (data || []) as CSKartuMutasi[];
}

export async function addKartuMutasi(input: Omit<CSKartuMutasi, 'id' | 'created_at'>) {
  const { error } = await supabase.from('cs_kartu_atm_mutasi').insert(input);
  if (error) throw error;
}

export async function updateKartuMutasi(id: string, input: Partial<CSKartuMutasi>) {
  const { error } = await supabase.from('cs_kartu_atm_mutasi').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteKartuMutasi(id: string) {
  const { error } = await supabase.from('cs_kartu_atm_mutasi').delete().eq('id', id);
  if (error) throw error;
}

export function calcStokKartu(mutasi: CSKartuMutasi[]): Record<CSJenisKartu, number> {
  const init: Record<CSJenisKartu, number> = { simpeda: 0, prama: 0, tabunganku: 0 };
  for (const m of mutasi) {
    init[m.jenis_kartu] += m.tipe === 'masuk' ? m.jumlah : -m.jumlah;
  }
  return init;
}

// ============ Buku Tabungan ============
export interface CSBukuTabungan {
  id: string;
  tipe: CSMutasiTipe;
  jumlah: number;
  tanggal: string;
  cif: string | null;
  nama: string | null;
  nomor_rekening: string | null;
  keterangan: string | null;
  user_input: string | null;
  created_at: string;
}

export async function getBukuList(): Promise<CSBukuTabungan[]> {
  const { data, error } = await supabase.from('cs_buku_tabungan').select('*').order('tanggal', { ascending: false });
  if (error) throw error;
  return (data || []) as CSBukuTabungan[];
}

export async function addBuku(input: Omit<CSBukuTabungan, 'id' | 'created_at'>) {
  const { error } = await supabase.from('cs_buku_tabungan').insert(input);
  if (error) throw error;
}

export async function updateBuku(id: string, input: Partial<CSBukuTabungan>) {
  const { error } = await supabase.from('cs_buku_tabungan').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteBuku(id: string) {
  const { error } = await supabase.from('cs_buku_tabungan').delete().eq('id', id);
  if (error) throw error;
}

// ============ Bilyet Deposito ============
export interface CSBilyet {
  id: string;
  nomor_urut: number;
  nomor_bilyet: string;
  cif: string | null;
  nama: string;
  nominal: number;
  jangka_waktu_bulan: number | null;
  tanggal_terbit: string;
  tanggal_jatuh_tempo: string | null;
  status: CSDepositoStatus;
  keterangan: string | null;
  user_input: string | null;
  created_at: string;
}

export async function getBilyetList(): Promise<CSBilyet[]> {
  const { data, error } = await supabase.from('cs_bilyet_deposito').select('*').order('nomor_urut', { ascending: true });
  if (error) throw error;
  return (data || []) as CSBilyet[];
}

export async function getNextBilyetNomor(): Promise<number> {
  const { data } = await supabase.from('cs_bilyet_deposito').select('nomor_urut').order('nomor_urut', { ascending: false }).limit(1);
  return ((data?.[0]?.nomor_urut as number) || 0) + 1;
}

export async function addBilyet(input: Omit<CSBilyet, 'id' | 'created_at'>) {
  const { error } = await supabase.from('cs_bilyet_deposito').insert(input);
  if (error) throw error;
}

export async function updateBilyet(id: string, input: Partial<CSBilyet>) {
  const { error } = await supabase.from('cs_bilyet_deposito').update(input).eq('id', id);
  if (error) throw error;
}

export async function deleteBilyet(id: string) {
  const { error } = await supabase.from('cs_bilyet_deposito').delete().eq('id', id);
  if (error) throw error;
}
