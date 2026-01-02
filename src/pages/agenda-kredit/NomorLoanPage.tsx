import { useState, useEffect, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { MainLayout } from "@/components/layout/MainLayout";
import { PageHeader } from "@/components/ui/page-header";
import { DataTable } from "@/components/ui/data-table";
import type { Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { NomorLoan, PK } from "@/types";
import { 
  getNomorLoan, 
  addNomorLoan, 
  updateNomorLoan, 
  deleteNomorLoan,
  getPK
} from "@/lib/supabase-store";
import { exportToExcel } from "@/lib/export";
import { useAuth } from "@/contexts/AuthContext";


const STARTING_LOAN_NUMBER = 14306840;
const SKEMA_OPTIONS = ['Supermikro', 'Mikro', 'Kecil'];
const UNIT_KERJA_OPTIONS = ['KCP Telihan', 'Meranti'];

export default function NomorLoanPage() {
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const [data, setData] = useState<NomorLoan[]>([]);
  const [pkData, setPkData] = useState<PK[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    unitKerja: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [loanData, pkResult] = await Promise.all([
        getNomorLoan(),
        getPK()
      ]);
      setData(loanData);
      setPkData(pkResult);
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memuat data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get the next loan number
  const getNextLoanNumber = (): number => {
    if (data.length === 0) {
      return STARTING_LOAN_NUMBER + 1;
    }
    const maxNomorLoan = Math.max(...data.map(d => parseInt(d.nomorLoan)));
    return Math.max(maxNomorLoan, STARTING_LOAN_NUMBER) + 1;
  };

  // Filter PK data by unit kerja
  const filteredPkData = useMemo(() => {
    if (!formData.unitKerja) return pkData;
    const type = formData.unitKerja === 'KCP Telihan' ? 'telihan' : 'meranti';
    return pkData.filter(pk => pk.type === type);
  }, [pkData, formData.unitKerja]);

  // Get selected PK data
  const selectedPk = useMemo(() => {
    return pkData.find(pk => pk.id === formData.pkId);
  }, [pkData, formData.pkId]);

  const resetForm = () => {
    setFormData({
      nomorLoan: getNextLoanNumber().toString(),
      pkId: '',
      skema: '',
      unitKerja: ''
    });
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const handleAdd = async () => {
    if (!formData.nomorLoan || !formData.pkId || !formData.skema || !formData.unitKerja) {
      toast({
        title: "Error",
        description: "Semua field harus diisi",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate nomor loan
    const isDuplicate = data.some(d => d.nomorLoan === formData.nomorLoan);
    if (isDuplicate) {
      toast({
        title: "Error",
        description: "Nomor Loan sudah ada dalam database. Silakan gunakan nomor lain.",
        variant: "destructive",
      });
      return;
    }

    const pk = pkData.find(p => p.id === formData.pkId);
    if (!pk) {
      toast({
        title: "Error",
        description: "Data PK tidak ditemukan",
        variant: "destructive",
      });
      return;
    }

    try {
      const newData = await addNomorLoan({
        nomorLoan: formData.nomorLoan,
        namaDebitur: pk.namaDebitur,
        nomorPK: pk.nomorPK,
        jenisKredit: pk.jenisKredit,
        produkKredit: pk.jenisKredit.split(' - ')[0] || pk.jenisKredit,
        plafon: pk.plafon,
        jangkaWaktu: pk.jangkaWaktu,
        skema: formData.skema,
        unitKerja: formData.unitKerja,
        pkId: formData.pkId
      });
      
      setData(prev => [...prev, newData]);
      setIsDialogOpen(false);
      setSuccessData(newData);
      setIsSuccessDialogOpen(true);
      
      toast({
        title: "Berhasil",
        description: "Data nomor loan berhasil ditambahkan",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menambahkan data",
        variant: "destructive",
      });
    }
  };

  const handleView = (item: NomorLoan) => {
    setSelectedItem(item);
    setIsViewDialogOpen(true);
  };

  const handleEdit = (item: NomorLoan) => {
    setSelectedItem(item);
    setFormData({
      nomorLoan: item.nomorLoan,
      pkId: item.pkId || '',
      skema: item.skema,
      unitKerja: item.unitKerja
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async () => {
    if (!selectedItem) return;

    // Check for duplicate nomor loan (exclude current item)
    const isDuplicate = data.some(d => d.nomorLoan === formData.nomorLoan && d.id !== selectedItem.id);
    if (isDuplicate) {
      toast({
        title: "Error",
        description: "Nomor Loan sudah ada dalam database. Silakan gunakan nomor lain.",
        variant: "destructive",
      });
      return;
    }

    const pk = pkData.find(p => p.id === formData.pkId);
    if (!pk) {
      toast({
        title: "Error",
        description: "Data PK tidak ditemukan",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateNomorLoan(selectedItem.id, {
        nomorLoan: formData.nomorLoan,
        namaDebitur: pk.namaDebitur,
        nomorPK: pk.nomorPK,
        jenisKredit: pk.jenisKredit,
        produkKredit: pk.jenisKredit.split(' - ')[0] || pk.jenisKredit,
        plafon: pk.plafon,
        jangkaWaktu: pk.jangkaWaktu,
        skema: formData.skema,
        unitKerja: formData.unitKerja,
        pkId: formData.pkId
      });
      
      await loadData();
      setIsEditDialogOpen(false);
      setSelectedItem(null);
      
      toast({
        title: "Berhasil",
        description: "Data berhasil diperbarui",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal memperbarui data",
        variant: "destructive",
      });
    }
  };

  const handleDelete = (item: NomorLoan) => {
    setSelectedItem(item);
    setIsDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedItem) return;

    try {
      await deleteNomorLoan(selectedItem.id);
      setData(prev => prev.filter(d => d.id !== selectedItem.id));
      setIsDeleteDialogOpen(false);
      setSelectedItem(null);
      
      toast({
        title: "Berhasil",
        description: "Data berhasil dihapus",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Gagal menghapus data",
        variant: "destructive",
      });
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
      'Unit Kerja': item.unitKerja
    }));
    exportToExcel(exportData, 'nomor-loan');
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const columns: Column<NomorLoan>[] = [
    { key: 'nomor', header: 'No', className: 'w-16' },
    { key: 'namaDebitur', header: 'Nama Debitur' },
    { key: 'nomorPK', header: 'No. PK' },
    { key: 'nomorLoan', header: 'No. Loan' },
    { key: 'jenisKredit', header: 'Jenis Kredit' },
    { 
      key: 'plafon', 
      header: 'Plafon Kredit',
      render: (item) => formatCurrency(item.plafon)
    },
    { key: 'jangkaWaktu', header: 'Jangka Waktu' },
    { key: 'skema', header: 'Skema' },
    { key: 'unitKerja', header: 'Unit Kerja' },
  ];

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Nomor Loan"
        description="Generator nomor loan berdasarkan data PK"
      />

      <DataTable
        data={data}
        columns={columns}
        onAdd={handleOpenDialog}
        onView={handleView}
        onEdit={handleEdit}
        onDelete={isAdmin ? handleDelete : undefined}
        onExport={handleExport}
      />

      {/* Add Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Tambah Nomor Loan</DialogTitle>
            <DialogDescription>Generate nomor loan baru</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Unit Kerja</Label>
              <Select
                value={formData.unitKerja}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, unitKerja: value, pkId: '' }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Unit Kerja" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_KERJA_OPTIONS.map(uk => (
                    <SelectItem key={uk} value={uk}>{uk}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nama Debitur (dari PK)</Label>
              <Popover open={pkComboboxOpen} onOpenChange={setPkComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={pkComboboxOpen}
                    className="w-full justify-between"
                    disabled={!formData.unitKerja}
                  >
                    {formData.pkId
                      ? filteredPkData.find((pk) => pk.id === formData.pkId)?.namaDebitur + " - " + filteredPkData.find((pk) => pk.id === formData.pkId)?.nomorPK
                      : formData.unitKerja ? "Cari nama debitur..." : "Pilih Unit Kerja dulu"}
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
                          <CommandItem
                            key={pk.id}
                            value={`${pk.namaDebitur} ${pk.nomorPK}`}
                            onSelect={() => {
                              setFormData(prev => ({ ...prev, pkId: pk.id }));
                              setPkComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.pkId === pk.id ? "opacity-100" : "opacity-0"
                              )}
                            />
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
              <Input
                type="text"
                value={formData.nomorLoan}
                onChange={(e) => setFormData(prev => ({ ...prev, nomorLoan: e.target.value }))}
                placeholder="Nomor Loan"
              />
              <p className="text-xs text-muted-foreground">Auto-generate, bisa diedit jika diperlukan</p>
            </div>

            <div className="space-y-2">
              <Label>Skema Kredit</Label>
              <Select
                value={formData.skema}
                onValueChange={(value) => setFormData(prev => ({ ...prev, skema: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Skema" />
                </SelectTrigger>
                <SelectContent>
                  {SKEMA_OPTIONS.map(skema => (
                    <SelectItem key={skema} value={skema}>{skema}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
            <Button onClick={handleAdd}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Dialog */}
      <Dialog open={isSuccessDialogOpen} onOpenChange={setIsSuccessDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-primary">Nomor Loan Berhasil Dibuat</DialogTitle>
          </DialogHeader>
          
          {successData && (
            <div className="text-center space-y-4 py-4">
              <div className="text-4xl font-bold text-primary">{successData.nomorLoan}</div>
              <div className="text-xl font-semibold">{successData.namaDebitur}</div>
              <div className="text-muted-foreground">
                {successData.produkKredit} - {successData.skema} - {successData.unitKerja}
              </div>
            </div>
          )}

          <DialogFooter className="justify-center">
            <Button onClick={() => setIsSuccessDialogOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detail Nomor Loan</DialogTitle>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Nomor Loan:</span>
                <span className="font-medium">{selectedItem.nomorLoan}</span>
                
                <span className="text-muted-foreground">Nama Debitur:</span>
                <span className="font-medium">{selectedItem.namaDebitur}</span>
                
                <span className="text-muted-foreground">Nomor PK:</span>
                <span className="font-medium">{selectedItem.nomorPK}</span>
                
                <span className="text-muted-foreground">Jenis Kredit:</span>
                <span className="font-medium">{selectedItem.jenisKredit}</span>
                
                <span className="text-muted-foreground">Plafon:</span>
                <span className="font-medium">{formatCurrency(selectedItem.plafon)}</span>
                
                <span className="text-muted-foreground">Jangka Waktu:</span>
                <span className="font-medium">{selectedItem.jangkaWaktu}</span>
                
                <span className="text-muted-foreground">Skema:</span>
                <span className="font-medium">{selectedItem.skema}</span>
                
                <span className="text-muted-foreground">Unit Kerja:</span>
                <span className="font-medium">{selectedItem.unitKerja}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Nomor Loan</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Unit Kerja</Label>
              <Select
                value={formData.unitKerja}
                onValueChange={(value) => {
                  setFormData(prev => ({ ...prev, unitKerja: value, pkId: '' }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Unit Kerja" />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_KERJA_OPTIONS.map(uk => (
                    <SelectItem key={uk} value={uk}>{uk}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nama Debitur (dari PK)</Label>
              <Popover open={editPkComboboxOpen} onOpenChange={setEditPkComboboxOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={editPkComboboxOpen}
                    className="w-full justify-between"
                    disabled={!formData.unitKerja}
                  >
                    {formData.pkId
                      ? filteredPkData.find((pk) => pk.id === formData.pkId)?.namaDebitur + " - " + filteredPkData.find((pk) => pk.id === formData.pkId)?.nomorPK
                      : "Cari nama debitur..."}
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
                          <CommandItem
                            key={pk.id}
                            value={`${pk.namaDebitur} ${pk.nomorPK}`}
                            onSelect={() => {
                              setFormData(prev => ({ ...prev, pkId: pk.id }));
                              setEditPkComboboxOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                formData.pkId === pk.id ? "opacity-100" : "opacity-0"
                              )}
                            />
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
              <Input
                type="text"
                value={formData.nomorLoan}
                onChange={(e) => setFormData(prev => ({ ...prev, nomorLoan: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Skema Kredit</Label>
              <Select
                value={formData.skema}
                onValueChange={(value) => setFormData(prev => ({ ...prev, skema: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Pilih Skema" />
                </SelectTrigger>
                <SelectContent>
                  {SKEMA_OPTIONS.map(skema => (
                    <SelectItem key={skema} value={skema}>{skema}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Batal</Button>
            <Button onClick={handleUpdate}>Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Data</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin menghapus data nomor loan {selectedItem?.nomorLoan}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Hapus</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
