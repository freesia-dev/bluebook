import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, FileDown, Loader2 } from 'lucide-react';

export type ImportMode = 'skip' | 'update' | 'duplicate';

export interface ImportColumn {
  /** Header text in the template (exact match used for parsing) */
  header: string;
  /** Example value shown in template row 2 */
  example?: string | number;
  /** Required field; rows missing it will be flagged */
  required?: boolean;
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  errors: string[];
}

interface Props {
  templateName: string;
  sheetName: string;
  columns: ImportColumn[];
  /** Notes shown above the table in the dialog (one short paragraph) */
  notes?: string;
  /** Whether dedupe modes (skip/update) are meaningful for this table */
  supportsDedupe?: boolean;
  /** Caller does the actual import. Must return counts + per-row errors. */
  onImport: (rows: Record<string, unknown>[], mode: ImportMode) => Promise<ImportResult>;
  onDone?: () => void;
}

export const CSImportButton: React.FC<Props> = ({
  templateName, sheetName, columns, notes, supportsDedupe = true, onImport, onDone,
}) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ImportMode>('skip');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Record<string, unknown>[] | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = columns.map((c) => c.header);
    const exampleRow = columns.map((c) => c.example ?? '');
    const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
    // Bold header (best effort)
    headers.forEach((_, i) => {
      const addr = XLSX.utils.encode_cell({ r: 0, c: i });
      if (ws[addr]) ws[addr].s = { font: { bold: true } };
    });
    ws['!cols'] = headers.map((h) => ({ wch: Math.max(14, h.length + 2) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${templateName}.xlsx`);
  };

  const onFile = async (file: File) => {
    setResult(null);
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array', cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false });
    // Skip the example row if it matches the example values (very loose check)
    const cleaned = rows.filter((r) => {
      // Drop fully empty rows
      return Object.values(r).some((v) => String(v ?? '').trim() !== '');
    });
    setPreview(cleaned);
  };

  const handleImport = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const res = await onImport(preview, mode);
      setResult(res);
      toast({
        title: 'Import selesai',
        description: `${res.inserted} ditambah · ${res.updated} diperbarui · ${res.skipped} dilewati${res.errors.length ? ` · ${res.errors.length} error` : ''}`,
      });
      onDone?.();
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: 'Gagal import', description: msg, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => { setPreview(null); setResult(null); if (fileRef.current) fileRef.current.value = ''; };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4 mr-2" /> Import Excel
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Import {sheetName}</DialogTitle>
            <DialogDescription>
              Download template terlebih dahulu, isi sesuai kolom, lalu upload kembali. Format kolom harus sama persis dengan template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {notes && <p className="text-sm text-muted-foreground">{notes}</p>}

            <div className="rounded-lg border p-3">
              <div className="text-xs font-medium mb-2">Kolom Template</div>
              <div className="flex flex-wrap gap-1.5">
                {columns.map((c) => (
                  <Badge key={c.header} variant={c.required ? 'default' : 'secondary'}>
                    {c.header}{c.required ? ' *' : ''}
                  </Badge>
                ))}
              </div>
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={downloadTemplate}>
                  <FileDown className="h-4 w-4 mr-2" /> Download Template
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pilih file Excel (.xlsx)</Label>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
                className="block w-full text-sm file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>

            {supportsDedupe && (
              <div className="space-y-2">
                <Label>Jika data sudah ada (duplikat)</Label>
                <RadioGroup value={mode} onValueChange={(v) => setMode(v as ImportMode)}>
                  <div className="flex items-center gap-2"><RadioGroupItem value="skip" id="m-skip" /><Label htmlFor="m-skip" className="font-normal">Skip duplikat (aman)</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="update" id="m-upd" /><Label htmlFor="m-upd" className="font-normal">Update data lama dengan isi dari Excel</Label></div>
                  <div className="flex items-center gap-2"><RadioGroupItem value="duplicate" id="m-dup" /><Label htmlFor="m-dup" className="font-normal">Tetap insert (boleh ada duplikat)</Label></div>
                </RadioGroup>
              </div>
            )}

            {preview && (
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="text-sm">Terdeteksi <b>{preview.length}</b> baris siap diimport.</div>
              </div>
            )}

            {result && (
              <div className="rounded-lg border p-3 space-y-1 text-sm">
                <div>✅ Ditambah: <b>{result.inserted}</b></div>
                <div>♻️ Diperbarui: <b>{result.updated}</b></div>
                <div>⏭️ Dilewati: <b>{result.skipped}</b></div>
                {result.errors.length > 0 && (
                  <div className="text-destructive">
                    ⚠️ Error ({result.errors.length}):
                    <ul className="list-disc pl-5 max-h-32 overflow-auto text-xs">
                      {result.errors.slice(0, 20).map((e, i) => <li key={i}>{e}</li>)}
                      {result.errors.length > 20 && <li>… dan {result.errors.length - 20} lainnya</li>}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>Tutup</Button>
            <Button onClick={handleImport} disabled={!preview || busy}>
              {busy ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Mengimport…</> : <><Download className="h-4 w-4 mr-2 rotate-180" /> Import Sekarang</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
