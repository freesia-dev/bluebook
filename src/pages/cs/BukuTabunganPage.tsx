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
import { addBuku, CSBukuTabungan, CSMutasiTipe, deleteBuku, getBukuList, updateBuku } from '@/lib/cs-store';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';

const BukuTabunganPage: React.FC = () => {
  const { toast } = useToast();
  const { canEdit, userName } = useAuth();
  const [data, setData] = useState<CSBukuTabungan[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<CSBukuTabungan | null>(null);
  const [form, setForm] = useState({
    tipe: 'masuk' as CSMutasiTipe, jumlah: 1, tanggal: new Date().toISOString().slice(0, 10),
    cif: '', nama: '', nomor_rekening: '', keterangan: '',
  });

  const load = async () => setData(await getBukuList());
  useEffect(() => { load(); }, []);

  const sisa = useMemo(() => {
    let s = 0;
    data.forEach((r) => { s += r.tipe === 'masuk' ? r.jumlah : -r.jumlah; });
    return s;
  }, [data]);

  const openAdd = () => {
    setForm({ tipe: 'masuk', jumlah: 1, tanggal: new Date().toISOString().slice(0, 10), cif: '', nama: '', nomor_rekening: '', keterangan: '' });
    setIsAddOpen(true);
  };
  const openEdit = (item: CSBukuTabungan) => {
    setSelected(item);
    setForm({
      tipe: item.tipe, jumlah: item.jumlah, tanggal: item.tanggal,
      cif: item.cif || '', nama: item.nama || '', nomor_rekening: item.nomor_rekening || '', keterangan: item.keterangan || '',
    });
    setIsEditOpen(true);
  };

  const buildPayload = () => ({
    tipe: form.tipe, jumlah: form.jumlah, tanggal: form.tanggal,
    cif: form.cif || null, nama: form.nama || null, nomor_rekening: form.nomor_rekening || null,
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
      'Tanggal': r.tanggal, 'Tipe': r.tipe, 'Jumlah': r.jumlah, 'CIF': r.cif, 'Nama': r.nama, 'Rekening': r.nomor_rekening, 'Keterangan': r.keterangan, 'User': r.user_input,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Buku Tabungan');
    XLSX.writeFile(wb, 'Register_Buku_Tabungan.xlsx');
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
        <div className="space-y-1"><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
      </div>
      <div className="space-y-1"><Label>Jumlah</Label><Input type="number" min={1} value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: Number(e.target.value) })} /></div>
      {form.tipe === 'keluar' && (
        <>
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
      <PageHeader title="Register Buku Tabungan" description="Stok buku tabungan masuk dan keluar" />
      <Card className="p-6 mb-4">
        <div className="text-sm text-muted-foreground">Sisa Stok Buku Tabungan</div>
        <div className="text-3xl font-bold mt-2">{sisa}</div>
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
          { key: 'jumlah', header: 'Jumlah' },
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
