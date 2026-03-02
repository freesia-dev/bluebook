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

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isAuthenticated, isDemo } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const sidebarWidth = sidebarCollapsed ? 68 : 256; // w-[68px] or w-64

  return (
    <div className="min-h-screen bg-background">
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />
      
      <header className={cn(
        "fixed top-0 right-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center justify-between transition-all duration-300",
        sidebarOpen ? `left-[${sidebarWidth}px]` : "left-0"
      )} style={sidebarOpen ? { left: sidebarWidth } : undefined}>
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
          <ThemeToggle />
        </div>
      </header>

      <main className={cn(
        "min-h-screen pt-16 transition-all duration-300"
      )} style={sidebarOpen ? { marginLeft: sidebarWidth } : undefined}>
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
