import React, { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit3, Trash2, Printer, Paperclip, Search } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  CallMemo,
  JENIS_AKTIVITAS_LABEL,
  STATUS_KOMITMEN_LABEL,
  STATUS_KOMITMEN_COLOR,
  useCallMemoList,
  useDeleteCallMemo,
} from '@/hooks/use-call-memo';
import { fmtIDR } from '@/lib/mlf-utils';
import { CallMemoDialog } from './CallMemoDialog';
import { useAuth } from '@/contexts/AuthContext';

export const CallMemoTable: React.FC = () => {
  const { isAdmin, canEdit } = useAuth();
  const { data: memos = [], isLoading } = useCallMemoList();
  const del = useDeleteCallMemo();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CallMemo | null>(null);
  const [toDelete, setToDelete] = useState<CallMemo | null>(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterJenis, setFilterJenis] = useState<string>('all');
  const [filterPetugas, setFilterPetugas] = useState<string>('all');

  const petugasList = useMemo(() => {
    const s = new Set<string>();
    memos.forEach((m) => m.petugas_penagih && s.add(m.petugas_penagih));
    return Array.from(s).sort();
  }, [memos]);

  const filtered = useMemo(() => {
    return memos.filter((m) => {
      if (filterStatus !== 'all' && m.status_komitmen !== filterStatus) return false;
      if (filterJenis !== 'all' && m.jenis_aktivitas !== filterJenis) return false;
      if (filterPetugas !== 'all' && m.petugas_penagih !== filterPetugas) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!m.nama_debitur.toLowerCase().includes(q) && !(m.no_rek || '').toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [memos, search, filterStatus, filterJenis, filterPetugas]);

  const handleNew = () => { setEditing(null); setDialogOpen(true); };
  const handleEdit = (m: CallMemo) => { setEditing(m); setDialogOpen(true); };
  const handlePrint = (m: CallMemo) => window.open(`/monitoring/call-memo/print?id=${m.id}`, '_blank');
  const handleDelete = async () => {
    if (!toDelete) return;
    try {
      await del.mutateAsync(toDelete.id);
      toast.success('Call Memo dihapus');
      setToDelete(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Filter bar */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="col-span-2">
              <Label className="text-xs">Cari</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nama / no rek" className="pl-8" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua status</SelectItem>
                  {Object.entries(STATUS_KOMITMEN_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Jenis</Label>
              <Select value={filterJenis} onValueChange={setFilterJenis}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua jenis</SelectItem>
                  {Object.entries(JENIS_AKTIVITAS_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Petugas</Label>
              <Select value={filterPetugas} onValueChange={setFilterPetugas}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua petugas</SelectItem>
                  {petugasList.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Total: <strong className="text-foreground">{filtered.length}</strong> memo</div>
            {canEdit && (
              <Button onClick={handleNew} className="bg-primary"><Plus className="w-4 h-4 mr-1" />Buat Call Memo</Button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <Table className="text-xs sm:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">No</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Debitur</TableHead>
                  <TableHead>Jenis</TableHead>
                  <TableHead className="text-right">Total Tunggakan</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Petugas</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Memuat...</TableCell></TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Belum ada call memo</TableCell></TableRow>
                ) : filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-mono">{m.nomor}</TableCell>
                    <TableCell>
                      <div>{format(new Date(m.tanggal), 'dd MMM yyyy', { locale: idLocale })}</div>
                      <div className="text-[10px] text-muted-foreground">{m.jam}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium flex items-center gap-1">
                        {m.nama_debitur}
                        {m.lampiran_urls.length > 0 && <Paperclip className="w-3 h-3 text-muted-foreground" />}
                      </div>
                      <div className="text-[10px] font-mono text-muted-foreground">{m.no_rek || '—'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">{JENIS_AKTIVITAS_LABEL[m.jenis_aktivitas]}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold text-amber-600">{fmtIDR(m.total_tunggakan)}</TableCell>
                    <TableCell>
                      <Badge className={`${STATUS_KOMITMEN_COLOR[m.status_komitmen]} text-white text-[10px]`}>
                        {STATUS_KOMITMEN_LABEL[m.status_komitmen]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{m.petugas_penagih}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handlePrint(m)} title="Cetak">
                          <Printer className="w-3.5 h-3.5" />
                        </Button>
                        {canEdit && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => handleEdit(m)} title="Edit">
                            <Edit3 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-rose-600 hover:text-rose-700" onClick={() => setToDelete(m)} title="Hapus">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <CallMemoDialog open={dialogOpen} onClose={() => setDialogOpen(false)} memo={editing} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Call Memo?</AlertDialogTitle>
            <AlertDialogDescription>
              Call Memo #{toDelete?.nomor} untuk {toDelete?.nama_debitur} akan dipindahkan ke recycle bin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-rose-600 hover:bg-rose-700">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
