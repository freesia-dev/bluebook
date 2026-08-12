import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  useLoanProducts,
  useUpsertLoanProduct,
  useDeleteLoanProduct,
  DSR_RULES_DEFAULT,
  type LoanProduct,
  type RateOption,
  type DsrRule,
} from '@/hooks/use-loan-calc';
import type { BiayaItem } from '@/lib/loan-calc';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, X } from 'lucide-react';
import { formatCurrencyInput, parseCurrencyValue } from '@/hooks/use-currency-input';

const empty = (): Partial<LoanProduct> => ({
  nama: '',
  skema: 'anuitas',
  max_tenor_bulan: 120,
  bunga_options: [],
  asuransi_options: [],
  provisi_options: [],
  biaya_items: [],
  dsr_rules: DSR_RULES_DEFAULT,
  biaya_notaris: 0,
  biaya_perikatan: 0,
  blokir_angsuran: 0,
  is_active: true,
  urutan: 0,
});

/** Isi halaman konfigurasi produk kalkulator (tanpa layout) — dipakai juga di halaman konfigurasi bertab. */
export const ProdukKalkulatorSection: React.FC = () => {
  const { data = [], isLoading } = useLoanProducts(false);
  const upsert = useUpsertLoanProduct();
  const del = useDeleteLoanProduct();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Partial<LoanProduct>>(empty());

  const handleNew = () => {
    setForm(empty());
    setOpen(true);
  };
  const handleEdit = (p: LoanProduct) => {
    // Migrasi tampilan: kalau produk lama belum punya biaya_items, ambil dari kolom legacy.
    const biaya = p.biaya_items?.length
      ? p.biaya_items
      : [
          ...(p.biaya_notaris ? [{ label: 'Biaya Notaris', nominal: p.biaya_notaris }] : []),
          ...(p.biaya_perikatan ? [{ label: 'Biaya Perikatan', nominal: p.biaya_perikatan }] : []),
        ];
    setForm({ ...p, biaya_items: biaya, dsr_rules: p.dsr_rules?.length ? p.dsr_rules : DSR_RULES_DEFAULT });
    setOpen(true);
  };
  const handleSave = async () => {
    if (!form.nama) {
      toast({ title: 'Nama produk wajib diisi', variant: 'destructive' });
      return;
    }
    try {
      const items = (form.biaya_items ?? []).filter((b) => b.label);
      await upsert.mutateAsync({
        ...form,
        biaya_items: items,
        dsr_rules: form.dsr_rules?.length ? form.dsr_rules : DSR_RULES_DEFAULT,
        // jaga kompatibilitas data lama
        biaya_notaris: items.find((b) => /notaris/i.test(b.label))?.nominal ?? 0,
        biaya_perikatan: items.find((b) => /perikatan|apht|fidusia/i.test(b.label))?.nominal ?? 0,
      } as any);
      toast({ title: form.id ? 'Produk diperbarui' : 'Produk ditambahkan' });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Gagal simpan', description: e.message, variant: 'destructive' });
    }
  };
  const handleDelete = async (id: string) => {
    if (!confirm('Hapus produk ini?')) return;
    await del.mutateAsync(id);
    toast({ title: 'Produk dihapus' });
  };

  const updateOptions = (
    key: 'bunga_options' | 'asuransi_options' | 'provisi_options',
    next: RateOption[],
  ) => setForm({ ...form, [key]: next });

  return (
    <>
      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama</TableHead>
                <TableHead>Skema</TableHead>
                <TableHead>Max Tenor</TableHead>
                <TableHead>Bunga</TableHead>
                <TableHead>Asuransi</TableHead>
                <TableHead>Provisi</TableHead>
                <TableHead>Biaya</TableHead>
                <TableHead>DSR</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={10} className="text-center py-6 text-muted-foreground">Memuat...</TableCell></TableRow>
              )}
              {data.map((p) => {
                const biaya = p.biaya_items?.length
                  ? p.biaya_items
                  : [
                      ...(p.biaya_notaris ? [{ label: 'Notaris', nominal: p.biaya_notaris }] : []),
                      ...(p.biaya_perikatan ? [{ label: 'Perikatan', nominal: p.biaya_perikatan }] : []),
                    ];
                const dsr = p.dsr_rules?.length ? p.dsr_rules : DSR_RULES_DEFAULT;
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nama}</TableCell>
                    <TableCell><Badge variant="outline">{p.skema}</Badge></TableCell>
                    <TableCell>{p.max_tenor_bulan} bln</TableCell>
                    <TableCell className="text-xs">{p.bunga_options.map((o) => o.label).join(', ')}</TableCell>
                    <TableCell className="text-xs">{p.asuransi_options.map((o) => o.label).join(', ')}</TableCell>
                    <TableCell className="text-xs">{p.provisi_options.map((o) => o.label).join(', ')}</TableCell>
                    <TableCell className="text-xs">{biaya.length ? `${biaya.length} item` : '—'}</TableCell>
                    <TableCell className="text-xs">{dsr.map((d) => `${d.label} ${d.max_pct}%`).join(' / ')}</TableCell>
                    <TableCell>
                      {p.is_active ? <Badge className="bg-emerald-600">Aktif</Badge> : <Badge variant="secondary">Nonaktif</Badge>}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button size="icon" variant="ghost" onClick={() => handleEdit(p)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <div className="pt-4">
            <Button onClick={handleNew}>
              <Plus className="w-4 h-4 mr-2" /> Tambah Produk
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
          <DialogHeader><DialogTitle>{form.id ? 'Edit' : 'Tambah'} Produk Kredit</DialogTitle></DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="md:col-span-2">
              <Label>Nama Produk</Label>
              <Input value={form.nama ?? ''} onChange={(e) => setForm({ ...form, nama: e.target.value })} />
            </div>
            <div>
              <Label>Skema Bunga</Label>
              <Select value={form.skema} onValueChange={(v: any) => setForm({ ...form, skema: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="anuitas">Anuitas</SelectItem>
                  <SelectItem value="efektif">Efektif Rata-rata</SelectItem>
                  <SelectItem value="sliding">Sliding (Flat-declining)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Max Tenor (bulan)</Label>
              <Input
                type="number"
                value={form.max_tenor_bulan ?? 120}
                onChange={(e) => setForm({ ...form, max_tenor_bulan: parseInt(e.target.value) || 0 })}
              />
            </div>

            <OptionsEditor
              label="Pilihan Bunga (% p.a.)"
              value={form.bunga_options ?? []}
              onChange={(v) => updateOptions('bunga_options', v)}
            />
            <OptionsEditor
              label="Pilihan Asuransi (% / tahun)"
              value={form.asuransi_options ?? []}
              onChange={(v) => updateOptions('asuransi_options', v)}
            />
            <OptionsEditor
              label="Pilihan Provisi (%)"
              value={form.provisi_options ?? []}
              onChange={(v) => updateOptions('provisi_options', v)}
            />

            <BiayaItemsEditor
              value={form.biaya_items ?? []}
              onChange={(v) => setForm({ ...form, biaya_items: v })}
            />

            <DsrRulesEditor
              value={form.dsr_rules?.length ? form.dsr_rules : DSR_RULES_DEFAULT}
              onChange={(v) => setForm({ ...form, dsr_rules: v })}
            />

            <div>
              <Label>Blokir Angsuran</Label>
              <Select
                value={String(form.blokir_angsuran ?? 0)}
                onValueChange={(v) => setForm({ ...form, blokir_angsuran: parseInt(v) })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Tidak Ada</SelectItem>
                  <SelectItem value="1">1× Angsuran</SelectItem>
                  <SelectItem value="2">2× Angsuran</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Urutan</Label>
              <Input
                type="number"
                value={form.urutan ?? 0}
                onChange={(e) => setForm({ ...form, urutan: parseInt(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                checked={form.is_active ?? true}
                onCheckedChange={(c) => setForm({ ...form, is_active: c })}
              />
              <Label>Aktif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button onClick={handleSave} disabled={upsert.isPending}>
              {upsert.isPending ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

const ProdukKalkulatorPage: React.FC = () => (
  <MainLayout>
    <PageHeader
      title="Produk Kalkulator Loan"
      description="Atur produk kredit, preset bunga, asuransi, provisi, biaya dinamis & aturan DSR"
    />
    <ProdukKalkulatorSection />
  </MainLayout>
);

const OptionsEditor: React.FC<{
  label: string;
  value: RateOption[];
  onChange: (v: RateOption[]) => void;
}> = ({ label, value, onChange }) => {
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const add = () => {
    if (!newValue) return;
    const num = parseFloat(newValue);
    if (isNaN(num)) return;
    onChange([...value, { label: newLabel || `${num}%`, value: num }]);
    setNewLabel('');
    setNewValue('');
  };
  return (
    <div className="md:col-span-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-1 mb-2">
        {value.map((o, i) => (
          <Badge key={i} variant="secondary" className="gap-1">
            {o.label}
            <button onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
              <X className="w-3 h-3" />
            </button>
          </Badge>
        ))}
        {value.length === 0 && <span className="text-xs text-muted-foreground">Belum ada preset</span>}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="Label (mis. 10%)"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="Nilai"
          type="number"
          step="0.01"
          value={newValue}
          onChange={(e) => setNewValue(e.target.value)}
          className="w-24"
        />
        <Button type="button" size="sm" onClick={add}>+</Button>
      </div>
    </div>
  );
};

/** Editor biaya di muka yang dinamis (notaris, perikatan, materai, dll). */
export const BiayaItemsEditor: React.FC<{
  value: BiayaItem[];
  onChange: (v: BiayaItem[]) => void;
}> = ({ value, onChange }) => {
  const update = (i: number, patch: Partial<BiayaItem>) =>
    onChange(value.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  return (
    <div className="md:col-span-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between mb-2">
        <Label className="text-sm font-semibold">Biaya di Muka (dinamis)</Label>
        <Button type="button" size="sm" variant="outline" onClick={() => onChange([...value, { label: '', nominal: 0 }])}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Biaya
        </Button>
      </div>
      {value.length === 0 && (
        <p className="text-xs text-muted-foreground">Belum ada biaya. Contoh: Biaya Notaris, Biaya Perikatan, Materai, Administrasi.</p>
      )}
      <div className="space-y-2">
        {value.map((b, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              placeholder="Nama biaya"
              value={b.label}
              onChange={(e) => update(i, { label: e.target.value })}
              className="flex-1"
            />
            <Input
              placeholder="Nominal"
              value={b.nominal ? formatCurrencyInput(String(b.nominal)) : ''}
              onChange={(e) => update(i, { nominal: parseCurrencyValue(e.target.value) })}
              className="w-40"
            />
            <Button type="button" size="icon" variant="ghost" onClick={() => onChange(value.filter((_, idx) => idx !== i))}>
              <Trash2 className="w-4 h-4 text-rose-600" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

/** Editor aturan DSR per basis (GAJI / TTP). */
export const DsrRulesEditor: React.FC<{
  value: DsrRule[];
  onChange: (v: DsrRule[]) => void;
}> = ({ value, onChange }) => {
  const update = (kode: DsrRule['kode'], patch: Partial<DsrRule>) => {
    const exists = value.some((d) => d.kode === kode);
    onChange(
      exists
        ? value.map((d) => (d.kode === kode ? { ...d, ...patch } : d))
        : [...value, { ...(DSR_RULES_DEFAULT.find((d) => d.kode === kode) as DsrRule), ...patch }],
    );
  };
  return (
    <div className="md:col-span-2 rounded-lg border border-border p-3">
      <Label className="text-sm font-semibold">Aturan DSR</Label>
      <p className="text-xs text-muted-foreground mb-2">
        Basis GAJI: angsuran maksimal = Gaji Pokok × persen. Basis TTP: (TTP × persen) − selisih Angsuran Gaji − Angsuran Praja.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {DSR_RULES_DEFAULT.map((def) => {
          const row = value.find((d) => d.kode === def.kode) ?? def;
          return (
            <div key={def.kode} className="rounded-md bg-muted/40 p-2.5">
              <p className="text-xs font-semibold uppercase tracking-wide mb-1.5">Basis {def.kode}</p>
              <div className="flex gap-2">
                <Input
                  value={row.label}
                  onChange={(e) => update(def.kode, { label: e.target.value })}
                  placeholder="Label"
                  className="flex-1"
                />
                <div className="relative w-28">
                  <Input
                    type="number"
                    step="0.01"
                    value={row.max_pct}
                    onChange={(e) => update(def.kode, { max_pct: parseFloat(e.target.value) || 0 })}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProdukKalkulatorPage;
