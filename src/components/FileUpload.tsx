import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Upload, X, FileText, Download, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FileUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  folder?: string;
  readOnly?: boolean;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export const FileUpload: React.FC<FileUploadProps> = ({
  value,
  onChange,
  label = 'Dokumen Lampiran',
  folder = 'surat',
  readOnly = false,
}) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_FILE_SIZE) {
      toast({ title: 'File Terlalu Besar', description: 'Ukuran maksimal file adalah 10MB.', variant: 'destructive' });
      return;
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: 'Format Tidak Didukung', description: 'Gunakan format PDF, gambar, Word, atau Excel.', variant: 'destructive' });
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${folder}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setFileName(file.name);
      onChange(urlData.publicUrl);
      toast({ title: 'Upload Berhasil', description: `File "${file.name}" berhasil diupload.` });
    } catch (error: any) {
      toast({ title: 'Upload Gagal', description: error.message || 'Gagal mengupload file.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleRemove = () => {
    setFileName(null);
    onChange(null);
  };

  const getDisplayName = () => {
    if (fileName) return fileName;
    if (value) {
      try {
        const url = new URL(value);
        const parts = url.pathname.split('/');
        return parts[parts.length - 1] || 'Dokumen';
      } catch {
        return 'Dokumen';
      }
    }
    return null;
  };

  const displayName = getDisplayName();

  return (
    <div className="space-y-2">
      <Label>{label} <span className="text-xs text-muted-foreground font-normal">(opsional)</span></Label>
      
      {value && displayName ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-border bg-muted/50">
          <FileText className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm truncate flex-1">{displayName}</span>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => window.open(value, '_blank')}
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
            {!readOnly && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                onClick={handleRemove}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      ) : !readOnly ? (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start text-muted-foreground font-normal"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Mengupload...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Pilih file (PDF, Gambar, Word, Excel - maks 10MB)
              </>
            )}
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Tidak ada dokumen</p>
      )}
    </div>
  );
};
