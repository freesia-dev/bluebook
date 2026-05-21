import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { SecurityMediaUpload } from './SecurityMediaUpload';
import { useAddEntry, useUpdateEntry, SecurityLogEntry, SecurityShift } from '@/hooks/use-security-log';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  shift: SecurityShift;
  entry?: SecurityLogEntry | null;
}

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

export const EntryDialog: React.FC<Props> = ({ open, onOpenChange, shift, entry }) => {
  const { toast } = useToast();
  const add = useAddEntry();
  const update = useUpdateEntry();

  const [waktu, setWaktu] = useState('');
  const [kejadian, setKejadian] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (entry) {
        setWaktu(toLocalInput(entry.waktu_kejadian));
        setKejadian(entry.kejadian);
        setFotos(entry.foto_urls || []);
        setVideoUrl(entry.video_url);
      } else {
        setWaktu(toLocalInput(new Date().toISOString()));
        setKejadian('');
        setFotos([]);
        setVideoUrl(null);
      }
    }
  }, [open, entry]);

  // Restrict waktu to within shift window (mulai - selesai or now)
  const shiftEnd = shift.jam_selesai ?? new Date().toISOString();
  const minWaktu = toLocalInput(shift.jam_mulai);
  const maxWaktu = toLocalInput(shift.status === 'selesai' ? shiftEnd : new Date(Date.now() + 60 * 60 * 1000).toISOString());

  const submit = async () => {
    if (!kejadian.trim()) {
      toast({ title: 'Isi kejadian wajib', variant: 'destructive' });
      return;
    }
    const waktuIso = new Date(waktu).toISOString();
    try {
      if (entry) {
        await update.mutateAsync({
          id: entry.id,
          shift_id: shift.id,
          waktu_kejadian: waktuIso,
          kejadian: kejadian.trim(),
          foto_urls: fotos,
          video_url: videoUrl,
        });
        toast({ title: 'Kejadian diperbarui' });
      } else {
        await add.mutateAsync({
          shift_id: shift.id,
          waktu_kejadian: waktuIso,
          kejadian: kejadian.trim(),
          foto_urls: fotos,
          video_url: videoUrl,
        });
        toast({ title: 'Kejadian dicatat' });
      }
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: 'Gagal menyimpan', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{entry ? 'Ubah Kejadian' : 'Catat Kejadian'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Waktu Kejadian</Label>
            <Input
              type="datetime-local"
              value={waktu}
              min={minWaktu}
              max={maxWaktu}
              onChange={(e) => setWaktu(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground mt-1">
              Dapat diubah selama shift masih aktif.
            </p>
          </div>
          <div>
            <Label>Kejadian</Label>
            <Textarea
              rows={4}
              placeholder="Deskripsi kejadian, kondisi area, atau aktivitas pengawasan..."
              value={kejadian}
              onChange={(e) => setKejadian(e.target.value)}
            />
          </div>
          <div>
            <Label>Dokumentasi <span className="text-muted-foreground text-xs">(opsional)</span></Label>
            <div className="mt-2">
              <SecurityMediaUpload
                fotos={fotos}
                videoUrl={videoUrl}
                onFotosChange={setFotos}
                onVideoChange={setVideoUrl}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Batal</Button>
          <Button onClick={submit} disabled={add.isPending || update.isPending}>
            {entry ? 'Simpan Perubahan' : 'Catat Kejadian'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
