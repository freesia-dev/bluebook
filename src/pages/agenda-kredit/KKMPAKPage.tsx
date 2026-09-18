import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { KKMPAK } from '@/types';
import { useKKMPAKData, useKreditOptions } from '@/hooks/use-agenda-kredit-data';
import { exportToExcel } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { formatCurrencyInput, parseCurrencyValue, formatCurrencyDisplay } from '@/hooks/use-currency-input';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { TablePageSkeleton } from '@/components/ui/page-skeleton';
import { CreditField, CreditDetailGrid } from '@/components/agenda-kredit/CreditFormFields';
import {
  CreditFormDialog,
  CreditDeleteDialog,
  CreditSuccessDialog,
  CreditViewDialog,
} from '@/components/agenda-kredit/CreditRecordDialogs';

interface KKMPAKPageProps {
  type: 'telihan' | 'meranti';
  title: string;
}

interface KKMPAKFormData {
  namaDebitur: string;
  jenisKredit: string;
  plafon: string;
  jangkaWaktu: string;
  jenisDebitur: string;
  kodeFasilitas: string;
  sektorEkonomi: string;
  tanggal: Date;
}

const emptyForm = (): KKMPAKFormData => ({
  namaDebitur: '',
  jenisKredit: '',
  plafon: '',
  jangkaWaktu: '',
  jenisDebitur: '',
  kodeFasilitas: '',
  sektorEkonomi: '',
  tanggal: new Date(),
});

const KKMPAKPage: React.FC<KKMPAKPageProps> = ({ type, title }) => {
  const { toast } = useToast();
  const { isAdmin, canEdit } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, add, update, remove } = useKKMPAKData(type);
  const { jenisKredit: jenisKreditOptions, jenisDebitur: jenisDebiturOptions, kodeFasilitas: kodeFasilitasOptions, sektorEkonomi: sektorEkonomiOptions } = useKreditOptions();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState<KKMPAK | null>(null);

  const [formData, setFormData] = useState<KKMPAKFormData>(emptyForm());

  const resetForm = () => setFormData(emptyForm());

  const toFormData = (item: KKMPAK): KKMPAKFormData => ({
    namaDebitur: item.namaDebitur,
    jenisKredit: item.jenisKredit,
    plafon: formatCurrencyInput(item.plafon.toString()),
    jangkaWaktu: item.jangkaWaktu,
    jenisDebitur: item.jenisDebitur,
    kodeFasilitas: item.kodeFasilitas,
    sektorEkonomi: item.sektorEkonomi,
    tanggal: item.tanggal ? new Date(item.tanggal) : new Date(),
  });

  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setIsAddOpen(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
    const editId = searchParams.get('edit');
    if (editId && data.length) {
      const item = data.find(d => d.id === editId);
      if (item) {
        setSelectedItem(item);
        setFormData(toFormData(item));
        setIsEditOpen(true);
        searchParams.delete('edit');
        setSearchParams(searchParams, { replace: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, data, setSearchParams]);

  const validateRequired = (): string | null => {
    if (!formData.namaDebitur) return 'Nama Debitur wajib diisi.';
    if (!formData.jenisKredit) return 'Jenis Kredit wajib dipilih.';
    if (!formData.plafon) return 'Plafon wajib diisi.';
    return null;
  };

  const handleAdd = async () => {
    if (isSubmitting) return;
    const error = validateRequired();
    if (error) {
      toast({ title: 'Validasi Gagal', description: error, variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      const newItem = await add({
        namaDebitur: formData.namaDebitur,
        jenisKredit: formData.jenisKredit,
        plafon: parseCurrencyValue(formData.plafon),
        jangkaWaktu: formData.jangkaWaktu,
        jenisDebitur: formData.jenisDebitur,
        kodeFasilitas: formData.kodeFasilitas,
        sektorEkonomi: formData.sektorEkonomi,
        type,
        tanggal: formData.tanggal,
      });

      const msg = type === 'telihan'
        ? `KK Berhasil diinput dengan Nomor: ${newItem.nomorKK}\nMPAK Berhasil diinput dengan Nomor: ${newItem.nomorMPAK}`
        : `Agenda dan MPAK Berhasil diinput dengan Nomor: ${newItem.nomorKK}`;

      setSuccessMessage(msg);
      setIsAddOpen(false);
      setIsSuccessOpen(true);
      resetForm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (isSubmitting) return;
    if (!selectedItem) return;
    const error = validateRequired();
    if (error) {
      toast({ title: 'Validasi Gagal', description: error, variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    try {
      await update({
        id: selectedItem.id,
        data: {
          namaDebitur: formData.namaDebitur,
          jenisKredit: formData.jenisKredit,
          plafon: parseCurrencyValue(formData.plafon),
          jangkaWaktu: formData.jangkaWaktu,
          jenisDebitur: formData.jenisDebitur,
          kodeFasilitas: formData.kodeFasilitas,
          sektorEkonomi: formData.sektorEkonomi,
          tanggal: formData.tanggal,
        },
      });

      toast({ title: 'Berhasil', description: 'Data berhasil diperbarui.' });
      setIsEditOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Gagal memperbarui data.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    await remove(selectedItem.id);
    toast({ title: 'Berhasil', description: 'Data berhasil dihapus.' });
    setIsDeleteOpen(false);
    setSelectedItem(null);
  };

  const getJenisKreditLabel = (id: string) => {
    const jk = jenisKreditOptions.find(j => j.id === id);
    return jk ? `${jk.nama} - ${jk.produkKredit}` : id;
  };

  const handleExport = () => {
    const exportData = data.map(item => ({
      'No': item.nomor,
      [type === 'telihan' ? 'Nomor KK' : 'Nomor Agenda']: item.nomorKK,
      'Nomor MPAK': item.nomorMPAK,
      'Nama Debitur': item.namaDebitur,
      'Jenis Kredit': getJenisKreditLabel(item.jenisKredit),
      'Plafon': item.plafon,
      'Jangka Waktu': item.jangkaWaktu,
      'Jenis Debitur': item.jenisDebitur,
      'Kode Fasilitas': item.kodeFasilitas,
      'Sektor Ekonomi': item.sektorEkonomi,
      'Tanggal': item.tanggal ? format(new Date(item.tanggal), 'dd/MM/yyyy') : '-',
    }));
    const filename = type === 'telihan' ? 'KK_MPAK_Telihan' : 'Agenda_MPAK_Meranti';
    exportToExcel(exportData, filename, type === 'telihan' ? 'KK MPAK' : 'Agenda MPAK');
    toast({ title: 'Export Berhasil', description: 'Data berhasil diekspor.' });
  };

  const fields: CreditField<KKMPAKFormData>[] = [
    { type: 'date', key: 'tanggal', label: 'Tanggal' },
    { type: 'text', key: 'namaDebitur', label: 'Nama Debitur', required: true, placeholder: 'Nama debitur' },
    { type: 'select', key: 'jenisKredit', label: 'Jenis Kredit', required: true, placeholder: 'Pilih jenis kredit', options: jenisKreditOptions.map(jk => ({ value: jk.id, label: `${jk.nama} - ${jk.produkKredit}` })) },
    { type: 'currency', key: 'plafon', label: 'Plafon', required: true, placeholder: '1.000.000' },
    { type: 'text', key: 'jangkaWaktu', label: 'Jangka Waktu', placeholder: 'Contoh: 12 Bulan' },
    { type: 'select', key: 'jenisDebitur', label: 'Jenis Debitur', placeholder: 'Pilih jenis debitur', options: jenisDebiturOptions.map(jd => ({ value: jd.kode, label: `${jd.kode} - ${jd.keterangan}` })) },
    { type: 'select', key: 'kodeFasilitas', label: 'Kode Fasilitas', placeholder: 'Pilih kode fasilitas', options: kodeFasilitasOptions.map(kf => ({ value: kf.kode, label: `${kf.kode} - ${kf.keterangan}` })) },
    { type: 'select', key: 'sektorEkonomi', label: 'Sektor Ekonomi', placeholder: 'Pilih sektor ekonomi', options: sektorEkonomiOptions.map(se => ({ value: se.kode, label: `${se.kode} - ${se.keterangan}` })) },
  ];

  const columns = [
    { key: 'nomor', header: 'No', className: 'w-[60px]' },
    { key: 'nomorKK', header: type === 'telihan' ? 'Nomor KK' : 'Nomor Agenda' },
    { key: 'nomorMPAK', header: 'Nomor MPAK' },
    { key: 'namaDebitur', header: 'Nama Debitur' },
    { key: 'jenisKredit', header: 'Jenis Kredit', render: (item: KKMPAK) => getJenisKreditLabel(item.jenisKredit) },
    { key: 'plafon', header: 'Plafon', render: (item: KKMPAK) => formatCurrencyDisplay(item.plafon) },
    { key: 'tanggal', header: 'Tanggal', render: (item: KKMPAK) => item.tanggal ? format(new Date(item.tanggal), 'dd/MM/yyyy') : '-' },
    { key: 'jangkaWaktu', header: 'Jangka Waktu' },
  ];

  if (isLoading) {
    return <TablePageSkeleton />;
  }

  const entityTitle = type === 'telihan' ? 'KK & MPAK' : 'Agenda & MPAK';

  return (
    <MainLayout>
      <PageHeader title={title} description={`Kelola data ${title}`} />

      <DataTable
        data={data}
        columns={columns}
        onAdd={() => setIsAddOpen(true)}
        onExport={handleExport}
        onView={(item) => { setSelectedItem(item); setIsViewOpen(true); }}
        onEdit={(item) => { setSelectedItem(item); setFormData(toFormData(item)); setIsEditOpen(true); }}
        onDelete={(item) => { setSelectedItem(item); setIsDeleteOpen(true); }}
        canDelete={isAdmin}
        canEdit={canEdit}
        searchPlaceholder={`Cari ${entityTitle}...`}
        addLabel={`Tambah ${entityTitle}`}
      />

      <CreditFormDialog
        open={isAddOpen}
        onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}
        mode="add"
        entityTitle={title}
        description="Masukkan data baru"
        fields={fields}
        values={formData}
        onChange={setFormData}
        onSubmit={handleAdd}
        isSubmitting={isSubmitting}
      />

      <CreditViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title={`Detail ${entityTitle}`}>
        {selectedItem && (
          <CreditDetailGrid
            item={selectedItem}
            fields={[
              { label: type === 'telihan' ? 'Nomor KK' : 'Nomor Agenda', render: (i) => i.nomorKK },
              { label: 'Nomor MPAK', render: (i) => i.nomorMPAK },
              { label: 'Nama Debitur', render: (i) => i.namaDebitur },
              { label: 'Jenis Kredit', render: (i) => getJenisKreditLabel(i.jenisKredit) },
              { label: 'Plafon', render: (i) => formatCurrencyDisplay(i.plafon) },
              { label: 'Jangka Waktu', render: (i) => i.jangkaWaktu },
              { label: 'Tanggal', render: (i) => i.tanggal ? format(new Date(i.tanggal), 'dd MMMM yyyy', { locale: localeId }) : '-' },
              { label: 'Jenis Debitur', render: (i) => i.jenisDebitur },
              { label: 'Kode Fasilitas', render: (i) => i.kodeFasilitas },
              { label: 'Sektor Ekonomi', render: (i) => i.sektorEkonomi },
            ]}
          />
        )}
      </CreditViewDialog>

      <CreditFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        mode="edit"
        entityTitle={entityTitle}
        fields={fields}
        values={formData}
        onChange={setFormData}
        onSubmit={handleEdit}
        isSubmitting={isSubmitting}
      />

      <CreditDeleteDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={handleDelete}
        entityTitle="Data"
      />

      <CreditSuccessDialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen} message={successMessage} />
    </MainLayout>
  );
};

export default KKMPAKPage;
