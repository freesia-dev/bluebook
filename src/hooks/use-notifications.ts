import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type NotifLevel = 'critical' | 'warning' | 'success' | 'info';

export interface AppNotification {
  id: string;
  level: NotifLevel;
  title: string;
  description?: string;
  href: string;
  icon: 'alert' | 'users' | 'sheet' | 'mail' | 'user-check' | 'calendar' | 'wa' | 'atm';
  ts?: string;
}

const DAY_AGO_ISO = () => new Date(Date.now() - 24 * 3600 * 1000).toISOString();
const READ_KEY = (uid: string) => `bluebook-notif-read-${uid}`;

async function buildNotifications(opts: {
  monitoring: boolean;
  surat: boolean;
  atm: boolean;
  isAdmin: boolean;
}): Promise<AppNotification[]> {
  const list: AppNotification[] = [];
  const sb = supabase as any;

  if (opts.monitoring) {
    const { data: uploads } = await sb
      .from('mlf_uploads')
      .select('id, jobdate, filename, created_at')
      .order('jobdate', { ascending: false })
      .limit(1);
    const upload = uploads?.[0];
    if (upload) {
      const dayAgo = Date.now() - 24 * 3600 * 1000;
      if (new Date(upload.created_at).getTime() > dayAgo) {
        list.push({
          id: `mlf-upload-${upload.id}`,
          level: 'info',
          title: 'Data MLF baru diupload',
          description: `${upload.filename}`,
          href: '/monitoring/upload',
          icon: 'sheet',
          ts: upload.created_at,
        });
      }

      const [{ count: nplCount }, { count: dpkCount }, { count: alCount }] =
        await Promise.all([
          sb.from('mlf_data').select('id', { count: 'exact', head: true })
            .eq('upload_id', upload.id).eq('brcd', '143').gte('kol', 3),
          sb.from('mlf_data').select('id', { count: 'exact', head: true })
            .eq('upload_id', upload.id).eq('brcd', '143').eq('kol', 2).gt('tungpk', 0),
          (async () => {
            const today = new Date().toISOString().slice(0, 10);
            const in30 = new Date(Date.now() + 30 * 24 * 3600 * 1000)
              .toISOString().slice(0, 10);
            return sb.from('mlf_data').select('id', { count: 'exact', head: true })
              .eq('upload_id', upload.id).eq('brcd', '143').gte('date1', today).lte('date1', in30);
          })(),
        ]);

      if (nplCount && nplCount > 0) {
        list.push({
          id: `npl-${upload.id}`,
          level: 'critical',
          title: `${nplCount} debitur NPL perlu ditindaklanjuti`,
          description: `Snapshot ${new Date(upload.jobdate).toLocaleDateString('id-ID')}`,
          href: '/monitoring/dashboard',
          icon: 'alert',
          ts: upload.created_at,
        });
      }
      if (dpkCount && dpkCount > 0) {
        list.push({
          id: `dpk-${upload.id}`,
          level: 'warning',
          title: `${dpkCount} debitur DPK dengan tunggakan`,
          description: 'Kandidat penagihan dini via WhatsApp',
          href: '/monitoring/kontak?filter=tunggakan',
          icon: 'users',
          ts: upload.created_at,
        });
      }
      if (alCount && alCount > 0) {
        list.push({
          id: `akan-lunas-${upload.id}`,
          level: 'success',
          title: `${alCount} kredit jatuh tempo ≤ 30 hari`,
          description: 'Kandidat prospek perpanjangan / top-up',
          href: '/monitoring/dashboard#akan-lunas',
          icon: 'calendar',
          ts: upload.created_at,
        });
      }

      const { count: waFail } = await sb
        .from('wa_reminder_log')
        .select('id', { count: 'exact', head: true })
        .neq('status', 'sent')
        .gte('sent_at', DAY_AGO_ISO());
      if (waFail && waFail > 0) {
        list.push({
          id: `wa-fail-${new Date().toISOString().slice(0, 10)}`,
          level: 'warning',
          title: `${waFail} reminder WA gagal terkirim`,
          description: '24 jam terakhir',
          href: '/monitoring/reminder',
          icon: 'wa',
        });
      }
    }
  }

  if (opts.isAdmin) {
    const { count } = await sb
      .from('profiles')
      .select('user_id', { count: 'exact', head: true })
      .eq('status', 'pending');
    if (count && count > 0) {
      list.push({
        id: 'pending-users',
        level: 'warning',
        title: `${count} user menunggu persetujuan`,
        description: 'Buka Konfigurasi › Users',
        href: '/konfigurasi/users',
        icon: 'user-check',
      });
    }
  }

  if (opts.surat) {
    const { count } = await sb
      .from('surat_masuk')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', DAY_AGO_ISO());
    if (count && count > 0) {
      list.push({
        id: `surat-masuk-${new Date().toISOString().slice(0, 10)}`,
        level: 'info',
        title: `${count} surat masuk baru`,
        description: '24 jam terakhir',
        href: '/surat-masuk',
        icon: 'mail',
      });
    }
  }

  if (opts.atm) {
    const { count } = await sb
      .from('selisih_atm')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'Belum Diselesaikan');
    if (count && count > 0) {
      list.push({
        id: 'atm-selisih',
        level: 'warning',
        title: `${count} selisih ATM belum diselesaikan`,
        description: 'Perlu tindak lanjut penyelesaian',
        href: '/atm-telihan/penyelesaian-selisih',
        icon: 'atm',
      });
    }
  }

  return list;
}

export const useAppNotifications = () => {
  const { user, permissions, isAdmin, isAuthenticated } = useAuth();
  const uid = user?.id ?? '';

  const q = useQuery({
    queryKey: ['app-notifications', uid],
    queryFn: () =>
      buildNotifications({
        monitoring: permissions.monitoring,
        surat: permissions.surat,
        atm: permissions.atmTelihan,
        isAdmin,
      }),
    enabled: isAuthenticated && !!uid,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!uid) return;
    try {
      const raw = localStorage.getItem(READ_KEY(uid));
      setReadIds(new Set(raw ? JSON.parse(raw) : []));
    } catch {
      setReadIds(new Set());
    }
  }, [uid]);

  const persist = useCallback(
    (next: Set<string>) => {
      try {
        localStorage.setItem(READ_KEY(uid), JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
    },
    [uid],
  );

  const markRead = useCallback(
    (id: string) => {
      setReadIds((prev) => {
        if (prev.has(id)) return prev;
        const next = new Set(prev);
        next.add(id);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const markAllRead = useCallback(() => {
    const all = (q.data ?? []).map((n) => n.id);
    setReadIds((prev) => {
      const next = new Set(prev);
      all.forEach((id) => next.add(id));
      persist(next);
      return next;
    });
  }, [q.data, persist]);

  const notifications = useMemo(() => {
    const rank: Record<NotifLevel, number> = {
      critical: 0,
      warning: 1,
      success: 2,
      info: 3,
    };
    return [...(q.data ?? [])].sort(
      (a, b) => rank[a.level] - rank[b.level],
    );
  }, [q.data]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  return {
    notifications,
    unreadCount,
    readIds,
    markRead,
    markAllRead,
    isLoading: q.isLoading,
    refetch: q.refetch,
  };
};
