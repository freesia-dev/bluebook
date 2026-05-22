import React, { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuditReport, AuditReport } from '@/hooks/use-security-audit';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Shield, Calendar, AlertCircle, Flag, CheckCircle2, FileSpreadsheet, Printer, ExternalLink } from 'lucide-react';
import { format, eachDayOfInterval, parseISO, startOfMonth, endOfMonth, addMonths, isSameDay } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import logoImage from '@/assets/logo_bluebook.png';

const SHIFT_LABEL: Record<string, string> = { pagi: 'Pagi', sore: 'Sore', malam: 'Malam' };

const AuditPublicPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useAuditReport(token);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <div className="text-sm text-muted-foreground">Memuat rekap audit...</div>
        </div>
      </div>
    );
  }

  if (error || !data || (data as any).error) {
    const msg = (data as any)?.error || (error as any)?.message || 'Link tidak valid';
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <Card className="max-w-md p-8 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-destructive mb-3" />
          <h1 className="text-xl font-bold mb-2">Akses Ditolak</h1>
          <p className="text-muted-foreground text-sm">{msg}</p>
          <p className="text-xs text-muted-foreground mt-4">
            Hubungi admin Bluebook Telihan untuk mendapatkan link audit baru.
          </p>
        </Card>
      </div>
    );
  }

  const report = data as AuditReport;
  return <AuditContent report={report} />;
};

const AuditContent: React.FC<{ report: AuditReport }> = ({ report }) => {
  const periodeDari = parseISO(report.periode_dari);
  const periodeSampai = parseISO(report.periode_sampai);

  const stats = useMemo(() => {
    const totalShift = report.shifts.length;
    const totalKejadian = report.entries.filter((e) => e.jenis === 'kejadian').length;
    const totalInsiden = report.entries.filter((e) => e.is_insiden).length;
    const uniqueDates = new Set(report.shifts.map((s) => s.tanggal));
    const signedDates = new Set(
      report.shifts.filter((s) => !!s.ttd_pimpinan_at).map((s) => s.tanggal),
    );
    const compliance = uniqueDates.size > 0 ? Math.round((signedDates.size / uniqueDates.size) * 100) : 0;
    return { totalShift, totalKejadian, totalInsiden, hariTercatat: uniqueDates.size, compliance };
  }, [report]);

  const exportCSV = () => {
    const rows = [
      ['Tanggal', 'Shift', 'Petugas', 'Jam Mulai', 'Jam Selesai', 'Status', 'Lembur', 'TTD Pimpinan', 'Tgl TTD'],
      ...report.shifts.map((s) => [
        s.tanggal,
        SHIFT_LABEL[s.shift] || s.shift,
        s.nama_petugas,
        s.jam_mulai ? format(new Date(s.jam_mulai), 'HH:mm') : '',
        s.jam_selesai ? format(new Date(s.jam_selesai), 'HH:mm') : '',
        s.status,
        s.is_lembur ? 'Ya' : 'Tidak',
        s.ttd_pimpinan_nama || '',
        s.ttd_pimpinan_at ? format(new Date(s.ttd_pimpinan_at), 'yyyy-MM-dd HH:mm') : '',
      ]),
      [],
      ['REKAP KEJADIAN'],
      ['Tanggal', 'Shift', 'Petugas', 'Jam', 'Insiden', 'Kejadian'],
      ...report.entries
        .filter((e) => e.jenis === 'kejadian')
        .map((e) => [
          e.tanggal,
          SHIFT_LABEL[e.shift] || e.shift,
          e.nama_petugas,
          format(new Date(e.waktu_kejadian), 'HH:mm'),
          e.is_insiden ? 'YA' : '',
          e.kejadian.replace(/"/g, '""'),
        ]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c ?? '')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-log-security_${report.periode_dari}_${report.periode_sampai}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900 text-white print:bg-white print:text-black">
        <div className="max-w-7xl mx-auto px-6 py-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoImage} alt="Bluebook" className="w-12 h-12 object-contain bg-white rounded p-1" />
            <div>
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <h1 className="text-lg font-bold">Audit Log Security</h1>
              </div>
              <p className="text-xs text-white/80 print:text-slate-600">
                Bluebook Telihan · KCP Telihan · Bank Kaltimtara
              </p>
            </div>
          </div>
          <div className="text-right text-xs">
            <div>Periode: <strong>{format(periodeDari, 'dd MMM yyyy', { locale: idLocale })} – {format(periodeSampai, 'dd MMM yyyy', { locale: idLocale })}</strong></div>
            <div className="text-white/70 print:text-slate-600">
              Dibuat oleh {report.created_by_nama || '-'} · berlaku s.d. {format(parseISO(report.expires_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <StatCard label="Hari Tercatat" value={stats.hariTercatat} icon={Calendar} color="blue" />
          <StatCard label="Total Shift" value={stats.totalShift} icon={Shield} color="slate" />
          <StatCard label="Total Kejadian" value={stats.totalKejadian} icon={FileSpreadsheet} color="indigo" />
          <StatCard label="Insiden Penting" value={stats.totalInsiden} icon={Flag} color="red" />
          <StatCard label="BA Disetujui" value={`${stats.compliance}%`} icon={CheckCircle2} color="emerald" />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mb-4 print:hidden">
          <Button variant="outline" onClick={exportCSV}>
            <FileSpreadsheet className="w-4 h-4 mr-2" />Export CSV
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" />Cetak
          </Button>
        </div>

        <Tabs defaultValue="bulanan">
          <TabsList className="print:hidden">
            <TabsTrigger value="bulanan">Tampilan Bulanan</TabsTrigger>
            <TabsTrigger value="rentang">Tampilan Rentang</TabsTrigger>
            <TabsTrigger value="insiden">Insiden ({stats.totalInsiden})</TabsTrigger>
          </TabsList>

          <TabsContent value="bulanan">
            <MonthlyView report={report} />
          </TabsContent>
          <TabsContent value="rentang">
            <RangeTable report={report} />
          </TabsContent>
          <TabsContent value="insiden">
            <IncidentList report={report} />
          </TabsContent>
        </Tabs>

        <div className="mt-8 text-center text-xs text-muted-foreground print:mt-4">
          Dokumen ini dihasilkan otomatis oleh sistem Bluebook Telihan. Diakses pada {format(new Date(), 'dd MMMM yyyy HH:mm', { locale: idLocale })}.
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: React.ReactNode; icon: React.ElementType; color: string }> = ({ label, value, icon: Icon, color }) => {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    red: 'bg-red-50 text-red-700 border-red-200',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <Card className={`p-4 border ${colorMap[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
          <div className="text-2xl font-bold mt-1">{value}</div>
        </div>
        <Icon className="w-7 h-7 opacity-60" />
      </div>
    </Card>
  );
};

const MonthlyView: React.FC<{ report: AuditReport }> = ({ report }) => {
  const periodeDari = parseISO(report.periode_dari);
  const periodeSampai = parseISO(report.periode_sampai);
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(periodeDari));
  const [selectedDate, setSelectedDate] = useState<string | null>(report.periode_dari);

  const days = eachDayOfInterval({ start: startOfMonth(currentMonth), end: endOfMonth(currentMonth) });
  const firstDow = startOfMonth(currentMonth).getDay();

  const shiftsByDate = useMemo(() => {
    const map = new Map<string, AuditReport['shifts']>();
    report.shifts.forEach((s) => {
      if (!map.has(s.tanggal)) map.set(s.tanggal, []);
      map.get(s.tanggal)!.push(s);
    });
    return map;
  }, [report.shifts]);

  const incidentsByDate = useMemo(() => {
    const map = new Map<string, number>();
    report.entries.filter((e) => e.is_insiden).forEach((e) => {
      map.set(e.tanggal, (map.get(e.tanggal) ?? 0) + 1);
    });
    return map;
  }, [report.entries]);

  const selectedShifts = selectedDate ? shiftsByDate.get(selectedDate) || [] : [];
  const selectedEntries = selectedDate ? report.entries.filter((e) => e.tanggal === selectedDate) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
      <Card className="lg:col-span-2 p-4">
        <div className="flex items-center justify-between mb-3">
          <Button size="sm" variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>‹</Button>
          <div className="font-semibold">{format(currentMonth, 'MMMM yyyy', { locale: idLocale })}</div>
          <Button size="sm" variant="outline" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>›</Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-1">
          {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
          {days.map((d) => {
            const key = format(d, 'yyyy-MM-dd');
            const inRange = d >= periodeDari && d <= periodeSampai;
            const shifts = shiftsByDate.get(key) || [];
            const incidents = incidentsByDate.get(key) || 0;
            const hasSigned = shifts.some((s) => !!s.ttd_pimpinan_at);
            const isSelected = key === selectedDate;
            return (
              <button
                key={key}
                disabled={!inRange}
                onClick={() => setSelectedDate(key)}
                className={`aspect-square rounded border text-xs flex flex-col items-center justify-center transition-all ${
                  isSelected ? 'border-primary bg-primary/10 ring-2 ring-primary/30' : 'border-slate-200 hover:border-primary/50'
                } ${!inRange ? 'opacity-30 cursor-not-allowed bg-slate-50' : 'cursor-pointer'}`}
              >
                <div className={`font-medium ${isSameDay(d, new Date()) ? 'text-primary' : ''}`}>{format(d, 'd')}</div>
                {shifts.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${hasSigned ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    {incidents > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                  </div>
                )}
                {shifts.length > 0 && <div className="text-[10px] text-muted-foreground">{shifts.length}s</div>}
              </button>
            );
          })}
        </div>
        <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> BA disetujui</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Belum disetujui</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Ada insiden</span>
        </div>
      </Card>

      <Card className="p-4">
        <div className="text-sm font-semibold mb-3">
          {selectedDate ? format(parseISO(selectedDate), 'EEEE, dd MMMM yyyy', { locale: idLocale }) : 'Pilih tanggal'}
        </div>
        {selectedShifts.length === 0 ? (
          <div className="text-xs text-muted-foreground py-6 text-center italic">Tidak ada shift tercatat.</div>
        ) : (
          <div className="space-y-3">
            {selectedShifts.map((s) => {
              const entries = selectedEntries.filter((e) => e.shift_id === s.id);
              return (
                <div key={s.id} className="border rounded p-3 bg-slate-50/50">
                  <div className="flex items-center justify-between text-sm">
                    <div className="font-medium">{SHIFT_LABEL[s.shift] || s.shift} · {s.nama_petugas}</div>
                    {s.ttd_pimpinan_at ? (
                      <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 border text-[10px]">
                        <CheckCircle2 className="w-3 h-3 mr-0.5" />Disetujui
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">Belum disetujui</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {s.jam_mulai && format(new Date(s.jam_mulai), 'HH:mm')}
                    {s.jam_selesai && ` – ${format(new Date(s.jam_selesai), 'HH:mm')}`}
                    {s.is_lembur && ' · Lembur'}
                  </div>
                  {entries.length > 0 && (
                    <ul className="mt-2 space-y-1 text-xs">
                      {entries.map((e) => (
                        <li key={e.id} className={`pl-2 border-l-2 ${e.is_insiden ? 'border-red-400' : 'border-slate-300'}`}>
                          <span className="text-muted-foreground">{format(new Date(e.waktu_kejadian), 'HH:mm')}</span>{' '}
                          {e.is_insiden && <Flag className="w-3 h-3 inline text-red-500" />} {e.kejadian}
                        </li>
                      ))}
                    </ul>
                  )}
                  {s.ba_signature_token && (
                    <a
                      href={`/verify/ba-security/${s.ba_signature_token}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-primary hover:underline inline-flex items-center gap-1 mt-2"
                    >
                      Verifikasi BA <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

const RangeTable: React.FC<{ report: AuditReport }> = ({ report }) => {
  return (
    <Card className="mt-4 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 border-b text-left text-xs uppercase tracking-wide text-slate-600">
          <tr>
            <th className="px-4 py-2.5">Tanggal</th>
            <th className="px-4 py-2.5">Shift</th>
            <th className="px-4 py-2.5">Petugas</th>
            <th className="px-4 py-2.5">Jam</th>
            <th className="px-4 py-2.5">Kejadian</th>
            <th className="px-4 py-2.5">Insiden</th>
            <th className="px-4 py-2.5">TTD Pimpinan</th>
          </tr>
        </thead>
        <tbody>
          {report.shifts.length === 0 && (
            <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Tidak ada data shift dalam periode ini.</td></tr>
          )}
          {report.shifts.map((s) => {
            const ents = report.entries.filter((e) => e.shift_id === s.id && e.jenis === 'kejadian');
            const insiden = ents.filter((e) => e.is_insiden).length;
            return (
              <tr key={s.id} className="border-b hover:bg-slate-50/50">
                <td className="px-4 py-2.5 whitespace-nowrap">{format(parseISO(s.tanggal), 'dd MMM yyyy', { locale: idLocale })}</td>
                <td className="px-4 py-2.5">{SHIFT_LABEL[s.shift] || s.shift}{s.is_lembur && <Badge variant="secondary" className="ml-1 text-[10px]">Lembur</Badge>}</td>
                <td className="px-4 py-2.5">{s.nama_petugas}</td>
                <td className="px-4 py-2.5 text-xs whitespace-nowrap">
                  {s.jam_mulai && format(new Date(s.jam_mulai), 'HH:mm')}
                  {s.jam_selesai && ` – ${format(new Date(s.jam_selesai), 'HH:mm')}`}
                </td>
                <td className="px-4 py-2.5 text-center">{ents.length}</td>
                <td className="px-4 py-2.5 text-center">
                  {insiden > 0 ? <Badge className="bg-red-100 text-red-800 border-red-300 border text-[10px]">{insiden}</Badge> : '-'}
                </td>
                <td className="px-4 py-2.5 text-xs">
                  {s.ttd_pimpinan_at ? (
                    <>
                      <CheckCircle2 className="w-3 h-3 inline text-emerald-600 mr-1" />
                      {s.ttd_pimpinan_nama}<br />
                      <span className="text-muted-foreground">{format(new Date(s.ttd_pimpinan_at), 'dd MMM yyyy', { locale: idLocale })}</span>
                    </>
                  ) : <span className="text-amber-700">Belum disetujui</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

const IncidentList: React.FC<{ report: AuditReport }> = ({ report }) => {
  const insidens = report.entries.filter((e) => e.is_insiden);
  if (insidens.length === 0) {
    return (
      <Card className="p-10 text-center text-muted-foreground mt-4">
        <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
        Tidak ada insiden tercatat dalam periode ini.
      </Card>
    );
  }
  return (
    <div className="space-y-3 mt-4">
      {insidens.map((e) => (
        <Card key={e.id} className="p-4 border-l-4 border-l-red-500">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Flag className="w-3.5 h-3.5 text-red-500" />
              {format(parseISO(e.tanggal), 'EEEE, dd MMMM yyyy', { locale: idLocale })} · {SHIFT_LABEL[e.shift] || e.shift} · {format(new Date(e.waktu_kejadian), 'HH:mm')} WITA
            </div>
            <div>Petugas: {e.nama_petugas}</div>
          </div>
          <p className="mt-2 text-sm whitespace-pre-wrap">{e.kejadian}</p>
          {e.foto_urls?.length > 0 && (
            <div className="flex gap-2 mt-2">
              {e.foto_urls.map((u, i) => (
                <a key={u} href={u} target="_blank" rel="noreferrer" className="w-20 h-20 rounded border overflow-hidden block">
                  <img src={u} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default AuditPublicPage;
