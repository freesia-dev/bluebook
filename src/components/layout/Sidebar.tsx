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
  ChevronRight,
  LogOut,
  User,
  X
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
  // Auto-expand submenu if a child is active
  const hasActiveChild = children?.some(child => location.pathname === child.href) || false;
  const [isOpen, setIsOpen] = useState(hasActiveChild);

  if (children) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
            "hover:bg-sidebar-accent text-sidebar-foreground",
            hasActiveChild && "bg-sidebar-accent"
          )}
        >
          <Icon className="w-5 h-5" />
          <span className="flex-1 text-left font-medium">{label}</span>
          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </button>
        {isOpen && (
          <div className="ml-4 mt-1 space-y-1 animate-slide-in">
            {children.map((child) => (
              <Link
                key={child.href}
                to={child.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-200",
                  "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground",
                  location.pathname === child.href && "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                )}
              >
                <span className="w-2 h-2 rounded-full bg-current opacity-50" />
                <span>{child.label}</span>
              </Link>
            ))}
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
        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200",
        "hover:bg-sidebar-accent text-sidebar-foreground",
        isActive && "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </Link>
  );
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
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

  const konfigurasiItems = isAdmin
    ? [
        { label: 'Pengaturan User', href: '/konfigurasi/users' },
        { label: 'Jenis Kredit', href: '/konfigurasi/jenis-kredit' },
        { label: 'Jenis Debitur', href: '/konfigurasi/jenis-debitur' },
        { label: 'Jenis Penggunaan', href: '/konfigurasi/jenis-penggunaan' },
        { label: 'Sektor Ekonomi', href: '/konfigurasi/sektor-ekonomi' },
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
              <img 
                src={logoImage} 
                alt="Bluebook Logo" 
                className="w-12 h-12 object-contain"
              />
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
            <NavItem 
              icon={LayoutDashboard} 
              label="Dashboard" 
              href="/dashboard" 
              isActive={location.pathname === '/dashboard'} 
              onNavigate={onClose}
            />
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
            <NavItem 
              icon={CreditCard} 
              label="Agenda Kredit" 
              children={agendaKreditItems}
              onNavigate={onClose}
            />
            <NavItem 
              icon={Settings} 
              label="Konfigurasi" 
              children={konfigurasiItems}
              onNavigate={onClose}
            />
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
                <p className="text-xs text-sidebar-foreground/60 capitalize">{userRole}</p>
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
