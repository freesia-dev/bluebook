import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RecycleBinItem, TABLE_NAME_LABELS } from '@/types';
import { 
  getRecycleBin, 
  restoreFromRecycleBin, 
  permanentlyDeleteFromRecycleBin,
  emptyRecycleBin 
} from '@/lib/supabase-store';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrencyDisplay } from '@/hooks/use-currency-input';
import { Trash2, RotateCcw, Eye, Search, Filter, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

const RecycleBinPage: React.FC = () => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [data, setData] = useState<RecycleBinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedItem, setSelectedItem] = useState<RecycleBinItem | null>(null);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEmptyOpen, setIsEmptyOpen] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [tableFilter, setTableFilter] = useState<string>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const items = await getRecycleBin();
      setData(items);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal memuat data recycle bin.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!selectedItem) return;
    setIsRestoring(true);
    try {
      await restoreFromRecycleBin(selectedItem);
      toast({
        title: 'Berhasil',
        description: 'Data berhasil dikembalikan.',
      });
      setIsRestoreOpen(false);
      setSelectedItem(null);
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal mengembalikan data.',
        variant: 'destructive',
      });
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!selectedItem) return;
    setIsDeleting(true);
    try {
      await permanentlyDeleteFromRecycleBin(selectedItem.id);
      toast({
        title: 'Berhasil',
        description: 'Data berhasil dihapus permanen.',
      });
      setIsDeleteOpen(false);
      setSelectedItem(null);
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal menghapus data.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEmptyRecycleBin = async () => {
    setIsDeleting(true);
    try {
      await emptyRecycleBin();
      toast({
        title: 'Berhasil',
        description: 'Recycle bin berhasil dikosongkan.',
      });
      setIsEmptyOpen(false);
      loadData();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Gagal mengosongkan recycle bin.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const getDisplayName = (item: RecycleBinItem): string => {
    const d = item.data;
    if (d.nama_debitur) return d.nama_debitur as string;
    if (d.nama_pengirim) return d.nama_pengirim as string;
    if (d.nama_penerima) return d.nama_penerima as string;
    if (d.nomor_sppk) return d.nomor_sppk as string;
    if (d.nomor_pk) return d.nomor_pk as string;
    if (d.nomor_kk) return d.nomor_kk as string;
    if (d.nomor_loan) return d.nomor_loan as string;
    if (d.nomor_agenda) return d.nomor_agenda as string;
    return `Record #${d.nomor || item.originalId.slice(0, 8)}`;
  };

  const getSubInfo = (item: RecycleBinItem): string => {
    const d = item.data;
    if (d.plafon) return formatCurrencyDisplay(Number(d.plafon));
    if (d.perihal) return (d.perihal as string).slice(0, 50);
    if (d.tanggal) return format(new Date(d.tanggal as string), 'dd/MM/yyyy');
    return '';
  };

  // Filter data
  const filteredData = data.filter(item => {
    const matchesSearch = searchTerm === '' || 
      getDisplayName(item).toLowerCase().includes(searchTerm.toLowerCase()) ||
      TABLE_NAME_LABELS[item.tableName].toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTable = tableFilter === 'all' || item.tableName === tableFilter;
    
    return matchesSearch && matchesTable;
  });

  // Get unique table names for filter
  const uniqueTables = [...new Set(data.map(item => item.tableName))];

  if (!isAdmin) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Anda tidak memiliki akses ke halaman ini.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader 
        title="Recycle Bin"
        description="Data yang sudah dihapus dapat dikembalikan dari sini"
      />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Select value={tableFilter} onValueChange={setTableFilter}>
            <SelectTrigger className="w-[180px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter tabel" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Tabel</SelectItem>
              {uniqueTables.map(table => (
                <SelectItem key={table} value={table}>
                  {TABLE_NAME_LABELS[table]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data.length > 0 && (
            <Button 
              variant="destructive" 
              onClick={() => setIsEmptyOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Kosongkan
            </Button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-card">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
            <Trash2 className="w-12 h-12 mb-4 opacity-50" />
            <p>Recycle bin kosong</p>
          </div>
        ) : (
          <ScrollArea className="h-[calc(100vh-300px)]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">No</TableHead>
                  <TableHead>Tabel</TableHead>
                  <TableHead>Nama/Nomor</TableHead>
                  <TableHead>Info</TableHead>
                  <TableHead>Dihapus Pada</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TABLE_NAME_LABELS[item.tableName]}
                      </Badge>
                      {item.tableType && (
                        <Badge variant="secondary" className="ml-1 capitalize">
                          {item.tableType}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{getDisplayName(item)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {getSubInfo(item)}
                    </TableCell>
                    <TableCell>
                      {format(item.deletedAt, 'dd MMM yyyy, HH:mm', { locale: id })}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setSelectedItem(item); setIsViewOpen(true); }}
                          title="Lihat Detail"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setSelectedItem(item); setIsRestoreOpen(true); }}
                          title="Kembalikan"
                          className="text-success hover:text-success"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => { setSelectedItem(item); setIsDeleteOpen(true); }}
                          title="Hapus Permanen"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detail Data</DialogTitle>
            <DialogDescription>
              Data dari tabel {selectedItem && TABLE_NAME_LABELS[selectedItem.tableName]}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            {selectedItem && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg font-mono text-sm">
                {Object.entries(selectedItem.data).map(([key, value]) => (
                  <div key={key} className="grid grid-cols-3 gap-2">
                    <span className="text-muted-foreground">{key}:</span>
                    <span className="col-span-2 break-all">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value ?? '-')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewOpen(false)}>Tutup</Button>
            <Button onClick={() => { setIsViewOpen(false); setIsRestoreOpen(true); }}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Kembalikan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Confirmation */}
      <AlertDialog open={isRestoreOpen} onOpenChange={setIsRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kembalikan Data?</AlertDialogTitle>
            <AlertDialogDescription>
              Data "{selectedItem && getDisplayName(selectedItem)}" akan dikembalikan ke tabel {selectedItem && TABLE_NAME_LABELS[selectedItem.tableName]}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRestoring}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleRestore} disabled={isRestoring}>
              {isRestoring ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
              Kembalikan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Permanen?</AlertDialogTitle>
            <AlertDialogDescription>
              Data "{selectedItem && getDisplayName(selectedItem)}" akan dihapus secara permanen dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePermanentDelete} 
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Empty Recycle Bin Confirmation */}
      <AlertDialog open={isEmptyOpen} onOpenChange={setIsEmptyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kosongkan Recycle Bin?</AlertDialogTitle>
            <AlertDialogDescription>
              Semua {data.length} data di recycle bin akan dihapus secara permanen dan tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Batal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleEmptyRecycleBin} 
              disabled={isDeleting}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Kosongkan Semua
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default RecycleBinPage;