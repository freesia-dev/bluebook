// Daftar halaman yang bisa dilompati langsung dari Command Palette (Ctrl+K).
// Dicek terhadap isRouteAllowedFor() sebelum ditampilkan, jadi user cuma
// lihat halaman yang memang boleh diaksesnya (nggak bocor ke role lain).
export interface CommandPage {
  label: string;
  path: string;
  group: string;
  /** kata kunci tambahan biar gampang ketemu walau ketik istilah lain */
  keywords?: string[];
}

export const COMMAND_PAGES: CommandPage[] = [
  { label: 'Dashboard', path: '/dashboard', group: 'Umum' },
  { label: 'Executive Dashboard', path: '/executive', group: 'Umum', keywords: ['pimpinan'] },
  { label: 'Surat Masuk', path: '/surat-masuk', group: 'Umum' },
  { label: 'Surat Keluar', path: '/surat-keluar', group: 'Umum' },
  { label: 'Activity Log', path: '/activity-log', group: 'Umum', keywords: ['audit', 'riwayat perubahan'] },
  { label: 'Recycle Bin', path: '/recycle-bin', group: 'Umum', keywords: ['sampah', 'hapus'] },
  { label: 'Panduan', path: '/panduan', group: 'Umum', keywords: ['bantuan', 'help'] },
  { label: 'Bluebook Wrapped', path: '/wrapped', group: 'Umum', keywords: ['rangkuman', 'setahun', 'statistik saya'] },

  { label: 'Agenda Kredit', path: '/agenda-kredit/agenda-kredit', group: 'Agenda Kredit' },
  { label: 'SPPK Telihan', path: '/agenda-kredit/sppk-telihan', group: 'Agenda Kredit' },
  { label: 'SPPK Meranti', path: '/agenda-kredit/sppk-meranti', group: 'Agenda Kredit' },
  { label: 'PK Telihan', path: '/agenda-kredit/pk-telihan', group: 'Agenda Kredit' },
  { label: 'PK Meranti', path: '/agenda-kredit/pk-meranti', group: 'Agenda Kredit' },
  { label: 'KK & MPAK Telihan', path: '/agenda-kredit/kk-mpak-telihan', group: 'Agenda Kredit' },
  { label: 'Agenda & MPAK Meranti', path: '/agenda-kredit/agenda-mpak-meranti', group: 'Agenda Kredit' },
  { label: 'Nomor Loan', path: '/agenda-kredit/nomor-loan', group: 'Agenda Kredit' },

  { label: 'Kalkulator Kredit', path: '/kalkulator', group: 'Kalkulator', keywords: ['simulasi kredit'] },
  { label: 'Riwayat Simulasi', path: '/kalkulator/riwayat', group: 'Kalkulator' },
  { label: 'Pipeline Kredit', path: '/kalkulator/pipeline', group: 'Kalkulator' },
  { label: 'Konfigurasi Kalkulator', path: '/konfigurasi/kalkulator', group: 'Kalkulator', keywords: ['tema simulasi', 'tampilan jpg'] },

  { label: 'Database Pengisian ATM', path: '/atm-telihan/database-pengisian', group: 'ATM Telihan' },
  { label: 'Penyelesaian Selisih ATM', path: '/atm-telihan/penyelesaian-selisih', group: 'ATM Telihan' },
  { label: 'Berita Acara ATM', path: '/atm-telihan/ba-pengisian', group: 'ATM Telihan' },
  { label: 'Konfigurasi ATM', path: '/atm-telihan/konfigurasi', group: 'ATM Telihan' },

  { label: 'CIF Nasabah', path: '/cs/cif', group: 'Customer Service' },
  { label: 'Standing Instruction', path: '/cs/si', group: 'Customer Service' },
  { label: 'Logbook Kartu ATM', path: '/cs/kartu-atm', group: 'Customer Service' },
  { label: 'Register Buku Tabungan', path: '/cs/buku-tabungan', group: 'Customer Service' },
  { label: 'Register Bilyet Deposito', path: '/cs/bilyet-deposito', group: 'Customer Service' },
  { label: 'Rekening Simpeda', path: '/cs/rekening/simpeda', group: 'Customer Service' },
  { label: 'Rekening Giro', path: '/cs/rekening/giro', group: 'Customer Service' },
  { label: 'Rekening TabunganKu', path: '/cs/rekening/tabunganku', group: 'Customer Service' },
  { label: 'Rekening Taspen', path: '/cs/rekening/taspen', group: 'Customer Service' },

  { label: 'Monitoring Dashboard', path: '/monitoring/dashboard', group: 'Monitoring' },
  { label: 'Kredit Produktif Unit', path: '/monitoring/kredit-produktif', group: 'Monitoring' },
  { label: 'Export PDF', path: '/monitoring/export-pdf', group: 'Monitoring' },
  { label: 'WA Blaster / Kirim Reminder', path: '/monitoring/reminder', group: 'Monitoring', keywords: ['tunggakan', 'wa blaster'] },
  { label: 'Kontak Debitur', path: '/monitoring/kontak', group: 'Monitoring' },
  { label: 'Upload Data MLF', path: '/monitoring/upload', group: 'Monitoring', keywords: ['mlf', 'excel'] },

  { label: 'Security Dashboard', path: '/security/dashboard', group: 'Security' },
  { label: 'Log Harian Security', path: '/security/log', group: 'Security' },
  { label: 'Link Audit', path: '/security/audit-links', group: 'Security' },
  { label: 'Template Kondisi Kantor', path: '/konfigurasi/kondisi-kantor', group: 'Security' },

  { label: 'Pengaturan User', path: '/konfigurasi/users', group: 'Konfigurasi' },
  { label: 'User Online (Realtime)', path: '/konfigurasi/online-users', group: 'Konfigurasi' },
  { label: 'Menu per Role', path: '/konfigurasi/menu-role', group: 'Konfigurasi' },
  { label: 'Jenis Kredit', path: '/konfigurasi/jenis-kredit', group: 'Konfigurasi' },
  { label: 'Jenis Debitur', path: '/konfigurasi/jenis-debitur', group: 'Konfigurasi' },
  { label: 'Jenis Penggunaan', path: '/konfigurasi/jenis-penggunaan', group: 'Konfigurasi' },
  { label: 'Sektor Ekonomi', path: '/konfigurasi/sektor-ekonomi', group: 'Konfigurasi' },
  { label: 'Asal Instansi', path: '/konfigurasi/asal-instansi', group: 'Konfigurasi' },
];
