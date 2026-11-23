import React, { useMemo, useRef, useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { fmtIDR } from '@/lib/mlf-utils';
import {
  useArsipMaster, useBerkasArsip, useSimpanBerkas, useHapusBerkas,
  useDebiturArsip, useUnitLaci, useBalikUrutan,
  cariRekening, cariTopUp, samakanNama, unitRekening, debiturSeNama, saranDebitur,
  type RekeningMaster, type BerkasArsip, type DebiturArsip, type UnitLaci, type PilihanDebitur,
} from '@/hooks/use-arsip';
import { RiwayatDebiturDialog } from './RiwayatDebiturDialog';
import {
  Search, Archive, Check, Trash2, ArrowUp, ArrowDown, HelpCircle,
  RefreshCw, PackageOpen, AlertTriangle, History, ArrowUpDown,
} from 'lucide-react';
import { toast } from 'sonner';

/* ------------------------------------------------------------------ bantuan */

const CABINET_BERKAS = [1, 2, 3, 4, 5];
const CABINET_KHASANAH = [1, 2];
const LACI = [1, 2, 3, 4];

type JenisLaci = 'produktif' | 'konsumtif' | 'jaminan';

const JENIS_LABEL: Record<JenisLaci, string> = {
  produktif: 'Produktif (KMK/KI)',
  konsumtif: 'Konsumtif',
  jaminan: 'Jaminan',
};

const tglPendek = (s: string | null | undefined) => {
  if (!s) return '—';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const kunciJenis = (kode: string) => `arsip-jenis-${kode}`;
const kunciUnit = (kode: string) => `arsip-unit-${kode}`;

const UNIT_LABEL: Record<UnitLaci, string> = { telihan: 'Telihan', meranti: 'Meranti' };

const bacaLokal = (k: string) => {
  try { return localStorage.getItem(k); } catch { return null; }
};
const tulisLokal = (k: string, v: string) => {
  try { localStorage.setItem(k, v); } catch { /* abaikan */ }
};

const nomor = (n: number) => String(n).padStart(3, '0');

/* -------------------------------------------------------------------- lencana */

const LencanaStatus: React.FC<{ status: string }> = ({ status }) => {
  if (status === 'aktif') {
    return <Badge className="bg-success/15 text-success hover:bg-success/15 border-0">Aktif</Badge>;
  }
  if (status === 'lunas') {
    return <Badge className="bg-info/15 text-info hover:bg-info/15 border-0">Lunas</Badge>;
  }
  return <Badge variant="secondary">Tak dikenali</Badge>;
};

/* ==================================================================== halaman */

const SortirBerkasPage: React.FC = () => {
  const { data: master = [], isLoading: muatMaster, error: galatMaster, refetch } = useArsipMaster();
  const { data: berkas = [] } = useBerkasArsip();
  const { data: daftarDebitur = [] } = useDebiturArsip();
  const simpan = useSimpanBerkas();
  const hapus = useHapusBerkas();
  const ubahUnit = useUnitLaci();
  const balik = useBalikUrutan();
  const [lihatRiwayat, setLihatRiwayat] = useState<DebiturArsip | null>(null);

  const [ruang, setRuang] = useState<'berkas' | 'khasanah'>('berkas');
  const [cabinet, setCabinet] = useState(1);
  const [laci, setLaci] = useState(1);
  const [jenis, setJenis] = useState<JenisLaci>('produktif');
  const [kata, setKata] = useState('');
  const [urutManual, setUrutManual] = useState<number | null>(null);
  const [formManual, setFormManual] = useState(false);
  const [namaManual, setNamaManual] = useState('');
  const [pkManual, setPkManual] = useState('');
  const [akadManual, setAkadManual] = useState('');
  const [statusManual, setStatusManual] = useState<'lunas' | 'tidak_dikenali'>('lunas');
  /** kunci saran yang dipilih, atau 'baru' untuk debitur baru */
  const [sambungKe, setSambungKe] = useState<string | null>(null);
  const [pilihLaciTerbuka, setPilihLaciTerbuka] = useState(true);
  const kotakCari = useRef<HTMLInputElement>(null);

  const kodeLaci = `${ruang === 'berkas' ? 'B' : 'J'}${cabinet}.${laci}`;

  // jenis laci diingat per laci, supaya tidak dipilih ulang tiap pindah
  useEffect(() => {
    const simpanan = bacaLokal(kunciJenis(kodeLaci)) as JenisLaci | null;
    if (simpanan) setJenis(simpanan);
    else setJenis(ruang === 'khasanah' ? 'jaminan' : 'produktif');
  }, [kodeLaci, ruang]);

  const gantiJenis = (j: JenisLaci) => {
    setJenis(j);
    tulisLokal(kunciJenis(kodeLaci), j);
  };

  const isiLaci = useMemo(
    () => berkas.filter((b) => b.kode_laci === kodeLaci).sort((a, b) => a.nomor_urut - b.nomor_urut),
    [berkas, kodeLaci],
  );

  // Unit laci (Telihan / Meranti). Kalau laci sudah berisi, unitnya dibaca dari
  // map di dalamnya, jadi sama di semua HP; kalau masih kosong, diingat di HP ini.
  const [unitLokal, setUnitLokal] = useState<UnitLaci>('telihan');
  useEffect(() => {
    setUnitLokal((bacaLokal(kunciUnit(kodeLaci)) as UnitLaci | null) || 'telihan');
  }, [kodeLaci]);
  const unitLaci: UnitLaci = isiLaci[0]?.unit ?? unitLokal;

  const gantiUnit = async (u: UnitLaci) => {
    if (u === unitLaci) return;
    setUnitLokal(u);
    tulisLokal(kunciUnit(kodeLaci), u);
    if (isiLaci.length > 0) {
      try {
        await ubahUnit.mutateAsync({ brcd: '143', kode_laci: kodeLaci, unit: u });
        toast.success(`${isiLaci.length} map di ${kodeLaci} ditandai unit ${UNIT_LABEL[u]}`);
      } catch (e) {
        toast.error((e as Error)?.message || 'Gagal mengganti unit');
      }
    }
  };

  const debiturPerId = useMemo(() => new Map(daftarDebitur.map((d) => [d.id, d])), [daftarDebitur]);

  /** jumlah kredit lain (map atau rekening MLF) atas nama yang sama — untuk ikon riwayat */
  const hitungRiwayat = (b: BerkasArsip) => {
    const k = samakanNama(b.nama_debitur);
    const mapLain = b.debitur_id ? berkas.filter((x) => x.debitur_id === b.debitur_id && x.id !== b.id) : [];
    const rekSudah = new Set(berkas.map((x) => x.no_rekening).filter(Boolean));
    const rekLain = master.filter(
      (r) => r.no_rekening !== b.no_rekening && !rekSudah.has(r.no_rekening) && samakanNama(r.nama_debitur) === k,
    );
    return mapLain.length + rekLain.length;
  };

  const balikUrutan = async () => {
    if (isiLaci.length < 2) return;
    if (!confirm(
      `Balik urutan ${isiLaci.length} map di ${kodeLaci}?\n\n`
      + `Pakai ini kalau laci ini dulu dinomori dari DEPAN. Setelah dibalik, `
      + `map 001 menjadi yang paling belakang.`,
    )) return;
    try {
      await balik.mutateAsync({ brcd: '143', kode_laci: kodeLaci });
      toast.success(`Urutan ${kodeLaci} dibalik — 001 sekarang paling belakang`);
    } catch (e) {
      toast.error((e as Error)?.message || 'Gagal membalik urutan');
    }
  };

  const saran = useMemo(
    () => (formManual ? saranDebitur(namaManual, daftarDebitur, master) : []),
    [formManual, namaManual, daftarDebitur, master],
  );
  // pilihan sambungan default: nama yang persis sama, kalau ada
  useEffect(() => {
    setSambungKe((lama) => {
      if (lama && (lama === 'baru' || saran.some((x) => x.kunci === lama))) return lama;
      return saran.find((x) => x.persis)?.kunci ?? (namaManual.trim() ? 'baru' : null);
    });
  }, [saran, namaManual]);

  const urutBerikutnya = useMemo(() => {
    if (urutManual !== null) return urutManual;
    return isiLaci.length === 0 ? 1 : Math.max(...isiLaci.map((b) => b.nomor_urut)) + 1;
  }, [isiLaci, urutManual]);

  /** rekening yang sudah ditempatkan di laci mana pun */
  const sudahMasuk = useMemo(() => {
    const peta = new Map<string, BerkasArsip>();
    berkas.forEach((b) => { if (b.no_rekening) peta.set(b.no_rekening, b); });
    return peta;
  }, [berkas]);

  const hasil = useMemo(() => {
    const semua = cariRekening(master, kata);
    // kredit unit yang sama dengan laci naik ke atas (berkas Meranti di laci sendiri)
    const unitCocok = (r: RekeningMaster) => {
      const u = unitRekening(r);
      return u === 'unknown' || u === unitLaci;
    };
    // laci produktif menaikkan kredit produktif ke atas, dan sebaliknya
    const jenisCocok = (r: RekeningMaster) => {
      if (jenis === 'jaminan') return true;
      const produktif = (r.jenis_kredit || '').toLowerCase().includes('modal kerja')
        || (r.jenis_kredit || '').toLowerCase().includes('investasi');
      return jenis === 'produktif' ? produktif : !produktif;
    };
    return [...semua].sort(
      (a, b) => Number(unitCocok(b)) - Number(unitCocok(a)) || Number(jenisCocok(b)) - Number(jenisCocok(a)),
    );
  }, [master, kata, jenis, unitLaci]);

  /** kredit lain atas nama yang sama, untuk ditampilkan sebagai riwayat singkat */
  const kreditLain = (r: RekeningMaster) => {
    const k = samakanNama(r.nama_debitur);
    return master
      .filter((x) => x.no_rekening !== r.no_rekening && samakanNama(x.nama_debitur) === k)
      .sort((a, b) => (a.tanggal_akad || '').localeCompare(b.tanggal_akad || ''));
  };

  const catat = async (r: RekeningMaster) => {
    const ada = r.no_rekening ? sudahMasuk.get(r.no_rekening) : undefined;
    if (ada) {
      toast.error(`Sudah tercatat di ${ada.kode_laci} — ${String(ada.nomor_urut).padStart(3, '0')}`);
      return;
    }
    try {
      const d = debiturSeNama(r.nama_debitur, daftarDebitur);
      await simpan.mutateAsync({ debitur: d ? { id: d.id } : { baru: r.nama_debitur }, baris: {
        brcd: '143',
        kode_laci: kodeLaci,
        nomor_urut: urutBerikutnya,
        jenis_laci: jenis,
        unit: unitLaci,
        nama_debitur: r.nama_debitur,
        nomor_pk: r.nomor_pk,
        no_rekening: r.no_rekening,
        tanggal_akad: r.tanggal_akad,
        jatuh_tempo: r.jatuh_tempo,
        plafon: r.plafon,
        jenis_kredit: r.jenis_kredit,
        status_kredit: r.status,
        sumber: 'mlf',
        catatan: null,
      } });
      const lama = d ? berkas.filter((b) => b.debitur_id === d.id).length : 0;
      toast.success(
        `${nomor(urutBerikutnya)} · ${r.nama_debitur}`,
        lama > 0 ? { description: `Tersambung ke riwayat debitur ini (${lama} map lain).` } : undefined,
      );
      setKata('');
      setUrutManual(null);
      kotakCari.current?.focus();
    } catch (e) {
      toast.error((e as Error)?.message || 'Gagal menyimpan');
    }
  };

  const catatManual = async () => {
    const nama = namaManual.trim().toUpperCase();
    if (!nama) return;
    const pilihan = saran.find((x) => x.kunci === sambungKe);
    const debitur: PilihanDebitur = pilihan
      ? (pilihan.debitur ? { id: pilihan.debitur.id } : { baru: pilihan.nama })
      : { baru: nama };
    try {
      await simpan.mutateAsync({ debitur, baris: {
        brcd: '143',
        kode_laci: kodeLaci,
        nomor_urut: urutBerikutnya,
        jenis_laci: jenis,
        unit: unitLaci,
        nama_debitur: nama,
        nomor_pk: pkManual.trim() || null,
        no_rekening: null,
        tanggal_akad: akadManual || null,
        jatuh_tempo: null,
        plafon: null,
        jenis_kredit: null,
        status_kredit: statusManual,
        sumber: 'manual',
        catatan: 'tidak ada di MLF (dicatat dari sampul map)',
      } });
      toast.success(
        `${nomor(urutBerikutnya)} · ${nama}`,
        { description: pilihan ? `Tersambung ke riwayat ${pilihan.nama}.` : 'Dicatat sebagai debitur baru.' },
      );
      setNamaManual('');
      setPkManual('');
      setAkadManual('');
      setSambungKe(null);
      setFormManual(false);
      setUrutManual(null);
      setKata('');
      kotakCari.current?.focus();
    } catch (e) {
      toast.error((e as Error)?.message || 'Gagal menyimpan');
    }
  };

  const batalkan = async (b: BerkasArsip) => {
    try {
      await hapus.mutateAsync(b.id);
      toast.success(`Dibatalkan: ${b.nama_debitur}`);
      setUrutManual(null);
    } catch (e) {
      toast.error((e as Error)?.message || 'Gagal menghapus');
    }
  };

  const jumlahTercatat = berkas.length;
  const belumDikenali = berkas.filter((b) => b.status_kredit === 'tidak_dikenali').length;

  const bukaRiwayat = (b: BerkasArsip) => {
    const d = b.debitur_id ? debiturPerId.get(b.debitur_id) : undefined;
    if (d) setLihatRiwayat(d);
    else toast.message('Map ini belum tersambung ke debitur. Jalankan SQL 2026-11-23 dulu.');
  };

  return (
    <MainLayout>
      <PageHeader
        title="Sortir Berkas"
        description="Pilih lacinya, lalu catat map mulai dari yang paling BELAKANG laci. Status lunas, top up, dan riwayat debitur disambungkan sendiri dari data MLF."
        actions={
          <>
            <Badge variant="outline" className="h-9 px-3 text-sm">
              {jumlahTercatat} map tercatat
            </Badge>
            {belumDikenali > 0 && (
              <Badge className="h-9 px-3 text-sm bg-warning/15 text-warning-foreground border-0">
                {belumDikenali} perlu ditinjau
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()} disabled={muatMaster}>
              <RefreshCw className={cn('w-4 h-4 mr-2', muatMaster && 'animate-spin')} />
              Muat ulang data MLF
            </Button>
          </>
        }
      />

      {galatMaster && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="p-4 flex items-start gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Daftar induk gagal dimuat.</p>
              <p className="text-muted-foreground mt-1">
                Jalankan dulu berkas SQL <code>2026-11-11_arsip_sortir_berkas.sql</code> dan{' '}
                <code>2026-11-23_arsip_riwayat_debitur.sql</code> di Supabase.
                Pesan aslinya: {(galatMaster as any)?.message}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ----------------------------------------------------- pemilih laci */}
      {!pilihLaciTerbuka && (
        <Card className="mb-4">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="h-11 px-3 rounded-xl border border-secondary bg-secondary/10 flex flex-col justify-center">
              <span className="font-mono text-base font-bold text-primary leading-none">{kodeLaci}</span>
              <span className="text-[10px] text-muted-foreground">{isiLaci.length} map</span>
            </div>
            <span className="text-sm text-muted-foreground">
              {JENIS_LABEL[jenis]}
              {unitLaci === 'meranti' && <Badge className="ml-2 bg-secondary text-secondary-foreground border-0">Meranti</Badge>}
            </span>
            <Button variant="outline" size="sm" className="ml-auto h-10"
              onClick={() => setPilihLaciTerbuka(true)}>
              Ganti laci
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className={cn('mb-4', !pilihLaciTerbuka && 'hidden')}>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg border overflow-hidden">
              {(['berkas', 'khasanah'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => { setRuang(r); setCabinet(1); setUrutManual(null); }}
                  className={cn(
                    'px-4 h-10 text-sm font-semibold transition-colors',
                    ruang === r ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted',
                  )}
                >
                  {r === 'berkas' ? 'Berkas kredit' : 'Khasanah'}
                </button>
              ))}
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <Label className="text-xs text-muted-foreground">Isi laci</Label>
              <div className="flex rounded-lg border overflow-hidden">
                {(ruang === 'khasanah'
                  ? (['jaminan'] as JenisLaci[])
                  : (['produktif', 'konsumtif'] as JenisLaci[])
                ).map((j) => (
                  <button
                    key={j}
                    onClick={() => gantiJenis(j)}
                    className={cn(
                      'px-3 h-10 text-xs font-semibold transition-colors',
                      jenis === j ? 'bg-secondary text-secondary-foreground' : 'bg-background hover:bg-muted',
                    )}
                  >
                    {JENIS_LABEL[j]}
                  </button>
                ))}
              </div>
              <Label className="text-xs text-muted-foreground ml-2">Unit</Label>
              <div className="flex rounded-lg border overflow-hidden">
                {(['telihan', 'meranti'] as UnitLaci[]).map((u) => (
                  <button
                    key={u}
                    onClick={() => gantiUnit(u)}
                    disabled={ubahUnit.isPending}
                    className={cn(
                      'px-3 h-10 text-xs font-semibold transition-colors',
                      unitLaci === u ? 'bg-secondary text-secondary-foreground' : 'bg-background hover:bg-muted',
                    )}
                  >
                    {UNIT_LABEL[u]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(ruang === 'berkas' ? CABINET_BERKAS : CABINET_KHASANAH).map((c) => (
              <button
                key={c}
                onClick={() => { setCabinet(c); setUrutManual(null); }}
                className={cn(
                  'h-10 min-w-[72px] px-3 rounded-lg border text-sm font-semibold transition-all',
                  cabinet === c
                    ? 'border-primary bg-accent text-primary'
                    : 'bg-background hover:bg-muted',
                )}
              >
                {ruang === 'berkas' ? `CAB ${c}` : `KHS ${c}`}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {LACI.map((l) => {
              const kode = `${ruang === 'berkas' ? 'B' : 'J'}${cabinet}.${l}`;
              const jml = berkas.filter((b) => b.kode_laci === kode).length;
              const aktif = l === laci;
              return (
                <button
                  key={l}
                  onClick={() => {
                    setLaci(l); setUrutManual(null); setPilihLaciTerbuka(false);
                    setTimeout(() => kotakCari.current?.focus(), 50);
                  }}
                  className={cn(
                    'h-14 flex-1 min-w-[88px] px-3 rounded-xl border text-left transition-all',
                    aktif
                      ? 'border-secondary bg-secondary/10 shadow-md translate-x-1'
                      : 'bg-background hover:bg-muted',
                  )}
                >
                  <div className="font-mono text-sm font-bold text-primary">{kode}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {jml} map
                    {berkas.some((b) => b.kode_laci === kode && b.unit === 'meranti') && ' · Meranti'}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------ kotak pencarian */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_1fr] items-start">
        <div className="space-y-4">
          <Card className="sticky top-2 z-10">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="shrink-0">
                  <div className="text-[11px] text-muted-foreground">Map ke · dari belakang</div>
                  <div className="font-mono text-3xl font-bold text-primary leading-none">
                    {String(urutBerikutnya).padStart(3, '0')}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button variant="outline" size="icon" className="h-7 w-7"
                    onClick={() => setUrutManual(urutBerikutnya + 1)}>
                    <ArrowUp className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="outline" size="icon" className="h-7 w-7"
                    onClick={() => setUrutManual(Math.max(1, urutBerikutnya - 1))}>
                    <ArrowDown className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    ref={kotakCari}
                    value={kata}
                    onChange={(e) => setKata(e.target.value)}
                    placeholder="Nama debitur / nomor PK / rekening…"
                    className="h-12 pl-9 text-base"
                    autoFocus
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Menyortir <span className="font-mono font-semibold text-primary">{kodeLaci}</span>
                  {' · '}{JENIS_LABEL[jenis]}{' · '}{UNIT_LABEL[unitLaci]}{' · '}{isiLaci.length} map di laci ini
                </span>
                <button className="underline underline-offset-2" onClick={() => setFormManual((v) => !v)}>
                  Map lama / tak ada di MLF
                </button>
              </div>

              {formManual && (
                <div className="space-y-2.5 pt-1 border-t mt-1">
                  <p className="text-xs text-muted-foreground pt-2">
                    Untuk map lama yang tidak ada di MLF (biasanya lunas sebelum 2026). Isi dari sampul map,
                    lalu sambungkan ke debitur yang sama supaya masuk riwayatnya.
                  </p>
                  <Input
                    value={namaManual}
                    onChange={(e) => setNamaManual(e.target.value)}
                    placeholder="Nama di sampul map (wajib)"
                    className="h-11"
                    autoFocus
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={pkManual}
                      onChange={(e) => setPkManual(e.target.value)}
                      placeholder="Nomor PK (kalau ada)"
                      className="h-10 font-mono text-sm"
                    />
                    <Input
                      type="date"
                      value={akadManual}
                      onChange={(e) => setAkadManual(e.target.value)}
                      className="h-10 text-sm"
                      aria-label="Tanggal akad (kalau ada)"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="flex rounded-lg border overflow-hidden">
                      {([['lunas', 'Sudah lunas'], ['tidak_dikenali', 'Belum tahu']] as const).map(([v, l]) => (
                        <button
                          key={v}
                          onClick={() => setStatusManual(v)}
                          className={cn(
                            'px-3 h-9 text-xs font-semibold',
                            statusManual === v ? 'bg-secondary text-secondary-foreground' : 'bg-background hover:bg-muted',
                          )}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {namaManual.trim().length >= 3 && (
                    <div className="space-y-1.5">
                      <div className="text-xs font-semibold">Sambungkan ke riwayat</div>
                      {saran.map((x) => {
                        const aktif = x.rekening.filter((r) => r.status === 'aktif').length;
                        const jmlMap = x.debitur ? berkas.filter((b) => b.debitur_id === x.debitur!.id).length : 0;
                        return (
                          <button
                            key={x.kunci}
                            onClick={() => setSambungKe(x.kunci)}
                            className={cn(
                              'w-full text-left rounded-lg border px-3 py-2 text-sm transition-colors',
                              sambungKe === x.kunci ? 'border-primary bg-accent' : 'hover:bg-muted',
                            )}
                          >
                            <div className="font-medium">{x.nama}</div>
                            <div className="text-[11px] text-muted-foreground">
                              {[
                                aktif > 0 && `${aktif} kredit aktif`,
                                x.rekening.length - aktif > 0 && `${x.rekening.length - aktif} lunas di MLF`,
                                jmlMap > 0 && `${jmlMap} map sudah di laci`,
                              ].filter(Boolean).join(' · ') || 'debitur tercatat'}
                            </div>
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setSambungKe('baru')}
                        className={cn(
                          'w-full text-left rounded-lg border border-dashed px-3 py-2 text-sm',
                          sambungKe === 'baru' ? 'border-primary bg-accent' : 'hover:bg-muted',
                        )}
                      >
                        Debitur baru — tidak ada yang cocok
                      </button>
                    </div>
                  )}

                  <Button className="h-11 w-full" onClick={catatManual} disabled={!namaManual.trim() || simpan.isPending}>
                    Simpan sebagai map {nomor(urutBerikutnya)}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* hasil pencarian */}
          <div className="space-y-2">
            {kata.trim().length < 2 && (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-sm text-muted-foreground">
                  <Archive className="w-7 h-7 mx-auto mb-2 opacity-40" />
                  {muatMaster
                    ? 'Memuat daftar induk dari MLF…'
                    : `${master.length} rekening siap dicocokkan. Ketik dua huruf untuk mulai.`}
                </CardContent>
              </Card>
            )}

            {kata.trim().length >= 2 && hasil.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="p-5 text-center text-sm">
                  <HelpCircle className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-medium">Tidak ada yang cocok dengan “{kata}”.</p>
                  <p className="text-muted-foreground mt-1">
                    Kalau mapnya memang tidak ada di MLF, catat lewat <b>Map tak dikenal</b> supaya
                    nomor urut map berikutnya tidak bergeser.
                  </p>
                </CardContent>
              </Card>
            )}

            {hasil.map((r) => {
              const ada = r.no_rekening ? sudahMasuk.get(r.no_rekening) : undefined;
              const topUp = r.status === 'lunas' ? cariTopUp(r, master) : null;
              const unitR = unitRekening(r);
              const lain = kreditLain(r);
              return (
                <Card
                  key={r.no_rekening}
                  className={cn(
                    'transition-all',
                    ada ? 'opacity-55' : 'hover:border-primary/50 hover:shadow-md cursor-pointer active:scale-[.995]',
                  )}
                  onClick={() => !ada && catat(r)}
                >
                  <CardContent className="p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[15px] leading-tight">{r.nama_debitur}</span>
                          <LencanaStatus status={r.status} />
                          {r.kol != null && r.kol > 1 && (
                            <Badge variant="destructive" className="text-[10px]">Kol {r.kol}</Badge>
                          )}
                          {unitR === 'meranti' && (
                            <Badge className="text-[10px] bg-secondary text-secondary-foreground border-0">Meranti</Badge>
                          )}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground font-mono">
                          {r.nomor_pk || '(tanpa nomor PK)'}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Akad {tglPendek(r.tanggal_akad)} · {r.jenis_kredit || '—'} ·{' '}
                          {r.plafon ? fmtIDR(r.plafon) : '—'}
                        </div>

                        {topUp && (
                          <div className="mt-2 text-xs rounded-lg bg-secondary/15 text-secondary-foreground px-2.5 py-1.5">
                            Sudah top up → <b>{topUp.nomor_pk || topUp.no_rekening}</b>, akad{' '}
                            {tglPendek(topUp.tanggal_akad)}. Map ini jadi berkas lama debitur yang sama.
                          </div>
                        )}

                        {unitR !== 'unknown' && unitR !== unitLaci && !ada && (
                          <div className="mt-2 text-xs rounded-lg bg-warning/15 px-2.5 py-1.5">
                            Kredit unit {unitR === 'meranti' ? 'Meranti' : 'Telihan'}, sedangkan laci ini {UNIT_LABEL[unitLaci]}.
                          </div>
                        )}

                        {lain.length > 0 && (
                          <div className="mt-2 text-[11px] text-muted-foreground space-y-0.5">
                            <div className="font-semibold text-foreground/80">Riwayat nama ini:</div>
                            {lain.slice(0, 3).map((x) => {
                              const m = sudahMasuk.get(x.no_rekening);
                              return (
                                <div key={x.no_rekening} className="truncate">
                                  · {tglPendek(x.tanggal_akad)} {x.status === 'aktif' ? 'aktif' : 'lunas'}
                                  {' — '}{m ? `map ${m.kode_laci} · ${nomor(m.nomor_urut)}` : 'belum ada map'}
                                </div>
                              );
                            })}
                            {lain.length > 3 && <div>· dan {lain.length - 3} lainnya</div>}
                          </div>
                        )}

                        {ada && (
                          <div className="mt-2 text-xs rounded-lg bg-muted px-2.5 py-1.5">
                            Sudah tercatat di{' '}
                            <b className="font-mono">
                              {ada.kode_laci} — {String(ada.nomor_urut).padStart(3, '0')}
                            </b>
                          </div>
                        )}
                      </div>
                      {!ada && (
                        <Button size="sm" className="shrink-0 h-9" onClick={(e) => { e.stopPropagation(); catat(r); }}>
                          <Check className="w-4 h-4 mr-1" /> Catat
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* ------------------------------------------------------- isi laci */}
        <Card className="lg:sticky lg:top-2">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <PackageOpen className="w-4 h-4 text-primary" />
              <h2 className="font-semibold">Isi laci {kodeLaci}</h2>
              <span className="ml-auto text-xs text-muted-foreground">{isiLaci.length} map</span>
              {isiLaci.length > 1 && (
                <Button
                  variant="ghost" size="sm" className="h-7 px-2 text-xs"
                  onClick={balikUrutan} disabled={balik.isPending}
                  title="Untuk laci yang dulu dinomori dari depan"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 mr-1" /> Balik urutan
                </Button>
              )}
            </div>

            {isiLaci.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">
                Belum ada map tercatat di laci ini.
              </p>
            ) : (
              <div className="space-y-1 max-h-[52vh] overflow-y-auto pr-1">
                <div className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground text-center pb-1 border-b border-dashed">
                  DEPAN LACI
                </div>
                {[...isiLaci].reverse().map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-muted/60 group"
                  >
                    <span className="font-mono text-xs font-bold text-primary w-8 shrink-0">
                      {nomor(b.nomor_urut)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{b.nama_debitur}</div>
                      <div className="text-[11px] text-muted-foreground truncate font-mono">
                        {b.kode_map ? `${b.kode_map} · ` : ''}
                        {b.nomor_pk || (b.sumber === 'manual' ? 'dicatat manual' : '—')}
                      </div>
                    </div>
                    {(() => {
                      const n = hitungRiwayat(b);
                      return (
                        <button
                          onClick={() => bukaRiwayat(b)}
                          className={cn(
                            'h-7 px-1.5 rounded-md inline-flex items-center gap-1 text-[11px] font-semibold',
                            n > 0 ? 'text-primary hover:bg-accent' : 'text-muted-foreground/60 hover:bg-muted',
                          )}
                          title="Lihat riwayat debitur"
                        >
                          <History className="w-3.5 h-3.5" />
                          {n > 0 && `+${n}`}
                        </button>
                      );
                    })()}
                    <LencanaStatus status={b.status_kredit} />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 focus:opacity-100"
                      onClick={() => batalkan(b)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground text-center pt-1 border-t border-dashed">
                  BELAKANG LACI · 001
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <RiwayatDebiturDialog
        debitur={lihatRiwayat}
        onClose={() => setLihatRiwayat(null)}
        berkas={berkas}
        master={master}
        semuaDebitur={daftarDebitur}
      />
    </MainLayout>
  );
};

export default SortirBerkasPage;
