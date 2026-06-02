import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sparkles, Plus, Pencil, Trash2, Save, Calendar, Percent, ShieldCheck, Tag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLoanPromos, useUpsertLoanPromo, useDeleteLoanPromo, type LoanPromo } from '@/hooks/use-loan-promo';
import { fmtRp } from '@/lib/loan-calc';
import { formatCurrencyInput, parseCurrencyValue } from '@/hooks/use-currency-input';
import ProgramCerdasManager from '@/components/cerdas/ProgramCerdasManager';

const emptyForm: any = {
  nama: '', deskripsi: '',
  periode_mulai: new Date().toISOString().slice(0, 10),
  periode_selesai: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
  aktif: true, bunga_override: '', provisi_diskon_pct: '0',
  gratis_asuransi: false, cap_subsidi_str: '0',
  target_skema: 'semua', syarat: '', urutan: 0,
};

const KalkulatorPromoPage: React.FC = () => {
  const { toast } = useToast();
  const { data: promos = [], isLoading } = useLoanPromos(false);
  const upsert = useUpsertLoanPromo();
  const del = useDeleteLoanPromo();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyForm);

  const openCreate = () => { setForm(emptyForm); setOpen(true); };
  const openEdit = (p: LoanPromo) => {
    setForm({
      ...p,
      bunga_override: p.bunga_override == null ? '' : String(p.bunga_override),
      provisi_diskon_pct: String(p.provisi_diskon_pct ?? 0),
      cap_subsidi_str: formatCurrencyInput(String(p.cap_subsidi ?? 0)),
    });
    setOpen(true);
  };

  const submit = async () => {
    if (!form.nama || !form.periode_mulai || !form.periode_selesai) {
      toast({ title: 'Nama dan periode wajib diisi', variant: 'destructive' });
      return;
    }
    try {
      await upsert.mutateAsync({
        id: form.id,
        nama: form.nama,
        deskripsi: form.deskripsi || null,
        periode_mulai: form.periode_mulai,
        periode_selesai: form.periode_selesai,
        aktif: !!form.aktif,
        bunga_override: form.bunga_override === '' ? null : parseFloat(form.bunga_override),
        provisi_diskon_pct: parseFloat(form.provisi_diskon_pct) || 0,
        gratis_asuransi: !!form.gratis_asuransi,
        cap_subsidi: parseCurrencyValue(form.cap_subsidi_str) || 0,
        target_skema: form.target_skema || 'semua',
        syarat: form.syarat || null,
        urutan: parseInt(form.urutan) || 0,
      });
      toast({ title: form.id ? 'Promo diperbarui' : 'Promo ditambahkan' });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Gagal menyimpan', description: e.message, variant: 'destructive' });
    }
  };

  const hapus = async (p: LoanPromo) => {
    if (!confirm(`Hapus promo "${p.nama}"?`)) return;
    try {
      await del.mutateAsync(p.id);
      toast({ title: 'Promo dihapus' });
    } catch (e: any) {
      toast({ title: 'Gagal menghapus', description: e.message, variant: 'destructive' });
    }
  };

  const isOngoing = (p: LoanPromo) => {
    const now = new Date().toISOString().slice(0, 10);
    return p.aktif && p.periode_mulai <= now && p.periode_selesai >= now;
  };

  return (
    <MainLayout>
      <PageHeader
        title="Program Kalkulator"
        description="Kelola Promo Umum kalkulator & Program CERDAS dalam satu tempat"
      />

      <Tabs defaultValue="promo" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="promo"><Tag className="w-4 h-4 mr-2" /> Promo Umum</TabsTrigger>
          <TabsTrigger value="cerdas"><Sparkles className="w-4 h-4 mr-2 text-amber-500" /> Program CERDAS</TabsTrigger>
        </TabsList>

        <TabsContent value="promo" className="space-y-6">
          {/* Info card */}
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50/60 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10">
            <CardContent className="p-4 flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shrink-0">
                <Tag className="w-5 h-5" />
              </div>
              <div className="text-sm flex-1">
                <div className="font-semibold">Promo Umum</div>
                <p className="text-muted-foreground">
                  Untuk flash promo bunga, gratis asuransi event tertentu, atau diskon provisi periodik. Untuk Program CERDAS (4-tier subsidi AJK), gunakan tab di sebelah.
                </p>
              </div>
              <Button onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Tambah Promo</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Daftar Promo ({promos.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-muted-foreground text-sm py-8 text-center">Memuat…</p>
              ) : promos.length === 0 ? (
                <div className="text-center py-12 text-sm text-muted-foreground">
                  Belum ada promo. Klik <strong>Tambah Promo</strong> untuk membuat.
                </div>
              ) : (
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nama Promo</TableHead>
                        <TableHead>Periode</TableHead>
                        <TableHead>Skema</TableHead>
                        <TableHead>Bunga</TableHead>
                        <TableHead>Diskon Provisi</TableHead>
                        <TableHead>Asuransi</TableHead>
                        <TableHead>Cap Subsidi</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Aksi</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {promos.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="font-medium">{p.nama}</div>
                            {p.deskripsi && <div className="text-xs text-muted-foreground line-clamp-1">{p.deskripsi}</div>}
                          </TableCell>
                          <TableCell className="text-xs">
                            {new Date(p.periode_mulai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })} —{' '}
                            {new Date(p.periode_selesai).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell><Badge variant="outline" className="text-[10px] uppercase">{p.target_skema}</Badge></TableCell>
                          <TableCell>{p.bunga_override != null ? `${p.bunga_override}%` : '—'}</TableCell>
                          <TableCell>{p.provisi_diskon_pct > 0 ? `${p.provisi_diskon_pct}%` : '—'}</TableCell>
                          <TableCell>{p.gratis_asuransi ? <Badge className="bg-emerald-600 text-white text-[10px]">GRATIS</Badge> : '—'}</TableCell>
                          <TableCell>{p.cap_subsidi > 0 ? fmtRp(p.cap_subsidi) : '—'}</TableCell>
                          <TableCell>
                            {isOngoing(p) ? (
                              <Badge className="bg-emerald-600 text-white">Berjalan</Badge>
                            ) : p.aktif ? (
                              <Badge variant="outline">Aktif (di luar periode)</Badge>
                            ) : (
                              <Badge variant="secondary">Nonaktif</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right space-x-1">
                            <Button size="icon" variant="ghost" onClick={() => openEdit(p)}>
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cerdas">
          <ProgramCerdasManager />
        </TabsContent>
      </Tabs>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              {form.id ? 'Edit Promo' : 'Tambah Promo Baru'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="md:col-span-2">
              <Label>Nama Promo *</Label>
              <Input value={form.nama} onChange={(e) => setForm({ ...form, nama: e.target.value })} placeholder="cth: Bunga Spesial HUT Bank" />
            </div>
            <div className="md:col-span-2">
              <Label>Deskripsi</Label>
              <Textarea value={form.deskripsi || ''} onChange={(e) => setForm({ ...form, deskripsi: e.target.value })} rows={2} />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Periode Mulai *</Label>
              <Input type="date" value={form.periode_mulai} onChange={(e) => setForm({ ...form, periode_mulai: e.target.value })} />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Periode Selesai *</Label>
              <Input type="date" value={form.periode_selesai} onChange={(e) => setForm({ ...form, periode_selesai: e.target.value })} />
            </div>
            <div>
              <Label>Target Skema</Label>
              <Select value={form.target_skema} onValueChange={(v) => setForm({ ...form, target_skema: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="semua">Semua Skema</SelectItem>
                  <SelectItem value="anuitas">Anuitas saja</SelectItem>
                  <SelectItem value="efektif">Efektif saja</SelectItem>
                  <SelectItem value="sliding">Sliding saja (Produktif)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Urutan Tampil</Label>
              <Input type="number" value={form.urutan} onChange={(e) => setForm({ ...form, urutan: e.target.value })} />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Percent className="w-3 h-3" /> Bunga Override (% p.a.)</Label>
              <Input type="number" step="0.01" value={form.bunga_override}
                onChange={(e) => setForm({ ...form, bunga_override: e.target.value })}
                placeholder="kosongkan jika tidak ada" />
            </div>
            <div>
              <Label className="flex items-center gap-1"><Percent className="w-3 h-3" /> Diskon Provisi (%)</Label>
              <Input type="number" step="0.01" value={form.provisi_diskon_pct}
                onChange={(e) => setForm({ ...form, provisi_diskon_pct: e.target.value })} />
            </div>
            <div>
              <Label>Cap Subsidi Asuransi (Rp)</Label>
              <Input value={form.cap_subsidi_str}
                onChange={(e) => setForm({ ...form, cap_subsidi_str: formatCurrencyInput(e.target.value) })}
                placeholder="0" />
            </div>
            <div className="flex items-end gap-3 rounded-lg border p-3 bg-muted/30">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <div className="flex-1">
                <Label htmlFor="gratis" className="cursor-pointer">Gratis Asuransi</Label>
                <p className="text-[10px] text-muted-foreground">Subsidi penuh premi AJK</p>
              </div>
              <Switch id="gratis" checked={!!form.gratis_asuransi}
                onCheckedChange={(v) => setForm({ ...form, gratis_asuransi: v })} />
            </div>
            <div className="md:col-span-2">
              <Label>Syarat & Ketentuan</Label>
              <Textarea value={form.syarat || ''} onChange={(e) => setForm({ ...form, syarat: e.target.value })} rows={3}
                placeholder="cth: berlaku khusus debitur baru, minimum plafon Rp 50jt, dll." />
            </div>
            <div className="md:col-span-2 flex items-center gap-3 rounded-lg border p-3 bg-emerald-50/40 dark:bg-emerald-950/20">
              <Switch id="aktif" checked={!!form.aktif} onCheckedChange={(v) => setForm({ ...form, aktif: v })} />
              <Label htmlFor="aktif" className="cursor-pointer font-medium">Promo Aktif</Label>
              <span className="text-xs text-muted-foreground ml-auto">
                Promo non-aktif tidak tampil di kalkulator meski masih dalam periode
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={submit} disabled={upsert.isPending}>
              <Save className="w-4 h-4 mr-2" /> {upsert.isPending ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

export default KalkulatorPromoPage;
