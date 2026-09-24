import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { PK } from '@/types';
import { usePKData, useKreditOptions } from '@/hooks/use-agenda-kredit-data';
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

interface PKPageProps {
  type: 'telihan' | 'meranti';
  title: string;
}

interface PKFormData {
  namaDebitur: string;
  jenisKredit: string;
  plafon: string;
  jangkaWaktu: string;
  jenisDebitur: string;
  jenisPenggunaan: string;
  sektorEkonomi: string;
  asalInstansi: string;
  isKBK: boolean;
  tanggal: Date;
}

const emptyForm = (type: 'telihan' | 'meranti'): PKFormData => ({
  namaDebitur: '',
  jenisKredit: '',
  plafon: '',
  jangkaWaktu: '',
  jenisDebitur: '',
  jenisPenggunaan: '',
  sektorEkonomi: '',
  asalInstansi: '',
  isKBK: false,
  tanggal: new Date(),
});

const PKPage: React.FC<PKPageProps> = ({ type, title }) => {
  const { toast } = useToast();
  const { isAdmin, canEdit } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, add, update, remove } = usePKData(type);
  const { jenisKredit: jenisKreditOptions, jenisDebitur: jenisDebiturOptions, jenisPenggunaan: jenisPenggunaanOptions, sektorEkonomi: sektorEkonomiOptions, asalInstansi: asalInstansiOptions } = useKreditOptions();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState<PK | null>(null);

  const [formData, setFormData] = useState<PKFormData>(emptyForm(type));

  const resetForm = () => setFormData(emptyForm(type));

  const toFormData = (item: PK): PKFormData => ({
    namaDebitur: item.namaDebitur,
    jenisKredit: item.jenisKredit,
    plafon: formatCurrencyInput(Number(item.plafon)),
    jangkaWaktu: item.jangkaWaktu,
    jenisDebitur: item.jenisDebitur,
    jenisPenggunaan: item.jenisPenggunaan,
    sektorEkonomi: item.sektorEkonomi,
    asalInstansi: item.asalInstansi || '',
    isKBK: false,
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
        jenisPenggunaan: formData.jenisPenggunaan,
        sektorEkonomi: formData.sektorEkonomi,
        asalInstansi: formData.asalInstansi,
        type,
        isKBK: type === 'telihan' ? formData.isKBK : false,
        tanggal: formData.tanggal,
      });

      setSuccessMessage(`PK Berhasil diinput dengan Nomor: ${newItem.nomorPK}`);
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
          jenisPenggunaan: formData.jenisPenggunaan,
          sektorEkonomi: formData.sektorEkonomi,
          asalInstansi: formData.asalInstansi,
          tanggal: formData.tanggal,
        },
      });

      toast({ title: 'Berhasil', description: 'Data PK berhasil diperbarui.' });
      setIsEditOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Gagal memperbarui data PK.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    await remove(selectedItem.id);
    toast({ title: 'Berhasil', description: 'Data PK berhasil dihapus.' });
    setIsDeleteOpen(false);
    setSelectedItem(null);
  };

  const getJenisKreditLabel = (id: string) => {
    const jk = jenisKreditOptions.find(j => j.id === id);
    return jk ? `${jk.nama} - ${jk.produkKredit}` : id;
  };

  const getAsalInstansiLabel = (kode?: string) => {
    if (!kode) return '-';
    const ai = asalInstansiOptions.find(a => a.kode === kode);
    return ai ? `${ai.kode} - ${ai.keterangan}` : kode;
  };

  const handleExport = () => {
    const exportData = data.map(item => ({
      'No': item.nomor,
      'Nomor PK': item.nomorPK,
      'Nama Debitur': item.namaDebitur,
      'Jenis Kredit': getJenisKreditLabel(item.jenisKredit),
      'Plafon': item.plafon,
      'Jangka Waktu': item.jangkaWaktu,
      'Jenis Debitur': item.jenisDebitur,
      'Jenis Penggunaan': item.jenisPenggunaan,
      'Sektor Ekonomi': item.sektorEkonomi,
      'Asal Instansi': getAsalInstansiLabel(item.asalInstansi),
      'Tanggal': item.tanggal ? format(new Date(item.tanggal), 'dd/MM/yyyy') : '-',
    }));
    exportToExcel(exportData, `PK_${type.charAt(0).toUpperCase() + type.slice(1)}`, 'PK');
    toast({ title: 'Export Berhasil', description: 'Data PK berhasil diekspor.' });
  };

  const fields: CreditField<PKFormData>[] = [
    { type: 'date', key: 'tanggal', label: 'Tanggal' },
    { type: 'text', key: 'namaDebitur', label: 'Nama Debitur', required: true, placeholder: 'Nama debitur' },
    { type: 'select', key: 'jenisKredit', label: 'Jenis Kredit', required: true, placeholder: 'Pilih jenis kredit', options: jenisKreditOptions.map(jk => ({ value: jk.id, label: `${jk.nama} - ${jk.produkKredit}` })) },
    { type: 'currency', key: 'plafon', label: 'Plafon', required: true },
    { type: 'checkbox', key: 'isKBK', label: 'KBK (Kredit Bontang Kreatif)', visible: () => type === 'telihan' },
    { type: 'text', key: 'jangkaWaktu', label: 'Jangka Waktu', placeholder: 'Contoh: 12 Bulan' },
    { type: 'select', key: 'jenisDebitur', label: 'Jenis Debitur', placeholder: 'Pilih jenis debitur', options: jenisDebiturOptions.map(jd => ({ value: jd.kode, label: `${jd.kode} - ${jd.keterangan}` })) },
    { type: 'select', key: 'jenisPenggunaan', label: 'Jenis Penggunaan', placeholder: 'Pilih jenis penggunaan', options: jenisPenggunaanOptions.map(jp => ({ value: jp.kode, label: `${jp.kode} - ${jp.keterangan}` })) },
    { type: 'select', key: 'sektorEkonomi', label: 'Sektor Ekonomi', placeholder: 'Pilih sektor ekonomi', options: sektorEkonomiOptions.map(se => ({ value: se.kode, label: `${se.kode} - ${se.keterangan}` })) },
    { type: 'select', key: 'asalInstansi', label: 'Asal Instansi', placeholder: 'Pilih asal instansi', options: asalInstansiOptions.map(ai => ({ value: ai.kode, label: `${ai.kode} - ${ai.keterangan}` })) },
  ];

  const columns = [
    { key: 'nomor', header: 'No', className: 'w-[60px]' },
    { key: 'nomorPK', header: 'Nomor PK' },
    { key: 'namaDebitur', header: 'Nama Debitur' },
    { key: 'jenisKredit', header: 'Jenis Kredit', render: (item: PK) => getJenisKreditLabel(item.jenisKredit) },
    { key: 'plafon', header: 'Plafon', render: (item: PK) => formatCurrencyDisplay(item.plafon) },
    { key: 'jangkaWaktu', header: 'Jangka Waktu' },
    {
      key: 'tanggal',
      header: 'Tanggal',
      render: (item: PK) => item.tanggal ? format(new Date(item.tanggal), 'dd/MM/yyyy') : '-'
    },
    { key: 'jenisDebitur', header: 'Jenis Debitur' },
    { key: 'asalInstansi', header: 'Asal Instansi', render: (item: PK) => getAsalInstansiLabel(item.asalInstansi) },
  ];

  if (isLoading) {
    return <TablePageSkeleton />;
  }

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
        searchPlaceholder="Cari PK..."
        addLabel="Tambah PK"
      />

      <CreditFormDialog
        open={isAddOpen}
        onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}
        mode="add"
        entityTitle={title}
        description="Masukkan data PK baru"
        fields={fields}
        values={formData}
        onChange={setFormData}
        onSubmit={handleAdd}
        isSubmitting={isSubmitting}
      />

      <CreditViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Detail PK">
        {selectedItem && (
          <CreditDetailGrid
            item={selectedItem}
            fields={[
              { label: 'Nomor PK', render: (i) => i.nomorPK },
              { label: 'Nama Debitur', render: (i) => i.namaDebitur },
              { label: 'Jenis Kredit', render: (i) => getJenisKreditLabel(i.jenisKredit) },
              { label: 'Plafon', render: (i) => formatCurrencyDisplay(i.plafon) },
              { label: 'Jangka Waktu', render: (i) => i.jangkaWaktu },
              { label: 'Tanggal', render: (i) => i.tanggal ? format(new Date(i.tanggal), 'dd MMMM yyyy', { locale: localeId }) : '-' },
              { label: 'Jenis Debitur', render: (i) => i.jenisDebitur },
              { label: 'Jenis Penggunaan', render: (i) => i.jenisPenggunaan },
              { label: 'Sektor Ekonomi', render: (i) => i.sektorEkonomi },
              { label: 'Asal Instansi', render: (i) => getAsalInstansiLabel(i.asalInstansi) },
            ]}
          />
        )}
      </CreditViewDialog>

      <CreditFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        mode="edit"
        entityTitle="PK"
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
        entityTitle="PK"
        itemLabel={selectedItem?.nomorPK}
      />

      <CreditSuccessDialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen} message={successMessage} />
    </MainLayout>
  );
};

export default PKPage;
