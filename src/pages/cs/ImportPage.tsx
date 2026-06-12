import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addBilyet, addBuku, addCif, addKartuMutasi, addRekening, addSi, BUKU_PRODUK_LABELS, CSBukuProduk, CSDepositoStatus, CSJenisKartu, CSProduk, getCifList, KARTU_LABELS, PRODUK_LABELS, wipeAllBilyet, wipeAllBuku, wipeAllCif, wipeAllKartuMutasi, wipeAllSi, wipeRekeningByProduk } from '@/lib/cs-store';
import { Navigate } from 'react-router-dom';
import { AlertCircle, Upload, Loader2, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import * as XLSX from 'xlsx';

type SheetKind = 'cif' | 'rekening_auto' | CSProduk | 'si' | 'buku_tabungan' | 'kartu_atm' | 'bilyet_deposito';

const SHEET_LABELS: Record<SheetKind, string> = {
  cif: 'CIF Nasabah',
  rekening_auto: 'Rekening — Auto Produk per Baris',
  simpeda: 'Rekening Simpeda',
  simpeda_ib: 'Rekening Simpeda IB',
  prama: 'Rekening Prama',
  simpel: 'Rekening Simpel',
  tabunganku: 'Rekening TabunganKu',
  giro: 'Rekening Giro',
  alamin: 'Rekening Al-Amin',
  taspen: 'Rekening Taspen',
  si: 'Standing Instruction (SI)',
  buku_tabungan: 'Register Buku Tabungan',
  kartu_atm: 'Logbook Kartu ATM',
  bilyet_deposito: 'Bilyet Deposito',
};

const BUKU_PRODUK_KEYS = Object.keys(BUKU_PRODUK_LABELS) as CSBukuProduk[];
const REKENING_PRODUK_KEYS = Object.keys(PRODUK_LABELS) as CSProduk[];

const ImportPage: React.FC = () => {
  const { toast } = useToast();
  const { isAdmin, userName } = useAuth();
  const [sheets, setSheets] = useState<Record<string, any[]>>({});
  const [mapping, setMapping] = useState<Record<string, SheetKind | 'skip'>>({});
  const [overwrite, setOverwrite] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string>('');

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const detectKind = (name: string): SheetKind | 'skip' => {
    const n = name.toLowerCase();
    if (n.includes('cif') || n.includes('nasabah')) return 'cif';
    if (n.includes('kartu') || n.includes('atm')) return 'kartu_atm';
    if (n.includes('bilyet') && n.includes('deposito')) return 'bilyet_deposito';
    if (n.includes('buku tab') || n.includes('register buku')) return 'buku_tabungan';
    if (n.includes('simpeda ib') || n.includes('simpeda_ib') || n.includes('simpedaib')) return 'simpeda_ib';
    if (n.includes('simpeda')) return 'simpeda';
    if (n.includes('prama')) return 'prama';
    if (n.includes('simpel')) return 'simpel';
    if (n.includes('tabunganku') || n.includes('tabungan ku')) return 'tabunganku';
    if (n.includes('giro')) return 'giro';
    if (n.includes('amin') || n.includes('alamin')) return 'alamin';
    if (n.includes('taspen')) return 'taspen';
    if (n.includes('rekening') || n.includes('tabungan')) return 'rekening_auto';
    if (n === 'si' || n.includes('si new') || n.includes('standing')) return 'si';
    return 'skip';
  };

  const normalize = (value: unknown) => String(value ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

  const detectRekeningProduk = (row: any, fallback?: SheetKind | 'skip'): CSProduk | null => {
    if (fallback && REKENING_PRODUK_KEYS.includes(fallback as CSProduk)) return fallback as CSProduk;
    const values = Object.entries(row)
      .filter(([key]) => ['produk', 'jenis produk', 'jenis tabungan', 'jenis rekening', 'product', 'keterangan'].some((k) => normalize(key) === normalize(k)))
      .map(([, value]) => normalize(value))
      .join(' ');
    const allText = `${values} ${normalize(Object.values(row).slice(0, 8).join(' '))}`;
    if (allText.includes('simpedaib')) return 'simpeda_ib';
    if (allText.includes('simpeda')) return 'simpeda';
    if (allText.includes('prama')) return 'prama';
    if (allText.includes('simpel')) return 'simpel';
    if (allText.includes('tabunganku')) return 'tabunganku';
    if (allText.includes('giro')) return 'giro';
    if (allText.includes('alamin') || allText.includes('amin')) return 'alamin';
    if (allText.includes('taspen')) return 'taspen';
    return null;
  };

  const getImportStats = () => {
    const stats: Record<string, number> = {};
    let skippedSheets = 0;
    Object.entries(sheets).forEach(([sheetName, rows]) => {
      const kind = mapping[sheetName];
      if (!kind || kind === 'skip') { skippedSheets++; return; }
      if (kind === 'rekening_auto') {
        rows.forEach((row) => {
          const produk = detectRekeningProduk(row);
          const key = produk ? `Rekening ${PRODUK_LABELS[produk]}` : 'Rekening belum terdeteksi';
          stats[key] = (stats[key] || 0) + 1;
        });
        return;
      }
      stats[SHEET_LABELS[kind]] = (stats[SHEET_LABELS[kind]] || 0) + rows.length;
    });
    return { stats, skippedSheets };
  };

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const next: Record<string, any[]> = {};
    const nextMap: Record<string, SheetKind | 'skip'> = {};
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      const json = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
      next[name] = json;
      nextMap[name] = detectKind(name);
    }
    setSheets(next);
    setMapping(nextMap);
    toast({ title: 'File dibaca', description: `${wb.SheetNames.length} sheet terdeteksi.` });
  };

  const pickField = (row: any, keys: string[]) => {
    for (const k of keys) {
      for (const real of Object.keys(row)) {
        if (real.toLowerCase().replace(/[^a-z0-9]/g, '') === k.toLowerCase().replace(/[^a-z0-9]/g, '')) {
          const v = row[real];
          if (v !== '' && v != null) return String(v).trim();
        }
      }
    }
    return '';
  };

  const parseDate = (s: string): string => {
    if (!s) return new Date().toISOString().slice(0, 10);
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    // Try DD/MM/YYYY
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
    if (m) {
      const yr = m[3].length === 2 ? `20${m[3]}` : m[3];
      return `${yr}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    }
    return new Date().toISOString().slice(0, 10);
  };

  const detectBukuProduk = (s: string): CSBukuProduk | null => {
    const n = (s || '').toLowerCase();
    if (n.includes('simpeda ib') || n.includes('simpedaib')) return 'simpeda_ib';
    if (n.includes('simpeda')) return 'simpeda';
    if (n.includes('prama')) return 'prama';
    if (n.includes('tabunganku')) return 'tabunganku';
    if (n.includes('simpel')) return 'simpel';
    if (n.includes('amin')) return 'alamin';
    if (n.includes('giro')) return 'bilyet_giro';
    if (n.includes('deposito')) return 'bilyet_deposito';
    if (n.includes('cek')) return 'buku_cek';
    return null;
  };

  const handleImport = async () => {
    setImporting(true);
    let totalCif = 0, totalRek = 0, totalSi = 0, totalBuku = 0, skipped = 0;
    try {
      const existingCif = await getCifList();
      const cifMap = new Map(existingCif.map((c) => [c.cif, c.id]));
      let nextCifNomor = existingCif.length > 0 ? Math.max(...existingCif.map((c) => c.nomor_urut)) + 1 : 1;

      // 1) Import CIF first
      for (const [sheetName, rows] of Object.entries(sheets)) {
        if (mapping[sheetName] !== 'cif') continue;
        setProgress(`Import CIF: ${sheetName} (${rows.length} baris)`);
        for (const row of rows) {
          const cif = pickField(row, ['CIF', 'NOMOR CIF', 'NO CIF']);
          const nama = pickField(row, ['NAMA', 'NAMA NASABAH']);
          if (!cif || !nama) { skipped++; continue; }
          if (cifMap.has(cif)) { skipped++; continue; }
          const nomor = Number(pickField(row, ['NO', 'NOMOR', 'URUT'])) || nextCifNomor++;
          try {
            await addCif({ nomor_urut: nomor, cif, nama, tanggal_input: new Date().toISOString().slice(0, 10), user_input: userName });
            totalCif++;
            cifMap.set(cif, 'pending');
          } catch { skipped++; }
        }
      }

      const refreshedCif = await getCifList();
      const cifIdMap = new Map(refreshedCif.map((c) => [c.cif, c.id]));

      // 2) Import Rekening per produk
      for (const [sheetName, rows] of Object.entries(sheets)) {
        const kind = mapping[sheetName];
        if (!kind || kind === 'cif' || kind === 'skip' || kind === 'si' || kind === 'buku_tabungan') continue;
        const produk = kind as CSProduk;
        setProgress(`Import ${PRODUK_LABELS[produk]}: ${rows.length} baris`);
        let nomorCounter = 1;
        for (const row of rows) {
          const norek = pickField(row, ['NOMOR REKENING', 'NO REKENING', 'REKENING', 'NO REK']);
          const nama = pickField(row, ['NAMA', 'NAMA NASABAH']);
          if (!norek || !nama) { skipped++; continue; }
          const cif = pickField(row, ['CIF', 'NOMOR CIF']);
          const tanggal_buka = parseDate(pickField(row, ['TANGGAL', 'TGL BUKA', 'TANGGAL BUKA']));
          const nomor = Number(pickField(row, ['NO', 'NOMOR', 'URUT'])) || nomorCounter++;
          let cif_id: string | null = null;
          if (cif && cifIdMap.has(cif)) cif_id = cifIdMap.get(cif)!;
          else if (cif) {
            try {
              await addCif({ nomor_urut: nextCifNomor++, cif, nama, tanggal_input: tanggal_buka, user_input: userName });
              totalCif++;
              const fresh = await getCifList();
              const found = fresh.find((c) => c.cif === cif);
              if (found) { cif_id = found.id; cifIdMap.set(cif, found.id); }
            } catch { /* ignore */ }
          }
          try {
            await addRekening({
              produk, nomor_urut: nomor, nomor_rekening: norek,
              cif: cif || null, cif_id, nama, tanggal_buka,
              keterangan: null, user_input: userName,
            });
            totalRek++;
          } catch { skipped++; }
        }
      }

      // 3) Import SI
      for (const [sheetName, rows] of Object.entries(sheets)) {
        if (mapping[sheetName] !== 'si') continue;
        setProgress(`Import SI: ${rows.length} baris`);
        let nomorCounter = 1;
        for (const row of rows) {
          const kode = pickField(row, ['KODE SI', 'KODE', 'NO SI']);
          const debet = pickField(row, ['REKENING DEBET', 'REK DEBET', 'DEBET']);
          const kredit = pickField(row, ['REKENING KREDIT', 'REK KREDIT', 'KREDIT']);
          if (!kode || !debet || !kredit) { skipped++; continue; }
          const nama = pickField(row, ['NAMA', 'NAMA NASABAH']);
          const nominal = Number(pickField(row, ['NOMINAL', 'JUMLAH']).replace(/[^0-9.-]/g, '')) || 0;
          const mulai = parseDate(pickField(row, ['TANGGAL MULAI', 'TGL MULAI', 'MULAI']));
          const berakhirRaw = pickField(row, ['TANGGAL BERAKHIR', 'TGL BERAKHIR', 'BERAKHIR', 'TGL AKHIR']);
          const status = (pickField(row, ['STATUS']) || 'aktif').toLowerCase();
          const ket = pickField(row, ['KETERANGAN']);
          try {
            await addSi({
              nomor_urut: Number(pickField(row, ['NO', 'NOMOR', 'URUT'])) || nomorCounter++,
              kode_si: kode, rekening_debet: debet, rekening_kredit: kredit,
              nama_nasabah: nama || null, nominal,
              tanggal_mulai: mulai, tanggal_berakhir: berakhirRaw ? parseDate(berakhirRaw) : null,
              status, keterangan: ket || null, user_input: userName,
            });
            totalSi++;
          } catch { skipped++; }
        }
      }

      // 4) Import Buku Tabungan
      for (const [sheetName, rows] of Object.entries(sheets)) {
        if (mapping[sheetName] !== 'buku_tabungan') continue;
        setProgress(`Import Buku Tabungan: ${rows.length} baris`);
        for (const row of rows) {
          const tipeRaw = pickField(row, ['TIPE', 'MUTASI', 'JENIS']).toLowerCase();
          const tipe: 'masuk' | 'keluar' = tipeRaw.includes('keluar') ? 'keluar' : 'masuk';
          const produk = detectBukuProduk(pickField(row, ['PRODUK', 'JENIS BUKU', 'JENIS']));
          const jumlah = Number(pickField(row, ['JUMLAH', 'QTY'])) || 1;
          const tanggal = parseDate(pickField(row, ['TANGGAL', 'TGL']));
          try {
            await addBuku({
              tipe, produk, jumlah, tanggal,
              cif: pickField(row, ['CIF']) || null,
              nama: pickField(row, ['NAMA', 'NAMA NASABAH']) || null,
              nomor_rekening: pickField(row, ['NOMOR REKENING', 'REKENING']) || null,
              nomor_seri: pickField(row, ['NOMOR SERI', 'NO SERI', 'SERI']) || null,
              keterangan: pickField(row, ['KETERANGAN']) || null,
              user_input: userName,
            });
            totalBuku++;
          } catch { skipped++; }
        }
      }

      toast({ title: 'Import selesai', description: `${totalCif} CIF, ${totalRek} rekening, ${totalSi} SI, ${totalBuku} buku, ${skipped} dilewati.` });
      setProgress('');
      setSheets({});
      setMapping({});
    } catch (e: any) {
      toast({ title: 'Gagal import', description: e.message, variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <MainLayout>
      <PageHeader title="Import Data CS" description="Upload file Excel lama untuk import CIF, rekening, SI & buku tabungan" />
      <Card className="p-6 mb-4">
        <Label>Upload File Excel (.xlsx / .xls)</Label>
        <div className="mt-2">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            className="block w-full text-sm"
            disabled={importing}
          />
        </div>
      </Card>

      {Object.keys(sheets).length > 0 && (
        <Card className="p-6 mb-4">
          <h3 className="font-semibold mb-3">Mapping Sheet → Tabel Tujuan</h3>
          <Table>
            <TableHeader><TableRow><TableHead>Sheet</TableHead><TableHead>Baris</TableHead><TableHead>Tujuan</TableHead><TableHead>Preview Kolom</TableHead></TableRow></TableHeader>
            <TableBody>
              {Object.entries(sheets).map(([name, rows]) => (
                <TableRow key={name}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell><Badge variant="secondary">{rows.length}</Badge></TableCell>
                  <TableCell>
                    <Select value={mapping[name]} onValueChange={(v) => setMapping({ ...mapping, [name]: v as any })}>
                      <SelectTrigger className="w-56"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">— Lewati —</SelectItem>
                        {(Object.keys(SHEET_LABELS) as SheetKind[]).map((k) => (
                          <SelectItem key={k} value={k}>{SHEET_LABELS[k]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-md truncate">
                    {rows[0] ? Object.keys(rows[0]).slice(0, 6).join(', ') : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex items-center gap-2">
            <Button onClick={handleImport} disabled={importing}>
              {importing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              Mulai Import
            </Button>
            {progress && <span className="text-sm text-muted-foreground">{progress}</span>}
          </div>
        </Card>
      )}

      <ResetPanel />

      <Card className="p-4 bg-muted/30">

        <p className="text-sm space-y-1">
          <strong>Tips kolom yang dikenali:</strong>
          <br />• <strong>CIF</strong>: <code>CIF</code>, <code>NAMA</code>
          <br />• <strong>Rekening (per produk)</strong>: <code>NOMOR REKENING</code>, <code>NAMA</code>, opsional <code>CIF</code> + <code>TANGGAL BUKA</code>
          <br />• <strong>SI</strong>: <code>KODE SI</code>, <code>REKENING DEBET</code>, <code>REKENING KREDIT</code>, <code>NOMINAL</code>, <code>TANGGAL MULAI</code>, <code>TANGGAL BERAKHIR</code>, opsional <code>NAMA</code>, <code>STATUS</code>
          <br />• <strong>Buku Tabungan</strong>: <code>TIPE</code> (masuk/keluar), <code>PRODUK</code>, <code>JUMLAH</code>, <code>TANGGAL</code>, opsional <code>NOMOR SERI</code>, <code>CIF</code>, <code>NAMA</code>, <code>NOMOR REKENING</code>
          <br />Data yang sudah ada (CIF, rekening per produk, kode SI) akan dilewati otomatis untuk hindari duplikat.
        </p>
      </Card>
    </MainLayout>
  );
};

export default ImportPage;

// ============ Reset Panel ============
type ResetTarget = { key: string; label: string; fn: () => Promise<number> };
const RESET_TARGETS: ResetTarget[] = [
  { key: 'cif', label: 'CIF Nasabah', fn: wipeAllCif },
  ...(Object.keys(PRODUK_LABELS) as CSProduk[]).map((p) => ({
    key: `rek_${p}`,
    label: `Rekening ${PRODUK_LABELS[p]}`,
    fn: () => wipeRekeningByProduk(p),
  })),
  { key: 'si', label: 'Standing Instruction (SI)', fn: wipeAllSi },
  { key: 'buku', label: 'Register Buku Tabungan', fn: wipeAllBuku },
  { key: 'bilyet', label: 'Bilyet Deposito', fn: wipeAllBilyet },
  { key: 'kartu', label: 'Mutasi Kartu ATM', fn: wipeAllKartuMutasi },
];

const ResetPanel: React.FC = () => {
  const { toast } = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const handleReset = async (t: ResetTarget) => {
    setBusy(t.key);
    try {
      const n = await t.fn();
      toast({ title: 'Berhasil dihapus', description: `${n} baris pada ${t.label} dihapus. Silakan re-import.` });
    } catch (e: any) {
      toast({ title: 'Gagal hapus', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="p-6 mb-4 border-destructive/30">
      <h3 className="font-semibold mb-1 text-destructive flex items-center gap-2"><Trash2 className="h-4 w-4" /> Reset Data per Tabel/Produk</h3>
      <p className="text-xs text-muted-foreground mb-3">Hapus semua data pada tabel/produk tertentu sebelum re-import. Berguna jika mapping import sebelumnya salah.</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {RESET_TARGETS.map((t) => (
          <AlertDialog key={t.key}>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={busy !== null} className="justify-start">
                {busy === t.key ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Trash2 className="h-3 w-3 mr-2" />}
                {t.label}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus semua data {t.label}?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tindakan ini akan menghapus SELURUH baris pada <strong>{t.label}</strong> secara permanen.
                  Tidak dapat dibatalkan. Lanjutkan?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleReset(t)} className="bg-destructive hover:bg-destructive/90">Hapus Semua</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ))}
      </div>
    </Card>
  );
};
