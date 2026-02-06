import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCheck } from 'lucide-react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface StatusOption {
  from: string;
  to: string;
  count: number;
}

interface BulkStatusActionProps {
  statusOptions: StatusOption[];
  onBulkUpdate: (fromStatus: string, toStatus: string) => Promise<number>;
  onSuccess: () => void;
}

const BulkStatusAction: React.FC<BulkStatusActionProps> = ({
  statusOptions,
  onBulkUpdate,
  onSuccess,
}) => {
  const { toast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedOption, setSelectedOption] = useState<StatusOption | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const availableOptions = statusOptions.filter(opt => opt.count > 0);

  if (availableOptions.length === 0) return null;

  const handleSelect = (option: StatusOption) => {
    setSelectedOption(option);
    setIsConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!selectedOption) return;
    
    setIsUpdating(true);
    try {
      const count = await onBulkUpdate(selectedOption.from, selectedOption.to);
      toast({
        title: 'Status Diperbarui',
        description: `${count} item berhasil diubah dari "${selectedOption.from}" menjadi "${selectedOption.to}".`,
      });
      onSuccess();
      setIsConfirmOpen(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Gagal memperbarui status.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2 h-10">
            <CheckCheck className="w-4 h-4" />
            Ubah Status Massal
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          {availableOptions.map((option) => (
            <DropdownMenuItem
              key={`${option.from}-${option.to}`}
              onClick={() => handleSelect(option)}
              className="flex items-center justify-between gap-2 py-2.5"
            >
              <span className="text-sm">
                <span className="font-medium">{option.from}</span>
                {' → '}
                <span className="font-medium">{option.to}</span>
              </span>
              <Badge variant="secondary" className="text-xs">
                {option.count} item
              </Badge>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ubah Status Massal?</AlertDialogTitle>
            <AlertDialogDescription>
              Apakah Anda yakin ingin mengubah semua{' '}
              <span className="font-semibold text-foreground">{selectedOption?.count} item</span>{' '}
              dengan status "<span className="font-semibold text-foreground">{selectedOption?.from}</span>" 
              menjadi "<span className="font-semibold text-foreground">{selectedOption?.to}</span>"?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm} disabled={isUpdating}>
              {isUpdating ? 'Memperbarui...' : 'Ya, Ubah Semua'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkStatusAction;
