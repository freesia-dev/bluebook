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
};


export const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  admin: { ...FULL, securityLog: true, canSignSecurityBA: true, canEditSecurityLog: true, canPrintSecurityBA: true, canStartSecurityShift: true, canCommentSecurityLog: true, canManageSecurityAudit: true, customerService: true },
  user: { ...FULL, konfigurasi: false },
  demo: { ...FULL, canEdit: false, konfigurasi: false, customerService: true },
  pemimpin: { ...FULL, canEdit: false, konfigurasi: false, securityLog: true, canSignSecurityBA: true, customerService: true },
  meranti: { ...FULL, konfigurasi: false, atmTelihan: false, monitoringDashboardOnly: true },
  officer_rk: { ...FULL, konfigurasi: false },
  officer_kredit: { ...FULL, konfigurasi: false, atmTelihan: false, monitoringDashboardOnly: true },
  staff_admin_kcp: { ...FULL, konfigurasi: false, monitoringDashboardOnly: true, securityLog: true, canEditSecurityLog: true, canPrintSecurityBA: true },
  teller: { ...FULL, konfigurasi: false, agendaKredit: false, monitoring: false, loanCalc: false },
  cs: { ...FULL, konfigurasi: false, agendaKredit: false, monitoring: false, loanCalc: false, customerService: true, atmTelihan: false },
  security: { ...NONE, securityLog: true, canEditSecurityLog: true, canStartSecurityShift: true, canEdit: true },
  team_leader_security: { ...NONE, securityLog: true, canCommentSecurityLog: true, canEdit: true },
  ob: { ...NONE, comingSoonOB: true },
};



export const getPermissions = (role: AppRole | null | undefined): RolePermissions =>
  role ? ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.user : ROLE_PERMISSIONS.user;

/** Map a route path to the permission flag(s) required to access it. */
export const isRouteAllowed = (pathname: string, role: AppRole): boolean => {
  const p = getPermissions(role);
  // Always-open routes
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/about' ||
    pathname === '/panduan' ||
    pathname === '/install' ||
    pathname === '/dashboard' ||
    pathname.startsWith('/verify/') ||
    pathname.startsWith('/audit/')
  ) return true;

  if (pathname.startsWith('/surat-')) return p.surat;
  if (pathname.startsWith('/agenda-kredit')) return p.agendaKredit;
  if (pathname.startsWith('/atm-telihan')) return p.atmTelihan;
  if (pathname.startsWith('/monitoring')) {
    if (!p.monitoring) return false;
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
