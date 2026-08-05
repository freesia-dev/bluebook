import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useMLFUploads, useMLFDataAll, type MLFRow } from '@/hooks/use-mlf-data';
import { useLoanSimulations, PIPELINE_STAGES, PIPELINE_LABELS } from '@/hooks/use-loan-calc';
import { fmtIDR, fmtNum, KOL_LABEL, KOL_COLOR, kolDisplay } from '@/lib/mlf-utils';
import { getUnit } from '@/lib/produktif-utils';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { ArrowDownRight, ArrowUpRight, Banknote, FileSpreadsheet, FileText, Gauge, Layers, ShieldAlert, TrendingUp, Users, Wallet } from 'lucide-react';
import { exportExecutiveExcel, exportExecutivePDF } from '@/lib/executive-report';

export const BRANCHES = [
  { code: '008', name: 'Kantor Cabang Bontang' },
  { code: '118', name: 'Capem Marangkayu' },
  { code: '143', name: 'Capem Telihan' },
  { code: '185', name: 'KCP Lok Tuan' },
];
const branchName = (code?: string | null) =>
  BRANCHES.find((b) => b.code === code)?.name || code || 'Lainnya';

const num = (v: any) => Number(v) || 0;
const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
const fmtPct = (n: number) => `${n.toFixed(2)}%`;

export interface ExecutiveKPI {
  periode: string;
  pembanding: string | null;
  cabang: string;
  totalDebitur: number;
  totalBaki: number;
  totalPlafon: number;
  totalTunggakan: number;
  totalTungpk: number;
  totalTungbg: number;
  nplBaki: number;
  nplCount: number;
  nplRatio: number;
  kkrBaki: number;
  kkrCount: number;
  kkrRatio: number;
  lancarBaki: number;
  lancarRatio: number;
  dpkBaki: number;
  dpkCount: number;
  ekstraCount: number;
  ekstraBaki: number;
  kolData: { kol: number; name: string; count: number; baki: number; tunggakan: number; share: number }[];
  growthBaki: number;
  growthBakiPct: number;
  growthDebitur: number;
  cairCount: number;
  cairBaki: number;
  lunasCount: number;
  lunasBaki: number;
  nplPrevRatio: number | null;
  branchData: { code: string; name: string; count: number; baki: number; npl: number; nplRatio: number; tunggakan: number }[];
  produkData: { name: string; count: number; baki: number }[];
  unitData: { unit: string; count: number; baki: number; npl: number }[];
  aoData: { ao: string; count: number; baki: number; tunggakan: number; nplRatio: number }[];
  topDebitur: { nama: string; loan: string; kol: number; baki: number; tunggakan: number }[];
  pipeline: { stage: string; label: string; count: number; plafon: number }[];
  pipelineTotal: { count: number; plafon: number; cair: number; cairPlafon: number; batal: number; konversi: number };
}

const KpiCard: React.FC<{
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  delta?: number | null;
  deltaSuffix?: string;
  invertDelta?: boolean;
}> = ({ icon: Icon, label, value, sub, tone = 'primary', delta = null, deltaSuffix = '%', invertDelta }) => {
  const tones: Record<string, string> = {
    primary: 'from-primary/15 to-primary/5 text-primary',
    success: 'from-emerald-500/15 to-emerald-500/5 text-emerald-600',
    warning: 'from-amber-500/15 to-amber-500/5 text-amber-600',
    danger: 'from-red-500/15 to-red-500/5 text-red-600',
    info: 'from-sky-500/15 to-sky-500/5 text-sky-600',
  };
  const good = delta === null ? null : invertDelta ? delta <= 0 : delta >= 0;
  return (
    <Card className="overflow-hidden border-border/60">
      <CardContent className={`p-4 bg-gradient-to-br ${tones[tone]}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">{label}</p>
            <p className="text-2xl font-bold text-foreground mt-1 leading-tight break-words">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="w-10 h-10 rounded-xl bg-background/70 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
        </div>
        {delta !== null && (
          <div className={`mt-3 inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2 py-0.5 ${good ? 'bg-emerald-500/15 text-emerald-700' : 'bg-red-500/15 text-red-700'}`}>
            {delta >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {delta >= 0 ? '+' : ''}{delta.toFixed(2)}{deltaSuffix} vs periode lalu
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const ExecutiveDashboardPage: React.FC = () => {
  const { data: uploads = [] } = useMLFUploads();
  const [uploadId, setUploadId] = useState<string | undefined>();
  const [branch, setBranch] = useState<string>('ALL');
  const { data: simulations = [] } = useLoanSimulations();

  useEffect(() => {
    if (!uploadId && uploads.length > 0) setUploadId(uploads[0].id);
  }, [uploads, uploadId]);

  const current = uploads.find((u) => u.id === uploadId);

  // Pembanding: upload terakhir sebelum awal bulan periode berjalan (fallback: upload sebelumnya)
  const baseline = useMemo(() => {
    if (!current) return undefined;
    const sel = new Date(current.jobdate);
    const monthStart = new Date(sel.getFullYear(), sel.getMonth(), 1);
    const earlier = uploads.filter((u) => new Date(u.jobdate) < sel);
    return earlier.find((u) => new Date(u.jobdate) < monthStart) || earlier[0];
  }, [uploads, current]);

  const { data: allRows = [], isLoading } = useMLFDataAll(uploadId);
  const { data: baseRowsAll = [] } = useMLFDataAll(baseline?.id);

  const filterBranch = (rows: MLFRow[]) => (branch === 'ALL' ? rows : rows.filter((r) => r.brcd === branch));

  const kpi = useMemo<ExecutiveKPI>(() => {
    const scoped = filterBranch(allRows);
    const rows = scoped.filter((r) => num(r.kol) !== 0);
    const ekstra = scoped.filter((r) => num(r.kol) === 0);
    const baseScoped = filterBranch(baseRowsAll).filter((r) => num(r.kol) !== 0);

    const sum = (arr: MLFRow[], f: (r: MLFRow) => number) => arr.reduce((s, r) => s + f(r), 0);
    const totalBaki = sum(rows, (r) => num(r.baki));
    const totalPlafon = sum(rows, (r) => num(r.pla));
    const totalTungpk = sum(rows, (r) => num(r.tungpk));
    const totalTungbg = sum(rows, (r) => num(r.tungbg));

    const npl = rows.filter((r) => num(r.kol) >= 3);
    const kkr = rows.filter((r) => num(r.kol) >= 2);
    const lancar = rows.filter((r) => num(r.kol) === 1);
    const dpk = rows.filter((r) => num(r.kol) === 2);

    const kolMap = new Map<number, { count: number; baki: number; tunggakan: number }>();
    rows.forEach((r) => {
      const k = num(r.kol);
      const cur = kolMap.get(k) || { count: 0, baki: 0, tunggakan: 0 };
      cur.count += 1;
      cur.baki += num(r.baki);
      cur.tunggakan += num(r.tungpk) + num(r.tungbg);
      kolMap.set(k, cur);
    });
    const kolData = Array.from(kolMap.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([k, v]) => ({ kol: k, name: `KOL ${kolDisplay(k)} · ${KOL_LABEL[k] || ''}`, ...v, share: pct(v.baki, totalBaki) }));

    // Growth & mutasi fasilitas
    const baseBaki = sum(baseScoped, (r) => num(r.baki));
    const baseKeys = new Set(baseScoped.map((r) => r.l0lnno || ''));
    const curKeys = new Set(rows.map((r) => r.l0lnno || ''));
    const cair = rows.filter((r) => r.l0lnno && !baseKeys.has(r.l0lnno));
    const lunas = baseScoped.filter((r) => r.l0lnno && !curKeys.has(r.l0lnno));
    const baseNplBaki = sum(baseScoped.filter((r) => num(r.kol) >= 3), (r) => num(r.baki));

    // Cabang
    const brMap = new Map<string, { count: number; baki: number; npl: number; tunggakan: number }>();
    rows.forEach((r) => {
      const c = r.brcd || '-';
      const cur = brMap.get(c) || { count: 0, baki: 0, npl: 0, tunggakan: 0 };
      cur.count += 1;
      cur.baki += num(r.baki);
      cur.tunggakan += num(r.tungpk) + num(r.tungbg);
      if (num(r.kol) >= 3) cur.npl += num(r.baki);
      brMap.set(c, cur);
    });
    const branchData = Array.from(brMap.entries())
      .map(([code, v]) => ({ code, name: branchName(code), ...v, nplRatio: pct(v.npl, v.baki) }))
      .sort((a, b) => b.baki - a.baki);

    // Produk
    const prodMap = new Map<string, { count: number; baki: number }>();
    rows.forEach((r) => {
      const p = r.lytitl || 'Lainnya';
      const cur = prodMap.get(p) || { count: 0, baki: 0 };
      cur.count += 1;
      cur.baki += num(r.baki);
      prodMap.set(p, cur);
    });
    const produkData = Array.from(prodMap.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.baki - a.baki)
      .slice(0, 8);

    // Unit (Telihan/Meranti) — relevan untuk cabang 143
    const unitMap = new Map<string, { count: number; baki: number; npl: number }>();
    rows.filter((r) => r.brcd === '143').forEach((r) => {
      const u = getUnit(r);
      const label = u === 'telihan' ? 'Telihan' : u === 'meranti' ? 'Meranti' : 'Tanpa Unit';
      const cur = unitMap.get(label) || { count: 0, baki: 0, npl: 0 };
      cur.count += 1;
      cur.baki += num(r.baki);
      if (num(r.kol) >= 3) cur.npl += num(r.baki);
      unitMap.set(label, cur);
    });
    const unitData = Array.from(unitMap.entries()).map(([unit, v]) => ({ unit, ...v }));

    // AO
    const aoMap = new Map<string, { count: number; baki: number; tunggakan: number; npl: number }>();
    rows.forEach((r) => {
      const ao = r.l0usid || '-';
      const cur = aoMap.get(ao) || { count: 0, baki: 0, tunggakan: 0, npl: 0 };
      cur.count += 1;
      cur.baki += num(r.baki);
      cur.tunggakan += num(r.tungpk) + num(r.tungbg);
      if (num(r.kol) >= 3) cur.npl += num(r.baki);
      aoMap.set(ao, cur);
    });
    const aoData = Array.from(aoMap.entries())
      .map(([ao, v]) => ({ ao, count: v.count, baki: v.baki, tunggakan: v.tunggakan, nplRatio: pct(v.npl, v.baki) }))
      .sort((a, b) => b.baki - a.baki)
      .slice(0, 10);

    const topDebitur = rows
      .map((r) => ({
        nama: r.l0name || '-',
        loan: r.l0lnno || '-',
        kol: num(r.kol),
        baki: num(r.baki),
        tunggakan: num(r.tungpk) + num(r.tungbg),
      }))
      .filter((r) => r.tunggakan > 0)
      .sort((a, b) => b.tunggakan - a.tunggakan)
      .slice(0, 10);

    // Pipeline kredit
    const pipeline = PIPELINE_STAGES.map((stage) => {
      const items = simulations.filter((s) => (s.pipeline_status || 'simulasi') === stage);
      return {
        stage,
        label: PIPELINE_LABELS[stage],
        count: items.length,
        plafon: items.reduce((s, i) => s + num(i.plafon), 0),
      };
    });
    const batal = simulations.filter((s) => s.pipeline_status === 'batal');
    const cairPipe = pipeline.find((p) => p.stage === 'cair')!;
    const aktif = simulations.filter((s) => s.pipeline_status !== 'batal');

    return {
      periode: current ? format(new Date(current.jobdate), 'dd MMMM yyyy', { locale: idLocale }) : '-',
      pembanding: baseline ? format(new Date(baseline.jobdate), 'dd MMMM yyyy', { locale: idLocale }) : null,
      cabang: branch === 'ALL' ? 'Seluruh Cabang' : branchName(branch),
      totalDebitur: rows.length,
      totalBaki,
      totalPlafon,
      totalTunggakan: totalTungpk + totalTungbg,
      totalTungpk,
      totalTungbg,
      nplBaki: sum(npl, (r) => num(r.baki)),
      nplCount: npl.length,
      nplRatio: pct(sum(npl, (r) => num(r.baki)), totalBaki),
      kkrBaki: sum(kkr, (r) => num(r.baki)),
      kkrCount: kkr.length,
      kkrRatio: pct(sum(kkr, (r) => num(r.baki)), totalBaki),
      lancarBaki: sum(lancar, (r) => num(r.baki)),
      lancarRatio: pct(sum(lancar, (r) => num(r.baki)), totalBaki),
      dpkBaki: sum(dpk, (r) => num(r.baki)),
      dpkCount: dpk.length,
      ekstraCount: ekstra.length,
      ekstraBaki: sum(ekstra, (r) => num(r.baki)),
      kolData,
      growthBaki: totalBaki - baseBaki,
      growthBakiPct: baseBaki > 0 ? ((totalBaki - baseBaki) / baseBaki) * 100 : 0,
      growthDebitur: rows.length - baseScoped.length,
      cairCount: cair.length,
      cairBaki: sum(cair, (r) => num(r.baki)),
      lunasCount: lunas.length,
      lunasBaki: sum(lunas, (r) => num(r.baki)),
      nplPrevRatio: baseScoped.length ? pct(baseNplBaki, baseBaki) : null,
      branchData,
      produkData,
      unitData,
      aoData,
      topDebitur,
      pipeline,
      pipelineTotal: {
        count: aktif.length,
        plafon: aktif.reduce((s, i) => s + num(i.plafon), 0),
        cair: cairPipe.count,
        cairPlafon: cairPipe.plafon,
        batal: batal.length,
        konversi: pct(cairPipe.count, aktif.length),
      },
    };
  }, [allRows, baseRowsAll, branch, simulations, current, baseline]);

  const nplDelta = kpi.nplPrevRatio === null ? null : kpi.nplRatio - kpi.nplPrevRatio;

  return (
    <MainLayout>
      <PageHeader
        title="Executive Dashboard"
        description="Ringkasan KPI portofolio kredit, kualitas aset, dan pipeline — khusus Pemimpin."
      />

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <Select value={uploadId} onValueChange={setUploadId}>
          <SelectTrigger className="w-[260px]"><SelectValue placeholder="Pilih periode data (MLF)" /></SelectTrigger>
          <SelectContent>
            {uploads.map((u) => (
              <SelectItem key={u.id} value={u.id}>
                {format(new Date(u.jobdate), 'dd MMM yyyy', { locale: idLocale })} · {fmtNum(u.total_rows)} baris
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={branch} onValueChange={setBranch}>
          <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Seluruh Cabang</SelectItem>
            {BRANCHES.map((b) => (
              <SelectItem key={b.code} value={b.code}>{b.code} · {b.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex-1" />
        <Button variant="outline" onClick={() => exportExecutiveExcel(kpi)} className="gap-2">
          <FileSpreadsheet className="w-4 h-4" /> Export Excel
        </Button>
        <Button onClick={() => exportExecutivePDF(kpi)} className="gap-2">
          <FileText className="w-4 h-4" /> Export PDF
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-muted-foreground">
        <Badge variant="outline">Periode: {kpi.periode}</Badge>
        <Badge variant="outline">{kpi.cabang}</Badge>
        {kpi.pembanding && <Badge variant="outline">Pembanding: {kpi.pembanding}</Badge>}
        {isLoading && <span>Memuat data…</span>}
      </div>

      {/* KPI utama */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <KpiCard icon={Wallet} label="Outstanding (Baki Debet)" value={fmtIDR(kpi.totalBaki)} sub={`Plafon ${fmtIDR(kpi.totalPlafon)}`} delta={kpi.growthBakiPct} />
        <KpiCard icon={Users} label="Total Debitur" value={fmtNum(kpi.totalDebitur)} sub={`${kpi.growthDebitur >= 0 ? '+' : ''}${fmtNum(kpi.growthDebitur)} vs periode lalu`} tone="info" />
        <KpiCard icon={ShieldAlert} label="NPL (KOL 3–5)" value={fmtPct(kpi.nplRatio)} sub={`${fmtNum(kpi.nplCount)} debitur · ${fmtIDR(kpi.nplBaki)}`} tone={kpi.nplRatio > 5 ? 'danger' : 'success'} delta={nplDelta} deltaSuffix=" pp" invertDelta />
        <KpiCard icon={Gauge} label="KKR (KOL 2–5)" value={fmtPct(kpi.kkrRatio)} sub={`${fmtNum(kpi.kkrCount)} debitur · ${fmtIDR(kpi.kkrBaki)}`} tone={kpi.kkrRatio > 10 ? 'warning' : 'success'} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard icon={TrendingUp} label="Pertumbuhan Kredit" value={fmtIDR(kpi.growthBaki)} sub={`${fmtPct(kpi.growthBakiPct)} sejak ${kpi.pembanding || '-'}`} tone={kpi.growthBaki >= 0 ? 'success' : 'danger'} />
        <KpiCard icon={Banknote} label="Fasilitas Baru Cair" value={fmtNum(kpi.cairCount)} sub={fmtIDR(kpi.cairBaki)} tone="success" />
        <KpiCard icon={Layers} label="Fasilitas Lunas/Tutup" value={fmtNum(kpi.lunasCount)} sub={fmtIDR(kpi.lunasBaki)} tone="info" />
        <KpiCard icon={ShieldAlert} label="Total Tunggakan" value={fmtIDR(kpi.totalTunggakan)} sub={`Pokok ${fmtIDR(kpi.totalTungpk)} · Bunga ${fmtIDR(kpi.totalTungbg)}`} tone="warning" />
      </div>

      {/* Kolektibilitas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2"><CardTitle className="text-base">Komposisi Kolektibilitas</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[240px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={kpi.kolData} dataKey="baki" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={2}>
                    {kpi.kolData.map((d) => <Cell key={d.kol} fill={KOL_COLOR[d.kol]} />)}
                  </Pie>
                  <RTooltip formatter={(v: any) => fmtIDR(Number(v))} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1.5 mt-2">
              {kpi.kolData.map((d) => (
                <div key={d.kol} className="flex items-center gap-2 text-xs">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: KOL_COLOR[d.kol] }} />
                  <span className="flex-1 truncate">{d.name}</span>
                  <span className="font-semibold">{d.share.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2"><CardTitle className="text-base">Rincian Kolektibilitas</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kolektibilitas</TableHead>
                  <TableHead className="text-right">Debitur</TableHead>
                  <TableHead className="text-right">Baki Debet</TableHead>
                  <TableHead className="text-right">Tunggakan</TableHead>
                  <TableHead className="text-right">Porsi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpi.kolData.map((d) => (
                  <TableRow key={d.kol}>
                    <TableCell>
                      <Badge style={{ background: KOL_COLOR[d.kol] }} className="text-white">{d.name}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{fmtNum(d.count)}</TableCell>
                    <TableCell className="text-right font-medium">{fmtIDR(d.baki)}</TableCell>
                    <TableCell className="text-right">{fmtIDR(d.tunggakan)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Progress value={d.share} className="w-16 h-1.5" />
                        <span className="text-xs font-semibold w-12 text-right">{d.share.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-semibold bg-muted/40">
                  <TableCell>Total (tanpa ekstrakomtabel)</TableCell>
                  <TableCell className="text-right">{fmtNum(kpi.totalDebitur)}</TableCell>
                  <TableCell className="text-right">{fmtIDR(kpi.totalBaki)}</TableCell>
                  <TableCell className="text-right">{fmtIDR(kpi.totalTunggakan)}</TableCell>
                  <TableCell className="text-right">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground mt-2">
              Ekstrakomtabel: {fmtNum(kpi.ekstraCount)} rekening · {fmtIDR(kpi.ekstraBaki)} (tidak dihitung dalam rasio).
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Loan Pipeline (Simulasi → Cair)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            {kpi.pipeline.map((p) => (
              <div key={p.stage} className="rounded-xl border border-border/60 p-3 bg-muted/30">
                <p className="text-xs text-muted-foreground">{p.label}</p>
                <p className="text-xl font-bold">{fmtNum(p.count)}</p>
                <p className="text-xs text-muted-foreground truncate">{fmtIDR(p.plafon)}</p>
              </div>
            ))}
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpi.pipeline}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="label" fontSize={11} />
                <YAxis fontSize={11} tickFormatter={(v) => fmtNum(Number(v))} />
                <RTooltip formatter={(v: any, n: any) => (n === 'plafon' ? fmtIDR(Number(v)) : fmtNum(Number(v)))} />
                <Legend />
                <Bar dataKey="count" name="Jumlah Pengajuan" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap gap-4 text-sm mt-3">
            <span>Total pengajuan aktif: <b>{fmtNum(kpi.pipelineTotal.count)}</b> ({fmtIDR(kpi.pipelineTotal.plafon)})</span>
            <span>Realisasi cair: <b>{fmtNum(kpi.pipelineTotal.cair)}</b> ({fmtIDR(kpi.pipelineTotal.cairPlafon)})</span>
            <span>Dibatalkan: <b>{fmtNum(kpi.pipelineTotal.batal)}</b></span>
            <span>Konversi: <b>{fmtPct(kpi.pipelineTotal.konversi)}</b></span>
          </div>
        </CardContent>
      </Card>

      {/* Cabang & produk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Kinerja per Cabang</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cabang</TableHead>
                  <TableHead className="text-right">Debitur</TableHead>
                  <TableHead className="text-right">Baki Debet</TableHead>
                  <TableHead className="text-right">NPL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpi.branchData.map((b) => (
                  <TableRow key={b.code}>
                    <TableCell className="font-medium">{b.code} · {b.name}</TableCell>
                    <TableCell className="text-right">{fmtNum(b.count)}</TableCell>
                    <TableCell className="text-right">{fmtIDR(b.baki)}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={b.nplRatio > 5 ? 'destructive' : 'secondary'}>{fmtPct(b.nplRatio)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {kpi.unitData.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Capem Telihan per Unit</p>
                <div className="grid grid-cols-3 gap-2">
                  {kpi.unitData.map((u) => (
                    <div key={u.unit} className="rounded-lg border p-2">
                      <p className="text-xs text-muted-foreground">{u.unit}</p>
                      <p className="text-sm font-bold">{fmtNum(u.count)} debitur</p>
                      <p className="text-xs truncate">{fmtIDR(u.baki)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Portofolio per Produk (Top 8)</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={kpi.produkData} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" fontSize={10} tickFormatter={(v) => `${(Number(v) / 1e9).toFixed(1)}M`} />
                  <YAxis type="category" dataKey="name" width={130} fontSize={10} />
                  <RTooltip formatter={(v: any) => fmtIDR(Number(v))} />
                  <Bar dataKey="baki" name="Baki Debet" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AO & top tunggakan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">Kinerja Account Officer</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>AO</TableHead>
                  <TableHead className="text-right">Debitur</TableHead>
                  <TableHead className="text-right">Baki Debet</TableHead>
                  <TableHead className="text-right">Tunggakan</TableHead>
                  <TableHead className="text-right">NPL</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpi.aoData.map((a) => (
                  <TableRow key={a.ao}>
                    <TableCell className="font-medium">{a.ao}</TableCell>
                    <TableCell className="text-right">{fmtNum(a.count)}</TableCell>
                    <TableCell className="text-right">{fmtIDR(a.baki)}</TableCell>
                    <TableCell className="text-right">{fmtIDR(a.tunggakan)}</TableCell>
                    <TableCell className="text-right">{fmtPct(a.nplRatio)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-base">10 Tunggakan Terbesar</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Debitur</TableHead>
                  <TableHead>KOL</TableHead>
                  <TableHead className="text-right">Baki Debet</TableHead>
                  <TableHead className="text-right">Tunggakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {kpi.topDebitur.map((d) => (
                  <TableRow key={d.loan}>
                    <TableCell>
                      <div className="font-medium truncate max-w-[180px]">{d.nama}</div>
                      <div className="text-xs text-muted-foreground">{d.loan}</div>
                    </TableCell>
                    <TableCell>
                      <Badge style={{ background: KOL_COLOR[d.kol] }} className="text-white">{kolDisplay(d.kol)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{fmtIDR(d.baki)}</TableCell>
                    <TableCell className="text-right font-semibold text-red-600">{fmtIDR(d.tunggakan)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default ExecutiveDashboardPage;
