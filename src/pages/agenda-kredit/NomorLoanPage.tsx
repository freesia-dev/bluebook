import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import type { Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NomorLoan } from "@/types";
import { useNomorLoanData } from "@/hooks/use-agenda-kredit-data";
import { exportToExcel } from "@/lib/export";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { id as localeId } from "date-fns/locale";
import { TablePageSkeleton } from "@/components/ui/page-skeleton";
import { CreditField, CreditDetailGrid } from "@/components/agenda-kredit/CreditFormFields";
import {
  CreditFormDialog,
  CreditDeleteDialog,
  CreditSuccessDialog,
  CreditViewDialog,
} from "@/components/agenda-kredit/CreditRecordDialogs";
import { formatRupiah } from '@/lib/uang';

const STARTING_LOAN_NUMBER = 14306840;
const SKEMA_OPTIONS = ['Supermikro', 'Mikro', 'Kecil'];
const UNIT_KERJA_OPTIONS = ['KCP Telihan', 'Meranti'];

const formatCurrency = (value: number) => formatRupiah(value);

interface NomorLoanFormData {
  nomorLoan: string;
  pkId: string;
  skema: string;
  unitKerja: string;
  tanggal: Date;
}

export default function NomorLoanPage() {
  const { toast } = useToast();
  const { isAdmin, canEdit } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, pkData, isLoading, add, update, remove } = useNomorLoanData();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSuccessDialogOpen, setIsSuccessDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<NomorLoan | null>(null);
  const [successData, setSuccessData] = useState<NomorLoan | null>(null);
  const [pkComboboxOpen, setPkComboboxOpen] = useState(false);

  const [formData, setFormData] = useState<NomorLoanFormData>({
    nomorLoan: '',
    pkId: '',
    skema: '',
    unitKerja: '',
    tanggal: new Date(),
  });

  const getNextLoanNumber = (): number => {
    if (data.length === 0) return STARTING_LOAN_NUMBER + 1;
    const maxNomorLoan = Math.max(...data.map(d => parseInt(d.nomorLoan)));
    return Math.max(maxNomorLoan, STARTING_LOAN_NUMBER) + 1;
  };

  const filteredPkData = useMemo(() => {
    if (!formData.unitKerja) return pkData;
    const type = formData.unitKerja === 'KCP Telihan' ? 'telihan' : 'meranti';
    return pkData.filter(pk => pk.type === type);
  }, [pkData, formData.unitKerja]);

  const selectedPk = useMemo(() => pkData.find(pk => pk.id === formData.pkId), [pkData, formData.pkId]);

  const resetForm = () => {
    setFormData({
      nomorLoan: getNextLoanNumber().toString(),
      pkId: '',
      skema: '',
      unitKerja: '',
      tanggal: new Date(),
    });
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleAdd = async () => {
    if (isSubmitting) return;
    if (!formData.nomorLoan || !formData.pkId || !formData.skema || !formData.unitKerja) {
      toast({ title: "Validasi Gagal", description: "Unit Kerja, Nama Debitur (PK), Nomor Loan, dan Skema wajib diisi.", variant: "destructive" });
      return;
    }

    const isDuplicate = data.some(d => d.nomorLoan === formData.nomorLoan);
    if (isDuplicate) {
      toast({ title: "Error", description: "Nomor Loan sudah ada dalam database.", variant: "destructive" });
      return;
    }

    const pk = pkData.find(p => p.id === formData.pkId);
    if (!pk) {
      toast({ title: "Error", description: "Data PK tidak ditemukan", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const newData = await add({
        nomorLoan: formData.nomorLoan,
        namaDebitur: pk.namaDebitur,
        nomorPK: pk.nomorPK,
        jenisKredit: pk.jenisKredit,
        produkKredit: pk.jenisKredit.split(' - ')[0] || pk.jenisKredit,
        plafon: pk.plafon,
        jangkaWaktu: pk.jangkaWaktu,
        skema: formData.skema,
        unitKerja: formData.unitKerja,
        pkId: formData.pkId,
        tanggal: formData.tanggal,
      });

      setIsDialogOpen(false);
      setSuccessData(newData);
      setIsSuccessDialogOpen(true);
      toast({ title: "Berhasil", description: "Data nomor loan berhasil ditambahkan" });
    } catch (error) {
      toast({ title: "Error", description: "Gagal menambahkan data", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (item: NomorLoan) => {
    setSelectedItem(item);
    setFormData({
      nomorLoan: item.nomorLoan,
      pkId: item.pkId || '',
      skema: item.skema,
      unitKerja: item.unitKerja,
      tanggal: item.tanggal ? new Date(item.tanggal) : new Date(),
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;
    if (!formData.nomorLoan || !formData.pkId || !formData.skema || !formData.unitKerja) {
      toast({ title: "Validasi Gagal", description: "Unit Kerja, Nama Debitur (PK), Nomor Loan, dan Skema wajib diisi.", variant: "destructive" });
      return;
    }

    const isDuplicate = data.some(d => d.nomorLoan === formData.nomorLoan && d.id !== selectedItem.id);
    if (isDuplicate) {
      toast({ title: "Error", description: "Nomor Loan sudah ada dalam database.", variant: "destructive" });
      return;
    }

    const pk = pkData.find(p => p.id === formData.pkId);
    if (!pk) {
      toast({ title: "Error", description: "Data PK tidak ditemukan", variant: "destructive" });
      return;
    }

    try {
      await update({
        id: selectedItem.id,
        data: {
          nomorLoan: formData.nomorLoan,
          namaDebitur: pk.namaDebitur,
          nomorPK: pk.nomorPK,
          jenisKredit: pk.jenisKredit,
          produkKredit: pk.jenisKredit.split(' - ')[0] || pk.jenisKredit,
          plafon: pk.plafon,
          jangkaWaktu: pk.jangkaWaktu,
          skema: formData.skema,
          unitKerja: formData.unitKerja,
          pkId: formData.pkId,
          tanggal: formData.tanggal,
        },
      });

      setIsEditDialogOpen(false);
      setSelectedItem(null);
      toast({ title: "Berhasil", description: "Data berhasil diperbarui" });
    } catch (error) {
      toast({ title: "Error", description: "Gagal memperbarui data", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      await remove(selectedItem.id);
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      toast({ title: "Berhasil", description: "Data berhasil dihapus" });
    } catch (error) {
      toast({ title: "Error", description: "Gagal menghapus data", variant: "destructive" });
    }
  };

  const handleExport = () => {
    const exportData = data.map((item, index) => ({
      'No': index + 1,
      'Nama Debitur': item.namaDebitur,
      'No. PK': item.nomorPK,
      'No. Loan': item.nomorLoan,
      'Jenis Kredit': item.jenisKredit,
      'Plafon Kredit': item.plafon,
      'Jangka Waktu': item.jangkaWaktu,
      'Skema': item.skema,
      'Unit Kerja': item.unitKerja,
      'Tanggal': item.tanggal ? format(new Date(item.tanggal), 'dd/MM/yyyy') : '-',
    }));
    exportToExcel(exportData, 'nomor-loan');
  };

  // Field kombinasi Unit Kerja + combobox pencarian PK, dipakai bareng di dialog
  // Tambah & Edit lewat tipe 'custom' pada skema field bersama.
  const pkPickerField = (comboboxKey: string): CreditField<NomorLoanFormData> => ({
    type: 'custom',
    key: 'pkPicker',
    render: (values, setValues) => (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Unit Kerja <span className="text-destructive">*</span></Label>
          <Select value={values.unitKerja} onValueChange={(v) => setValues({ ...values, unitKerja: v, pkId: '' })}>
            <SelectTrigger><SelectValue placeholder="Pilih Unit Kerja" /></SelectTrigger>
            <SelectContent>
              {UNIT_KERJA_OPTIONS.map((uk) => (<SelectItem key={uk} value={uk}>{uk}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Nama Debitur (dari PK) <span className="text-destructive">*</span></Label>
          <Popover open={pkComboboxOpen} onOpenChange={setPkComboboxOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between" disabled={!values.unitKerja}>
                {values.pkId
                  ? `${filteredPkData.find((pk) => pk.id === values.pkId)?.namaDebitur} - ${filteredPkData.find((pk) => pk.id === values.pkId)?.nomorPK}`
                  : values.unitKerja ? "Cari nama debitur..." : "Pilih Unit Kerja dulu"}
                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0">
              <Command>
                <CommandInput placeholder="Cari nama debitur..." />
                <CommandList>
                  <CommandEmpty>Tidak ditemukan.</CommandEmpty>
                  <CommandGroup>
                    {filteredPkData.map((pk) => (
                      <CommandItem key={pk.id} value={`${pk.namaDebitur} ${pk.nomorPK}`} onSelect={() => { setValues({ ...values, pkId: pk.id }); setPkComboboxOpen(false); }}>
                        <Check className={cn("mr-2 h-4 w-4", values.pkId === pk.id ? "opacity-100" : "opacity-0")} />
                        {pk.namaDebitur} - {pk.nomorPK}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>

        {selectedPk && (
          <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
            <p><span className="font-medium">Nomor PK:</span> {selectedPk.nomorPK}</p>
            <p><span className="font-medium">Plafon:</span> {formatCurrency(selectedPk.plafon)}</p>
            <p><span className="font-medium">Jangka Waktu:</span> {selectedPk.jangkaWaktu}</p>
            <p><span className="font-medium">Jenis Kredit:</span> {selectedPk.jenisKredit}</p>
          </div>
        )}
      </div>
    ),
  });

  const fields: CreditField<NomorLoanFormData>[] = [
    { type: 'date', key: 'tanggal', label: 'Tanggal' },
    pkPickerField('pkComboboxOpen'),
    { type: 'text', key: 'nomorLoan', label: 'Nomor Loan', required: true, placeholder: 'Nomor Loan' },
    { type: 'select', key: 'skema', label: 'Skema', required: true, placeholder: 'Pilih Skema', options: SKEMA_OPTIONS.map(s => ({ value: s, label: s })) },
  ];

  const columns: Column<NomorLoan>[] = [
    { key: 'nomor', header: 'No', className: 'w-16' },
    { key: 'namaDebitur', header: 'Nama Debitur' },
    { key: 'nomorPK', header: 'No. PK' },
    { key: 'nomorLoan', header: 'No. Loan' },
    { key: 'unitKerja', header: 'Unit Kerja' },
    { key: 'plafon', header: 'Plafon Kredit', render: (item) => formatCurrency(item.plafon) },
    { key: 'tanggal', header: 'Tanggal', render: (item) => item.tanggal ? format(new Date(item.tanggal), 'dd/MM/yyyy') : '-' },
    { key: 'skema', header: 'Skema' },
  ];

  if (isLoading) {
    return <TablePageSkeleton />;
  }

  return (
    <MainLayout>
      <PageHeader title="Nomor Loan" description="Generator nomor loan berdasarkan data PK" />

      <DataTable
        data={data}
        columns={columns}
        onAdd={handleOpenDialog}
        onView={(item) => { setSelectedItem(item); setIsViewDialogOpen(true); }}
        onEdit={handleEditClick}
        onDelete={isAdmin ? (item) => { setSelectedItem(item); setIsDeleteDialogOpen(true); } : undefined}
        onExport={handleExport}
        canEdit={canEdit}
      />

      <CreditFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        mode="add"
        entityTitle="Nomor Loan"
        description="Generate nomor loan baru"
        fields={fields}
        values={formData}
        onChange={setFormData}
        onSubmit={handleAdd}
        isSubmitting={isSubmitting}
      />

      <CreditViewDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen} title="Detail Nomor Loan">
        {selectedItem && (
          <CreditDetailGrid
            item={selectedItem}
            fields={[
              { label: 'Nama Debitur', render: (i) => i.namaDebitur },
              { label: 'No. PK', render: (i) => i.nomorPK },
              { label: 'No. Loan', render: (i) => i.nomorLoan },
              { label: 'Plafon', render: (i) => formatCurrency(i.plafon) },
              { label: 'Jangka Waktu', render: (i) => i.jangkaWaktu },
              { label: 'Skema', render: (i) => i.skema },
              { label: 'Unit Kerja', render: (i) => i.unitKerja },
              { label: 'Tanggal', render: (i) => i.tanggal ? format(new Date(i.tanggal), 'dd MMMM yyyy', { locale: localeId }) : '-' },
            ]}
          />
        )}
      </CreditViewDialog>

      <CreditFormDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        mode="edit"
        entityTitle="Nomor Loan"
        fields={fields}
        values={formData}
        onChange={setFormData}
        onSubmit={handleUpdate}
        isSubmitting={isSubmitting}
      />

      <CreditDeleteDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDelete}
        entityTitle="Nomor Loan"
        itemLabel={selectedItem?.nomorLoan}
      />

      <CreditSuccessDialog
        open={isSuccessDialogOpen}
        onOpenChange={setIsSuccessDialogOpen}
        message={`Nomor Loan: ${successData?.nomorLoan ?? ''}`}
      />
    </MainLayout>
  );
}
