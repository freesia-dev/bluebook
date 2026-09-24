import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { DataTable } from '@/components/ui/data-table';
import { SPPK } from '@/types';
import { useSPPKData, useKreditOptions } from '@/hooks/use-agenda-kredit-data';
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

interface SPPKPageProps {
  type: 'telihan' | 'meranti';
  title: string;
}

interface SPPKFormData {
  namaDebitur: string;
  jenisKredit: string;
  plafon: string;
  jangkaWaktu: string;
  marketing: string;
  tanggal: Date;
}

const emptyForm = (type: 'telihan' | 'meranti'): SPPKFormData => ({
  namaDebitur: '',
  jenisKredit: '',
  plafon: '',
  jangkaWaktu: '',
  marketing: type === 'telihan' ? 'BAP' : '',
  tanggal: new Date(),
});

const SPPKPage: React.FC<SPPKPageProps> = ({ type, title }) => {
  const { toast } = useToast();
  const { isAdmin, canEdit } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading, add, update, remove } = useSPPKData(type);
  const { jenisKredit: jenisKreditOptions } = useKreditOptions();

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedItem, setSelectedItem] = useState<SPPK | null>(null);

  const [formData, setFormData] = useState<SPPKFormData>(emptyForm(type));

  const resetForm = () => setFormData(emptyForm(type));

  const toFormData = (item: SPPK): SPPKFormData => ({
    namaDebitur: item.namaDebitur,
    jenisKredit: item.jenisKredit,
    plafon: formatCurrencyInput(Number(item.plafon)),
    jangkaWaktu: item.jangkaWaktu,
    marketing: item.marketing,
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
        marketing: formData.marketing,
        type,
        tanggal: formData.tanggal,
      });

      setSuccessMessage(`SPPK Berhasil diinput dengan Nomor: ${newItem.nomorSPPK}`);
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
          marketing: formData.marketing,
          tanggal: formData.tanggal,
        },
      });

      toast({ title: 'Berhasil', description: 'Data SPPK berhasil diperbarui.' });
      setIsEditOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.message || 'Gagal memperbarui data SPPK.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    await remove(selectedItem.id);
    toast({ title: 'Berhasil', description: 'Data SPPK berhasil dihapus.' });
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
      'Nomor SPPK': item.nomorSPPK,
      'Nama Debitur': item.namaDebitur,
      'Jenis Kredit': getJenisKreditLabel(item.jenisKredit),
      'Plafon': item.plafon,
      'Jangka Waktu': item.jangkaWaktu,
      'Marketing': item.marketing,
      'Tanggal': item.tanggal ? format(new Date(item.tanggal), 'dd/MM/yyyy') : '-',
    }));
    exportToExcel(exportData, `SPPK_${type.charAt(0).toUpperCase() + type.slice(1)}`, 'SPPK');
    toast({ title: 'Export Berhasil', description: 'Data SPPK berhasil diekspor.' });
  };

  const fields: CreditField<SPPKFormData>[] = [
    { type: 'date', key: 'tanggal', label: 'Tanggal' },
    { type: 'text', key: 'namaDebitur', label: 'Nama Debitur', required: true, placeholder: 'Nama debitur' },
    { type: 'select', key: 'jenisKredit', label: 'Jenis Kredit', required: true, placeholder: 'Pilih jenis kredit', options: jenisKreditOptions.map(jk => ({ value: jk.id, label: `${jk.nama} - ${jk.produkKredit}` })) },
    { type: 'currency', key: 'plafon', label: 'Plafon', required: true, placeholder: '1.000.000' },
    { type: 'text', key: 'jangkaWaktu', label: 'Jangka Waktu', placeholder: 'Contoh: 12 Bulan' },
    type === 'telihan'
      ? { type: 'select', key: 'marketing', label: 'Marketing', placeholder: 'Pilih marketing', options: [{ value: 'BAP', label: 'BAP' }, { value: 'NON BAP', label: 'NON BAP' }] }
      : { type: 'text', key: 'marketing', label: 'Marketing', placeholder: 'Nama marketing' },
  ];

  const columns = [
    { key: 'nomor', header: 'No', className: 'w-[60px]' },
    { key: 'nomorSPPK', header: 'Nomor SPPK' },
    { key: 'namaDebitur', header: 'Nama Debitur' },
    { key: 'jenisKredit', header: 'Jenis Kredit', render: (item: SPPK) => getJenisKreditLabel(item.jenisKredit) },
    { key: 'plafon', header: 'Plafon', render: (item: SPPK) => formatCurrencyDisplay(item.plafon) },
    { key: 'jangkaWaktu', header: 'Jangka Waktu' },
    {
      key: 'tanggal',
      header: 'Tanggal',
      render: (item: SPPK) => item.tanggal ? format(new Date(item.tanggal), 'dd/MM/yyyy') : '-'
    },
    { key: 'marketing', header: 'Marketing' },
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
        searchPlaceholder="Cari SPPK..."
        addLabel="Tambah SPPK"
      />

      <CreditFormDialog
        open={isAddOpen}
        onOpenChange={(open) => { setIsAddOpen(open); if (!open) resetForm(); }}
        mode="add"
        entityTitle={title}
        description="Masukkan data SPPK baru"
        fields={fields}
        values={formData}
        onChange={setFormData}
        onSubmit={handleAdd}
        isSubmitting={isSubmitting}
      />

      <CreditViewDialog open={isViewOpen} onOpenChange={setIsViewOpen} title="Detail SPPK">
        {selectedItem && (
          <CreditDetailGrid
            item={selectedItem}
            fields={[
              { label: 'Nomor SPPK', render: (i) => i.nomorSPPK },
              { label: 'Nama Debitur', render: (i) => i.namaDebitur },
              { label: 'Jenis Kredit', render: (i) => getJenisKreditLabel(i.jenisKredit) },
              { label: 'Plafon', render: (i) => formatCurrencyDisplay(i.plafon) },
              { label: 'Jangka Waktu', render: (i) => i.jangkaWaktu },
              { label: 'Marketing', render: (i) => i.marketing },
              { label: 'Tanggal', render: (i) => i.tanggal ? format(new Date(i.tanggal), 'dd MMMM yyyy', { locale: localeId }) : '-' },
              { label: 'Tanggal Input', render: (i) => new Date(i.createdAt).toLocaleDateString('id-ID') },
            ]}
          />
        )}
      </CreditViewDialog>

      <CreditFormDialog
        open={isEditOpen}
        onOpenChange={setIsEditOpen}
        mode="edit"
        entityTitle="SPPK"
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
        entityTitle="SPPK"
        itemLabel={selectedItem?.nomorSPPK}
      />

      <CreditSuccessDialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen} message={successMessage} />
    </MainLayout>
  );
};

export default SPPKPage;
