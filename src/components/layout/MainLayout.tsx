import React, { ReactNode, useState, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, Eye, Pin, PinOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/ThemeToggle';
import { FontSizeToggle } from '@/components/FontSizeToggle';
import { GlobalSearch } from '@/components/search/GlobalSearch';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { isRouteAllowedFor } from '@/lib/role-permissions';

import { NotificationBell } from '@/components/notifications/NotificationBell';
import { PresenceBar } from '@/components/presence/PresenceBar';
import { ErrorBoundary, PageErrorFallback, SilentBoundary } from '@/components/ErrorBoundary';
import { HeaderBreadcrumb } from './HeaderBreadcrumb';
import { AppTour } from '@/components/tour/AppTour';
import { WhatsNewDialog } from '@/components/WhatsNewDialog';
import { catatBukaHarian } from '@/lib/wrapped-events';

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

  // Catat sekali per hari bahwa user membuka Bluebook (bahan runtutan hari di Wrapped)
  useEffect(() => {
    if (isAuthenticated) catatBukaHarian();
  }, [isAuthenticated]);

  // Update sidebar state on window resize
  useEffect(() => {
    const handleResize = () => {
      // Di bawah lg sidebar jadi panel melayang yang menutupi isi halaman,
      // jadi saat layar mengecil (putar HP / perkecil jendela) ia ditutup.
      setSidebarOpen(window.innerWidth >= 1024);
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
        // Di HP sidebar berupa panel melayang, jadi header tidak ikut bergeser
        sidebarOpen ? "left-0 lg:left-64" : "left-0 lg:left-[76px]"
      )}>
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu className="w-5 h-5" />
          </Button>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={pinned ? 'secondary' : 'ghost'}
                size="icon"
                onClick={togglePin}
                aria-pressed={pinned}
                aria-label={pinned ? 'Lepas pin sidebar' : 'Pin sidebar'}
                className="hidden lg:inline-flex"
              >
                {pinned ? <Pin className="w-5 h-5 text-primary" /> : <PinOff className="w-5 h-5" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {pinned ? 'Sidebar dipin (tidak auto-tutup)' : 'Pin sidebar agar tidak auto-tutup'}
            </TooltipContent>
          </Tooltip>
          {/* Layar lebar: jejak halaman. HP/tablet: judul aplikasi saja. */}
          <h1 className="hidden font-display text-lg font-bold sm:block lg:hidden">Bluebook Telihan</h1>
          <HeaderBreadcrumb />
        </div>

        <div className="flex items-center gap-2">
          <span data-tur="presence">
            <SilentBoundary name="presence-bar"><PresenceBar /></SilentBoundary>
          </span>
          <span data-tur="cari">
            <GlobalSearch />
          </span>
          <span data-tur="notifikasi">
            <NotificationBell />
          </span>
          <span data-tur="tampilan" className="flex items-center gap-2">
            <FontSizeToggle />
            <ThemeToggle />
          </span>
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
          <ErrorBoundary
            name="page"
            resetKey={location.pathname}
            fallback={(error, reset) => <PageErrorFallback error={error} onRetry={reset} />}
          >
            {children}
          </ErrorBoundary>
        </div>
      </main>

      {/* Tur pengenalan (pegawai baru) & ringkasan pembaruan — keduanya
          menampilkan diri sendiri hanya kalau memang perlu. */}
      <SilentBoundary name="tur"><AppTour /></SilentBoundary>
      <SilentBoundary name="apa-yang-baru"><WhatsNewDialog /></SilentBoundary>
    </div>
  );
};
