import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Mail, 
  Send, 
  CreditCard, 
  Settings, 
  Info,
  ChevronDown,
  LogOut,
  User,
  X,
  Banknote,
  TrendingUp,
  Shield,
  Sparkles,
  Calculator,
  Headphones
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ROLE_LABELS } from '@/lib/role-permissions';
import logoImage from '@/assets/logo_bluebook.png';

type ChildItem = { label: string; href?: string; children?: { label: string; href: string }[] };

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href?: string;
  children?: ChildItem[];
  isActive?: boolean;
  onNavigate?: () => void;
}

const SubGroup: React.FC<{ label: string; items: { label: string; href: string }[]; onNavigate?: () => void }> = ({ label, items, onNavigate }) => {
  const location = useLocation();
  const hasActive = items.some((i) => location.pathname === i.href);
  const [open, setOpen] = useState(hasActive);
  return (
    <div>
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-all text-xs uppercase tracking-wide",
          "hover:bg-sidebar-accent/50 text-sidebar-foreground/70",
          hasActive && "text-sidebar-foreground"
        )}
      >
        <Settings className="w-3.5 h-3.5 opacity-70" />
        <span className="flex-1 text-left font-semibold">{label}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 opacity-60 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="ml-3 mt-0.5 space-y-0.5 border-l border-sidebar-border/40 pl-3">
          {items.map((it) => (
            <Link
              key={it.href}
              to={it.href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all",
                "hover:bg-sidebar-accent/50 text-sidebar-foreground/70 hover:text-sidebar-foreground",
                location.pathname === it.href && "bg-sidebar-primary text-sidebar-primary-foreground font-semibold"
              )}
            >
              <span className={cn(
                "w-1 h-1 rounded-full",
                location.pathname === it.href ? "bg-sidebar-primary-foreground" : "bg-current opacity-40"
              )} />
              <span>{it.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, href, children, isActive, onNavigate }) => {
  const location = useLocation();
  // Auto-expand if any (nested) child is active
  const isChildActive = (c: ChildItem): boolean =>
    (c.href !== undefined && location.pathname === c.href) ||
    !!c.children?.some((cc) => location.pathname === cc.href);
  const hasActiveChild = children?.some(isChildActive) || false;
  const [isOpen, setIsOpen] = useState(hasActiveChild);

  if (children) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
            "hover:bg-sidebar-accent/80 text-sidebar-foreground",
            hasActiveChild && "bg-sidebar-accent"
          )}
        >
          <Icon className="w-5 h-5 opacity-90" />
          <span className="flex-1 text-left font-medium text-sm">{label}</span>
          <ChevronDown className={cn("w-4 h-4 opacity-60 transition-transform", isOpen && "rotate-180")} />
        </button>
        {isOpen && (
          <div className="ml-3 mt-1 space-y-0.5 animate-slide-in border-l-2 border-sidebar-border/50 pl-3">
            {children.map((child, idx) => {
              if (child.children && child.children.length > 0) {
                return <SubGroup key={`sub-${idx}-${child.label}`} label={child.label} items={child.children} onNavigate={onNavigate} />;
              }
              return (
                <Link
                  key={child.href || `${child.label}-${idx}`}
                  to={child.href!}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm",
                    "hover:bg-sidebar-accent/60 text-sidebar-foreground/70 hover:text-sidebar-foreground",
                    location.pathname === child.href && "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm"
                  )}
                >
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    location.pathname === child.href ? "bg-sidebar-primary-foreground" : "bg-current opacity-40"
                  )} />
                  <span>{child.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={href || '/'}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
        "hover:bg-sidebar-accent/80 text-sidebar-foreground",
        isActive && "bg-sidebar-primary text-sidebar-primary-foreground font-semibold shadow-sm border-l-4 border-sidebar-primary-foreground/30"
      )}
    >
      <Icon className="w-5 h-5 opacity-90" />
      <span className="font-medium text-sm">{label}</span>
    </Link>
  );
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { userName, userRole, logout, isAdmin, permissions } = useAuth();

  const agendaKreditItems = [
    { label: 'Agenda Kredit', href: '/agenda-kredit/agenda-kredit' },
    { label: 'SPPK Telihan', href: '/agenda-kredit/sppk-telihan' },
    { label: 'SPPK Meranti', href: '/agenda-kredit/sppk-meranti' },
    { label: 'PK Telihan', href: '/agenda-kredit/pk-telihan' },
    { label: 'PK Meranti', href: '/agenda-kredit/pk-meranti' },
    { label: 'KK & MPAK Telihan', href: '/agenda-kredit/kk-mpak-telihan' },
    { label: 'Agenda & MPAK Meranti', href: '/agenda-kredit/agenda-mpak-meranti' },
    { label: 'Nomor Loan', href: '/agenda-kredit/nomor-loan' },
  ];

  const simulasiKreditItems: ChildItem[] = [
    { label: 'Kalkulator Konsumtif', href: '/kalkulator' },
    { label: 'Kalkulator Produktif', href: '/kalkulator/produktif' },
    { label: 'Riwayat Simulasi', href: '/kalkulator/riwayat' },
    { label: 'Pipeline Kredit', href: '/kalkulator/pipeline' },

    ...(isAdmin
      ? [
          {
            label: 'Konfigurasi',
            children: [
              { label: 'Produk Kalkulator', href: '/konfigurasi/produk-kalkulator' },
              { label: 'Usia Pensiun', href: '/konfigurasi/usia-pensiun' },
              { label: 'Program Kalkulator', href: '/konfigurasi/promo-kalkulator' },
            ],
          },
        ]
      : []),
  ];

  const atmTelihanItems = [
    { label: 'Database Pengisian ATM', href: '/atm-telihan/database-pengisian' },
    { label: 'Penyelesaian Selisih', href: '/atm-telihan/penyelesaian-selisih' },
    { label: 'Berita Acara ATM', href: '/atm-telihan/ba-pengisian' },
    { label: 'Konfigurasi ATM', href: '/atm-telihan/konfigurasi' },
  ];

  const csItems: ChildItem[] = [
    { label: 'CIF Nasabah', href: '/cs/cif' },
    {
      label: 'Register Rekening',
      children: [
        { label: 'Simpeda', href: '/cs/rekening/simpeda' },
        { label: 'Simpeda IB', href: '/cs/rekening/simpeda-ib' },
        { label: 'Prama', href: '/cs/rekening/prama' },
        { label: 'Simpel', href: '/cs/rekening/simpel' },
        { label: 'TabunganKu', href: '/cs/rekening/tabunganku' },
        { label: 'Giro', href: '/cs/rekening/giro' },
        { label: 'Al-Amin', href: '/cs/rekening/alamin' },
        { label: 'Taspen', href: '/cs/rekening/taspen' },
      ],
    },
    { label: 'Standing Instruction (SI)', href: '/cs/si' },
    { label: 'Logbook Kartu ATM', href: '/cs/kartu-atm' },
    { label: 'Register Buku Tabungan', href: '/cs/buku-tabungan' },
    { label: 'Register Bilyet Deposito', href: '/cs/bilyet-deposito' },
  ];

  const monitoringItemsFull = [
    { label: 'Upload Data', href: '/monitoring/upload' },
    { label: 'Dashboard', href: '/monitoring/dashboard' },
    { label: 'Kredit Produktif Unit', href: '/monitoring/kredit-produktif' },
    { label: 'Export PDF', href: '/monitoring/export-pdf' },
    { label: 'Kontak Debitur', href: '/monitoring/kontak' },
    { label: 'WA Blaster', href: '/monitoring/reminder' },
  ];
  const monitoringItems = (permissions.monitoringDashboardOnly
    ? monitoringItemsFull.filter((m) => m.href === '/monitoring/dashboard' || m.href === '/monitoring/kredit-produktif')
    : monitoringItemsFull
  ).filter((m) => m.href !== '/monitoring/upload' || permissions.canUpload);

  const konfigurasiItems = isAdmin
    ? [
        { label: 'Pengaturan User', href: '/konfigurasi/users' },
        { label: 'User Online (Realtime)', href: '/konfigurasi/online-users' },
        { label: 'Jenis Kredit', href: '/konfigurasi/jenis-kredit' },
        { label: 'Jenis Debitur', href: '/konfigurasi/jenis-debitur' },
        { label: 'Jenis Penggunaan', href: '/konfigurasi/jenis-penggunaan' },
        { label: 'Sektor Ekonomi', href: '/konfigurasi/sektor-ekonomi' },
        { label: 'Template Kondisi Kantor', href: '/konfigurasi/kondisi-kantor' },
        { label: 'Activity Log', href: '/activity-log' },
        { label: 'Recycle Bin', href: '/recycle-bin' },
      ]
    : [
        { label: 'Jenis Kredit', href: '/konfigurasi/jenis-kredit' },
        { label: 'Jenis Debitur', href: '/konfigurasi/jenis-debitur' },
        { label: 'Jenis Penggunaan', href: '/konfigurasi/jenis-penggunaan' },
        { label: 'Sektor Ekonomi', href: '/konfigurasi/sektor-ekonomi' },
      ];

  return (
    <>
      {/* Overlay for mobile only */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar - always fixed position, slides in/out */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen w-64 gradient-dark transition-transform duration-300",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-sidebar-border">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-md p-1.5">
                <img 
                  src={logoImage} 
                  alt="Bluebook Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-sidebar-foreground">Bluebook</h1>
                <p className="text-xs text-sidebar-foreground/60">Telihan</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {permissions.dashboard && (
              <NavItem 
                icon={LayoutDashboard} 
                label="Dashboard" 
                href="/dashboard" 
                isActive={location.pathname === '/dashboard'} 
                onNavigate={onClose}
              />
            )}
            {permissions.surat && (
              <>
                <NavItem 
                  icon={Mail} 
                  label="Surat Masuk" 
                  href="/surat-masuk" 
                  isActive={location.pathname === '/surat-masuk'} 
                  onNavigate={onClose}
                />
                <NavItem 
                  icon={Send} 
                  label="Surat Keluar" 
                  href="/surat-keluar" 
                  isActive={location.pathname === '/surat-keluar'} 
                  onNavigate={onClose}
                />
              </>
            )}
            {permissions.agendaKredit && (
              <NavItem 
                icon={CreditCard} 
                label="Agenda Kredit" 
                children={agendaKreditItems}
                onNavigate={onClose}
              />
            )}
            {permissions.loanCalc && (
              <NavItem
                icon={Calculator}
                label="Simulasi Kredit"
                children={simulasiKreditItems}
                onNavigate={onClose}
              />
            )}
            {permissions.atmTelihan && (
              <NavItem 
                icon={Banknote} 
                label="ATM Telihan" 
                children={atmTelihanItems}
                onNavigate={onClose}
              />
            )}
            {permissions.customerService && (
              <NavItem
                icon={Headphones}
                label="Customer Service"
                children={csItems}
                onNavigate={onClose}
              />
            )}
            {permissions.monitoring && monitoringItems.length > 0 && (
              <NavItem 
                icon={TrendingUp} 
                label="Loan Monitoring" 
                children={monitoringItems}
                onNavigate={onClose}
              />
            )}
            {permissions.securityLog && (
              permissions.canManageSecurityAudit ? (
                <NavItem 
                  icon={Shield} 
                  label="Log Security" 
                  children={[
                    { label: 'Log Harian', href: '/security/log' },
                    { label: 'Link Audit', href: '/security/audit-links' },
                  ]}
                  onNavigate={onClose}
                />
              ) : (
                <NavItem 
                  icon={Shield} 
                  label="Log Security" 
                  href="/security/log" 
                  isActive={location.pathname.startsWith('/security')} 
                  onNavigate={onClose}
                />
              )
            )}

            {permissions.comingSoonOB && (
              <NavItem 
                icon={Sparkles} 
                label="OB" 
                href="/ob" 
                isActive={location.pathname === '/ob'} 
                onNavigate={onClose}
              />
            )}
            {isAdmin && (
              <NavItem 
                icon={Settings} 
                label="Konfigurasi" 
                children={konfigurasiItems}
                onNavigate={onClose}
              />
            )}
            <NavItem 
              icon={Info} 
              label="About" 
              href="/about" 
              isActive={location.pathname === '/about'} 
              onNavigate={onClose}
            />
          </nav>

          {/* User Info */}
          <div className="px-4 py-4 border-t border-sidebar-border">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
                <User className="w-5 h-5 text-sidebar-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
                <p className="text-xs text-sidebar-foreground/60">{ROLE_LABELS[userRole] ?? userRole}</p>
              </div>
            </div>
            <Button 
              onClick={logout}
              variant="ghost" 
              className="w-full justify-start gap-2 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};
