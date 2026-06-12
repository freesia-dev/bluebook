import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addRekening, CSProduk, CSRekening, deleteRekening, getCifList, getNextRekeningNomor, getNextRekeningNumber, getRekeningList, PRODUK_LABELS, updateRekening, CSCif, addCif } from '@/lib/cs-store';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { CSImportButton, ImportMode, ImportResult } from '@/components/cs/CSImportButton';
import { asDate, asNumber, asString, pick } from '@/lib/cs-import-helpers';

interface Props {
  produk: CSProduk;
}

const RekeningPage: React.FC<Props> = ({ produk }) => {
  const { toast } = useToast();
  const { canEdit, userName } = useAuth();
  const [data, setData] = useState<CSRekening[]>([]);
  const [cifList, setCifList] = useState<CSCif[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<CSRekening | null>(null);
  const [form, setForm] = useState({
    nomor_urut: 1,
    nomor_rekening: '',
    cif: '',
    nama: '',
    tanggal_buka: new Date().toISOString().slice(0, 10),
    keterangan: '',
  });

  const load = async () => {
    setData(await getRekeningList(produk));
    setCifList(await getCifList());
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [produk]);

  const openAdd = async () => {
    const [nextNo, nextRek] = await Promise.all([getNextRekeningNomor(produk), getNextRekeningNumber(produk)]);
    setForm({
      nomor_urut: nextNo,
      nomor_rekening: nextRek,
      cif: '',
      nama: '',
      tanggal_buka: new Date().toISOString().slice(0, 10),
      keterangan: '',
    });
    setIsAddOpen(true);
  };

  const openEdit = (item: CSRekening) => {
    setSelected(item);
    setForm({
      nomor_urut: item.nomor_urut,
      nomor_rekening: item.nomor_rekening,
      cif: item.cif || '',
      nama: item.nama,
      tanggal_buka: item.tanggal_buka,
      keterangan: item.keterangan || '',
    });
    setIsEditOpen(true);
  };

  // Autofill nama when CIF matches master
  const onCifChange = (cifVal: string) => {
    const match = cifList.find((c) => c.cif === cifVal.trim());
    setForm((f) => ({ ...f, cif: cifVal, nama: match ? match.nama : f.nama }));
  };

  const buildPayload = () => {
    const match = cifList.find((c) => c.cif === form.cif.trim());
    return {
      produk,
      nomor_urut: form.nomor_urut,
      nomor_rekening: form.nomor_rekening,
      cif: form.cif || null,
      cif_id: match?.id || null,
      nama: form.nama,
      tanggal_buka: form.tanggal_buka,
      keterangan: form.keterangan || null,
      user_input: userName,
    };
  };

  const handleAdd = async () => {
    try {
      await addRekening(buildPayload());
      toast({ title: 'Berhasil', description: 'Rekening ditambahkan.' });
      setIsAddOpen(false);
      load();
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' });
    }
  };

  const handleEdit = async () => {
    if (!selected) return;
    try {
      await updateRekening(selected.id, buildPayload());
      toast({ title: 'Berhasil', description: 'Rekening diperbarui.' });
      setIsEditOpen(false);
      load();
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteRekening(selected.id);
    toast({ title: 'Berhasil', description: 'Rekening dihapus.' });
    setIsDeleteOpen(false);
    load();
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data.map((r) => ({
      'No': r.nomor_urut, 'Nomor Rekening': r.nomor_rekening, 'CIF': r.cif, 'Nama': r.nama,
      'Tanggal Buka': r.tanggal_buka, 'Keterangan': r.keterangan, 'User': r.user_input,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, PRODUK_LABELS[produk]);
    XLSX.writeFile(wb, `Rekening_${PRODUK_LABELS[produk].replace(/\s/g, '_')}.xlsx`);
  };

  const handleImport = async (rows: Record<string, unknown>[], mode: ImportMode): Promise<ImportResult> => {
    const res: ImportResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };
    const [existing, allCif] = await Promise.all([getRekeningList(produk), getCifList()]);
    const byRek = new Map(existing.map((r) => [r.nomor_rekening.trim(), r]));
    const cifMap = new Map(allCif.map((c) => [c.cif.trim(), c]));
    let nextNo = (existing.reduce((m, r) => Math.max(m, r.nomor_urut), 0)) + 1;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const nomor_rekening = asString(pick(row, 'Nomor Rekening', 'No Rekening', 'Norek'));
        const nama = asString(pick(row, 'Nama', 'Nama Nasabah'));
        if (!nomor_rekening || !nama) { res.errors.push(`Baris ${i + 2}: Nomor Rekening & Nama wajib`); continue; }
        const cif = asString(pick(row, 'CIF'));
        const tanggal_buka = asDate(pick(row, 'Tanggal Buka', 'Tanggal'));
        const keterangan = asString(pick(row, 'Keterangan')) || null;
        const nomor_urut = asNumber(pick(row, 'No', 'Nomor Urut')) || nextNo++;
        // Auto-create CIF stub if missing
        let cifMatch = cif ? cifMap.get(cif) : undefined;
        if (cif && !cifMatch) {
          try {
            await addCif({ nomor_urut: 0, cif, nama, tanggal_input: tanggal_buka, user_input: userName });
            const refreshed = await getCifList();
            cifMatch = refreshed.find((c) => c.cif === cif);
            if (cifMatch) cifMap.set(cif, cifMatch);
          } catch { /* ignore; stub creation best-effort */ }
        }
        const dup = byRek.get(nomor_rekening);
        if (dup && mode === 'skip') { res.skipped++; continue; }
        const payload = {
          produk, nomor_urut, nomor_rekening, cif: cif || null,
          cif_id: cifMatch?.id || null, nama, tanggal_buka, keterangan,
          user_input: userName,
        };
        if (dup && mode === 'update') {
          await updateRekening(dup.id, payload);
          res.updated++; continue;
        }
        await addRekening(payload);
        res.inserted++;
        byRek.set(nomor_rekening, { ...(dup || {} as CSRekening), ...payload } as CSRekening);
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
        <div className="space-y-1"><Label>Tanggal Buka</Label><Input type="date" value={form.tanggal_buka} onChange={(e) => setForm({ ...form, tanggal_buka: e.target.value })} /></div>
      </div>
      <div className="space-y-1"><Label>Nomor Rekening</Label><Input value={form.nomor_rekening} onChange={(e) => setForm({ ...form, nomor_rekening: e.target.value })} /></div>
      <div className="space-y-1"><Label>CIF</Label><Input value={form.cif} onChange={(e) => onCifChange(e.target.value)} placeholder="Ketik CIF, nama auto-terisi jika sudah terdaftar" /></div>
      <div className="space-y-1"><Label>Nama Nasabah</Label><Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
      <div className="space-y-1"><Label>Keterangan</Label><Textarea rows={2} value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} /></div>
    </div>
  );

  return (
    <MainLayout>
      <PageHeader title={`Register Rekening — ${PRODUK_LABELS[produk]}`} description="Daftar nomor rekening per produk tabungan" />
      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export Excel
        </Button>
      </div>
      <DataTable
        data={data}
        columns={[
          { key: 'nomor_urut', header: 'No' },
          { key: 'nomor_rekening', header: 'Nomor Rekening', filterable: true },
          { key: 'cif', header: 'CIF', filterable: true },
          { key: 'nama', header: 'Nama Nasabah', filterable: true },
          { key: 'tanggal_buka', header: 'Tanggal Buka' },
          { key: 'keterangan', header: 'Keterangan' },
          { key: 'user_input', header: 'User' },
        ]}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(item) => { setSelected(item); setIsDeleteOpen(true); }}
        addLabel="Tambah Rekening"
        canEdit={canEdit}
      />

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Tambah Rekening — {PRODUK_LABELS[produk]}</DialogTitle></DialogHeader>
          {FormBody}
          <DialogFooter><Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button><Button onClick={handleAdd}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Edit Rekening — {PRODUK_LABELS[produk]}</DialogTitle></DialogHeader>
          {FormBody}
          <DialogFooter><Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button><Button onClick={handleEdit}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Hapus Rekening?</AlertDialogTitle><AlertDialogDescription>Yakin ingin menghapus rekening ini?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default RekeningPage;
