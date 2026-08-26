// Centralised role + permission definitions.
// Add new roles here and the sidebar, route guard, and Users page pick them up.

export type AppRole =
  | 'admin'
  | 'user'
  | 'demo'
  | 'kic'
  | 'meranti'
  | 'officer_rk'
  | 'officer_kredit'
  | 'staff_admin_kcp'
  | 'pemimpin'
  | 'teller'
  | 'cs'
  | 'security'
  | 'team_leader_security'
  | 'ob';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin (IT)',
  user: 'User',
  demo: 'Demo (View Only)',
  kic: 'KIC (Kontrol Internal Cabang)',
  meranti: 'Meranti',
  officer_rk: 'Officer Relationship Kredit',
  officer_kredit: 'Officer Kredit',
  staff_admin_kcp: 'Staff Administrasi KCP',
  pemimpin: 'Pemimpin (View & Approve)',
  teller: 'Teller',
  cs: 'Customer Service',
  security: 'Security',
  team_leader_security: 'Team Leader Security',
  ob: 'OB',
};


export interface RolePermissions {
  canEdit: boolean;
  dashboard: boolean;
  surat: boolean;
  agendaKredit: boolean;
  atmTelihan: boolean;
  monitoring: boolean;
  monitoringDashboardOnly: boolean;
  konfigurasi: boolean;
  /** Log Security module access (Security, Staff Admin KCP, Pemimpin, Admin). */
  securityLog: boolean;
  /** Can sign the daily Security BA (Pemimpin + Admin). */
  canSignSecurityBA: boolean;
  /** Can create/edit shifts and entries (Security, Staff Admin KCP, Admin). */
  canEditSecurityLog: boolean;
  /** Can print the daily Security BA (Admin + Staff Admin KCP). */
  canPrintSecurityBA: boolean;
  /** Can start a new shift (Admin + Security). */
  canStartSecurityShift: boolean;
  /** Can post supervisor comments / flag incidents on security log (Admin + Team Leader). */
  canCommentSecurityLog: boolean;
  /** Can manage audit access tokens (Admin only). */
  canManageSecurityAudit: boolean;
  /** Can use the Loan Calculator (everyone except security/ob/teller/cs). */
  loanCalc: boolean;
  /** Customer Service modules (CIF, rekening, kartu ATM, buku tabungan, deposito). */
  customerService: boolean;
  comingSoonOB: boolean;
  /** Can upload data files (MLF upload). */
  canUpload: boolean;
  /** Executive Dashboard (KPI bank) — khusus Pemimpin. */
  executiveDashboard: boolean;
  /** Dashboard khusus Security & Team Leader Security (menggantikan dashboard utama). */
  securityDashboard: boolean;
}


const FULL: RolePermissions = {
  canEdit: true,
  dashboard: true,
  surat: true,
  agendaKredit: true,
  atmTelihan: true,
  monitoring: true,
  monitoringDashboardOnly: false,
  konfigurasi: true,
  securityLog: false,
  canSignSecurityBA: false,
  canEditSecurityLog: false,
  canPrintSecurityBA: false,
  canStartSecurityShift: false,
  canCommentSecurityLog: false,
  canManageSecurityAudit: false,
  loanCalc: true,
  customerService: false,
  comingSoonOB: false,
  canUpload: true,
  executiveDashboard: false,
  securityDashboard: false,
};

const NONE: RolePermissions = {
  canEdit: false,
  dashboard: true,
  surat: false,
  agendaKredit: false,
  atmTelihan: false,
  monitoring: false,
  monitoringDashboardOnly: false,
  konfigurasi: false,
  securityLog: false,
  canSignSecurityBA: false,
  canEditSecurityLog: false,
  canPrintSecurityBA: false,
  canStartSecurityShift: false,
  canCommentSecurityLog: false,
  canManageSecurityAudit: false,
  loanCalc: false,
  customerService: false,
  comingSoonOB: false,
  canUpload: false,
  executiveDashboard: false,
  securityDashboard: false,
};


export const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  admin: { ...FULL, securityLog: true, canSignSecurityBA: true, canEditSecurityLog: true, canPrintSecurityBA: true, canStartSecurityShift: true, canCommentSecurityLog: true, canManageSecurityAudit: true, customerService: true },
  // Only admin may upload MLF data — every other role has canUpload:false so the menu is hidden.
  user: { ...FULL, konfigurasi: false, canUpload: false },
  demo: { ...FULL, canEdit: false, konfigurasi: false, customerService: true, securityLog: true, canUpload: false },
  kic: { ...FULL, canEdit: false, konfigurasi: false, customerService: true, securityLog: true, canUpload: false },
  pemimpin: { ...FULL, canEdit: false, konfigurasi: false, securityLog: true, canSignSecurityBA: true, customerService: true, canUpload: false, executiveDashboard: true, dashboard: false, monitoring: false },
  meranti: { ...FULL, konfigurasi: false, atmTelihan: false, monitoringDashboardOnly: true, canUpload: false },
  officer_rk: { ...FULL, konfigurasi: false, canUpload: false },
  officer_kredit: { ...FULL, konfigurasi: false, atmTelihan: false, monitoringDashboardOnly: true, canUpload: false },
  staff_admin_kcp: { ...FULL, konfigurasi: false, monitoringDashboardOnly: true, securityLog: true, canEditSecurityLog: true, canPrintSecurityBA: true, canUpload: false },
  teller: { ...FULL, konfigurasi: false, agendaKredit: false, monitoring: false, loanCalc: false, canUpload: false },
  cs: { ...FULL, konfigurasi: false, agendaKredit: false, monitoring: false, loanCalc: false, customerService: true, atmTelihan: false, canUpload: false },
  security: { ...NONE, securityLog: true, canEditSecurityLog: true, canStartSecurityShift: true, canEdit: true, dashboard: false, securityDashboard: true },
  team_leader_security: { ...NONE, securityLog: true, canCommentSecurityLog: true, canEdit: true, dashboard: false, securityDashboard: true },
  ob: { ...NONE, comingSoonOB: true },
};



export const getPermissions = (role: AppRole | null | undefined): RolePermissions =>
  role ? ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.user : ROLE_PERMISSIONS.user;

/** Flag izin yang boleh diatur admin per role (menu yang muncul di sidebar). */
export const MENU_PERMISSION_FLAGS: { key: keyof RolePermissions; label: string; desc?: string }[] = [
  { key: 'dashboard', label: 'Dashboard Utama' },
  { key: 'executiveDashboard', label: 'Executive Dashboard' },
  { key: 'securityDashboard', label: 'Dashboard Security' },
  { key: 'surat', label: 'Surat Masuk & Keluar' },
  { key: 'agendaKredit', label: 'Agenda Kredit' },
  { key: 'loanCalc', label: 'Simulasi Kredit (Kalkulator)' },
  { key: 'atmTelihan', label: 'ATM Telihan' },
  { key: 'customerService', label: 'Customer Service' },
  { key: 'monitoring', label: 'Loan Monitoring' },
  { key: 'monitoringDashboardOnly', label: 'Loan Monitoring — Dashboard saja', desc: 'Batasi Loan Monitoring hanya ke dashboard & kredit produktif' },
  { key: 'canUpload', label: 'Upload Data MLF' },
  { key: 'securityLog', label: 'Log Security' },
  { key: 'konfigurasi', label: 'Konfigurasi & Log Sistem' },
  { key: 'comingSoonOB', label: 'Menu OB' },
  { key: 'canEdit', label: 'Boleh Menambah/Mengubah Data' },
];

/** Override per role: { admin: { surat: false }, ... } */
export type RoleMenuOverrides = Partial<Record<AppRole, Partial<Record<keyof RolePermissions, boolean>>>>;

export const ROLE_MENU_OVERRIDES_KEY = 'role_menu_overrides';

export const applyRoleOverrides = (
  role: AppRole | null | undefined,
  overrides: RoleMenuOverrides | null | undefined,
): RolePermissions => {
  const base = getPermissions(role);
  const ov = role ? overrides?.[role] : undefined;
  if (!ov) return base;
  return { ...base, ...ov } as RolePermissions;
};

  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/about' ||
    pathname === '/panduan' ||
    pathname === '/install' ||

    pathname.startsWith('/verify/') ||
    pathname.startsWith('/audit/')
  ) return true;

  if (pathname === '/executive') return p.executiveDashboard;
  if (pathname === '/dashboard') return p.dashboard || !(p.executiveDashboard || p.securityDashboard);
  if (pathname.startsWith('/surat-')) return p.surat;
  if (pathname.startsWith('/agenda-kredit')) return p.agendaKredit;
  if (pathname.startsWith('/atm-telihan')) return p.atmTelihan;
  if (pathname.startsWith('/monitoring')) {
    if (!p.monitoring) return false;
    if (pathname === '/monitoring/upload' && !p.canUpload) return false;
    if (p.monitoringDashboardOnly) {
      return pathname === '/monitoring/dashboard' || pathname === '/monitoring/kredit-produktif';
    }
    return true;
  }
  if (pathname.startsWith('/konfigurasi') || pathname === '/activity-log' || pathname === '/recycle-bin') {
    return p.konfigurasi;
  }
  if (pathname.startsWith('/security')) return p.securityLog;
  if (pathname.startsWith('/kalkulator')) return p.loanCalc;
  if (pathname.startsWith('/cs')) return p.customerService;
  if (pathname.startsWith('/ob')) return p.comingSoonOB;
  return true;
};
