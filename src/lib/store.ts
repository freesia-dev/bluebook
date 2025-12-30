import { 
  User, SuratMasuk, SuratKeluar, SPPK, PK, KKMPAK,
  JenisKredit, JenisDebitur, KodeFasilitas, SektorEkonomi, AgendaKreditEntry
} from '@/types';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substr(2, 9);

// Roman numerals helper
export const toRomanMonth = (month: number): string => {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
  return roman[month];
};

// Default admin user
const defaultUsers: User[] = [
  {
    id: '1',
    nama: 'Administrator',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    keterangan: 'Admin Utama Sistem',
    createdAt: new Date(),
  },
  {
    id: '2',
    nama: 'User Demo',
    username: 'user',
    password: 'user123',
    role: 'user',
    keterangan: 'User Demo',
    createdAt: new Date(),
  },
];

// Default config data
const defaultJenisKredit: JenisKredit[] = [
  { id: '1', nama: 'Kredit Modal Kerja', produkKredit: 'KMK Umum' },
  { id: '2', nama: 'Kredit Investasi', produkKredit: 'KI Umum' },
  { id: '3', nama: 'Kredit Konsumtif', produkKredit: 'KK Pegawai' },
  { id: '4', nama: 'Kredit Multiguna', produkKredit: 'Multiguna' },
  { id: '5', nama: 'KPR', produkKredit: 'KPR Griya' },
];

const defaultJenisDebitur: JenisDebitur[] = [
  { id: '1', kode: '001', keterangan: 'Perorangan' },
  { id: '2', kode: '002', keterangan: 'Badan Usaha' },
  { id: '3', kode: '003', keterangan: 'Koperasi' },
];

const defaultKodeFasilitas: KodeFasilitas[] = [
  { id: '1', kode: '01', keterangan: 'Rekening Koran' },
  { id: '2', kode: '02', keterangan: 'Demand Loan' },
  { id: '3', kode: '03', keterangan: 'Fixed Loan' },
];

const defaultSektorEkonomi: SektorEkonomi[] = [
  { id: '1', kode: '0101', keterangan: 'Pertanian' },
  { id: '2', kode: '0201', keterangan: 'Pertambangan' },
  { id: '3', kode: '0301', keterangan: 'Industri Pengolahan' },
  { id: '4', kode: '0401', keterangan: 'Perdagangan' },
];

// Sample data
const sampleSuratMasuk: SuratMasuk[] = [
  {
    id: '1',
    nomor: 1,
    nomorAgenda: '001/D-1/BPD-TLH/XII/2024',
    kodeSurat: 'D-1',
    nomorSuratMasuk: 'SM-2024/001',
    namaPengirim: 'PT Bank Mandiri',
    perihal: 'Permohonan Kerjasama',
    tujuanDisposisi: 'Kepala Cabang',
    status: 'Sudah Disposisi',
    keterangan: '-',
    userInput: 'admin',
    createdAt: new Date('2024-12-20'),
  },
  {
    id: '2',
    nomor: 2,
    nomorAgenda: '002/F-3/BPD-TLH/XII/2024',
    kodeSurat: 'F-3',
    nomorSuratMasuk: 'SM-2024/002',
    namaPengirim: 'Kantor Pusat',
    perihal: 'Perubahan Kebijakan Kredit',
    tujuanDisposisi: 'Kabag Kredit',
    status: 'Belum Disposisi',
    keterangan: 'Segera ditindaklanjuti',
    userInput: 'admin',
    createdAt: new Date('2024-12-21'),
  },
];

const sampleSuratKeluar: SuratKeluar[] = [
  {
    id: '1',
    nomor: 1,
    nomorAgenda: '001/E-1/BPD-TLH/XII/2024',
    kodeSurat: 'E-1',
    namaPenerima: 'PT Telkom Indonesia',
    perihal: 'Undangan Rapat Kerjasama',
    tujuanSurat: 'Jl. Jend. Sudirman No. 1',
    status: 'Sudah Dikirim',
    keterangan: '-',
    userInput: 'admin',
    createdAt: new Date('2024-12-20'),
  },
];

const sampleSPPK: SPPK[] = [
  {
    id: '1',
    nomor: 1,
    nomorSPPK: '001/D-1/BPD-TLH/XII/2024',
    namaDebitur: 'Ahmad Sulaiman',
    jenisKredit: 'Kredit Modal Kerja',
    plafon: 500000000,
    jangkaWaktu: '12 Bulan',
    marketing: 'BAP',
    type: 'telihan',
    createdAt: new Date('2024-12-20'),
  },
];

// Storage functions
const STORAGE_KEYS = {
  users: 'bluebook_users',
  suratMasuk: 'bluebook_surat_masuk',
  suratKeluar: 'bluebook_surat_keluar',
  agendaKreditEntry: 'bluebook_agenda_kredit_entry',
  sppk: 'bluebook_sppk',
  pk: 'bluebook_pk',
  kkmpak: 'bluebook_kkmpak',
  jenisKredit: 'bluebook_jenis_kredit',
  jenisDebitur: 'bluebook_jenis_debitur',
  kodeFasilitas: 'bluebook_kode_fasilitas',
  sektorEkonomi: 'bluebook_sektor_ekonomi',
  currentUser: 'bluebook_current_user',
};

const getFromStorage = <T>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveToStorage = <T>(key: string, value: T): void => {
  localStorage.setItem(key, JSON.stringify(value));
};

// Initialize storage with defaults
export const initializeStorage = () => {
  if (!localStorage.getItem(STORAGE_KEYS.users)) {
    saveToStorage(STORAGE_KEYS.users, defaultUsers);
  }
  if (!localStorage.getItem(STORAGE_KEYS.suratMasuk)) {
    saveToStorage(STORAGE_KEYS.suratMasuk, sampleSuratMasuk);
  }
  if (!localStorage.getItem(STORAGE_KEYS.suratKeluar)) {
    saveToStorage(STORAGE_KEYS.suratKeluar, sampleSuratKeluar);
  }
  if (!localStorage.getItem(STORAGE_KEYS.agendaKreditEntry)) {
    saveToStorage(STORAGE_KEYS.agendaKreditEntry, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.sppk)) {
    saveToStorage(STORAGE_KEYS.sppk, sampleSPPK);
  }
  if (!localStorage.getItem(STORAGE_KEYS.pk)) {
    saveToStorage(STORAGE_KEYS.pk, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.kkmpak)) {
    saveToStorage(STORAGE_KEYS.kkmpak, []);
  }
  if (!localStorage.getItem(STORAGE_KEYS.jenisKredit)) {
    saveToStorage(STORAGE_KEYS.jenisKredit, defaultJenisKredit);
  }
  if (!localStorage.getItem(STORAGE_KEYS.jenisDebitur)) {
    saveToStorage(STORAGE_KEYS.jenisDebitur, defaultJenisDebitur);
  }
  if (!localStorage.getItem(STORAGE_KEYS.kodeFasilitas)) {
    saveToStorage(STORAGE_KEYS.kodeFasilitas, defaultKodeFasilitas);
  }
  if (!localStorage.getItem(STORAGE_KEYS.sektorEkonomi)) {
    saveToStorage(STORAGE_KEYS.sektorEkonomi, defaultSektorEkonomi);
  }
};

// User functions
export const getUsers = (): User[] => getFromStorage(STORAGE_KEYS.users, defaultUsers);
export const addUser = (user: Omit<User, 'id' | 'createdAt'>): User => {
  const users = getUsers();
  const newUser: User = { ...user, id: generateId(), createdAt: new Date() };
  saveToStorage(STORAGE_KEYS.users, [...users, newUser]);
  return newUser;
};
export const deleteUser = (id: string): void => {
  const users = getUsers().filter(u => u.id !== id);
  saveToStorage(STORAGE_KEYS.users, users);
};
export const getCurrentUser = (): User | null => getFromStorage(STORAGE_KEYS.currentUser, null);
export const setCurrentUser = (user: User | null): void => saveToStorage(STORAGE_KEYS.currentUser, user);
export const login = (username: string, password: string): User | null => {
  const users = getUsers();
  const user = users.find(u => u.username === username && u.password === password);
  if (user) setCurrentUser(user);
  return user || null;
};
export const logout = (): void => setCurrentUser(null);

// Surat Masuk functions
export const getSuratMasuk = (): SuratMasuk[] => getFromStorage(STORAGE_KEYS.suratMasuk, []);
export const addSuratMasuk = (data: Omit<SuratMasuk, 'id' | 'nomor' | 'nomorAgenda' | 'createdAt'>): SuratMasuk => {
  const items = getSuratMasuk();
  const nomor = items.length + 1;
  const now = new Date();
  const nomorAgenda = `${String(nomor).padStart(3, '0')}/${data.kodeSurat}/BPD-TLH/${toRomanMonth(now.getMonth())}/${now.getFullYear()}`;
  const newItem: SuratMasuk = { ...data, id: generateId(), nomor, nomorAgenda, createdAt: now };
  saveToStorage(STORAGE_KEYS.suratMasuk, [...items, newItem]);
  return newItem;
};
export const updateSuratMasuk = (id: string, data: Partial<SuratMasuk>): void => {
  const items = getSuratMasuk().map(item => item.id === id ? { ...item, ...data } : item);
  saveToStorage(STORAGE_KEYS.suratMasuk, items);
};
export const deleteSuratMasuk = (id: string): void => {
  saveToStorage(STORAGE_KEYS.suratMasuk, getSuratMasuk().filter(item => item.id !== id));
};

// Surat Keluar functions
export const getSuratKeluar = (): SuratKeluar[] => getFromStorage(STORAGE_KEYS.suratKeluar, []);
export const addSuratKeluar = (data: Omit<SuratKeluar, 'id' | 'nomor' | 'nomorAgenda' | 'createdAt'>): SuratKeluar => {
  const items = getSuratKeluar();
  const nomor = items.length + 1;
  const now = new Date();
  const nomorAgenda = `${String(nomor).padStart(3, '0')}/${data.kodeSurat}/BPD-TLH/${toRomanMonth(now.getMonth())}/${now.getFullYear()}`;
  const newItem: SuratKeluar = { ...data, id: generateId(), nomor, nomorAgenda, createdAt: now };
  saveToStorage(STORAGE_KEYS.suratKeluar, [...items, newItem]);
  return newItem;
};
export const updateSuratKeluar = (id: string, data: Partial<SuratKeluar>): void => {
  const items = getSuratKeluar().map(item => item.id === id ? { ...item, ...data } : item);
  saveToStorage(STORAGE_KEYS.suratKeluar, items);
};
export const deleteSuratKeluar = (id: string): void => {
  saveToStorage(STORAGE_KEYS.suratKeluar, getSuratKeluar().filter(item => item.id !== id));
};

// Agenda Kredit Entry functions (format: XXX/YYYY)
export const getAgendaKreditEntry = (): AgendaKreditEntry[] => getFromStorage(STORAGE_KEYS.agendaKreditEntry, []);
export const addAgendaKreditEntry = (data: Omit<AgendaKreditEntry, 'id' | 'nomor' | 'nomorAgenda' | 'createdAt'>): AgendaKreditEntry => {
  const items = getAgendaKreditEntry();
  const nomor = items.length + 1;
  const now = new Date();
  const nomorAgenda = `${String(nomor).padStart(3, '0')}/${now.getFullYear()}`;
  const newItem: AgendaKreditEntry = { ...data, id: generateId(), nomor, nomorAgenda, createdAt: now };
  saveToStorage(STORAGE_KEYS.agendaKreditEntry, [...items, newItem]);
  return newItem;
};
export const updateAgendaKreditEntry = (id: string, data: Partial<AgendaKreditEntry>): void => {
  const items = getAgendaKreditEntry().map(item => item.id === id ? { ...item, ...data } : item);
  saveToStorage(STORAGE_KEYS.agendaKreditEntry, items);
};
export const deleteAgendaKreditEntry = (id: string): void => {
  saveToStorage(STORAGE_KEYS.agendaKreditEntry, getAgendaKreditEntry().filter(item => item.id !== id));
};

// SPPK functions
export const getSPPK = (): SPPK[] => getFromStorage(STORAGE_KEYS.sppk, []);
export const addSPPK = (data: Omit<SPPK, 'id' | 'nomor' | 'nomorSPPK' | 'createdAt'>): SPPK => {
  const items = getSPPK().filter(s => s.type === data.type);
  const nomor = items.length + 1;
  const now = new Date();
  const prefix = data.type === 'telihan' ? 'D-1/BPD-TLH' : 'SPPK/ULM-TLH';
  const nomorSPPK = `${String(nomor).padStart(3, '0')}/${prefix}/${toRomanMonth(now.getMonth())}/${now.getFullYear()}`;
  const newItem: SPPK = { ...data, id: generateId(), nomor, nomorSPPK, createdAt: now };
  saveToStorage(STORAGE_KEYS.sppk, [...getSPPK(), newItem]);
  return newItem;
};
export const updateSPPK = (id: string, data: Partial<SPPK>): void => {
  const items = getSPPK().map(item => item.id === id ? { ...item, ...data } : item);
  saveToStorage(STORAGE_KEYS.sppk, items);
};
export const deleteSPPK = (id: string): void => {
  saveToStorage(STORAGE_KEYS.sppk, getSPPK().filter(item => item.id !== id));
};

// PK functions
export const getPK = (): PK[] => getFromStorage(STORAGE_KEYS.pk, []);

// Helper to get produkKredit from jenisKredit
const getProdukKreditByJenisKredit = (jenisKredit: string): string => {
  const jenisKreditList = getJenisKredit();
  const found = jenisKreditList.find(jk => jk.nama === jenisKredit);
  return found?.produkKredit || '';
};

// Check if jenis kredit is special (KMK-KBK or KI-KBK)
const isSpecialKreditType = (jenisKredit: string): boolean => {
  const produkKredit = getProdukKreditByJenisKredit(jenisKredit);
  return produkKredit === 'KMK-KBK' || produkKredit === 'KI-KBK';
};

export const addPK = (data: Omit<PK, 'id' | 'nomor' | 'nomorPK' | 'createdAt'> & { isKBK?: boolean }): PK => {
  const items = getPK().filter(s => s.type === data.type);
  const nomor = items.length + 1;
  const now = new Date();
  const nomorPadded = String(nomor).padStart(3, '0');
  const prefix = data.type === 'telihan' ? 'BPD-TLH' : 'ULM-TLH';
  const produkKredit = getProdukKreditByJenisKredit(data.jenisKredit);
  
  let nomorPK: string;
  
  // PK Telihan dengan checkbox KBK dicentang
  if (data.type === 'telihan' && data.isKBK) {
    // Format KBK: [nomor pk 3 digit]/[PRODUK KREDIT]/BPD-TLH/[bulan romawi]/[tahun numerik]
    nomorPK = `${nomorPadded}/${produkKredit}/${prefix}/${toRomanMonth(now.getMonth())}/${now.getFullYear()}`;
  } else if (data.type === 'meranti' && isSpecialKreditType(data.jenisKredit)) {
    // PK Meranti dengan jenis kredit khusus (KMK-KBK atau KI-KBK)
    nomorPK = `${nomorPadded}/${produkKredit}/${prefix}/${toRomanMonth(now.getMonth())}/${now.getFullYear()}`;
  } else {
    // Format standar: [Nomor PK 3 Digit]/[Jenis Debitur 3 Digit]/[Kode Fasilitas 2 digit]/[Sektor ekonomi 4 digit]/BPD-TLH atau ULM-TLH/[Tahun Numerik]
    nomorPK = `${nomorPadded}/${data.jenisDebitur}/${data.kodeFasilitas}/${data.sektorEkonomi}/${prefix}/${now.getFullYear()}`;
  }
  
  // Remove isKBK from data before saving
  const { isKBK, ...saveData } = data;
  const newItem: PK = { ...saveData, id: generateId(), nomor, nomorPK, createdAt: now };
  saveToStorage(STORAGE_KEYS.pk, [...getPK(), newItem]);
  return newItem;
};
export const updatePK = (id: string, data: Partial<PK>): void => {
  const items = getPK().map(item => item.id === id ? { ...item, ...data } : item);
  saveToStorage(STORAGE_KEYS.pk, items);
};
export const deletePK = (id: string): void => {
  saveToStorage(STORAGE_KEYS.pk, getPK().filter(item => item.id !== id));
};

// KK & MPAK functions
export const getKKMPAK = (): KKMPAK[] => getFromStorage(STORAGE_KEYS.kkmpak, []);
export const addKKMPAK = (data: Omit<KKMPAK, 'id' | 'nomor' | 'nomorKK' | 'nomorMPAK' | 'createdAt'>): KKMPAK => {
  const items = getKKMPAK().filter(s => s.type === data.type);
  const nomor = items.length + 1;
  const now = new Date();
  const nomorPadded = String(nomor).padStart(3, '0');
  const produkKredit = getProdukKreditByJenisKredit(data.jenisKredit);
  
  let nomorKK: string;
  let nomorMPAK: string;
  
  if (data.type === 'telihan') {
    // Format Telihan: KK dan MPAK terpisah
    nomorKK = `${nomorPadded}/KK/BPD-TLH/${toRomanMonth(now.getMonth())}/${now.getFullYear()}`;
    nomorMPAK = `${nomorPadded}/MPAK/BPD-TLH/${toRomanMonth(now.getMonth())}/${now.getFullYear()}`;
  } else {
    // Format Meranti: [nomor agenda 3 digit]/[bulan romawi]/[sektor ekonomi]/[PRODUK KREDIT]/2025
    nomorKK = `${nomorPadded}/${toRomanMonth(now.getMonth())}/${data.sektorEkonomi}/${produkKredit}/${now.getFullYear()}`;
    nomorMPAK = nomorKK;
  }
  
  const newItem: KKMPAK = { ...data, id: generateId(), nomor, nomorKK, nomorMPAK, createdAt: now };
  saveToStorage(STORAGE_KEYS.kkmpak, [...getKKMPAK(), newItem]);
  return newItem;
};
export const updateKKMPAK = (id: string, data: Partial<KKMPAK>): void => {
  const items = getKKMPAK().map(item => item.id === id ? { ...item, ...data } : item);
  saveToStorage(STORAGE_KEYS.kkmpak, items);
};
export const deleteKKMPAK = (id: string): void => {
  saveToStorage(STORAGE_KEYS.kkmpak, getKKMPAK().filter(item => item.id !== id));
};

// Config functions
export const getJenisKredit = (): JenisKredit[] => getFromStorage(STORAGE_KEYS.jenisKredit, defaultJenisKredit);
export const addJenisKredit = (data: Omit<JenisKredit, 'id'>): JenisKredit => {
  const items = getJenisKredit();
  const newItem: JenisKredit = { id: generateId(), ...data };
  saveToStorage(STORAGE_KEYS.jenisKredit, [...items, newItem]);
  return newItem;
};
export const updateJenisKredit = (id: string, data: Partial<JenisKredit>): void => {
  const items = getJenisKredit().map(item => item.id === id ? { ...item, ...data } : item);
  saveToStorage(STORAGE_KEYS.jenisKredit, items);
};
export const deleteJenisKredit = (id: string): void => {
  saveToStorage(STORAGE_KEYS.jenisKredit, getJenisKredit().filter(item => item.id !== id));
};
export const bulkUpdateJenisKredit = (data: Omit<JenisKredit, 'id'>[]): void => {
  const existingItems = getJenisKredit();
  const newItems = data.map(d => ({ ...d, id: generateId() }));
  saveToStorage(STORAGE_KEYS.jenisKredit, [...existingItems, ...newItems]);
};

export const getJenisDebitur = (): JenisDebitur[] => getFromStorage(STORAGE_KEYS.jenisDebitur, defaultJenisDebitur);
export const addJenisDebitur = (data: Omit<JenisDebitur, 'id'>): JenisDebitur => {
  const items = getJenisDebitur();
  const newItem: JenisDebitur = { ...data, id: generateId() };
  saveToStorage(STORAGE_KEYS.jenisDebitur, [...items, newItem]);
  return newItem;
};
export const updateJenisDebitur = (id: string, data: Partial<JenisDebitur>): void => {
  const items = getJenisDebitur().map(item => item.id === id ? { ...item, ...data } : item);
  saveToStorage(STORAGE_KEYS.jenisDebitur, items);
};
export const deleteJenisDebitur = (id: string): void => {
  saveToStorage(STORAGE_KEYS.jenisDebitur, getJenisDebitur().filter(item => item.id !== id));
};
export const bulkUpdateJenisDebitur = (data: Omit<JenisDebitur, 'id'>[]): void => {
  const existingItems = getJenisDebitur();
  const newItems = data.map(d => ({ ...d, id: generateId() }));
  saveToStorage(STORAGE_KEYS.jenisDebitur, [...existingItems, ...newItems]);
};

export const getKodeFasilitas = (): KodeFasilitas[] => getFromStorage(STORAGE_KEYS.kodeFasilitas, defaultKodeFasilitas);
export const addKodeFasilitas = (data: Omit<KodeFasilitas, 'id'>): KodeFasilitas => {
  const items = getKodeFasilitas();
  const newItem: KodeFasilitas = { ...data, id: generateId() };
  saveToStorage(STORAGE_KEYS.kodeFasilitas, [...items, newItem]);
  return newItem;
};
export const updateKodeFasilitas = (id: string, data: Partial<KodeFasilitas>): void => {
  const items = getKodeFasilitas().map(item => item.id === id ? { ...item, ...data } : item);
  saveToStorage(STORAGE_KEYS.kodeFasilitas, items);
};
export const deleteKodeFasilitas = (id: string): void => {
  saveToStorage(STORAGE_KEYS.kodeFasilitas, getKodeFasilitas().filter(item => item.id !== id));
};
export const bulkUpdateKodeFasilitas = (data: Omit<KodeFasilitas, 'id'>[]): void => {
  const existingItems = getKodeFasilitas();
  const newItems = data.map(d => ({ ...d, id: generateId() }));
  saveToStorage(STORAGE_KEYS.kodeFasilitas, [...existingItems, ...newItems]);
};

export const getSektorEkonomi = (): SektorEkonomi[] => getFromStorage(STORAGE_KEYS.sektorEkonomi, defaultSektorEkonomi);
export const addSektorEkonomi = (data: Omit<SektorEkonomi, 'id'>): SektorEkonomi => {
  const items = getSektorEkonomi();
  const newItem: SektorEkonomi = { ...data, id: generateId() };
  saveToStorage(STORAGE_KEYS.sektorEkonomi, [...items, newItem]);
  return newItem;
};
export const updateSektorEkonomi = (id: string, data: Partial<SektorEkonomi>): void => {
  const items = getSektorEkonomi().map(item => item.id === id ? { ...item, ...data } : item);
  saveToStorage(STORAGE_KEYS.sektorEkonomi, items);
};
export const deleteSektorEkonomi = (id: string): void => {
  saveToStorage(STORAGE_KEYS.sektorEkonomi, getSektorEkonomi().filter(item => item.id !== id));
};
export const bulkUpdateSektorEkonomi = (data: Omit<SektorEkonomi, 'id'>[]): void => {
  const existingItems = getSektorEkonomi();
  const newItems = data.map(d => ({ ...d, id: generateId() }));
  saveToStorage(STORAGE_KEYS.sektorEkonomi, [...existingItems, ...newItems]);
};

// User update function
export const updateUser = (id: string, data: Partial<User>): void => {
  const items = getUsers().map(item => item.id === id ? { ...item, ...data } : item);
  saveToStorage(STORAGE_KEYS.users, items);
};
