import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, Calendar, Loader2, CheckCircle2, Trash2, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useMLFUploads } from '@/hooks/use-mlf-data';
import { parseDateFromFilename, fmtNum } from '@/lib/mlf-utils';
import { useAuth } from '@/contexts/AuthContext';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';

const UploadDataPage: React.FC = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data: uploads = [], refetch } = useMLFUploads();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    const jobdate = parseDateFromFilename(file.name);
    if (!jobdate) {
      toast({ title: 'Format Nama File Salah', description: 'Nama file harus mengandung tanggal, contoh: mlf_13-05-2026.xls', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    setLastResult(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array', cellDates: false });
      if (!wb.SheetNames.includes('Master_Loan_Filter')) {
        throw new Error('Sheet "Master_Loan_Filter" tidak ditemukan di file ini.');
      }
      const ws = wb.Sheets['Master_Loan_Filter'];
      // Read as array-of-arrays so we can map by both header name AND column letter (Z/AA fallback)
      const aoa: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, blankrows: false });
      if (aoa.length < 2) throw new Error('Sheet kosong, tidak ada data.');

      const headerRow = aoa[0].map((h) => (h === null || h === undefined ? '' : String(h).trim()));
      const dataRows = aoa.slice(1);

      const norm = (s: string) => s.toLowerCase().replace(/[\s_\-./]/g, '');
      const headerIdx = new Map<string, number>();
      headerRow.forEach((h, i) => {
        if (h) headerIdx.set(norm(h), i);
      });

      const findIdx = (...names: string[]): number => {
        for (const n of names) {
          const idx = headerIdx.get(norm(n));
          if (idx !== undefined) return idx;
        }
        return -1;
      };

      const idx = {
        brcd: findIdx('L0BRCD', 'BRCD'),
        brname: findIdx('BRNAME'),
        kol: findIdx('KOL', 'kol'),
        lytitl: findIdx('LYTITL'),
        ecname: findIdx('ECNAME'),
        l0lnno: findIdx('L0LNNO'),
        l0name: findIdx('L0NAME'),
        l0narr: findIdx('L0NARR'),
        pla: findIdx('PLA', 'PLAFON'),
        baki: findIdx('BAKI'),
        // Z = index 25, AA = index 26 (0-indexed) — fallback if header tidak ketemu
        tungpk: (() => { const i = findIdx('TUNGPK', 'TUNG PK', 'TUNGGAKAN POKOK', 'TUNGGAKANPOKOK'); return i >= 0 ? i : 25; })(),
        tungbg: (() => { const i = findIdx('TUNGBG', 'TUNG BG', 'TUNGGAKAN BUNGA', 'TUNGGAKANBUNGA'); return i >= 0 ? i : 26; })(),
        cad: findIdx('CAD'),
        group1: findIdx('group1', 'GROUP1'),
        group2: findIdx('group2', 'GROUP2'),
        l0usid: findIdx('L0USID'),
        date1: findIdx('DATE1'),
      };

      const toDateISO = (v: any): string | null => {
        if (v === null || v === undefined || v === '') return null;
        // Excel serial number
        if (typeof v === 'number' && isFinite(v)) {
          const ms = Math.round((v - 25569) * 86400 * 1000);
          const d = new Date(ms);
          if (isNaN(d.getTime())) return null;
          return d.toISOString().slice(0, 10);
        }
        const s = String(v).trim();
        // dd/MM/yyyy or dd-MM-yyyy
        const m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
        if (m) {
          let [_, d, mo, y] = m;
          if (y.length === 2) y = '20' + y;
          return `${y.padStart(4,'0')}-${mo.padStart(2,'0')}-${d.padStart(2,'0')}`;
        }
        // yyyy-MM-dd
        const m2 = s.match(/^(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/);
        if (m2) return `${m2[1]}-${m2[2].padStart(2,'0')}-${m2[3].padStart(2,'0')}`;
        const d = new Date(s);
        return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
      };

      // Create upload row
      const { data: userData } = await supabase.auth.getUser();
      const { data: uploadRow, error: upErr } = await (supabase as any)
        .from('mlf_uploads')
        .insert({ jobdate, filename: file.name, total_rows: dataRows.length, uploaded_by: userData?.user?.id })
        .select()
        .single();
      if (upErr) throw upErr;

      const toStr = (v: any) => (v === null || v === undefined ? null : String(v).trim() || null);
      const toNum = (v: any) => {
        if (v === null || v === undefined || v === '') return null;
        if (typeof v === 'number') return isNaN(v) ? null : v;
        const cleaned = String(v).replace(/[^\d.\-,]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
        const n = Number(cleaned);
        return isNaN(n) ? null : n;
      };
      const at = (row: any[], i: number) => (i >= 0 && i < row.length ? row[i] : null);

      const mapped = dataRows.map((row) => ({
        upload_id: uploadRow.id,
        jobdate,
        brcd: toStr(at(row, idx.brcd)),
        brname: toStr(at(row, idx.brname)),
        kol: toNum(at(row, idx.kol)),
        lytitl: toStr(at(row, idx.lytitl)),
        ecname: toStr(at(row, idx.ecname)),
        l0lnno: toStr(at(row, idx.l0lnno)),
        l0name: toStr(at(row, idx.l0name)),
        l0narr: toStr(at(row, idx.l0narr)),
        pla: toNum(at(row, idx.pla)),
        baki: toNum(at(row, idx.baki)),
        tungpk: toNum(at(row, idx.tungpk)),
        tungbg: toNum(at(row, idx.tungbg)),
        cad: toNum(at(row, idx.cad)),
        group1: toStr(at(row, idx.group1)),
        group2: toStr(at(row, idx.group2)),
        l0usid: toStr(at(row, idx.l0usid)),
      }));

      // Batch insert
      const CHUNK = 500;
      setProgress({ current: 0, total: mapped.length });
      for (let i = 0; i < mapped.length; i += CHUNK) {
        const slice = mapped.slice(i, i + CHUNK);
        const { error } = await (supabase as any).from('mlf_data').insert(slice);
        if (error) throw error;
        setProgress({ current: Math.min(i + CHUNK, mapped.length), total: mapped.length });
      }

      setLastResult(`Berhasil mengunggah ${mapped.length.toLocaleString('id-ID')} baris untuk tanggal ${jobdate}.`);
      toast({ title: 'Upload Berhasil', description: `${mapped.length} baris data tersimpan.` });
      queryClient.invalidateQueries({ queryKey: ['mlf-uploads'] });
      refetch();
    } catch (e: any) {
      toast({ title: 'Upload Gagal', description: e.message || 'Terjadi kesalahan.', variant: 'destructive' });
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0 });
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async (uploadId: string, filename: string) => {
    if (!confirm(`Hapus data upload "${filename}"? Data terkait juga akan terhapus.`)) return;
    const { error } = await (supabase as any).from('mlf_uploads').delete().eq('id', uploadId);
    if (error) {
      toast({ title: 'Gagal Hapus', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Berhasil', description: 'Data upload dihapus.' });
    queryClient.invalidateQueries({ queryKey: ['mlf-uploads'] });
    refetch();
  };

  return (
    <MainLayout>
      <PageHeader
        title="Upload Data MLF"
        description="Upload file Master Loan Filter (.xls) — tanggal data mengikuti nama file (contoh: mlf_13-05-2026.xls)"
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Upload className="w-4 h-4 text-primary" />
            Pilih File MLF
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            ref={inputRef}
            type="file"
            accept=".xls,.xlsx"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-8 bg-muted/30">
            <FileSpreadsheet className="w-12 h-12 text-primary/60 mb-3" />
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Hanya sheet <strong>Master_Loan_Filter</strong> yang akan dibaca.<br />
              Tanggal diambil dari nama file (format: <code>mlf_DD-MM-YYYY.xls</code>).
            </p>
            <Button onClick={() => inputRef.current?.click()} disabled={isProcessing} size="lg">
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Memproses... {progress.total > 0 && `(${fmtNum(progress.current)}/${fmtNum(progress.total)})`}
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Pilih File .xls / .xlsx
                </>
              )}
            </Button>
            {lastResult && (
              <Alert className="mt-4 border-green-500/50 bg-green-500/10">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-700 dark:text-green-400">{lastResult}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Riwayat Upload</CardTitle>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-6 justify-center">
              <AlertCircle className="w-4 h-4" />
              Belum ada data yang diupload.
            </div>
          ) : (
            <div className="space-y-2">
              {uploads.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:bg-muted/30 transition">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{format(new Date(u.jobdate), 'dd MMMM yyyy', { locale: idLocale })}</p>
                      <p className="text-xs text-muted-foreground">
                        {u.filename} • {fmtNum(u.total_rows)} baris • diupload {format(new Date(u.created_at), 'dd/MM/yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(u.id, u.filename)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default UploadDataPage;
