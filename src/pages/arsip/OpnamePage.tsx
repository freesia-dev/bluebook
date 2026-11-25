import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { samakanNama, useRapikanLaci, useOpnameArsip, type HasilRapikan } from '@/hooks/use-arsip';
import { useArsipKonteks, type MapLengkap } from '@/hooks/use-arsip-konteks';
import { PemindaiQR } from '@/components/arsip/PemindaiQR';
import { StripLaci } from '@/components/arsip/Kabinet';
import { KABINET, LACI_PER_KABINET, kodeLaci, nomor, tglPanjang, type IsiQR, type Ruang } from '@/lib/arsip';
import { CheckCircle2, ArrowDown, AlertTriangle, SearchX, Undo, ClipboardCheck, Search, Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Rapikan laci sekaligus opname. Map discan satu per satu dari yang paling
 * BELAKANG ke depan; nomor 001, 002, dst. diberikan sesuai urutan scan.
 * Label tidak perlu dicetak ulang karena QR hanya berisi kode map.
 */
const OpnamePage: React.FC = () => {
  const k = useArsipKonteks();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const laci = sp.get('laci');
  const rapikan = useRapikanLaci();
  const { data: riwayat = [] } = useOpnameArsip();
  const [urutan, setUrutan] = useState<MapLengkap[]>([]);
  const [kata, setKata] = useState('');
  const [hasil, setHasil] = useState<HasilRapikan | null>(null);
  const [ruang, setRuang] = useState<Ruang>('berkas');

  const isiLama = useMemo(() => (laci ? k.perLaci.get(laci) ?? [] : []), [k.perLaci, laci]);

  const tambah = (m: MapLengkap) => {
    if (urutan.some((x) => x.id === m.id)) {
      toast.message(`${m.nama_debitur} sudah discan`);
      return;
    }
    if (m.diserahkan_at) {
      toast.error('Jaminan ini tercatat sudah diserahkan ke debitur.');
      return;
    }
    setUrutan((u) => [...u, m]);
    setKata('');
  };

  const scan = (isi: Exclude<IsiQR, null>) => {
    if (isi.jenis === 'laci') {
      if (!laci) setSp({ laci: isi.kode });
      else if (isi.kode !== laci) toast.message(`Itu label laci ${isi.kode.slice(1)}. Selesaikan dulu laci ${laci.slice(1)}.`);
      return;
    }
    const m = k.perKode.get(isi.kode);
    if (!m) { toast.error(`Kode ${isi.kode} tidak dikenal`); return; }
    tambah(m);
  };

  const saran = useMemo(() => {
    const q = samakanNama(kata);
    if (q.length < 2) return [];
    return k.maps
      .filter((m) => !urutan.some((x) => x.id === m.id))
      .filter((m) => samakanNama(m.nama_debitur).includes(q) || (m.nomor_pk || '').toUpperCase().includes(kata.toUpperCase()))
      .sort((a, b) => Number(b.kode_laci === laci) - Number(a.kode_laci === laci))
      .slice(0, 6);
  }, [kata, k.maps, urutan, laci]);

  const selesai = async () => {
    if (!laci) return;
    const hilang = isiLama.filter((m) => !urutan.some((x) => x.id === m.id) && m.fisik !== 'dipinjam' && m.fisik !== 'terlambat').length;
    if (!confirm(`Simpan urutan baru laci ${laci.slice(1)}?\n\n${urutan.length} map discan.${hilang ? `\n${hilang} map tidak ikut discan dan akan ditandai perlu ditelusuri.` : ''}`)) return;
    try {
      const r = await rapikan.mutateAsync({ brcd: '143', kode_laci: laci, urutan: urutan.map((m) => m.id) });
      setHasil(r);
      setUrutan([]);
    } catch (e) {
      toast.error((e as Error)?.message || 'Gagal menyimpan');
    }
  };

  // --------------------------------------------------------- pilih laci
  if (!laci) {
    return (
      <MainLayout>
      <button type="button" onClick={() => navigate('/arsip')} className="text-sm text-muted-foreground flex items-center gap-1 mb-2 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Peta kabinet
      </button>
        <PageHeader title="Opname & rapikan laci" description="Pilih laci, atau scan label di muka laci." />
        <div className="grid lg:grid-cols-[1fr_1fr] gap-4">
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex rounded-lg border overflow-hidden w-fit">
                {(['berkas', 'khasanah'] as Ruang[]).map((r) => (
                  <button key={r} type="button" onClick={() => setRuang(r)} className={cn('px-4 h-9 text-sm font-semibold', ruang === r ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                    {r === 'berkas' ? 'Berkas' : 'Khasanah'}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2">
                {KABINET[ruang].flatMap((kb) => LACI_PER_KABINET.map((l) => {
                  const kode = kodeLaci(ruang, kb, l);
                  const n = (k.perLaci.get(kode) ?? []).length;
                  const op = riwayat.find((o) => o.kode_laci === kode);
                  return (
                    <button key={kode} type="button" onClick={() => setSp({ laci: kode })} className="rounded-xl border p-2.5 text-left hover:border-primary hover:bg-primary/5">
                      <div className="font-mono font-bold text-primary">{kode.slice(1)}</div>
                      <div className="text-[11px] text-muted-foreground">{n} map</div>
                      <div className="text-[10px] text-muted-foreground truncate">{op ? `opname ${tglPanjang(op.created_at)}` : 'belum opname'}</div>
                    </button>
                  );
                }))}
              </div>
            </CardContent>
          </Card>
          <Card><CardContent className="p-4"><PemindaiQR onHasil={scan} petunjuk="Scan QR di muka laci" /></CardContent></Card>
        </div>
      </MainLayout>
    );
  }

  // --------------------------------------------------------- hasil
  if (hasil) {
    const isiBaru = k.perLaci.get(laci) ?? [];
    return (
      <MainLayout>
      <button type="button" onClick={() => navigate('/arsip')} className="text-sm text-muted-foreground flex items-center gap-1 mb-2 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Peta kabinet
      </button>
        <PageHeader title={`Laci ${laci.slice(1)} selesai dirapikan`} description="Hasil rapikan sekaligus jadi catatan opname." />
        <div className="grid lg:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="rounded-xl bg-success/10 px-3 py-2.5 text-sm flex gap-2"><CheckCircle2 className="w-4 h-4 text-success mt-0.5" /><span><b>{hasil.cocok} map</b> cocok dengan catatan</span></div>
              {hasil.pindah > 0 && (
                <div className="rounded-xl bg-warning/15 px-3 py-2.5 text-sm flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5" />
                  <span><b>{hasil.pindah} map ternyata di laci ini</b>, dicatat pindah: {hasil.pindahan.map((p) => `${p.nama} (dari ${p.dari.slice(1)})`).join(', ')}</span></div>
              )}
              {hasil.telusur > 0 && (
                <div className="rounded-xl bg-destructive/10 px-3 py-2.5 text-sm flex gap-2 text-destructive"><SearchX className="w-4 h-4 mt-0.5" />
                  <span><b>{hasil.telusur} map tidak ditemukan</b>, masuk daftar telusur: {hasil.hilang.map((h) => h.nama).join(', ')}</span></div>
              )}
              <div className="rounded-xl bg-muted px-3 py-2.5 text-sm flex gap-2"><ArrowDown className="w-4 h-4 mt-0.5" /><span>Nomor 001–{nomor(hasil.jumlah_scan)} diberikan sesuai urutan scan, dari belakang ke depan.</span></div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <h2 className="font-semibold mb-3">Laci {laci.slice(1)}, sesudah</h2>
              <StripLaci isi={isiBaru} tinggi={44} />
              <div className="flex gap-2 mt-4">
                <Button onClick={() => navigate(`/arsip/laci/${laci}`)}>Buka laci</Button>
                <Button variant="outline" onClick={() => { setHasil(null); setSp({}); }}>Laci lain</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // --------------------------------------------------------- sedang scan
  const sisaLama = isiLama.filter((m) => !urutan.some((x) => x.id === m.id));
  return (
    <MainLayout>
      <button type="button" onClick={() => navigate('/arsip')} className="text-sm text-muted-foreground flex items-center gap-1 mb-2 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Peta kabinet
      </button>
      <PageHeader
        title={`Rapikan laci ${laci.slice(1)}`}
        description="Scan map satu per satu, mulai dari yang paling BELAKANG laci."
        actions={<Button variant="outline" onClick={() => { setUrutan([]); setSp({}); }}>Ganti laci</Button>}
      />
      <div className="grid lg:grid-cols-[1fr_1fr] gap-4 items-start">
        <div className="space-y-3">
          <PemindaiQR onHasil={scan} petunjuk="Scan map berikutnya" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={kata} onChange={(e) => setKata(e.target.value)} placeholder="Map belum berlabel? Ketik nama…" className="h-11 pl-9" />
          </div>
          {saran.map((m) => (
            <button key={m.id} type="button" onClick={() => tambah(m)} className="w-full flex items-center gap-3 rounded-xl border px-3 py-2 text-left hover:bg-muted/50">
              <span className="min-w-0 flex-1"><span className="block font-semibold truncate">{m.nama_debitur}</span><span className="block text-[11px] text-muted-foreground font-mono">{m.nomor_pk || m.kode_map}</span></span>
              <span className={cn('text-[11px] font-mono rounded px-1.5 py-0.5', m.kode_laci === laci ? 'bg-primary/10 text-primary' : 'bg-warning/20')}>{m.kode_laci.slice(1)} #{nomor(m.nomor_urut)}</span>
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold">{urutan.length}</span>
              <span className="text-muted-foreground text-sm">dari {isiLama.length} map tercatat discan</span>
            </div>
            <div className="h-2 rounded-full bg-muted mt-2 overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${isiLama.length ? Math.min(100, (urutan.length / isiLama.length) * 100) : 0}%` }} />
            </div>
            <div className="mt-3 space-y-1.5 max-h-[46vh] overflow-y-auto">
              {[...urutan].reverse().map((m) => {
                const posBaru = urutan.indexOf(m) + 1;
                const salah = m.kode_laci !== laci;
                return (
                  <div key={m.id} className={cn('flex items-center gap-3 rounded-xl border px-3 py-2', salah ? 'border-warning/60 bg-warning/10' : posBaru === urutan.length ? 'border-secondary/60 bg-secondary/5' : '')}>
                    <span className={cn('font-mono text-xs font-bold rounded-md px-1.5 py-1', posBaru === urutan.length ? 'bg-secondary text-white' : 'bg-primary text-primary-foreground')}>{nomor(posBaru)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold truncate">{m.nama_debitur}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {salah ? `tercatat di laci ${m.kode_laci.slice(1)} — akan dipindah ke sini` : `dulu #${nomor(m.nomor_urut)} · QR tetap`}
                      </span>
                    </span>
                    <CheckCircle2 className={cn('w-4 h-4', salah ? 'text-warning' : 'text-success')} />
                  </div>
                );
              })}
              {urutan.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Belum ada map discan. Mulai dari map paling belakang.</p>}
            </div>
            <div className="mt-3 rounded-xl bg-secondary/10 px-3 py-2 text-xs flex gap-2"><Sparkles className="w-3.5 h-3.5 mt-0.5 text-secondary" />Nomor slot diberikan otomatis sesuai urutan scan. Map yang sedang dipinjam tidak perlu discan.</div>
            {sisaLama.length > 0 && urutan.length > 0 && (
              <p className="mt-2 text-[11px] text-muted-foreground">Belum discan: {sisaLama.slice(0, 6).map((m) => m.nama_debitur).join(', ')}{sisaLama.length > 6 ? `, dan ${sisaLama.length - 6} lainnya` : ''}</p>
            )}
            <div className="grid grid-cols-[auto_1fr] gap-2 mt-3">
              <Button variant="outline" className="h-11" onClick={() => setUrutan((u) => u.slice(0, -1))} disabled={!urutan.length}><Undo className="w-4 h-4" /></Button>
              <Button className="h-11" onClick={selesai} disabled={!urutan.length || rapikan.isPending}><ClipboardCheck className="w-4 h-4 mr-2" />Selesai merapikan</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default OpnamePage;
