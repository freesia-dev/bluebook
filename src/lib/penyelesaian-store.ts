import { supabase } from '@/integrations/supabase/client';
import { PenyelesaianSelisih } from '@/types';

// ============= PENYELESAIAN SELISIH FUNCTIONS =============
export const getPenyelesaianSelisih = async (): Promise<PenyelesaianSelisih[]> => {
  const { data, error } = await supabase
    .from('penyelesaian_selisih')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  
  return data.map(p => ({
    id: p.id,
    nomor: p.nomor,
    tanggalPengaduan: new Date(p.tanggal_pengaduan),
    tanggalPenyelesaian: p.tanggal_penyelesaian ? new Date(p.tanggal_penyelesaian) : undefined,
    petugas: p.petugas,
    teller: p.teller || undefined,
    pemimpin: p.pemimpin || undefined,
    catatan: p.catatan || undefined,
    status: p.status as PenyelesaianSelisih['status'],
    createdAt: new Date(p.created_at)
  }));
};

export const addPenyelesaianSelisih = async (
  data: Omit<PenyelesaianSelisih, 'id' | 'nomor' | 'createdAt'>,
  selisihIds: string[]
): Promise<PenyelesaianSelisih> => {
  // Get next nomor
  const { data: existing } = await supabase
    .from('penyelesaian_selisih')
    .select('nomor')
    .order('nomor', { ascending: false })
    .limit(1);
  
  const nomor = (existing && existing.length > 0 ? existing[0].nomor : 0) + 1;
  
  const { data: result, error } = await supabase
    .from('penyelesaian_selisih')
    .insert({
      nomor,
      tanggal_pengaduan: data.tanggalPengaduan.toISOString().split('T')[0],
      tanggal_penyelesaian: data.tanggalPenyelesaian ? data.tanggalPenyelesaian.toISOString().split('T')[0] : null,
      petugas: data.petugas,
      teller: data.teller,
      pemimpin: data.pemimpin,
      catatan: data.catatan,
      status: data.status
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Update linked selisih_atm records
  if (selisihIds.length > 0) {
    const newStatus = data.status === 'Sudah Diselesaikan' ? 'Sudah Diselesaikan' : 'Dalam Proses';
    const { error: updateError } = await supabase
      .from('selisih_atm')
      .update({ 
        penyelesaian_id: result.id, 
        status: newStatus 
      })
      .in('id', selisihIds);
    
    if (updateError) throw updateError;
  }
  
  return {
    id: result.id,
    nomor: result.nomor,
    tanggalPengaduan: new Date(result.tanggal_pengaduan),
    tanggalPenyelesaian: result.tanggal_penyelesaian ? new Date(result.tanggal_penyelesaian) : undefined,
    petugas: result.petugas,
    teller: result.teller || undefined,
    pemimpin: result.pemimpin || undefined,
    catatan: result.catatan || undefined,
    status: result.status as PenyelesaianSelisih['status'],
    createdAt: new Date(result.created_at)
  };
};

export const updatePenyelesaianSelisih = async (
  id: string, 
  data: Partial<PenyelesaianSelisih>,
  selisihIds?: string[]
): Promise<void> => {
  const updateData: Record<string, unknown> = {};
  if (data.tanggalPengaduan !== undefined) updateData.tanggal_pengaduan = data.tanggalPengaduan.toISOString().split('T')[0];
  if (data.tanggalPenyelesaian !== undefined) updateData.tanggal_penyelesaian = data.tanggalPenyelesaian ? data.tanggalPenyelesaian.toISOString().split('T')[0] : null;
  if (data.petugas !== undefined) updateData.petugas = data.petugas;
  if (data.teller !== undefined) updateData.teller = data.teller;
  if (data.pemimpin !== undefined) updateData.pemimpin = data.pemimpin;
  if (data.catatan !== undefined) updateData.catatan = data.catatan;
  if (data.status !== undefined) updateData.status = data.status;
  
  const { error } = await supabase
    .from('penyelesaian_selisih')
    .update(updateData)
    .eq('id', id);
  
  if (error) throw error;

  // If status changed, update linked selisih_atm records
  if (data.status) {
    const { error: updateSelisihError } = await supabase
      .from('selisih_atm')
      .update({ status: data.status === 'Sudah Diselesaikan' ? 'Sudah Diselesaikan' : 'Dalam Proses' })
      .eq('penyelesaian_id', id);
    
    if (updateSelisihError) throw updateSelisihError;
  }
};

export const deletePenyelesaianSelisih = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('penyelesaian_selisih')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Get selisih records linked to a specific penyelesaian
export const getSelisihByPenyelesaianId = async (penyelesaianId: string) => {
  const { data, error } = await supabase
    .from('selisih_atm')
    .select('*')
    .eq('penyelesaian_id', penyelesaianId)
    .order('tanggal', { ascending: true });
  
  if (error) throw error;
  
  return data.map(s => ({
    id: s.id,
    pengisianAtmId: s.pengisian_atm_id || '',
    tanggal: new Date(s.tanggal),
    noReff: s.no_reff || undefined,
    nominal: Number(s.nominal),
    namaNasabah: s.nama_nasabah || undefined,
    nomorKartu: s.nomor_kartu || undefined,
    keterangan: s.keterangan || undefined,
    status: s.status || 'Belum Diselesaikan',
    penyelesaianId: s.penyelesaian_id || undefined,
    createdAt: new Date(s.created_at)
  }));
};

// Get all unresolved selisih (for selection in form)
export const getUnresolvedSelisih = async () => {
  const { data, error } = await supabase
    .from('selisih_atm')
    .select('*')
    .eq('status', 'Belum Diselesaikan')
    .order('tanggal', { ascending: true });
  
  if (error) throw error;
  
  return data.map(s => ({
    id: s.id,
    pengisianAtmId: s.pengisian_atm_id || '',
    tanggal: new Date(s.tanggal),
    noReff: s.no_reff || undefined,
    nominal: Number(s.nominal),
    namaNasabah: s.nama_nasabah || undefined,
    nomorKartu: s.nomor_kartu || undefined,
    keterangan: s.keterangan || undefined,
    status: s.status || 'Belum Diselesaikan',
    penyelesaianId: s.penyelesaian_id || undefined,
    createdAt: new Date(s.created_at)
  }));
};

// Generate BA number format: [nomor 3 digit]/BA/BPD-TLH/[bulan romawi]/[tahun]
export const generateBANumber = (nomor: number, date: Date): string => {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  const bulan = roman[date.getMonth()];
  const tahun = date.getFullYear();
  return `${String(nomor).padStart(3, '0')}/BA/BPD-TLH/${bulan}/${tahun}`;
};
