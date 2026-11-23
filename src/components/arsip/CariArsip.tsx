import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { samakanNama } from '@/hooks/use-arsip';
import type { ArsipKonteks, MapLengkap } from '@/hooks/use-arsip-konteks';
import { namaKabinet, nomor, rupiahPendek, tglPanjang } from '@/lib/arsip';
import { LencanaKredit, LencanaFisik, LencanaJenis } from './Lencana';
import { StripLaci } from './Kabinet';
import { FolderOpen, Search, MapPin, Link2, ChevronRight } from 'lucide-react';

type Saring = 'semua' | 'aktif' | 'lunas' | 'konsumtif' | 'produktif' | 'jaminan';

/**
 * Pencarian cepat seluruh arsip (Ctrl+K). Hasil di kiri, posisi map di laci
 * beserta tetangganya di kanan. Enter membuka laci, P meminjam.
 */
export const CariArsip: React.FC<{
  buka: boolean;
  onBuka: (b: boolean) => void;
  k: ArsipKonteks;
  onPinjam?: (m: MapLengkap) => void;
}> = ({ buka, onBuka, k, onPinjam }) => {
  const navigate = useNavigate();
  const [kata, setKata] = useState('');
  const [saring, setSaring] = useState<Saring>('semua');
  const [aktif, setAktif] = useState(0);

  useEffect(() => { if (buka) { setKata(''); setAktif(0); } }, [buka]);

  const hasil = useMemo(() => {
    const q = kata.trim().toUpperCase();
    if (q.length < 2) return { tepat: [] as MapLengkap[], mirip: [] as MapLengkap[] };
    const qn = samakanNama(q);
    const lolos = (m: MapLengkap) =>
      saring === 'semua' ? true
        : saring === 'aktif' ? m.kredit === 'aktif'
          : saring === 'lunas' ? m.kredit === 'lunas' || m.kredit === 'topup'
            : m.jenis_laci === saring;
    const nilai = (m: MapLengkap) => {
      const n = samakanNama(m.nama_debitur);
      const pk = (m.nomor_pk || '').toUpperCase();
      if (m.kode_map === q || m.kode_map.endsWith(q)) return 0;
      if (n.startsWith(qn)) return 1;
      if (pk.includes(q) || (m.no_rekening || '').includes(q)) return 2;
      if (n.includes(qn)) return 3;
      return 99;
    };
    const semua = k.maps
      .filter(lolos)
      .map((m) => ({ m, n: nilai(m) }))
      .filter((x) => x.n < 99)
      .sort((a, b) => a.n - b.n || (b.m.tanggal_akad || '').localeCompare(a.m.tanggal_akad || ''));
    return {
      tepat: semua.filter((x) => x.n <= 2).map((x) => x.m).slice(0, 12),
      mirip: semua.filter((x) => x.n > 2).map((x) => x.m).slice(0, 12),
    };
  }, [kata, saring, k.maps]);

  const daftar = [...hasil.tepat, ...hasil.mirip];
  const pilih = daftar[Math.min(aktif, daftar.length - 1)] ?? null;
  const isiLaci = pilih ? k.perLaci.get(pilih.kode_laci) ?? [] : [];
  const tetangga = pilih ? isiLaci.filter((m) => Math.abs(m.nomor_urut - pilih.nomor_urut) <= 1) : [];

  const bukaLaci = (m: MapLengkap) => {
    onBuka(false);
    navigate(`/arsip/laci/${m.kode_laci}?map=${m.id}`);
  };

  const tombol = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setAktif((a) => Math.min(a + 1, daftar.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setAktif((a) => Math.max(a - 1, 0)); }
    if (e.key === 'Enter' && pilih) { e.preventDefault(); bukaLaci(pilih); }
  };

  const baris = (m: MapLengkap, i: number) => {
    const idx = daftar.indexOf(m);
    return (
      <button
        key={m.id}
        type="button"
        onMouseEnter={() => setAktif(idx)}
        onClick={() => bukaLaci(m)}
        className={cn(
          'w-full flex items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
          idx === aktif ? 'border-primary/50 bg-primary/5 ring-2 ring-primary/15' : 'border-transparent hover:bg-muted/60',
        )}
      >
        <span className={cn('mt-0.5 w-9 h-9 shrink-0 rounded-lg flex items-center justify-center', idx === aktif ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary')}>
          <FolderOpen className="w-4 h-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold">{m.nama_debitur}</span>
            <LencanaKredit status={m.kredit} />
            {m.fisik !== 'tersimpan' && <LencanaFisik status={m.fisik} />}
          </span>
          <span className="block text-xs text-muted-foreground mt-0.5 truncate">
            {m.tanggal_akad ? tglPanjang(m.tanggal_akad) : 'akad ?'} · {m.nomor_pk || m.kode_map}
          </span>
          {m.kredit === 'topup' && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-secondary/15 px-2 py-0.5 text-[11px] text-secondary-foreground">
              <Link2 className="w-3 h-3" /> Sudah ter-top up, tertaut otomatis ke akad barunya
            </span>
          )}
        </span>
        <span className="text-right shrink-0">
          <span className="block text-sm font-bold text-primary">Laci {m.kode_laci.slice(1)}</span>
          <span className="block text-[11px] font-mono text-muted-foreground">Map {nomor(m.nomor_urut)}</span>
        </span>
        {i < 0 && null}
      </button>
    );
  };

  return (
    <Dialog open={buka} onOpenChange={onBuka}>
      <DialogContent className="max-w-4xl w-[calc(100vw-1.5rem)] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Cari arsip</DialogTitle>
        <div className="flex items-center gap-3 border-b px-4 py-3">
          <Search className="w-5 h-5 text-muted-foreground" />
          <input
            autoFocus
            value={kata}
            onChange={(e) => { setKata(e.target.value); setAktif(0); }}
            onKeyDown={tombol}
            placeholder="Nama debitur, nomor PK, rekening, atau kode map…"
            className="flex-1 bg-transparent text-lg font-semibold outline-none placeholder:text-muted-foreground/60 placeholder:font-normal"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-2">
          {(['semua', 'aktif', 'lunas', 'konsumtif', 'produktif', 'jaminan'] as Saring[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSaring(s)}
              className={cn('h-7 px-3 rounded-full text-xs font-semibold capitalize', saring === s ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70')}
            >
              {s}
            </button>
          ))}
          <span className="ml-auto text-xs text-muted-foreground">{daftar.length} hasil</span>
        </div>

        <div className="grid md:grid-cols-[1.3fr_1fr] max-h-[62vh]">
          <div className="overflow-y-auto p-3 space-y-1">
            {kata.trim().length < 2 && (
              <p className="py-10 text-center text-sm text-muted-foreground">Ketik minimal dua huruf. {k.maps.length} map tersimpan di arsip.</p>
            )}
            {hasil.tepat.length > 0 && <div className="px-1 pt-1 text-[10px] font-bold tracking-[0.2em] text-muted-foreground">DEBITUR</div>}
            {hasil.tepat.map(baris)}
            {hasil.mirip.length > 0 && <div className="px-1 pt-3 text-[10px] font-bold tracking-[0.2em] text-muted-foreground">NAMA MIRIP</div>}
            {hasil.mirip.map(baris)}
            {kata.trim().length >= 2 && daftar.length === 0 && (
              <p className="py-10 text-center text-sm text-muted-foreground">Tidak ada map yang cocok.</p>
            )}
          </div>

          <div className="hidden md:block border-l bg-muted/30 p-4 overflow-y-auto">
            {pilih ? (
              <>
                <div className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">POSISI DI LACI {pilih.kode_laci.slice(1)}</div>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="font-mono text-5xl font-bold text-primary">{pilih.kode_laci.slice(1)}</span>
                  <LencanaJenis jenis={pilih.jenis_laci} />
                </div>
                <div className="mt-3"><StripLaci isi={isiLaci} pilih={pilih.id} tinggi={34} /></div>
                <div className="mt-3 space-y-1.5">
                  {tetangga.map((m) => (
                    <div key={m.id} className={cn('rounded-lg border px-3 py-1.5', m.id === pilih.id ? 'border-secondary bg-secondary/10' : 'bg-background')}>
                      <div className="text-[10px] font-mono text-muted-foreground">
                        {nomor(m.nomor_urut)} · {m.id === pilih.id ? 'yang dicari' : m.nomor_urut < pilih.nomor_urut ? 'di belakangnya' : 'di depannya'}
                      </div>
                      <div className="text-sm font-semibold truncate">{m.nama_debitur}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 text-xs space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground">Plafon</span><b>{rupiahPendek(pilih.plafon ?? pilih.rekening?.plafon)}</b></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Kode map</span><b className="font-mono">{pilih.kode_map}</b></div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button type="button" onClick={() => bukaLaci(pilih)} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold">Buka laci</button>
                  {onPinjam && pilih.fisik === 'tersimpan' && (
                    <button type="button" onClick={() => { onBuka(false); onPinjam(pilih); }} className="h-9 px-3 rounded-lg border text-sm font-semibold">Pinjam</button>
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Posisi map muncul di sini.</p>
            )}
          </div>
        </div>
        {pilih && (
          <div className="flex items-center gap-1.5 border-t bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5" /> {namaKabinet(pilih.kode_laci)} <ChevronRight className="w-3 h-3" /> Laci {pilih.kode_laci.slice(1)}
            <ChevronRight className="w-3 h-3" /> <b className="text-secondary-foreground">Map {nomor(pilih.nomor_urut)}</b>
            <span className="ml-auto hidden sm:inline">↑↓ pilih · Enter buka laci</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

/** Ctrl+K / Cmd+K membuka pencarian arsip. */
export const usePintasanCari = (setBuka: (b: boolean) => void) => {
  useEffect(() => {
    const f = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        e.stopPropagation();
        setBuka(true);
      }
    };
    window.addEventListener('keydown', f, true);
    return () => window.removeEventListener('keydown', f, true);
  }, [setBuka]);
};
