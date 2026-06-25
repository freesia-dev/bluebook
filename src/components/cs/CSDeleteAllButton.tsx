import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Trash2, Loader2 } from 'lucide-react';

type CSTable =
  | 'cs_cif'
  | 'cs_rekening'
  | 'cs_si'
  | 'cs_buku_tabungan'
  | 'cs_kartu_atm_mutasi'
  | 'cs_bilyet_deposito';

interface Props {
  /** Supabase table to wipe */
  table: CSTable;
  /** Friendly label for the dialog, e.g. "CIF Nasabah" */
  label: string;
  /** Called after successful delete to refresh the list */
  onDone?: () => void;
  /** Optional extra filter, e.g. { produk: 'simpeda' } — when set, only matching rows are deleted */
  filter?: Record<string, string>;
}

export const CSDeleteAllButton: React.FC<Props> = ({ table, label, onDone, filter }) => {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isAdmin) return null;

  const handleDelete = async () => {
    if (confirm !== 'HAPUS SEMUA') {
      toast({ title: 'Konfirmasi tidak cocok', description: 'Ketik HAPUS SEMUA persis (huruf besar).', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const base: any = supabase.from(table).delete().not('id', 'is', null);
      const q = filter
        ? Object.entries(filter).reduce((acc: any, [k, v]) => acc.eq(k, v), base)
        : base;
      const { error } = await q;
      if (error) throw error;
      toast({ title: 'Berhasil', description: `Semua data ${label} telah dihapus.` });
      setOpen(false);
      setConfirm('');
      onDone?.();
    } catch (e: any) {
      toast({ title: 'Gagal menghapus', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        <Trash2 className="h-4 w-4 mr-2" /> Hapus Semua
      </Button>
      <AlertDialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setConfirm(''); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus SEMUA data {label}?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus <strong>seluruh entry</strong> {label}
              {filter ? ' sesuai filter aktif' : ''}. Data akan masuk ke Recycle Bin
              (jika trigger aktif) namun tidak otomatis ter-restore. Hanya admin yang
              boleh melakukan ini.
              <br /><br />
              Ketik <strong>HAPUS SEMUA</strong> untuk mengkonfirmasi.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label>Konfirmasi</Label>
            <Input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="HAPUS SEMUA"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete(); }}
              disabled={loading || confirm !== 'HAPUS SEMUA'}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Menghapus...</> : 'Hapus Semua'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
