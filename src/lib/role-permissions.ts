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
  /** Can mutate data (insert/update/delete) anywhere they have menu access. */
  canEdit: boolean;
  // Module visibility
  dashboard: boolean;
  surat: boolean;             // Surat Masuk & Surat Keluar
  agendaKredit: boolean;
  atmTelihan: boolean;
  monitoring: boolean;
  /** When true, only /monitoring/dashboard is allowed inside Monitoring. */
  monitoringDashboardOnly: boolean;
  konfigurasi: boolean;       // Admin tools section
  comingSoonSecurity: boolean;
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
  comingSoonSecurity: false,
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
  comingSoonSecurity: false,
  comingSoonOB: false,
};

export const ROLE_PERMISSIONS: Record<AppRole, RolePermissions> = {
  admin: { ...FULL },
  user: { ...FULL, konfigurasi: false },
  demo: { ...FULL, canEdit: false, konfigurasi: false },
  pemimpin: { ...FULL, canEdit: false, konfigurasi: false },
  meranti: { ...FULL, konfigurasi: false, atmTelihan: false, monitoringDashboardOnly: true },
  officer_rk: { ...FULL, konfigurasi: false },
  officer_kredit: { ...FULL, konfigurasi: false, atmTelihan: false, monitoringDashboardOnly: true },
  staff_admin_kcp: { ...FULL, konfigurasi: false, monitoringDashboardOnly: true },
  teller: { ...FULL, konfigurasi: false, agendaKredit: false, monitoring: false },
  cs: { ...FULL, konfigurasi: false, agendaKredit: false, monitoring: false },
  security: { ...NONE, comingSoonSecurity: true },
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
    pathname === '/dashboard'
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
  if (pathname.startsWith('/security')) return p.comingSoonSecurity;
  if (pathname.startsWith('/ob')) return p.comingSoonOB;
  return true;
};
