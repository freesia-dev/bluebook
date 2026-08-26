import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { usePrefetchData } from '@/hooks/use-prefetch-data';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { AppRole, applyRoleOverrides, RolePermissions } from '@/lib/role-permissions';
import { useRoleMenuOverrides } from '@/hooks/use-role-menu';


interface AuthContextType {
  user: User | null;
  session: Session | null;
  userName: string;
  userRole: AppRole;
  permissions: RolePermissions;
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
  const [role, setRole] = useState<AppRole>('user');
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
          setRole('user');
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
      const [roleResult, profileResult] = await Promise.all([
        supabase.from('user_roles').select('role').eq('user_id', userId).maybeSingle(),
        supabase.from('profiles').select('status').eq('user_id', userId).maybeSingle()
      ]);

      setRole((roleResult.data?.role as AppRole) || 'user');

      if (profileResult.data) {
        setIsApproved(profileResult.data.status === 'approved');
        setIsPending(profileResult.data.status === 'pending');
      } else {
        setIsApproved(false);
        setIsPending(true);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      setRole('user');
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

        setRole((roleResult.data?.role as AppRole) || 'user');
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
    setRole('user');
    setIsApproved(false);
    setIsPending(false);
  };

  const { overrides } = useRoleMenuOverrides();
  const permissions = applyRoleOverrides(role, overrides);

  const isAdmin = role === 'admin';
  if (typeof window !== 'undefined') { (window as any).__BLUEBOOK_IS_ADMIN__ = isAdmin; (window as any).__BLUEBOOK_CAN_EXPORT__ = isAdmin || role === 'pemimpin'; }
  const isDemo = role === 'demo';
  const canEdit = permissions.canEdit;

  usePrefetchData(!!session && isApproved);

  // ── Realtime presence: broadcast this user's online status + listen for admin force-logout ──
  useEffect(() => {
    if (!user || !isApproved) return;
    const channel = supabase.channel('online-users', {
      config: { presence: { key: user.id }, broadcast: { self: false } },
    });

    channel.on('broadcast', { event: 'force-logout' }, (payload) => {
      const targetId = (payload as any)?.payload?.userId;
      if (targetId === user.id) {
        supabase.auth.signOut().finally(() => {
          try {
            window.alert('Sesi Anda dihentikan paksa oleh administrator.');
          } catch { /* noop */ }
          window.location.href = '/login';
        });
      }
    });

    // Admin bisa minta semua klien mengirim ulang presence-nya (sinkron instan)
    channel.on('broadcast', { event: 'presence-ping' }, () => { void track(); });

    const onlineSince = new Date().toISOString();
    const track = async () => {
      try {
        await channel.track({
          user_id: user.id,
          email: user.email,
          nama: userName,
          role,
          online_at: onlineSince,
          last_seen: new Date().toISOString(),
          user_agent: navigator.userAgent,
        });
      } catch { /* noop */ }
    };

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') await track();
    });

    // Heartbeat supaya status tetap segar & cepat terlihat oleh admin
    const heartbeat = window.setInterval(track, 15000);
    const onVisible = () => { if (document.visibilityState === 'visible') void track(); };
    const onLeave = () => { try { channel.untrack(); } catch { /* noop */ } };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    window.addEventListener('pagehide', onLeave);

    return () => {
      window.clearInterval(heartbeat);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
      window.removeEventListener('pagehide', onLeave);
      try { channel.untrack(); } catch { /* noop */ }
      supabase.removeChannel(channel);
    };
  }, [user, isApproved, role, userName]);


  return (
    <AuthContext.Provider value={{
      user,
      session,
      userName,
      userRole: role,
      permissions,
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