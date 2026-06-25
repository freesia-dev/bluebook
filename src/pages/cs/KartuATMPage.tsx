import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { addKartuMutasi, calcStokKartu, CSJenisKartu, CSKartuMutasi, CSMutasiTipe, deleteKartuMutasi, getKartuMutasi, KARTU_LABELS, updateKartuMutasi } from '@/lib/cs-store';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { CSImportButton, ImportResult } from '@/components/cs/CSImportButton';
import { CSDeleteAllButton } from '@/components/cs/CSDeleteAllButton';
import { asDate, asNumber, asString, pick } from '@/lib/cs-import-helpers';

const KartuATMPage: React.FC = () => {
  const { toast } = useToast();
  const { canEdit, userName } = useAuth();
  const [data, setData] = useState<CSKartuMutasi[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<CSKartuMutasi | null>(null);
  const [form, setForm] = useState<{ jenis_kartu: CSJenisKartu; tipe: CSMutasiTipe; jumlah: number; tanggal: string; keterangan: string }>({
    jenis_kartu: 'simpeda', tipe: 'masuk', jumlah: 1, tanggal: new Date().toISOString().slice(0, 10), keterangan: '',
  });

  const load = async () => setData(await getKartuMutasi());
  useEffect(() => { load(); }, []);

  const stok = calcStokKartu(data);

  const openAdd = () => {
    setForm({ jenis_kartu: 'simpeda', tipe: 'masuk', jumlah: 1, tanggal: new Date().toISOString().slice(0, 10), keterangan: '' });
    setIsAddOpen(true);
  };

  const openEdit = (item: CSKartuMutasi) => {
    setSelected(item);
    setForm({ jenis_kartu: item.jenis_kartu, tipe: item.tipe, jumlah: item.jumlah, tanggal: item.tanggal, keterangan: item.keterangan || '' });
    setIsEditOpen(true);
  };

  const handleAdd = async () => {
    try {
      await addKartuMutasi({ ...form, user_input: userName });
      toast({ title: 'Berhasil', description: 'Mutasi ditambahkan.' });
      setIsAddOpen(false); load();
    } catch (e: any) { toast({ title: 'Gagal', description: e.message, variant: 'destructive' }); }
  };

  const handleEdit = async () => {
    if (!selected) return;
    try {
      await updateKartuMutasi(selected.id, form);
      toast({ title: 'Berhasil', description: 'Mutasi diperbarui.' });
      setIsEditOpen(false); load();
    } catch (e: any) { toast({ title: 'Gagal', description: e.message, variant: 'destructive' }); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    await deleteKartuMutasi(selected.id);
    toast({ title: 'Berhasil', description: 'Mutasi dihapus.' });
    setIsDeleteOpen(false); load();
  };

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(data.map((r) => ({
      'Tanggal': r.tanggal, 'Jenis Kartu': KARTU_LABELS[r.jenis_kartu], 'Tipe': r.tipe, 'Jumlah': r.jumlah, 'Keterangan': r.keterangan, 'User': r.user_input,
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Mutasi Kartu');
    XLSX.writeFile(wb, 'Logbook_Kartu_ATM.xlsx');
  };

  const handleImport = async (rows: Record<string, unknown>[]): Promise<ImportResult> => {
    const res: ImportResult = { inserted: 0, updated: 0, skipped: 0, errors: [] };
    const jenisLookup = new Map<string, CSJenisKartu>();
    (['simpeda','prama','tabunganku'] as CSJenisKartu[]).forEach((k) => {
      jenisLookup.set(k, k);
      jenisLookup.set(KARTU_LABELS[k].toLowerCase(), k);
    });
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const jenisRaw = asString(pick(row, 'Jenis Kartu')).toLowerCase();
        const jenis_kartu = jenisLookup.get(jenisRaw);
        if (!jenis_kartu) { res.errors.push(`Baris ${i + 2}: Jenis Kartu tidak dikenali`); continue; }
        const tipeRaw = asString(pick(row, 'Tipe')).toLowerCase();
        const tipe: CSMutasiTipe = tipeRaw.startsWith('kel') ? 'keluar' : 'masuk';
        await addKartuMutasi({
          jenis_kartu, tipe,
          jumlah: asNumber(pick(row, 'Jumlah')) || 1,
          tanggal: asDate(pick(row, 'Tanggal')),
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
          <Label>Jenis Kartu</Label>
          <Select value={form.jenis_kartu} onValueChange={(v) => setForm({ ...form, jenis_kartu: v as CSJenisKartu })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['simpeda','prama','tabunganku'] as CSJenisKartu[]).map((k) => (
                <SelectItem key={k} value={k}>{KARTU_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Tipe</Label>
          <Select value={form.tipe} onValueChange={(v) => setForm({ ...form, tipe: v as CSMutasiTipe })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="masuk">Masuk</SelectItem>
              <SelectItem value="keluar">Keluar</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1"><Label>Jumlah</Label><Input type="number" min={1} value={form.jumlah} onChange={(e) => setForm({ ...form, jumlah: Number(e.target.value) })} /></div>
        <div className="space-y-1"><Label>Tanggal</Label><Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} /></div>
      </div>
      <div className="space-y-1"><Label>Keterangan</Label><Textarea rows={2} value={form.keterangan} onChange={(e) => setForm({ ...form, keterangan: e.target.value })} /></div>
    </div>
  );

  return (
    <MainLayout>
      <PageHeader title="Logbook Kartu ATM" description="Stok dan mutasi kartu ATM kosong" />
      <Tabs defaultValue="stok">
        <TabsList>
          <TabsTrigger value="stok">Stok Saat Ini</TabsTrigger>
          <TabsTrigger value="mutasi">Mutasi</TabsTrigger>
        </TabsList>
        <TabsContent value="stok" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['simpeda','prama','tabunganku'] as CSJenisKartu[]).map((k) => (
              <Card key={k} className="p-6">
                <div className="text-sm text-muted-foreground">{KARTU_LABELS[k]}</div>
                <div className="text-3xl font-bold mt-2">{stok[k]}</div>
                <div className="text-xs text-muted-foreground mt-1">kartu tersedia</div>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="mutasi" className="mt-4">
          <div className="flex gap-2 mb-4">
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" /> Export Excel
            </Button>
            <CSImportButton
              templateName="Template_Kartu_ATM"
              sheetName="Mutasi Kartu"
              supportsDedupe={false}
              columns={[
                { header: 'Tanggal', example: '2024-01-15' },
                { header: 'Jenis Kartu', example: 'Simpeda', required: true },
                { header: 'Tipe', example: 'masuk', required: true },
                { header: 'Jumlah', example: 50, required: true },
                { header: 'Keterangan', example: '' },
              ]}
              notes="Jenis Kartu: Simpeda / Prama / TabunganKu. Tipe: masuk atau keluar."
              onImport={handleImport}
              onDone={load}
            />
            <CSDeleteAllButton table="cs_kartu_atm_mutasi" label="Mutasi Kartu ATM" onDone={load} />
          </div>
          <DataTable
            data={data}
            columns={[
              { key: 'tanggal', header: 'Tanggal' },
              { key: 'jenis_kartu', header: 'Jenis Kartu', filterable: true, render: (r) => KARTU_LABELS[r.jenis_kartu] },
              { key: 'tipe', header: 'Tipe', filterable: true, render: (r) => r.tipe === 'masuk' ? 'Masuk' : 'Keluar' },
              { key: 'jumlah', header: 'Jumlah' },
              { key: 'keterangan', header: 'Keterangan' },
              { key: 'user_input', header: 'User' },
            ]}
            onAdd={openAdd}
            onEdit={openEdit}
            onDelete={(item) => { setSelected(item); setIsDeleteOpen(true); }}
            addLabel="Tambah Mutasi"
            canEdit={canEdit}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent><DialogHeader><DialogTitle>Tambah Mutasi Kartu</DialogTitle></DialogHeader>{FormBody}
          <DialogFooter><Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button><Button onClick={handleAdd}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent><DialogHeader><DialogTitle>Edit Mutasi Kartu</DialogTitle></DialogHeader>{FormBody}
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

export default KartuATMPage;
