import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Mail, 
  Send, 
  CreditCard, 
  Settings, 
  Info,
  ChevronDown,
  ChevronRight,
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
import { useIsMobile } from '@/hooks/use-mobile';
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
  collapsed?: boolean;
  onNavigate?: () => void;
  openGroup?: string | null;
  setOpenGroup?: (label: string | null) => void;
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
          "glass-item text-sidebar-foreground/70",
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
                "glass-item text-sidebar-foreground/70 hover:text-sidebar-foreground",
                location.pathname === it.href && "glass-item-active text-sidebar-foreground font-semibold"
              )}
            >
              <span className={cn(
                "w-1 h-1 rounded-full",
                location.pathname === it.href ? "bg-sidebar-primary" : "bg-current opacity-40"
              )} />
              <span>{it.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

/** Flyout panel (muncul saat hover) untuk mode collapse — dirender via portal agar tidak terpotong. */
const Flyout: React.FC<{
  label: string;
  items?: ChildItem[];
  href?: string;
  pos: { top: number; left: number };
  visible: boolean;
  onNavigate?: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}> = ({ label, items, href, pos, visible, onNavigate, onMouseEnter, onMouseLeave }) => {
  const location = useLocation();
  return createPortal(
    <div
      data-sidebar-flyout
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ top: pos.top, left: pos.left }}
      className={cn(
        "fixed z-[100] min-w-[240px] max-h-[70vh] overflow-y-auto scrollbar-thin origin-left",
        "transition-[opacity,transform] duration-300 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] will-change-[opacity,transform]",
        visible
          ? "opacity-100 translate-x-0 scale-100 pointer-events-auto"
          : "opacity-0 -translate-x-3 scale-[0.97] pointer-events-none"
      )}
    >
      <div className="rounded-2xl p-2 shadow-2xl bg-sidebar/95 backdrop-blur-xl border border-sidebar-border">
        <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-sidebar-foreground/70">
          {label}
        </p>
        {!items && href && (
          <Link
            to={href}
            onClick={onNavigate}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-sidebar-foreground hover:bg-sidebar-accent/60"
          >
            <ChevronRight className="w-3.5 h-3.5 opacity-60" />
            Buka {label}
          </Link>
        )}
        {items?.map((child, idx) => {
          if (child.children?.length) {
            return (
              <div key={`fg-${idx}`} className="mt-1">
                <p className="px-3 py-1 text-[10px] uppercase tracking-wide text-sidebar-foreground/55">{child.label}</p>
                {child.children.map((cc) => (
                  <Link
                    key={cc.href}
                    to={cc.href}
                    onClick={onNavigate}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-sidebar-foreground/85 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                      location.pathname === cc.href && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                    )}
                  >
                    <span className="w-1 h-1 rounded-full bg-current opacity-60" />
                    {cc.label}
                  </Link>
                ))}
              </div>
            );
          }
          return (
            <Link
              key={child.href || `${child.label}-${idx}`}
              to={child.href!}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-sidebar-foreground/90 hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                location.pathname === child.href && "bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
              {child.label}
            </Link>
          );
        })}
      </div>
    </div>,
    document.body
  );
};

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, href, children, isActive, collapsed, onNavigate, openGroup, setOpenGroup }) => {
  const location = useLocation();
  // Auto-expand if any (nested) child is active
  const isChildActive = (c: ChildItem): boolean =>
    (c.href !== undefined && location.pathname === c.href) ||
    !!c.children?.some((cc) => location.pathname === cc.href);
  const hasActiveChild = children?.some(isChildActive) || false;
  const isOpen = openGroup === label || (openGroup == null && hasActiveChild);

  const anchorRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openFlyout = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (openTimer.current) clearTimeout(openTimer.current);
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect();
      if (r) setPos({ top: Math.min(r.top - 4, window.innerHeight - 160), left: r.right + 10 });
    };
    place();
    openTimer.current = setTimeout(() => { place(); setHover(true); }, 70);
  };
  const closeFlyout = () => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setHover(false), 180);
  };

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    if (openTimer.current) clearTimeout(openTimer.current);
  }, []);

  // ── Mode collapse: icon saja + flyout saat hover ──
  if (collapsed) {
    const active = isActive || hasActiveChild;
    const iconBox = (
      <div
        className={cn(
          "w-11 h-11 mx-auto flex items-center justify-center rounded-xl glass-item",
          "text-sidebar-foreground/75 hover:text-sidebar-foreground",
          "transition-[background-color,color,box-shadow] duration-300 ease-out",
          "hover:bg-white/10 hover:shadow-[0_4px_16px_-6px_rgba(0,0,0,0.45)]",
          active && "glass-item-active text-sidebar-primary"
        )}
      >
        <Icon className="w-5 h-5 transition-transform duration-300 ease-out group-hover/rail:scale-110" />
      </div>
    );
    return (
      <div
        ref={anchorRef}
        className="relative group/rail"
        onMouseEnter={openFlyout}
        onMouseLeave={closeFlyout}
      >
        {children ? (
          <button className="w-full">{iconBox}</button>
        ) : (
          <Link to={href || '/'} onClick={onNavigate} className="block">{iconBox}</Link>
        )}
        <Flyout
          label={label}
          items={children}
          href={href}
          pos={pos}
          visible={hover}
          onNavigate={onNavigate}
          onMouseEnter={openFlyout}
          onMouseLeave={closeFlyout}
        />
      </div>
    );
  }


  if (children) {
    return (
      <div>
        <button
          onClick={() => setOpenGroup?.(isOpen ? null : label)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 glass-item",
            "text-sidebar-foreground",
            hasActiveChild && "bg-white/5 border-white/10"
          )}
        >
          <Icon className="w-5 h-5 opacity-90 shrink-0" />
          <span className="flex-1 text-left font-medium text-sm truncate">{label}</span>
          <ChevronDown className={cn("w-4 h-4 opacity-60 transition-transform", isOpen && "rotate-180")} />
        </button>
        {isOpen && (
          <div className="ml-3 mt-1 space-y-0.5 animate-slide-in border-l border-white/10 pl-3">
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
                    "flex items-center gap-3 px-3 py-2.5 text-sm glass-item",
                    "text-sidebar-foreground/70 hover:text-sidebar-foreground",
                    location.pathname === child.href && "glass-item-active text-sidebar-foreground font-semibold"
                  )}
                >
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all",
                    location.pathname === child.href ? "bg-sidebar-primary" : "bg-current opacity-40"
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
        "flex items-center gap-3 px-4 py-3 glass-item",
        "text-sidebar-foreground",
        isActive && "glass-item-active font-semibold"
      )}
    >
      <Icon className={cn("w-5 h-5 opacity-90 shrink-0", isActive && "text-sidebar-primary opacity-100")} />
      <span className="font-medium text-sm truncate">{label}</span>
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
  const isMobile = useIsMobile();
  const collapsed = !isOpen && !isMobile;
  const [openGroup, setOpenGroup] = useState<string | null>(null);



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

  const monitoringItems: ChildItem[] = [
    { label: 'Dashboard', href: '/monitoring/dashboard' },
    {
      label: 'Laporan & Analisa',
      children: [
        { label: 'Kredit Produktif Unit', href: '/monitoring/kredit-produktif' },
        { label: 'Export PDF', href: '/monitoring/export-pdf' },
      ],
    },
    ...(permissions.monitoringDashboardOnly
      ? []
      : [
          {
            label: 'WA Blaster',
            children: [
              { label: 'Kirim Pesan', href: '/monitoring/reminder' },
              { label: 'Kontak Debitur', href: '/monitoring/kontak' },
            ],
          },
        ]),
  ];


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

  const navOnNavigate = isMobile ? onClose : undefined;

  return (
    <>
      {/* Overlay for mobile only */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar - expanded (w-64) atau collapsed rail (w-[76px]) di desktop */}
      <aside data-sidebar-root className={cn(
        "fixed left-0 top-0 z-50 h-screen sidebar-glass",
        "transition-[width,transform] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full lg:w-[76px] lg:translate-x-0"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            "flex items-center border-b border-white/10 py-4 transition-all duration-300",
            collapsed ? "justify-center px-2" : "justify-between px-5"
          )}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 shrink-0 rounded-2xl glass-panel flex items-center justify-center p-1.5 shadow-lg">
                <img 
                  src={logoImage} 
                  alt="Bluebook Logo" 
                  className="w-full h-full object-contain drop-shadow"
                />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <h1 className="font-display text-xl font-bold text-sidebar-foreground tracking-tight">Bluebook</h1>
                  <p className="text-[11px] uppercase tracking-[0.2em] text-sidebar-foreground/50">Telihan</p>
                </div>
              )}
            </div>
            {!collapsed && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="text-sidebar-foreground hover:bg-white/10 rounded-xl"
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>

          {/* Navigation */}
          <nav className={cn(
            "flex-1 py-4 space-y-1 scrollbar-thin",
            collapsed ? "px-2 overflow-y-auto overflow-x-visible" : "px-3 overflow-y-auto"
          )}>
            {permissions.executiveDashboard && (
              <NavItem
                icon={LayoutDashboard}
                label="Executive Dashboard"
                href="/executive"
                isActive={location.pathname === '/executive'}
                collapsed={collapsed}
                onNavigate={navOnNavigate}
              />
            )}

            {permissions.dashboard && (
              <NavItem 
                icon={LayoutDashboard} 
                label="Dashboard" 
                href="/dashboard" 
                isActive={location.pathname === '/dashboard'} 
                collapsed={collapsed}
                onNavigate={navOnNavigate}
              />
            )}
            {permissions.surat && (
              <>
                <NavItem 
                  icon={Mail} 
                  label="Surat Masuk" 
                  href="/surat-masuk" 
                  isActive={location.pathname === '/surat-masuk'} 
                  collapsed={collapsed}
                  onNavigate={navOnNavigate}
                />
                <NavItem 
                  icon={Send} 
                  label="Surat Keluar" 
                  href="/surat-keluar" 
                  isActive={location.pathname === '/surat-keluar'} 
                  collapsed={collapsed}
                  onNavigate={navOnNavigate}
                />
              </>
            )}
            {permissions.agendaKredit && (
              <NavItem 
                icon={CreditCard} 
                label="Agenda Kredit" 
                children={agendaKreditItems}
                openGroup={openGroup}
                setOpenGroup={setOpenGroup}
                collapsed={collapsed}
                onNavigate={navOnNavigate}
              />
            )}
            {permissions.loanCalc && (
              <NavItem
                icon={Calculator}
                label="Simulasi Kredit"
                children={simulasiKreditItems}
                openGroup={openGroup}
                setOpenGroup={setOpenGroup}
                collapsed={collapsed}
                onNavigate={navOnNavigate}
              />
            )}
            {permissions.atmTelihan && (
              <NavItem 
                icon={Banknote} 
                label="ATM Telihan" 
                children={atmTelihanItems}
                openGroup={openGroup}
                setOpenGroup={setOpenGroup}
                collapsed={collapsed}
                onNavigate={navOnNavigate}
              />
            )}
            {permissions.customerService && (
              <NavItem
                icon={Headphones}
                label="Customer Service"
                children={csItems}
                openGroup={openGroup}
                setOpenGroup={setOpenGroup}
                collapsed={collapsed}
                onNavigate={navOnNavigate}
              />
            )}
            {permissions.monitoring && monitoringItems.length > 0 && (
              <NavItem 
                icon={TrendingUp} 
                label="Loan Monitoring" 
                children={monitoringItems}
                openGroup={openGroup}
                setOpenGroup={setOpenGroup}
                collapsed={collapsed}
                onNavigate={navOnNavigate}
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
                  openGroup={openGroup}
                  setOpenGroup={setOpenGroup}
                  collapsed={collapsed}
                  onNavigate={navOnNavigate}
                />
              ) : (
                <NavItem 
                  icon={Shield} 
                  label="Log Security" 
                  href="/security/log" 
                  isActive={location.pathname.startsWith('/security')} 
                  collapsed={collapsed}
                  onNavigate={navOnNavigate}
                />
              )
            )}

            {permissions.comingSoonOB && (
              <NavItem 
                icon={Sparkles} 
                label="OB" 
                href="/ob" 
                isActive={location.pathname === '/ob'} 
                collapsed={collapsed}
                onNavigate={navOnNavigate}
              />
            )}
            {isAdmin && (
              <NavItem 
                icon={Settings} 
                label="Konfigurasi" 
                children={konfigurasiItems}
                openGroup={openGroup}
                setOpenGroup={setOpenGroup}
                collapsed={collapsed}
                onNavigate={navOnNavigate}
              />
            )}
            <NavItem 
              icon={Info} 
              label="About" 
              href="/about" 
              isActive={location.pathname === '/about'} 
              collapsed={collapsed}
              onNavigate={navOnNavigate}
            />
          </nav>

          {/* User Info */}
          <div className={cn("py-3 border-t border-white/10", collapsed ? "px-2" : "px-3")}>
            {collapsed ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-full glass-panel flex items-center justify-center" title={userName}>
                  <User className="w-4 h-4 text-sidebar-foreground" />
                </div>
                <Button
                  onClick={logout}
                  variant="ghost"
                  size="icon"
                  title="Logout"
                  className="rounded-xl text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-white/10"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="glass-panel rounded-2xl p-3">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full glass-panel flex items-center justify-center">
                    <User className="w-4 h-4 text-sidebar-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
                    <p className="text-xs text-sidebar-foreground/60 truncate">{ROLE_LABELS[userRole] ?? userRole}</p>
                  </div>
                </div>
                <Button 
                  onClick={logout}
                  variant="ghost" 
                  className="w-full justify-start gap-2 rounded-xl text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-white/10"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
