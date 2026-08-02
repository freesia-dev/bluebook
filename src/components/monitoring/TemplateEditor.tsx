import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { TEMPLATE_PLACEHOLDERS, TEMPLATE_PLACEHOLDERS_PENAWARAN, renderTemplate, SAMPLE_PREVIEW_DATA } from '@/lib/wa-utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSaveWATemplate, useDeleteWATemplate, WATemplate } from '@/hooks/use-wa-template';
import { toast } from 'sonner';
import { Trash2, Save, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  open: boolean;
  template?: WATemplate | null;
  onClose: () => void;
  defaultKategori?: 'tagihan' | 'penawaran';
}

export const TemplateEditor: React.FC<Props> = ({ open, template, onClose, defaultKategori = 'tagihan' }) => {
  const [nama, setNama] = useState(template?.nama_template || '');
  const [isi, setIsi] = useState(template?.isi || '');
  const [isDefault, setIsDefault] = useState(template?.is_default || false);
  const [kategori, setKategori] = useState<'tagihan' | 'penawaran'>((template?.kategori as any) || defaultKategori);
  const save = useSaveWATemplate();
  const del = useDeleteWATemplate();
  const { isAdmin } = useAuth();
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    setNama(template?.nama_template || '');
    setIsi(template?.isi || '');
    setIsDefault(template?.is_default || false);
    setKategori(((template?.kategori as any) || defaultKategori) as 'tagihan' | 'penawaran');
  }, [template, open, defaultKategori]);

  const insertPlaceholder = (key: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const next = isi.slice(0, start) + `{${key}}` + isi.slice(end);
    setIsi(next);
    setTimeout(() => {
      ta.focus();
      const pos = start + key.length + 2;
      ta.setSelectionRange(pos, pos);
    }, 0);
  };

  const handleSave = async () => {
    if (!nama.trim() || !isi.trim()) {
      toast.error('Nama dan isi template wajib diisi');
      return;
    }
    try {
      await save.mutateAsync({ id: template?.id, nama_template: nama.trim(), isi, is_default: isDefault, kategori });
      toast.success('Template tersimpan');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan');
    }
  };

  const handleDelete = async () => {
    if (!template?.id) return;
    if (!confirm('Hapus template ini?')) return;
    try {
      await del.mutateAsync(template.id);
      toast.success('Template dihapus');
      onClose();
    } catch (e: any) {
      toast.error(e.message || 'Gagal menghapus');
    }
  };

  const preview = renderTemplate(isi, SAMPLE_PREVIEW_DATA);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{template?.id ? 'Edit Template' : 'Buat Template Baru'}</DialogTitle>
          <DialogDescription>Gunakan placeholder seperti {`{nama}`}, {`{tunggakan}`} — akan diganti dengan data debitur saat kirim.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div>
              <Label>Nama Template</Label>
              <Input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="cth: Reminder Tegas KOL 3+" />
            </div>
            <div>
              <Label>Kategori Pesan</Label>
              <Select value={kategori} onValueChange={(v: any) => setKategori(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="tagihan">Tagihan / Penagihan</SelectItem>
                  <SelectItem value="penawaran">Penawaran Kredit (Top Up / Pengajuan Kembali)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Isi Pesan</Label>
                <span className="text-[10px] text-muted-foreground">{isi.length} karakter</span>
              </div>
              <Textarea ref={textareaRef} value={isi} onChange={(e) => setIsi(e.target.value)} className="font-mono text-xs h-64" />
            </div>
            <div>
              <Label className="text-xs mb-1 block">Klik untuk sisipkan placeholder:</Label>
              <div className="flex flex-wrap gap-1">
                {(kategori === 'penawaran' ? TEMPLATE_PLACEHOLDERS_PENAWARAN : TEMPLATE_PLACEHOLDERS).map((p) => (
                  <Badge key={p.key} variant="outline" className="cursor-pointer hover:bg-primary hover:text-primary-foreground" onClick={() => insertPlaceholder(p.key)} title={p.desc}>
                    {`{${p.key}}`}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Switch id="def" checked={isDefault} onCheckedChange={setIsDefault} />
              <Label htmlFor="def" className="cursor-pointer text-sm">Jadikan template default</Label>
            </div>
          </div>

          <div>
            <Label className="text-xs mb-1 block">Preview (data contoh)</Label>
            <Card className="bg-emerald-50/40 dark:bg-emerald-950/10 border-emerald-200/60">
              <CardContent className="pt-4">
                <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">{preview || <span className="text-muted-foreground">— kosong —</span>}</pre>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter className="gap-2">
          {template?.id && isAdmin && (
            <Button variant="destructive" onClick={handleDelete} className="mr-auto"><Trash2 className="w-4 h-4 mr-1" />Hapus</Button>
          )}
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} disabled={save.isPending}>
            {template?.id ? <><Save className="w-4 h-4 mr-1" />Simpan</> : <><Plus className="w-4 h-4 mr-1" />Buat Template</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
