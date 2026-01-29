import React, { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable, Column } from '@/components/ui/data-table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { PengisianATM } from '@/types';
import { getDayName, angkaTerbilang } from '@/lib/atm-store';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { exportToExcel } from '@/lib/export';
import { formatCurrencyInput, parseCurrencyValue, formatCurrencyDisplay } from '@/hooks/use-currency-input';
import { ATMStatistics } from '@/components/atm/ATMStatistics';
import {
  DatabasePengisianATMFormFields,
  type PengisianATMFormData,
} from '@/components/atm/DatabasePengisianATMFormFields';
import { 
  usePengisianATM, 
  useATMConfig, 
  useAddPengisianATM, 
  useUpdatePengisianATM, 
  useDeletePengisianATM 
} from '@/hooks/use-atm-data';

const DENOMINASI = 100000; // Rp 100.000 per lembar

const DatabasePengisianATM = () => {
  const { toast } = useToast();
  const { userName, userRole } = useAuth();
  const isAdmin = userRole === 'admin';
  const canEdit = userRole !== 'demo';

  // React Query hooks for data fetching with caching
  const { data: pengisianData = [], isLoading: isLoadingData } = usePengisianATM();
  const { data: configData = [], isLoading: isLoadingConfig } = useATMConfig();
  
  // Mutations
  const addMutation = useAddPengisianATM();
  const updateMutation = useUpdatePengisianATM();
  const deleteMutation = useDeletePengisianATM();

  const configOptions = useMemo(() => configData.filter(c => c.isActive), [configData]);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState<PengisianATM | null>(null);

  const getDefaultForm = () => ({
    tanggal: new Date(),
    jam: '09:00',
    sisaCartridge1: '',
    sisaCartridge2: '',
    sisaCartridge3: '',
    sisaCartridge4: '',
    tambahCartridge1: '',
    tambahCartridge2: '',
    tambahCartridge3: '',
    tambahCartridge4: '',
    saldoBukuBesar: '',
    kartuTertelan: '0',
    yangMenyerahkan: '',
    namaTeller: '',
    tellerSelisih: '',
  });

  const [formData, setFormData] = useState<PengisianATMFormData>(getDefaultForm());

  // ============= AUTO CALCULATIONS =============
  const calculations = useMemo(() => {
    const saldoBukuBesar = parseCurrencyValue(formData.saldoBukuBesar);
    const sisaFisik = 
      (parseInt(formData.sisaCartridge1) || 0) +
      (parseInt(formData.sisaCartridge2) || 0) +
      (parseInt(formData.sisaCartridge3) || 0) +
      (parseInt(formData.sisaCartridge4) || 0);
    
    const lembarATM = Math.floor(saldoBukuBesar / DENOMINASI);
    const lembarFisik = sisaFisik;
    const uangFisik = sisaFisik * DENOMINASI;
    
    // Selisih = Uang Fisik - Saldo Buku Besar
    const selisihNominal = uangFisik - saldoBukuBesar;
    const selisihAbs = Math.abs(selisihNominal);
    const keteranganSelisih = selisihNominal > 0 ? 'LEBIH' : selisihNominal < 0 ? 'KURANG' : '-';
    
    // Jumlah disetor ke Teller = Saldo Buku Besar
    const jumlahDisetor = saldoBukuBesar;
    
    // Setor ke Rek Titipan = Selisih Lebih (jika ada)
    const setorKeRekTitipan = selisihNominal > 0 ? selisihNominal : 0;
    
    // Retracts = lembar yang disetor ke teller + lembar ke rek titipan
    const retracts = Math.floor(jumlahDisetor / DENOMINASI) + Math.floor(setorKeRekTitipan / DENOMINASI);
    
    // Notes format: ATM=XXX FISIK=XXX
    const notes = `ATM=${lembarATM} FISIK=${lembarFisik}`;
    
    return {
      lembarATM,
      lembarFisik,
      uangFisik,
      selisihNominal,
      selisihAbs,
      keteranganSelisih,
      jumlahDisetor,
      setorKeRekTitipan,
      retracts,
      notes
    };
  }, [formData.saldoBukuBesar, formData.sisaCartridge1, formData.sisaCartridge2, formData.sisaCartridge3, formData.sisaCartridge4]);

  const resetForm = () => setFormData(getDefaultForm());

  const getPetugasOptions = () => configOptions.filter(c => c.jabatan === 'PETUGAS ATM');
  const getTellerOptions = () => configOptions.filter(c => c.jabatan === 'TELLER');

  const handleAdd = async () => {
    if (addMutation.isPending) return;
    if (!formData.saldoBukuBesar) {
      toast({ title: 'Validasi Error', description: 'Harap isi Saldo Buku Besar.', variant: 'destructive' });
      return;
    }

    const tanggal = formData.tanggal;
    const kartuTertelan = parseInt(formData.kartuTertelan) || 0;
    
    addMutation.mutate({
      hari: getDayName(tanggal),
      tanggal,
      jam: formData.jam,
      sisaCartridge1: parseInt(formData.sisaCartridge1) || 0,
      sisaCartridge2: parseInt(formData.sisaCartridge2) || 0,
      sisaCartridge3: parseInt(formData.sisaCartridge3) || 0,
      sisaCartridge4: parseInt(formData.sisaCartridge4) || 0,
      tambahCartridge1: parseInt(formData.tambahCartridge1) || 0,
      tambahCartridge2: parseInt(formData.tambahCartridge2) || 0,
      tambahCartridge3: parseInt(formData.tambahCartridge3) || 0,
      tambahCartridge4: parseInt(formData.tambahCartridge4) || 0,
      saldoBukuBesar: parseCurrencyValue(formData.saldoBukuBesar),
      kartuTertelan,
      terbilang: angkaTerbilang(kartuTertelan),
      notes: calculations.notes,
      jumlahSelisih: calculations.selisihAbs,
      keteranganSelisih: calculations.keteranganSelisih,
      namaTeller: formData.namaTeller,
      jumlahDisetor: calculations.jumlahDisetor,
      setorKeRekTitipan: calculations.setorKeRekTitipan,
      yangMenyerahkan: formData.yangMenyerahkan,
      tellerSelisih: formData.tellerSelisih,
      retracts: calculations.retracts,
      userInput: userName || 'System',
    }, {
      onSuccess: (newItem) => {
        setSuccessMessage(`Data Pengisian ATM No. ${newItem.nomor} berhasil disimpan!`);
        setIsAddOpen(false);
        setIsSuccessOpen(true);
        resetForm();
      },
      onError: () => {
        toast({ title: 'Error', description: 'Gagal menyimpan data', variant: 'destructive' });
      }
    });
  };

  const handleEdit = async () => {
    if (updateMutation.isPending || !selectedItem) return;

    const tanggal = formData.tanggal;
    const kartuTertelan = parseInt(formData.kartuTertelan) || 0;

    updateMutation.mutate({
      id: selectedItem.id,
      data: {
        hari: getDayName(tanggal),
        tanggal,
        jam: formData.jam,
        sisaCartridge1: parseInt(formData.sisaCartridge1) || 0,
        sisaCartridge2: parseInt(formData.sisaCartridge2) || 0,
        sisaCartridge3: parseInt(formData.sisaCartridge3) || 0,
        sisaCartridge4: parseInt(formData.sisaCartridge4) || 0,
        tambahCartridge1: parseInt(formData.tambahCartridge1) || 0,
        tambahCartridge2: parseInt(formData.tambahCartridge2) || 0,
        tambahCartridge3: parseInt(formData.tambahCartridge3) || 0,
        tambahCartridge4: parseInt(formData.tambahCartridge4) || 0,
        saldoBukuBesar: parseCurrencyValue(formData.saldoBukuBesar),
        kartuTertelan,
        terbilang: angkaTerbilang(kartuTertelan),
        notes: calculations.notes,
        jumlahSelisih: calculations.selisihAbs,
        keteranganSelisih: calculations.keteranganSelisih,
        namaTeller: formData.namaTeller,
        jumlahDisetor: calculations.jumlahDisetor,
        setorKeRekTitipan: calculations.setorKeRekTitipan,
        yangMenyerahkan: formData.yangMenyerahkan,
        tellerSelisih: formData.tellerSelisih,
        retracts: calculations.retracts,
      }
    }, {
      onSuccess: () => {
        toast({ title: 'Sukses', description: 'Data berhasil diperbarui' });
        setIsEditOpen(false);
        resetForm();
      },
      onError: () => {
        toast({ title: 'Error', description: 'Gagal memperbarui data', variant: 'destructive' });
      }
    });
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    deleteMutation.mutate(selectedItem.id, {
      onSuccess: () => {
        toast({ title: 'Sukses', description: 'Data berhasil dihapus' });
        setIsDeleteOpen(false);
      },
      onError: () => {
        toast({ title: 'Error', description: 'Gagal menghapus data', variant: 'destructive' });
      }
    });
  };

  const handleExport = () => {
    const exportData = pengisianData.map(item => ({
      'No': item.nomor,
      'Hari': item.hari,
      'Tanggal': format(item.tanggal, 'dd MMMM yyyy', { locale: id }),
      'Jam': item.jam,
      'Sisa Cartridge I': item.sisaCartridge1,
      'Sisa Cartridge II': item.sisaCartridge2,
      'Sisa Cartridge III': item.sisaCartridge3,
      'Sisa Cartridge IV': item.sisaCartridge4,
      'Tambah Cartridge I': item.tambahCartridge1,
      'Tambah Cartridge II': item.tambahCartridge2,
      'Tambah Cartridge III': item.tambahCartridge3,
      'Tambah Cartridge IV': item.tambahCartridge4,
      'Saldo Buku Besar': item.saldoBukuBesar,
      'Kartu Tertelan': item.kartuTertelan,
      'Terbilang': item.terbilang,
      'Notes': item.notes,
      'Jumlah Selisih': item.jumlahSelisih,
      'Keterangan Selisih': item.keteranganSelisih,
      'Nama Teller': item.namaTeller,
      'Jumlah Disetor': item.jumlahDisetor,
      'Setor ke Rek Titipan': item.setorKeRekTitipan,
      'Yang Menyerahkan': item.yangMenyerahkan,
      'Teller Selisih': item.tellerSelisih,
      'Retracts': item.retracts,
    }));
    exportToExcel(exportData, 'Database_Pengisian_ATM');
  };

  const columns: Column<PengisianATM>[] = [
    { key: 'nomor', header: 'No', className: 'w-[60px]' },
    { key: 'hari', header: 'Hari' },
    { key: 'tanggal', header: 'Tanggal', render: (item) => format(item.tanggal, 'dd/MM/yyyy') },
    { key: 'jam', header: 'Jam' },
    { key: 'saldoBukuBesar', header: 'Saldo Buku Besar', render: (item) => formatCurrencyDisplay(item.saldoBukuBesar) },
    { key: 'kartuTertelan', header: 'Kartu Tertelan', render: (item) => item.kartuTertelan.toString() },
    { 
      key: 'jumlahSelisih', 
      header: 'Selisih', 
      render: (item) => item.jumlahSelisih > 0 ? (
        <Badge variant={item.keteranganSelisih === 'LEBIH' ? 'default' : 'destructive'}>
          {formatCurrencyDisplay(item.jumlahSelisih)} ({item.keteranganSelisih})
        </Badge>
      ) : <span className="text-muted-foreground">-</span>
    },
    { key: 'yangMenyerahkan', header: 'Petugas' },
  ];

  const petugasOptions = useMemo(() => getPetugasOptions().map(({ id, nama }) => ({ id, nama })), [configOptions]);
  const tellerOptions = useMemo(() => getTellerOptions().map(({ id, nama }) => ({ id, nama })), [configOptions]);

  if (isLoadingData || isLoadingConfig) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Database Pengisian ATM"
          description="Kelola data pengisian ATM Telihan"
        />

        {/* Statistics Section */}
        <ATMStatistics data={pengisianData} />

        <DataTable
          data={pengisianData}
          columns={columns}
          onAdd={() => setIsAddOpen(true)}
          onExport={handleExport}
          onView={(item) => { setSelectedItem(item); setIsViewOpen(true); }}
          onEdit={(item) => {
            setSelectedItem(item);
            setFormData({
              tanggal: new Date(item.tanggal),
              jam: item.jam,
              sisaCartridge1: item.sisaCartridge1.toString(),
              sisaCartridge2: item.sisaCartridge2.toString(),
              sisaCartridge3: item.sisaCartridge3.toString(),
              sisaCartridge4: item.sisaCartridge4.toString(),
              tambahCartridge1: item.tambahCartridge1.toString(),
              tambahCartridge2: item.tambahCartridge2.toString(),
              tambahCartridge3: item.tambahCartridge3.toString(),
              tambahCartridge4: item.tambahCartridge4.toString(),
              saldoBukuBesar: formatCurrencyInput(item.saldoBukuBesar.toString()),
              kartuTertelan: item.kartuTertelan.toString(),
              yangMenyerahkan: item.yangMenyerahkan,
              namaTeller: item.namaTeller,
              tellerSelisih: item.tellerSelisih,
            });
            setIsEditOpen(true);
          }}
          onDelete={(item) => { setSelectedItem(item); setIsDeleteOpen(true); }}
          canDelete={isAdmin}
          canEdit={canEdit}
          searchPlaceholder="Cari pengisian ATM..."
          addLabel="Tambah Data"
        />
      </div>

      {/* Add Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Tambah Data Pengisian ATM</DialogTitle>
            <DialogDescription>Masukkan data pengisian ATM baru. Perhitungan selisih dan setoran otomatis dihitung.</DialogDescription>
          </DialogHeader>
          <DatabasePengisianATMFormFields
            formData={formData}
            setFormData={setFormData}
            calculations={calculations}
            formatSaldoInput={formatCurrencyInput}
            petugasOptions={petugasOptions}
            tellerOptions={tellerOptions}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddOpen(false); resetForm(); }}>Batal</Button>
            <Button onClick={handleAdd} disabled={addMutation.isPending}>
              {addMutation.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Data Pengisian ATM</DialogTitle>
            <DialogDescription>Perbarui data pengisian ATM. Perhitungan otomatis akan diperbarui.</DialogDescription>
          </DialogHeader>
          <DatabasePengisianATMFormFields
            formData={formData}
            setFormData={setFormData}
            calculations={calculations}
            formatSaldoInput={formatCurrencyInput}
            petugasOptions={petugasOptions}
            tellerOptions={tellerOptions}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditOpen(false); resetForm(); }}>Batal</Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Detail Pengisian ATM #{selectedItem?.nomor}</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Hari:</span> <strong>{selectedItem.hari}</strong></div>
                <div><span className="text-muted-foreground">Tanggal:</span> <strong>{format(selectedItem.tanggal, 'dd MMMM yyyy', { locale: id })}</strong></div>
                <div><span className="text-muted-foreground">Jam:</span> <strong>{selectedItem.jam}</strong></div>
                <div><span className="text-muted-foreground">Saldo Buku Besar:</span> <strong>{formatCurrencyDisplay(selectedItem.saldoBukuBesar)}</strong></div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Sisa Cartridge</h4>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>I: {selectedItem.sisaCartridge1}</div>
                  <div>II: {selectedItem.sisaCartridge2}</div>
                  <div>III: {selectedItem.sisaCartridge3}</div>
                  <div>IV: {selectedItem.sisaCartridge4}</div>
                </div>
              </div>
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Tambah Cartridge</h4>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  <div>I: {selectedItem.tambahCartridge1}</div>
                  <div>II: {selectedItem.tambahCartridge2}</div>
                  <div>III: {selectedItem.tambahCartridge3}</div>
                  <div>IV: {selectedItem.tambahCartridge4}</div>
                </div>
              </div>
              <div className="border-t pt-4 grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">Kartu Tertelan:</span> <strong>{selectedItem.kartuTertelan} ({selectedItem.terbilang})</strong></div>
                <div><span className="text-muted-foreground">Retracts:</span> <strong>{selectedItem.retracts}</strong></div>
                <div><span className="text-muted-foreground">Selisih:</span> <strong>{selectedItem.jumlahSelisih > 0 ? `${formatCurrencyDisplay(selectedItem.jumlahSelisih)} (${selectedItem.keteranganSelisih})` : '-'}</strong></div>
                <div><span className="text-muted-foreground">Petugas:</span> <strong>{selectedItem.yangMenyerahkan}</strong></div>
                <div><span className="text-muted-foreground">Disetor ke Teller:</span> <strong>{formatCurrencyDisplay(selectedItem.jumlahDisetor)}</strong></div>
                <div><span className="text-muted-foreground">Setor Rek Titipan:</span> <strong>{formatCurrencyDisplay(selectedItem.setorKeRekTitipan)}</strong></div>
              </div>
              {selectedItem.notes && (
                <div className="border-t pt-4">
                  <span className="text-muted-foreground text-sm">Notes:</span>
                  <p className="mt-1 font-mono">{selectedItem.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data Pengisian ATM?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data pengisian ATM No. {selectedItem?.nomor}? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <p className="text-lg font-medium text-foreground">{successMessage}</p>
          </div>
          <DialogFooter className="justify-center">
            <Button onClick={() => setIsSuccessOpen(false)}>OK</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default DatabasePengisianATM;
