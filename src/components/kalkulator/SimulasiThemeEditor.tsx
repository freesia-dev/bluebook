import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { SimulasiCard, type SimulasiCardData } from '@/components/kalkulator/SimulasiCard';
import {
  useGlobalSimulasiTheme,
  useResetMySimulasiTheme,
  useSaveMySimulasiTheme,
  useSaveSimulasiTheme,
  useSimulasiTheme,
} from '@/hooks/use-simulasi-theme';
import {
  DEFAULT_SIMULASI_THEME,
  FONT_OPTIONS,
  LABEL_DEFAULTS,
  LABEL_FIELD_TITLES,
  LABEL_KEYS,
  SECTION_LABELS,
  SimulasiLabelKey,
  SimulasiSectionKey,
  SimulasiSectionStyle,
  SimulasiTheme,
  RATA_MENDATAR_LABEL,
  RATA_TEGAK_LABEL,
  type RataMendatar,
  type RataTegak,
} from '@/lib/simulasi-theme';
import { ArrowDown, ArrowUp, RotateCcw, Save, Sparkles, Palette, Type, LayoutList,
  SlidersHorizontal, Tag } from 'lucide-react';

const SECTION_KEYS = Object.keys(SECTION_LABELS) as SimulasiSectionKey[];

const SAMPLE: SimulasiCardData = {
  namaDebitur: 'Budi Santoso',
  produk: 'Kredit Konsumtif PNS',
  skema: 'anuitas',
  plafon: 250_000_000,
  tenorBulan: 120,
  bungaPa: 10.5,
  promoNama: 'Program Promo',
  promoLabel: 'DEBITUR BARU',
  gajiPokok: 6_500_000,
  ttp: 3_500_000,
  dsrPct: 62.4,
  angsuranPertama: 3_372_500,
  totalAngsuran: 404_700_000,
  totalBunga: 154_700_000,
  asuransiJiwa: 7_250_000,
  asuransiJiwaProvider: 'Al-Amin',
  premiJiwaAktual: 9_250_000,
  subsidiJiwa: 2_000_000,
  asuransiKredit: 1_500_000,
  provisi: 2_500_000,
  biaya: [
    { label: 'Biaya Notaris', nominal: 750_000 },
    { label: 'Biaya Perikatan', nominal: 500_000 },
  ],
  blokir: 3_372_500,
  totalPotongan: 15_872_500,
  pelunasan: { pokok: 45_000_000, bunga: 350_000, total: 45_350_000 },
  danaDiterima: 188_777_500,
  namaAo: 'Rina Kusuma',
  tanggal: new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }),
};

const ColorField: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({
  label,
  value,
  onChange,
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs text-muted-foreground">{label}</Label>
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-10 cursor-pointer rounded border bg-background p-0.5"
        aria-label={label}
      />
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9 font-mono text-xs" />
    </div>
  </div>
);

/** Nama warna yang masuk akal untuk tiap bagian (dua warna utama yang dipakainya). */
const SECTION_COLOR_LABEL: Partial<Record<SimulasiSectionKey, [string, string]>> = {
  header: ['Latar header', 'Latar header (gradien)'],
  sorotan: ['Warna kartu Plafon', 'Warna kartu Jangka Waktu'],
  chips: ['Warna chip biru', 'Warna chip ungu'],
  angsuran: ['Latar blok angsuran', 'Latar blok (gradien)'],
  penghasilan: ['Warna Total Penghasilan', '—'],
  potongan: ['Warna judul', '—'],
  pelunasan: ['Warna blok pelunasan', '—'],
  dana: ['Latar blok dana', 'Latar blok (gradien)'],
  footer: ['Warna teks catatan kaki', '—'],
};

/** Bagian yang punya latar berwarna penuh, jadi warna teks di atasnya bisa diatur. */
const BAGIAN_BERLATAR: SimulasiSectionKey[] = ['header', 'angsuran', 'dana'];

/** Warna global yang sedang berlaku untuk satu bidang bagian — dipakai sebagai contoh di editor. */
const warnaBawaanBagian = (t: SimulasiTheme, key: SimulasiSectionKey, bidang: 'color' | 'color2'): string => {
  const peta: Record<SimulasiSectionKey, [string, string]> = {
    header: [t.primaryColor, t.primaryColor2],
    sorotan: [t.primaryColor, t.accentColor],
    chips: [t.primaryColor, t.accentColor],
    angsuran: [t.primaryColor, t.primaryColor2],
    penghasilan: [t.primaryColor, t.primaryColor],
    potongan: [t.subColor, t.subColor],
    pelunasan: [t.warnColor, t.warnColor],
    dana: [t.successColor, t.successColor2],
    footer: [t.subColor, t.subColor],
  };
  return peta[key][bidang === 'color' ? 0 : 1];
};

/** Pemilih warna yang boleh kosong (kosong = ikut warna global). */
const WarnaOpsional: React.FC<{
  label: string;
  value?: string;
  bawaan: string;
  onChange: (v: string | undefined) => void;
}> = ({ label, value, bawaan, onChange }) => {
  if (label === '—') return <div />;
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      <div className="flex items-center gap-1.5">
        <input
          type="color"
          value={value || bawaan}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 w-9 cursor-pointer rounded border bg-background p-0.5"
          aria-label={label}
        />
        {value ? (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-[11px]" onClick={() => onChange(undefined)}>
            Ikut global
          </Button>
        ) : (
          <span className="text-[11px] text-muted-foreground">Ikut global</span>
        )}
      </div>
    </div>
  );
};

/** Tombol pilihan perataan (kiri/tengah/kanan atau atas/tengah/bawah), boleh kosong. */
const PilihanRata: React.FC<{
  label: string;
  nilai?: string;
  opsi: Record<string, string>;
  onChange: (v: string | undefined) => void;
}> = ({ label, nilai, opsi, onChange }) => (
  <div className="space-y-1.5">
    <Label className="text-[11px] text-muted-foreground">{label}</Label>
    <div className="flex gap-1">
      {Object.entries(opsi).map(([v, teks]) => (
        <Button
          key={v}
          type="button"
          variant={nilai === v ? 'default' : 'outline'}
          size="sm"
          className="h-8 flex-1 px-0 text-[11px]"
          onClick={() => onChange(nilai === v ? undefined : v)}
        >
          {teks}
        </Button>
      ))}
    </div>
  </div>
);

const NumField: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step = 1, suffix, onChange }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <span className="text-xs font-medium tabular-nums">
        {value}
        {suffix}
      </span>
    </div>
    <Slider value={[value]} min={min} max={max} step={step} onValueChange={([v]) => onChange(v)} />
  </div>
);

/** Editor tema kartu simulasi (JPG & pratinjau) — tiap user punya preferensi sendiri; admin bisa set default bank. */
export const SimulasiThemeEditor: React.FC = () => {
  const { theme: saved, isLoading, isPersonal } = useSimulasiTheme();
  const { theme: globalTheme } = useGlobalSimulasiTheme();
  const save = useSaveSimulasiTheme();
  const saveMine = useSaveMySimulasiTheme();
  const resetMine = useResetMySimulasiTheme();
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [draft, setDraft] = useState<SimulasiTheme>(saved);

  useEffect(() => {
    if (!isLoading) setDraft(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, saved]);

  const set = <K extends keyof SimulasiTheme>(key: K, value: SimulasiTheme[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const setSectionScale = (key: SimulasiSectionKey, value: number) =>
    setDraft((d) => ({ ...d, sectionFontScale: { ...d.sectionFontScale, [key]: value } }));

  const setSectionStyle = (key: SimulasiSectionKey, value: SimulasiSectionStyle) =>
    setDraft((d) => {
      const next = { ...(d.sectionStyle ?? {}) };
      // Kosong berarti "ikut global" — hapus saja entrinya supaya tema tetap ramping
      const bersih = Object.fromEntries(Object.entries(value).filter(([, v]) => v)) as SimulasiSectionStyle;
      if (Object.keys(bersih).length === 0) delete next[key];
      else next[key] = bersih;
      return { ...d, sectionStyle: next };
    });

  const setLabel = (key: SimulasiLabelKey, value: string) =>
    setDraft((d) => ({ ...d, labels: { ...d.labels, [key]: value } }));

  const move = (key: SimulasiSectionKey, dir: -1 | 1) =>
    setDraft((d) => {
      const order = [...d.order];
      const i = order.indexOf(key);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= order.length) return d;
      [order[i], order[j]] = [order[j], order[i]];
      return { ...d, order };
    });

  const toggleHidden = (key: SimulasiSectionKey, hidden: boolean) =>
    setDraft((d) => ({
      ...d,
      hidden: hidden ? [...new Set([...d.hidden, key])] : d.hidden.filter((k) => k !== key),
    }));

  const err = (e: any) => toast({ title: 'Gagal menyimpan', description: e?.message, variant: 'destructive' });

  const onSaveMine = () =>
    saveMine.mutate(draft, {
      onSuccess: () =>
        toast({ title: 'Preferensi tersimpan', description: 'Kartu JPG Anda kini memakai tampilan ini.' }),
      onError: err,
    });

  const onSaveGlobal = () =>
    save.mutate(draft, {
      onSuccess: () =>
        toast({ title: 'Default bank tersimpan', description: 'Berlaku untuk user yang belum punya preferensi sendiri.' }),
      onError: err,
    });

  const onFollowGlobal = () =>
    resetMine.mutate(undefined, {
      onSuccess: () => {
        setDraft(globalTheme);
        toast({ title: 'Mengikuti tampilan default', description: 'Preferensi pribadi dihapus.' });
      },
      onError: err,
    });

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,420px)_1fr]">
      <div className="space-y-4">
        <Tabs defaultValue="identitas" className="w-full">
          <TabsList className="grid w-full grid-cols-6 h-auto">
            <TabsTrigger value="identitas" title="Identitas & Teks" className="flex-col gap-1 py-2 text-[11px]"><Sparkles className="h-4 w-4" />Info</TabsTrigger>
            <TabsTrigger value="label" title="Label Kartu" className="flex-col gap-1 py-2 text-[11px]"><Tag className="h-4 w-4" />Label</TabsTrigger>
            <TabsTrigger value="tipografi" title="Tipografi & Ukuran" className="flex-col gap-1 py-2 text-[11px]"><Type className="h-4 w-4" />Font</TabsTrigger>
            <TabsTrigger value="warna" title="Warna" className="flex-col gap-1 py-2 text-[11px]"><Palette className="h-4 w-4" />Warna</TabsTrigger>
            <TabsTrigger value="bagian" title="Warna & Posisi per Bagian" className="flex-col gap-1 py-2 text-[11px]"><SlidersHorizontal className="h-4 w-4" />Bagian</TabsTrigger>
            <TabsTrigger value="susunan" title="Susunan & Visibilitas" className="flex-col gap-1 py-2 text-[11px]"><LayoutList className="h-4 w-4" />Susun</TabsTrigger>
          </TabsList>

          {/* Semua tab dibatasi tinggi & bisa di-scroll sendiri, supaya ganti kategori
              tidak perlu scroll panjang dan pratinjau di kanan tetap selalu kelihatan. */}
          <div className="max-h-[calc(100vh-320px)] min-h-[360px] overflow-y-auto pr-1 mt-3">
            <TabsContent value="identitas" className="mt-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Identitas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nama Bank</Label>
                    <Input value={draft.bankName} onChange={(e) => set('bankName', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Nama Cabang</Label>
                    <Input value={draft.branchName} onChange={(e) => set('branchName', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Judul Kartu</Label>
                    <Input value={draft.title} onChange={(e) => set('title', e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Catatan Kaki</Label>
                    <Input value={draft.footerNote} onChange={(e) => set('footerNote', e.target.value)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="label" className="mt-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Label Kartu</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Ganti judul/label yang tampil di tiap bagian kartu sesuai kebutuhan (mis. "Plafon Pengajuan" jadi "Plafon Diajukan"). Kosongkan untuk memakai teks default.
                  </p>
                  {LABEL_KEYS.map((key) => (
                    <div className="space-y-1.5" key={key}>
                      <Label className="text-xs text-muted-foreground">{LABEL_FIELD_TITLES[key]}</Label>
                      <Input
                        value={draft.labels[key] ?? ''}
                        placeholder={LABEL_DEFAULTS[key]}
                        onChange={(e) => setLabel(key, e.target.value)}
                      />
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setDraft((d) => ({ ...d, labels: {} }))}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset ke Label Default
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tipografi" className="mt-0 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Tipografi & Ukuran</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Font</Label>
                    <Select value={draft.fontFamily} onValueChange={(v) => set('fontFamily', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((f) => (
                          <SelectItem key={f.value} value={f.value}>
                            {f.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <NumField
                    label="Skala Ukuran Teks (Global)"
                    value={draft.fontScale}
                    min={0.6}
                    max={2}
                    step={0.05}
                    suffix="x"
                    onChange={(v) => set('fontScale', v)}
                  />
                  <NumField label="Lebar Kartu" value={draft.cardWidth} min={700} max={1200} step={10} suffix="px" onChange={(v) => set('cardWidth', v)} />
                  <NumField label="Padding" value={draft.padding} min={16} max={64} suffix="px" onChange={(v) => set('padding', v)} />
                  <NumField label="Sudut Membulat" value={draft.radius} min={0} max={28} suffix="px" onChange={(v) => set('radius', v)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ukuran Font per Bagian</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Kalikan skala global di atas khusus untuk satu bagian — misalnya perbesar hanya "Angsuran per Bulan" tanpa mengubah bagian lain. 1x berarti mengikuti Skala Ukuran Teks (Global) apa adanya.
                  </p>
                  {SECTION_KEYS.map((key) => (
                    <NumField
                      key={key}
                      label={SECTION_LABELS[key]}
                      value={draft.sectionFontScale[key] ?? 1}
                      min={0.5}
                      max={2.5}
                      step={0.05}
                      suffix="x"
                      onChange={(v) => setSectionScale(key, v)}
                    />
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      setDraft((d) => ({ ...d, sectionFontScale: { ...DEFAULT_SIMULASI_THEME.sectionFontScale } }))
                    }
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset Ukuran per Bagian
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="warna" className="mt-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Warna</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between rounded-md border p-3">
                    <Label className="text-sm">Gunakan Gradien</Label>
                    <Switch checked={draft.useGradient} onCheckedChange={(v) => set('useGradient', v)} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <ColorField label="Background" value={draft.bgColor} onChange={(v) => set('bgColor', v)} />
                    <ColorField label="Panel / Kartu" value={draft.cardColor} onChange={(v) => set('cardColor', v)} />
                    <ColorField label="Teks Utama" value={draft.inkColor} onChange={(v) => set('inkColor', v)} />
                    <ColorField label="Teks Sekunder" value={draft.subColor} onChange={(v) => set('subColor', v)} />
                    <ColorField label="Garis" value={draft.lineColor} onChange={(v) => set('lineColor', v)} />
                    <ColorField label="Teks Header" value={draft.headerTextColor} onChange={(v) => set('headerTextColor', v)} />
                    <ColorField label="Primer" value={draft.primaryColor} onChange={(v) => set('primaryColor', v)} />
                    <ColorField label="Primer (Gradien)" value={draft.primaryColor2} onChange={(v) => set('primaryColor2', v)} />
                    <ColorField label="Aksen" value={draft.accentColor} onChange={(v) => set('accentColor', v)} />
                    <ColorField label="Aksen (Gradien)" value={draft.accentColor2} onChange={(v) => set('accentColor2', v)} />
                    <ColorField label="Sukses / Dana" value={draft.successColor} onChange={(v) => set('successColor', v)} />
                    <ColorField label="Sukses (Gradien)" value={draft.successColor2} onChange={(v) => set('successColor2', v)} />
                    <ColorField label="Peringatan" value={draft.warnColor} onChange={(v) => set('warnColor', v)} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bagian" className="mt-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Warna &amp; Posisi per Bagian</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Tiap bagian bisa punya warna sendiri, lepas dari warna global di tab Warna. Yang dibiarkan kosong
                    tetap ikut warna global. Perataan tegak hanya terasa di bagian yang isinya berjajar (header, dana
                    diterima, catatan kaki).
                  </p>

                  {SECTION_KEYS.map((key) => {
                    const g = draft.sectionStyle?.[key] ?? {};
                    const adaUbahan = !!(g.color || g.color2 || g.textColor || g.align || g.valign);
                    return (
                      <div key={key} className="space-y-3 rounded-lg border p-3">
                        <div className="flex items-center justify-between gap-2">
                          <Label className="text-sm font-medium">{SECTION_LABELS[key]}</Label>
                          {adaUbahan && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              onClick={() => setSectionStyle(key, {})}
                            >
                              <RotateCcw className="mr-1 h-3 w-3" /> Ikut global
                            </Button>
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <WarnaOpsional
                            label={SECTION_COLOR_LABEL[key]?.[0] ?? 'Warna utama'}
                            value={g.color}
                            bawaan={warnaBawaanBagian(draft, key, 'color')}
                            onChange={(v) => setSectionStyle(key, { ...g, color: v })}
                          />
                          <WarnaOpsional
                            label={SECTION_COLOR_LABEL[key]?.[1] ?? 'Warna kedua'}
                            value={g.color2}
                            bawaan={warnaBawaanBagian(draft, key, 'color2')}
                            onChange={(v) => setSectionStyle(key, { ...g, color2: v })}
                          />
                          {BAGIAN_BERLATAR.includes(key) && (
                            <WarnaOpsional
                              label="Warna teks di atasnya"
                              value={g.textColor}
                              bawaan={draft.headerTextColor}
                              onChange={(v) => setSectionStyle(key, { ...g, textColor: v })}
                            />
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <PilihanRata
                            label="Posisi mendatar"
                            nilai={g.align}
                            opsi={RATA_MENDATAR_LABEL}
                            onChange={(v) => setSectionStyle(key, { ...g, align: v as RataMendatar | undefined })}
                          />
                          <PilihanRata
                            label="Posisi tegak"
                            nilai={g.valign}
                            opsi={RATA_TEGAK_LABEL}
                            onChange={(v) => setSectionStyle(key, { ...g, valign: v as RataTegak | undefined })}
                          />
                        </div>
                      </div>
                    );
                  })}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setDraft((d) => ({ ...d, sectionStyle: {} }))}
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Kembalikan Semua Bagian ke Warna Global
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="susunan" className="mt-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Susunan & Visibilitas Bagian</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {draft.order.map((key, i) => (
                    <div key={key} className="flex items-center gap-2 rounded-md border p-2">
                      <Checkbox
                        checked={!draft.hidden.includes(key)}
                        onCheckedChange={(v) => toggleHidden(key, !v)}
                        aria-label={`Tampilkan ${SECTION_LABELS[key]}`}
                      />
                      <span className="flex-1 text-sm">{SECTION_LABELS[key]}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7" disabled={i === 0} onClick={() => move(key, -1)}>
                        <ArrowUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        disabled={i === draft.order.length - 1}
                        onClick={() => move(key, 1)}
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>

        <div className="space-y-2">
          <div className="flex gap-2">
            <Button onClick={onSaveMine} disabled={saveMine.isPending} className="flex-1">
              <Save className="mr-2 h-4 w-4" />
              {saveMine.isPending ? 'Menyimpan…' : 'Simpan untuk Saya'}
            </Button>
            <Button variant="outline" onClick={() => setDraft(DEFAULT_SIMULASI_THEME)}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onFollowGlobal}
              disabled={!isPersonal || resetMine.isPending}
            >
              Ikuti Tampilan Default
            </Button>
            {isAdmin && (
              <Button variant="secondary" className="flex-1" onClick={onSaveGlobal} disabled={save.isPending}>
                {save.isPending ? 'Menyimpan…' : 'Jadikan Default Bank'}
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isPersonal
              ? 'Anda memakai preferensi tampilan pribadi — hanya memengaruhi kartu JPG milik Anda.'
              : 'Anda memakai tampilan default bank. Simpan untuk membuat preferensi pribadi.'}
          </p>
        </div>
      </div>

      <Card className="h-fit lg:sticky lg:top-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pratinjau Langsung</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-auto rounded-xl border bg-white">
            <div style={{ zoom: 0.7 }}>
              <SimulasiCard data={SAMPLE} theme={draft} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SimulasiThemeEditor;
