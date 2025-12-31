import { supabase } from '@/integrations/supabase/client';
import { 
  UserRole, SuratMasuk, SuratKeluar, SPPK, PK, KKMPAK,
  JenisKredit, JenisDebitur, KodeFasilitas, SektorEkonomi, AgendaKreditEntry
} from '@/types';
import { toRomanMonth } from './store';

// ============= USER ROLE FUNCTIONS =============
export const getUserRoles = async (): Promise<UserRole[]> => {
  const { data, error } = await supabase
    .from('user_roles')
    .select('*');
  
  if (error) throw error;
  
  return data.map(r => ({
    id: r.id,
    userId: r.user_id,
    role: r.role as 'admin' | 'user'
  }));
};

export const addUserRole = async (userId: string, role: 'admin' | 'user'): Promise<UserRole> => {
  const { data, error } = await supabase
    .from('user_roles')
    .insert({
      user_id: userId,
      role: role
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: data.id,
    userId: data.user_id,
    role: data.role as 'admin' | 'user'
  };
};

export const updateUserRole = async (id: string, role: 'admin' | 'user'): Promise<void> => {
  const { error } = await supabase
    .from('user_roles')
    .update({ role })
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteUserRole = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('user_roles')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Note: Authentication is handled via Supabase Auth

// ============= SURAT MASUK FUNCTIONS =============
export const getSuratMasuk = async (): Promise<SuratMasuk[]> => {
  const { data, error } = await supabase
    .from('surat_masuk')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  
  return data.map(s => ({
    id: s.id,
    nomor: s.nomor,
    nomorAgenda: s.nomor_agenda,
    kodeSurat: s.kode_surat,
    nomorSuratMasuk: s.nomor_surat_masuk,
    namaPengirim: s.nama_pengirim,
    perihal: s.perihal,
    tujuanDisposisi: s.tujuan_disposisi,
    status: s.status as 'Belum Disposisi' | 'Sudah Disposisi',
    keterangan: s.keterangan || '',
    userInput: s.user_input,
    fileUrl: s.file_url || undefined,
    tanggalMasuk: new Date((s as any).tanggal_masuk || s.created_at),
    createdAt: new Date(s.created_at)
  }));
};

export const addSuratMasuk = async (data: Omit<SuratMasuk, 'id' | 'nomor' | 'nomorAgenda' | 'createdAt'>): Promise<SuratMasuk> => {
  // Get next nomor
  const { data: existing } = await supabase
    .from('surat_masuk')
    .select('nomor')
    .order('nomor', { ascending: false })
    .limit(1);
  
  const nomor = (existing && existing.length > 0 ? existing[0].nomor : 0) + 1;
  const tanggalMasuk = data.tanggalMasuk || new Date();
  const nomorAgenda = `${String(nomor).padStart(3, '0')}/${data.kodeSurat}/BPD-TLH/${toRomanMonth(tanggalMasuk.getMonth())}/${tanggalMasuk.getFullYear()}`;
  
  const { data: result, error } = await supabase
    .from('surat_masuk')
    .insert({
      nomor,
      nomor_agenda: nomorAgenda,
      kode_surat: data.kodeSurat,
      nomor_surat_masuk: data.nomorSuratMasuk,
      nama_pengirim: data.namaPengirim,
      perihal: data.perihal,
      tujuan_disposisi: data.tujuanDisposisi,
      status: data.status,
      keterangan: data.keterangan,
      user_input: data.userInput,
      file_url: data.fileUrl,
      tanggal_masuk: tanggalMasuk.toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: result.id,
    nomor: result.nomor,
    nomorAgenda: result.nomor_agenda,
    kodeSurat: result.kode_surat,
    nomorSuratMasuk: result.nomor_surat_masuk,
    namaPengirim: result.nama_pengirim,
    perihal: result.perihal,
    tujuanDisposisi: result.tujuan_disposisi,
    status: result.status as 'Belum Disposisi' | 'Sudah Disposisi',
    keterangan: result.keterangan || '',
    userInput: result.user_input,
    fileUrl: result.file_url || undefined,
    tanggalMasuk: new Date((result as any).tanggal_masuk || result.created_at),
    createdAt: new Date(result.created_at)
  };
};

export const updateSuratMasuk = async (id: string, data: Partial<SuratMasuk>): Promise<void> => {
  const updateData: Record<string, unknown> = {};
  if (data.kodeSurat !== undefined) updateData.kode_surat = data.kodeSurat;
  if (data.nomorSuratMasuk !== undefined) updateData.nomor_surat_masuk = data.nomorSuratMasuk;
  if (data.namaPengirim !== undefined) updateData.nama_pengirim = data.namaPengirim;
  if (data.perihal !== undefined) updateData.perihal = data.perihal;
  if (data.tujuanDisposisi !== undefined) updateData.tujuan_disposisi = data.tujuanDisposisi;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.keterangan !== undefined) updateData.keterangan = data.keterangan;
  if (data.fileUrl !== undefined) updateData.file_url = data.fileUrl;
  if (data.tanggalMasuk !== undefined) updateData.tanggal_masuk = data.tanggalMasuk.toISOString();
  
  const { error } = await supabase
    .from('surat_masuk')
    .update(updateData)
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteSuratMasuk = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('surat_masuk')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ============= SURAT KELUAR FUNCTIONS =============
export const getSuratKeluar = async (): Promise<SuratKeluar[]> => {
  const { data, error } = await supabase
    .from('surat_keluar')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  
  return data.map(s => ({
    id: s.id,
    nomor: s.nomor,
    nomorAgenda: s.nomor_agenda,
    kodeSurat: s.kode_surat,
    namaPenerima: s.nama_penerima,
    perihal: s.perihal,
    tujuanSurat: s.tujuan_surat,
    status: s.status as 'Belum Dikirim' | 'Sudah Dikirim',
    keterangan: s.keterangan || '',
    userInput: s.user_input,
    fileUrl: s.file_url || undefined,
    createdAt: new Date(s.created_at)
  }));
};

export const addSuratKeluar = async (data: Omit<SuratKeluar, 'id' | 'nomor' | 'nomorAgenda' | 'createdAt'>): Promise<SuratKeluar> => {
  const { data: existing } = await supabase
    .from('surat_keluar')
    .select('nomor')
    .order('nomor', { ascending: false })
    .limit(1);
  
  const nomor = (existing && existing.length > 0 ? existing[0].nomor : 0) + 1;
  const now = new Date();
  const nomorAgenda = `${String(nomor).padStart(3, '0')}/${data.kodeSurat}/BPD-TLH/${toRomanMonth(now.getMonth())}/${now.getFullYear()}`;
  
  const { data: result, error } = await supabase
    .from('surat_keluar')
    .insert({
      nomor,
      nomor_agenda: nomorAgenda,
      kode_surat: data.kodeSurat,
      nama_penerima: data.namaPenerima,
      perihal: data.perihal,
      tujuan_surat: data.tujuanSurat,
      status: data.status,
      keterangan: data.keterangan,
      user_input: data.userInput,
      file_url: data.fileUrl
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: result.id,
    nomor: result.nomor,
    nomorAgenda: result.nomor_agenda,
    kodeSurat: result.kode_surat,
    namaPenerima: result.nama_penerima,
    perihal: result.perihal,
    tujuanSurat: result.tujuan_surat,
    status: result.status as 'Belum Dikirim' | 'Sudah Dikirim',
    keterangan: result.keterangan || '',
    userInput: result.user_input,
    fileUrl: result.file_url || undefined,
    createdAt: new Date(result.created_at)
  };
};

export const updateSuratKeluar = async (id: string, data: Partial<SuratKeluar>): Promise<void> => {
  const updateData: Record<string, unknown> = {};
  if (data.kodeSurat !== undefined) updateData.kode_surat = data.kodeSurat;
  if (data.namaPenerima !== undefined) updateData.nama_penerima = data.namaPenerima;
  if (data.perihal !== undefined) updateData.perihal = data.perihal;
  if (data.tujuanSurat !== undefined) updateData.tujuan_surat = data.tujuanSurat;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.keterangan !== undefined) updateData.keterangan = data.keterangan;
  if (data.fileUrl !== undefined) updateData.file_url = data.fileUrl;
  
  const { error } = await supabase
    .from('surat_keluar')
    .update(updateData)
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteSuratKeluar = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('surat_keluar')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ============= AGENDA KREDIT ENTRY FUNCTIONS =============
export const getAgendaKreditEntry = async (): Promise<AgendaKreditEntry[]> => {
  const { data, error } = await supabase
    .from('agenda_kredit_entry')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  
  return data.map(s => ({
    id: s.id,
    nomor: s.nomor,
    nomorAgenda: s.nomor_agenda,
    kodeSurat: s.kode_surat,
    nomorSuratMasuk: s.nomor_surat_masuk,
    namaPengirim: s.nama_pengirim,
    perihal: s.perihal,
    tujuanDisposisi: s.tujuan_disposisi,
    status: s.status as 'Belum Disposisi' | 'Sudah Disposisi',
    keterangan: s.keterangan || '',
    userInput: s.user_input,
    fileUrl: s.file_url || undefined,
    tanggalMasuk: new Date((s as any).tanggal_masuk || s.created_at),
    createdAt: new Date(s.created_at)
  }));
};

export const addAgendaKreditEntry = async (data: Omit<AgendaKreditEntry, 'id' | 'nomor' | 'nomorAgenda' | 'createdAt'>): Promise<AgendaKreditEntry> => {
  const { data: existing } = await supabase
    .from('agenda_kredit_entry')
    .select('nomor')
    .order('nomor', { ascending: false })
    .limit(1);
  
  const nomor = (existing && existing.length > 0 ? existing[0].nomor : 0) + 1;
  const tanggalMasuk = data.tanggalMasuk || new Date();
  const nomorAgenda = `${String(nomor).padStart(3, '0')}/${tanggalMasuk.getFullYear()}`;
  
  const { data: result, error } = await supabase
    .from('agenda_kredit_entry')
    .insert({
      nomor,
      nomor_agenda: nomorAgenda,
      kode_surat: data.kodeSurat,
      nomor_surat_masuk: data.nomorSuratMasuk,
      nama_pengirim: data.namaPengirim,
      perihal: data.perihal,
      tujuan_disposisi: data.tujuanDisposisi,
      status: data.status,
      keterangan: data.keterangan,
      user_input: data.userInput,
      file_url: data.fileUrl,
      tanggal_masuk: tanggalMasuk.toISOString()
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: result.id,
    nomor: result.nomor,
    nomorAgenda: result.nomor_agenda,
    kodeSurat: result.kode_surat,
    nomorSuratMasuk: result.nomor_surat_masuk,
    namaPengirim: result.nama_pengirim,
    perihal: result.perihal,
    tujuanDisposisi: result.tujuan_disposisi,
    status: result.status as 'Belum Disposisi' | 'Sudah Disposisi',
    keterangan: result.keterangan || '',
    userInput: result.user_input,
    fileUrl: result.file_url || undefined,
    tanggalMasuk: new Date((result as any).tanggal_masuk || result.created_at),
    createdAt: new Date(result.created_at)
  };
};

export const updateAgendaKreditEntry = async (id: string, data: Partial<AgendaKreditEntry>): Promise<void> => {
  const updateData: Record<string, unknown> = {};
  if (data.kodeSurat !== undefined) updateData.kode_surat = data.kodeSurat;
  if (data.nomorSuratMasuk !== undefined) updateData.nomor_surat_masuk = data.nomorSuratMasuk;
  if (data.namaPengirim !== undefined) updateData.nama_pengirim = data.namaPengirim;
  if (data.perihal !== undefined) updateData.perihal = data.perihal;
  if (data.tujuanDisposisi !== undefined) updateData.tujuan_disposisi = data.tujuanDisposisi;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.keterangan !== undefined) updateData.keterangan = data.keterangan;
  if (data.fileUrl !== undefined) updateData.file_url = data.fileUrl;
  if (data.tanggalMasuk !== undefined) updateData.tanggal_masuk = data.tanggalMasuk.toISOString();
  
  const { error } = await supabase
    .from('agenda_kredit_entry')
    .update(updateData)
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteAgendaKreditEntry = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('agenda_kredit_entry')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ============= SPPK FUNCTIONS =============
export const getSPPK = async (): Promise<SPPK[]> => {
  const { data, error } = await supabase
    .from('sppk')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  
  return data.map(s => ({
    id: s.id,
    nomor: s.nomor,
    nomorSPPK: s.nomor_sppk,
    namaDebitur: s.nama_debitur,
    jenisKredit: s.jenis_kredit,
    plafon: Number(s.plafon),
    jangkaWaktu: s.jangka_waktu,
    marketing: s.marketing,
    type: s.type as 'telihan' | 'meranti',
    createdAt: new Date(s.created_at)
  }));
};

export const addSPPK = async (data: Omit<SPPK, 'id' | 'nomor' | 'nomorSPPK' | 'createdAt'>): Promise<SPPK> => {
  const { data: existing } = await supabase
    .from('sppk')
    .select('nomor')
    .eq('type', data.type)
    .order('nomor', { ascending: false })
    .limit(1);
  
  const nomor = (existing && existing.length > 0 ? existing[0].nomor : 0) + 1;
  const now = new Date();
  const prefix = data.type === 'telihan' ? 'D-1/BPD-TLH' : 'SPPK/ULM-TLH';
  const nomorSPPK = `${String(nomor).padStart(3, '0')}/${prefix}/${toRomanMonth(now.getMonth())}/${now.getFullYear()}`;
  
  const { data: result, error } = await supabase
    .from('sppk')
    .insert({
      nomor,
      nomor_sppk: nomorSPPK,
      nama_debitur: data.namaDebitur,
      jenis_kredit: data.jenisKredit,
      plafon: data.plafon,
      jangka_waktu: data.jangkaWaktu,
      marketing: data.marketing,
      type: data.type
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: result.id,
    nomor: result.nomor,
    nomorSPPK: result.nomor_sppk,
    namaDebitur: result.nama_debitur,
    jenisKredit: result.jenis_kredit,
    plafon: Number(result.plafon),
    jangkaWaktu: result.jangka_waktu,
    marketing: result.marketing,
    type: result.type as 'telihan' | 'meranti',
    createdAt: new Date(result.created_at)
  };
};

export const updateSPPK = async (id: string, data: Partial<SPPK>): Promise<void> => {
  const updateData: Record<string, unknown> = {};
  if (data.namaDebitur !== undefined) updateData.nama_debitur = data.namaDebitur;
  if (data.jenisKredit !== undefined) updateData.jenis_kredit = data.jenisKredit;
  if (data.plafon !== undefined) updateData.plafon = data.plafon;
  if (data.jangkaWaktu !== undefined) updateData.jangka_waktu = data.jangkaWaktu;
  if (data.marketing !== undefined) updateData.marketing = data.marketing;
  
  const { error } = await supabase
    .from('sppk')
    .update(updateData)
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteSPPK = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('sppk')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ============= PK FUNCTIONS =============
export const getPK = async (): Promise<PK[]> => {
  const { data, error } = await supabase
    .from('pk')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  
  return data.map(s => ({
    id: s.id,
    nomor: s.nomor,
    nomorPK: s.nomor_pk,
    namaDebitur: s.nama_debitur,
    jenisKredit: s.jenis_kredit,
    plafon: Number(s.plafon),
    jangkaWaktu: s.jangka_waktu,
    jenisDebitur: s.jenis_debitur,
    kodeFasilitas: s.kode_fasilitas,
    sektorEkonomi: s.sektor_ekonomi,
    type: s.type as 'telihan' | 'meranti',
    createdAt: new Date(s.created_at)
  }));
};

// Helper to get produkKredit from jenisKredit (format: "JENIS - PRODUK")
const getProdukKreditFromValue = (jenisKredit: string): string => {
  const parts = jenisKredit.split(' - ');
  return parts.length > 1 ? parts[1] : '';
};

// Check if jenis kredit is special (KMK-KBK or KI-KBK)
const isSpecialKreditType = (jenisKredit: string): boolean => {
  const produkKredit = getProdukKreditFromValue(jenisKredit);
  return produkKredit === 'KMK-KBK' || produkKredit === 'KI-KBK';
};

export const addPK = async (data: Omit<PK, 'id' | 'nomor' | 'nomorPK' | 'createdAt'> & { isKBK?: boolean }): Promise<PK> => {
  const { data: existing } = await supabase
    .from('pk')
    .select('nomor')
    .eq('type', data.type)
    .order('nomor', { ascending: false })
    .limit(1);
  
  const nomor = (existing && existing.length > 0 ? existing[0].nomor : 0) + 1;
  const now = new Date();
  const nomorPadded = String(nomor).padStart(3, '0');
  const prefix = data.type === 'telihan' ? 'BPD-TLH' : 'ULM-TLH';
  const produkKredit = getProdukKreditFromValue(data.jenisKredit);
  
  let nomorPK: string;
  
  // PK Telihan dengan checkbox KBK dicentang
  if (data.type === 'telihan' && data.isKBK) {
    nomorPK = `${nomorPadded}/${produkKredit}/${prefix}/${toRomanMonth(now.getMonth())}/${now.getFullYear()}`;
  } else if (data.type === 'meranti' && isSpecialKreditType(data.jenisKredit)) {
    nomorPK = `${nomorPadded}/${produkKredit}/${prefix}/${toRomanMonth(now.getMonth())}/${now.getFullYear()}`;
  } else {
    nomorPK = `${nomorPadded}/${data.jenisDebitur}/${data.kodeFasilitas}/${data.sektorEkonomi}/${prefix}/${now.getFullYear()}`;
  }
  
  const { isKBK, ...saveData } = data;
  
  const { data: result, error } = await supabase
    .from('pk')
    .insert({
      nomor,
      nomor_pk: nomorPK,
      nama_debitur: saveData.namaDebitur,
      jenis_kredit: saveData.jenisKredit,
      plafon: saveData.plafon,
      jangka_waktu: saveData.jangkaWaktu,
      jenis_debitur: saveData.jenisDebitur,
      kode_fasilitas: saveData.kodeFasilitas,
      sektor_ekonomi: saveData.sektorEkonomi,
      type: saveData.type
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: result.id,
    nomor: result.nomor,
    nomorPK: result.nomor_pk,
    namaDebitur: result.nama_debitur,
    jenisKredit: result.jenis_kredit,
    plafon: Number(result.plafon),
    jangkaWaktu: result.jangka_waktu,
    jenisDebitur: result.jenis_debitur,
    kodeFasilitas: result.kode_fasilitas,
    sektorEkonomi: result.sektor_ekonomi,
    type: result.type as 'telihan' | 'meranti',
    createdAt: new Date(result.created_at)
  };
};

export const updatePK = async (id: string, data: Partial<PK>): Promise<void> => {
  const updateData: Record<string, unknown> = {};
  if (data.namaDebitur !== undefined) updateData.nama_debitur = data.namaDebitur;
  if (data.jenisKredit !== undefined) updateData.jenis_kredit = data.jenisKredit;
  if (data.plafon !== undefined) updateData.plafon = data.plafon;
  if (data.jangkaWaktu !== undefined) updateData.jangka_waktu = data.jangkaWaktu;
  if (data.jenisDebitur !== undefined) updateData.jenis_debitur = data.jenisDebitur;
  if (data.kodeFasilitas !== undefined) updateData.kode_fasilitas = data.kodeFasilitas;
  if (data.sektorEkonomi !== undefined) updateData.sektor_ekonomi = data.sektorEkonomi;
  
  const { error } = await supabase
    .from('pk')
    .update(updateData)
    .eq('id', id);
  
  if (error) throw error;
};

export const deletePK = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('pk')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ============= KKMPAK FUNCTIONS =============
export const getKKMPAK = async (): Promise<KKMPAK[]> => {
  const { data, error } = await supabase
    .from('kkmpak')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  
  return data.map(s => ({
    id: s.id,
    nomor: s.nomor,
    nomorKK: s.nomor_kk,
    nomorMPAK: s.nomor_mpak,
    namaDebitur: s.nama_debitur,
    jenisKredit: s.jenis_kredit,
    plafon: Number(s.plafon),
    jangkaWaktu: s.jangka_waktu,
    jenisDebitur: s.jenis_debitur,
    kodeFasilitas: s.kode_fasilitas,
    sektorEkonomi: s.sektor_ekonomi,
    type: s.type as 'telihan' | 'meranti',
    createdAt: new Date(s.created_at)
  }));
};

export const addKKMPAK = async (data: Omit<KKMPAK, 'id' | 'nomor' | 'nomorKK' | 'nomorMPAK' | 'createdAt'>): Promise<KKMPAK> => {
  const { data: existing } = await supabase
    .from('kkmpak')
    .select('nomor')
    .eq('type', data.type)
    .order('nomor', { ascending: false })
    .limit(1);
  
  const nomor = (existing && existing.length > 0 ? existing[0].nomor : 0) + 1;
  const now = new Date();
  const nomorPadded = String(nomor).padStart(3, '0');
  const produkKredit = getProdukKreditFromValue(data.jenisKredit);
  
  let nomorKK: string;
  let nomorMPAK: string;
  
  if (data.type === 'telihan') {
    nomorKK = `${nomorPadded}/KK/BPD-TLH/${toRomanMonth(now.getMonth())}/${now.getFullYear()}`;
    nomorMPAK = `${nomorPadded}/MPAK/BPD-TLH/${toRomanMonth(now.getMonth())}/${now.getFullYear()}`;
  } else {
    nomorKK = `${nomorPadded}/${toRomanMonth(now.getMonth())}/${data.sektorEkonomi}/${produkKredit}/${now.getFullYear()}`;
    nomorMPAK = nomorKK;
  }
  
  const { data: result, error } = await supabase
    .from('kkmpak')
    .insert({
      nomor,
      nomor_kk: nomorKK,
      nomor_mpak: nomorMPAK,
      nama_debitur: data.namaDebitur,
      jenis_kredit: data.jenisKredit,
      plafon: data.plafon,
      jangka_waktu: data.jangkaWaktu,
      jenis_debitur: data.jenisDebitur,
      kode_fasilitas: data.kodeFasilitas,
      sektor_ekonomi: data.sektorEkonomi,
      type: data.type
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: result.id,
    nomor: result.nomor,
    nomorKK: result.nomor_kk,
    nomorMPAK: result.nomor_mpak,
    namaDebitur: result.nama_debitur,
    jenisKredit: result.jenis_kredit,
    plafon: Number(result.plafon),
    jangkaWaktu: result.jangka_waktu,
    jenisDebitur: result.jenis_debitur,
    kodeFasilitas: result.kode_fasilitas,
    sektorEkonomi: result.sektor_ekonomi,
    type: result.type as 'telihan' | 'meranti',
    createdAt: new Date(result.created_at)
  };
};

export const updateKKMPAK = async (id: string, data: Partial<KKMPAK>): Promise<void> => {
  const updateData: Record<string, unknown> = {};
  if (data.namaDebitur !== undefined) updateData.nama_debitur = data.namaDebitur;
  if (data.jenisKredit !== undefined) updateData.jenis_kredit = data.jenisKredit;
  if (data.plafon !== undefined) updateData.plafon = data.plafon;
  if (data.jangkaWaktu !== undefined) updateData.jangka_waktu = data.jangkaWaktu;
  if (data.jenisDebitur !== undefined) updateData.jenis_debitur = data.jenisDebitur;
  if (data.kodeFasilitas !== undefined) updateData.kode_fasilitas = data.kodeFasilitas;
  if (data.sektorEkonomi !== undefined) updateData.sektor_ekonomi = data.sektorEkonomi;
  
  const { error } = await supabase
    .from('kkmpak')
    .update(updateData)
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteKKMPAK = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('kkmpak')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ============= CONFIG FUNCTIONS =============
export const getJenisKredit = async (): Promise<JenisKredit[]> => {
  const { data, error } = await supabase
    .from('jenis_kredit')
    .select('*');
  
  if (error) throw error;
  
  return data.map(j => ({
    id: j.id,
    nama: j.nama,
    produkKredit: j.produk_kredit
  }));
};

export const addJenisKredit = async (data: Omit<JenisKredit, 'id'>): Promise<JenisKredit> => {
  const { data: result, error } = await supabase
    .from('jenis_kredit')
    .insert({
      nama: data.nama,
      produk_kredit: data.produkKredit
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: result.id,
    nama: result.nama,
    produkKredit: result.produk_kredit
  };
};

export const updateJenisKredit = async (id: string, data: Partial<JenisKredit>): Promise<void> => {
  const updateData: Record<string, unknown> = {};
  if (data.nama !== undefined) updateData.nama = data.nama;
  if (data.produkKredit !== undefined) updateData.produk_kredit = data.produkKredit;
  
  const { error } = await supabase
    .from('jenis_kredit')
    .update(updateData)
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteJenisKredit = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('jenis_kredit')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const getJenisDebitur = async (): Promise<JenisDebitur[]> => {
  const { data, error } = await supabase
    .from('jenis_debitur')
    .select('*');
  
  if (error) throw error;
  
  return data.map(j => ({
    id: j.id,
    kode: j.kode,
    keterangan: j.keterangan
  }));
};

export const addJenisDebitur = async (data: Omit<JenisDebitur, 'id'>): Promise<JenisDebitur> => {
  const { data: result, error } = await supabase
    .from('jenis_debitur')
    .insert({
      kode: data.kode,
      keterangan: data.keterangan
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: result.id,
    kode: result.kode,
    keterangan: result.keterangan
  };
};

export const updateJenisDebitur = async (id: string, data: Partial<JenisDebitur>): Promise<void> => {
  const { error } = await supabase
    .from('jenis_debitur')
    .update(data)
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteJenisDebitur = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('jenis_debitur')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const getKodeFasilitas = async (): Promise<KodeFasilitas[]> => {
  const { data, error } = await supabase
    .from('kode_fasilitas')
    .select('*');
  
  if (error) throw error;
  
  return data.map(k => ({
    id: k.id,
    kode: k.kode,
    keterangan: k.keterangan
  }));
};

export const addKodeFasilitas = async (data: Omit<KodeFasilitas, 'id'>): Promise<KodeFasilitas> => {
  const { data: result, error } = await supabase
    .from('kode_fasilitas')
    .insert({
      kode: data.kode,
      keterangan: data.keterangan
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: result.id,
    kode: result.kode,
    keterangan: result.keterangan
  };
};

export const updateKodeFasilitas = async (id: string, data: Partial<KodeFasilitas>): Promise<void> => {
  const { error } = await supabase
    .from('kode_fasilitas')
    .update(data)
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteKodeFasilitas = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('kode_fasilitas')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

export const getSektorEkonomi = async (): Promise<SektorEkonomi[]> => {
  const { data, error } = await supabase
    .from('sektor_ekonomi')
    .select('*');
  
  if (error) throw error;
  
  return data.map(s => ({
    id: s.id,
    kode: s.kode,
    keterangan: s.keterangan
  }));
};

export const addSektorEkonomi = async (data: Omit<SektorEkonomi, 'id'>): Promise<SektorEkonomi> => {
  const { data: result, error } = await supabase
    .from('sektor_ekonomi')
    .insert({
      kode: data.kode,
      keterangan: data.keterangan
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: result.id,
    kode: result.kode,
    keterangan: result.keterangan
  };
};

export const updateSektorEkonomi = async (id: string, data: Partial<SektorEkonomi>): Promise<void> => {
  const { error } = await supabase
    .from('sektor_ekonomi')
    .update(data)
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteSektorEkonomi = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('sektor_ekonomi')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};
