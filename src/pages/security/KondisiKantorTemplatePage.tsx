import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Item {
  id: string;
  label: string;
  urutan: number;
  is_active: boolean;
}

const KondisiKantorTemplatePage: React.FC = () => {
  const { permissions } = useAuth();
  const isAdmin = permissions.isAdmin;
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data = [], isLoading } = useQuery({
    queryKey: ['kondisi-kantor-template-admin'],
    queryFn: async (): Promise<Item[]> => {
      const { data, error } = await supabase
        .from('kondisi_kantor_template' as any)
        .select('*')
        .order('urutan', { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Item[];
    },
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Item | null>(null);
  const [label, setLabel] = useState('');
  const [urutan, setUrutan] = useState(10);
  const [isActive, setIsActive] = useState(true);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);

  const reset = () => { setEditing(null); setLabel(''); setUrutan(10); setIsActive(true); };
  const openAdd = () => { reset(); setOpen(true); };
  const openEdit = (i: Item) => { setEditing(i); setLabel(i.label); setUrutan(i.urutan); setIsActive(i.is_active); setOpen(true); };

  const save = useMutation({
    mutationFn: async () => {
      if (!label.trim()) throw new Error('Label wajib diisi');
      if (editing) {
        const { error } = await supabase.from('kondisi_kantor_template' as any)
          .update({ label: label.trim(), urutan, is_active: isActive }).eq('id', editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('kondisi_kantor_template' as any)
          .insert({ label: label.trim(), urutan, is_active: isActive });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kondisi-kantor-template-admin'] });
      qc.invalidateQueries({ queryKey: ['kondisi-kantor-template'] });
      toast({ title: editing ? 'Template diperbarui' : 'Template ditambahkan' });
      setOpen(false); reset();
    },
    onError: (e: any) => toast({ title: 'Gagal', description: e.message, variant: 'destructive' }),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('kondisi_kantor_template' as any).delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['kondisi-kantor-template-admin'] });
      qc.invalidateQueries({ queryKey: ['kondisi-kantor-template'] });
      toast({ title: 'Template dihapus' });
      setDeleteItem(null);
    },
    onError: (e: any) => toast({ title: 'Gagal hapus', description: e.message, variant: 'destructive' }),
  });

  return (
    <MainLayout>
      <PageHeader
        title="Template Kondisi Kantor"
        description="Daftar pilihan template kondisi akhir kantor untuk serah terima shift security."
      />

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {data.length} template tersimpan. Petugas tetap bisa mengedit isi secara manual saat serah terima.
          </p>
          {isAdmin && (
            <Button onClick={openAdd}><Plus className="w-4 h-4 mr-2" />Tambah Template</Button>
          )}
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Memuat...</div>
        ) : data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">Belum ada template.</div>
        ) : (
          <div className="divide-y border rounded-md">
            {data.map((item) => (
              <div key={item.id} className="p-3 flex items-start gap-3 hover:bg-muted/30">
                <div className="text-xs text-muted-foreground w-10 pt-1">#{item.urutan}</div>
                <div className="flex-1">
                  <p className={`text-sm ${item.is_active ? '' : 'opacity-50 line-through'}`}>{item.label}</p>
                  {!item.is_active && <span className="text-[10px] text-amber-600 uppercase">Nonaktif</span>}
                </div>
                {isAdmin && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(item)}><Pencil className="w-4 h-4" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteItem(item)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Template' : 'Tambah Template'}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Label Kondisi</Label>
              <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="contoh: Kantor aman terkendali..." />
            </div>
            <div>
              <Label>Urutan</Label>
              <Input type="number" value={urutan} onChange={(e) => setUrutan(Number(e.target.value) || 0)} />
              <p className="text-xs text-muted-foreground mt-1">Semakin kecil semakin atas.</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={isActive} onCheckedChange={setIsActive} id="active" />
              <Label htmlFor="active" className="cursor-pointer">Aktifkan template ini</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus template?</AlertDialogTitle>
            <AlertDialogDescription>Template "{deleteItem?.label}" akan dihapus permanen.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteItem && del.mutate(deleteItem.id)}>
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default KondisiKantorTemplatePage;
