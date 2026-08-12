import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useSecurityShifts, SHIFT_LABEL_SHORT, SHIFT_PERIODE_ORDER } from '@/hooks/use-security-log';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { format, subDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  Shield, ShieldCheck, ShieldAlert, Clock, ClipboardList, CalendarDays,
  ArrowRight, AlertTriangle, CheckCircle2, Timer,
} from 'lucide-react';

const KPI: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  tint?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet';
}> = ({ icon: Icon, label, value, sub, tint = 'blue' }) => {
  const tones: Record<string, string> = {
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    emerald: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    rose: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    violet: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
  };
  return (
    <Card className="border-border/60">
      <CardContent className="p-4 flex items-start gap-3 min-w-0">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', tones[tint])}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground truncate">{label}</p>
          <p className="text-2xl font-bold leading-tight">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-0.5 break-words">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
};

/** Dashboard khusus role Security & Team Leader Security — halaman utama setelah login. */
const SecurityDashboardPage: React.FC = () => {
  const { userName, permissions } = useAuth();
  const today = format(new Date(), 'yyyy-MM-dd');
  const sevenDaysAgo = format(subDays(new Date(), 6), 'yyyy-MM-dd');

  const { data: allShifts = [], isLoading } = useSecurityShifts();

  const todayShifts = useMemo(
    () =>
      allShifts
        .filter((s) => s.tanggal === today)
        .sort((a, b) => (SHIFT_PERIODE_ORDER[a.shift] ?? 99) - (SHIFT_PERIODE_ORDER[b.shift] ?? 99)),
    [allShifts, today],
  );
  const weekShifts = useMemo(
    () => allShifts.filter((s) => s.tanggal >= sevenDaysAgo && s.tanggal <= today),
    [allShifts, sevenDaysAgo, today],
  );

  const shiftIds = weekShifts.map((s) => s.id);
  const { data: entries = [] } = useQuery({
    queryKey: ['security-dashboard-entries', sevenDaysAgo, today, shiftIds.length],
    enabled: shiftIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_log_entry' as any)
        .select('id, shift_id, is_insiden, waktu_kejadian, kejadian')
        .in('shift_id', shiftIds)
        .order('waktu_kejadian', { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as {
        id: string; shift_id: string; is_insiden: boolean; waktu_kejadian: string; kejadian: string;
      }[];
    },
  });

  const activeShift = todayShifts.find((s) => s.status === 'aktif');
  const todayShiftIds = new Set(todayShifts.map((s) => s.id));
  const todayEntries = entries.filter((e) => todayShiftIds.has(e.shift_id));
  const insidenWeek = entries.filter((e) => e.is_insiden);
  const approvedToday = todayShifts.some((s) => !!s.ttd_pimpinan_at);
  const allClosedToday = todayShifts.length > 0 && todayShifts.every((s) => s.status === 'selesai');
  const belumApprove = weekShifts
    .filter((s) => s.status === 'selesai' && !s.ttd_pimpinan_at)
    .reduce<string[]>((acc, s) => (acc.includes(s.tanggal) ? acc : [...acc, s.tanggal]), []);

  const shiftByDate = useMemo(() => {
    const map = new Map<string, typeof weekShifts>();
    weekShifts.forEach((s) => {
      map.set(s.tanggal, [...(map.get(s.tanggal) ?? []), s]);
    });
    return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [weekShifts]);

  return (
    <MainLayout>
      <PageHeader
        title="Dashboard Security"
        description={`Ringkasan pengawasan harian KCP Telihan — ${format(new Date(), 'EEEE, dd MMMM yyyy', { locale: idLocale })}`}
      />

      {/* Hero status shift */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        <div
          className={cn(
            'lg:col-span-1 relative overflow-hidden rounded-xl p-5 sm:p-6 text-white shadow-lg bg-gradient-to-br',
            activeShift ? 'from-emerald-600 to-emerald-800' : 'from-slate-600 to-slate-800',
          )}
        >
          <Shield className="absolute -right-5 -bottom-5 w-36 h-36 opacity-10 rotate-12" strokeWidth={1.2} />
          <p className="text-xs uppercase tracking-wider opacity-90">Status Shift Saat Ini</p>
          <p className="text-3xl sm:text-4xl font-bold mt-2 tracking-tight break-words">
            {activeShift ? SHIFT_LABEL_SHORT[activeShift.shift] : 'Tidak Ada Shift Aktif'}
          </p>
          <div className="mt-3 space-y-1 text-xs opacity-95">
            {activeShift ? (
              <>
                <p className="break-words">Petugas: <strong>{activeShift.nama_petugas}</strong></p>
                <p>Mulai: {format(new Date(activeShift.jam_mulai), 'HH:mm')} WITA</p>
              </>
            ) : (
              <p>Belum ada shift berjalan hari ini.</p>
            )}
          </div>
          <Button asChild size="sm" variant="secondary" className="mt-4">
            <Link to="/security/log">
              Buka Log Harian <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Link>
          </Button>
        </div>

        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <KPI icon={Clock} label="Shift Hari Ini" value={todayShifts.length}
            sub={`${todayShifts.filter((s) => s.status === 'selesai').length} selesai`} tint="blue" />
          <KPI icon={ClipboardList} label="Catatan Hari Ini" value={todayEntries.length}
            sub={`${todayEntries.filter((e) => e.is_insiden).length} ditandai insiden`} tint="violet" />
          <KPI icon={AlertTriangle} label="Insiden 7 Hari" value={insidenWeek.length}
            sub="Kejadian yang perlu perhatian" tint="rose" />
          <KPI icon={ShieldCheck} label="BA Belum Disetujui" value={belumApprove.length}
            sub={belumApprove.length ? `Terakhir: ${belumApprove[0]}` : 'Semua sudah disetujui'} tint="amber" />
        </div>
      </div>

      {/* Status approval hari ini */}
      <Card className="mb-4 border-border/60">
        <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {approvedToday ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-sm">Berita Acara hari ini <strong>sudah disetujui</strong> Pimpinan.</span>
              </>
            ) : allClosedToday ? (
              <>
                <Timer className="w-5 h-5 text-amber-600 shrink-0" />
                <span className="text-sm">Semua shift selesai — <strong>menunggu approval</strong> Pimpinan.</span>
              </>
            ) : (
              <>
                <ShieldAlert className="w-5 h-5 text-muted-foreground shrink-0" />
                <span className="text-sm">
                  {todayShifts.length === 0 ? 'Belum ada shift tercatat hari ini.' : 'Masih ada shift berjalan / belum serah terima.'}
                </span>
              </>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button asChild variant="outline" size="sm"><Link to="/security/log">Log Harian</Link></Button>
            {permissions.canManageSecurityAudit && (
              <Button asChild variant="outline" size="sm"><Link to="/security/audit-links">Link Audit</Link></Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Riwayat 7 hari */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" /> Aktivitas 7 Hari Terakhir
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {isLoading && <p className="text-sm text-muted-foreground py-4 text-center">Memuat...</p>}
            {!isLoading && shiftByDate.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Belum ada shift dalam 7 hari terakhir.</p>
            )}
            {shiftByDate.map(([tanggal, list]) => {
              const signed = list.some((s) => !!s.ttd_pimpinan_at);
              const count = entries.filter((e) => list.some((s) => s.id === e.shift_id)).length;
              return (
                <div key={tanggal} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {format(new Date(tanggal), 'EEEE, dd MMM yyyy', { locale: idLocale })}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">
                      {list.map((s) => SHIFT_LABEL_SHORT[s.shift]).join(' · ')} — {count} catatan
                    </p>
                  </div>
                  <Badge className={signed ? 'bg-emerald-600 text-white shrink-0' : 'bg-amber-500 text-white shrink-0'}>
                    {signed ? 'Disetujui' : 'Pending'}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Insiden terbaru */}
        <Card className="border-border/60">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" /> Insiden Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insidenWeek.length === 0 && (
              <p className="text-sm text-muted-foreground py-4 text-center">Tidak ada insiden dalam 7 hari terakhir. 👍</p>
            )}
            {insidenWeek.slice(0, 8).map((e) => (
              <div key={e.id} className="rounded-lg border border-rose-200 bg-rose-50 dark:bg-rose-950/20 dark:border-rose-900 px-3 py-2">
                <p className="text-[11px] text-rose-700 dark:text-rose-300">
                  {format(new Date(e.waktu_kejadian), 'dd MMM yyyy · HH:mm', { locale: idLocale })} WITA
                </p>
                <p className="text-sm text-rose-900 dark:text-rose-100 line-clamp-2">{e.kejadian}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground mt-4">Login sebagai {userName}</p>
    </MainLayout>
  );
};

export default SecurityDashboardPage;
