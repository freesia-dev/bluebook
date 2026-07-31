import React, { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { ROLE_LABELS } from '@/lib/role-permissions';
import { LogOut, RefreshCw, Users, Wifi, Search, Monitor, Smartphone } from 'lucide-react';
import { formatDistanceToNowStrict } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface OnlineUser {
  user_id: string;
  email: string;
  nama: string;
  role: string;
  online_at: string;
  user_agent?: string;
}

const detectDevice = (ua?: string) => {
  if (!ua) return { icon: Monitor, label: 'Desktop' };
  const s = ua.toLowerCase();
  if (/android|iphone|ipad|mobile/.test(s)) return { icon: Smartphone, label: 'Mobile' };
  return { icon: Monitor, label: 'Desktop' };
};

const OnlineUsersPage: React.FC = () => {
  const { isAdmin, user: me } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<OnlineUser[]>([]);
  const [search, setSearch] = useState('');
  const [confirmTarget, setConfirmTarget] = useState<OnlineUser | null>(null);
  const [kicking, setKicking] = useState(false);
  const [channel, setChannel] = useState<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase.channel('online-users', {
      config: { presence: { key: me?.id || 'admin-viewer' }, broadcast: { self: false } },
    });

    const sync = () => {
      const state = ch.presenceState<OnlineUser>();
      const flat: OnlineUser[] = [];
      Object.values(state).forEach((arr) => {
        arr.forEach((p) => {
          if ((p as any).user_id) flat.push(p as OnlineUser);
        });
      });
      // dedupe by user_id (keep newest)
      const map = new Map<string, OnlineUser>();
      flat.forEach((u) => {
        const cur = map.get(u.user_id);
        if (!cur || new Date(u.online_at) > new Date(cur.online_at)) map.set(u.user_id, u);
      });
      setUsers(Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama)));
    };

    ch.on('presence', { event: 'sync' }, sync);
    ch.on('presence', { event: 'join' }, sync);
    ch.on('presence', { event: 'leave' }, sync);

    let ping: number | undefined;
    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        sync();
        // Minta semua klien mengirim ulang presence-nya agar daftar langsung terisi
        await ch.send({ type: 'broadcast', event: 'presence-ping', payload: {} });
        ping = window.setInterval(() => {
          ch.send({ type: 'broadcast', event: 'presence-ping', payload: {} });
          sync();
        }, 10000);
      }
    });
    setChannel(ch);

    return () => {
      if (ping) window.clearInterval(ping);
      supabase.removeChannel(ch);
    };
  }, [isAdmin, me?.id]);


  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.nama.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.role || '').toLowerCase().includes(q)
    );
  }, [users, search]);

  const handleForceLogout = async () => {
    if (!confirmTarget || !channel) return;
    setKicking(true);
    try {
      await channel.send({
        type: 'broadcast',
        event: 'force-logout',
        payload: { userId: confirmTarget.user_id, by: me?.email, at: new Date().toISOString() },
      });
      toast({
        title: 'Perintah logout dikirim',
        description: `${confirmTarget.nama} akan otomatis keluar dalam beberapa detik.`,
      });
      setConfirmTarget(null);
    } catch (e: any) {
      toast({ title: 'Gagal', description: e?.message || 'Terjadi kesalahan', variant: 'destructive' });
    } finally {
      setKicking(false);
    }
  };

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return (
    <MainLayout>
      <PageHeader
        title="User Online"
        description="Pantau pengguna yang sedang aktif secara realtime dan lakukan logout paksa bila perlu."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <Wifi className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Sedang Online</p>
              <p className="text-2xl font-bold">{users.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Role Unik</p>
              <p className="text-2xl font-bold">{new Set(users.map((u) => u.role)).size}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Sinkronisasi</p>
              <p className="text-sm font-semibold">Realtime · presence channel</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Daftar User Online</CardTitle>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Cari nama, email, role…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Wifi className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>Belum ada user yang sedang online.</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Perangkat</TableHead>
                    <TableHead>Online Sejak</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((u) => {
                    const dev = detectDevice(u.user_agent);
                    const DevIcon = dev.icon;
                    const isSelf = u.user_id === me?.id;
                    return (
                      <TableRow key={u.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="font-medium">{u.nama}</span>
                            {isSelf && <Badge variant="secondary" className="text-[10px]">Anda</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{u.email || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <DevIcon className="w-3.5 h-3.5" />
                            {dev.label}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDistanceToNowStrict(new Date(u.online_at), { addSuffix: true, locale: idLocale })}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={isSelf}
                            onClick={() => setConfirmTarget(u)}
                          >
                            <LogOut className="w-3.5 h-3.5 mr-1" />
                            Logout Paksa
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground mt-3">
            Presensi didasarkan pada koneksi realtime aktif. User yang menutup tab akan otomatis hilang dari daftar dalam beberapa detik.
          </p>
        </CardContent>
      </Card>

      <AlertDialog open={!!confirmTarget} onOpenChange={(o) => !o && setConfirmTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Logout Paksa {confirmTarget?.nama}?</AlertDialogTitle>
            <AlertDialogDescription>
              User akan langsung dikeluarkan dari sistem dan diarahkan ke halaman login. Tindakan ini tidak dapat dibatalkan setelah dikirim.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={kicking}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleForceLogout} disabled={kicking} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {kicking ? 'Mengirim…' : 'Ya, Logout Paksa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default OnlineUsersPage;
