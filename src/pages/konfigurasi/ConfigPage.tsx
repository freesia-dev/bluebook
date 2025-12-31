import React, { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  getJenisKredit, addJenisKredit, deleteJenisKredit, updateJenisKredit,
  getJenisDebitur, addJenisDebitur, deleteJenisDebitur, updateJenisDebitur,
  getKodeFasilitas, addKodeFasilitas, deleteKodeFasilitas, updateKodeFasilitas,
  getSektorEkonomi, addSektorEkonomi, deleteSektorEkonomi, updateSektorEkonomi
} from '@/lib/supabase-store';
import { useToast } from '@/hooks/use-toast';
import { Upload, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ConfigPageProps {
  type: 'jenis-kredit' | 'jenis-debitur' | 'kode-fasilitas' | 'sektor-ekonomi';
}

const ConfigPage: React.FC<ConfigPageProps> = ({ type }) => {
  const { toast } = useToast();
  const [data, setData] = useState<any[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [formData, setFormData] = useState({ nama: '', produkKredit: '', kode: '', keterangan: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = {
    'jenis-kredit': { 
      title: 'Jenis Kredit', 
      get: getJenisKredit, 
      add: (d: any) => addJenisKredit({ nama: d.nama, produkKredit: d.produkKredit }), 
      update: (id: string, d: any) => updateJenisKredit(id, { nama: d.nama, produkKredit: d.produkKredit }),
      del: deleteJenisKredit, 
      columns: [{ key: 'nama', header: 'Jenis Kredit' }, { key: 'produkKredit', header: 'Produk Kredit' }],
      templateData: [{ 'Jenis Kredit': 'Contoh Jenis', 'Produk Kredit': 'Contoh Produk' }],
      parseExcel: (row: any) => ({ nama: row['Jenis Kredit'] || '', produkKredit: row['Produk Kredit'] || '' })
    },
    'jenis-debitur': { 
      title: 'Jenis Debitur', 
      get: getJenisDebitur, 
      add: (d: any) => addJenisDebitur({ kode: d.kode, keterangan: d.keterangan }), 
      update: (id: string, d: any) => updateJenisDebitur(id, { kode: d.kode, keterangan: d.keterangan }),
      del: deleteJenisDebitur, 
      columns: [{ key: 'kode', header: 'Kode' }, { key: 'keterangan', header: 'Keterangan' }],
      templateData: [{ 'Kode': '001', 'Keterangan': 'Contoh Debitur' }],
      parseExcel: (row: any) => ({ kode: String(row['Kode'] || ''), keterangan: row['Keterangan'] || '' })
    },
    'kode-fasilitas': { 
      title: 'Kode Fasilitas', 
      get: getKodeFasilitas, 
      add: (d: any) => addKodeFasilitas({ kode: d.kode, keterangan: d.keterangan }), 
      update: (id: string, d: any) => updateKodeFasilitas(id, { kode: d.kode, keterangan: d.keterangan }),
      del: deleteKodeFasilitas, 
      columns: [{ key: 'kode', header: 'Kode' }, { key: 'keterangan', header: 'Keterangan' }],
      templateData: [{ 'Kode': '01', 'Keterangan': 'Contoh Fasilitas' }],
      parseExcel: (row: any) => ({ kode: String(row['Kode'] || ''), keterangan: row['Keterangan'] || '' })
    },
    'sektor-ekonomi': { 
      title: 'Sektor Ekonomi', 
      get: getSektorEkonomi, 
      add: (d: any) => addSektorEkonomi({ kode: d.kode, keterangan: d.keterangan }), 
      update: (id: string, d: any) => updateSektorEkonomi(id, { kode: d.kode, keterangan: d.keterangan }),
      del: deleteSektorEkonomi, 
      columns: [{ key: 'kode', header: 'Kode' }, { key: 'keterangan', header: 'Keterangan' }],
      templateData: [{ 'Kode': '0101', 'Keterangan': 'Contoh Sektor' }],
      parseExcel: (row: any) => ({ kode: String(row['Kode'] || ''), keterangan: row['Keterangan'] || '' })
    },
  };

  const cfg = config[type];

  const loadData = async () => {
    const result = await cfg.get();
    setData(result);
  };

  useEffect(() => { 
    loadData(); 
  }, [type]);

  const resetForm = () => setFormData({ nama: '', produkKredit: '', kode: '', keterangan: '' });

  const handleAdd = async () => {
    await cfg.add(formData);
    toast({ title: 'Berhasil', description: 'Data berhasil ditambahkan.' });
    setIsAddOpen(false);
    resetForm();
    loadData();
  };

  const handleEdit = async () => {
    if (!selectedItem) return;
    await cfg.update(selectedItem.id, formData);
    toast({ title: 'Berhasil', description: 'Data berhasil diperbarui.' });
    setIsEditOpen(false);
    resetForm();
    loadData();
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    await cfg.del(selectedItem.id);
    toast({ title: 'Berhasil', description: 'Data berhasil dihapus.' });
    setIsDeleteOpen(false);
    loadData();
  };

  const openEdit = (item: any) => {
    setSelectedItem(item);
    if (type === 'jenis-kredit') {
      setFormData({ nama: item.nama, produkKredit: item.produkKredit || '', kode: '', keterangan: '' });
    } else {
      setFormData({ nama: '', produkKredit: '', kode: item.kode, keterangan: item.keterangan });
    }
    setIsEditOpen(true);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet(cfg.templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, `Template_${cfg.title.replace(/\s/g, '_')}.xlsx`);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const jsonData = XLSX.utils.sheet_to_json(ws);
      
      const parsedData = jsonData.map((row: any) => cfg.parseExcel(row)).filter((item: any) => {
        if (type === 'jenis-kredit') return item.nama;
        return item.kode;
      });

      if (parsedData.length > 0) {
        // Add each item individually
        for (const item of parsedData) {
          await cfg.add(item);
        }
        toast({ title: 'Berhasil', description: `${parsedData.length} data berhasil diimport.` });
        loadData();
      } else {
        toast({ title: 'Error', description: 'Tidak ada data valid ditemukan.', variant: 'destructive' });
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <MainLayout>
      <PageHeader title={cfg.title} description={`Kelola data ${cfg.title}`} />
      
      <div className="flex gap-2 mb-4">
        <Button variant="outline" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-2" />
          Download Template
        </Button>
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          <Upload className="h-4 w-4 mr-2" />
          Upload Excel
        </Button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept=".xlsx,.xls"
          onChange={handleFileUpload}
        />
      </div>

      <DataTable 
        data={data} 
        columns={cfg.columns} 
        onAdd={() => { resetForm(); setIsAddOpen(true); }} 
        onEdit={openEdit}
        onDelete={(item) => { setSelectedItem(item); setIsDeleteOpen(true); }} 
        addLabel={`Tambah ${cfg.title}`} 
      />
      
      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent><DialogHeader><DialogTitle>Tambah {cfg.title}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {type === 'jenis-kredit' ? (
              <>
                <div className="space-y-2"><Label>Jenis Kredit</Label><Input value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} /></div>
                <div className="space-y-2"><Label>Produk Kredit</Label><Input value={formData.produkKredit} onChange={(e) => setFormData({...formData, produkKredit: e.target.value})} /></div>
              </>
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

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent><DialogHeader><DialogTitle>Edit {cfg.title}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            {type === 'jenis-kredit' ? (
              <>
                <div className="space-y-2"><Label>Jenis Kredit</Label><Input value={formData.nama} onChange={(e) => setFormData({...formData, nama: e.target.value})} /></div>
                <div className="space-y-2"><Label>Produk Kredit</Label><Input value={formData.produkKredit} onChange={(e) => setFormData({...formData, produkKredit: e.target.value})} /></div>
              </>
            ) : (
              <>
                <div className="space-y-2"><Label>Kode</Label><Input value={formData.kode} onChange={(e) => setFormData({...formData, kode: e.target.value})} /></div>
                <div className="space-y-2"><Label>Keterangan</Label><Input value={formData.keterangan} onChange={(e) => setFormData({...formData, keterangan: e.target.value})} /></div>
              </>
            )}
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsEditOpen(false)}>Batal</Button><Button onClick={handleEdit}>Simpan</Button></DialogFooter>
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