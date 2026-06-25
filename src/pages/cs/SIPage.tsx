import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addSi, CSSi, deleteSi, getNextSiNomor, getSiList, updateSi } from '@/lib/cs-store';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { CSImportButton, ImportMode, ImportResult } from '@/components/cs/CSImportButton';
import { CSDeleteAllButton } from '@/components/cs/CSDeleteAllButton';
import { asDate, asNumber, asString, pick } from '@/lib/cs-import-helpers';

const emptyForm = {
  nomor_urut: 1,
  kode_si: '',
  rekening_debet: '',
  rekening_kredit: '',
  nama_nasabah: '',
  nominal: 0,
  tanggal_mulai: new Date().toISOString().slice(0, 10),
  tanggal_berakhir: '',
  status: 'aktif',
  keterangan: '',
};

const SIPage: React.FC = () => {
  const { toast } = useToast();
  const { canEdit, userName } = useAuth();
  const [data, setData] = useState<CSSi[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<CSSi | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = async () => setData(await getSiList());
  useEffect(() => { load(); }, []);

  const openAdd = async () => {
    const next = await getNextSiNomor();
    setForm({ ...emptyForm, nomor_urut: next });
    setIsAddOpen(true);
  };

  const openEdit = (item: CSSi) => {
    setSelected(item);
    setForm({
      nomor_urut: item.nomor_urut, kode_si: item.kode_si,
      rekening_debet: item.rekening_debet, rekening_kredit: item.rekening_kredit,
      nama_nasabah: item.nama_nasabah || '', nominal: item.nominal,
      tanggal_mulai: item.tanggal_mulai, tanggal_berakhir: item.tanggal_berakhir || '',
      status: item.status, keterangan: item.keterangan || '',
    });
    setIsEditOpen(true);
  };

  const buildPayload = () => ({
    nomor_urut: form.nomor_urut, kode_si: form.kode_si.trim(),
    rekening_debet: form.rekening_debet.trim(), rekening_kredit: form.rekening_kredit.trim(),
    nama_nasabah: form.nama_nasabah || null, nominal: Number(form.nominal) || 0,
    tanggal_mulai: form.tanggal_mulai, tanggal_berakhir: form.tanggal_berakhir || null,
    status: form.status, keterangan: form.keterangan || null, user_input: userName,
  });

  const handleAdd = async () => {
    try { await addSi(buildPayload()); toast({ title: 'Berhasil', description: 'SI ditambahkan.' }); setIsAddOpen(false); load(); }
    catch (e: any) { toast({ title: 'Gagal', description: e.message, variant: 'destructive' }); }
  };
  const handleEdit = async () => {
    if (!selected) return;
    try { await updateSi(selected.id, buildPayload()); toast({ title: 'Berhasil', description: 'Diperbarui.' }); setIsEditOpen(false); load(); }
    catch (e: any) { toast({ title: 'Gagal', description: e.message, variant: 'destructive' }); }
  };
  const handleDelete = async () => {
    if (!selected) return;
    await deleteSi(selected.id);
    toast({ title: 'Berhasil', description: 'Dihapus.' });
    setIsDeleteOpen(false); load();
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data.map((r) => ({
      'No': r.nomor_urut, 'Kode SI': r.kode_si, 'Rekening Debet': r.rekening_debet,
      'Rekening Kredit': r.rekening_kredit, 'Nama': r.nama_nasabah, 'Nominal': r.nominal,
      'Tanggal Mulai': r.tanggal_mulai, 'Tanggal Berakhir': r.tanggal_berakhir, 'Status': r.status,
      'Keterangan': r.keterangan, 'User': r.user_input,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'SI');
    XLSX.writeFile(wb, 'Standing_Instruction.xlsx');
  };

  const handleImport = async (rows: Record<string, unknown>[], mode: ImportMode): Promise<ImportResult> => {
    const res: ImportResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };
    const existing = await getSiList();
    const byKode = new Map(existing.map((r) => [r.kode_si.trim(), r]));
    let nextNo = (existing.reduce((m, r) => Math.max(m, r.nomor_urut), 0)) + 1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const kode_si = asString(pick(row, 'Kode SI'));
        const rekening_debet = asString(pick(row, 'Rekening Debet', 'Rek Debet'));
        const rekening_kredit = asString(pick(row, 'Rekening Kredit', 'Rek Kredit'));
        if (!kode_si || !rekening_debet || !rekening_kredit) { res.errors.push(`Baris ${i + 2}: Kode SI & Rekening Debet/Kredit wajib`); continue; }
        const payload = {
          nomor_urut: asNumber(pick(row, 'No', 'Nomor Urut')) || nextNo++,
          kode_si, rekening_debet, rekening_kredit,
          nama_nasabah: asString(pick(row, 'Nama', 'Nama Nasabah')) || null,
          nominal: asNumber(pick(row, 'Nominal')),
          tanggal_mulai: asDate(pick(row, 'Tanggal Mulai', 'Mulai')),
          tanggal_berakhir: asString(pick(row, 'Tanggal Berakhir', 'Berakhir')) ? asDate(pick(row, 'Tanggal Berakhir', 'Berakhir')) : null,
          status: asString(pick(row, 'Status')) || 'aktif',
          keterangan: asString(pick(row, 'Keterangan')) || null,
          user_input: userName,
        };
        const dup = byKode.get(kode_si);
        if (dup && mode === 'skip') { res.skipped++; continue; }
        if (dup && mode === 'update') { await updateSi(dup.id, payload); res.updated++; continue; }
        await addSi(payload);
        res.inserted++;
        byKode.set(kode_si, { ...(dup || {} as CSSi), ...payload } as CSSi);
      } catch (e: unknown) {
        res.errors.push(`Baris ${i + 2}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return res;
  };

  const FormBody = (
    <div className="space-y-3 py-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Nomor Urut</Label><Input type="number" value={form.nomor_urut} onChange={(e) => setForm({ ...form, nomor_urut: Number(e.target.value) })} /></div>
        <div className="space-y-1"><Label>Kode SI</Label><Input value={form.kode_si} onChange={(e) => setForm({ ...form, kode_si: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Rekening Debet</Label><Input value={form.rekening_debet} onChange={(e) => setForm({ ...form, rekening_debet: e.target.value })} /></div>
        <div className="space-y-1"><Label>Rekening Kredit</Label><Input value={form.rekening_kredit} onChange={(e) => setForm({ ...form, rekening_kredit: e.target.value })} /></div>
      </div>
      <div className="space-y-1"><Label>Nama Nasabah</Label><Input value={form.nama_nasabah} onChange={(e) => setForm({ ...form, nama_nasabah: e.target.value })} /></div>
      <div className="space-y-1"><Label>Nominal</Label><Input type="number" value={form.nominal} onChange={(e) => setForm({ ...form, nominal: Number(e.target.value) })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Tanggal Mulai</Label><Input type="date" value={form.tanggal_mulai} onChange={(e) => setForm({ ...form, tanggal_mulai: e.target.value })} /></div>
        <div className="space-y-1"><Label>Tanggal Berakhir</Label><Input type="date" value={form.tanggal_berakhir} onChange={(e) => setForm({ ...form, tanggal_berakhir: e.target.value })} /></div>
      </div>
      <div className="space-y-1">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="aktif">Aktif</SelectItem>
            <SelectItem value="nonaktif">Nonaktif</SelectItem>
            <SelectItem value="selesai">Selesai</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label>Keterangan</Label><Textarea rows={2} value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} /></div>
    </div>
  );

  return (
    <MainLayout>
      <PageHeader title="Standing Instruction (SI)" description="Autodebet terjadwal dari rekening debet ke rekening kredit" />
      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export Excel
        </Button>
        <CSImportButton
          templateName="Template_SI"
          sheetName="SI"
          columns={[
            { header: 'No', example: 1 },
            { header: 'Kode SI', example: 'SI-001', required: true },
            { header: 'Rekening Debet', example: '0010203040', required: true },
            { header: 'Rekening Kredit', example: '0010203050', required: true },
            { header: 'Nama', example: 'BUDI SANTOSO' },
            { header: 'Nominal', example: 500000 },
            { header: 'Tanggal Mulai', example: '2024-01-01' },
            { header: 'Tanggal Berakhir', example: '2025-12-31' },
            { header: 'Status', example: 'aktif' },
            { header: 'Keterangan', example: '' },
          ]}
          notes="Kode SI wajib unik. Status: aktif / nonaktif / selesai."
          onImport={handleImport}
          onDone={load}
        />
        <CSDeleteAllButton table="cs_si" label="Standing Instruction" onDone={load} />
      </div>
      <DataTable
        data={data}
        columns={[
          { key: 'nomor_urut', header: 'No' },
          { key: 'kode_si', header: 'Kode SI', filterable: true },
          { key: 'rekening_debet', header: 'Rek. Debet', filterable: true },
          { key: 'rekening_kredit', header: 'Rek. Kredit', filterable: true },
          { key: 'nama_nasabah', header: 'Nama' },
          { key: 'nominal', header: 'Nominal', render: (r) => r.nominal?.toLocaleString('id-ID') },
          { key: 'tanggal_mulai', header: 'Mulai' },
          { key: 'tanggal_berakhir', header: 'Berakhir' },
          { key: 'status', header: 'Status', filterable: true },
          { key: 'user_input', header: 'User' },
        ]}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(item) => { setSelected(item); setIsDeleteOpen(true); }}
        addLabel="Tambah SI"
        canEdit={canEdit}
      />

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Tambah Standing Instruction</DialogTitle></DialogHeader>{FormBody}
          <DialogFooter><Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button><Button onClick={handleAdd}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Edit Standing Instruction</DialogTitle></DialogHeader>{FormBody}
          <DialogFooter><Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button><Button onClick={handleEdit}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus SI?</AlertDialogTitle><AlertDialogDescription>Yakin?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default SIPage;
