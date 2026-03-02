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
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import logoImage from '@/assets/logo_bluebook.png';

interface NavItemProps {
  icon: React.ElementType;
  label: string;
  href?: string;
  children?: { label: string; href: string }[];
  isActive?: boolean;
  onNavigate?: () => void;
  collapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, href, children, isActive, onNavigate, collapsed }) => {
  const location = useLocation();
  const hasActiveChild = children?.some(child => location.pathname === child.href) || false;
  const [isOpen, setIsOpen] = useState(hasActiveChild);

  const iconElement = (
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
    const button = (
      <button
        onClick={() => !collapsed && setIsOpen(!isOpen)}
        className={cn(
          "group w-full flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all duration-300",
          "hover:bg-sidebar-accent/30",
          hasActiveChild && "bg-sidebar-accent/20"
        )}
      >
        {iconElement}
        {!collapsed && (
          <>
            <span className="flex-1 text-left font-medium text-sm text-sidebar-foreground/90">{label}</span>
            <div className={cn(
              "transition-transform duration-300 ease-out",
              isOpen && "rotate-180"
            )}>
              <ChevronDown className="w-4 h-4 text-sidebar-foreground/40" />
            </div>
          </>
        )}
      </button>
    );

    return (
      <div>
        {collapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>{button}</TooltipTrigger>
              <TooltipContent side="right" className="font-medium">
                {label}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : button}
        
        {!collapsed && (
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
        )}
      </div>
    );
  }

  const link = (
    <Link
      to={href || '/'}
      onClick={onNavigate}
      className={cn(
        "group flex items-center gap-3 px-2 py-1.5 rounded-xl transition-all duration-300",
        "hover:bg-sidebar-accent/30",
        isActive && "bg-sidebar-accent/20"
      )}
    >
      {iconElement}
      {!collapsed && (
        <span className={cn(
          "font-medium text-sm transition-colors duration-200",
          isActive ? "text-sidebar-foreground" : "text-sidebar-foreground/70 group-hover:text-sidebar-foreground"
        )}>{label}</span>
      )}
    </Link>
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {label}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return link;
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, collapsed = false, onToggleCollapse }) => {
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
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
      )}
      
      <aside className={cn(
        "fixed left-0 top-0 z-50 h-screen gradient-dark transition-all duration-300 ease-out",
        "border-r border-sidebar-border/30",
        collapsed ? "w-[68px]" : "w-64",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className={cn(
            "flex items-center border-b border-sidebar-border/30 transition-all duration-300",
            collapsed ? "justify-center px-2 py-4" : "justify-between px-4 py-4"
          )}>
            <div className={cn("flex items-center gap-3 overflow-hidden", collapsed && "justify-center")}>
              <img 
                src={logoImage} 
                alt="Bluebook Logo" 
                className={cn(
                  "object-contain transition-all duration-300",
                  collapsed ? "w-9 h-9" : "w-10 h-10"
                )}
              />
              {!collapsed && (
                <div className="animate-fade-in">
                  <h1 className="font-display text-lg font-bold text-sidebar-foreground leading-tight">Bluebook</h1>
                  <p className="text-[11px] text-sidebar-foreground/50 font-medium">Telihan</p>
                </div>
              )}
            </div>
            {/* Close button for mobile */}
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
          <nav className={cn(
            "flex-1 py-3 space-y-0.5 overflow-y-auto scrollbar-thin",
            collapsed ? "px-1.5" : "px-2.5"
          )}>
            <NavItem 
              icon={LayoutDashboard} 
              label="Dashboard" 
              href="/dashboard" 
              isActive={location.pathname === '/dashboard'} 
              onNavigate={onClose}
              collapsed={collapsed}
            />
            <NavItem 
              icon={Mail} 
              label="Surat Masuk" 
              href="/surat-masuk" 
              isActive={location.pathname === '/surat-masuk'} 
              onNavigate={onClose}
              collapsed={collapsed}
            />
            <NavItem 
              icon={Send} 
              label="Surat Keluar" 
              href="/surat-keluar" 
              isActive={location.pathname === '/surat-keluar'} 
              onNavigate={onClose}
              collapsed={collapsed}
            />
            <NavItem 
              icon={CreditCard} 
              label="Agenda Kredit" 
              children={agendaKreditItems}
              onNavigate={onClose}
              collapsed={collapsed}
            />
            <NavItem 
              icon={Banknote} 
              label="ATM Telihan" 
              children={atmTelihanItems}
              onNavigate={onClose}
              collapsed={collapsed}
            />
            {isAdmin && (
              <NavItem 
                icon={Settings} 
                label="Konfigurasi" 
                children={konfigurasiItems}
                onNavigate={onClose}
                collapsed={collapsed}
              />
            )}
            <NavItem 
              icon={Info} 
              label="About" 
              href="/about" 
              isActive={location.pathname === '/about'} 
              onNavigate={onClose}
              collapsed={collapsed}
            />
          </nav>

          {/* Collapse toggle - desktop only */}
          <div className="hidden lg:flex justify-center py-2 border-t border-sidebar-border/30">
            <button
              onClick={onToggleCollapse}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-sidebar-accent/30 hover:bg-sidebar-accent/60 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-all duration-200"
            >
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* User Info */}
          <div className={cn(
            "border-t border-sidebar-border/30 transition-all duration-300",
            collapsed ? "px-1.5 py-3" : "px-3 py-3"
          )}>
            {collapsed ? (
              <TooltipProvider delayDuration={0}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={logout}
                      className="flex items-center justify-center w-full"
                    >
                      <div className="w-9 h-9 rounded-xl bg-sidebar-accent/40 flex items-center justify-center hover:bg-sidebar-accent transition-all duration-200">
                        <User className="w-[18px] h-[18px] text-sidebar-foreground/70" />
                      </div>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p className="font-medium">{userName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{userRole} • Logout</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="animate-fade-in">
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
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
