import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sparkles, Plus, Pencil, Trash2, Save } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  usePromoPrograms,
  useUpsertPromoProgram,
  useDeletePromoProgram,
  emptyPromoProgram,
  type PromoProgram,
} from '@/hooks/use-promo-program';
import { fmtRp } from '@/lib/loan-calc';
import { formatCurrencyInput, parseCurrencyValue } from '@/hooks/use-currency-input';

const MONEY_FIELDS = [
  'plafon_tier_1_max', 'plafon_tier_2_max', 'plafon_tier_3_max',
  'cap_tier_1_baru', 'cap_tier_2_baru', 'cap_tier_3_baru', 'cap_tier_4_baru',
  'cap_tier_1_takeover', 'cap_tier_2_takeover', 'cap_tier_3_takeover', 'cap_tier_4_takeover',
] as const;

const toForm = (p: Partial<PromoProgram>) => {
  const f: any = { ...p };
  MONEY_FIELDS.forEach((k) => { f[`${k}_str`] = formatCurrencyInput(String((p as any)[k] ?? 0)); });
  return f;
};

/** Manajer Program Promo (generalisasi Program CERDAS — bisa banyak program aktif/berganti). */
const ProgramPromoManager: React.FC = () => {
  const { data: programs = [], isLoading } = usePromoPrograms(false);
  const upsert = useUpsertPromoProgram();
  const del = useDeletePromoProgram();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(toForm(emptyPromoProgram()));

  const submit = async () => {
    if (!form.nama_program || !form.periode_mulai || !form.periode_selesai) {
      toast({ title: 'Nama program dan periode wajib diisi', variant: 'destructive' });
      return;
    }
    const payload: any = {
      id: form.id,
      kode: form.kode || 'custom',
      nama_program: form.nama_program,
      deskripsi: form.deskripsi || null,
      aktif: !!form.aktif,
      periode_mulai: form.periode_mulai,
      periode_selesai: form.periode_selesai,
      bunga_debitur_baru: parseFloat(form.bunga_debitur_baru) || 0,
      bunga_take_over: parseFloat(form.bunga_take_over) || 0,
      bunga_top_up: parseFloat(form.bunga_top_up) || 0,
      diskon_provisi_top_up_pct: parseFloat(form.diskon_provisi_top_up_pct) || 0,
      urutan: parseInt(form.urutan) || 0,
    };
    MONEY_FIELDS.forEach((k) => { payload[k] = parseCurrencyValue(form[`${k}_str`] || '0'); });
    try {
      await upsert.mutateAsync(payload);
      toast({ title: form.id ? 'Program diperbarui' : 'Program ditambahkan' });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Gagal menyimpan', description: e.message, variant: 'destructive' });
    }
  };

  const hapus = async (p: PromoProgram) => {
    if (!confirm(`Hapus program "${p.nama_program}"?`)) return;
    await del.mutateAsync(p.id);
    toast({ title: 'Program dihapus' });
  };

  const tierRange = (t: 1 | 2 | 3 | 4) => {
    const p1 = parseCurrencyValue(form.plafon_tier_1_max_str || '0');
    const p2 = parseCurrencyValue(form.plafon_tier_2_max_str || '0');
    const p3 = parseCurrencyValue(form.plafon_tier_3_max_str || '0');
    if (t === 1) return `≤ ${fmtRp(p1)}`;
    if (t === 2) return `${fmtRp(p1)} s/d ${fmtRp(p2)}`;
    if (t === 3) return `${fmtRp(p2)} s/d ${fmtRp(p3)}`;
    return `> ${fmtRp(p3)}`;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Program Promo Kredit
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Semua program promo (termasuk CERDAS) diatur di sini. Program aktif otomatis muncul di kalkulator konsumtif.
            </p>
          </div>
          <Button onClick={() => { setForm(toForm(emptyPromoProgram())); setOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" /> Tambah Program
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Program</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Bunga (Baru / TO / Top Up)</TableHead>
                <TableHead>Diskon Provisi</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && <TableRow><TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Memuat…</TableCell></TableRow>}
              {!isLoading && programs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Belum ada program promo.</TableCell></TableRow>
              )}
              {programs.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <div className="font-medium">{p.nama_program}</div>
                    {p.deskripsi && <div className="text-xs text-muted-foreground line-clamp-1">{p.deskripsi}</div>}
                  </TableCell>
                  <TableCell className="text-xs">
                    {new Date(p.periode_mulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} —{' '}
                    {new Date(p.periode_selesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.bunga_debitur_baru}% / {p.bunga_take_over}% / {p.bunga_top_up}%
                  </TableCell>
                  <TableCell>{p.diskon_provisi_top_up_pct}%</TableCell>
                  <TableCell>
                    {p.aktif ? <Badge className="bg-emerald-600 text-white">Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button size="icon" variant="ghost" onClick={() => { setForm(toForm(p)); setOpen(true); }}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => hapus(p)}>
                      <Trash2 className="w-4 h-4 text-rose-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> {form.id ? 'Edit Program Promo' : 'Tambah Program Promo'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-2">
            <div className="md:col-span-2">
              <Label>Nama Program *</Label>
              <Input value={form.nama_program || ''} onChange={(e) => setForm({ ...form, nama_program: e.target.value })} placeholder="cth: Program CERDAS 2026" />
            </div>
            <div className="flex items-end gap-2">
              <Switch checked={!!form.aktif} onCheckedChange={(v) => setForm({ ...form, aktif: v })} />
              <Label className="pb-2">Aktif</Label>
            </div>
            <div className="md:col-span-3">
              <Label>Deskripsi</Label>
              <Textarea rows={2} value={form.deskripsi || ''} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} />
            </div>
            <div>
              <Label>Periode Mulai *</Label>
              <Input type="date" value={form.periode_mulai || ''} onChange={(e) => setForm({ ...form, periode_mulai: e.target.value })} />
            </div>
            <div>
              <Label>Periode Selesai *</Label>
              <Input type="date" value={form.periode_selesai || ''} onChange={(e) => setForm({ ...form, periode_selesai: e.target.value })} />
            </div>
            <div>
              <Label>Urutan Tampil</Label>
              <Input type="number" value={form.urutan ?? 0} onChange={(e) => setForm({ ...form, urutan: e.target.value })} />
            </div>

            <div className="md:col-span-3 text-sm font-semibold pt-2">Bunga Promo (% p.a. fixed)</div>
            <div>
              <Label>Debitur Baru</Label>
              <Input type="number" step="0.01" value={form.bunga_debitur_baru ?? ''} onChange={(e) => setForm({ ...form, bunga_debitur_baru: e.target.value })} />
            </div>
            <div>
              <Label>Take Over</Label>
              <Input type="number" step="0.01" value={form.bunga_take_over ?? ''} onChange={(e) => setForm({ ...form, bunga_take_over: e.target.value })} />
            </div>
            <div>
              <Label>Top Up</Label>
              <Input type="number" step="0.01" value={form.bunga_top_up ?? ''} onChange={(e) => setForm({ ...form, bunga_top_up: e.target.value })} />
            </div>
            <div>
              <Label>Diskon Provisi Top Up (%)</Label>
              <Input type="number" step="1" value={form.diskon_provisi_top_up_pct ?? ''} onChange={(e) => setForm({ ...form, diskon_provisi_top_up_pct: e.target.value })} />
            </div>

            <div className="md:col-span-3 text-sm font-semibold pt-2">Batas Plafon Tier</div>
            {([1, 2, 3] as const).map((t) => (
              <div key={t}>
                <Label>Plafon Maks Tier {t}</Label>
                <Input
                  value={form[`plafon_tier_${t}_max_str`] || ''}
                  onChange={(e) => setForm({ ...form, [`plafon_tier_${t}_max_str`]: formatCurrencyInput(e.target.value) })}
                />
              </div>
            ))}

            <div className="md:col-span-3 text-sm font-semibold pt-2">Cap Subsidi Premi AJK per Tier</div>
            {([1, 2, 3, 4] as const).map((t) => (
              <div key={t} className="md:col-span-3 grid grid-cols-1 md:grid-cols-[140px_1fr_1fr] gap-3 rounded-lg border p-3 items-end">
                <div>
                  <div className="text-sm font-semibold text-primary">Tier {t}</div>
                  <div className="text-[11px] text-muted-foreground">{tierRange(t)}</div>
                </div>
                <div>
                  <Label className="text-xs">Cap Debitur Baru</Label>
                  <Input
                    value={form[`cap_tier_${t}_baru_str`] || ''}
                    onChange={(e) => setForm({ ...form, [`cap_tier_${t}_baru_str`]: formatCurrencyInput(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Cap Take Over</Label>
                  <Input
                    value={form[`cap_tier_${t}_takeover_str`] || ''}
                    onChange={(e) => setForm({ ...form, [`cap_tier_${t}_takeover_str`]: formatCurrencyInput(e.target.value) })}
                  />
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={submit} disabled={upsert.isPending}>
              <Save className="w-4 h-4 mr-2" /> {upsert.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProgramPromoManager;
