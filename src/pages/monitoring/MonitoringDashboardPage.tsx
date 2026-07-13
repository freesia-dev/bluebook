import React, { useMemo, useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useMLFUploads, useMLFDataByBranch } from '@/hooks/use-mlf-data';
import { fmtIDR, fmtNum, KOL_LABEL, KOL_COLOR, kolDisplay } from '@/lib/mlf-utils';
import { Users, Wallet, AlertTriangle, TrendingDown, FileSpreadsheet, Percent, Activity, ShieldAlert, Gauge, CalendarClock, Sparkles, CheckCircle2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const MonitoringDashboardPage: React.FC = () => {
  const { data: uploads = [] } = useMLFUploads();
  const [selectedUpload, setSelectedUpload] = useState<string | undefined>(undefined);
  const [includeEkstrakom, setIncludeEkstrakom] = useState(false);
  const [lunasRange, setLunasRange] = useState<'bulan' | '3bulan'>('bulan');

  useEffect(() => {
    if (!selectedUpload && uploads.length > 0) setSelectedUpload(uploads[0].id);
  }, [uploads, selectedUpload]);

  const { data: allRows = [] } = useMLFData143(selectedUpload);
  const rows = useMemo(
    () => (includeEkstrakom ? allRows : allRows.filter((r) => (Number(r.kol) || 0) !== 0)),
    [allRows, includeEkstrakom]
  );

  const stats = useMemo(() => {
    const totalDebitur = rows.length;
    const totalBaki = rows.reduce((s, r) => s + (Number(r.baki) || 0), 0);
    const totalPlafon = rows.reduce((s, r) => s + (Number(r.pla) || 0), 0);
    const totalTunggakan = rows.reduce((s, r) => s + (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0), 0);
    const totalTungpk = rows.reduce((s, r) => s + (Number(r.tungpk) || 0), 0);
    const totalTungbg = rows.reduce((s, r) => s + (Number(r.tungbg) || 0), 0);

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
      .map(([k, v]) => ({ kol: k, name: `KOL ${kolDisplay(k)} - ${KOL_LABEL[k] || ''}`, ...v }));

    // NPL (KOL 3-5) — denominator excludes ekstrakom regardless of view
    const nplCount = rows.filter((r) => (Number(r.kol) || 0) >= 3).length;
    const nplBaki = rows.filter((r) => (Number(r.kol) || 0) >= 3).reduce((s, r) => s + (Number(r.baki) || 0), 0);
    const nplBaseRows = allRows.filter((r) => (Number(r.kol) || 0) !== 0);
    const nplBaseBaki = nplBaseRows.reduce((s, r) => s + (Number(r.baki) || 0), 0);
    const nplBaseCount = nplBaseRows.length;
    const nplRatio = nplBaseBaki > 0 ? (nplBaki / nplBaseBaki) * 100 : 0;
    const nplCountRatio = nplBaseCount > 0 ? (nplCount / nplBaseCount) * 100 : 0;

    // Coverage tunggakan vs outstanding
    const tunggakanRatio = totalBaki > 0 ? (totalTunggakan / totalBaki) * 100 : 0;

    // KOL 2 (DPK) — early warning
    const dpkCount = rows.filter((r) => (Number(r.kol) || 0) === 2).length;
    const dpkBaki = rows.filter((r) => (Number(r.kol) || 0) === 2).reduce((s, r) => s + (Number(r.baki) || 0), 0);

    // Lancar
    const lancarCount = rows.filter((r) => (Number(r.kol) || 0) === 1).length;
    const lancarBaki = rows.filter((r) => (Number(r.kol) || 0) === 1).reduce((s, r) => s + (Number(r.baki) || 0), 0);

    // Ekstrakom info
    const ekstraCount = allRows.filter((r) => (Number(r.kol) || 0) === 0).length;
    const ekstraBaki = allRows.filter((r) => (Number(r.kol) || 0) === 0).reduce((s, r) => s + (Number(r.baki) || 0), 0);

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

    const aoMap = new Map<string, { count: number; baki: number; tunggakan: number; npl: number }>();
    rows.forEach((r) => {
      const ao = r.l0usid || '-';
      const cur = aoMap.get(ao) || { count: 0, baki: 0, tunggakan: 0, npl: 0 };
      cur.count += 1;
      cur.baki += Number(r.baki) || 0;
      cur.tunggakan += (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0);
      if ((Number(r.kol) || 0) >= 3) cur.npl += Number(r.baki) || 0;
      aoMap.set(ao, cur);
    });
    const aoData = Array.from(aoMap.entries())
      .map(([ao, v]) => ({ ao, ...v, nplRatio: v.baki > 0 ? (v.npl / v.baki) * 100 : 0 }))
      .sort((a, b) => b.tunggakan - a.tunggakan);

    const topDebitur = [...rows]
      .map((r) => ({ ...r, tunggakan: (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0) }))
      .filter((r) => r.tunggakan > 0)
      .sort((a, b) => b.tunggakan - a.tunggakan)
      .slice(0, 10);

    return {
      totalDebitur, totalBaki, totalPlafon, totalTunggakan, totalTungpk, totalTungbg,
      kolData, nplCount, nplBaki, nplRatio, nplCountRatio, nplBaseBaki, nplBaseCount,
      tunggakanRatio, dpkCount, dpkBaki, lancarCount, lancarBaki,
      ekstraCount, ekstraBaki, prodData, aoData, topDebitur,
    };
  }, [rows, allRows]);

  const selectedUploadInfo = uploads.find((u) => u.id === selectedUpload);

  // Determine previous uploads for "baru cair" & "baru lunas"
  const { prevUploadId, monthBaselineUploadId, monthBaselineInfo, prevUploadInfo } = useMemo(() => {
    if (!selectedUploadInfo) return { prevUploadId: undefined, monthBaselineUploadId: undefined, monthBaselineInfo: undefined, prevUploadInfo: undefined };
    const selDate = new Date(selectedUploadInfo.jobdate);
    const monthStart = new Date(selDate.getFullYear(), selDate.getMonth(), 1);
    // Uploads sorted desc by jobdate already
    const earlier = uploads.filter(u => new Date(u.jobdate) < selDate);
    const prev = earlier[0]; // nearest previous
    const baseline = earlier.find(u => new Date(u.jobdate) < monthStart);
    return {
      prevUploadId: prev?.id,
      monthBaselineUploadId: baseline?.id,
      prevUploadInfo: prev,
      monthBaselineInfo: baseline,
    };
  }, [uploads, selectedUploadInfo]);

  const { data: prevRows = [] } = useMLFData143(prevUploadId);
  const { data: baselineRows = [] } = useMLFData143(monthBaselineUploadId);

  const baruCair = useMemo(() => {
    if (!selectedUploadInfo || !monthBaselineUploadId) return { items: [], baki: 0, plafon: 0, available: false };
    const baselineSet = new Set(baselineRows.map(r => r.l0lnno).filter(Boolean) as string[]);
    const items = allRows
      .filter(r => r.l0lnno && !baselineSet.has(r.l0lnno))
      .sort((a, b) => (Number(b.pla) || 0) - (Number(a.pla) || 0));
    const baki = items.reduce((s, r) => s + (Number(r.baki) || 0), 0);
    const plafon = items.reduce((s, r) => s + (Number(r.pla) || 0), 0);
    return { items, baki, plafon, available: true };
  }, [allRows, baselineRows, selectedUploadInfo, monthBaselineUploadId]);

  const baruLunas = useMemo(() => {
    if (!selectedUploadInfo || !monthBaselineUploadId) return { items: [], baki: 0, available: false };
    const currentSet = new Set(allRows.map(r => r.l0lnno).filter(Boolean) as string[]);
    const items = baselineRows
      .filter(r => r.l0lnno && !currentSet.has(r.l0lnno))
      .sort((a, b) => (Number(b.baki) || 0) - (Number(a.baki) || 0));
    const baki = items.reduce((s, r) => s + (Number(r.baki) || 0), 0);
    return { items, baki, available: true };
  }, [allRows, baselineRows, selectedUploadInfo, monthBaselineUploadId]);



  const akanLunas = useMemo(() => {
    if (!selectedUploadInfo) return { items: [], total: 0, baki: 0, rangeLabel: '' };
    const job = new Date(selectedUploadInfo.jobdate);
    const yStart = job.getFullYear();
    const mStart = job.getMonth();
    let endY = yStart, endM = mStart;
    if (lunasRange === '3bulan') {
      const e = new Date(yStart, mStart + 3, 0);
      endY = e.getFullYear(); endM = e.getMonth();
    }
    const start = new Date(yStart, mStart, 1);
    const end = new Date(endY, endM + 1, 0); // last day of endM
    const items = rows
      .filter((r) => r.date1)
      .map((r) => ({ ...r, _due: new Date(r.date1 as string) }))
      .filter((r) => r._due >= start && r._due <= end)
      .sort((a, b) => a._due.getTime() - b._due.getTime());
    const baki = items.reduce((s, r) => s + (Number(r.baki) || 0), 0);
    const rangeLabel = lunasRange === 'bulan'
      ? format(start, 'MMMM yyyy', { locale: idLocale })
      : `${format(start, 'MMM yyyy', { locale: idLocale })} – ${format(end, 'MMM yyyy', { locale: idLocale })}`;
    return { items, total: items.length, baki, rangeLabel };
  }, [rows, selectedUploadInfo, lunasRange]);

  const nplLevel = stats.nplRatio < 2 ? 'good' : stats.nplRatio < 5 ? 'warn' : 'bad';
  const nplColor = nplLevel === 'good' ? 'from-emerald-500 to-teal-600' : nplLevel === 'warn' ? 'from-amber-500 to-orange-600' : 'from-rose-500 to-red-600';

  return (
    <MainLayout>
      <PageHeader
        title="Dashboard Monitoring KKR & NPL"
        description="Rangkuman pengolahan data Master Loan Filter — Cabang 143 (CAPEM TELIHAN BONTANG)"
      />

      {/* Controls bar */}
      <Card className="mb-6 overflow-hidden relative border-border/60">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
        <Activity className="absolute -right-6 -top-6 w-32 h-32 text-primary/5 rotate-12 pointer-events-none" strokeWidth={1.2} />
        <CardContent className="pt-6 relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4 w-full lg:w-auto">
            <div className="w-full sm:w-auto min-w-0">
              <p className="text-xs text-muted-foreground mb-1 font-medium uppercase tracking-wide">Periode Data</p>
              <Select value={selectedUpload} onValueChange={setSelectedUpload}>
                <SelectTrigger className="w-full sm:w-[300px] bg-background/80 backdrop-blur">
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
            <div className="flex items-center gap-3 p-3 rounded-lg border border-border/60 bg-background/70 backdrop-blur">
              <Switch id="ekstrakom-toggle" checked={includeEkstrakom} onCheckedChange={setIncludeEkstrakom} />
              <Label htmlFor="ekstrakom-toggle" className="cursor-pointer min-w-0 flex-1">
                <span className="text-sm font-medium block">Tampilkan Ekstrakomtabel</span>
                <span className="block text-[11px] text-muted-foreground break-words">
                  {includeEkstrakom ? 'Termasuk' : 'Disembunyikan'} • {fmtNum(stats.ekstraCount)} debitur — {fmtIDR(stats.ekstraBaki)}
                </span>
              </Label>
            </div>
          </div>
          {selectedUploadInfo && (
            <div className="lg:text-right text-xs text-muted-foreground">
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
          {/* Hero KPI Row — NPL focal */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className={cn(
              "lg:col-span-1 relative overflow-hidden rounded-xl p-5 sm:p-6 text-white shadow-lg bg-gradient-to-br",
              nplColor
            )}>
              <ShieldAlert className="absolute -right-4 -bottom-4 w-40 h-40 opacity-10 rotate-12" strokeWidth={1.2} />
              <Gauge className="absolute right-4 top-4 w-6 h-6 opacity-80" />
              <p className="text-xs uppercase tracking-wider opacity-90">Rasio NPL (KOL 3-5)</p>
              <p className="text-4xl sm:text-5xl font-bold mt-2 tracking-tight">{stats.nplRatio.toFixed(2)}<span className="text-2xl opacity-80">%</span></p>
              <div className="mt-4 space-y-1 text-xs opacity-95">
                <p className="break-words">NPL: <strong>{fmtIDR(stats.nplBaki)}</strong> dari {fmtIDR(stats.nplBaseBaki)}</p>
                <p>{fmtNum(stats.nplCount)} debitur ({stats.nplCountRatio.toFixed(2)}% dari {fmtNum(stats.nplBaseCount)})</p>
                <p className="pt-2 text-[10px] opacity-75">Basis: outstanding non-ekstrakomtabel</p>
              </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <KPICard icon={Users} label="Total Debitur" value={fmtNum(stats.totalDebitur)}
                sub={includeEkstrakom ? `+ ${fmtNum(stats.ekstraCount)} ekstrakom` : 'tanpa ekstrakom'}
                tint="blue" />
              <KPICard icon={Wallet} label="Total Outstanding" value={fmtIDR(stats.totalBaki)}
                sub={`Plafon ${fmtIDR(stats.totalPlafon)}`}
                tint="emerald" />
              <KPICard icon={AlertTriangle} label="Tunggakan Berjalan" value={fmtIDR(stats.totalTunggakan)}
                sub={`Pokok ${fmtIDR(stats.totalTungpk)} • Bunga ${fmtIDR(stats.totalTungbg)}`}
                tint="amber" />
              <KPICard icon={Percent} label="Rasio Tunggakan / OS" value={`${stats.tunggakanRatio.toFixed(2)}%`}
                sub={`DPK (KOL 2): ${fmtNum(stats.dpkCount)} • ${fmtIDR(stats.dpkBaki)}`}
                tint="rose" />
            </div>
          </div>

          {/* Quick health strip */}
          <Card className="mb-6 relative overflow-hidden border-border/60">
            <TrendingDown className="absolute -right-4 -top-4 w-28 h-28 text-primary/5 pointer-events-none" strokeWidth={1.2} />
            <CardContent className="pt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <HealthPill label="Lancar (KOL 1)" count={stats.lancarCount} amount={stats.lancarBaki} color="#22c55e" total={stats.totalBaki} />
              <HealthPill label="DPK (KOL 2)" count={stats.dpkCount} amount={stats.dpkBaki} color="#eab308" total={stats.totalBaki} />
              <HealthPill label="NPL (KOL 3-5)" count={stats.nplCount} amount={stats.nplBaki} color="#ef4444" total={stats.totalBaki} />
              <HealthPill label="Tunggakan Berjalan" count={stats.totalDebitur > 0 ? rows.filter(r => ((Number(r.tungpk)||0)+(Number(r.tungbg)||0))>0).length : 0} amount={stats.totalTunggakan} color="#f97316" total={stats.totalBaki} />
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            <Card className="relative overflow-hidden">
              <PieChart className="hidden" />
              <CardHeader>
                <CardTitle className="text-base">Komposisi Debitur per KOL</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={stats.kolData} dataKey="count" nameKey="name" outerRadius="70%" label={(e: any) => e.count}>
                      {stats.kolData.map((d) => (
                        <Cell key={d.kol} fill={KOL_COLOR[d.kol] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: any) => fmtNum(v as number)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
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
                  <BarChart data={stats.kolData} margin={{ left: 0, right: 8, top: 8, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="kol" tick={{ fontSize: 11 }} tickFormatter={(v) => `KOL ${kolDisplay(v)}`} />
                    <YAxis tick={{ fontSize: 10 }} width={50} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}jt`} />
                    <Tooltip formatter={(v: any) => fmtIDR(v as number)} labelFormatter={(l) => `KOL ${kolDisplay(l as number)}`} />
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
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={stats.prodData} layout="vertical" margin={{ left: 4, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1e6).toFixed(0)}jt`} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={90} />
                    <Tooltip formatter={(v: any) => fmtIDR(v as number)} labelFormatter={(l) => (stats.prodData.find((p) => p.name === l)?.fullName || l) as string} />
                    <Bar dataKey="baki" name="Outstanding" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Loan akan lunas */}
          <Card className="mb-6 border-border/60">
            <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CalendarClock className="w-4 h-4 text-primary" />
                <CardTitle className="text-base">Loan Akan Lunas</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Select value={lunasRange} onValueChange={(v: any) => setLunasRange(v)}>
                  <SelectTrigger className="w-[220px] h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bulan">Bulan data ({akanLunas.rangeLabel || '—'})</SelectItem>
                    <SelectItem value="3bulan">3 bulan ke depan</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 px-2 sm:px-0">
                <div className="rounded-lg border border-border/60 p-3 bg-muted/30">
                  <p className="text-[10px] uppercase text-muted-foreground">Periode</p>
                  <p className="text-sm font-semibold mt-1">{akanLunas.rangeLabel || '—'}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3 bg-muted/30">
                  <p className="text-[10px] uppercase text-muted-foreground">Jumlah Debitur</p>
                  <p className="text-sm font-semibold mt-1">{fmtNum(akanLunas.total)}</p>
                </div>
                <div className="rounded-lg border border-border/60 p-3 bg-muted/30 col-span-2 sm:col-span-1">
                  <p className="text-[10px] uppercase text-muted-foreground">Total Outstanding</p>
                  <p className="text-sm font-semibold mt-1">{fmtIDR(akanLunas.baki)}</p>
                </div>
              </div>
              <Table className="[&_th]:whitespace-nowrap [&_td]:whitespace-nowrap text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead>No Rekening</TableHead>
                    <TableHead>Nama Debitur</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead className="text-center">KOL</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead>AO</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {akanLunas.items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                        Tidak ada loan yang akan lunas pada periode ini.
                      </TableCell>
                    </TableRow>
                  ) : akanLunas.items.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{format(d._due, 'dd MMM yyyy', { locale: idLocale })}</TableCell>
                      <TableCell className="font-mono text-xs">{d.l0lnno}</TableCell>
                      <TableCell className="font-medium">{d.l0name}</TableCell>
                      <TableCell className="text-xs">{d.lytitl}</TableCell>
                      <TableCell className="text-center">
                        <Badge style={{ backgroundColor: KOL_COLOR[Number(d.kol) || 0] || '#94a3b8', color: 'white' }}>
                          {kolDisplay(d.kol)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{fmtIDR(Number(d.baki) || 0)}</TableCell>
                      <TableCell className="text-xs">{d.l0usid}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {akanLunas.items.length === 0 && rows.some(r => !r.date1) && (
                <p className="text-[11px] text-muted-foreground mt-3 px-2">
                  Pastikan kolom <strong>DATE1</strong> ada pada file MLF saat upload. Upload ulang data agar tanggal jatuh tempo tersimpan.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Baru Cair Bulan Berjalan */}
          <Card className="mb-6 border-border/60">
            <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <CardTitle className="text-base">Fasilitas Baru Cair Bulan Berjalan</CardTitle>
              </div>
              {selectedUploadInfo && (
                <p className="text-[11px] text-muted-foreground">
                  Periode: 01 {format(new Date(selectedUploadInfo.jobdate), 'MMM yyyy', { locale: idLocale })} – {format(new Date(selectedUploadInfo.jobdate), 'dd MMM yyyy', { locale: idLocale })}
                </p>
              )}
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {!baruCair.available ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Belum ada baseline MLF sebelum awal bulan {selectedUploadInfo ? format(new Date(selectedUploadInfo.jobdate), 'MMMM yyyy', { locale: idLocale }) : ''}. Upload MLF bulan sebelumnya untuk mendeteksi fasilitas baru cair.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 px-2 sm:px-0">
                    <div className="rounded-lg border border-emerald-500/30 p-3 bg-emerald-500/5">
                      <p className="text-[10px] uppercase text-muted-foreground">Jumlah Fasilitas</p>
                      <p className="text-sm font-semibold mt-1">{fmtNum(baruCair.items.length)}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-500/30 p-3 bg-emerald-500/5">
                      <p className="text-[10px] uppercase text-muted-foreground">Total Plafon</p>
                      <p className="text-sm font-semibold mt-1">{fmtIDR(baruCair.plafon)}</p>
                    </div>
                    <div className="rounded-lg border border-emerald-500/30 p-3 bg-emerald-500/5 col-span-2 sm:col-span-1">
                      <p className="text-[10px] uppercase text-muted-foreground">Total Outstanding</p>
                      <p className="text-sm font-semibold mt-1">{fmtIDR(baruCair.baki)}</p>
                    </div>
                  </div>
                  <Table className="[&_th]:whitespace-nowrap [&_td]:whitespace-nowrap text-xs sm:text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead>No Rekening</TableHead>
                        <TableHead>Nama Debitur</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead className="text-center">KOL</TableHead>
                        <TableHead className="text-right">Plafon</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead>AO</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {baruCair.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                            Tidak ada fasilitas baru cair pada periode ini.
                          </TableCell>
                        </TableRow>
                      ) : baruCair.items.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-xs">{d.l0lnno}</TableCell>
                          <TableCell className="font-medium">{d.l0name}</TableCell>
                          <TableCell className="text-xs">{d.lytitl}</TableCell>
                          <TableCell className="text-center">
                            <Badge style={{ backgroundColor: KOL_COLOR[Number(d.kol) || 0] || '#94a3b8', color: 'white' }}>
                              {kolDisplay(d.kol)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{fmtIDR(Number(d.pla) || 0)}</TableCell>
                          <TableCell className="text-right">{fmtIDR(Number(d.baki) || 0)}</TableCell>
                          <TableCell className="text-xs">{d.l0usid}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {monthBaselineInfo && (
                    <p className="text-[11px] text-muted-foreground mt-3 px-2">
                      Baseline pembanding: MLF <strong>{format(new Date(monthBaselineInfo.jobdate), 'dd MMM yyyy', { locale: idLocale })}</strong> (upload terakhir sebelum awal bulan).
                    </p>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Baru Lunas / Ditutup */}
          <Card className="mb-6 border-border/60">
            <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-base">Fasilitas Ditutup / Dilunasi Bulan Berjalan</CardTitle>
              </div>
              {selectedUploadInfo && (
                <p className="text-[11px] text-muted-foreground">
                  Periode: 01 {format(new Date(selectedUploadInfo.jobdate), 'MMM yyyy', { locale: idLocale })} – {format(new Date(selectedUploadInfo.jobdate), 'dd MMM yyyy', { locale: idLocale })}
                </p>
              )}
            </CardHeader>
            <CardContent className="px-2 sm:px-6">
              {!baruLunas.available ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Belum ada baseline MLF sebelum awal bulan {selectedUploadInfo ? format(new Date(selectedUploadInfo.jobdate), 'MMMM yyyy', { locale: idLocale }) : ''}. Upload MLF bulan sebelumnya untuk mendeteksi fasilitas yang ditutup.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 mb-4 px-2 sm:px-0">
                    <div className="rounded-lg border border-blue-500/30 p-3 bg-blue-500/5">
                      <p className="text-[10px] uppercase text-muted-foreground">Jumlah Fasilitas</p>
                      <p className="text-sm font-semibold mt-1">{fmtNum(baruLunas.items.length)}</p>
                    </div>
                    <div className="rounded-lg border border-blue-500/30 p-3 bg-blue-500/5">
                      <p className="text-[10px] uppercase text-muted-foreground">OS Terakhir Sebelum Lunas</p>
                      <p className="text-sm font-semibold mt-1">{fmtIDR(baruLunas.baki)}</p>
                    </div>
                  </div>
                  <Table className="[&_th]:whitespace-nowrap [&_td]:whitespace-nowrap text-xs sm:text-sm">
                    <TableHeader>
                      <TableRow>
                        <TableHead>No Rekening</TableHead>
                        <TableHead>Nama Debitur</TableHead>
                        <TableHead>Produk</TableHead>
                        <TableHead className="text-center">KOL Terakhir</TableHead>
                        <TableHead className="text-right">Plafon</TableHead>
                        <TableHead className="text-right">OS Terakhir</TableHead>
                        <TableHead>AO</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {baruLunas.items.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                            Tidak ada fasilitas yang ditutup pada periode ini.
                          </TableCell>
                        </TableRow>
                      ) : baruLunas.items.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="font-mono text-xs">{d.l0lnno}</TableCell>
                          <TableCell className="font-medium">{d.l0name}</TableCell>
                          <TableCell className="text-xs">{d.lytitl}</TableCell>
                          <TableCell className="text-center">
                            <Badge style={{ backgroundColor: KOL_COLOR[Number(d.kol) || 0] || '#94a3b8', color: 'white' }}>
                              {kolDisplay(d.kol)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{fmtIDR(Number(d.pla) || 0)}</TableCell>
                          <TableCell className="text-right">{fmtIDR(Number(d.baki) || 0)}</TableCell>
                          <TableCell className="text-xs">{d.l0usid}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              )}
            </CardContent>
          </Card>



          {/* AO breakdown */}
          {stats.aoData.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-base">Ringkasan per AO / Petugas</CardTitle>
              </CardHeader>
              <CardContent className="px-2 sm:px-6">
                <Table className="[&_th]:whitespace-nowrap [&_td]:whitespace-nowrap text-xs sm:text-sm">
                  <TableHeader>
                    <TableRow>
                      <TableHead>AO</TableHead>
                      <TableHead className="text-right">Debitur</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-right">Tunggakan</TableHead>
                      <TableHead className="text-right">NPL</TableHead>
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
                        <TableCell className="text-right">
                          <Badge variant={a.nplRatio < 2 ? 'secondary' : a.nplRatio < 5 ? 'default' : 'destructive'}>
                            {a.nplRatio.toFixed(2)}%
                          </Badge>
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
            <CardContent className="px-2 sm:px-6">
              <Table className="[&_th]:whitespace-nowrap [&_td]:whitespace-nowrap text-xs sm:text-sm">
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
                            {kolDisplay(d.kol)}
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

const tintMap = {
  blue: { bg: 'from-blue-500/10 to-blue-500/5', icon: 'bg-blue-500/15 text-blue-600', silhouette: 'text-blue-500' },
  emerald: { bg: 'from-emerald-500/10 to-emerald-500/5', icon: 'bg-emerald-500/15 text-emerald-600', silhouette: 'text-emerald-500' },
  amber: { bg: 'from-amber-500/10 to-amber-500/5', icon: 'bg-amber-500/15 text-amber-600', silhouette: 'text-amber-500' },
  rose: { bg: 'from-rose-500/10 to-rose-500/5', icon: 'bg-rose-500/15 text-rose-600', silhouette: 'text-rose-500' },
} as const;

const KPICard: React.FC<{ icon: React.ElementType; label: string; value: string; sub?: string; tint: keyof typeof tintMap }> = ({ icon: Icon, label, value, sub, tint }) => {
  const t = tintMap[tint];
  return (
    <Card className={cn('relative overflow-hidden border-border/60 bg-gradient-to-br', t.bg)}>
      <Icon className={cn('absolute -right-3 -bottom-3 w-24 h-24 opacity-[0.08] rotate-12 pointer-events-none', t.silhouette)} strokeWidth={1.3} />
      <CardContent className="pt-5 pb-5 relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-muted-foreground mb-1 font-medium uppercase tracking-wide">{label}</p>
            <p className="text-base sm:text-xl font-bold break-words leading-tight">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-1 break-words">{sub}</p>}
          </div>
          <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', t.icon)}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const HealthPill: React.FC<{ label: string; count: number; amount: number; color: string; total: number }> = ({ label, count, amount, color, total }) => {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-xs font-bold" style={{ color }}>{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
      </div>
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold">{fmtNum(count)} debitur</span>
        <span className="text-muted-foreground">{fmtIDR(amount)}</span>
      </div>
    </div>
  );
};

export default MonitoringDashboardPage;
