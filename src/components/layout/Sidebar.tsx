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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import logoImage from '@/assets/logo_bluebook.png';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
  isActive?: boolean;
  onNavigate?: () => void;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, href, children, isActive, onNavigate }) => {
  const location = useLocation();
  const hasActiveChild = children?.some(child => location.pathname === child.href) || false;
  const [isOpen, setIsOpen] = useState(hasActiveChild);

  const iconBox = (
    <div className={cn(
      "flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-300 shrink-0",
      (isActive || hasActiveChild) 
        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md" 
        : "bg-sidebar-accent/40 text-sidebar-foreground/70 group-hover:bg-sidebar-accent group-hover:text-sidebar-foreground"
    )}>
      <Icon className="w-[18px] h-[18px]" />
    </div>
  );

  if (children) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "group w-full flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all duration-300",
            "hover:bg-sidebar-accent/30",
            hasActiveChild && "bg-sidebar-accent/20"
          )}
        >
          {iconBox}
          <span className="flex-1 text-left font-medium text-sm text-sidebar-foreground/90">{label}</span>
          <div className={cn("transition-transform duration-300 ease-out", isOpen && "rotate-180")}>
            <ChevronDown className="w-4 h-4 text-sidebar-foreground/40" />
          </div>
        </button>
        <div className={cn(
          "overflow-hidden transition-all duration-300 ease-out",
          isOpen ? "max-h-[500px] opacity-100 mt-1" : "max-h-0 opacity-0"
        )}>
          <div className="ml-[22px] pl-3 border-l-2 border-sidebar-border/40 space-y-0.5">
            {children.map((child) => {
              const isChildActive = location.pathname === child.href;
              return (
                <Link
                  key={child.href}
                  to={child.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-200 text-[13px]",
                    "hover:bg-sidebar-accent/40 hover:translate-x-0.5",
                    isChildActive 
                      ? "bg-sidebar-primary/15 text-sidebar-primary font-semibold border-l-2 border-sidebar-primary -ml-[1px] pl-[11px]" 
                      : "text-sidebar-foreground/60 hover:text-sidebar-foreground/90"
                  )}
                >
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full transition-all duration-200",
                    isChildActive ? "bg-sidebar-primary scale-125" : "bg-sidebar-foreground/30"
                  )} />
                  <span>{child.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={href || '/'}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all duration-300",
        "hover:bg-sidebar-accent/30",
        isActive && "bg-sidebar-accent/20"
      )}
    >
      {iconBox}
      <span className={cn(
        "font-medium text-sm transition-colors duration-200",
        isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
      )}>{label}</span>
    </Link>
  );
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { userName, userRole, logout, isAdmin } = useAuth();

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

  const atmTelihanItems = [
    { label: 'Database Pengisian ATM', href: '/atm-telihan/database-pengisian' },
    { label: 'Penyelesaian Selisih', href: '/atm-telihan/penyelesaian-selisih' },
    { label: 'Berita Acara ATM', href: '/atm-telihan/ba-pengisian' },
    { label: 'Konfigurasi ATM', href: '/atm-telihan/konfigurasi' },
  ];

  const konfigurasiItems = isAdmin
    ? [
        { label: 'Pengaturan User', href: '/konfigurasi/users' },
        { label: 'Jenis Kredit', href: '/konfigurasi/jenis-kredit' },
        { label: 'Jenis Debitur', href: '/konfigurasi/jenis-debitur' },
        { label: 'Jenis Penggunaan', href: '/konfigurasi/jenis-penggunaan' },
        { label: 'Sektor Ekonomi', href: '/konfigurasi/sektor-ekonomi' },
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
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar - on desktop it's inline in flex, on mobile it's fixed overlay */}
      <aside className={cn(
        // Mobile: fixed overlay
        "lg:relative lg:translate-x-0 lg:z-auto",
        "fixed left-0 top-0 z-50 h-screen lg:h-auto",
        // Shared styles
        "gradient-dark w-64 shrink-0 transition-all duration-300 ease-out",
        "lg:border-r-0",
        // Mobile show/hide
        !isOpen && "max-lg:-translate-x-full",
        // Desktop show/hide (collapse width)
        !isOpen && "lg:w-0 lg:overflow-hidden lg:opacity-0",
        isOpen && "lg:w-64 lg:opacity-100"
      )}>
        <div className="flex h-full lg:h-[calc(100vh-24px)] flex-col w-64">
          {/* Logo */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border/30">
            <div className="flex items-center gap-3">
              <img 
                src={logoImage} 
                alt="Bluebook Logo" 
                className="w-10 h-10 object-contain"
              />
              <div>
                <h1 className="font-display text-lg font-bold text-sidebar-foreground leading-tight">Bluebook</h1>
                <p className="text-[11px] text-sidebar-foreground/50 font-medium">Telihan</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-sidebar-foreground hover:bg-sidebar-accent lg:hidden h-8 w-8"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2.5 py-3 space-y-0.5 overflow-y-auto scrollbar-thin">
            <NavItem icon={LayoutDashboard} label="Dashboard" href="/dashboard" isActive={location.pathname === '/dashboard'} onNavigate={onClose} />
            <NavItem icon={Mail} label="Surat Masuk" href="/surat-masuk" isActive={location.pathname === '/surat-masuk'} onNavigate={onClose} />
            <NavItem icon={Send} label="Surat Keluar" href="/surat-keluar" isActive={location.pathname === '/surat-keluar'} onNavigate={onClose} />
            <NavItem icon={CreditCard} label="Agenda Kredit" children={agendaKreditItems} onNavigate={onClose} />
            <NavItem icon={Banknote} label="ATM Telihan" children={atmTelihanItems} onNavigate={onClose} />
            {isAdmin && (
              <NavItem icon={Settings} label="Konfigurasi" children={konfigurasiItems} onNavigate={onClose} />
            )}
            <NavItem icon={Info} label="About" href="/about" isActive={location.pathname === '/about'} onNavigate={onClose} />
          </nav>

          {/* User Info */}
          <div className="px-3 py-3 border-t border-sidebar-border/30">
            <div className="flex items-center gap-2.5 mb-2">
              <div className="w-9 h-9 rounded-xl bg-sidebar-accent/40 flex items-center justify-center shrink-0">
                <User className="w-[18px] h-[18px] text-sidebar-foreground/70" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate leading-tight">{userName}</p>
                <p className="text-[11px] text-sidebar-foreground/50 capitalize">{userRole}</p>
              </div>
            </div>
            <Button 
              onClick={logout}
              variant="ghost" 
              size="sm"
              className="w-full justify-start gap-2 text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent/30 h-8 text-xs"
            >
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};
