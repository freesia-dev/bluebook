import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  userName: string;
  userRole: 'admin' | 'user' | 'demo';
  isAuthenticated: boolean;
  isApproved: boolean;
  isPending: boolean;
  isAdmin: boolean;
  isDemo: boolean;
  canEdit: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, nama: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role and approval check with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            checkUserStatus(session.user.id);
          }, 0);
        } else {
          setIsAdmin(false);
          setIsDemo(false);
          setIsApproved(false);
          setIsPending(false);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        checkUserStatus(session.user.id);
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUserStatus = async (userId: string) => {
    try {
      // Parallel queries for maximum speed
      const [roleResult, profileResult] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        supabase.from('profiles').select('status').eq('user_id', userId).maybeSingle()
      ]);

      setIsAdmin(roleResult.data?.role === 'admin');
      setIsDemo(roleResult.data?.role === 'demo');
      
      if (profileResult.data) {
        setIsApproved(profileResult.data.status === 'approved');
        setIsPending(profileResult.data.status === 'pending');
      } else {
        setIsApproved(false);
        setIsPending(true);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      setIsAdmin(false);
      setIsDemo(false);
      setIsApproved(false);
      setIsPending(false);
    }
  };

  const login = async (email: string, password: string): Promise<{ error: string | null }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          return { error: 'Email atau password salah.' };
        }
        return { error: error.message };
      }

      // Parallel check for role and profile status
      if (data.user) {
        const [roleResult, profileResult] = await Promise.all([
          supabase.from('user_roles').select('role').eq('user_id', data.user.id).maybeSingle(),
          supabase.from('profiles').select('status').eq('user_id', data.user.id).maybeSingle()
        ]);

        const status = profileResult.data?.status;
        
        if (status === 'pending') {
          await supabase.auth.signOut();
          return { error: 'Akun Anda masih menunggu persetujuan admin. Silakan hubungi administrator.' };
        }

        if (status === 'rejected') {
          await supabase.auth.signOut();
          return { error: 'Akun Anda telah ditolak. Silakan hubungi administrator.' };
        }

        // Set state immediately without waiting for onAuthStateChange
        setIsAdmin(roleResult.data?.role === 'admin');
        setIsDemo(roleResult.data?.role === 'demo');
        setIsApproved(status === 'approved');
        setIsPending(status === 'pending');
      }
      
      return { error: null };
    } catch (err) {
      console.error('Login error:', err);
      return { error: 'Terjadi kesalahan saat login.' };
    }
  };

  const signup = async (email: string, password: string, nama: string): Promise<{ error: string | null }> => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            nama: nama,
          }
        }
      });
      
      if (error) {
        if (error.message.includes('User already registered')) {
          return { error: 'Email sudah terdaftar. Silakan login.' };
        }
        return { error: error.message };
      }
      
      return { error: null };
    } catch (err) {
      console.error('Signup error:', err);
      return { error: 'Terjadi kesalahan saat mendaftar.' };
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAdmin(false);
    setIsDemo(false);
    setIsApproved(false);
    setIsPending(false);
  };

  // Get user name from metadata or email
  const userName = user?.user_metadata?.nama || user?.email?.split('@')[0] || 'User';
  // Demo users can only view, not edit
  const userRole: 'admin' | 'user' | 'demo' = isAdmin ? 'admin' : isDemo ? 'demo' : 'user';
  const canEdit = !isDemo; // Demo users cannot edit

  return (
    <AuthContext.Provider value={{
      user,
      session,
      userName,
      userRole,
      isAuthenticated: !!session && isApproved,
      isApproved,
      isPending,
      isAdmin,
      isDemo,
      canEdit,
      isLoading,
      login,
      signup,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};