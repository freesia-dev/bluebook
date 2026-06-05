import React, { useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Mail, 
  Send, 
  CreditCard, 
  FileText, 
  Download, 
  Plus,
  TrendingUp,
  Clock,
  HardDrive,
  Database,
  Landmark,
  Loader2,
  XCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { exportAllTables } from '@/lib/export';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['hsl(217, 91%, 45%)', 'hsl(45, 93%, 47%)', 'hsl(142, 76%, 36%)'];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { suratMasuk, suratKeluar, sppk, pk, kkmpak, isLoading, refetchAll, counts, ojkStats } = useDashboardData();
  const { isAdmin } = useAuth();

  // Storage usage query (admin only) — parallelized across ALL data tables in Bluebook
  const { data: storageCounts } = useQuery({
    queryKey: ['storage-counts-dashboard'],
    queryFn: async () => {
      const tables = [
        'surat_masuk', 'surat_keluar', 'sppk', 'pk', 'kkmpak', 'nomor_loan',
        'pengisian_atm', 'penyelesaian_selisih', 'selisih_atm', 'kartu_tertelan',
        'agenda_kredit_entry', 'call_memo_penagihan', 'debitur_kontak',
        'mlf_data', 'mlf_uploads', 'wa_reminder_log', 'wa_template',
        'security_shift', 'security_log_entry', 'security_log_comment', 'security_audit_token',
        'kondisi_kantor_template', 'atm_config',
        'jenis_kredit', 'jenis_debitur', 'jenis_penggunaan', 'sektor_ekonomi', 'kode_fasilitas',
        'profiles', 'user_roles', 'activity_log', 'recycle_bin',
      ] as const;
      const results = await Promise.all(
        tables.map(async (table) => {
          const { count } = await supabase.from(table as any).select('*', { count: 'exact', head: true });
          return { table, count: count || 0 };
        })
      );
      const counts: Record<string, number> = {};
      let total = 0;
      for (const r of results) {
        counts[r.table] = r.count;
        total += r.count;
      }
      return { counts, total };
    },
    enabled: isAdmin,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60,
  });

  // File storage usage (admin only) — scan ALL top-level folders in documents bucket
  const { data: fileStorageData } = useQuery({
    queryKey: ['file-storage-usage'],
    queryFn: async () => {
      const { data: rootEntries } = await supabase.storage.from('documents').list('', { limit: 1000 });
      const folders = (rootEntries || []).filter((e: any) => !e.metadata).map((e: any) => e.name);
      const rootFiles = (rootEntries || []).filter((e: any) => e.metadata?.size);

      const folderResults = await Promise.all(
        folders.map(async (folder) => {
          const { data: folderFiles } = await supabase.storage.from('documents').list(folder, { limit: 1000 });
          let bytes = 0;
          let count = 0;
          if (folderFiles) {
            for (const f of folderFiles) {
              if (f.metadata?.size) {
                bytes += f.metadata.size;
                count++;
              }
            }
          }
          return { bytes, count };
        })
      );
      let usedBytes = folderResults.reduce((sum, r) => sum + r.bytes, 0);
      let fileCount = folderResults.reduce((sum, r) => sum + r.count, 0);
      for (const f of rootFiles) {
        usedBytes += (f as any).metadata.size;
        fileCount += 1;
      }
      return { usedBytes, fileCount };
    },
    enabled: isAdmin,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: true,
    refetchInterval: 1000 * 60,
  });

  const maxRows = 100000;
  const dbUsedPercent = storageCounts ? Math.min(Math.round((storageCounts.total / maxRows) * 100), 100) : 0;
  const maxStorageBytes = 1024 * 1024 * 1024; // 1GB
  const fileUsedPercent = fileStorageData ? Math.min(Math.round((fileStorageData.usedBytes / maxStorageBytes) * 100), 100) : 0;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  useEffect(() => {
    // Realtime: any change in core public tables triggers refetch of stats AND
    // the admin storage/db usage cards so the gauges are always up-to-date.
    const invalidateUsage = () => {
      refetchAll();
      queryClient.invalidateQueries({ queryKey: ['storage-counts-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['file-storage-usage'] });
    };
    const tablesToWatch = [
      'surat_masuk', 'surat_keluar', 'sppk', 'pk', 'kkmpak', 'nomor_loan',
      'pengisian_atm', 'penyelesaian_selisih', 'kartu_tertelan',
      'agenda_kredit_entry', 'call_memo_penagihan', 'debitur_kontak',
      'mlf_data', 'mlf_uploads',
      'security_shift', 'security_log_entry', 'security_log_comment',
      'activity_log', 'recycle_bin',
    ];
    let channel = supabase.channel('dashboard-changes');
    tablesToWatch.forEach((t) => {
      channel = channel.on('postgres_changes' as any, { event: '*', schema: 'public', table: t }, invalidateUsage);
    });
    channel.subscribe();

    // Also refetch storage gauges when the tab regains focus
    const onFocus = () => {
      queryClient.invalidateQueries({ queryKey: ['storage-counts-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['file-storage-usage'] });
    };
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('focus', onFocus);
    };
  }, [refetchAll, queryClient]);

  // Memoize computed values
  const totalAgendaKredit = useMemo(() => counts.sppk + counts.pk + counts.kkmpak, [counts]);

  const barChartData = useMemo(() => [
    { name: 'Surat Masuk', value: counts.suratMasuk, fill: 'hsl(217, 91%, 45%)' },
    { name: 'Surat Keluar', value: counts.suratKeluar, fill: 'hsl(45, 93%, 47%)' },
    { name: 'SPPK', value: counts.sppk, fill: 'hsl(142, 76%, 36%)' },
    { name: 'PK', value: counts.pk, fill: 'hsl(262, 83%, 58%)' },
    { name: 'KK/MPAK', value: counts.kkmpak, fill: 'hsl(0, 84%, 60%)' },
  ], [counts]);

  const pieChartData = useMemo(() => [
    { name: 'Surat Masuk', value: counts.suratMasuk },
    { name: 'Surat Keluar', value: counts.suratKeluar },
    { name: 'Agenda Kredit', value: totalAgendaKredit },
  ], [counts, totalAgendaKredit]);

  // Memoize recent data (only compute when data changes)
  const recentSuratMasuk = useMemo(() => 
    [...suratMasuk]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
    [suratMasuk]
  );

  const recentSuratKeluar = useMemo(() => 
    [...suratKeluar]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
    [suratKeluar]
  );

  const recentAgendaKredit = useMemo(() => 
    [...sppk, ...pk.map(p => ({ ...p, nomorSPPK: p.nomorPK }))]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5),
    [sppk, pk]
  );

  const handleExportAll = async () => {
    try {
      await exportAllTables();
      toast({ title: 'Export Berhasil', description: 'Semua data telah diekspor ke file Excel.' });
    } catch (error) {
      toast({ 
        title: 'Export Gagal', 
        description: 'Terjadi kesalahan saat mengekspor data.', 
        variant: 'destructive' 
      });
    }
  };

  // Show skeleton while loading (handled by Suspense, but keep for data loading)
  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-pulse">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="h-8 w-48 bg-muted rounded mb-2" />
              <div className="h-4 w-72 bg-muted rounded" />
            </div>
            <div className="h-10 w-40 bg-muted rounded" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-48 bg-muted rounded-xl" />
            <div className="h-48 bg-muted rounded-xl" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader 
        title="Dashboard" 
        description="Selamat datang di Bluebook Telihan - Sistem Manajemen Arsip"
        actions={
          <Button onClick={handleExportAll} className="gap-2">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export Semua Data</span>
          </Button>
        }
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="Surat Masuk" value={counts.suratMasuk} icon={Mail} variant="primary" />
        <StatCard title="Surat Keluar" value={counts.suratKeluar} icon={Send} variant="secondary" />
        <StatCard title="Agenda Kredit" value={totalAgendaKredit} icon={CreditCard} variant="success" />
        <StatCard title="Total Dokumen" value={counts.suratMasuk + counts.suratKeluar + totalAgendaKredit} icon={FileText} variant="warning" />
      </div>

      {/* Cloud Storage Usage (Admin Only) */}
      {isAdmin && storageCounts && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Database className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Penggunaan Database</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{storageCounts.total.toLocaleString('id-ID')} rows terpakai</span>
                  <span>{maxRows.toLocaleString('id-ID')} rows</span>
                </div>
                <div className="h-3 rounded-full bg-secondary overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${dbUsedPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm bg-primary" />
                    <span className="text-muted-foreground">Digunakan: <span className="font-medium text-foreground">{dbUsedPercent}%</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm bg-secondary border border-border" />
                    <span className="text-muted-foreground">Sisa: <span className="font-medium text-foreground">{100 - dbUsedPercent}%</span></span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <HardDrive className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Penyimpanan File</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{fileStorageData ? formatBytes(fileStorageData.usedBytes) : '0 B'} terpakai ({fileStorageData?.fileCount || 0} file)</span>
                  <span>1 GB</span>
                </div>
                <div className="h-3 rounded-full bg-secondary overflow-hidden">
                  <div 
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${Math.max(fileUsedPercent, 1)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm bg-primary" />
                    <span className="text-muted-foreground">Digunakan: <span className="font-medium text-foreground">{fileStorageData ? formatBytes(fileStorageData.usedBytes) : '0 B'}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-sm bg-secondary border border-border" />
                    <span className="text-muted-foreground">Sisa: <span className="font-medium text-foreground">{fileStorageData ? formatBytes(maxStorageBytes - fileStorageData.usedBytes) : '1 GB'}</span></span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Actions & Pie Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/surat-masuk?action=add')}
              className="relative group flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border bg-gradient-to-br from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 hover:border-primary/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md overflow-hidden"
            >
              <div className="absolute top-2 right-2 opacity-[0.06] group-hover:opacity-[0.1] transition-opacity">
                <Mail className="w-20 h-20 -rotate-12" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Mail className="w-6 h-6 text-primary" />
              </div>
              <div className="text-center z-10">
                <p className="font-semibold text-sm text-foreground">Input Surat Masuk</p>
                <p className="text-xs text-muted-foreground mt-0.5">Tambah surat baru</p>
              </div>
            </button>
            <button
              onClick={() => navigate('/surat-keluar?action=add')}
              className="relative group flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-border bg-gradient-to-br from-secondary/5 to-secondary/10 hover:from-secondary/10 hover:to-secondary/20 hover:border-secondary/30 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md overflow-hidden"
            >
              <div className="absolute top-2 right-2 opacity-[0.06] group-hover:opacity-[0.1] transition-opacity">
                <Send className="w-20 h-20 -rotate-12" />
              </div>
              <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center group-hover:bg-secondary/20 transition-colors">
                <Send className="w-6 h-6 text-secondary" />
              </div>
              <div className="text-center z-10">
                <p className="font-semibold text-sm text-foreground">Input Surat Keluar</p>
                <p className="text-xs text-muted-foreground mt-0.5">Kirim surat baru</p>
              </div>
            </button>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Distribusi Dokumen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-2 text-sm">
              {pieChartData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                  <span className="text-muted-foreground text-xs sm:text-sm">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart */}
      <Card className="shadow-card mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-lg">Statistik Arsip</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barChartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 10 }} />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Recent Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Surat Masuk Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSuratMasuk.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
              ) : (
                recentSuratMasuk.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <p className="font-medium text-sm text-foreground truncate">{item.nomorAgenda}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.perihal}</p>
                    <p className="text-xs text-muted-foreground">{item.namaPengirim}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-secondary" />
              Surat Keluar Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSuratKeluar.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
              ) : (
                recentSuratKeluar.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <p className="font-medium text-sm text-foreground truncate">{item.nomorAgenda}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.perihal}</p>
                    <p className="text-xs text-muted-foreground">{item.namaPenerima}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Clock className="w-5 h-5 text-success" />
              Agenda Kredit Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAgendaKredit.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Belum ada data</p>
              ) : (
                recentAgendaKredit.map((item: any) => (
                  <div key={item.id} className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <p className="font-medium text-sm text-foreground truncate">{item.nomorSPPK}</p>
                    <p className="text-xs text-muted-foreground truncate">{item.namaDebitur}</p>
                    <p className="text-xs text-muted-foreground">{item.jenisKredit}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Dashboard;
