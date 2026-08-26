import React, { ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, Eye, Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { isRouteAllowedFor } from '@/lib/role-permissions';

import { BiruAssistant } from '@/components/biru/BiruAssistant';
import { NotificationBell } from '@/components/notifications/NotificationBell';

interface MainLayoutProps {
  children: ReactNode;
}

/** Sidebar menutup otomatis setelah 5 detik tanpa interaksi (desktop). */
const AUTO_COLLAPSE_MS = 5000;
const PIN_KEY = 'bluebook-sidebar-pinned';

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isAuthenticated, isDemo, permissions } = useAuth();
  const location = useLocation();
  const [pinned, setPinned] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(PIN_KEY) === '1';
  });
  // Default open on desktop (lg+), closed on mobile
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });
  const [sidebarHovered, setSidebarHovered] = useState(false);

  const togglePin = () => {
    setPinned((v) => {
      const next = !v;
      try { window.localStorage.setItem(PIN_KEY, next ? '1' : '0'); } catch { /* noop */ }
      if (next) setSidebarOpen(true);
      return next;
    });
  };

  // Update sidebar state on window resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Auto-collapse: tutup sidebar 5 detik setelah dibuka jika tidak di-pin & kursor tidak di atasnya
  useEffect(() => {
    if (pinned || !sidebarOpen || sidebarHovered) return;
    if (typeof window !== 'undefined' && window.innerWidth < 1024) return;
    const t = setTimeout(() => setSidebarOpen(false), AUTO_COLLAPSE_MS);
    return () => clearTimeout(t);
  }, [pinned, sidebarOpen, sidebarHovered, location.pathname]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Role-based route guard: redirect to /dashboard if current route isn't allowed
  if (!isRouteAllowedFor(location.pathname, permissions)) {
    return <Navigate to="/dashboard" replace />;
  }


  return (
    <div className="min-h-screen bg-background">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onHoverChange={setSidebarHovered}
      />
      
      {/* Header with menu button */}
      <header className={cn(
        "fixed top-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between transition-all duration-300",
        sidebarOpen ? "left-64" : "left-0 lg:left-[76px]"
      )}>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="font-display font-bold text-lg hidden sm:block">Bluebook Telihan</h1>
        </div>
        <div className="flex items-center gap-2">
          <GlobalSearch />
          <NotificationBell />
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content - shifts when sidebar is open on desktop */}
      <main className={cn(
        "min-h-screen pt-16 transition-all duration-300",
        sidebarOpen ? "lg:ml-64" : "ml-0 lg:ml-[76px]"
      )}>
        <div className="p-4 md:p-6">
          {isDemo && (
            <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
              <Eye className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-amber-600 dark:text-amber-400">
                Anda login sebagai <strong>Demo User</strong> (View Only). Anda hanya dapat melihat data, tidak dapat menambah, mengubah, atau menghapus.
              </AlertDescription>
            </Alert>
          )}
          {children}
        </div>
      </main>
      <BiruAssistant />
    </div>
  );
};
