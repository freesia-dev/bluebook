import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, ImagePlus, Loader2, Plus, RotateCcw, Save, Trash2, UserRoundCheck, Users } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { SapaanPoster, LATAR_BAWAAN } from '@/components/greeting/SapaanPoster';
import { useKonfigSapaan, useResetSapaan, useSimpanKonfigSapaan, useStatusSapaan } from '@/hooks/use-sapaan-konfig';
import {
  ID_WAKTU, KONFIG_BAWAAN, gabungKonfig, hexKeRgb, pilihKutipan, rgbKeHex,
  type IdWaktu, type KonfigSapaan, type KutipanKustom,
} from '@/lib/sapaan-konfig';
import type { PaletSapaan } from '@/lib/sapaan-palet';
import { uploadFile } from '@/lib/storage';
import { cn } from '@/lib/utils';

const LABEL_WAKTU: Record<IdWaktu, string> = { pagi: 'Pagi', siang: 'Siang', sore: 'Sore', malam: 'Malam' };

/** Perkecil gambar sebelum diunggah supaya sapaan cepat tampil di HP. */
async function kecilkanGambar(file: File, maks = 1920): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml' || file.type === 'image/gif') return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, gagal) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = gagal;
      i.src = url;
    });
    const skala = Math.min(1, maks / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * skala);
    c.height = Math.round(img.height * skala);
    c.getContext('2d')?.drawImage(img, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((ok) => c.toBlob(ok, 'image/webp', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.webp', { type: 'image/webp' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

const slotTeks = (s: string | null) => {
  if (!s) return null;
  const [tanggal, waktu] = s.split('|');
  const d = new Date(`${tanggal}T00:00:00`);
  if (Number.isNaN(d.getTime())) return s;
  return `${LABEL_WAKTU[waktu as IdWaktu] ?? waktu ?? ''} · ${d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`;
};

const Baris: React.FC<{ label: string; ket?: string; children: React.ReactNode }> = ({ label, ket, children }) => (
  <div className="flex flex-col gap-2 border-b py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between">
    <div className="min-w-0">
      <Label className="text-sm font-semibold">{label}</Label>
      {ket && <p className="text-xs text-muted-foreground">{ket}</p>}
    </div>
    <div className="flex-none">{children}</div>
  </div>
);

const SapaanConfigPage: React.FC = () => {
  const { isAdmin, userName } = useAuth();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'jadwal';
  const { konfig, siap } = useKonfigSapaan();
  const simpan = useSimpanKonfigSapaan();
  const [draf, setDraf] = useState<KonfigSapaan>(KONFIG_BAWAAN);
  const [awal, setAwal] = useState('');
  const [pratinjau, setPratinjau] = useState<{ slot: IdWaktu; palet?: PaletSapaan; latar?: string | null; kunci: string } | null>(null);
  const [mengunggah, setMengunggah] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!siap) return;
    setDraf(konfig);
    setAwal(JSON.stringify(konfig));
  }, [siap, konfig]);

  const berubah = useMemo(() => awal !== '' && JSON.stringify(draf) !== awal, [draf, awal]);
  const ubah = (sebagian: Partial<KonfigSapaan>) => setDraf((d) => ({ ...d, ...sebagian }));

  if (!isAdmin) {
    return (
      <MainLayout>
        <PageHeader title="Layar Sapaan" description="Halaman ini khusus admin." />
      </MainLayout>
    );
  }

  const lakukanSimpan = async () => {
    try {
      const bersih = gabungKonfig(draf);
      await simpan.mutateAsync(bersih);
      setDraf(bersih);
      setAwal(JSON.stringify(bersih));
      toast.success('Pengaturan sapaan disimpan', { description: 'Berlaku untuk semua akun mulai sapaan berikutnya.' });
    } catch (e) {
      toast.error('Gagal menyimpan', { description: e instanceof Error ? e.message : undefined });
    }
  };

  const lihat = (slot?: IdWaktu, extra?: { palet?: PaletSapaan; latar?: string | null }) => {
    const aktif = draf.jadwal.find((s) => s.aktif);
    setPratinjau({ slot: slot ?? aktif?.id ?? 'pagi', kunci: `pratinjau|${Date.now()}`, ...extra });
  };

  const unggahLatar = async (files: FileList | null) => {
    if (!files?.length) return;
    setMengunggah(true);
    try {
      const url: string[] = [];
      for (const f of Array.from(files).slice(0, 10)) {
        if (!f.type.startsWith('image/')) continue;
        url.push(await uploadFile(await kecilkanGambar(f), 'sapaan'));
      }
      if (url.length) {
        setDraf((d) => ({ ...d, latarKustom: [...d.latarKustom, ...url] }));
        toast.success(`${url.length} gambar ditambahkan`, { description: 'Jangan lupa tekan Simpan.' });
      }
    } catch (e) {
      toast.error('Gagal mengunggah', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setMengunggah(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const slotPratinjau = pratinjau ? draf.jadwal.find((s) => s.id === pratinjau.slot) ?? draf.jadwal[0] : null;

  return (
    <MainLayout>
      <PageHeader
        title="Layar Sapaan"
        description="Atur jam muncul, gambar latar, warna, kutipan, dan tulisan di layar sapaan Bluebook."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select onValueChange={(v) => lihat(v as IdWaktu)}>
              <SelectTrigger className="w-[150px]"><Eye className="mr-1 h-4 w-4" /><SelectValue placeholder="Pratinjau" /></SelectTrigger>
              <SelectContent>
                {draf.jadwal.map((s) => <SelectItem key={s.id} value={s.id}>Pratinjau {LABEL_WAKTU[s.id].toLowerCase()}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={() => setDraf(KONFIG_BAWAAN)}>
              <RotateCcw className="h-4 w-4" /> Bawaan
            </Button>
            <Button className="gap-2" onClick={lakukanSimpan} disabled={!berubah || simpan.isPending}>
              {simpan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Simpan
            </Button>
          </div>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-center gap-3 py-4">
          <Switch checked={draf.aktif} onCheckedChange={(v) => ubah({ aktif: v })} id="sapaan-aktif" />
          <Label htmlFor="sapaan-aktif" className="font-semibold">{draf.aktif ? 'Sapaan aktif untuk semua akun' : 'Sapaan dimatikan'}</Label>
          {berubah && <span className="ml-auto rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">Ada perubahan yang belum disimpan</span>}
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setParams({ tab: v }, { replace: true })} className="space-y-4">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="jadwal">Jadwal</TabsTrigger>
          <TabsTrigger value="latar">Gambar Latar</TabsTrigger>
          <TabsTrigger value="warna">Warna</TabsTrigger>
          <TabsTrigger value="kutipan">Kutipan</TabsTrigger>
          <TabsTrigger value="tampilan">Teks & Tampilan</TabsTrigger>
          <TabsTrigger value="pengguna">Reset Pengguna</TabsTrigger>
        </TabsList>

        {/* ---------------------------------------------------------- jadwal */}
        <TabsContent value="jadwal">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Jam muncul</CardTitle>
              <CardDescription>Sapaan muncul sekali di tiap waktu yang aktif, saat Bluebook pertama dibuka di jam itu. Kalau jamnya bertumpuk, yang paling atas yang dipakai.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {draf.jadwal.map((s, i) => (
                <div key={s.id} className={cn('grid grid-cols-2 items-end gap-3 rounded-xl border p-3 sm:grid-cols-[120px_1fr_1fr_1.4fr]', !s.aktif && 'opacity-60')}>
                  <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                    <Switch checked={s.aktif} onCheckedChange={(v) => ubah({ jadwal: draf.jadwal.map((x, j) => (j === i ? { ...x, aktif: v } : x)) })} />
                    <span className="font-semibold">{LABEL_WAKTU[s.id]}</span>
                  </div>
                  <div>
                    <Label className="text-xs">Mulai</Label>
                    <Input type="time" value={s.mulai} onChange={(e) => ubah({ jadwal: draf.jadwal.map((x, j) => (j === i ? { ...x, mulai: e.target.value } : x)) })} />
                  </div>
                  <div>
                    <Label className="text-xs">Sampai</Label>
                    <Input type="time" value={s.selesai === '24:00' ? '23:59' : s.selesai} onChange={(e) => ubah({ jadwal: draf.jadwal.map((x, j) => (j === i ? { ...x, selesai: e.target.value === '23:59' ? '24:00' : e.target.value } : x)) })} />
                  </div>
                  <div className="col-span-2 sm:col-span-1">
                    <Label className="text-xs">Tulisan salam</Label>
                    <Input value={s.salam} maxLength={24} onChange={(e) => ubah({ jadwal: draf.jadwal.map((x, j) => (j === i ? { ...x, salam: e.target.value.toUpperCase() } : x)) })} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardContent className="pt-4">
              <Baris label="Tutup otomatis setelah" ket="Dalam detik. Isi 0 supaya sapaan tetap tampil sampai diklik.">
                <div className="flex items-center gap-2">
                  <Input type="number" min={0} max={3600} className="w-28" value={draf.durasiDetik} onChange={(e) => ubah({ durasiDetik: Math.max(0, Number(e.target.value) || 0) })} />
                  <span className="text-sm text-muted-foreground">detik{draf.durasiDetik >= 60 ? ` (${Math.round((draf.durasiDetik / 60) * 10) / 10} menit)` : ''}</span>
                </div>
              </Baris>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------- latar */}
        <TabsContent value="latar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Gambar latar</CardTitle>
              <CardDescription>Centang gambar yang ikut diacak. Satu gambar dipilih untuk tiap sapaan.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {LATAR_BAWAAN.map((src, i) => {
                  const on = draf.latarBawaan.includes(i);
                  return (
                    <div key={src} className={cn('group relative overflow-hidden rounded-xl border-2 transition', on ? 'border-primary' : 'border-transparent opacity-50')}>
                      <button type="button" className="block w-full" onClick={() => ubah({ latarBawaan: on ? draf.latarBawaan.filter((x) => x !== i) : [...draf.latarBawaan, i].sort() })}>
                        <img src={src} alt={`Bangau ${i + 1}`} className="aspect-video w-full object-cover" />
                      </button>
                      <div className="absolute left-2 top-2"><Checkbox checked={on} className="bg-white" onCheckedChange={() => ubah({ latarBawaan: on ? draf.latarBawaan.filter((x) => x !== i) : [...draf.latarBawaan, i].sort() })} /></div>
                      <button type="button" className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition group-hover:opacity-100" onClick={() => lihat(undefined, { latar: src })}>Pratinjau</button>
                      <span className="absolute bottom-2 left-2 rounded bg-black/55 px-1.5 text-[10px] font-semibold text-white">Bangau {i + 1}</span>
                    </div>
                  );
                })}
                {draf.latarKustom.map((src) => (
                  <div key={src} className="group relative overflow-hidden rounded-xl border-2 border-primary">
                    <img src={src} alt="" className="aspect-video w-full object-cover" />
                    <span className="absolute bottom-2 left-2 rounded bg-black/55 px-1.5 text-[10px] font-semibold text-white">Unggahan</span>
                    <div className="absolute right-2 top-2 flex gap-1">
                      <button type="button" className="rounded-md bg-black/60 px-2 py-1 text-[11px] font-semibold text-white" onClick={() => lihat(undefined, { latar: src })}>Pratinjau</button>
                      <button type="button" className="rounded-md bg-red-600/90 p-1 text-white" onClick={() => ubah({ latarKustom: draf.latarKustom.filter((x) => x !== src) })} aria-label="Hapus">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={mengunggah}
                  onClick={() => fileRef.current?.click()}
                  className="flex aspect-video flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
                >
                  {mengunggah ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImagePlus className="h-6 w-6" />}
                  {mengunggah ? 'Mengunggah…' : 'Unggah gambar'}
                  <span className="text-[10px] font-normal">JPG/PNG/WebP, otomatis dikecilkan</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => void unggahLatar(e.target.files)} />
              </div>
              {draf.latarBawaan.length + draf.latarKustom.length === 0 && (
                <p className="mt-3 text-sm text-amber-700">Tidak ada gambar dipilih — sapaan hanya memakai warna polos.</p>
              )}
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardContent className="pt-4">
              <Baris label="Efek kain berkibar" ket="Gambar bergoyang pelan seperti kain tertiup angin.">
                <Switch checked={draf.efekKibar} onCheckedChange={(v) => ubah({ efekKibar: v })} />
              </Baris>
              <Baris label="Kepekatan lapisan warna" ket="Makin kecil, gambar latar makin jelas (tulisan bisa jadi kurang terbaca).">
                <div className="flex w-56 items-center gap-3">
                  <Slider min={30} max={100} step={5} value={[Math.round(draf.kepekatan * 100)]} onValueChange={([v]) => ubah({ kepekatan: v / 100 })} />
                  <span className="w-10 text-right text-sm font-semibold">{Math.round(draf.kepekatan * 100)}%</span>
                </div>
              </Baris>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------- warna */}
        <TabsContent value="warna">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Palet warna</CardTitle>
              <CardDescription>Satu palet dipilih acak tiap sapaan muncul. Matikan centang untuk mengeluarkan palet dari acakan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {draf.palet.map((p, i) => {
                const ikut = draf.paletAktif.length === 0 || draf.paletAktif.includes(p.nama);
                const set = (ubahan: Partial<PaletSapaan>) => ubah({ palet: draf.palet.map((x, j) => (j === i ? { ...x, ...ubahan } : x)) });
                const toggle = () => {
                  const semua = draf.paletAktif.length ? draf.paletAktif : draf.palet.map((x) => x.nama);
                  const baru = ikut ? semua.filter((n) => n !== p.nama) : [...semua, p.nama];
                  ubah({ paletAktif: baru.length === draf.palet.length ? [] : baru });
                };
                const warna: [keyof PaletSapaan, string][] = [['aksen', 'Nama'], ['kotak', 'Kotak'], ['kotakTeks', 'Teks kotak'], ['pita', 'Pita'], ['pitaTeks', 'Teks pita']];
                return (
                  <div key={i} className={cn('flex flex-wrap items-center gap-3 rounded-xl border p-3', !ikut && 'opacity-55')}>
                    <Checkbox checked={ikut} onCheckedChange={toggle} />
                    <div className="h-12 w-20 flex-none overflow-hidden rounded-lg border" style={{ background: rgbKeHex(p.tint) }}>
                      <div className="px-1.5 pt-1 text-[9px] font-extrabold leading-tight text-white">PAGI,</div>
                      <div className="px-1.5 text-[9px] font-extrabold leading-tight" style={{ color: p.aksen }}>HARIS.</div>
                      <div className="mx-1.5 mt-0.5 h-1.5 rounded-sm" style={{ background: p.kotak }} />
                    </div>
                    <Input className="h-8 w-32" value={p.nama} onChange={(e) => set({ nama: e.target.value })} />
                    <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      Latar <input type="color" className="h-7 w-9 cursor-pointer rounded border" value={rgbKeHex(p.tint)} onChange={(e) => set({ tint: hexKeRgb(e.target.value) })} />
                    </label>
                    {warna.map(([k, l]) => (
                      <label key={k} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        {l} <input type="color" className="h-7 w-9 cursor-pointer rounded border" value={p[k] as string} onChange={(e) => set({ [k]: e.target.value } as Partial<PaletSapaan>)} />
                      </label>
                    ))}
                    <div className="ml-auto flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => lihat(undefined, { palet: p })}><Eye className="h-4 w-4" /></Button>
                      <Button size="sm" variant="ghost" className="text-red-600" disabled={draf.palet.length <= 1} onClick={() => ubah({ palet: draf.palet.filter((_, j) => j !== i), paletAktif: draf.paletAktif.filter((n) => n !== p.nama) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button variant="outline" className="gap-2" onClick={() => ubah({ palet: [...draf.palet, { ...draf.palet[0], nama: `Palet ${draf.palet.length + 1}` }] })}>
                <Plus className="h-4 w-4" /> Tambah palet
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------- kutipan */}
        <TabsContent value="kutipan">
          <Card>
            <CardContent className="pt-4">
              <Baris label="Sumber kutipan" ket="Ayat bawaan: 25 ayat Al-Qur'an dan 25 ayat Alkitab tentang bekerja.">
                <Select value={draf.sumberKutipan} onValueChange={(v) => ubah({ sumberKutipan: v as KonfigSapaan['sumberKutipan'] })}>
                  <SelectTrigger className="w-60"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ayat">Ayat bawaan</SelectItem>
                    <SelectItem value="kustom">Kutipan buatan sendiri</SelectItem>
                    <SelectItem value="campur">Campur keduanya</SelectItem>
                    <SelectItem value="tidak">Tanpa kutipan</SelectItem>
                  </SelectContent>
                </Select>
              </Baris>
              <Baris label="Tampilkan teks Arab" ket="Untuk ayat Al-Qur'an dan kutipan yang punya teks Arab.">
                <Switch checked={draf.tampilArab} onCheckedChange={(v) => ubah({ tampilArab: v })} />
              </Baris>
              <Baris label="Pengguna yang mendapat ayat Alkitab" ket="Nama akun atau sebagian nama, pisahkan dengan koma.">
                <Input
                  className="w-72"
                  defaultValue={draf.penggunaAlkitab.join(', ')}
                  key={draf.penggunaAlkitab.join('|')}
                  onBlur={(e) => ubah({ penggunaAlkitab: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
                />
              </Baris>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Kutipan buatan sendiri ({draf.kutipanKustom.length})</CardTitle>
              <CardDescription>Dipakai kalau sumber kutipan "buatan sendiri" atau "campur". Centang waktu kalau kutipan hanya cocok untuk pagi/siang/sore tertentu.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {draf.kutipanKustom.map((k, i) => {
                const set = (u: Partial<KutipanKustom>) => ubah({ kutipanKustom: draf.kutipanKustom.map((x, j) => (j === i ? { ...x, ...u } : x)) });
                return (
                  <div key={i} className="space-y-2 rounded-xl border p-3">
                    <Textarea rows={2} placeholder="Isi kutipan" value={k.teks} onChange={(e) => set({ teks: e.target.value })} />
                    <Textarea rows={1} dir="rtl" placeholder="Teks Arab (opsional)" value={k.arab ?? ''} onChange={(e) => set({ arab: e.target.value || undefined })} />
                    <div className="flex flex-wrap items-center gap-3">
                      <Input className="h-8 w-56" placeholder="Sumber, mis. QS. Al-Mulk: 15" value={k.sumber} onChange={(e) => set({ sumber: e.target.value })} />
                      {ID_WAKTU.map((w) => (
                        <label key={w} className="flex items-center gap-1 text-xs">
                          <Checkbox
                            checked={!!k.waktu?.includes(w)}
                            onCheckedChange={(v) => set({ waktu: v ? [...(k.waktu ?? []), w] : (k.waktu ?? []).filter((x) => x !== w) })}
                          />
                          {LABEL_WAKTU[w]}
                        </label>
                      ))}
                      <Button size="sm" variant="ghost" className="ml-auto text-red-600" onClick={() => ubah({ kutipanKustom: draf.kutipanKustom.filter((_, j) => j !== i) })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              <Button variant="outline" className="gap-2" onClick={() => ubah({ kutipanKustom: [...draf.kutipanKustom, { teks: '', sumber: '' }] })}>
                <Plus className="h-4 w-4" /> Tambah kutipan
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------- tampilan */}
        <TabsContent value="tampilan">
          <Card>
            <CardContent className="pt-4">
              <Baris label="Cara menulis nama" ket='Panggilan: "Muhammad Rizki" jadi RIZKI. Nama depan: MUHAMMAD.'>
                <Select value={draf.formatNama} onValueChange={(v) => ubah({ formatNama: v as KonfigSapaan['formatNama'] })}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="panggilan">Nama panggilan</SelectItem>
                    <SelectItem value="depan">Nama depan</SelectItem>
                    <SelectItem value="lengkap">Nama lengkap</SelectItem>
                  </SelectContent>
                </Select>
              </Baris>
              <Baris label="Ukuran tulisan salam & nama">
                <div className="flex w-56 items-center gap-3">
                  <Slider min={60} max={140} step={5} value={[Math.round(draf.skalaJudul * 100)]} onValueChange={([v]) => ubah({ skalaJudul: v / 100 })} />
                  <span className="w-10 text-right text-sm font-semibold">{Math.round(draf.skalaJudul * 100)}%</span>
                </div>
              </Baris>
              <Baris label="Ukuran tulisan kutipan">
                <div className="flex w-56 items-center gap-3">
                  <Slider min={60} max={140} step={5} value={[Math.round(draf.skalaKutipan * 100)]} onValueChange={([v]) => ubah({ skalaKutipan: v / 100 })} />
                  <span className="w-10 text-right text-sm font-semibold">{Math.round(draf.skalaKutipan * 100)}%</span>
                </div>
              </Baris>
              <Baris label="Kotak kutipan">
                <Select value={draf.kemiringan} onValueChange={(v) => ubah({ kemiringan: v as KonfigSapaan['kemiringan'] })}>
                  <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="acak">Miring acak</SelectItem>
                    <SelectItem value="lurus">Lurus</SelectItem>
                  </SelectContent>
                </Select>
              </Baris>
              <Baris label="Logo Bluebook"><Switch checked={draf.tampilLogo} onCheckedChange={(v) => ubah({ tampilLogo: v })} /></Baris>
              <Baris label="Tanggal hari ini"><Switch checked={draf.tampilTanggal} onCheckedChange={(v) => ubah({ tampilTanggal: v })} /></Baris>
              <Baris label="Tulisan petunjuk" ket="Di pojok kanan atas (laptop) atau bawah (HP).">
                <div className="flex items-center gap-2">
                  <Switch checked={draf.tampilPetunjuk} onCheckedChange={(v) => ubah({ tampilPetunjuk: v })} />
                  <Input className="w-72" value={draf.teksPetunjuk} maxLength={120} disabled={!draf.tampilPetunjuk} onChange={(e) => ubah({ teksPetunjuk: e.target.value })} />
                </div>
              </Baris>
            </CardContent>
          </Card>
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-base">Pita berjalan</CardTitle>
            </CardHeader>
            <CardContent>
              <Baris label="Tampilkan pita"><Switch checked={draf.tampilPita} onCheckedChange={(v) => ubah({ tampilPita: v })} /></Baris>
              <Baris label="Info otomatis" ket="Tanggal, sisa hari kerja bulan ini, dan sisa hari tahun ini.">
                <Switch checked={draf.pitaOtomatis} disabled={!draf.tampilPita} onCheckedChange={(v) => ubah({ pitaOtomatis: v })} />
              </Baris>
              <div className="pt-3">
                <Label className="text-sm font-semibold">Tulisan tambahan</Label>
                <p className="mb-2 text-xs text-muted-foreground">Satu baris satu tulisan, mis. pengumuman singkat atau slogan.</p>
                <Textarea
                  rows={4}
                  disabled={!draf.tampilPita}
                  defaultValue={draf.pitaTambahan.join('\n')}
                  key={draf.pitaTambahan.join('|')}
                  onBlur={(e) => ubah({ pitaTambahan: e.target.value.split('\n').map((s) => s.trim()).filter(Boolean) })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ---------------------------------------------------------- pengguna */}
        <TabsContent value="pengguna">
          <ResetPengguna />
        </TabsContent>
      </Tabs>

      {pratinjau && slotPratinjau && (
        <SapaanPoster
          key={pratinjau.kunci}
          nama={userName}
          ayat={pilihKutipan(draf, pratinjau.kunci, slotPratinjau.id, userName)}
          kunci={pratinjau.kunci}
          salam={slotPratinjau.salam}
          konfig={draf}
          palet={pratinjau.palet}
          latar={pratinjau.latar}
          menutup={false}
          onTutup={() => setPratinjau(null)}
        />
      )}
    </MainLayout>
  );
};

/** Daftar akun dan tombol reset supaya sapaan muncul lagi. */
const ResetPengguna: React.FC = () => {
  const { user } = useAuth();
  const { data = [], isLoading, error } = useStatusSapaan();
  const reset = useResetSapaan();
  const [cari, setCari] = useState('');
  const [konfirmasi, setKonfirmasi] = useState(false);
  const daftar = data.filter((u) => u.nama?.toLowerCase().includes(cari.toLowerCase()));

  const jalan = async (id: string | null, nama?: string) => {
    try {
      const n = await reset.mutateAsync(id);
      toast.success(id ? `Sapaan ${nama} di-reset` : `Sapaan ${n} akun di-reset`, { description: 'Muncul lagi saat Bluebook dibuka atau dalam 5 menit kalau sedang terbuka.' });
    } catch (e) {
      const pesan = e instanceof Error ? e.message : String(e);
      toast.error('Gagal reset', { description: /reset_sapaan|function/i.test(pesan) ? 'Jalankan dulu SQL 2026-11-27_konfigurasi_sapaan.sql di Supabase.' : pesan });
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">Reset sapaan per pengguna</CardTitle>
          <CardDescription>Reset membuat sapaan waktu yang sedang berjalan muncul lagi di akun itu.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="gap-2" onClick={() => user && jalan(user.id, 'Anda')}>
            <UserRoundCheck className="h-4 w-4" /> Reset punya saya
          </Button>
          <Button variant="destructive" className="gap-2" onClick={() => setKonfirmasi(true)}>
            <Users className="h-4 w-4" /> Reset semua
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Input placeholder="Cari nama…" value={cari} onChange={(e) => setCari(e.target.value)} className="mb-3 max-w-xs" />
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Memuat…</div>
        ) : error ? (
          <p className="text-sm text-red-600">Daftar akun gagal dimuat.</p>
        ) : (
          <div className="divide-y rounded-xl border">
            {daftar.map((u) => (
              <div key={u.user_id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{u.nama || 'Tanpa nama'}{u.user_id === user?.id ? ' (Anda)' : ''}</div>
                  <div className="text-xs text-muted-foreground">
                    {slotTeks(u.last_greeting_slot) ? `Terakhir melihat: ${slotTeks(u.last_greeting_slot)}` : u.last_greeting_date ? `Terakhir melihat: ${u.last_greeting_date}` : 'Belum pernah / sudah di-reset'}
                    {u.status !== 'approved' ? ` · ${u.status}` : ''}
                  </div>
                </div>
                <Button size="sm" variant="outline" className="gap-1.5" disabled={reset.isPending} onClick={() => jalan(u.user_id, u.nama)}>
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              </div>
            ))}
            {daftar.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">Tidak ada akun.</p>}
          </div>
        )}
      </CardContent>
      <AlertDialog open={konfirmasi} onOpenChange={setKonfirmasi}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset sapaan semua akun?</AlertDialogTitle>
            <AlertDialogDescription>Semua pengguna akan melihat sapaan lagi saat membuka Bluebook di waktu sapaan berikutnya.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={() => void jalan(null)}>Reset semua</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default SapaanConfigPage;
