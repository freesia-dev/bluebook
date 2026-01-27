import { supabase } from '@/integrations/supabase/client';
import { PengisianATM, ATMConfig, KartuTertelan, SelisihATM, HARI_LIST } from '@/types';

// ============= PENGISIAN ATM FUNCTIONS =============
export const getPengisianATM = async (): Promise<PengisianATM[]> => {
  const { data, error } = await supabase
    .from('pengisian_atm')
    .select('*')
    .order('created_at', { ascending: true });
  
  if (error) throw error;
  
  return data.map(s => ({
    id: s.id,
    nomor: s.nomor,
    hari: s.hari,
    tanggal: new Date(s.tanggal),
    jam: s.jam,
    sisaCartridge1: s.sisa_cartridge_1,
    sisaCartridge2: s.sisa_cartridge_2,
    sisaCartridge3: s.sisa_cartridge_3,
    sisaCartridge4: s.sisa_cartridge_4,
    tambahCartridge1: s.tambah_cartridge_1,
    tambahCartridge2: s.tambah_cartridge_2,
    tambahCartridge3: s.tambah_cartridge_3,
    tambahCartridge4: s.tambah_cartridge_4,
    saldoBukuBesar: Number(s.saldo_buku_besar),
    kartuTertelan: s.kartu_tertelan,
    terbilang: s.terbilang || '',
    notes: s.notes || '',
    jumlahSelisih: Number(s.jumlah_selisih),
    keteranganSelisih: s.keterangan_selisih || '',
    namaTeller: s.nama_teller || '',
    jumlahDisetor: Number(s.jumlah_disetor),
    setorKeRekTitipan: Number(s.setor_ke_rek_titipan),
    yangMenyerahkan: s.yang_menyerahkan || '',
    tellerSelisih: s.teller_selisih || '',
    retracts: s.retracts,
    userInput: s.user_input,
    createdAt: new Date(s.created_at)
  }));
};

export const addPengisianATM = async (data: Omit<PengisianATM, 'id' | 'nomor' | 'createdAt'>): Promise<PengisianATM> => {
  const { data: existing } = await supabase
    .from('pengisian_atm')
    .select('nomor')
    .order('nomor', { ascending: false })
    .limit(1);
  
  const nomor = (existing && existing.length > 0 ? existing[0].nomor : 0) + 1;
  
  const { data: result, error } = await supabase
    .from('pengisian_atm')
    .insert({
      nomor,
      hari: data.hari,
      tanggal: data.tanggal.toISOString().split('T')[0],
      jam: data.jam,
      sisa_cartridge_1: data.sisaCartridge1,
      sisa_cartridge_2: data.sisaCartridge2,
      sisa_cartridge_3: data.sisaCartridge3,
      sisa_cartridge_4: data.sisaCartridge4,
      tambah_cartridge_1: data.tambahCartridge1,
      tambah_cartridge_2: data.tambahCartridge2,
      tambah_cartridge_3: data.tambahCartridge3,
      tambah_cartridge_4: data.tambahCartridge4,
      saldo_buku_besar: data.saldoBukuBesar,
      kartu_tertelan: data.kartuTertelan,
      terbilang: data.terbilang,
      notes: data.notes,
      jumlah_selisih: data.jumlahSelisih,
      keterangan_selisih: data.keteranganSelisih,
      nama_teller: data.namaTeller,
      jumlah_disetor: data.jumlahDisetor,
      setor_ke_rek_titipan: data.setorKeRekTitipan,
      yang_menyerahkan: data.yangMenyerahkan,
      teller_selisih: data.tellerSelisih,
      retracts: data.retracts,
      user_input: data.userInput
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: result.id,
    nomor: result.nomor,
    hari: result.hari,
    tanggal: new Date(result.tanggal),
    jam: result.jam,
    sisaCartridge1: result.sisa_cartridge_1,
    sisaCartridge2: result.sisa_cartridge_2,
    sisaCartridge3: result.sisa_cartridge_3,
    sisaCartridge4: result.sisa_cartridge_4,
    tambahCartridge1: result.tambah_cartridge_1,
    tambahCartridge2: result.tambah_cartridge_2,
    tambahCartridge3: result.tambah_cartridge_3,
    tambahCartridge4: result.tambah_cartridge_4,
    saldoBukuBesar: Number(result.saldo_buku_besar),
    kartuTertelan: result.kartu_tertelan,
    terbilang: result.terbilang || '',
    notes: result.notes || '',
    jumlahSelisih: Number(result.jumlah_selisih),
    keteranganSelisih: result.keterangan_selisih || '',
    namaTeller: result.nama_teller || '',
    jumlahDisetor: Number(result.jumlah_disetor),
    setorKeRekTitipan: Number(result.setor_ke_rek_titipan),
    yangMenyerahkan: result.yang_menyerahkan || '',
    tellerSelisih: result.teller_selisih || '',
    retracts: result.retracts,
    userInput: result.user_input,
    createdAt: new Date(result.created_at)
  };
};

export const updatePengisianATM = async (id: string, data: Partial<PengisianATM>): Promise<void> => {
  const updateData: Record<string, unknown> = {};
  if (data.hari !== undefined) updateData.hari = data.hari;
  if (data.tanggal !== undefined) updateData.tanggal = data.tanggal.toISOString().split('T')[0];
  if (data.jam !== undefined) updateData.jam = data.jam;
  if (data.sisaCartridge1 !== undefined) updateData.sisa_cartridge_1 = data.sisaCartridge1;
  if (data.sisaCartridge2 !== undefined) updateData.sisa_cartridge_2 = data.sisaCartridge2;
  if (data.sisaCartridge3 !== undefined) updateData.sisa_cartridge_3 = data.sisaCartridge3;
  if (data.sisaCartridge4 !== undefined) updateData.sisa_cartridge_4 = data.sisaCartridge4;
  if (data.tambahCartridge1 !== undefined) updateData.tambah_cartridge_1 = data.tambahCartridge1;
  if (data.tambahCartridge2 !== undefined) updateData.tambah_cartridge_2 = data.tambahCartridge2;
  if (data.tambahCartridge3 !== undefined) updateData.tambah_cartridge_3 = data.tambahCartridge3;
  if (data.tambahCartridge4 !== undefined) updateData.tambah_cartridge_4 = data.tambahCartridge4;
  if (data.saldoBukuBesar !== undefined) updateData.saldo_buku_besar = data.saldoBukuBesar;
  if (data.kartuTertelan !== undefined) updateData.kartu_tertelan = data.kartuTertelan;
  if (data.terbilang !== undefined) updateData.terbilang = data.terbilang;
  if (data.notes !== undefined) updateData.notes = data.notes;
  if (data.jumlahSelisih !== undefined) updateData.jumlah_selisih = data.jumlahSelisih;
  if (data.keteranganSelisih !== undefined) updateData.keterangan_selisih = data.keteranganSelisih;
  if (data.namaTeller !== undefined) updateData.nama_teller = data.namaTeller;
  if (data.jumlahDisetor !== undefined) updateData.jumlah_disetor = data.jumlahDisetor;
  if (data.setorKeRekTitipan !== undefined) updateData.setor_ke_rek_titipan = data.setorKeRekTitipan;
  if (data.yangMenyerahkan !== undefined) updateData.yang_menyerahkan = data.yangMenyerahkan;
  if (data.tellerSelisih !== undefined) updateData.teller_selisih = data.tellerSelisih;
  if (data.retracts !== undefined) updateData.retracts = data.retracts;
  
  const { error } = await supabase
    .from('pengisian_atm')
    .update(updateData)
    .eq('id', id);
  
  if (error) throw error;
};

export const deletePengisianATM = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('pengisian_atm')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ============= ATM CONFIG FUNCTIONS =============
export const getATMConfig = async (): Promise<ATMConfig[]> => {
  const { data, error } = await supabase
    .from('atm_config')
    .select('*')
    .order('jabatan', { ascending: true });
  
  if (error) throw error;
  
  return data.map(c => ({
    id: c.id,
    nama: c.nama,
    jabatan: c.jabatan,
    keterangan: c.keterangan || undefined,
    isActive: c.is_active,
    createdAt: new Date(c.created_at)
  }));
};

export const addATMConfig = async (data: Omit<ATMConfig, 'id' | 'createdAt'>): Promise<ATMConfig> => {
  const { data: result, error } = await supabase
    .from('atm_config')
    .insert({
      nama: data.nama,
      jabatan: data.jabatan,
      keterangan: data.keterangan,
      is_active: data.isActive
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: result.id,
    nama: result.nama,
    jabatan: result.jabatan,
    keterangan: result.keterangan || undefined,
    isActive: result.is_active,
    createdAt: new Date(result.created_at)
  };
};

export const updateATMConfig = async (id: string, data: Partial<ATMConfig>): Promise<void> => {
  const updateData: Record<string, unknown> = {};
  if (data.nama !== undefined) updateData.nama = data.nama;
  if (data.jabatan !== undefined) updateData.jabatan = data.jabatan;
  if (data.keterangan !== undefined) updateData.keterangan = data.keterangan;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;
  
  const { error } = await supabase
    .from('atm_config')
    .update(updateData)
    .eq('id', id);
  
  if (error) throw error;
};

export const deleteATMConfig = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('atm_config')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ============= KARTU TERTELAN FUNCTIONS =============
export const getKartuTertelan = async (pengisianAtmId?: string): Promise<KartuTertelan[]> => {
  let query = supabase.from('kartu_tertelan').select('*');
  if (pengisianAtmId) {
    query = query.eq('pengisian_atm_id', pengisianAtmId);
  }
  
  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) throw error;
  
  return data.map(k => ({
    id: k.id,
    pengisianAtmId: k.pengisian_atm_id || '',
    nomorKartu: k.nomor_kartu,
    namaNasabah: k.nama_nasabah || undefined,
    bank: k.bank,
    createdAt: new Date(k.created_at)
  }));
};

export const addKartuTertelan = async (data: Omit<KartuTertelan, 'id' | 'createdAt'>): Promise<KartuTertelan> => {
  const { data: result, error } = await supabase
    .from('kartu_tertelan')
    .insert({
      pengisian_atm_id: data.pengisianAtmId,
      nomor_kartu: data.nomorKartu,
      nama_nasabah: data.namaNasabah,
      bank: data.bank
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: result.id,
    pengisianAtmId: result.pengisian_atm_id || '',
    nomorKartu: result.nomor_kartu,
    namaNasabah: result.nama_nasabah || undefined,
    bank: result.bank,
    createdAt: new Date(result.created_at)
  };
};

export const deleteKartuTertelan = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('kartu_tertelan')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ============= SELISIH ATM FUNCTIONS =============
export const getSelisihATM = async (pengisianAtmId?: string): Promise<SelisihATM[]> => {
  let query = supabase.from('selisih_atm').select('*');
  if (pengisianAtmId) {
    query = query.eq('pengisian_atm_id', pengisianAtmId);
  }
  
  const { data, error } = await query.order('created_at', { ascending: true });
  if (error) throw error;
  
  return data.map(s => ({
    id: s.id,
    pengisianAtmId: s.pengisian_atm_id || '',
    tanggal: new Date(s.tanggal),
    noReff: s.no_reff || undefined,
    nominal: Number(s.nominal),
    keterangan: s.keterangan || undefined,
    createdAt: new Date(s.created_at)
  }));
};

export const addSelisihATM = async (data: Omit<SelisihATM, 'id' | 'createdAt'>): Promise<SelisihATM> => {
  const { data: result, error } = await supabase
    .from('selisih_atm')
    .insert({
      pengisian_atm_id: data.pengisianAtmId,
      tanggal: data.tanggal.toISOString().split('T')[0],
      no_reff: data.noReff,
      nominal: data.nominal,
      keterangan: data.keterangan
    })
    .select()
    .single();
  
  if (error) throw error;
  
  return {
    id: result.id,
    pengisianAtmId: result.pengisian_atm_id || '',
    tanggal: new Date(result.tanggal),
    noReff: result.no_reff || undefined,
    nominal: Number(result.nominal),
    keterangan: result.keterangan || undefined,
    createdAt: new Date(result.created_at)
  };
};

export const deleteSelisihATM = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('selisih_atm')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// ============= HELPER FUNCTIONS =============
export const getDayName = (date: Date): string => {
  return HARI_LIST[date.getDay()];
};

// Number to words in Indonesian
export const angkaTerbilang = (angka: number): string => {
  const satuan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  
  if (angka < 12) return satuan[angka];
  if (angka < 20) return satuan[angka - 10] + ' Belas';
  if (angka < 100) return satuan[Math.floor(angka / 10)] + ' Puluh' + (angka % 10 > 0 ? ' ' + satuan[angka % 10] : '');
  if (angka < 200) return 'Seratus' + (angka % 100 > 0 ? ' ' + angkaTerbilang(angka % 100) : '');
  if (angka < 1000) return satuan[Math.floor(angka / 100)] + ' Ratus' + (angka % 100 > 0 ? ' ' + angkaTerbilang(angka % 100) : '');
  if (angka < 2000) return 'Seribu' + (angka % 1000 > 0 ? ' ' + angkaTerbilang(angka % 1000) : '');
  if (angka < 1000000) return angkaTerbilang(Math.floor(angka / 1000)) + ' Ribu' + (angka % 1000 > 0 ? ' ' + angkaTerbilang(angka % 1000) : '');
  if (angka < 1000000000) return angkaTerbilang(Math.floor(angka / 1000000)) + ' Juta' + (angka % 1000000 > 0 ? ' ' + angkaTerbilang(angka % 1000000) : '');
  if (angka < 1000000000000) return angkaTerbilang(Math.floor(angka / 1000000000)) + ' Milyar' + (angka % 1000000000 > 0 ? ' ' + angkaTerbilang(angka % 1000000000) : '');
  return angkaTerbilang(Math.floor(angka / 1000000000000)) + ' Triliun' + (angka % 1000000000000 > 0 ? ' ' + angkaTerbilang(angka % 1000000000000) : '');
};

export const formatRupiah = (angka: number): string => {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};
