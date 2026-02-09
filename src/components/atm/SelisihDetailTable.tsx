import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  useSelisihByPengisian,
  useAddSelisihDetail,
  useUpdateSelisihDetail,
  useDeleteSelisihDetail,
  useResolveSelisihItem,
  useUnresolveSelisihItem,
} from '@/hooks/use-penyelesaian-data';
import { formatCurrencyInput, parseCurrencyValue } from '@/hooks/use-currency-input';
import { formatRupiah } from '@/lib/atm-store';
import { format } from 'date-fns';
import { Plus, Trash2, CheckCircle, Undo2, Pencil } from 'lucide-react';
import { SelisihATM } from '@/types';

interface PengisianSelisihInfo {
  id: string;
  nomor: number;
  tanggal: Date;
  jumlahSelisih: number;
  keteranganSelisih: string;
}

interface SelisihDetailTableProps {
  pengisian: PengisianSelisihInfo;
}

const SelisihDetailTable = ({ pengisian }: SelisihDetailTableProps) => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const { data: selisihList = [], isLoading } = useSelisihByPengisian(pengisian.id);

  const addMutation = useAddSelisihDetail();
  const updateMutation = useUpdateSelisihDetail();
  const deleteMutation = useDeleteSelisihDetail();
  const resolveMutation = useResolveSelisihItem();
  const unresolveMutation = useUnresolveSelisihItem();

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<SelisihATM | null>(null);

  // Form state
  const [formNamaNasabah, setFormNamaNasabah] = useState('');
  const [formNomorKartu, setFormNomorKartu] = useState('');
  const [formNoReff, setFormNoReff] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formNominal, setFormNominal] = useState('');

  const totalDetail = selisihList.reduce((sum, s) => sum + s.nominal, 0);
  const resolvedAmount = selisihList.filter(s => s.status === 'Sudah Diselesaikan').reduce((sum, s) => sum + s.nominal, 0);
  const progressPercent = totalDetail > 0 ? Math.round((resolvedAmount / totalDetail) * 100) : 0;

  const resetForm = () => {
    setFormNamaNasabah('');
    setFormNomorKartu('');
    setFormNoReff('');
    setFormKeterangan('');
    setFormNominal('');
  };

  const openAddDialog = () => {
    resetForm();
    setEditingItem(null);
    setShowAddDialog(true);
  };

  const openEditDialog = (item: SelisihATM) => {
    setFormNamaNasabah(item.namaNasabah || '');
    setFormNomorKartu(item.nomorKartu || '');
    setFormNoReff(item.noReff || '');
    setFormKeterangan(item.keterangan || '');
    setFormNominal(formatCurrencyInput(String(item.nominal)));
    setEditingItem(item);
    setShowAddDialog(true);
  };

  const handleSave = async () => {
    if (parseCurrencyValue(formNominal) <= 0) {
      toast({ title: 'Error', description: 'Nominal harus lebih dari 0', variant: 'destructive' });
      return;
    }

    try {
      if (editingItem) {
        await updateMutation.mutateAsync({
          id: editingItem.id,
          updates: {
            nominal: parseCurrencyValue(formNominal),
            namaNasabah: formNamaNasabah || undefined,
            nomorKartu: formNomorKartu || undefined,
            noReff: formNoReff || undefined,
            keterangan: formKeterangan || undefined,
          },
        });
        toast({ title: 'Sukses', description: 'Detail selisih berhasil diperbarui' });
      } else {
        await addMutation.mutateAsync({
          pengisianAtmId: pengisian.id,
          tanggal: pengisian.tanggal,
          nominal: parseCurrencyValue(formNominal),
          namaNasabah: formNamaNasabah || undefined,
          nomorKartu: formNomorKartu || undefined,
          noReff: formNoReff || undefined,
          keterangan: formKeterangan || undefined,
        });
        toast({ title: 'Sukses', description: 'Detail selisih berhasil ditambahkan' });
      }
      setShowAddDialog(false);
      resetForm();
    } catch {
      toast({ title: 'Error', description: 'Gagal menyimpan detail selisih', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin hapus detail selisih ini?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Sukses', description: 'Detail selisih berhasil dihapus' });
    } catch {
      toast({ title: 'Error', description: 'Gagal menghapus', variant: 'destructive' });
    }
  };

  const handleResolve = async (id: string) => {
    try {
      await resolveMutation.mutateAsync(id);
      toast({ title: 'Sukses', description: 'Selisih berhasil diselesaikan' });
    } catch {
      toast({ title: 'Error', description: 'Gagal mengupdate status', variant: 'destructive' });
    }
  };

  const handleUnresolve = async (id: string) => {
    try {
      await unresolveMutation.mutateAsync(id);
      toast({ title: 'Sukses', description: 'Status dikembalikan ke Belum Diselesaikan' });
    } catch {
      toast({ title: 'Error', description: 'Gagal mengupdate status', variant: 'destructive' });
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">
                Pengisian #{pengisian.nomor} — {format(pengisian.tanggal, 'dd/MM/yyyy')}
              </CardTitle>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>Total Selisih: <strong className="text-foreground">{formatRupiah(pengisian.jumlahSelisih)}</strong></span>
                <span>•</span>
                <span>{pengisian.keteranganSelisih}</span>
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={openAddDialog} className="gap-1.5 shrink-0">
              <Plus className="w-3.5 h-3.5" />
              Tambah Detail
            </Button>
          </div>

          {/* Progress bar */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Progress Penyelesaian</span>
              <span>
                {formatRupiah(resolvedAmount)} / {formatRupiah(totalDetail)} ({progressPercent}%)
              </span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4 justify-center">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Memuat...</span>
            </div>
          ) : selisihList.length === 0 ? (
            <div className="text-center py-4 text-sm text-muted-foreground">
              Belum ada detail selisih. Klik "Tambah Detail" untuk memecah selisih menjadi beberapa transaksi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">No</TableHead>
                    <TableHead>Nama Nasabah</TableHead>
                    <TableHead>No. Kartu</TableHead>
                    <TableHead>No. Reff EJ</TableHead>
                    <TableHead className="text-right">Nominal</TableHead>
                    <TableHead>Keterangan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selisihList.map((item, idx) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>{item.namaNasabah || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{item.nomorKartu || '-'}</TableCell>
                      <TableCell className="font-mono text-sm">{item.noReff || '-'}</TableCell>
                      <TableCell className="text-right font-medium">{formatRupiah(item.nominal)}</TableCell>
                      <TableCell className="text-sm max-w-[200px] truncate">{item.keterangan || '-'}</TableCell>
                      <TableCell>
                        {item.status === 'Sudah Diselesaikan' ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                            Selesai
                          </Badge>
                        ) : item.status === 'Dalam Proses' ? (
                          <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30">
                            Proses
                          </Badge>
                        ) : (
                          <Badge variant="secondary">Belum</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          {item.status !== 'Sudah Diselesaikan' ? (
                            <>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600" onClick={() => handleResolve(item.id)} title="Selesaikan">
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(item)} title="Edit">
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </>
                          ) : (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-amber-600" onClick={() => handleUnresolve(item.id)} title="Batalkan penyelesaian">
                              <Undo2 className="w-4 h-4" />
                            </Button>
                          )}
                          {isAdmin && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(item.id)} title="Hapus">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {selisihList.length > 1 && (
                    <TableRow className="font-bold">
                      <TableCell colSpan={4}>Total Detail</TableCell>
                      <TableCell className="text-right">{formatRupiah(totalDetail)}</TableCell>
                      <TableCell colSpan={3}></TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Edit Detail Selisih' : 'Tambah Detail Selisih'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nominal (Rp) *</Label>
              <Input
                value={formNominal}
                onChange={e => setFormNominal(formatCurrencyInput(e.target.value))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Nama Nasabah</Label>
              <Input value={formNamaNasabah} onChange={e => setFormNamaNasabah(e.target.value)} placeholder="Nama nasabah..." />
            </div>
            <div className="space-y-2">
              <Label>No. Kartu</Label>
              <Input value={formNomorKartu} onChange={e => setFormNomorKartu(e.target.value)} placeholder="Nomor kartu ATM..." />
            </div>
            <div className="space-y-2">
              <Label>No. Reff EJ</Label>
              <Input value={formNoReff} onChange={e => setFormNoReff(e.target.value)} placeholder="Nomor referensi EJ..." />
            </div>
            <div className="space-y-2">
              <Label>Keterangan</Label>
              <Input value={formKeterangan} onChange={e => setFormKeterangan(e.target.value)} placeholder="Keterangan..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={addMutation.isPending || updateMutation.isPending}>
              {addMutation.isPending || updateMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SelisihDetailTable;
