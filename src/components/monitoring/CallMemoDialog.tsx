import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Loader2, Upload, X, Image as ImageIcon, FileText, ChevronsUpDown, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useMLFUploads, useMLFData143, MLFRow } from '@/hooks/use-mlf-data';
import { useDebiturKontak } from '@/hooks/use-debitur-kontak';
import {
  CallMemo,
  CallMemoInput,
  JenisAktivitas,
  StatusKomitmen,
  JENIS_AKTIVITAS_LABEL,
  STATUS_KOMITMEN_LABEL,
  useCreateCallMemo,
  useUpdateCallMemo,
  uploadCallMemoLampiran,
} from '@/hooks/use-call-memo';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onClose: () => void;
  memo?: CallMemo | null;
  /** Optional prefill (e.g. from reminder row) */
  prefillL0lnno?: string;
}

const todayDate = () => new Date().toISOString().slice(0, 10);
const nowJam = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const emptyInput = (petugas: string): CallMemoInput => ({
  tanggal: todayDate(),
  jam: nowJam(),
  l0lnno: null,
  nama_debitur: '',
  no_hp: null,
  no_rek: null,
  produk: null,
  tunggakan_pokok: 0,
  tunggakan_bunga: 0,
  total_tunggakan: 0,
  jenis_aktivitas: 'call',
  hasil: null,
  janji_bayar_tanggal: null,
  janji_bayar_nominal: null,
  status_komitmen: 'belum_ada',
  petugas_penagih: petugas,
  saksi: null,
  lampiran_urls: [],
  catatan_tambahan: null,
});

export const CallMemoDialog: React.FC<Props> = ({ open, onClose, memo, prefillL0lnno }) => {
  const { userName } = useAuth();
  const create = useCreateCallMemo();
  const update = useUpdateCallMemo();
  const isEdit = !!memo;

  const [mode, setMode] = useState<'mlf' | 'manual'>('manual');
  const [form, setForm] = useState<CallMemoInput>(() => emptyInput(userName));
  const [uploading, setUploading] = useState(false);
  const [mlfPickerOpen, setMlfPickerOpen] = useState(false);

  const { data: uploads = [] } = useMLFUploads();
  const latestUploadId = uploads[0]?.id;
  const { data: mlfRows = [] } = useMLFData143(mode === 'mlf' ? latestUploadId : undefined);
  const { data: kontaks = [] } = useDebiturKontak();
  const kontakMap = useMemo(() => {
    const m = new Map<string, string>();
    kontaks.forEach((k) => k.l0lnno && k.no_hp && m.set(k.l0lnno, k.no_hp));
    return m;
  }, [kontaks]);

  // Reset on open / memo change
  useEffect(() => {
    if (!open) return;
    if (memo) {
      setMode(memo.l0lnno ? 'mlf' : 'manual');
      setForm({
        tanggal: memo.tanggal,
        jam: memo.jam,
        l0lnno: memo.l0lnno,
        nama_debitur: memo.nama_debitur,
        no_hp: memo.no_hp,
        no_rek: memo.no_rek,
        produk: memo.produk,
        tunggakan_pokok: memo.tunggakan_pokok,
        tunggakan_bunga: memo.tunggakan_bunga,
        total_tunggakan: memo.total_tunggakan,
        jenis_aktivitas: memo.jenis_aktivitas,
        hasil: memo.hasil,
        janji_bayar_tanggal: memo.janji_bayar_tanggal,
        janji_bayar_nominal: memo.janji_bayar_nominal,
        status_komitmen: memo.status_komitmen,
        petugas_penagih: memo.petugas_penagih,
        saksi: memo.saksi,
        lampiran_urls: memo.lampiran_urls || [],
        catatan_tambahan: memo.catatan_tambahan,
      });
    } else {
      setMode(prefillL0lnno ? 'mlf' : 'manual');
      setForm(emptyInput(userName));
    }
  }, [open, memo, userName, prefillL0lnno]);

  // Apply prefill once MLF data loads
  useEffect(() => {
    if (!open || isEdit || !prefillL0lnno || mlfRows.length === 0) return;
    const row = mlfRows.find((r) => r.l0lnno === prefillL0lnno);
    if (row) applyMlfRow(row);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prefillL0lnno, mlfRows.length]);

  // Auto-recalc total
  useEffect(() => {
    setForm((f) => ({ ...f, total_tunggakan: (Number(f.tunggakan_pokok) || 0) + (Number(f.tunggakan_bunga) || 0) }));
  }, [form.tunggakan_pokok, form.tunggakan_bunga]);

  const applyMlfRow = (row: MLFRow) => {
    if (!row.l0lnno) return;
    setForm((f) => ({
      ...f,
      l0lnno: row.l0lnno,
      nama_debitur: row.l0name || '',
      no_rek: row.l0lnno,
      produk: row.lytitl || '',
      no_hp: kontakMap.get(row.l0lnno!) || f.no_hp,
      tunggakan_pokok: Number(row.tungpk) || 0,
      tunggakan_bunga: Number(row.tungbg) || 0,
    }));
    setMlfPickerOpen(false);
  };

  const handleSwitchMode = (v: string) => {
    const newMode = v as 'mlf' | 'manual';
    setMode(newMode);
    if (newMode === 'manual') {
      setForm((f) => ({ ...f, l0lnno: null }));
    }
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name}: max 5MB`);
          continue;
        }
        const url = await uploadCallMemoLampiran(file);
        urls.push(url);
      }
      setForm((f) => ({ ...f, lampiran_urls: [...f.lampiran_urls, ...urls] }));
      if (urls.length > 0) toast.success(`${urls.length} file diunggah`);
    } catch (e: any) {
      toast.error('Upload gagal: ' + e.message);
    } finally {
      setUploading(false);
    }
  };

  const removeLampiran = (url: string) => {
    setForm((f) => ({ ...f, lampiran_urls: f.lampiran_urls.filter((u) => u !== url) }));
  };

  const handleSave = async () => {
    if (!form.nama_debitur.trim()) {
      toast.error('Nama debitur wajib diisi');
      return;
    }
    if (!form.petugas_penagih.trim()) {
      toast.error('Petugas penagih wajib diisi');
      return;
    }
    try {
      if (isEdit && memo) {
        await update.mutateAsync({ id: memo.id, patch: form });
        toast.success('Call Memo diperbarui');
      } else {
        await create.mutateAsync(form);
        toast.success('Call Memo tersimpan');
      }
      onClose();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const isImage = (url: string) => /\.(jpe?g|png|webp|gif)$/i.test(url);
  const saving = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !saving && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit Call Memo #${memo?.nomor}` : 'Buat Call Memo Penagihan'}</DialogTitle>
          <DialogDescription>
            Catat aktivitas penagihan kredit. Bisa pilih debitur dari data MLF atau isi manual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="rounded-lg border p-3 bg-muted/30">
            <Label className="text-xs mb-2 block">Sumber Data Debitur</Label>
            <RadioGroup value={mode} onValueChange={handleSwitchMode} className="flex gap-4">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="mlf" id="m-mlf" />
                <Label htmlFor="m-mlf" className="cursor-pointer text-sm">Pilih dari data MLF</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="manual" id="m-manual" />
                <Label htmlFor="m-manual" className="cursor-pointer text-sm">Isi manual</Label>
              </div>
            </RadioGroup>

            {mode === 'mlf' && (
              <div className="mt-3">
                <Popover open={mlfPickerOpen} onOpenChange={setMlfPickerOpen}>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {form.l0lnno ? `${form.l0lnno} — ${form.nama_debitur}` : 'Cari debitur (nama/no rek)...'}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Cari nama atau no rekening..." />
                      <CommandList className="max-h-72">
                        <CommandEmpty>Tidak ditemukan</CommandEmpty>
                        <CommandGroup>
                          {mlfRows.slice(0, 200).map((row) => (
                            <CommandItem
                              key={row.id}
                              value={`${row.l0lnno} ${row.l0name}`}
                              onSelect={() => applyMlfRow(row)}
                            >
                              <Check className={cn('mr-2 h-4 w-4', form.l0lnno === row.l0lnno ? 'opacity-100' : 'opacity-0')} />
                              <div className="flex-1 min-w-0">
                                <div className="font-medium truncate">{row.l0name}</div>
                                <div className="text-xs font-mono text-muted-foreground">
                                  {row.l0lnno} • KOL {row.kol} • {row.lytitl}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-muted-foreground mt-2">
                  Data akan auto-fill, tapi tetap bisa diedit di bawah.
                </p>
              </div>
            )}
          </div>

          {/* Tanggal & jam */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tanggal Penagihan</Label>
              <Input type="date" value={form.tanggal} onChange={(e) => setForm({ ...form, tanggal: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Jam</Label>
              <Input type="time" value={form.jam} onChange={(e) => setForm({ ...form, jam: e.target.value })} />
            </div>
          </div>

          {/* Identitas debitur */}
          <div className="space-y-3 rounded-lg border p-3">
            <h4 className="text-sm font-semibold">Identitas Debitur</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Label className="text-xs">Nama Debitur *</Label>
                <Input value={form.nama_debitur} onChange={(e) => setForm({ ...form, nama_debitur: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">No. Rekening / Pinjaman</Label>
                <Input value={form.no_rek || ''} onChange={(e) => setForm({ ...form, no_rek: e.target.value || null })} />
              </div>
              <div>
                <Label className="text-xs">No. HP</Label>
                <Input value={form.no_hp || ''} onChange={(e) => setForm({ ...form, no_hp: e.target.value || null })} placeholder="08xx / 628xx" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Produk Kredit</Label>
                <Input value={form.produk || ''} onChange={(e) => setForm({ ...form, produk: e.target.value || null })} />
              </div>
            </div>
          </div>

          {/* Tunggakan */}
          <div className="space-y-3 rounded-lg border p-3">
            <h4 className="text-sm font-semibold">Rincian Tunggakan</h4>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Pokok (Rp)</Label>
                <Input type="number" min={0} value={form.tunggakan_pokok} onChange={(e) => setForm({ ...form, tunggakan_pokok: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="text-xs">Bunga (Rp)</Label>
                <Input type="number" min={0} value={form.tunggakan_bunga} onChange={(e) => setForm({ ...form, tunggakan_bunga: Number(e.target.value) || 0 })} />
              </div>
              <div>
                <Label className="text-xs">Total (Rp)</Label>
                <Input type="number" value={form.total_tunggakan} readOnly className="bg-muted font-semibold" />
              </div>
            </div>
          </div>

          {/* Aktivitas */}
          <div className="space-y-3 rounded-lg border p-3">
            <h4 className="text-sm font-semibold">Aktivitas Penagihan</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Jenis Aktivitas</Label>
                <Select value={form.jenis_aktivitas} onValueChange={(v) => setForm({ ...form, jenis_aktivitas: v as JenisAktivitas })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(JENIS_AKTIVITAS_LABEL) as JenisAktivitas[]).map((k) => (
                      <SelectItem key={k} value={k}>{JENIS_AKTIVITAS_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Status Komitmen</Label>
                <Select value={form.status_komitmen} onValueChange={(v) => setForm({ ...form, status_komitmen: v as StatusKomitmen })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_KOMITMEN_LABEL) as StatusKomitmen[]).map((k) => (
                      <SelectItem key={k} value={k}>{STATUS_KOMITMEN_LABEL[k]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Hasil Penagihan</Label>
                <Textarea
                  value={form.hasil || ''}
                  onChange={(e) => setForm({ ...form, hasil: e.target.value || null })}
                  placeholder="Respon debitur, kendala, keterangan, dll."
                  className="min-h-[80px]"
                />
              </div>
              <div>
                <Label className="text-xs">Tgl Janji Bayar</Label>
                <Input type="date" value={form.janji_bayar_tanggal || ''} onChange={(e) => setForm({ ...form, janji_bayar_tanggal: e.target.value || null })} />
              </div>
              <div>
                <Label className="text-xs">Nominal Janji Bayar (Rp)</Label>
                <Input type="number" min={0} value={form.janji_bayar_nominal ?? ''} onChange={(e) => setForm({ ...form, janji_bayar_nominal: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
          </div>

          {/* Petugas & saksi */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Petugas Penagih *</Label>
              <Input value={form.petugas_penagih} onChange={(e) => setForm({ ...form, petugas_penagih: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Saksi (opsional)</Label>
              <Input value={form.saksi || ''} onChange={(e) => setForm({ ...form, saksi: e.target.value || null })} />
            </div>
          </div>

          {/* Lampiran */}
          <div className="space-y-2 rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Lampiran Bukti</Label>
              <Badge variant="outline" className="text-xs">{form.lampiran_urls.length} file</Badge>
            </div>
            <input
              id="memo-file-upload"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
            />
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => document.getElementById('memo-file-upload')?.click()}
              disabled={uploading}
            >
              {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
              {uploading ? 'Mengunggah...' : 'Tambah File (foto/SS/PDF, max 5MB)'}
            </Button>

            {form.lampiran_urls.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-2">
                {form.lampiran_urls.map((url) => (
                  <div key={url} className="relative group border rounded-lg overflow-hidden bg-muted/30">
                    {isImage(url) ? (
                      <img src={url} alt="lampiran" className="w-full h-24 object-cover" />
                    ) : (
                      <a href={url} target="_blank" rel="noreferrer" className="flex flex-col items-center justify-center h-24 text-xs p-2 text-primary hover:underline">
                        <FileText className="w-6 h-6 mb-1" />
                        <span className="truncate w-full text-center">Lihat file</span>
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => removeLampiran(url)}
                      className="absolute top-1 right-1 bg-rose-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                      aria-label="hapus"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-xs">Catatan Tambahan</Label>
            <Textarea value={form.catatan_tambahan || ''} onChange={(e) => setForm({ ...form, catatan_tambahan: e.target.value || null })} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Batal</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {isEdit ? 'Update' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
