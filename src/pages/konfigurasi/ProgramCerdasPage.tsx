import React, { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Sparkles, Save } from 'lucide-react';
import { useCerdasConfig, useUpdateCerdasConfig } from '@/hooks/use-cerdas';
import { useToast } from '@/hooks/use-toast';
import { fmtRp } from '@/lib/loan-calc';
import { formatCurrencyInput, parseCurrencyValue } from '@/hooks/use-currency-input';

const ProgramCerdasPage: React.FC = () => {
  const { data: cfg, isLoading } = useCerdasConfig();
  const upd = useUpdateCerdasConfig();
  const { toast } = useToast();

  const [form, setForm] = useState<any>({});
  useEffect(() => {
    if (!cfg) return;
    const f: any = { ...cfg };
    (['plafon_tier_1_max', 'plafon_tier_2_max', 'plafon_tier_3_max'] as const).forEach((k) => {
      f[`${k}_str`] = formatCurrencyInput(String((cfg as any)[k]));
    });
    ([1, 2, 3, 4] as const).forEach((t) => {
      f[`cap_tier_${t}_baru_str`] = formatCurrencyInput(String((cfg as any)[`cap_tier_${t}_baru`]));
      f[`cap_tier_${t}_takeover_str`] = formatCurrencyInput(String((cfg as any)[`cap_tier_${t}_takeover`]));
    });
    setForm(f);
  }, [cfg]);

  const save = async () => {
    try {
      const patch: any = {
        nama_program: form.nama_program,
        aktif: form.aktif,
        periode_mulai: form.periode_mulai,
        periode_selesai: form.periode_selesai,
        bunga_debitur_baru: parseFloat(form.bunga_debitur_baru) || 0,
        bunga_take_over: parseFloat(form.bunga_take_over) || 0,
        bunga_top_up: parseFloat(form.bunga_top_up) || 0,
        diskon_provisi_top_up_pct: parseFloat(form.diskon_provisi_top_up_pct) || 0,
        plafon_tier_1_max: parseCurrencyValue(form.plafon_tier_1_max_str),
        plafon_tier_2_max: parseCurrencyValue(form.plafon_tier_2_max_str),
        plafon_tier_3_max: parseCurrencyValue(form.plafon_tier_3_max_str),
      };
      ([1, 2, 3, 4] as const).forEach((t) => {
        patch[`cap_tier_${t}_baru`] = parseCurrencyValue(form[`cap_tier_${t}_baru_str`]);
        patch[`cap_tier_${t}_takeover`] = parseCurrencyValue(form[`cap_tier_${t}_takeover_str`]);
      });
      await upd.mutateAsync(patch);
      toast({ title: 'Konfigurasi CERDAS disimpan' });
    } catch (e: any) {
      toast({ title: 'Gagal menyimpan', description: e.message, variant: 'destructive' });
    }
  };

  if (isLoading || !cfg) return <MainLayout><div className="p-6">Memuat…</div></MainLayout>;

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
    <MainLayout>
      <PageHeader
        title="Program CERDAS"
        description="Konfigurasi promo Cicilan Extra Ringan dan Diskon Asuransi"
      />

      <div className="space-y-6 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" /> Periode & Status
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-3 flex items-center gap-3 rounded-lg border p-3 bg-muted/30">
              <Switch checked={!!form.aktif} onCheckedChange={(v) => setForm({ ...form, aktif: v })} />
              <div>
                <Label className="text-sm">Promo aktif</Label>
                <p className="text-xs text-muted-foreground">Nonaktifkan untuk menyembunyikan promo di kalkulator.</p>
              </div>
            </div>
            <div>
              <Label>Nama Program</Label>
              <Input value={form.nama_program || ''} onChange={(e) => setForm({ ...form, nama_program: e.target.value })} />
            </div>
            <div>
              <Label>Periode Mulai</Label>
              <Input type="date" value={form.periode_mulai || ''} onChange={(e) => setForm({ ...form, periode_mulai: e.target.value })} />
            </div>
            <div>
              <Label>Periode Selesai</Label>
              <Input type="date" value={form.periode_selesai || ''} onChange={(e) => setForm({ ...form, periode_selesai: e.target.value })} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Bunga Promo (% p.a. fixed)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="md:col-span-3">
              <Label>Diskon Provisi Top Up (%)</Label>
              <Input type="number" step="1" value={form.diskon_provisi_top_up_pct ?? ''} onChange={(e) => setForm({ ...form, diskon_provisi_top_up_pct: e.target.value })} className="md:w-48" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Batas Plafon Tier</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([1, 2, 3] as const).map((t) => (
              <div key={t}>
                <Label>Plafon Maks Tier {t}</Label>
                <Input
                  value={form[`plafon_tier_${t}_max_str`] || ''}
                  onChange={(e) => setForm({ ...form, [`plafon_tier_${t}_max_str`]: formatCurrencyInput(e.target.value) })}
                />
              </div>
            ))}
            <p className="md:col-span-3 text-xs text-muted-foreground">
              Tier 4 mencakup semua plafon di atas Tier 3 (tidak ada batas atas).
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cap Subsidi Premi AJK per Tier</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Cap berbeda untuk skema Debitur Baru dan Take Over. Jika premi aktual ≤ cap, debitur GRATIS AJK. Selisih jadi beban debitur.
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {([1, 2, 3, 4] as const).map((t) => (
              <div key={t} className="grid grid-cols-1 md:grid-cols-[140px_1fr_1fr] gap-3 rounded-lg border p-3 items-end">
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
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button size="lg" onClick={save} disabled={upd.isPending}>
            <Save className="w-4 h-4 mr-2" />
            {upd.isPending ? 'Menyimpan…' : 'Simpan Konfigurasi'}
          </Button>
        </div>
      </div>
    </MainLayout>
  );
};

export default ProgramCerdasPage;
