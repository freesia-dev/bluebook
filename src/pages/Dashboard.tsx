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
  Clock
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { exportAllTables } from '@/lib/export';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useDashboardData } from '@/hooks/use-dashboard-data';
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
  const { suratMasuk, suratKeluar, sppk, pk, kkmpak, isLoading, refetchAll } = useDashboardData();

  useEffect(() => {
    // Set up realtime subscriptions for live updates
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surat_masuk' }, () => refetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'surat_keluar' }, () => refetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sppk' }, () => refetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pk' }, () => refetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kkmpak' }, () => refetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchAll]);

  // Memoize computed values
  const totalAgendaKredit = useMemo(() => sppk.length + pk.length + kkmpak.length, [sppk, pk, kkmpak]);

  const barChartData = useMemo(() => [
    { name: 'Surat Masuk', value: suratMasuk.length, fill: 'hsl(217, 91%, 45%)' },
    { name: 'Surat Keluar', value: suratKeluar.length, fill: 'hsl(45, 93%, 47%)' },
    { name: 'SPPK', value: sppk.length, fill: 'hsl(142, 76%, 36%)' },
    { name: 'PK', value: pk.length, fill: 'hsl(262, 83%, 58%)' },
    { name: 'KK/MPAK', value: kkmpak.length, fill: 'hsl(0, 84%, 60%)' },
  ], [suratMasuk, suratKeluar, sppk, pk, kkmpak]);

  const pieChartData = useMemo(() => [
    { name: 'Surat Masuk', value: suratMasuk.length },
    { name: 'Surat Keluar', value: suratKeluar.length },
    { name: 'Agenda Kredit', value: totalAgendaKredit },
  ], [suratMasuk, suratKeluar, totalAgendaKredit]);

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

  const handleExportAll = () => {
    exportAllTables();
    toast({ title: 'Export Berhasil', description: 'Semua data telah diekspor ke file Excel.' });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <PageHeader title="Dashboard" description="Memuat data..." />
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground">Memuat data...</p>
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
        <StatCard title="Surat Masuk" value={suratMasuk.length} icon={Mail} variant="primary" />
        <StatCard title="Surat Keluar" value={suratKeluar.length} icon={Send} variant="secondary" />
        <StatCard title="Agenda Kredit" value={totalAgendaKredit} icon={CreditCard} variant="success" />
        <StatCard title="Total Dokumen" value={suratMasuk.length + suratKeluar.length + totalAgendaKredit} icon={FileText} variant="warning" />
      </div>

      {/* Quick Actions & Pie Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <Card className="shadow-card hover:shadow-card-hover transition-shadow">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button variant="outline" className="gap-2" onClick={() => navigate('/surat-masuk')}>
              <Mail className="w-4 h-4" />
              <span className="hidden sm:inline">Input</span> Surat Masuk
            </Button>
            <Button variant="outline" className="gap-2" onClick={() => navigate('/surat-keluar')}>
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Input</span> Surat Keluar
            </Button>
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
