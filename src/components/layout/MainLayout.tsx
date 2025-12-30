import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main className="ml-64 min-h-screen">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
};
