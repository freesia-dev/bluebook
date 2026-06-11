import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addCif, addRekening, CSProduk, getCifList, PRODUK_LABELS } from '@/lib/cs-store';
import { Navigate } from 'react-router-dom';
import { Upload, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';

type SheetKind = 'cif' | CSProduk;

const SHEET_LABELS: Record<SheetKind, string> = {
  cif: 'CIF Nasabah',
  simpeda: 'Rekening Simpeda',
  prama: 'Rekening Prama',
  simpel: 'Rekening Simpel',
  tabunganku: 'Rekening TabunganKu',
  giro: 'Rekening Giro',
  alamin: 'Rekening Al-Amin',
  taspen: 'Rekening Taspen',
  si: 'Rekening SI',
};

const ImportPage: React.FC = () => {
  const { toast } = useToast();
  const { isAdmin, userName } = useAuth();
  const [sheets, setSheets] = useState<Record<string, any[]>>({});
  const [mapping, setMapping] = useState<Record<string, SheetKind | 'skip'>>({});
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<string>('');

  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  const detectKind = (name: string): SheetKind | 'skip' => {
    const n = name.toLowerCase();
    if (n.includes('cif') || n.includes('nasabah')) return 'cif';
    if (n.includes('simpeda')) return 'simpeda';
    if (n.includes('prama')) return 'prama';
    if (n.includes('simpel')) return 'simpel';
    if (n.includes('tabunganku') || n.includes('tabungan ku')) return 'tabunganku';
    if (n.includes('giro')) return 'giro';
    if (n.includes('amin') || n.includes('alamin')) return 'alamin';
    if (n.includes('taspen')) return 'taspen';
    if (n === 'si' || n.includes('standing')) return 'si';
    return 'skip';
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

  const handleImport = async () => {
    setImporting(true);
    let totalCif = 0, totalRek = 0, skipped = 0;
    try {
      const existingCif = await getCifList();
      const cifMap = new Map(existingCif.map((c) => [c.cif, c.id]));
      let nextCifNomor = existingCif.length > 0 ? Math.max(...existingCif.map((c) => c.nomor_urut)) + 1 : 1;

      // 1) Import CIF first
      for (const [sheetName, rows] of Object.entries(sheets)) {
        if (mapping[sheetName] !== 'cif') continue;
        setProgress(`Import CIF: ${sheetName} (${rows.length} baris)`);
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const cif = pickField(row, ['CIF', 'NOMOR CIF', 'NO CIF']);
          const nama = pickField(row, ['NAMA', 'NAMA NASABAH']);
          if (!cif || !nama) { skipped++; continue; }
          if (cifMap.has(cif)) { skipped++; continue; }
          const nomor = Number(pickField(row, ['NO', 'NOMOR', 'URUT'])) || nextCifNomor++;
          try {
            await addCif({ nomor_urut: nomor, cif, nama, tanggal_input: new Date().toISOString().slice(0, 10), user_input: userName });
            totalCif++;
          } catch { skipped++; }
        }
      }

      // Refresh CIF map
      const refreshedCif = await getCifList();
      const cifIdMap = new Map(refreshedCif.map((c) => [c.cif, c.id]));

      // 2) Import Rekening per produk
      for (const [sheetName, rows] of Object.entries(sheets)) {
        const kind = mapping[sheetName];
        if (kind === 'cif' || kind === 'skip') continue;
        const produk = kind as CSProduk;
        setProgress(`Import ${PRODUK_LABELS[produk]}: ${rows.length} baris`);
        let nomorCounter = 1;
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          const norek = pickField(row, ['NOMOR REKENING', 'NO REKENING', 'REKENING', 'NO REK']);
          const nama = pickField(row, ['NAMA', 'NAMA NASABAH']);
          if (!norek || !nama) { skipped++; continue; }
          const cif = pickField(row, ['CIF', 'NOMOR CIF']);
          const tgl = pickField(row, ['TANGGAL', 'TGL BUKA', 'TANGGAL BUKA']);
          const nomor = Number(pickField(row, ['NO', 'NOMOR', 'URUT'])) || nomorCounter++;
          let tanggal_buka = new Date().toISOString().slice(0, 10);
          if (tgl) {
            const d = new Date(tgl);
            if (!isNaN(d.getTime())) tanggal_buka = d.toISOString().slice(0, 10);
          }
          // Auto-create stub CIF if missing
          let cif_id: string | null = null;
          if (cif && cifIdMap.has(cif)) cif_id = cifIdMap.get(cif)!;
          else if (cif && !cifIdMap.has(cif)) {
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

      toast({ title: 'Import selesai', description: `${totalCif} CIF, ${totalRek} rekening, ${skipped} dilewati.` });
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
      <PageHeader title="Import Data CS" description="Upload file Excel lama untuk import CIF & rekening" />
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
                      <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
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

      <Card className="p-4 bg-muted/30">
        <p className="text-sm">
          <strong>Tips:</strong> Sheet untuk CIF diharapkan punya kolom <code>CIF</code> dan <code>NAMA</code>. Sheet rekening diharapkan punya kolom <code>NOMOR REKENING</code>, <code>NAMA</code>, dan opsional <code>CIF</code> + <code>TANGGAL</code>. Nomor rekening yang sudah ada akan dilewati otomatis.
        </p>
      </Card>
    </MainLayout>
  );
};

export default ImportPage;
