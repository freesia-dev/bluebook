import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useLoanAOs, useUpsertLoanAO, useDeleteLoanAO, type LoanAO } from '@/hooks/use-loan-calc';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';

const DaftarAOPage: React.FC = () => {
  const { data = [], isLoading } = useLoanAOs(false);
  const upsert = useUpsertLoanAO();
  const del = useDeleteLoanAO();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<LoanAO>>({ nama: '', jabatan: '', is_active: true, urutan: 0 });

  const save = async () => {
    if (!form.nama) {
      toast({ title: 'Nama AO wajib diisi', variant: 'destructive' });
      return;
    }
    try {
      await upsert.mutateAsync({
        id: form.id,
        nama: form.nama,
        jabatan: form.jabatan || null,
        is_active: form.is_active ?? true,
        urutan: form.urutan ?? 0,
      });
      toast({ title: form.id ? 'AO diperbarui' : 'AO ditambahkan' });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Gagal menyimpan', description: e.message, variant: 'destructive' });
    }
  };

  const hapus = async (id: string) => {
    if (!confirm('Hapus AO ini?')) return;
    await del.mutateAsync(id);
    toast({ title: 'AO dihapus' });
  };

  return (
    <MainLayout>
      <PageHeader
        title="Daftar AO"
        description="Nama Account Officer yang tampil sebagai pilihan dropdown di kalkulator kredit"
        actions={
          <Button onClick={() => { setForm({ nama: '', jabatan: '', is_active: true, urutan: 0 }); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Tambah AO
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Jabatan</TableHead>
                <TableHead>Urutan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Memuat...</TableCell></TableRow>
              )}
              {!isLoading && data.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Belum ada AO.</TableCell></TableRow>
              )}
              {data.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.nama}</TableCell>
                  <TableCell>{a.jabatan || '—'}</TableCell>
                  <TableCell>{a.urutan}</TableCell>
                  <TableCell>
                    {a.is_active ? <Badge className="bg-emerald-600 text-white">Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setForm(a); setOpen(true); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => hapus(a.id)}>
                      <Trash2 className="w-4 h-4 text-rose-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{form.id ? 'Edit' : 'Tambah'} AO</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Nama AO *</Label>
              <Input value={form.nama ?? ''} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            </div>
            <div>
              <Label>Jabatan</Label>
              <Input value={form.jabatan ?? ''} onChange={(e) => setForm({ ...form, jabatan: e.target.value })} placeholder="mis. Account Officer Konsumer" />
            </div>
            <div>
              <Label>Urutan</Label>
              <Input type="number" value={form.urutan ?? 0} onChange={(e) => setForm({ ...form, urutan: parseInt(e.target.value) || 0 })} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active ?? true} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={upsert.isPending}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default DaftarAOPage;
