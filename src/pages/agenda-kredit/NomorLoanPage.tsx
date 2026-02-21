import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import type { Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, CalendarIcon, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { NomorLoan } from "@/types";
import { useNomorLoanData } from "@/hooks/use-agenda-kredit-data";
import { exportToExcel } from "@/lib/export";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { TablePageSkeleton } from "@/components/ui/page-skeleton";

const STARTING_LOAN_NUMBER = 14306840;
const SKEMA_OPTIONS = ['Supermikro', 'Mikro', 'Kecil'];
const UNIT_KERJA_OPTIONS = ['KCP Telihan', 'Meranti'];

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
  const [editPkComboboxOpen, setEditPkComboboxOpen] = useState(false);

  const [formData, setFormData] = useState({
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
      toast({ title: "Error", description: "Semua field harus diisi", variant: "destructive" });
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

  const handleView = (item: NomorLoan) => {
    setSelectedItem(item);
    setIsViewDialogOpen(true);
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

  const handleDelete = (item: NomorLoan) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
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

  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  const DatePickerField = ({ value, onChange, label }: { value: Date; onChange: (date: Date) => void; label: string }) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, 'dd MMMM yyyy', { locale: id }) : <span>Pilih tanggal</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={(date) => date && onChange(date)} initialFocus className="p-3 pointer-events-auto" />
        </PopoverContent>
      </Popover>
    </div>
  );

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
        onView={handleView}
        onEdit={handleEditClick}
        onDelete={isAdmin ? handleDelete : undefined}
        onExport={handleExport}
        canEdit={canEdit}
      />

      {/* Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Nomor Loan</DialogTitle>
            <DialogDescription>Generate nomor loan baru</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <DatePickerField value={formData.tanggal} onChange={(date) => setFormData(prev => ({ ...prev, tanggal: date }))} label="Tanggal" />
            
            <div className="space-y-2">
              <Label>Unit Kerja</Label>
              <Select value={formData.unitKerja} onValueChange={(value) => setFormData(prev => ({ ...prev, unitKerja: value, pkId: '' }))}>
                <SelectTrigger><SelectValue placeholder="Pilih Unit Kerja" /></SelectTrigger>
                <SelectContent>{UNIT_KERJA_OPTIONS.map(uk => (<SelectItem key={uk} value={uk}>{uk}</SelectItem>))}</SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nama Debitur (dari PK)</Label>
              <Popover open={pkComboboxOpen} onOpenChange={setPkComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" aria-expanded={pkComboboxOpen} className="w-full justify-between" disabled={!formData.unitKerja}>
                    {formData.pkId ? filteredPkData.find((pk) => pk.id === formData.pkId)?.namaDebitur + " - " + filteredPkData.find((pk) => pk.id === formData.pkId)?.nomorPK : formData.unitKerja ? "Cari nama debitur..." : "Pilih Unit Kerja dulu"}
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
                          <CommandItem key={pk.id} value={`${pk.namaDebitur} ${pk.nomorPK}`} onSelect={() => { setFormData(prev => ({ ...prev, pkId: pk.id })); setPkComboboxOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", formData.pkId === pk.id ? "opacity-100" : "opacity-0")} />
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

            <div className="space-y-2">
              <Label>Nomor Loan</Label>
              <Input type="text" value={formData.nomorLoan} onChange={(e) => setFormData(prev => ({ ...prev, nomorLoan: e.target.value }))} placeholder="Nomor Loan" />
            </div>

            <div className="space-y-2">
              <Label>Skema</Label>
              <Select value={formData.skema} onValueChange={(value) => setFormData(prev => ({ ...prev, skema: value }))}>
                <SelectTrigger><SelectValue placeholder="Pilih Skema" /></SelectTrigger>
                <SelectContent>{SKEMA_OPTIONS.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>{isSubmitting ? 'Menyimpan...' : 'Simpan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Detail Nomor Loan</DialogTitle></DialogHeader>
          {selectedItem && (
            <div className="grid grid-cols-2 gap-4 py-4">
              <div><p className="text-sm text-muted-foreground">Nama Debitur</p><p className="font-medium">{selectedItem.namaDebitur}</p></div>
              <div><p className="text-sm text-muted-foreground">No. PK</p><p className="font-medium">{selectedItem.nomorPK}</p></div>
              <div><p className="text-sm text-muted-foreground">No. Loan</p><p className="font-medium">{selectedItem.nomorLoan}</p></div>
              <div><p className="text-sm text-muted-foreground">Plafon</p><p className="font-medium">{formatCurrency(selectedItem.plafon)}</p></div>
              <div><p className="text-sm text-muted-foreground">Jangka Waktu</p><p className="font-medium">{selectedItem.jangkaWaktu}</p></div>
              <div><p className="text-sm text-muted-foreground">Skema</p><p className="font-medium">{selectedItem.skema}</p></div>
              <div><p className="text-sm text-muted-foreground">Unit Kerja</p><p className="font-medium">{selectedItem.unitKerja}</p></div>
              <div><p className="text-sm text-muted-foreground">Tanggal</p><p className="font-medium">{selectedItem.tanggal ? format(new Date(selectedItem.tanggal), 'dd MMMM yyyy', { locale: id }) : '-'}</p></div>
            </div>
          )}
          <DialogFooter><Button onClick={() => setIsViewDialogOpen(false)}>Tutup</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Nomor Loan</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <DatePickerField value={formData.tanggal} onChange={(date) => setFormData(prev => ({ ...prev, tanggal: date }))} label="Tanggal" />
            <div className="space-y-2">
              <Label>Unit Kerja</Label>
              <Select value={formData.unitKerja} onValueChange={(value) => setFormData(prev => ({ ...prev, unitKerja: value, pkId: '' }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{UNIT_KERJA_OPTIONS.map(uk => (<SelectItem key={uk} value={uk}>{uk}</SelectItem>))}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nama Debitur (dari PK)</Label>
              <Popover open={editPkComboboxOpen} onOpenChange={setEditPkComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="w-full justify-between" disabled={!formData.unitKerja}>
                    {formData.pkId ? filteredPkData.find((pk) => pk.id === formData.pkId)?.namaDebitur + " - " + filteredPkData.find((pk) => pk.id === formData.pkId)?.nomorPK : "Cari nama debitur..."}
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
                          <CommandItem key={pk.id} value={`${pk.namaDebitur} ${pk.nomorPK}`} onSelect={() => { setFormData(prev => ({ ...prev, pkId: pk.id })); setEditPkComboboxOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", formData.pkId === pk.id ? "opacity-100" : "opacity-0")} />
                            {pk.namaDebitur} - {pk.nomorPK}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2"><Label>Nomor Loan</Label><Input value={formData.nomorLoan} onChange={(e) => setFormData(prev => ({ ...prev, nomorLoan: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Skema</Label>
              <Select value={formData.skema} onValueChange={(value) => setFormData(prev => ({ ...prev, skema: value }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SKEMA_OPTIONS.map(s => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
            <Button onClick={handleUpdate}>Simpan Perubahan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Nomor Loan?</AlertDialogTitle>
            <AlertDialogDescription>Apakah Anda yakin ingin menghapus nomor loan "{selectedItem?.nomorLoan}"?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Success Dialog */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="max-w-sm text-center">
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <p className="text-lg font-medium text-foreground">Nomor Loan: {successData?.nomorLoan}</p>
          </div>
          <DialogFooter className="justify-center"><Button onClick={() => setIsSuccessDialogOpen(false)}>OK</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
