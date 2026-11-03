import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputNominal } from '@/components/ui/input-nominal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  FileSpreadsheet, Plus, Pencil, Trash2, RotateCcw, Copy, Check, AlertCircle, CalendarRange,
} from 'lucide-react';
import { useMLFUploads, useMLFDataByBranch, type MLFRow } from '@/hooks/use-mlf-data';
import { useProyeksi, useProyeksiMutations, type ProyeksiRow } from '@/hooks/use-proyeksi';
import { useLoanSimulations, CANCEL_STAGE, PIPELINE_LABELS, type LoanSimulationRow } from '@/hooks/use-loan-calc';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatRupiah, formatNominal } from '@/lib/uang';
import { getUnit } from '@/lib/produktif-utils';
import {
  BARIS_PORTAL, BATAS_MIKRO_DEFAULT, PRODUK_LABEL, SEGMEN_LABEL, URUTAN_PRODUK,
  angsuranKenaMinggu, dalamMinggu, mingguBawaan, produkPipeline, produkSimulasi, runOffBulanan,
  tanggalAngsuran,
  type KodeProduk, type KodeSegmen, type Minggu,
} from '@/lib/pipeline-segmen';

/* -------------------------------------------------------------------------- */
/*  Laporan Pipeline — bahan untuk mengisi portal Weekly Pipeline kantor pusat */
/*                                                                            */
/*  Portal meminta, per minggu dan per produk: Booking (+), Run Off (-),      */
/*  Paid Off (-), dan Net. Halaman ini menyiapkan ketiganya dari data yang    */
/*  sudah ada di Bluebook, supaya tidak dihitung manual tiap minggu:          */
/*                                                                            */
/*  Booking  : rencana pencairan yang diinput manual (punya tanggal rencana)  */
/*             + pencairan yang sudah terjadi, yaitu kredit di MLF yang       */
/*             tanggal mulainya jatuh di dalam minggu tersebut.               */
/*  Run Off  : angsuran pokok bulanan debitur yang tanggal angsurannya        */
/*             (kolom TGLBYRAK) jatuh di dalam minggu tersebut.               */
/*  Paid Off : baki debet kredit yang jatuh temponya ada di minggu tersebut,  */
/*             ditambah pelunasan manual bila ada.                            */
/*                                                                            */
/*  Rentang tiap minggu bisa diubah sendiri, karena pembagian minggu kantor   */
/*  pusat tidak selalu sama tiap bulan.                                       */
/* -------------------------------------------------------------------------- */

const KUNCI_MINGGU = 'bluebook-pipeline-minggu';
const KUNCI_BATAS = 'bluebook-pipeline-batas-mikro';

type Kolom = 'booking' | 'runOff' | 'paidOff';

interface AngkaProduk {
  booking: number;
  runOff: number;
  paidOff: number;
}

const kosong = (): AngkaProduk => ({ booking: 0, runOff: 0, paidOff: 0 });
const net = (a: AngkaProduk) => a.booking - a.runOff - a.paidOff;

const tambah = (a: AngkaProduk, b: AngkaProduk): AngkaProduk => ({
  booking: a.booking + b.booking,
  runOff: a.runOff + b.runOff,
  paidOff: a.paidOff + b.paidOff,
});

/** Portal memakai satuan Miliar dengan tiga desimal (12,5 → 12,500). */
const keMiliar = (n: number) =>
  (n / 1_000_000_000).toLocaleString('id-ID', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

const tglTampil = (s: string) => format(new Date(`${s}T00:00:00`), 'd MMM', { locale: idLocale });

/* -------------------------------------------------------------------------- */
/*  Pengaturan minggu                                                         */
/* -------------------------------------------------------------------------- */

const PengaturMinggu: React.FC<{
  minggu: Minggu[];
  onChange: (m: Minggu[]) => void;
  onReset: () => void;
}> = ({ minggu, onChange, onReset }) => {
  const ubah = (i: number, bagian: 'mulai' | 'selesai', nilai: string) => {
    const baru = minggu.map((m, idx) => (idx === i ? { ...m, [bagian]: nilai } : m));
    onChange(baru);
  };

  const hapus = (i: number) =>
    onChange(minggu.filter((_, idx) => idx !== i).map((m, idx) => ({ ...m, nomor: idx + 1 })));

  const tambahMinggu = () => {
    const terakhir = minggu[minggu.length - 1];
    const mulai = terakhir
      ? new Date(new Date(`${terakhir.selesai}T00:00:00Z`).getTime() + 86400000).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    const selesai = new Date(new Date(`${mulai}T00:00:00Z`).getTime() + 6 * 86400000).toISOString().slice(0, 10);
    onChange([...minggu, { nomor: minggu.length + 1, mulai, selesai }]);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarRange className="h-4 w-4 text-primary" />
          Rentang Minggu
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onReset} className="gap-1">
            <RotateCcw className="h-3.5 w-3.5" /> Bawaan
          </Button>
          <Button size="sm" variant="outline" onClick={tambahMinggu} className="gap-1">
            <Plus className="h-3.5 w-3.5" /> Minggu
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-xs text-muted-foreground">
          Atur sendiri tanggal tiap minggu sesuai pembagian dari kantor pusat. Tersimpan di perangkat ini,
          jadi tidak perlu diatur ulang bulan depan.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {minggu.map((m, i) => (
            <div key={i} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold">Minggu {m.nomor}</span>
                {minggu.length > 1 && (
                  <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => hapus(i)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Mulai</Label>
                  <Input type="date" value={m.mulai} onChange={(e) => ubah(i, 'mulai', e.target.value)} className="h-9" />
                </div>
                <div>
                  <Label className="text-[11px] text-muted-foreground">Selesai</Label>
                  <Input type="date" value={m.selesai} onChange={(e) => ubah(i, 'selesai', e.target.value)} className="h-9" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

/* -------------------------------------------------------------------------- */
/*  Rencana pencairan manual                                                  */
/* -------------------------------------------------------------------------- */

const formKosong = (unit: string) => ({
  unit,
  nama_debitur: '',
  jenis_kredit: 'Konsumtif',
  plafon: 0,
  jangka_waktu_bulan: 0,
  keterangan: '',
  tanggal_rencana: new Date().toISOString().slice(0, 10),
  segmen: 'konsumen_multiguna' as KodeProduk,
});

const RencanaManual: React.FC<{
  unit: 'telihan' | 'meranti';
  rows: ProyeksiRow[];
  canEdit: boolean;
}> = ({ unit, rows, canEdit }) => {
  const { create, update, remove } = useProyeksiMutations();
  const [buka, setBuka] = useState(false);
  const [edit, setEdit] = useState<ProyeksiRow | null>(null);
  const [form, setForm] = useState(formKosong(unit));
  const [plafonStr, setPlafonStr] = useState('');

  const baru = () => {
    setEdit(null);
    setForm(formKosong(unit));
    setPlafonStr('');
    setBuka(true);
  };

  const ubah = (r: ProyeksiRow) => {
    setEdit(r);
    setForm({
      unit: r.unit,
      nama_debitur: r.nama_debitur,
      jenis_kredit: r.jenis_kredit,
      plafon: Number(r.plafon) || 0,
      jangka_waktu_bulan: r.jangka_waktu_bulan || 0,
      keterangan: r.keterangan || '',
      tanggal_rencana: r.tanggal_rencana || new Date().toISOString().slice(0, 10),
      segmen: (r.segmen as KodeProduk) || 'konsumen_multiguna',
    });
    setPlafonStr(String(Number(r.plafon) || 0));
    setBuka(true);
  };

  const simpan = async () => {
    const isi = { ...form, keterangan: form.keterangan || null } as any;
    if (edit) await update.mutateAsync({ id: edit.id, ...isi });
    else await create.mutateAsync(isi);
    setBuka(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Rencana pencairan yang belum ada di MLF. Tanggal rencana menentukan masuk minggu keberapa.
        </p>
        {canEdit && (
          <Button size="sm" onClick={baru} className="gap-1 shrink-0">
            <Plus className="h-4 w-4" /> Tambah
          </Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama Debitur</TableHead>
              <TableHead>Produk</TableHead>
              <TableHead>Rencana Cair</TableHead>
              <TableHead className="text-right">Plafon</TableHead>
              <TableHead>Keterangan</TableHead>
              {canEdit && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={canEdit ? 6 : 5} className="py-6 text-center text-sm text-muted-foreground">
                  Belum ada rencana pencairan
                </TableCell>
              </TableRow>
            )}
            {rows.map((r, i) => (
              <TableRow key={r.id} className={i % 2 ? 'bg-muted/30' : ''}>
                <TableCell className="text-xs font-medium">{r.nama_debitur}</TableCell>
                <TableCell className="text-xs">
                  {PRODUK_LABEL[(r.segmen as KodeProduk)] || r.jenis_kredit}
                </TableCell>
                <TableCell className="text-xs">
                  {r.tanggal_rencana ? format(new Date(`${r.tanggal_rencana}T00:00:00`), 'dd/MM/yyyy') : '—'}
                </TableCell>
                <TableCell className="text-xs text-right font-medium tabular-nums">
                  {formatRupiah(r.plafon)}
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">{r.keterangan || '—'}</TableCell>
                {canEdit && (
                  <TableCell className="whitespace-nowrap text-right">
                    <Button size="icon" variant="ghost" onClick={() => ubah(r)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(r.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={buka} onOpenChange={setBuka}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{edit ? 'Ubah Rencana Pencairan' : 'Tambah Rencana Pencairan'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="mb-1 block">Nama Debitur</Label>
              <Input
                value={form.nama_debitur}
                onChange={(e) => setForm({ ...form, nama_debitur: e.target.value })}
                placeholder="Nama calon debitur"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">Produk</Label>
                <Select
                  value={form.segmen}
                  onValueChange={(v) => setForm({ ...form, segmen: v as KodeProduk })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {URUTAN_PRODUK.map((k) => (
                      <SelectItem key={k} value={k}>{PRODUK_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-1 block">Rencana Cair</Label>
                <Input
                  type="date"
                  value={form.tanggal_rencana}
                  onChange={(e) => setForm({ ...form, tanggal_rencana: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-1 block">Plafon</Label>
                <InputNominal
                  value={plafonStr}
                  onValueChange={(teks, angka) => {
                    setPlafonStr(teks);
                    setForm((f) => ({ ...f, plafon: angka }));
                  }}
                />
              </div>
              <div>
                <Label className="mb-1 block">Jangka Waktu (bulan)</Label>
                <Input
                  inputMode="numeric"
                  value={form.jangka_waktu_bulan || ''}
                  onChange={(e) =>
                    setForm({ ...form, jangka_waktu_bulan: Number(e.target.value.replace(/\D/g, '')) || 0 })
                  }
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <Label className="mb-1 block">Keterangan</Label>
              <Input
                value={form.keterangan}
                onChange={(e) => setForm({ ...form, keterangan: e.target.value })}
                placeholder="Opsional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBuka(false)}>Batal</Button>
            <Button onClick={simpan} disabled={!form.nama_debitur.trim()}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/*  Halaman                                                                   */
/* -------------------------------------------------------------------------- */

export const LaporanPipelineContent: React.FC = () => {
  const { toast } = useToast();
  const { permissions } = useAuth();
  const canEdit = !!permissions?.canEdit;

  const { data: uploads = [] } = useMLFUploads();
  const [uploadId, setUploadId] = useState<string | undefined>(undefined);
  const [unit, setUnit] = useState<'telihan' | 'meranti' | 'semua'>('semua');
  const [tersalin, setTersalin] = useState(false);

  const [batasMikro, setBatasMikro] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(KUNCI_BATAS)) || BATAS_MIKRO_DEFAULT;
    } catch {
      return BATAS_MIKRO_DEFAULT;
    }
  });
  const [batasStr, setBatasStr] = useState(String(batasMikro));

  useEffect(() => {
    if (!uploadId && uploads.length > 0) setUploadId(uploads[0].id);
  }, [uploads, uploadId]);

  const info = uploads.find((u) => u.id === uploadId);
  const acuan = info ? new Date(info.jobdate) : new Date();

  const bawaan = useMemo(
    () => mingguBawaan(acuan.getFullYear(), acuan.getMonth()),
    [acuan.getFullYear(), acuan.getMonth()], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const [minggu, setMinggu] = useState<Minggu[]>(bawaan);
  const [sudahMuat, setSudahMuat] = useState(false);

  // Rentang tersimpan per bulan, supaya tidak perlu diatur ulang tiap buka
  const kunciBulan = `${KUNCI_MINGGU}-${acuan.getFullYear()}-${acuan.getMonth() + 1}`;
  useEffect(() => {
    try {
      const simpanan = localStorage.getItem(kunciBulan);
      setMinggu(simpanan ? (JSON.parse(simpanan) as Minggu[]) : bawaan);
    } catch {
      setMinggu(bawaan);
    }
    setSudahMuat(true);
  }, [kunciBulan]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!sudahMuat) return;
    try {
      localStorage.setItem(kunciBulan, JSON.stringify(minggu));
    } catch {
      /* mode privat — tidak masalah */
    }
  }, [minggu, kunciBulan, sudahMuat]);

  const simpanBatas = (angka: number) => {
    setBatasMikro(angka);
    try {
      localStorage.setItem(KUNCI_BATAS, String(angka));
    } catch {
      /* noop */
    }
  };

  const { data: rowsMLF = [], isLoading } = useMLFDataByBranch(uploadId, '143');
  const { data: proyeksiAll = [] } = useProyeksi();
  const { data: simulasiAll = [] } = useLoanSimulations();

  /**
   * Rencana pencairan dari Riwayat Simulasi Kalkulator Kredit — inilah pipeline
   * kredit konsumtif (termasuk kredit PNS) sebelum masuk MLF.
   *
   * Yang dipakai: simulasi yang belum dibatalkan dan punya tanggal akad SESUDAH
   * tanggal snapshot MLF. Yang akadnya sebelum atau sama dengan snapshot sudah
   * ikut terhitung dari MLF, jadi dikecualikan supaya tidak dihitung dua kali.
   */
  const simulasi = useMemo(() => {
    const batasMLF = info?.jobdate || '';
    return simulasiAll.filter((r: LoanSimulationRow) => {
      if (r.pipeline_status === CANCEL_STAGE) return false;
      if (!r.tanggal_akad) return false;
      return !batasMLF || r.tanggal_akad > batasMLF;
    });
  }, [simulasiAll, info?.jobdate]);

  const rows = useMemo(() => {
    if (unit === 'semua') return rowsMLF;
    return rowsMLF.filter((r) =>
      unit === 'meranti' ? getUnit(r) === 'meranti' : getUnit(r) !== 'meranti',
    );
  }, [rowsMLF, unit]);

  const rencana = useMemo(
    () => (unit === 'semua' ? proyeksiAll : proyeksiAll.filter((p) => (p.unit || 'telihan') === unit)),
    [proyeksiAll, unit],
  );

  /** Berapa baris yang belum punya TGLBYRAK — jadi Run Off-nya masih perkiraan. */
  const tanpaTglByrak = useMemo(() => rows.filter((r) => !r.tglbyrak).length, [rows]);

  /** angka[produk][indeks minggu] */
  const angka = useMemo(() => {
    const peta: Record<KodeProduk, AngkaProduk[]> = {} as any;
    URUTAN_PRODUK.forEach((k) => {
      peta[k] = minggu.map(() => kosong());
    });

    rows.forEach((r: MLFRow) => {
      const produk = produkPipeline(r, batasMikro);
      const { hari } = tanggalAngsuran(r);
      const angsuran = runOffBulanan(r);
      const baki = Number(r.baki) || 0;
      const plafon = Number(r.pla) || 0;

      minggu.forEach((m, i) => {
        // Run Off — angsuran pokok yang tanggalnya jatuh di minggu ini
        if (angsuran > 0 && angsuranKenaMinggu(hari, m)) {
          peta[produk][i].runOff += angsuran;
        }
        // Paid Off — jatuh tempo di minggu ini
        if (dalamMinggu(r.date1, m)) {
          peta[produk][i].paidOff += baki;
        }
        // Booking — kredit yang tanggal mulainya di minggu ini (sudah cair)
        if (dalamMinggu(r.date, m)) {
          peta[produk][i].booking += plafon;
        }
      });
    });

    simulasi.forEach((sim) => {
      const produk = produkSimulasi(sim, batasMikro);
      minggu.forEach((m, i) => {
        if (dalamMinggu(sim.tanggal_akad, m)) {
          peta[produk][i].booking += Number(sim.plafon) || 0;
        }
      });
    });

    rencana.forEach((p) => {
      const produk = (p.segmen as KodeProduk) || 'konsumen_multiguna';
      if (!peta[produk]) return;
      minggu.forEach((m, i) => {
        if (dalamMinggu(p.tanggal_rencana, m)) {
          peta[produk][i].booking += Number(p.plafon) || 0;
        }
      });
    });

    return peta;
  }, [rows, rencana, simulasi, minggu, batasMikro]);

  const barisPortal = useMemo(
    () =>
      BARIS_PORTAL.map((b) => ({
        ...b,
        perMinggu: minggu.map((_, i) =>
          b.produk.reduce((acc, k) => tambah(acc, angka[k][i]), kosong()),
        ),
      })),
    [angka, minggu],
  );

  const totalSegmen = (segmen: KodeSegmen, i: number) =>
    barisPortal.filter((b) => b.segmen === segmen).reduce((acc, b) => tambah(acc, b.perMinggu[i]), kosong());

  const totalSemua = (i: number) => barisPortal.reduce((acc, b) => tambah(acc, b.perMinggu[i]), kosong());

  const totalBulan = (b: (typeof barisPortal)[number]) => b.perMinggu.reduce(tambah, kosong());

  const salinNet = async () => {
    const baris = barisPortal.map((b) =>
      [b.label, ...b.perMinggu.map((m) => net(m)), net(totalBulan(b))].join('\t'),
    );
    const teks = [['Produk', ...minggu.map((m) => `Minggu ${m.nomor}`), 'Total Bulan'].join('\t'), ...baris].join('\n');
    try {
      await navigator.clipboard.writeText(teks);
      setTersalin(true);
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      toast({ title: 'Gagal menyalin', description: 'Browser menolak akses papan klip.', variant: 'destructive' });
    }
  };

  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const judulMinggu = minggu.map((m) => `Minggu ${m.nomor} (${tglTampil(m.mulai)}–${tglTampil(m.selesai)})`);

    const lembar = (kolom: Kolom | 'net', judul: string) => {
      const data: (string | number)[][] = [
        [`LAPORAN PIPELINE — ${judul.toUpperCase()}`],
        [`Periode MLF: ${info ? format(new Date(info.jobdate), 'dd MMMM yyyy', { locale: idLocale }) : '-'}`],
        [`Unit: ${unit === 'semua' ? 'Semua' : unit === 'meranti' ? 'Meranti' : 'Telihan'}`],
        [],
        ['Produk', ...judulMinggu, 'Total Bulan'],
      ];
      barisPortal.forEach((b) => {
        const nilai = b.perMinggu.map((m) => (kolom === 'net' ? net(m) : m[kolom]));
        const tot = kolom === 'net' ? net(totalBulan(b)) : totalBulan(b)[kolom];
        data.push([b.label, ...nilai, tot]);
      });
      const totBaris = minggu.map((_, i) => (kolom === 'net' ? net(totalSemua(i)) : totalSemua(i)[kolom]));
      const totAkhir = totBaris.reduce((a, b) => a + b, 0);
      data.push(['TOTAL', ...totBaris, totAkhir]);
      const ws = XLSX.utils.aoa_to_sheet(data);
      ws['!cols'] = [{ wch: 32 }, ...minggu.map(() => ({ wch: 20 })), { wch: 20 }];
      return ws;
    };

    XLSX.utils.book_append_sheet(wb, lembar('net', 'Net'), 'Net');
    XLSX.utils.book_append_sheet(wb, lembar('booking', 'Booking'), 'Booking');
    XLSX.utils.book_append_sheet(wb, lembar('runOff', 'Run Off'), 'Run Off');
    XLSX.utils.book_append_sheet(wb, lembar('paidOff', 'Paid Off'), 'Paid Off');

    const periode = info ? format(new Date(info.jobdate), 'yyyy-MM') : 'periode';
    XLSX.writeFile(wb, `Laporan-Pipeline-${periode}.xlsx`);
  };

  const TabelAngka: React.FC<{ kolom: Kolom | 'net' }> = ({ kolom }) => {
    const ambil = (a: AngkaProduk) => (kolom === 'net' ? net(a) : a[kolom]);
    const segmenUrut: KodeSegmen[] = ['mikro', 'kecil', 'konsumen'];

    return (
      <div className="overflow-x-auto rounded-lg border">
        <Table className="[&_th]:whitespace-nowrap [&_td]:whitespace-nowrap text-xs sm:text-sm">
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[220px]">Produk</TableHead>
              {minggu.map((m) => (
                <TableHead key={m.nomor} className="text-right">
                  <div>Minggu {m.nomor}</div>
                  <div className="text-[10px] font-normal text-muted-foreground">
                    {tglTampil(m.mulai)} – {tglTampil(m.selesai)}
                  </div>
                </TableHead>
              ))}
              <TableHead className="text-right">Total Bulan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {segmenUrut.map((seg) => (
              <React.Fragment key={seg}>
                <TableRow className="bg-muted/50">
                  <TableCell colSpan={minggu.length + 2} className="py-1.5 text-xs font-semibold uppercase tracking-wide">
                    {SEGMEN_LABEL[seg]}
                  </TableCell>
                </TableRow>
                {barisPortal
                  .filter((b) => b.segmen === seg)
                  .map((b) => (
                    <TableRow key={b.label}>
                      <TableCell className="pl-6">{b.label}</TableCell>
                      {b.perMinggu.map((m, i) => (
                        <TableCell key={i} className="text-right tabular-nums">
                          {formatNominal(ambil(m))}
                        </TableCell>
                      ))}
                      <TableCell className="text-right font-semibold tabular-nums">
                        {formatNominal(ambil(totalBulan(b)))}
                      </TableCell>
                    </TableRow>
                  ))}
                <TableRow className="font-medium">
                  <TableCell className="pl-6 text-muted-foreground">Subtotal {SEGMEN_LABEL[seg]}</TableCell>
                  {minggu.map((_, i) => (
                    <TableCell key={i} className="text-right tabular-nums">
                      {formatNominal(ambil(totalSegmen(seg, i)))}
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums">
                    {formatNominal(
                      minggu.reduce((s, _, i) => s + ambil(totalSegmen(seg, i)), 0),
                    )}
                  </TableCell>
                </TableRow>
              </React.Fragment>
            ))}
            <TableRow className="bg-primary/5 font-bold">
              <TableCell>TOTAL</TableCell>
              {minggu.map((_, i) => (
                <TableCell key={i} className="text-right tabular-nums">
                  {formatNominal(ambil(totalSemua(i)))}
                </TableCell>
              ))}
              <TableCell className="text-right tabular-nums">
                {formatNominal(minggu.reduce((s, _, i) => s + ambil(totalSemua(i)), 0))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Kontrol */}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 md:flex-row md:items-end">
          <div className="min-w-[220px] flex-1">
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Periode MLF</Label>
            <Select value={uploadId} onValueChange={setUploadId}>
              <SelectTrigger><SelectValue placeholder="Pilih periode" /></SelectTrigger>
              <SelectContent>
                {uploads.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {format(new Date(u.jobdate), 'dd MMMM yyyy', { locale: idLocale })} — {u.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-48">
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Unit</Label>
            <Select value={unit} onValueChange={(v) => setUnit(v as typeof unit)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Unit</SelectItem>
                <SelectItem value="telihan">Telihan</SelectItem>
                <SelectItem value="meranti">Meranti</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="w-full md:w-56">
            <Label className="mb-1 block text-xs uppercase tracking-wide text-muted-foreground">Batas Plafon Mikro</Label>
            <InputNominal
              value={batasStr}
              onValueChange={(teks, angka) => {
                setBatasStr(teks);
                simpanBatas(angka || BATAS_MIKRO_DEFAULT);
              }}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={salinNet} className="gap-2">
              {tersalin ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              {tersalin ? 'Tersalin' : 'Salin Net'}
            </Button>
            <Button onClick={exportExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {tanpaTglByrak > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {tanpaTglByrak} dari {rows.length} debitur belum punya tanggal angsuran (TGLBYRAK) — Run Off mereka
            memakai tanggal mulai kredit sebagai perkiraan. Unggah ulang berkas MLF terbaru supaya tepat.
          </AlertDescription>
        </Alert>
      )}

      <PengaturMinggu minggu={minggu} onChange={setMinggu} onReset={() => setMinggu(bawaan)} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Angka untuk Portal Weekly Pipeline</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Memuat data MLF…</p>
          ) : (
            <Tabs defaultValue="net">
              <TabsList className="mb-3 grid h-auto w-full grid-cols-2 sm:inline-flex sm:w-auto">
                <TabsTrigger value="net">Net</TabsTrigger>
                <TabsTrigger value="booking">Booking (+)</TabsTrigger>
                <TabsTrigger value="runOff">Run Off (−)</TabsTrigger>
                <TabsTrigger value="paidOff">Paid Off (−)</TabsTrigger>
              </TabsList>
              <TabsContent value="net"><TabelAngka kolom="net" /></TabsContent>
              <TabsContent value="booking"><TabelAngka kolom="booking" /></TabsContent>
              <TabsContent value="runOff"><TabelAngka kolom="runOff" /></TabsContent>
              <TabsContent value="paidOff"><TabelAngka kolom="paidOff" /></TabsContent>
            </Tabs>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            Angka dalam Rupiah penuh — portal memang minta diketik Rupiah penuh, dan menyimpannya sendiri
            dalam Miliar. Net = Booking − Run Off − Paid Off.
          </p>
        </CardContent>
      </Card>

      {/* Ringkas dalam Miliar, seperti tampilan laporan portal */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ringkasan Net (Miliar)</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table className="text-xs sm:text-sm [&_th]:whitespace-nowrap [&_td]:whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead>Segmen (Net)</TableHead>
                {minggu.map((m) => (
                  <TableHead key={m.nomor} className="text-right">Minggu {m.nomor}</TableHead>
                ))}
                <TableHead className="text-right">Total Bulan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(['mikro', 'kecil', 'konsumen'] as KodeSegmen[]).map((seg) => (
                <TableRow key={seg}>
                  <TableCell>{SEGMEN_LABEL[seg]}</TableCell>
                  {minggu.map((_, i) => (
                    <TableCell key={i} className="text-right tabular-nums">
                      {keMiliar(net(totalSegmen(seg, i)))}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-semibold tabular-nums">
                    {keMiliar(minggu.reduce((s, _, i) => s + net(totalSegmen(seg, i)), 0))}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-primary/5 font-bold">
                <TableCell>TOTAL</TableCell>
                {minggu.map((_, i) => (
                  <TableCell key={i} className="text-right tabular-nums">
                    {keMiliar(net(totalSemua(i)))}
                  </TableCell>
                ))}
                <TableCell className="text-right tabular-nums">
                  {keMiliar(minggu.reduce((s, _, i) => s + net(totalSemua(i)), 0))}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Dari Riwayat Simulasi Kalkulator ({simulasi.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-sm text-muted-foreground">
            Simulasi yang belum dibatalkan dan tanggal akadnya setelah tanggal MLF terpilih. Yang akadnya
            sebelum itu sudah terhitung dari MLF, jadi tidak dihitung dua kali.
          </p>
          {simulasi.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Belum ada simulasi dengan tanggal akad setelah periode MLF ini.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border">
              <Table className="text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead>Nama Debitur</TableHead>
                    <TableHead>Produk</TableHead>
                    <TableHead>Masuk Baris</TableHead>
                    <TableHead>Tahap</TableHead>
                    <TableHead>Akad</TableHead>
                    <TableHead className="text-right">Plafon</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simulasi.map((sim, i) => (
                    <TableRow key={sim.id} className={i % 2 ? 'bg-muted/30' : ''}>
                      <TableCell className="font-medium">{sim.nama_debitur}</TableCell>
                      <TableCell className="text-muted-foreground">{sim.product_nama || '—'}</TableCell>
                      <TableCell>{PRODUK_LABEL[produkSimulasi(sim, batasMikro)]}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px]">
                          {PIPELINE_LABELS[(sim.pipeline_status as keyof typeof PIPELINE_LABELS)] || 'Simulasi Kredit'}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {sim.tanggal_akad ? format(new Date(`${sim.tanggal_akad}T00:00:00`), 'dd/MM/yyyy') : '—'}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatRupiah(sim.plafon)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rencana Pencairan (Booking Manual)</CardTitle>
        </CardHeader>
        <CardContent>
          <RencanaManual
            unit={unit === 'meranti' ? 'meranti' : 'telihan'}
            rows={rencana}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cara angka ini dihitung</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <Badge variant="outline" className="mr-2">Booking (+)</Badge>
            Tiga sumber: simulasi di Riwayat Kalkulator Kredit yang tanggal akadnya jatuh di minggu itu
            (pipeline kredit konsumtif, termasuk kredit PNS), rencana pencairan manual di bawah, dan
            kredit di MLF yang tanggal mulainya ada di minggu itu (sudah cair).
          </p>
          <p>
            <Badge variant="outline" className="mr-2">Run Off (−)</Badge>
            Angsuran pokok sebulan tiap debitur, dimasukkan ke minggu yang memuat tanggal angsurannya
            (kolom TGLBYRAK berkas MLF).
          </p>
          <p>
            <Badge variant="outline" className="mr-2">Paid Off (−)</Badge>
            Baki debet kredit yang jatuh temponya ada di minggu itu.
          </p>
          <p>
            <Badge variant="outline" className="mr-2">Segmen</Badge>
            KUR dikenali dari bunga sliding, non-KUR dari anuitas. Mikro bila plafon sampai{' '}
            {formatRupiah(batasMikro)}, di atasnya Kecil. Kecil KUR ikut dijumlahkan ke baris
            "Mikro KUR (Inc. Kecil KUR)" sesuai format portal.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

const LaporanPipelinePage: React.FC = () => (
  <MainLayout>
    <PageHeader
      title="Laporan Pipeline"
      description="Booking, Run Off, dan Paid Off per minggu — bahan pengisian portal Weekly Pipeline"
    />
    <LaporanPipelineContent />
  </MainLayout>
);

export default LaporanPipelinePage;
