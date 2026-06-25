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
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addBilyet, CSBilyet, CSDepositoStatus, deleteBilyet, getBilyetList, getNextBilyetNomor, updateBilyet } from '@/lib/cs-store';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { CSImportButton, ImportMode, ImportResult } from '@/components/cs/CSImportButton';
import { CSDeleteAllButton } from '@/components/cs/CSDeleteAllButton';
import { asDate, asNumber, asString, pick } from '@/lib/cs-import-helpers';

const STATUS_LABELS: Record<CSDepositoStatus, string> = { aktif: 'Aktif', cair: 'Cair', pindah: 'Pindah' };

const BilyetDepositoPage: React.FC = () => {
  const { toast } = useToast();
  const { canEdit, userName } = useAuth();
  const [data, setData] = useState<CSBilyet[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<CSBilyet | null>(null);
  const [form, setForm] = useState({
    nomor_urut: 1, nomor_bilyet: '', cif: '', nama: '', nominal: 0, jangka_waktu_bulan: 12,
    tanggal_terbit: new Date().toISOString().slice(0, 10), tanggal_jatuh_tempo: '',
    status: 'aktif' as CSDepositoStatus, keterangan: '',
  });

  const load = async () => setData(await getBilyetList());
  useEffect(() => { load(); }, []);

  const openAdd = async () => {
    const next = await getNextBilyetNomor();
    setForm({
      nomor_urut: next, nomor_bilyet: '', cif: '', nama: '', nominal: 0, jangka_waktu_bulan: 12,
      tanggal_terbit: new Date().toISOString().slice(0, 10), tanggal_jatuh_tempo: '',
      status: 'aktif', keterangan: '',
    });
    setIsAddOpen(true);
  };
  const openEdit = (item: CSBilyet) => {
    setSelected(item);
    setForm({
      nomor_urut: item.nomor_urut, nomor_bilyet: item.nomor_bilyet, cif: item.cif || '', nama: item.nama,
      nominal: Number(item.nominal), jangka_waktu_bulan: item.jangka_waktu_bulan || 12,
      tanggal_terbit: item.tanggal_terbit, tanggal_jatuh_tempo: item.tanggal_jatuh_tempo || '',
      status: item.status, keterangan: item.keterangan || '',
    });
    setIsEditOpen(true);
  };

  const buildPayload = () => ({
    nomor_urut: form.nomor_urut, nomor_bilyet: form.nomor_bilyet,
    cif: form.cif || null, nama: form.nama, nominal: form.nominal,
    jangka_waktu_bulan: form.jangka_waktu_bulan || null,
    tanggal_terbit: form.tanggal_terbit,
    tanggal_jatuh_tempo: form.tanggal_jatuh_tempo || null,
    status: form.status, keterangan: form.keterangan || null, user_input: userName,
  });

  const handleAdd = async () => {
    try { await addBilyet(buildPayload()); toast({ title: 'Berhasil', description: 'Bilyet ditambahkan.' }); setIsAddOpen(false); load(); }
    catch (e: any) { toast({ title: 'Gagal', description: e.message, variant: 'destructive' }); }
  };
  const handleEdit = async () => {
    if (!selected) return;
    try { await updateBilyet(selected.id, buildPayload()); toast({ title: 'Berhasil', description: 'Diperbarui.' }); setIsEditOpen(false); load(); }
    catch (e: any) { toast({ title: 'Gagal', description: e.message, variant: 'destructive' }); }
  };
  const handleDelete = async () => {
    if (!selected) return;
    await deleteBilyet(selected.id);
    toast({ title: 'Berhasil', description: 'Dihapus.' });
    setIsDeleteOpen(false); load();
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data.map((r) => ({
      'No': r.nomor_urut, 'Nomor Bilyet': r.nomor_bilyet, 'CIF': r.cif, 'Nama': r.nama,
      'Nominal': r.nominal, 'Jangka Waktu (bln)': r.jangka_waktu_bulan,
      'Tanggal Terbit': r.tanggal_terbit, 'Jatuh Tempo': r.tanggal_jatuh_tempo,
      'Status': STATUS_LABELS[r.status], 'Keterangan': r.keterangan, 'User': r.user_input,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bilyet Deposito');
    XLSX.writeFile(wb, 'Register_Bilyet_Deposito.xlsx');
  };

  const handleImport = async (rows: Record<string, unknown>[], mode: ImportMode): Promise<ImportResult> => {
    const res: ImportResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };
    const existing = await getBilyetList();
    const byNomor = new Map(existing.map((r) => [r.nomor_bilyet.trim(), r]));
    let nextNo = (existing.reduce((m, r) => Math.max(m, r.nomor_urut), 0)) + 1;
    const statusLookup: Record<string, CSDepositoStatus> = { aktif: 'aktif', cair: 'cair', pindah: 'pindah' };
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const nomor_bilyet = asString(pick(row, 'Nomor Bilyet'));
        const nama = asString(pick(row, 'Nama', 'Nama Nasabah'));
        if (!nomor_bilyet || !nama) { res.errors.push(`Baris ${i + 2}: Nomor Bilyet & Nama wajib`); continue; }
        const statusRaw = asString(pick(row, 'Status')).toLowerCase();
        const payload = {
          nomor_urut: asNumber(pick(row, 'No', 'Nomor Urut')) || nextNo++,
          nomor_bilyet,
          cif: asString(pick(row, 'CIF')) || null,
          nama,
          nominal: asNumber(pick(row, 'Nominal')),
          jangka_waktu_bulan: asNumber(pick(row, 'Jangka Waktu (bln)', 'Jangka Waktu', 'JW')) || null,
          tanggal_terbit: asDate(pick(row, 'Tanggal Terbit', 'Terbit')),
          tanggal_jatuh_tempo: asString(pick(row, 'Jatuh Tempo', 'Tanggal Jatuh Tempo')) ? asDate(pick(row, 'Jatuh Tempo', 'Tanggal Jatuh Tempo')) : null,
          status: (statusLookup[statusRaw] || 'aktif') as CSDepositoStatus,
          keterangan: asString(pick(row, 'Keterangan')) || null,
          user_input: userName,
        };
        const dup = byNomor.get(nomor_bilyet);
        if (dup && mode === 'skip') { res.skipped++; continue; }
        if (dup && mode === 'update') { await updateBilyet(dup.id, payload); res.updated++; continue; }
        await addBilyet(payload);
        res.inserted++;
        byNomor.set(nomor_bilyet, { ...(dup || {} as CSBilyet), ...payload } as CSBilyet);
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
        <div className="space-y-1"><Label>Nomor Bilyet</Label><Input value={form.nomor_bilyet} onChange={(e) => setForm({ ...form, nomor_bilyet: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>CIF</Label><Input value={form.cif} onChange={(e) => setForm({ ...form, cif: e.target.value })} /></div>
        <div className="space-y-1"><Label>Nama Nasabah</Label><Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Nominal</Label><Input type="number" value={form.nominal} onChange={(e) => setForm({ ...form, nominal: Number(e.target.value) })} /></div>
        <div className="space-y-1"><Label>Jangka Waktu (bulan)</Label><Input type="number" value={form.jangka_waktu_bulan} onChange={(e) => setForm({ ...form, jangka_waktu_bulan: Number(e.target.value) })} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Tanggal Terbit</Label><Input type="date" value={form.tanggal_terbit} onChange={(e) => setForm({ ...form, tanggal_terbit: e.target.value })} /></div>
        <div className="space-y-1"><Label>Jatuh Tempo</Label><Input type="date" value={form.tanggal_jatuh_tempo} onChange={(e) => setForm({ ...form, tanggal_jatuh_tempo: e.target.value })} /></div>
      </div>
      <div className="space-y-1">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as CSDepositoStatus })}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {(['aktif','cair','pindah'] as CSDepositoStatus[]).map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1"><Label>Keterangan</Label><Textarea rows={2} value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} /></div>
    </div>
  );

  return (
    <MainLayout>
      <PageHeader title="Register Bilyet Deposito" description="Daftar bilyet deposito keluar" />
      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export Excel
        </Button>
        <CSImportButton
          templateName="Template_Bilyet_Deposito"
          sheetName="Bilyet Deposito"
          columns={[
            { header: 'No', example: 1 },
            { header: 'Nomor Bilyet', example: 'BD-0001', required: true },
            { header: 'CIF', example: '1234567890' },
            { header: 'Nama', example: 'BUDI SANTOSO', required: true },
            { header: 'Nominal', example: 10000000, required: true },
            { header: 'Jangka Waktu (bln)', example: 12 },
            { header: 'Tanggal Terbit', example: '2024-01-15' },
            { header: 'Jatuh Tempo', example: '2025-01-15' },
            { header: 'Status', example: 'aktif' },
            { header: 'Keterangan', example: '' },
          ]}
          notes="Nomor Bilyet wajib unik. Status: aktif / cair / pindah."
          onImport={handleImport}
          onDone={load}
        />
        <CSDeleteAllButton table="cs_bilyet_deposito" label="Bilyet Deposito" onDone={load} />
      </div>
      <DataTable
        data={data}
        columns={[
          { key: 'nomor_urut', header: 'No' },
          { key: 'nomor_bilyet', header: 'Nomor Bilyet', filterable: true },
          { key: 'cif', header: 'CIF', filterable: true },
          { key: 'nama', header: 'Nama' },
          { key: 'nominal', header: 'Nominal', render: (r) => `Rp ${Number(r.nominal).toLocaleString('id-ID')}` },
          { key: 'jangka_waktu_bulan', header: 'JW (bln)' },
          { key: 'tanggal_terbit', header: 'Terbit' },
          { key: 'tanggal_jatuh_tempo', header: 'Jatuh Tempo' },
          { key: 'status', header: 'Status', filterable: true, render: (r) => (
            <Badge variant={r.status === 'aktif' ? 'default' : r.status === 'cair' ? 'secondary' : 'outline'}>{STATUS_LABELS[r.status]}</Badge>
          ) },
        ]}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(item) => { setSelected(item); setIsDeleteOpen(true); }}
        addLabel="Tambah Bilyet"
        canEdit={canEdit}
      />

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Tambah Bilyet Deposito</DialogTitle></DialogHeader>{FormBody}
          <DialogFooter><Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button><Button onClick={handleAdd}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg"><DialogHeader><DialogTitle>Edit Bilyet Deposito</DialogTitle></DialogHeader>{FormBody}
          <DialogFooter><Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button><Button onClick={handleEdit}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus Bilyet?</AlertDialogTitle><AlertDialogDescription>Yakin?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default BilyetDepositoPage;
