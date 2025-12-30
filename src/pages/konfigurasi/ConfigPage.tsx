import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { getJenisKredit, addJenisKredit, deleteJenisKredit, getJenisDebitur, addJenisDebitur, deleteJenisDebitur, getKodeFasilitas, addKodeFasilitas, deleteKodeFasilitas, getSektorEkonomi, addSektorEkonomi, deleteSektorEkonomi } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

interface ConfigPageProps {
  type: 'jenis-kredit' | 'jenis-debitur' | 'kode-fasilitas' | 'sektor-ekonomi';
}

const ConfigPage: React.FC<ConfigPageProps> = ({ type }) => {
  const { toast } = useToast();
  const [data, setData] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState({ nama: '', kode: '', keterangan: '' });

  const config = {
    'jenis-kredit': { title: 'Jenis Kredit', get: getJenisKredit, add: (d: any) => addJenisKredit(d.nama), del: deleteJenisKredit, columns: [{ key: 'nama', header: 'Nama Jenis Kredit' }] },
    'jenis-debitur': { title: 'Jenis Debitur', get: getJenisDebitur, add: (d: any) => addJenisDebitur({ kode: d.kode, keterangan: d.keterangan }), del: deleteJenisDebitur, columns: [{ key: 'kode', header: 'Kode' }, { key: 'keterangan', header: 'Keterangan' }] },
    'kode-fasilitas': { title: 'Kode Fasilitas', get: getKodeFasilitas, add: (d: any) => addKodeFasilitas({ kode: d.kode, keterangan: d.keterangan }), del: deleteKodeFasilitas, columns: [{ key: 'kode', header: 'Kode' }, { key: 'keterangan', header: 'Keterangan' }] },
    'sektor-ekonomi': { title: 'Sektor Ekonomi', get: getSektorEkonomi, add: (d: any) => addSektorEkonomi({ kode: d.kode, keterangan: d.keterangan }), del: deleteSektorEkonomi, columns: [{ key: 'kode', header: 'Kode' }, { key: 'keterangan', header: 'Keterangan' }] },
  };

  const cfg = config[type];
  useEffect(() => { setData(cfg.get()); }, [type]);

  const handleAdd = () => {
    cfg.add(formData);
    toast({ title: 'Berhasil', description: 'Data berhasil ditambahkan.' });
    setIsAddOpen(false);
    setFormData({ nama: '', kode: '', keterangan: '' });
    setData(cfg.get());
  };

  const handleDelete = () => {
    if (!selectedItem) return;
    cfg.del(selectedItem.id);
    toast({ title: 'Berhasil', description: 'Data berhasil dihapus.' });
    setIsDeleteOpen(false);
    setData(cfg.get());
  };

  return (
    <MainLayout>
      <PageHeader title={cfg.title} description={`Kelola data ${cfg.title}`} />
      <DataTable data={data} columns={cfg.columns} onAdd={() => setIsAddOpen(true)} onDelete={(item) => { setSelectedItem(item); setIsDeleteOpen(true); }} addLabel={`Tambah ${cfg.title}`} />
      
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent><DialogHeader><DialogTitle>Tambah {cfg.title}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {type === 'jenis-kredit' ? (
              <div className="space-y-2"><Label>Nama</Label><Input value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} /></div>
            ) : (
              <>
                <div className="space-y-2"><Label>Kode</Label><Input value={formData.kode} onChange={(e) => setFormData({...formData, kode: e.target.value})} /></div>
                <div className="space-y-2"><Label>Keterangan</Label><Input value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} /></div>
              </>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button><Button onClick={handleAdd}>Simpan</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Hapus Data?</AlertDialogTitle><AlertDialogDescription>Apakah Anda yakin ingin menghapus data ini?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Batal</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
};

export default ConfigPage;
