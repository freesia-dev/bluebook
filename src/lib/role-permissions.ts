// Centralised role + permission definitions.
// Add new roles here and the sidebar, route guard, and Users page pick them up.

export type AppRole =
  | 'admin'
  | 'user'
  | 'demo'
  | 'meranti'
  | 'officer_rk'
  | 'officer_kredit'
  | 'staff_admin_kcp'
  | 'pemimpin'
  | 'teller'
  | 'cs'
  | 'security'
  | 'ob';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: 'Admin (IT)',
  user: 'User',
  demo: 'Demo (View Only)',
  meranti: 'Meranti',
  officer_rk: 'Officer Relationship Kredit',
  officer_kredit: 'Officer Kredit',
  staff_admin_kcp: 'Staff Administrasi KCP',
  pemimpin: 'Pemimpin (View & Approve)',
  teller: 'Teller',
  cs: 'Customer Service',
  security: 'Security',
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
  comingSoonOB: false,
};

export const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  admin: { ...FULL, securityLog: true, canSignSecurityBA: true, canEditSecurityLog: true },
  user: { ...FULL, konfigurasi: false },
  demo: { ...FULL, canEdit: false, konfigurasi: false },
  pemimpin: { ...FULL, canEdit: false, konfigurasi: false, securityLog: true, canSignSecurityBA: true },
  meranti: { ...FULL, konfigurasi: false, atmTelihan: false, monitoringDashboardOnly: true },
  officer_rk: { ...FULL, konfigurasi: false },
  officer_kredit: { ...FULL, konfigurasi: false, atmTelihan: false, monitoringDashboardOnly: true },
  staff_admin_kcp: { ...FULL, konfigurasi: false, monitoringDashboardOnly: true, securityLog: true, canEditSecurityLog: true },
  teller: { ...FULL, konfigurasi: false, agendaKredit: false, monitoring: false },
  cs: { ...FULL, konfigurasi: false, agendaKredit: false, monitoring: false },
  security: { ...NONE, securityLog: true, canEditSecurityLog: true, canEdit: true },
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
    pathname === '/about' ||
    pathname === '/panduan' ||
    pathname === '/install' ||
    pathname === '/dashboard' ||
    pathname.startsWith('/verify/')
  ) return true;
  if (pathname.startsWith('/surat-')) return p.surat;
  if (pathname.startsWith('/agenda-kredit')) return p.agendaKredit;
  if (pathname.startsWith('/atm-telihan')) return p.atmTelihan;
  if (pathname.startsWith('/monitoring')) {
    if (!p.monitoring) return false;
    if (p.monitoringDashboardOnly) return pathname === '/monitoring/dashboard';
    return true;
  }
  if (pathname.startsWith('/konfigurasi') || pathname === '/activity-log' || pathname === '/recycle-bin') {
    return p.konfigurasi;
  }
  if (pathname.startsWith('/security')) return p.securityLog;
  if (pathname.startsWith('/ob')) return p.comingSoonOB;
  return true;
};
