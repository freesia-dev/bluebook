import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  usePenyelesaianSelisih, 
  useAddPenyelesaianSelisih, 
  useUpdatePenyelesaianSelisih, 
  useDeletePenyelesaianSelisih,
  useUnresolvedSelisih,
  useSelisihByPenyelesaian
} from '@/hooks/use-penyelesaian-data';
import { useATMConfig } from '@/hooks/use-atm-data';
import { generateBANumber } from '@/lib/penyelesaian-store';
import { formatRupiah } from '@/lib/atm-store';
import { format, differenceInDays } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Plus, Trash2, CheckCircle, Clock, AlertTriangle, CalendarIcon, FileText } from 'lucide-react';
import { PenyelesaianSelisih, SelisihATM } from '@/types';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

const PenyelesaianSelisihPage = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  
  const { data: penyelesaianList = [], isLoading } = usePenyelesaianSelisih();
  const { data: unresolvedSelisih = [] } = useUnresolvedSelisih();
  const { data: configOptions = [] } = useATMConfig();
  const addMutation = useAddPenyelesaianSelisih();
  const updateMutation = useUpdatePenyelesaianSelisih();
  const deleteMutation = useDeletePenyelesaianSelisih();
  
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedPenyelesaian, setSelectedPenyelesaian] = useState<PenyelesaianSelisih | null>(null);
  
  // Form state
  const [formTanggalPengaduan, setFormTanggalPengaduan] = useState<Date>(new Date());
  const [formPetugas, setFormPetugas] = useState('');
  const [formTeller, setFormTeller] = useState('');
  const [formPemimpin, setFormPemimpin] = useState('');
  const [formCatatan, setFormCatatan] = useState('');
  const [selectedSelisihIds, setSelectedSelisihIds] = useState<string[]>([]);

  const activeConfig = configOptions.filter(c => c.isActive);
  const petugasList = activeConfig.filter(c => !c.jabatan.includes('TELLER') && !c.jabatan.includes('PEMIMPIN'));
  const tellerList = activeConfig.filter(c => c.jabatan.includes('TELLER'));
  const pemimpinList = activeConfig.filter(c => c.jabatan.includes('PEMIMPIN'));

  const resetForm = () => {
    setFormTanggalPengaduan(new Date());
    setFormPetugas('');
    setFormTeller('');
    setFormPemimpin('');
    setFormCatatan('');
    setSelectedSelisihIds([]);
  };

  const handleAdd = async () => {
    if (!formPetugas || selectedSelisihIds.length === 0) {
      toast({ title: 'Error', description: 'Pilih petugas dan minimal 1 selisih', variant: 'destructive' });
      return;
    }

    try {
      await addMutation.mutateAsync({
        data: {
          tanggalPengaduan: formTanggalPengaduan,
          petugas: formPetugas,
          teller: formTeller || undefined,
          pemimpin: formPemimpin || undefined,
          catatan: formCatatan || undefined,
          status: 'Dalam Proses',
        },
        selisihIds: selectedSelisihIds,
      });
      toast({ title: 'Sukses', description: 'Penyelesaian selisih berhasil dibuat' });
      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal membuat penyelesaian selisih', variant: 'destructive' });
    }
  };

  const handleMarkComplete = async (item: PenyelesaianSelisih) => {
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        data: {
          status: 'Sudah Diselesaikan',
          tanggalPenyelesaian: new Date(),
        },
      });
      toast({ title: 'Sukses', description: 'Selisih berhasil diselesaikan' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal mengupdate status', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin hapus penyelesaian ini? Selisih yang terkait akan kembali ke status "Belum Diselesaikan".')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: 'Sukses', description: 'Penyelesaian selisih berhasil dihapus' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus penyelesaian', variant: 'destructive' });
    }
  };

  const getStatusBadge = (item: PenyelesaianSelisih) => {
    if (item.status === 'Sudah Diselesaikan') {
      return <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">Sudah Diselesaikan</Badge>;
    }
    const daysSince = differenceInDays(new Date(), item.tanggalPengaduan);
    if (daysSince > 30) {
      return <Badge variant="destructive">Melebihi Batas ({daysSince} hari)</Badge>;
    }
    if (daysSince > 25) {
      return <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30">Dalam Proses ({daysSince} hari)</Badge>;
    }
    return <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-400 border-sky-500/30">Dalam Proses ({daysSince} hari)</Badge>;
  };

  const totalUnresolved = unresolvedSelisih.length;
  const totalInProcess = penyelesaianList.filter(p => p.status === 'Dalam Proses').length;
  const totalOverdue = penyelesaianList.filter(p => p.status === 'Dalam Proses' && differenceInDays(new Date(), p.tanggalPengaduan) > 30).length;

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Penyelesaian Selisih ATM"
          description="Kelola proses penyelesaian selisih ATM"
        />

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalUnresolved}</p>
                  <p className="text-sm text-muted-foreground">Belum Diselesaikan</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-500/10">
                  <Clock className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalInProcess}</p>
                  <p className="text-sm text-muted-foreground">Dalam Proses</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalOverdue}</p>
                  <p className="text-sm text-muted-foreground">Melebihi 30 Hari</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Daftar Penyelesaian</CardTitle>
            <Button onClick={() => { resetForm(); setShowAddDialog(true); }} className="gap-2" disabled={unresolvedSelisih.length === 0}>
              <Plus className="w-4 h-4" />
              Buat Penyelesaian
            </Button>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Memuat data...</span>
              </div>
            ) : penyelesaianList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Belum ada data penyelesaian selisih.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">No.</TableHead>
                      <TableHead>No. BA</TableHead>
                      <TableHead>Tgl Pengaduan</TableHead>
                      <TableHead>Tgl Penyelesaian</TableHead>
                      <TableHead>Petugas</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {penyelesaianList.map((item) => (
                      <TableRow key={item.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell>{item.nomor}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {generateBANumber(item.nomor, item.tanggalPengaduan)}
                        </TableCell>
                        <TableCell>{format(item.tanggalPengaduan, 'dd/MM/yyyy')}</TableCell>
                        <TableCell>
                          {item.tanggalPenyelesaian 
                            ? format(item.tanggalPenyelesaian, 'dd/MM/yyyy') 
                            : '-'
                          }
                        </TableCell>
                        <TableCell>{item.petugas}</TableCell>
                        <TableCell>{getStatusBadge(item)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => { setSelectedPenyelesaian(item); setShowDetailDialog(true); }}
                            >
                              Detail
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/atm-telihan/ba-penyelesaian?id=${item.id}`)}
                            >
                              <FileText className="w-4 h-4" />
                            </Button>
                            {item.status === 'Dalam Proses' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-emerald-600"
                                onClick={() => handleMarkComplete(item)}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </Button>
                            )}
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => handleDelete(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buat Penyelesaian Selisih</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Tanggal Pengaduan */}
            <div className="space-y-2">
              <Label>Tanggal Pengaduan</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formTanggalPengaduan, 'dd MMMM yyyy', { locale: idLocale })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formTanggalPengaduan}
                    onSelect={(date) => date && setFormTanggalPengaduan(date)}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Petugas */}
            <div className="space-y-2">
              <Label>Petugas ATM *</Label>
              <Select value={formPetugas} onValueChange={setFormPetugas}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih petugas..." />
                </SelectTrigger>
                <SelectContent>
                  {petugasList.map(p => (
                    <SelectItem key={p.id} value={p.nama}>{p.nama} - {p.jabatan}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Teller */}
            <div className="space-y-2">
              <Label>Teller</Label>
              <Select value={formTeller} onValueChange={setFormTeller}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih teller..." />
                </SelectTrigger>
                <SelectContent>
                  {tellerList.map(p => (
                    <SelectItem key={p.id} value={p.nama}>{p.nama}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Pemimpin */}
            <div className="space-y-2">
              <Label>Pemimpin KCP</Label>
              <Select value={formPemimpin} onValueChange={setFormPemimpin}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih pemimpin..." />
                </SelectTrigger>
                <SelectContent>
                  {pemimpinList.map(p => (
                    <SelectItem key={p.id} value={p.nama}>{p.nama} - {p.jabatan}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Catatan */}
            <div className="space-y-2">
              <Label>Catatan / Kronologi</Label>
              <Textarea 
                value={formCatatan} 
                onChange={e => setFormCatatan(e.target.value)}
                placeholder="Tuliskan catatan atau kronologi penyelesaian..."
                rows={3}
              />
            </div>

            {/* Select Selisih */}
            <div className="space-y-2">
              <Label>Pilih Selisih yang Akan Diselesaikan * ({selectedSelisihIds.length} dipilih)</Label>
              {unresolvedSelisih.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada selisih yang belum diselesaikan.</p>
              ) : (
                <div className="border rounded-lg max-h-60 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead>Tanggal</TableHead>
                        <TableHead className="text-right">Nominal</TableHead>
                        <TableHead>Keterangan</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unresolvedSelisih.map(s => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <Checkbox 
                              checked={selectedSelisihIds.includes(s.id)}
                              onCheckedChange={(checked) => {
                                setSelectedSelisihIds(prev => 
                                  checked 
                                    ? [...prev, s.id]
                                    : prev.filter(id => id !== s.id)
                                );
                              }}
                            />
                          </TableCell>
                          <TableCell>{format(s.tanggal, 'dd/MM/yyyy')}</TableCell>
                          <TableCell className="text-right">{formatRupiah(s.nominal)}</TableCell>
                          <TableCell className="text-sm">{s.keterangan || '-'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Batal</Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      {selectedPenyelesaian && (
        <DetailDialog 
          item={selectedPenyelesaian} 
          open={showDetailDialog} 
          onOpenChange={setShowDetailDialog} 
        />
      )}
    </MainLayout>
  );
};

// Detail dialog sub-component
const DetailDialog = ({ item, open, onOpenChange }: { 
  item: PenyelesaianSelisih; 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
}) => {
  const { data: linkedSelisih = [], isLoading } = useSelisihByPenyelesaian(item.id);
  const totalNominal = linkedSelisih.reduce((sum, s) => sum + s.nominal, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detail Penyelesaian #{item.nomor}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">No. BA:</span>
              <p className="font-mono font-medium">{generateBANumber(item.nomor, item.tanggalPengaduan)}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <p className="font-medium">{item.status}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tanggal Pengaduan:</span>
              <p>{format(item.tanggalPengaduan, 'dd MMMM yyyy', { locale: idLocale })}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tanggal Penyelesaian:</span>
              <p>{item.tanggalPenyelesaian ? format(item.tanggalPenyelesaian, 'dd MMMM yyyy', { locale: idLocale }) : '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Petugas:</span>
              <p>{item.petugas}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Teller:</span>
              <p>{item.teller || '-'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Pemimpin:</span>
              <p>{item.pemimpin || '-'}</p>
            </div>
            {item.tanggalPenyelesaian && (
              <div>
                <span className="text-muted-foreground">Durasi:</span>
                <p>{differenceInDays(item.tanggalPenyelesaian, item.tanggalPengaduan)} hari</p>
              </div>
            )}
          </div>

          {item.catatan && (
            <div>
              <span className="text-sm text-muted-foreground">Catatan:</span>
              <p className="text-sm mt-1 p-3 bg-muted rounded-lg">{item.catatan}</p>
            </div>
          )}

          <div>
            <span className="text-sm text-muted-foreground font-medium">Daftar Selisih ({linkedSelisih.length} item, Total: {formatRupiah(totalNominal)})</span>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-4">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Memuat...</span>
              </div>
            ) : (
              <div className="border rounded-lg mt-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">No</TableHead>
                      <TableHead>Tanggal</TableHead>
                      <TableHead className="text-right">Nominal</TableHead>
                      <TableHead>Keterangan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {linkedSelisih.map((s, idx) => (
                      <TableRow key={s.id}>
                        <TableCell>{idx + 1}</TableCell>
                        <TableCell>{format(s.tanggal, 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="text-right">{formatRupiah(s.nominal)}</TableCell>
                        <TableCell className="text-sm">{s.keterangan || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {linkedSelisih.length > 0 && (
                      <TableRow className="font-bold">
                        <TableCell colSpan={2}>Total</TableCell>
                        <TableCell className="text-right">{formatRupiah(totalNominal)}</TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PenyelesaianSelisihPage;
