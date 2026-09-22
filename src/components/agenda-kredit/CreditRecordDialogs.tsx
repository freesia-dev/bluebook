import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';
import { CreditField, CreditFormFields } from './CreditFormFields';
import { formatCurrencyInput } from '@/hooks/use-currency-input';

/**
 * Dialog Tambah/Edit generik untuk modul Agenda Kredit (PK, SPPK, KK & MPAK,
 * Nomor Loan), dibangun dari skema field (lihat CreditFormFields). Satu tempat
 * ini menggantikan blok JSX ~100 baris yang tadinya disalin manual ke tiap
 * halaman modul.
 */
interface CreditFormDialogProps<V extends Record<string, any>> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  entityTitle: string; // contoh: "PK Telihan"
  description?: string;
  // V ditentukan dari `values` saja (NoInfer), supaya bisa langsung mengoper
  // setState (`onChange={setFormData}`) tanpa TypeScript salah menebak tipe.
  fields: CreditField<NoInfer<V>>[];
  values: V;
  onChange: (values: NoInfer<V>) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
  extraContent?: React.ReactNode; // konten tambahan sebelum field (mis. ringkasan PK terpilih)
}

export function CreditFormDialog<V extends Record<string, any>>({
  open,
  onOpenChange,
  mode,
  entityTitle,
  description,
  fields,
  values,
  onChange,
  onSubmit,
  isSubmitting,
  extraContent,
}: CreditFormDialogProps<V>) {
  const isAdd = mode === 'add';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">{isAdd ? `Tambah ${entityTitle}` : `Edit ${entityTitle}`}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {extraContent}
        <CreditFormFields fields={fields} values={values} onChange={onChange} formatCurrencyInput={formatCurrencyInput} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Menyimpan...' : isAdd ? 'Simpan' : 'Simpan Perubahan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreditDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  itemLabel?: string;
  entityTitle: string; // contoh: "PK"
}

export function CreditDeleteDialog({ open, onOpenChange, onConfirm, itemLabel, entityTitle }: CreditDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus {entityTitle}?</AlertDialogTitle>
          <AlertDialogDescription>
            Apakah Anda yakin ingin menghapus {entityTitle.toLowerCase()}
            {itemLabel ? ` "${itemLabel}"` : ' ini'}? Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

interface CreditSuccessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
}

export function CreditSuccessDialog({ open, onOpenChange, message }: CreditSuccessDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm text-center">
        <div className="flex flex-col items-center gap-4 py-6">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <p className="text-lg font-medium text-foreground whitespace-pre-line">{message}</p>
        </div>
        <DialogFooter className="justify-center">
          <Button onClick={() => onOpenChange(false)}>OK</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreditViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: React.ReactNode;
}

export function CreditViewDialog({ open, onOpenChange, title, children }: CreditViewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{title}</DialogTitle>
        </DialogHeader>
        {children}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Tutup</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
