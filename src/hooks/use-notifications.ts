import { useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AppRole } from '@/lib/role-permissions';

export type NotifLevel = 'critical' | 'warning' | 'success' | 'info';

export type NotifCategory =
  | 'monitoring_npl'
  | 'monitoring_dpk'
  | 'monitoring_lunas'
  | 'monitoring_wa'
  | 'monitoring_upload'
  | 'surat_masuk'
  | 'surat_keluar'
  | 'agenda_kredit'
  | 'atm_selisih'
  | 'atm_pengisian'
  | 'security_shift'
  | 'security_ba_pending'
  | 'security_comment'
  | 'cs_activity'
  | 'admin_pending_users'
  | 'admin_audit_token';

export interface AppNotification {
  id: string;
  category: NotifCategory;
  level: NotifLevel;
  title: string;
  description?: string;
  href: string;
  icon:
    | 'alert'
    | 'users'
    | 'sheet'
    | 'mail'
    | 'user-check'
    | 'calendar'
    | 'wa'
    | 'atm'
    | 'shield'
    | 'file'
    | 'briefcase'
    | 'card';
  ts?: string;
}

export const CATEGORY_LABELS: Record<NotifCategory, string> = {
  monitoring_npl: 'Debitur NPL',
  monitoring_dpk: 'Debitur DPK menunggak',
  monitoring_lunas: 'Kredit akan lunas / prospek',
  monitoring_wa: 'Reminder WhatsApp gagal',
  monitoring_upload: 'Upload MLF baru',
  surat_masuk: 'Surat masuk baru',
  surat_keluar: 'Surat keluar baru',
  agenda_kredit: 'Agenda kredit / PK baru',
  atm_selisih: 'Selisih ATM belum selesai',
  atm_pengisian: 'Pengisian ATM terbaru',
  security_shift: 'Shift security aktif',
  security_ba_pending: 'BA Security belum ditandatangani',
  security_comment: 'Komentar / insiden security',
  cs_activity: 'Aktivitas Customer Service',
  admin_pending_users: 'User menunggu persetujuan',
  admin_audit_token: 'Token audit security',
};

/** Which categories are visible/enabled by default per role. */
const ROLE_DEFAULT_CATEGORIES: Record<AppRole, NotifCategory[]> = {
  admin: Object.keys(CATEGORY_LABELS) as NotifCategory[],
  user: [
    'monitoring_npl', 'monitoring_dpk', 'monitoring_lunas', 'monitoring_wa',
    'monitoring_upload', 'surat_masuk', 'surat_keluar', 'agenda_kredit',
    'atm_selisih', 'atm_pengisian',
  ],
  demo: [
    'monitoring_npl', 'monitoring_dpk', 'monitoring_lunas', 'monitoring_upload',
    'surat_masuk', 'agenda_kredit',
  ],
  kic: Object.keys(CATEGORY_LABELS).filter(
    (c) => c !== 'admin_pending_users' && c !== 'admin_audit_token',
  ) as NotifCategory[],
  meranti: ['monitoring_npl', 'monitoring_dpk', 'monitoring_lunas', 'monitoring_upload'],
  officer_rk: [
    'monitoring_npl', 'monitoring_dpk', 'monitoring_lunas', 'monitoring_wa',
    'monitoring_upload', 'agenda_kredit',
  ],
  officer_kredit: [
    'monitoring_npl', 'monitoring_dpk', 'monitoring_lunas', 'monitoring_upload',
    'agenda_kredit',
  ],
  staff_admin_kcp: [
    'surat_masuk', 'surat_keluar', 'agenda_kredit', 'atm_selisih', 'atm_pengisian',
    'security_shift', 'security_ba_pending',
  ],
  pemimpin: [
    'monitoring_npl', 'monitoring_dpk', 'monitoring_lunas', 'monitoring_upload',
    'surat_masuk', 'agenda_kredit', 'atm_selisih', 'security_ba_pending',
  ],
  teller: ['atm_selisih', 'atm_pengisian', 'surat_masuk'],
  cs: ['cs_activity', 'surat_masuk'],
  security: ['security_shift', 'security_ba_pending', 'security_comment'],
  team_leader_security: ['security_shift', 'security_ba_pending', 'security_comment'],
  ob: [],
};

const BRANCH_143 = '143';
const DAY_AGO_ISO = () => new Date(Date.now() - 24 * 3600 * 1000).toISOString();
const HOURS_AGO_ISO = (h: number) => new Date(Date.now() - h * 3600 * 1000).toISOString();
const READ_KEY = (uid: string) => `bluebook-notif-read-${uid}`;
const PREFS_KEY = (uid: string) => `bluebook-notif-prefs-${uid}`;

async function buildNotifications(
  enabled: Set<NotifCategory>,
): Promise<AppNotification[]> {
  const list: AppNotification[] = [];
  const sb = supabase as any;
  const has = (c: NotifCategory) => enabled.has(c);

  // ---- MLF Upload + turunannya (branch 143 only) --------------------
  if (
    has('monitoring_upload') || has('monitoring_npl') ||
    has('monitoring_dpk') || has('monitoring_lunas')
  ) {
    const { data: uploads } = await sb
      .from('mlf_uploads')
      .select('id, jobdate, filename, created_at')
      .order('jobdate', { ascending: false })
      .limit(1);
    const upload = uploads?.[0];
    if (upload) {
      if (has('monitoring_upload')) {
        const dayAgo = Date.now() - 24 * 3600 * 1000;
        if (new Date(upload.created_at).getTime() > dayAgo) {
          list.push({
            id: `mlf-upload-${upload.id}`,
            category: 'monitoring_upload',
            level: 'info',
            title: 'Data MLF baru diupload',
            description: upload.filename,
            href: '/monitoring/upload',
            icon: 'sheet',
            ts: upload.created_at,
          });
        }
      }

      const tasks: Promise<any>[] = [];
      if (has('monitoring_npl'))
        tasks.push(sb.from('mlf_data').select('id', { count: 'exact', head: true })
          .eq('upload_id', upload.id).eq('brcd', BRANCH_143).gte('kol', 3));
      else tasks.push(Promise.resolve({ count: 0 }));

      if (has('monitoring_dpk'))
        tasks.push(sb.from('mlf_data').select('id', { count: 'exact', head: true })
          .eq('upload_id', upload.id).eq('brcd', BRANCH_143).eq('kol', 2).gt('tungpk', 0));
      else tasks.push(Promise.resolve({ count: 0 }));

      if (has('monitoring_lunas')) {
        const today = new Date().toISOString().slice(0, 10);
        const in30 = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().slice(0, 10);
        tasks.push(sb.from('mlf_data').select('id', { count: 'exact', head: true })
          .eq('upload_id', upload.id).eq('brcd', BRANCH_143)
          .gte('date1', today).lte('date1', in30));
      } else tasks.push(Promise.resolve({ count: 0 }));

      const [{ count: nplCount }, { count: dpkCount }, { count: alCount }] = await Promise.all(tasks);

      if (nplCount && nplCount > 0) list.push({
        id: `npl-${upload.id}`, category: 'monitoring_npl', level: 'critical',
        title: `${nplCount} debitur NPL perlu ditindaklanjuti`,
        description: `Snapshot ${new Date(upload.jobdate).toLocaleDateString('id-ID')}`,
        href: '/monitoring/dashboard', icon: 'alert', ts: upload.created_at,
      });
      if (dpkCount && dpkCount > 0) list.push({
        id: `dpk-${upload.id}`, category: 'monitoring_dpk', level: 'warning',
        title: `${dpkCount} debitur DPK dengan tunggakan`,
        description: 'Kandidat penagihan dini via WhatsApp',
        href: '/monitoring/kontak?filter=tunggakan', icon: 'users', ts: upload.created_at,
      });
      if (alCount && alCount > 0) list.push({
        id: `akan-lunas-${upload.id}`, category: 'monitoring_lunas', level: 'success',
        title: `${alCount} kredit jatuh tempo ≤ 30 hari`,
        description: 'Kandidat prospek perpanjangan / top-up',
        href: '/monitoring/dashboard#akan-lunas', icon: 'calendar', ts: upload.created_at,
      });
    }
  }

  if (has('monitoring_wa')) {
    const { count: waFail } = await sb
      .from('wa_reminder_log')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'sent')
      .gte('sent_at', DAY_AGO_ISO());
    if (waFail && waFail > 0) list.push({
      id: `wa-fail-${new Date().toISOString().slice(0, 10)}`,
      category: 'monitoring_wa', level: 'warning',
      title: `${waFail} reminder WA gagal terkirim`,
      description: '24 jam terakhir', href: '/monitoring/reminder', icon: 'wa',
    });
  }

  // ---- Admin ---------------------------------------------------------
  if (has('admin_pending_users')) {
    const { count } = await sb.from('profiles')
      .select('user_id', { count: 'exact', head: true }).eq('status', 'pending');
    if (count && count > 0) list.push({
      id: 'pending-users', category: 'admin_pending_users', level: 'warning',
      title: `${count} user menunggu persetujuan`,
      description: 'Buka Konfigurasi › Users', href: '/konfigurasi/users', icon: 'user-check',
    });
  }

  if (has('admin_audit_token')) {
    const soon = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();
    const { data: tokens } = await sb.from('security_audit_token')
      .select('token, expires_at, catatan')
      .is('revoked_at', null)
      .lte('expires_at', soon)
      .gte('expires_at', new Date().toISOString())
      .limit(3);
    (tokens ?? []).forEach((t: any) => {
      list.push({
        id: `audit-token-${t.token}`, category: 'admin_audit_token', level: 'info',
        title: 'Token audit security akan kadaluarsa',
        description: t.catatan ?? 'Perpanjang atau cabut token',
        href: '/security/audit-links', icon: 'shield', ts: t.expires_at,
      });
    });
  }

  // ---- Surat ---------------------------------------------------------
  if (has('surat_masuk')) {
    const { count } = await sb.from('surat_masuk')
      .select('id', { count: 'exact', head: true }).gte('created_at', DAY_AGO_ISO());
    if (count && count > 0) list.push({
      id: `surat-masuk-${new Date().toISOString().slice(0, 10)}`,
      category: 'surat_masuk', level: 'info',
      title: `${count} surat masuk baru`, description: '24 jam terakhir',
      href: '/surat-masuk', icon: 'mail',
    });
  }
  if (has('surat_keluar')) {
    const { count } = await sb.from('surat_keluar')
      .select('id', { count: 'exact', head: true }).gte('created_at', DAY_AGO_ISO());
    if (count && count > 0) list.push({
      id: `surat-keluar-${new Date().toISOString().slice(0, 10)}`,
      category: 'surat_keluar', level: 'info',
      title: `${count} surat keluar baru`, description: '24 jam terakhir',
      href: '/surat-keluar', icon: 'mail',
    });
  }

  // ---- Agenda kredit ------------------------------------------------
  if (has('agenda_kredit')) {
    const { count } = await sb.from('agenda_kredit_entry')
      .select('id', { count: 'exact', head: true }).gte('created_at', DAY_AGO_ISO());
    if (count && count > 0) list.push({
      id: `agenda-${new Date().toISOString().slice(0, 10)}`,
      category: 'agenda_kredit', level: 'info',
      title: `${count} entri agenda kredit baru`, description: '24 jam terakhir',
      href: '/agenda-kredit', icon: 'briefcase',
    });
  }

  // ---- ATM -----------------------------------------------------------
  if (has('atm_selisih')) {
    const { count } = await sb.from('selisih_atm')
      .select('id', { count: 'exact', head: true }).eq('status', 'Belum Diselesaikan');
    if (count && count > 0) list.push({
      id: 'atm-selisih', category: 'atm_selisih', level: 'warning',
      title: `${count} selisih ATM belum diselesaikan`,
      description: 'Perlu tindak lanjut penyelesaian',
      href: '/atm-telihan/penyelesaian-selisih', icon: 'atm',
    });
  }
  if (has('atm_pengisian')) {
    const { data: last } = await sb.from('pengisian_atm')
      .select('id, tanggal, created_at').order('created_at', { ascending: false }).limit(1);
    const row = last?.[0];
    if (row && new Date(row.created_at).getTime() > Date.now() - 24 * 3600 * 1000) {
      list.push({
        id: `pengisian-${row.id}`, category: 'atm_pengisian', level: 'info',
        title: 'Pengisian ATM terbaru dicatat',
        description: `Tanggal ${new Date(row.tanggal).toLocaleDateString('id-ID')}`,
        href: '/atm-telihan/database-pengisian', icon: 'atm', ts: row.created_at,
      });
    }
  }

  // ---- Security ------------------------------------------------------
  if (has('security_shift')) {
    const { count } = await sb.from('security_shift')
      .select('id', { count: 'exact', head: true }).eq('status', 'aktif');
    if (count && count > 0) list.push({
      id: 'sec-shift-aktif', category: 'security_shift', level: 'info',
      title: `${count} shift security sedang berjalan`,
      description: 'Pantau kondisi kantor',
      href: '/security/log', icon: 'shield',
    });
  }
  if (has('security_ba_pending')) {
    const { data: pending } = await sb.from('security_shift')
      .select('tanggal').is('ttd_pimpinan_at', null)
      .lt('tanggal', new Date().toISOString().slice(0, 10))
      .order('tanggal', { ascending: false }).limit(5);
    const uniqueDates = new Set((pending ?? []).map((r: any) => r.tanggal));
    if (uniqueDates.size > 0) list.push({
      id: `sec-ba-pending-${new Date().toISOString().slice(0, 10)}`,
      category: 'security_ba_pending', level: 'warning',
      title: `${uniqueDates.size} BA harian belum ditandatangani`,
      description: 'Menunggu tanda tangan pimpinan',
      href: '/security/log', icon: 'shield',
    });
  }
  if (has('security_comment')) {
    const { count } = await sb.from('security_log_comment')
      .select('id', { count: 'exact', head: true }).gte('created_at', DAY_AGO_ISO());
    if (count && count > 0) list.push({
      id: `sec-comment-${new Date().toISOString().slice(0, 10)}`,
      category: 'security_comment', level: 'info',
      title: `${count} komentar / catatan security baru`,
      description: '24 jam terakhir',
      href: '/security/log', icon: 'shield',
    });
  }

  // ---- CS activity ---------------------------------------------------
  if (has('cs_activity')) {
    const since = HOURS_AGO_ISO(12);
    const [{ count: cifNew }, { count: rekNew }] = await Promise.all([
      sb.from('cs_cif').select('id', { count: 'exact', head: true }).gte('created_at', since),
      sb.from('cs_rekening').select('id', { count: 'exact', head: true }).gte('created_at', since),
    ]);
    if ((cifNew ?? 0) + (rekNew ?? 0) > 0) list.push({
      id: `cs-new-${new Date().toISOString().slice(0, 10)}-${new Date().getHours()}`,
      category: 'cs_activity', level: 'info',
      title: `${(cifNew ?? 0) + (rekNew ?? 0)} entri CS baru`,
      description: `${cifNew ?? 0} CIF, ${rekNew ?? 0} rekening (12 jam terakhir)`,
      href: '/cs/cif', icon: 'card',
    });
  }

  return list;
}

function loadPrefs(uid: string, role: AppRole): Set<NotifCategory> {
  if (!uid) return new Set();
  try {
    const raw = localStorage.getItem(PREFS_KEY(uid));
    if (raw) return new Set(JSON.parse(raw));
  } catch { /* ignore */ }
  return new Set(ROLE_DEFAULT_CATEGORIES[role] ?? []);
}

export const useAppNotifications = () => {
  const { user, userRole, isAuthenticated } = useAuth();
  const uid = user?.id ?? '';

  const [enabledCats, setEnabledCats] = useState<Set<NotifCategory>>(new Set());
  useEffect(() => {
    if (uid) setEnabledCats(loadPrefs(uid, userRole));
  }, [uid, userRole]);

  const savePrefs = useCallback((next: Set<NotifCategory>) => {
    setEnabledCats(new Set(next));
    try { localStorage.setItem(PREFS_KEY(uid), JSON.stringify([...next])); } catch { /* ignore */ }
  }, [uid]);

  const toggleCategory = useCallback((c: NotifCategory) => {
    setEnabledCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      try { localStorage.setItem(PREFS_KEY(uid), JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, [uid]);

  const catsKey = useMemo(() => [...enabledCats].sort().join('|'), [enabledCats]);

  const q = useQuery({
    queryKey: ['app-notifications', uid, catsKey],
    queryFn: () => buildNotifications(enabledCats),
    enabled: isAuthenticated && !!uid && enabledCats.size > 0,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (!uid) return;
    try {
      const raw = localStorage.getItem(READ_KEY(uid));
      setReadIds(new Set(raw ? JSON.parse(raw) : []));
    } catch { setReadIds(new Set()); }
  }, [uid]);

  // Cross-tab sync
  useEffect(() => {
    if (!uid) return;
    const onStorage = (e: StorageEvent) => {
      if (e.key === READ_KEY(uid) && e.newValue) {
        try { setReadIds(new Set(JSON.parse(e.newValue))); } catch { /* noop */ }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [uid]);

  const persist = useCallback((next: Set<string>) => {
    try { localStorage.setItem(READ_KEY(uid), JSON.stringify([...next])); } catch { /* ignore */ }
  }, [uid]);

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev); next.add(id); persist(next); return next;
    });
  }, [persist]);

  const markAllRead = useCallback(() => {
    const all = (q.data ?? []).map((n) => n.id);
    setReadIds((prev) => {
      const next = new Set(prev);
      all.forEach((id) => next.add(id));
      persist(next);
      return next;
    });
  }, [q.data, persist]);

  const clearRead = useCallback(() => {
    setReadIds(new Set());
    try { localStorage.removeItem(READ_KEY(uid)); } catch { /* ignore */ }
  }, [uid]);

  const notifications = useMemo(() => {
    const rank: Record<NotifLevel, number> = { critical: 0, warning: 1, success: 2, info: 3 };
    return [...(q.data ?? [])].sort((a, b) => {
      const ar = readIds.has(a.id) ? 1 : 0;
      const br = readIds.has(b.id) ? 1 : 0;
      if (ar !== br) return ar - br; // unread first
      return rank[a.level] - rank[b.level];
    });
  }, [q.data, readIds]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  return {
    notifications,
    unreadCount,
    readIds,
    markRead,
    markAllRead,
    clearRead,
    isLoading: q.isLoading,
    refetch: q.refetch,
    enabledCategories: enabledCats,
    toggleCategory,
    savePrefs,
    roleDefaults: ROLE_DEFAULT_CATEGORIES[userRole] ?? [],
  };
};
