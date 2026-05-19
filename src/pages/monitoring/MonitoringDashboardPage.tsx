import React, { useMemo, useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMLFUploads, useMLFData143 } from '@/hooks/use-mlf-data';
import { fmtIDR, fmtNum, KOL_LABEL, KOL_COLOR, kolDisplay } from '@/lib/mlf-utils';
import { Users, Wallet, AlertTriangle, TrendingDown, FileSpreadsheet } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const MonitoringDashboardPage: React.FC = () => {
  const { data: uploads = [] } = useMLFUploads();
  const [selectedUpload, setSelectedUpload] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!selectedUpload && uploads.length > 0) setSelectedUpload(uploads[0].id);
  }, [uploads, selectedUpload]);

  const { data: rows = [], isLoading } = useMLFData143(selectedUpload);

  const stats = useMemo(() => {
    const totalDebitur = rows.length;
    const totalBaki = rows.reduce((s, r) => s + (Number(r.baki) || 0), 0);
    const totalPlafon = rows.reduce((s, r) => s + (Number(r.pla) || 0), 0);
    const totalTunggakan = rows.reduce((s, r) => s + (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0), 0);
    const totalTungpk = rows.reduce((s, r) => s + (Number(r.tungpk) || 0), 0);
    const totalTungbg = rows.reduce((s, r) => s + (Number(r.tungbg) || 0), 0);

    // KOL breakdown
    const kolMap = new Map<number, { count: number; baki: number; tunggakan: number }>();
    rows.forEach((r) => {
      const k = Number(r.kol) || 0;
      const cur = kolMap.get(k) || { count: 0, baki: 0, tunggakan: 0 };
      cur.count += 1;
      cur.baki += Number(r.baki) || 0;
      cur.tunggakan += (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0);
      kolMap.set(k, cur);
    });
    const kolData = Array.from(kolMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([k, v]) => ({ kol: k, name: `KOL ${k} - ${KOL_LABEL[k] || ''}`, ...v }));

    // NPL (KOL 3-5)
    const nplCount = rows.filter((r) => (Number(r.kol) || 0) >= 3).length;
    const nplBaki = rows.filter((r) => (Number(r.kol) || 0) >= 3).reduce((s, r) => s + (Number(r.baki) || 0), 0);

    // Product breakdown
    const prodMap = new Map<string, { count: number; baki: number }>();
    rows.forEach((r) => {
      const p = r.lytitl || 'Lainnya';
      const cur = prodMap.get(p) || { count: 0, baki: 0 };
      cur.count += 1;
      cur.baki += Number(r.baki) || 0;
      prodMap.set(p, cur);
    });
    const prodData = Array.from(prodMap.entries())
      .map(([name, v]) => ({ name: name.length > 25 ? name.slice(0, 25) + '…' : name, fullName: name, ...v }))
      .sort((a, b) => b.baki - a.baki)
      .slice(0, 8);

    // AO breakdown
    const aoMap = new Map<string, { count: number; baki: number; tunggakan: number }>();
    rows.forEach((r) => {
      const ao = r.l0usid || '-';
      const cur = aoMap.get(ao) || { count: 0, baki: 0, tunggakan: 0 };
      cur.count += 1;
      cur.baki += Number(r.baki) || 0;
      cur.tunggakan += (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0);
      aoMap.set(ao, cur);
    });
    const aoData = Array.from(aoMap.entries())
      .map(([ao, v]) => ({ ao, ...v }))
      .sort((a, b) => b.tunggakan - a.tunggakan);

    // Top debitur tunggakan
    const topDebitur = [...rows]
      .map((r) => ({ ...r, tunggakan: (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0) }))
      .filter((r) => r.tunggakan > 0)
      .sort((a, b) => b.tunggakan - a.tunggakan)
      .slice(0, 10);

    return { totalDebitur, totalBaki, totalPlafon, totalTunggakan, totalTungpk, totalTungbg, kolData, nplCount, nplBaki, prodData, aoData, topDebitur };
  }, [rows]);

  const selectedUploadInfo = uploads.find((u) => u.id === selectedUpload);

  return (
    <MainLayout>
      <PageHeader
        title="Dashboard Monitoring KKR & NPL"
        description="Rangkuman pengolahan data Master Loan Filter — Cabang 143 (CAPEM TELIHAN BONTANG)"
      />

      <Card className="mb-6">
        <CardContent className="pt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Periode Data</p>
            <Select value={selectedUpload} onValueChange={setSelectedUpload}>
              <SelectTrigger className="w-[280px]">
                <SelectValue placeholder="Pilih periode" />
              </SelectTrigger>
              <SelectContent>
                {uploads.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {format(new Date(u.jobdate), 'dd MMMM yyyy', { locale: idLocale })} — {u.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {selectedUploadInfo && (
            <div className="text-right text-xs text-muted-foreground">
              <p>Total baris (semua cabang): <strong className="text-foreground">{fmtNum(selectedUploadInfo.total_rows)}</strong></p>
              <p>Filter cabang: <strong className="text-foreground">143 - CAPEM TELIHAN BONTANG</strong></p>
            </div>
          )}
        </CardContent>
      </Card>

      {uploads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">Belum ada data yang diupload. Silakan upload file MLF terlebih dahulu.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <KPICard icon={Users} label="Total Debitur" value={fmtNum(stats.totalDebitur)} accent="bg-blue-500/10 text-blue-600" />
            <KPICard icon={Wallet} label="Total Outstanding (Baki)" value={fmtIDR(stats.totalBaki)} accent="bg-emerald-500/10 text-emerald-600" />
            <KPICard
              icon={AlertTriangle}
              label="Tunggakan Berjalan (Pokok + Bunga)"
              value={fmtIDR(stats.totalTunggakan)}
              sub={`Pokok ${fmtIDR(stats.totalTungpk)} • Bunga ${fmtIDR(stats.totalTungbg)}`}
              accent="bg-amber-500/10 text-amber-600"
            />
            <KPICard
              icon={TrendingDown}
              label="NPL (KOL 3-5)"
              value={`${fmtNum(stats.nplCount)} debitur`}
              sub={fmtIDR(stats.nplBaki)}
              accent="bg-red-500/10 text-red-600"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Komposisi Debitur per KOL</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={stats.kolData} dataKey="count" nameKey="name" outerRadius={90} label={(e: any) => e.count}>
                      {stats.kolData.map((d) => (
                        <Cell key={d.kol} fill={KOL_COLOR[d.kol] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtNum(v as number)} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Outstanding per KOL</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={stats.kolData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}jt`} />
                    <Tooltip formatter={(v: any) => fmtIDR(v as number)} />
                    <Bar dataKey="baki" name="Outstanding" radius={[6, 6, 0, 0]}>
                      {stats.kolData.map((d) => (
                        <Cell key={d.kol} fill={KOL_COLOR[d.kol] || '#94a3b8'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Outstanding per Produk Kredit</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.prodData} layout="vertical" margin={{ left: 130 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}jt`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={130} />
                    <Tooltip formatter={(v: any) => fmtIDR(v as number)} labelFormatter={(l) => (stats.prodData.find((p) => p.name === l)?.fullName || l) as string} />
                    <Bar dataKey="baki" name="Outstanding" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* AO breakdown */}
          {stats.aoData.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Ringkasan per AO / Petugas</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>AO</TableHead>
                      <TableHead className="text-right">Jumlah Debitur</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">Tunggakan Berjalan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.aoData.map((a) => (
                      <TableRow key={a.ao}>
                        <TableCell className="font-medium">{a.ao}</TableCell>
                        <TableCell className="text-right">{fmtNum(a.count)}</TableCell>
                        <TableCell className="text-right">{fmtIDR(a.baki)}</TableCell>
                        <TableCell className="text-right">
                          <span className={a.tunggakan > 0 ? 'text-amber-600 font-semibold' : ''}>{fmtIDR(a.tunggakan)}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Top tunggakan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Top 10 Debitur dengan Tunggakan Berjalan Tertinggi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>No Rekening</TableHead>
                    <TableHead>Nama Debitur</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-center">KOL</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Tunggakan</TableHead>
                    <TableHead>AO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topDebitur.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        Tidak ada debitur dengan tunggakan berjalan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.topDebitur.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="font-mono text-xs">{d.l0lnno}</TableCell>
                        <TableCell className="font-medium">{d.l0name}</TableCell>
                        <TableCell className="text-xs">{d.lytitl}</TableCell>
                        <TableCell className="text-center">
                          <Badge style={{ backgroundColor: KOL_COLOR[Number(d.kol) || 0] || '#94a3b8', color: 'white' }}>
                            {d.kol}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{fmtIDR(Number(d.baki) || 0)}</TableCell>
                        <TableCell className="text-right font-semibold text-amber-600">{fmtIDR(d.tunggakan)}</TableCell>
                        <TableCell className="text-xs">{d.l0usid}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </MainLayout>
  );
};

const KPICard: React.FC<{ icon: React.ElementType; label: string; value: string; sub?: string; accent: string }> = ({ icon: Icon, label, value, sub, accent }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground mb-1">{label}</p>
          <p className="text-xl font-bold truncate">{value}</p>
          {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default MonitoringDashboardPage;
