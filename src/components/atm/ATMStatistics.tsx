import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PengisianATM } from '@/types';
import { formatCurrencyDisplay } from '@/hooks/use-currency-input';
import { 
  TrendingUp, 
  TrendingDown, 
  Calculator, 
  Banknote, 
  CreditCard,
  AlertTriangle,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { id } from 'date-fns/locale';

interface ATMStatisticsProps {
  data: PengisianATM[];
}

const COLORS = {
  primary: 'hsl(217, 91%, 45%)',
  success: 'hsl(142, 76%, 36%)',
  warning: 'hsl(45, 93%, 47%)',
  destructive: 'hsl(0, 84%, 60%)',
  muted: 'hsl(215, 16%, 47%)',
};

export const ATMStatistics: React.FC<ATMStatisticsProps> = ({ data }) => {
  // Calculate statistics
  const stats = useMemo(() => {
    if (!data.length) return null;

    const totalSaldo = data.reduce((sum, item) => sum + item.saldoBukuBesar, 0);
    const totalDisetor = data.reduce((sum, item) => sum + item.jumlahDisetor, 0);
    const totalSelisihLebih = data.filter(d => d.keteranganSelisih === 'LEBIH').reduce((sum, item) => sum + item.jumlahSelisih, 0);
    const totalSelisihKurang = data.filter(d => d.keteranganSelisih === 'KURANG').reduce((sum, item) => sum + item.jumlahSelisih, 0);
    const totalKartuTertelan = data.reduce((sum, item) => sum + item.kartuTertelan, 0);
    const totalRetracts = data.reduce((sum, item) => sum + item.retracts, 0);

    const countLebih = data.filter(d => d.keteranganSelisih === 'LEBIH').length;
    const countKurang = data.filter(d => d.keteranganSelisih === 'KURANG').length;
    const countNihil = data.filter(d => d.keteranganSelisih === '-' || d.jumlahSelisih === 0).length;

    // Last 7 days trend
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i);
      const dayData = data.filter(d => 
        isWithinInterval(new Date(d.tanggal), {
          start: startOfDay(date),
          end: endOfDay(date)
        })
      );
      const selisih = dayData.reduce((sum, item) => {
        if (item.keteranganSelisih === 'LEBIH') return sum + item.jumlahSelisih;
        if (item.keteranganSelisih === 'KURANG') return sum - item.jumlahSelisih;
        return sum;
      }, 0);
      
      return {
        name: format(date, 'dd/MM', { locale: id }),
        date: format(date, 'EEEE', { locale: id }),
        selisih: selisih / 1000, // in thousands
        saldo: dayData.reduce((sum, item) => sum + item.saldoBukuBesar, 0) / 1000000, // in millions
        transaksi: dayData.length,
      };
    });

    // Pie chart data for selisih distribution
    const pieData = [
      { name: 'Nihil', value: countNihil, color: COLORS.success },
      { name: 'Lebih', value: countLebih, color: COLORS.primary },
      { name: 'Kurang', value: countKurang, color: COLORS.destructive },
    ].filter(d => d.value > 0);

    return {
      totalSaldo,
      totalDisetor,
      totalSelisihLebih,
      totalSelisihKurang,
      totalKartuTertelan,
      totalRetracts,
      countLebih,
      countKurang,
      countNihil,
      last7Days,
      pieData,
      totalTransaksi: data.length,
    };
  }, [data]);

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calculator className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Transaksi</p>
                <p className="text-xl font-bold text-foreground">{stats.totalTransaksi}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Banknote className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Disetor</p>
                <p className="text-lg font-bold text-foreground truncate">{formatCurrencyDisplay(stats.totalDisetor)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <CreditCard className="h-5 w-5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">Kartu Tertelan</p>
                <p className="text-xl font-bold text-foreground">{stats.totalKartuTertelan}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-warning/10">
                <BarChart3 className="h-5 w-5 text-warning" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground truncate">Total Retracts</p>
                <p className="text-xl font-bold text-foreground">{stats.totalRetracts.toLocaleString('id-ID')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selisih Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-success/30 bg-success/5">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-success" />
                <span className="text-sm font-medium">Nihil</span>
              </div>
              <Badge variant="secondary" className="bg-success/10 text-success">
                {stats.countNihil} kali
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Selisih Lebih</span>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {stats.countLebih} kali
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrencyDisplay(stats.totalSelisihLebih)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-destructive" />
                <span className="text-sm font-medium">Selisih Kurang</span>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="bg-destructive/10 text-destructive">
                  {stats.countKurang} kali
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatCurrencyDisplay(stats.totalSelisihKurang)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Trend Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Trend Selisih 7 Hari Terakhir (Ribuan)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.last7Days}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" tick={{ fontSize: 10 }} />
                  <YAxis className="text-xs" tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))', 
                      borderRadius: '8px',
                      fontSize: '12px'
                    }} 
                    formatter={(value: number) => [`Rp ${value.toLocaleString('id-ID')}K`, 'Selisih']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="selisih" 
                    stroke={COLORS.primary} 
                    strokeWidth={2}
                    dot={{ fill: COLORS.primary, strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Distribution Pie Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Distribusi Selisih
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px] flex items-center">
              {stats.pieData.length > 0 ? (
                <div className="w-full flex items-center gap-4">
                  <div className="flex-1 h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={stats.pieData} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={35} 
                          outerRadius={60} 
                          paddingAngle={2} 
                          dataKey="value"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {stats.pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))', 
                            borderRadius: '8px',
                            fontSize: '12px'
                          }} 
                          formatter={(value: number, name: string) => [`${value} kali`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {stats.pieData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="text-muted-foreground">{entry.name}:</span>
                        <span className="font-medium">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="w-full flex items-center justify-center text-muted-foreground text-sm">
                  Belum ada data selisih
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Transaction Bar Chart - Full Width */}
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            Transaksi Harian (7 Hari Terakhir)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[160px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.last7Days} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 11 }} 
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 11 }} 
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))', 
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                  formatter={(value: number) => [`${value} transaksi`, 'Jumlah']}
                />
                <Bar 
                  dataKey="transaksi" 
                  fill={COLORS.primary} 
                  radius={[4, 4, 0, 0]}
                  maxBarSize={50}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
