import React, { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useKembalikan, usePinjamkan, usePerpanjang, useSerahkanJaminan } from '@/hooks/use-arsip';
import type { MapLengkap } from '@/hooks/use-arsip-konteks';
import {
  KEPERLUAN, isoHari, nomor, selisihHari, tambahHariKerja, tglHari, tglPanjang,
} from '@/lib/arsip';
import { LencanaKredit } from './Lencana';
import { ArrowDown, ArrowUpRight, CheckCircle2, MapPin, Minus, Plus, Undo2, User, HandHeart } from 'lucide-react';
import { toast } from 'sonner';

const KartuMap: React.FC<{ map: MapLengkap }> = ({ map }) => (
  <div className="rounded-xl border p-3">
    <div className="font-display font-bold text-primary">{map.nama_debitur}</div>
    <div className="text-[11px] font-mono text-muted-foreground mt-0.5">{map.nomor_pk || map.kode_map}</div>
    <div className="mt-2 flex flex-wrap gap-1.5">
      <LencanaKredit status={map.kredit} />
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold">
        <MapPin className="w-3 h-3" /> Laci {map.kode_laci} · #{nomor(map.nomor_urut)}
      </span>
    </div>
  </div>
);

/* ================================================================ pinjam */

export const PinjamDialog: React.FC<{
  map: MapLengkap | null;
  onClose: () => void;
  namaTerakhir?: string[];
}> = ({ map, onClose, namaTerakhir = [] }) => {
  const { userName } = useAuth();
  const pinjamkan = usePinjamkan();
  const [peminjam, setPeminjam] = useState('');
  const [keperluan, setKeperluan] = useState(KEPERLUAN[0]);
  const [hari, setHari] = useState(3);
  const [selesai, setSelesai] = useState(false);

  useEffect(() => {
    if (map) { setPeminjam(userName || ''); setKeperluan(KEPERLUAN[0]); setHari(3); setSelesai(false); }
  }, [map, userName]);

  const tenggat = useMemo(() => isoHari(tambahHariKerja(new Date(), hari)), [hari]);
  if (!map) return null;

  const simpan = async () => {
    try {
      await pinjamkan.mutateAsync({ berkas: map, peminjam: peminjam.trim(), keperluan, tenggat });
      setSelesai(true);
    } catch (e) {
      toast.error((e as Error)?.message || 'Gagal mencatat peminjaman');
    }
  };

  return (
    <Dialog open={!!map} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)]">
        {selesai ? (
          <div className="text-center py-2">
            <div className="mx-auto w-20 h-20 rounded-full bg-success/15 flex items-center justify-center">
              <CheckCircle2 className="w-11 h-11 text-success" />
            </div>
            <h2 className="font-display text-2xl font-bold mt-3">Tercatat</h2>
            <p className="text-sm text-muted-foreground mt-1">{map.nama_debitur} kini dipegang <b className="text-foreground">{peminjam}</b></p>
            <div className="mt-4 rounded-xl border divide-y text-sm text-left">
              <div className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Keperluan</span><b>{keperluan}</b></div>
              <div className="flex justify-between px-3 py-2"><span className="text-muted-foreground">Tenggat</span><b>{tglHari(tenggat)}</b></div>
            </div>
            <div className="mt-3 rounded-xl bg-secondary/15 px-3 py-2 text-xs text-left">
              Slot <b>#{nomor(map.nomor_urut)}</b> di laci {map.kode_laci} ditandai kosong. Jangan diisi map lain.
            </div>
            <Button className="mt-4 w-full h-11" variant="outline" onClick={onClose}>Selesai</Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Pinjam map</DialogTitle>
              <DialogDescription>Satu map hanya bisa dipegang satu orang.</DialogDescription>
            </DialogHeader>
            <KartuMap map={map} />
            <div className="space-y-1.5">
              <Label>Peminjam</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={peminjam} onChange={(e) => setPeminjam(e.target.value)} list="ab-peminjam" className="h-11 pl-9" />
                <datalist id="ab-peminjam">{namaTerakhir.map((n) => <option key={n} value={n} />)}</datalist>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Keperluan</Label>
              <div className="flex flex-wrap gap-1.5">
                {KEPERLUAN.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKeperluan(k)}
                    className={cn('h-9 px-3 rounded-full border text-xs font-semibold', keperluan === k ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Kembali paling lambat</Label>
              <div className="flex items-center gap-2 rounded-xl border p-1.5">
                <Button size="icon" variant="ghost" onClick={() => setHari(Math.max(1, hari - 1))}><Minus className="w-4 h-4" /></Button>
                <div className="font-semibold w-28 text-center whitespace-nowrap">{hari} hari kerja</div>
                <Button size="icon" variant="ghost" onClick={() => setHari(Math.min(20, hari + 1))}><Plus className="w-4 h-4" /></Button>
                <span className="ml-auto pr-2 text-sm font-semibold text-secondary-foreground">{tglHari(tenggat)}</span>
              </div>
            </div>
            <Button className="w-full h-11" onClick={simpan} disabled={!peminjam.trim() || pinjamkan.isPending}>
              <ArrowUpRight className="w-4 h-4 mr-2" /> Catat peminjaman
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* ================================================================ kembali */

export const KembaliDialog: React.FC<{
  map: MapLengkap | null;
  isiLaci: MapLengkap[];
  onClose: () => void;
}> = ({ map, isiLaci, onClose }) => {
  const kembalikan = useKembalikan();
  const perpanjang = usePerpanjang();
  const [kondisi, setKondisi] = useState<'lengkap' | 'kurang'>('lengkap');
  const [catatan, setCatatan] = useState('');

  useEffect(() => { if (map) { setKondisi('lengkap'); setCatatan(''); } }, [map]);
  if (!map || !map.pinjam) return null;
  const p = map.pinjam;
  const lewat = -selisihHari(p.tenggat);
  const lama = Math.max(0, Math.round((Date.now() - new Date(p.dipinjam_at).getTime()) / 86_400_000));
  const sebelum = isiLaci.filter((m) => m.nomor_urut < map.nomor_urut).slice(-1)[0];
  const sesudah = isiLaci.find((m) => m.nomor_urut > map.nomor_urut);

  const simpan = async () => {
    try {
      await kembalikan.mutateAsync({ pinjam: p, kondisi, catatan });
      toast.success(`${map.nama_debitur} kembali ke laci ${map.kode_laci} #${nomor(map.nomor_urut)}`);
      onClose();
    } catch (e) {
      toast.error((e as Error)?.message || 'Gagal mencatat pengembalian');
    }
  };

  const tambah = async () => {
    try {
      const baru = isoHari(tambahHariKerja(new Date(`${p.tenggat}T00:00:00`), 3));
      await perpanjang.mutateAsync({ pinjam: p, tenggat: baru });
      toast.success(`Tenggat diperpanjang sampai ${tglHari(baru)}`);
      onClose();
    } catch (e) {
      toast.error((e as Error)?.message || 'Gagal memperpanjang');
    }
  };

  return (
    <Dialog open={!!map} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Kembalikan map</DialogTitle>
          <DialogDescription>
            Dipegang {p.peminjam} sejak {lama === 0 ? 'hari ini' : `${lama} hari`} · {p.keperluan || 'tanpa keterangan'}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-xl border p-3">
          <div className="font-display font-bold text-primary">{map.nama_debitur}</div>
          <div className={cn('mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold', lewat > 0 ? 'bg-destructive/15 text-destructive' : 'bg-success/15 text-success')}>
            {lewat > 0 ? `Lewat tenggat ${lewat} hari` : 'Tepat waktu'}
          </div>
        </div>

        <div>
          <Label className="text-xs text-muted-foreground">Taruh di sini</Label>
          <div className="mt-1 rounded-xl border p-3 space-y-1.5">
            <div className="font-mono text-3xl font-bold text-primary">{map.kode_laci.slice(1)} <span className="text-base text-secondary-foreground">#{nomor(map.nomor_urut)}</span></div>
            <div className="rounded-lg bg-muted px-3 py-1.5 text-xs">
              <span className="font-mono text-muted-foreground">{sebelum ? `#${nomor(sebelum.nomor_urut)} · lebih ke belakang` : 'paling belakang laci'}</span>
              {sebelum && <div className="font-semibold">{sebelum.nama_debitur}</div>}
            </div>
            <div className="rounded-lg border-2 border-dashed border-secondary bg-secondary/10 py-1.5 text-center text-xs font-semibold text-secondary-foreground flex items-center justify-center gap-1">
              <ArrowDown className="w-3.5 h-3.5" /> celah ini
            </div>
            <div className="rounded-lg bg-muted px-3 py-1.5 text-xs">
              <span className="font-mono text-muted-foreground">{sesudah ? `#${nomor(sesudah.nomor_urut)} · lebih ke depan` : 'paling depan laci'}</span>
              {sesudah && <div className="font-semibold">{sesudah.nama_debitur}</div>}
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Isi map masih lengkap?</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['lengkap', 'kurang'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKondisi(k)}
                className={cn('h-10 rounded-xl border text-sm font-semibold', kondisi === k ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted')}
              >
                {k === 'lengkap' ? 'Lengkap' : 'Ada yang kurang'}
              </button>
            ))}
          </div>
          <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan kondisi map (opsional)" rows={2} />
        </div>

        <Button className="w-full h-11 bg-success hover:bg-success/90 text-white" onClick={simpan} disabled={kembalikan.isPending}>
          <Undo2 className="w-4 h-4 mr-2" /> Sudah kutaruh
        </Button>
        {!p.diperpanjang && (
          <Button variant="ghost" className="w-full" onClick={tambah} disabled={perpanjang.isPending}>
            Belum, perpanjang 3 hari kerja (sekali saja)
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
};

/* ================================================================ serah-terima jaminan */

export const SerahDialog: React.FC<{ map: MapLengkap | null; onClose: () => void }> = ({ map, onClose }) => {
  const serahkan = useSerahkanJaminan();
  const [kepada, setKepada] = useState('');
  const [catatan, setCatatan] = useState('');
  useEffect(() => { if (map) { setKepada(map.nama_debitur); setCatatan(''); } }, [map]);
  if (!map) return null;

  const simpan = async () => {
    try {
      await serahkan.mutateAsync({ berkas: map, kepada: kepada.trim(), catatan });
      toast.success(`Jaminan ${map.nama_debitur} tercatat sudah diserahkan`);
      onClose();
    } catch (e) {
      toast.error((e as Error)?.message || 'Gagal mencatat serah-terima');
    }
  };

  return (
    <Dialog open={!!map} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)]">
        <DialogHeader>
          <DialogTitle>Serahkan jaminan</DialogTitle>
          <DialogDescription>
            Dicatat di Bluebook tanpa berita acara cetak. Map keluar dari laci dan slotnya bisa dipakai lagi setelah laci dirapikan.
          </DialogDescription>
        </DialogHeader>
        <KartuMap map={map} />
        {map.kredit !== 'lunas' && map.kredit !== 'topup' && (
          <div className="rounded-xl bg-destructive/10 text-destructive text-xs px-3 py-2">
            Menurut MLF terakhir kredit ini <b>belum lunas</b>. Pastikan dulu sebelum menyerahkan jaminan.
          </div>
        )}
        <div className="space-y-1.5">
          <Label>Diterima oleh</Label>
          <Input value={kepada} onChange={(e) => setKepada(e.target.value)} className="h-11" />
        </div>
        <Textarea value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="Catatan (mis. diwakilkan, nomor KTP penerima disimpan di berkas)" rows={2} />
        <Button className="w-full h-11" onClick={simpan} disabled={!kepada.trim() || serahkan.isPending}>
          <HandHeart className="w-4 h-4 mr-2" /> Catat serah-terima
        </Button>
        <p className="text-[11px] text-muted-foreground text-center">Tercatat {tglPanjang(new Date().toISOString())}</p>
      </DialogContent>
    </Dialog>
  );
};
