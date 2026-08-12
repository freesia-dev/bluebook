import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePensionRules, useUpsertPensionRule, useDeletePensionRule, type PensionRule } from '@/hooks/use-loan-calc';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2 } from 'lucide-react';

export const UsiaPensiunSection: React.FC = () => {
  const { data = [], isLoading } = usePensionRules();
  const upsert = useUpsertPensionRule();
  const del = useDeletePensionRule();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<PensionRule>>({ pilihan_karir: '', usia_pensiun: 58 });

  const save = async () => {
    if (!form.pilihan_karir || !form.usia_pensiun) {
      toast({ title: 'Lengkapi data', variant: 'destructive' });
      return;
    }
    try {
      await upsert.mutateAsync({
        id: form.id,
        pilihan_karir: form.pilihan_karir,
        usia_pensiun: form.usia_pensiun,
      });
      toast({ title: form.id ? 'Aturan diperbarui' : 'Aturan ditambahkan' });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus aturan ini?')) return;
    await del.mutateAsync(id);
    toast({ title: 'Dihapus' });
  };

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button
          onClick={() => {
            setForm({ pilihan_karir: '', usia_pensiun: 58 });
            setOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" /> Tambah
        </Button>
      </div>
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pilihan Karir</TableHead>
                <TableHead>Usia Pensiun</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={3} className="text-center py-6 text-muted-foreground">Memuat...</TableCell></TableRow>
              )}
              {data.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.pilihan_karir}</TableCell>
                  <TableCell>{r.usia_pensiun} tahun</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => { setForm(r); setOpen(true); }}>
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(r.id)}>
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
          <DialogHeader><DialogTitle>{form.id ? 'Edit' : 'Tambah'} Aturan Pensiun</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Pilihan Karir</Label>
              <Input
                value={form.pilihan_karir ?? ''}
                onChange={(e) => setForm({ ...form, pilihan_karir: e.target.value })}
                placeholder="mis. PNS Fungsional"
              />
            </div>
            <div>
              <Label>Usia Pensiun (tahun)</Label>
              <Input
                type="number"
                value={form.usia_pensiun ?? ''}
                onChange={(e) => setForm({ ...form, usia_pensiun: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={save} disabled={upsert.isPending}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const UsiaPensiunPage: React.FC = () => (
  <MainLayout>
    <PageHeader
      title="Aturan Usia Pensiun"
      description="Atur usia pensiun otomatis per pilihan karir untuk Kalkulator Loan"
    />
    <UsiaPensiunSection />
  </MainLayout>
);

export default UsiaPensiunPage;
