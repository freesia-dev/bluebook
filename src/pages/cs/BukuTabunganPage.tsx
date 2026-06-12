import React, { useEffect, useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addBuku, BUKU_PRODUK_LABELS, CSBukuProduk, CSBukuTabungan, CSMutasiTipe, deleteBuku, getBukuList, updateBuku } from '@/lib/cs-store';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { CSImportButton, ImportMode, ImportResult } from '@/components/cs/CSImportButton';
import { asDate, asNumber, asString, pick } from '@/lib/cs-import-helpers';

const BukuTabunganPage: React.FC = () => {
  const { toast } = useToast();
  const { canEdit, userName } = useAuth();
  const [data, setData] = useState<CSBukuTabungan[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<CSBukuTabungan | null>(null);
  const [form, setForm] = useState({
    tipe: 'masuk' as CSMutasiTipe, produk: 'simpeda' as CSBukuProduk, jumlah: 1,
    tanggal: new Date().toISOString().slice(0, 10),
    cif: '', nama: '', nomor_rekening: '', nomor_seri: '', keterangan: '',
  });

  const load = async () => setData(await getBukuList());
  useEffect(() => { load(); }, []);

  // Sisa per produk
  const sisaPerProduk = useMemo(() => {
    const acc: Record<string, number> = {};
    for (const r of data) {
      const key = r.produk || 'lainnya';
      acc[key] = (acc[key] || 0) + (r.tipe === 'masuk' ? r.jumlah : -r.jumlah);
    }
    return acc;
  }, [data]);

  const openAdd = () => {
    setForm({ tipe: 'masuk', produk: 'simpeda', jumlah: 1, tanggal: new Date().toISOString().slice(0, 10), cif: '', nama: '', nomor_rekening: '', nomor_seri: '', keterangan: '' });
    setIsAddOpen(true);
  };
  const openEdit = (item: CSBukuTabungan) => {
    setSelected(item);
    setForm({
      tipe: item.tipe, produk: (item.produk || 'simpeda') as CSBukuProduk, jumlah: item.jumlah, tanggal: item.tanggal,
      cif: item.cif || '', nama: item.nama || '', nomor_rekening: item.nomor_rekening || '',
      nomor_seri: item.nomor_seri || '', keterangan: item.keterangan || '',
    });
    setIsEditOpen(true);
  };

  const buildPayload = () => ({
    tipe: form.tipe, produk: form.produk, jumlah: form.jumlah, tanggal: form.tanggal,
    cif: form.cif || null, nama: form.nama || null, nomor_rekening: form.nomor_rekening || null,
    nomor_seri: form.nomor_seri || null,
    keterangan: form.keterangan || null, user_input: userName,
  });

  const handleAdd = async () => {
    try { await addBuku(buildPayload()); toast({ title: 'Berhasil', description: 'Data ditambahkan.' }); setIsAddOpen(false); load(); }
    catch (e: any) { toast({ title: 'Gagal', description: e.message, variant: 'destructive' }); }
  };
  const handleEdit = async () => {
    if (!selected) return;
    try { await updateBuku(selected.id, buildPayload()); toast({ title: 'Berhasil', description: 'Diperbarui.' }); setIsEditOpen(false); load(); }
    catch (e: any) { toast({ title: 'Gagal', description: e.message, variant: 'destructive' }); }
  };
  const handleDelete = async () => {
    if (!selected) return;
    await deleteBuku(selected.id);
    toast({ title: 'Berhasil', description: 'Dihapus.' });
    setIsDeleteOpen(false); load();
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data.map((r) => ({
      'Tanggal': r.tanggal, 'Tipe': r.tipe, 'Produk': r.produk ? BUKU_PRODUK_LABELS[r.produk] : '',
      'Jumlah': r.jumlah, 'Nomor Seri': r.nomor_seri, 'CIF': r.cif, 'Nama': r.nama,
      'Rekening': r.nomor_rekening, 'Keterangan': r.keterangan, 'User': r.user_input,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Buku Tabungan');
    XLSX.writeFile(wb, 'Register_Buku_Tabungan.xlsx');
  };

  const handleImport = async (rows: Record<string, unknown>[]): Promise<ImportResult> => {
    const res: ImportResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };
    const produkLookup = new Map<string, CSBukuProduk>();
    (Object.keys(BUKU_PRODUK_LABELS) as CSBukuProduk[]).forEach((k) => {
      produkLookup.set(k.toLowerCase(), k);
      produkLookup.set(BUKU_PRODUK_LABELS[k].toLowerCase(), k);
    });
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const tipeRaw = asString(pick(row, 'Tipe')).toLowerCase();
        const tipe: CSMutasiTipe = tipeRaw.startsWith('kel') ? 'keluar' : 'masuk';
        const produkRaw = asString(pick(row, 'Produk')).toLowerCase();
        const produk = produkLookup.get(produkRaw) || null;
        if (!produk) { res.errors.push(`Baris ${i + 2}: Produk tidak dikenali (${asString(pick(row, 'Produk'))})`); continue; }
        const jumlah = asNumber(pick(row, 'Jumlah')) || 1;
        const tanggal = asDate(pick(row, 'Tanggal'));
        await addBuku({
          tipe, produk, jumlah, tanggal,
          cif: asString(pick(row, 'CIF')) || null,
          nama: asString(pick(row, 'Nama')) || null,
          nomor_rekening: asString(pick(row, 'Rekening', 'Nomor Rekening')) || null,
          nomor_seri: asString(pick(row, 'Nomor Seri', 'No Seri')) || null,
          keterangan: asString(pick(row, 'Keterangan')) || null,
          user_input: userName,
        });
        res.inserted++;
      } catch (e: unknown) {
        res.errors.push(`Baris ${i + 2}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
    return res;
  };

  const FormBody = (
    <div className="space-y-3 py-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Tipe</Label>
          <Select value={form.tipe} onValueChange={(v) => setForm({ ...form, tipe: v as CSMutasiTipe })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="masuk">Masuk (terima stok)</SelectItem>
              <SelectItem value="keluar">Keluar (ke nasabah)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Produk</Label>
          <Select value={form.produk} onValueChange={(v) => setForm({ ...form, produk: v as CSBukuProduk })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(Object.keys(BUKU_PRODUK_LABELS) as CSBukuProduk[]).map((k) => (
                <SelectItem key={k} value={k}>{BUKU_PRODUK_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
        <div className="space-y-1"><Label>Jumlah</Label><Input type="number" min={1} value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: Number(e.target.value) })} /></div>
      </div>
      {form.tipe === 'keluar' && (
        <>
          <div className="space-y-1"><Label>Nomor Seri Buku</Label><Input value={form.nomor_seri} onChange={(e) => setForm({ ...form, nomor_seri: e.target.value })} placeholder="Nomor seri fisik buku" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>CIF</Label><Input value={form.cif} onChange={(e) => setForm({ ...form, cif: e.target.value })} /></div>
            <div className="space-y-1"><Label>Nomor Rekening</Label><Input value={form.nomor_rekening} onChange={(e) => setForm({ ...form, nomor_rekening: e.target.value })} /></div>
          </div>
          <div className="space-y-1"><Label>Nama Nasabah</Label><Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} /></div>
        </>
      )}
      <div className="space-y-1"><Label>Keterangan</Label><Textarea rows={2} value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} /></div>
    </div>
  );

  return (
    <MainLayout>
      <PageHeader title="Register Buku Tabungan" description="Stok buku tabungan masuk dan keluar per produk" />
      <Card className="p-4 mb-4">
        <div className="text-sm text-muted-foreground mb-2">Sisa Stok per Produk</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {(Object.keys(BUKU_PRODUK_LABELS) as CSBukuProduk[]).map((k) => (
            <div key={k} className="border rounded p-2">
              <div className="text-xs text-muted-foreground">{BUKU_PRODUK_LABELS[k]}</div>
              <div className="text-lg font-semibold">{sisaPerProduk[k] || 0}</div>
            </div>
          ))}
        </div>
      </Card>
      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" /> Export Excel
        </Button>
      </div>
      <DataTable
        data={data}
        columns={[
          { key: 'tanggal', header: 'Tanggal' },
          { key: 'tipe', header: 'Tipe', filterable: true, render: (r) => r.tipe === 'masuk' ? 'Masuk' : 'Keluar' },
          { key: 'produk', header: 'Produk', filterable: true, render: (r) => r.produk ? BUKU_PRODUK_LABELS[r.produk] : '-' },
          { key: 'jumlah', header: 'Jumlah' },
          { key: 'nomor_seri', header: 'No. Seri' },
          { key: 'cif', header: 'CIF', filterable: true },
          { key: 'nama', header: 'Nama' },
          { key: 'nomor_rekening', header: 'Rekening' },
          { key: 'keterangan', header: 'Keterangan' },
          { key: 'user_input', header: 'User' },
        ]}
        onAdd={openAdd}
        onEdit={openEdit}
        onDelete={(item) => { setSelected(item); setIsDeleteOpen(true); }}
        addLabel="Tambah Mutasi"
        canEdit={canEdit}
      />

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent><DialogHeader><DialogTitle>Tambah Mutasi Buku Tabungan</DialogTitle></DialogHeader>{FormBody}
          <DialogFooter><Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button><Button onClick={handleAdd}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent><DialogHeader><DialogTitle>Edit Mutasi Buku Tabungan</DialogTitle></DialogHeader>{FormBody}
          <DialogFooter><Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button><Button onClick={handleEdit}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus Mutasi?</AlertDialogTitle><AlertDialogDescription>Yakin?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default BukuTabunganPage;
