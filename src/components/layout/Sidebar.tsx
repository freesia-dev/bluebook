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
  X,
  Sparkles
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

  if (children) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
            "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground",
            hasActiveChild && "bg-sidebar-accent text-sidebar-foreground"
          )}
        >
          <Icon className="w-5 h-5" />
          <span className="flex-1 text-left font-medium text-sm">{label}</span>
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
                  "relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200",
                  "hover:bg-sidebar-accent text-sidebar-foreground/70 hover:text-sidebar-foreground",
                  location.pathname === child.href && "bg-sidebar-primary text-sidebar-primary-foreground font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-6 before:bg-sidebar-primary before:rounded-r-full"
                )}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                <span className="text-sm">{child.label}</span>
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
        "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
        "hover:bg-sidebar-accent text-sidebar-foreground/80 hover:text-sidebar-foreground",
        isActive && "bg-sidebar-primary text-sidebar-primary-foreground font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-1 before:h-8 before:bg-sidebar-primary before:rounded-r-full"
      )}
    >
      <Icon className="w-5 h-5" />
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
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen w-72 gradient-dark transition-transform duration-300 shadow-xl",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-sidebar-border/50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src={logoImage} 
                  alt="Bluebook Logo" 
                  className="w-12 h-12 object-contain drop-shadow-lg"
                />
                <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-sidebar-primary animate-pulse" />
              </div>
              <div>
                <h1 className="font-display text-xl font-bold text-sidebar-foreground tracking-tight">Bluebook</h1>
                <p className="text-xs text-sidebar-primary font-medium">Telihan</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-xl"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto">
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

          {/* User Section */}
          <div className="px-4 py-4 border-t border-sidebar-border/50">
            <div className="flex items-center gap-3 mb-3 p-3 rounded-xl bg-sidebar-accent/50">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sidebar-primary to-sidebar-primary/80 flex items-center justify-center shadow-lg">
                <User className="w-5 h-5 text-sidebar-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-sidebar-foreground truncate">{userName}</p>
                <p className="text-xs text-sidebar-primary capitalize font-medium">{userRole}</p>
              </div>
            </div>
            <Button 
              onClick={logout}
              variant="ghost" 
              className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent rounded-xl py-3"
            >
              <LogOut className="w-4 h-4" />
              <span className="text-sm font-medium">Logout</span>
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
};