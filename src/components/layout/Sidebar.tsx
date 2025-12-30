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
  FileText,
  BookOpen,
  LogOut,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
  isActive?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, href, children, isActive }) => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  if (children) {
    const hasActiveChild = children.some(child => location.pathname === child.href);
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

export const Sidebar: React.FC = () => {
  const location = useLocation();
  const { user, logout, isAdmin } = useAuth();

  const agendaKreditItems = [
    { label: 'SPPK Telihan', href: '/agenda-kredit/sppk-telihan' },
    { label: 'SPPK Meranti', href: '/agenda-kredit/sppk-meranti' },
    { label: 'PK Telihan', href: '/agenda-kredit/pk-telihan' },
    { label: 'PK Meranti', href: '/agenda-kredit/pk-meranti' },
    { label: 'KK & MPAK Telihan', href: '/agenda-kredit/kk-mpak-telihan' },
    { label: 'Agenda & MPAK Meranti', href: '/agenda-kredit/agenda-mpak-meranti' },
  ];

  const konfigurasiItems = isAdmin
    ? [
        { label: 'Pengaturan User', href: '/konfigurasi/users' },
        { label: 'Jenis Kredit', href: '/konfigurasi/jenis-kredit' },
        { label: 'Jenis Debitur', href: '/konfigurasi/jenis-debitur' },
        { label: 'Kode Fasilitas', href: '/konfigurasi/kode-fasilitas' },
        { label: 'Sektor Ekonomi', href: '/konfigurasi/sektor-ekonomi' },
      ]
    : [
        { label: 'Jenis Kredit', href: '/konfigurasi/jenis-kredit' },
        { label: 'Jenis Debitur', href: '/konfigurasi/jenis-debitur' },
        { label: 'Kode Fasilitas', href: '/konfigurasi/kode-fasilitas' },
        { label: 'Sektor Ekonomi', href: '/konfigurasi/sektor-ekonomi' },
      ];

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 gradient-dark">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-6 border-b border-sidebar-border">
          <div className="w-10 h-10 rounded-lg gradient-secondary flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-sidebar-foreground">Bluebook</h1>
            <p className="text-xs text-sidebar-foreground/60">Telihan</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            href="/" 
            isActive={location.pathname === '/'} 
          />
          <NavItem 
            icon={Mail} 
            label="Surat Masuk" 
            href="/surat-masuk" 
            isActive={location.pathname === '/surat-masuk'} 
          />
          <NavItem 
            icon={Send} 
            label="Surat Keluar" 
            href="/surat-keluar" 
            isActive={location.pathname === '/surat-keluar'} 
          />
          <NavItem 
            icon={CreditCard} 
            label="Agenda Kredit" 
            children={agendaKreditItems}
          />
          <NavItem 
            icon={Settings} 
            label="Konfigurasi" 
            children={konfigurasiItems}
          />
          <NavItem 
            icon={Info} 
            label="About" 
            href="/about" 
            isActive={location.pathname === '/about'} 
          />
        </nav>

        {/* User Info */}
        <div className="px-4 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
              <User className="w-5 h-5 text-sidebar-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{user?.nama}</p>
              <p className="text-xs text-sidebar-foreground/60 capitalize">{user?.role}</p>
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
  );
};
