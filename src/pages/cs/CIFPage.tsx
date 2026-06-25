import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addCif, CSCif, deleteCif, getCifList, getNextCifNomor, getNextCifText, updateCif } from '@/lib/cs-store';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { CSImportButton, ImportMode, ImportResult } from '@/components/cs/CSImportButton';
import { CSDeleteAllButton } from '@/components/cs/CSDeleteAllButton';
import { asDate, asNumber, asString, pick } from '@/lib/cs-import-helpers';

const CIFPage: React.FC = () => {
  const { toast } = useToast();
  const { canEdit, userName } = useAuth();
  const [data, setData] = useState<CSCif[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<CSCif | null>(null);
  const [form, setForm] = useState({ nomor_urut: 1, cif: '', nama: '', tanggal_input: new Date().toISOString().slice(0, 10) });

  const load = async () => setData(await getCifList());
  useEffect(() => { load(); }, []);

  const openAdd = async () => {
    const [next, nextCif] = await Promise.all([getNextCifNomor(), getNextCifText()]);
    setForm({ nomor_urut: next, cif: nextCif, nama: '', tanggal_input: new Date().toISOString().slice(0, 10) });
    setIsAddOpen(true);
  };

  const openEdit = (item: CSCif) => {
    setSelected(item);
    setForm({ nomor_urut: item.nomor_urut, cif: item.cif, nama: item.nama, tanggal_input: item.tanggal_input });
    setIsEditOpen(true);
  };

  const handleAdd = async () => {
    try {
      await addCif({ ...form, user_input: userName });
      toast({ title: 'Berhasil', description: 'CIF berhasil ditambahkan.' });
      setIsAddOpen(false);
      load();
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' });
    }
  };

  const handleEdit = async () => {
    if (!selected) return;
    try {
      await updateCif(selected.id, form);
      toast({ title: 'Berhasil', description: 'CIF diperbarui.' });
      setIsEditOpen(false);
      load();
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteCif(selected.id);
    toast({ title: 'Berhasil', description: 'CIF dihapus.' });
    setIsDeleteOpen(false);
    load();
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data.map((r) => ({
      'No': r.nomor_urut, 'CIF': r.cif, 'Nama': r.nama, 'Tanggal Input': r.tanggal_input, 'User': r.user_input,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'CIF');
    XLSX.writeFile(wb, 'CIF_Nasabah.xlsx');
  };

  const handleImport = async (rows: Record<string, unknown>[], mode: ImportMode): Promise<ImportResult> => {
    const res: ImportResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };
    const existing = await getCifList();
    const byCif = new Map(existing.map((r) => [r.cif.trim(), r]));
    let nextNo = (existing.reduce((m, r) => Math.max(m, r.nomor_urut), 0)) + 1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const cif = asString(pick(row, 'CIF'));
        const nama = asString(pick(row, 'Nama', 'Nama Nasabah'));
        if (!cif || !nama) { res.errors.push(`Baris ${i + 2}: CIF & Nama wajib`); continue; }
        const tanggal_input = asDate(pick(row, 'Tanggal Input', 'Tanggal'));
        const nomor_urut = asNumber(pick(row, 'No', 'Nomor Urut')) || nextNo++;
        const dup = byCif.get(cif);
        if (dup && mode === 'skip') { res.skipped++; continue; }
        if (dup && mode === 'update') {
          await updateCif(dup.id, { nama, tanggal_input, nomor_urut });
          res.updated++; continue;
        }
        await addCif({ nomor_urut, cif, nama, tanggal_input, user_input: userName });
        res.inserted++;
        byCif.set(cif, { ...(dup || {} as CSCif), nomor_urut, cif, nama, tanggal_input } as CSCif);
      } catch (e: unknown) {
        res.errors.push(`Baris ${i + 2}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return res;
  };

  return (
    <MainLayout>
      <PageHeader title="CIF Nasabah" description="Master Customer Information File" />
      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export Excel
        </Button>
        <CSImportButton
          templateName="Template_CIF"
          sheetName="CIF"
          columns={[
            { header: 'No', example: 1 },
            { header: 'CIF', example: '1234567890', required: true },
            { header: 'Nama', example: 'BUDI SANTOSO', required: true },
            { header: 'Tanggal Input', example: '2024-01-15' },
          ]}
          notes="CIF wajib unik. Mode 'Skip' melewati CIF yang sudah ada, 'Update' mengganti nama/tanggal."
          onImport={handleImport}
          onDone={load}
        />
        <CSDeleteAllButton table="cs_cif" label="CIF Nasabah" onDone={load} />
      </div>
      <DataTable
        data={data}
        columns={[
          { key: 'nomor_urut', header: 'No' },
          { key: 'cif', header: 'CIF', filterable: true },
          { key: 'nama', header: 'Nama Nasabah', filterable: true },
          { key: 'tanggal_input', header: 'Tanggal Input' },
          { key: 'user_input', header: 'User Input' },
        ]}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(item) => { setSelected(item); setIsDeleteOpen(true); }}
        addLabel="Tambah CIF"
        canEdit={canEdit}
      />

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Tambah CIF</DialogTitle></DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1"><Label>Nomor Urut</Label><Input type="number" value={form.nomor_urut} onChange={(e) => setForm({ ...form, nomor_urut: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label>CIF</Label><Input value={form.cif} onChange={(e) => setForm({ ...form, cif: e.target.value })} placeholder="Auto-suggest CIF terakhir +1, bisa diubah" /></div>
            <div className="space-y-1"><Label>Nama Nasabah</Label><Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
            <div className="space-y-1"><Label>Tanggal Input</Label><Input type="date" value={form.tanggal_input} onChange={(e) => setForm({ ...form, tanggal_input: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button><Button onClick={handleAdd}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit CIF</DialogTitle></DialogHeader>
          <div className="space-y-3 py-3">
            <div className="space-y-1"><Label>Nomor Urut</Label><Input type="number" value={form.nomor_urut} onChange={(e) => setForm({ ...form, nomor_urut: Number(e.target.value) })} /></div>
            <div className="space-y-1"><Label>CIF</Label><Input value={form.cif} onChange={(e) => setForm({ ...form, cif: e.target.value })} /></div>
            <div className="space-y-1"><Label>Nama Nasabah</Label><Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
            <div className="space-y-1"><Label>Tanggal Input</Label><Input type="date" value={form.tanggal_input} onChange={(e) => setForm({ ...form, tanggal_input: e.target.value })} /></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button><Button onClick={handleEdit}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus CIF?</AlertDialogTitle><AlertDialogDescription>Yakin ingin menghapus CIF ini?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default CIFPage;
