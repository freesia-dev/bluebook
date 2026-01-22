import React, { useEffect, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
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
  Calendar,
  ArrowRight,
  BarChart3,
  PieChart as PieChartIcon,
  Sparkles
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { exportAllTables } from '@/lib/export';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useDashboardData } from '@/hooks/use-dashboard-data';
import { useAuth } from '@/contexts/AuthContext';
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
  AreaChart,
  Area,
} from 'recharts';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';

const CHART_COLORS = ['#0B3C5D', '#F2A154', '#3FA7D6', '#4CAF50', '#9C27B0'];

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userName } = useAuth();
  const { suratMasuk, suratKeluar, sppk, pk, kkmpak, isLoading, refetchAll } = useDashboardData();

  useEffect(() => {
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

  const totalAgendaKredit = useMemo(() => sppk.length + pk.length + kkmpak.length, [sppk, pk, kkmpak]);
  const totalDokumen = useMemo(() => suratMasuk.length + suratKeluar.length + totalAgendaKredit, [suratMasuk, suratKeluar, totalAgendaKredit]);

  const barChartData = useMemo(() => [
    { name: 'Surat Masuk', value: suratMasuk.length, fill: CHART_COLORS[0] },
    { name: 'Surat Keluar', value: suratKeluar.length, fill: CHART_COLORS[1] },
    { name: 'SPPK', value: sppk.length, fill: CHART_COLORS[2] },
    { name: 'PK', value: pk.length, fill: CHART_COLORS[3] },
    { name: 'KK/MPAK', value: kkmpak.length, fill: CHART_COLORS[4] },
  ], [suratMasuk, suratKeluar, sppk, pk, kkmpak]);

  const pieChartData = useMemo(() => [
    { name: 'Surat Masuk', value: suratMasuk.length, color: CHART_COLORS[0] },
    { name: 'Surat Keluar', value: suratKeluar.length, color: CHART_COLORS[1] },
    { name: 'Agenda Kredit', value: totalAgendaKredit, color: CHART_COLORS[2] },
  ], [suratMasuk, suratKeluar, totalAgendaKredit]);

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

  const today = format(new Date(), "EEEE, d MMMM yyyy", { locale: localeId });

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6 animate-pulse">
          <div className="flex flex-col gap-4">
            <div className="h-8 w-64 bg-muted rounded-lg" />
            <div className="h-5 w-96 bg-muted rounded-lg" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-muted rounded-2xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-80 bg-muted rounded-2xl" />
            <div className="h-80 bg-muted rounded-2xl" />
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-2xl">👋</span>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-foreground">
                Selamat datang, {userName || 'Admin'}
              </h1>
            </div>
            <p className="text-muted-foreground">
              Ringkasan aktivitas arsip dan dokumen hari ini
            </p>
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{today}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Sparkles className="w-4 h-4 text-secondary" />
                <span className="text-secondary font-medium">{totalDokumen} total dokumen</span>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleExportAll} 
            className="gap-2 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300"
          >
            <Download className="w-4 h-4" />
            <span>Export Semua Data</span>
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="animate-slide-up stagger-1">
            <StatCard 
              title="Surat Masuk" 
              value={suratMasuk.length} 
              icon={Mail} 
              variant="primary"
              description="Dokumen masuk tercatat"
              trend={{ value: 12, type: 'up' }}
            />
          </div>
          <div className="animate-slide-up stagger-2">
            <StatCard 
              title="Surat Keluar" 
              value={suratKeluar.length} 
              icon={Send} 
              variant="secondary"
              description="Dokumen keluar tercatat"
              trend={{ value: 8, type: 'up' }}
            />
          </div>
          <div className="animate-slide-up stagger-3">
            <StatCard 
              title="Agenda Kredit" 
              value={totalAgendaKredit} 
              icon={CreditCard} 
              variant="info"
              description="Agenda aktif"
              trend={{ value: 5, type: 'up' }}
            />
          </div>
          <div className="animate-slide-up stagger-4">
            <StatCard 
              title="Total Dokumen" 
              value={totalDokumen} 
              icon={FileText} 
              variant="success"
              description="Total arsip tersimpan"
              trend={{ value: 0, type: 'neutral' }}
            />
          </div>
        </div>

        {/* Quick Actions & Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Actions */}
          <Card className="glass-card hover-lift border-0 shadow-glass">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plus className="w-4 h-4 text-primary" />
                </div>
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-between gap-2 h-12 border-2 hover:border-primary hover:bg-primary/5 transition-all duration-300 group"
                onClick={() => navigate('/surat-masuk')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Mail className="w-4 h-4" />
                  </div>
                  <span className="font-medium">Input Surat Masuk</span>
                </div>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-between gap-2 h-12 border-2 hover:border-secondary hover:bg-secondary/5 transition-all duration-300 group"
                onClick={() => navigate('/surat-keluar')}
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center group-hover:bg-secondary group-hover:text-secondary-foreground transition-colors">
                    <Send className="w-4 h-4" />
                  </div>
                  <span className="font-medium">Input Surat Keluar</span>
                </div>
                <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </CardContent>
          </Card>

          {/* Pie Chart - Distribution */}
          <Card className="lg:col-span-2 glass-card hover-lift border-0 shadow-glass">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                  <PieChartIcon className="w-4 h-4 text-info" />
                </div>
                Distribusi Dokumen
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie 
                        data={pieChartData} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={50} 
                        outerRadius={80} 
                        paddingAngle={4} 
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))', 
                          border: '1px solid hsl(var(--border))', 
                          borderRadius: '12px',
                          boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-3">
                  {pieChartData.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-3">
                      <div 
                        className="w-4 h-4 rounded-full shadow-sm" 
                        style={{ backgroundColor: entry.color }} 
                      />
                      <div>
                        <p className="text-sm font-medium text-foreground">{entry.name}</p>
                        <p className="text-xs text-muted-foreground">{entry.value} dokumen</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bar Chart - Statistics */}
        <Card className="glass-card hover-lift border-0 shadow-glass">
          <CardHeader className="pb-4">
            <CardTitle className="font-display text-lg flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-success" />
              </div>
              Statistik Arsip
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis 
                    dataKey="name" 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} 
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.1)'
                    }} 
                    cursor={{ fill: 'hsl(var(--muted) / 0.3)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Data Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Surat Masuk Terbaru */}
          <Card className="glass-card hover-lift border-0 shadow-glass">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-primary" />
                </div>
                Surat Masuk Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSuratMasuk.length === 0 ? (
                  <div className="text-center py-8">
                    <Mail className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Belum ada data</p>
                  </div>
                ) : (
                  recentSuratMasuk.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 border border-transparent hover:border-primary/20 cursor-pointer group"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {item.nomorAgenda}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.perihal}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">{item.namaPengirim}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Surat Keluar Terbaru */}
          <Card className="glass-card hover-lift border-0 shadow-glass">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-secondary" />
                </div>
                Surat Keluar Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentSuratKeluar.length === 0 ? (
                  <div className="text-center py-8">
                    <Send className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Belum ada data</p>
                  </div>
                ) : (
                  recentSuratKeluar.map((item, index) => (
                    <div 
                      key={item.id} 
                      className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 border border-transparent hover:border-secondary/20 cursor-pointer group"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate group-hover:text-secondary transition-colors">
                            {item.nomorAgenda}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.perihal}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">{item.namaPenerima}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Agenda Kredit Terbaru */}
          <Card className="glass-card hover-lift border-0 shadow-glass">
            <CardHeader className="pb-4">
              <CardTitle className="font-display text-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-info" />
                </div>
                Agenda Kredit Terbaru
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentAgendaKredit.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Belum ada data</p>
                  </div>
                ) : (
                  recentAgendaKredit.map((item: any, index) => (
                    <div 
                      key={item.id} 
                      className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-all duration-200 border border-transparent hover:border-info/20 cursor-pointer group"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-foreground truncate group-hover:text-info transition-colors">
                            {item.nomorSPPK}
                          </p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{item.namaDebitur}</p>
                          <p className="text-xs text-muted-foreground/70 mt-1">{item.jenisKredit}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default Dashboard;