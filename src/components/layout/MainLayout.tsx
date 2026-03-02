import React, { ReactNode, useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Menu, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GlobalSearch } from '@/components/search/GlobalSearch';

interface MainLayoutProps {
  children: ReactNode;
}

const SIDEBAR_FULL = 256;
const SIDEBAR_COLLAPSED = 68;

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isAuthenticated, isDemo } = useAuth();
  
  // Mobile: controls overlay sidebar visibility
  const [mobileOpen, setMobileOpen] = useState(false);
  // Desktop: controls expanded vs collapsed (icon-only rail)
  const [desktopExpanded, setDesktopExpanded] = useState(true);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : true);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // On desktop sidebar is always visible (full or collapsed rail)
  // On mobile sidebar is an overlay
  const sidebarWidth = isMobile ? 0 : (desktopExpanded ? SIDEBAR_FULL : SIDEBAR_COLLAPSED);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        isOpen={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)} 
        collapsed={isMobile ? false : !desktopExpanded}
        onToggleCollapse={() => setDesktopExpanded(!desktopExpanded)}
      />
      
      <header 
        className="fixed top-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between transition-all duration-300"
        style={{ left: sidebarWidth }}
      >
        <div className="flex items-center gap-3">
          {isMobile && (
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              <Menu className="w-5 h-5" />
            </Button>
          )}
          <h1 className="font-display font-bold text-lg hidden sm:block">Bluebook Telihan</h1>
        </div>
        <div className="flex items-center gap-2">
          <GlobalSearch />
          <ThemeToggle />
        </div>
      </header>

      <main 
        className="min-h-screen pt-16 transition-all duration-300"
        style={{ marginLeft: sidebarWidth }}
      >
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
    </div>
  );
};
