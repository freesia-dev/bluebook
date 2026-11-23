import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { fmtIDR } from '@/lib/mlf-utils';
import {
  riwayatDebitur, samakanNama, useTautkanDebitur,
  type BerkasArsip, type DebiturArsip, type RekeningMaster,
} from '@/hooks/use-arsip';
import { FolderOpen, Link2, Unlink, Search } from 'lucide-react';
import { toast } from 'sonner';

const tglPendek = (s: string | null | undefined) => {
  if (!s) return 'tanggal akad tidak diketahui';
  const [y, m, d] = s.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
};

const nomor = (n: number) => String(n).padStart(3, '0');

const Lencana: React.FC<{ status: string }> = ({ status }) =>
  status === 'aktif' ? (
    <Badge className="bg-success/15 text-success hover:bg-success/15 border-0">Aktif</Badge>
  ) : status === 'lunas' ? (
    <Badge className="bg-info/15 text-info hover:bg-info/15 border-0">Lunas</Badge>
  ) : (
    <Badge variant="secondary">Belum pasti</Badge>
  );

interface Props {
  debitur: DebiturArsip | null;
  onClose: () => void;
  berkas: BerkasArsip[];
  master: RekeningMaster[];
  semuaDebitur: DebiturArsip[];
}

/**
 * Riwayat satu debitur: semua map fisiknya (aktif maupun lunas, termasuk yang
 * sudah tidak ada di MLF) ditambah kredit di MLF yang belum punya map,
 * diurutkan dari akad paling lama. Dari sini map bisa dipisahkan kalau ternyata
 * orangnya beda, atau debitur lain digabungkan kalau ternyata orangnya sama.
 */
export const RiwayatDebiturDialog: React.FC<Props> = ({ debitur, onClose, berkas, master, semuaDebitur }) => {
  const tautkan = useTautkanDebitur();
  const [cariGabung, setCariGabung] = useState('');

  const baris = useMemo(
    () => (debitur ? riwayatDebitur(debitur, berkas, master) : []),
    [debitur, berkas, master],
  );

  const kandidatGabung = useMemo(() => {
    if (!debitur) return [];
    const q = samakanNama(cariGabung);
    if (q.length < 3) return [];
    return semuaDebitur
      .filter((d) => d.id !== debitur.id && d.nama_kunci.includes(q))
      .map((d) => ({ d, jumlah: berkas.filter((b) => b.debitur_id === d.id).length }))
      .filter((x) => x.jumlah > 0)
      .slice(0, 6);
  }, [cariGabung, semuaDebitur, berkas, debitur]);

  if (!debitur) return null;

  const jumlahMap = baris.filter((b) => b.map).length;
  const aktif = baris.filter((b) => b.status === 'aktif').length;

  const pisahkan = async (m: BerkasArsip) => {
    try {
      await tautkan.mutateAsync({ berkas: m, debitur: { baru: m.nama_debitur } });
      toast.success(`${m.nama_debitur} dipisahkan jadi debitur sendiri`);
    } catch (e) {
      toast.error((e as Error)?.message || 'Gagal memisahkan');
    }
  };

  const gabungkan = async (lain: DebiturArsip) => {
    const maps = berkas.filter((b) => b.debitur_id === lain.id);
    try {
      for (const m of maps) {
        await tautkan.mutateAsync({ berkas: m, debitur: { id: debitur.id } });
      }
      toast.success(`${maps.length} map milik ${lain.nama} digabungkan ke riwayat ini`);
      setCariGabung('');
    } catch (e) {
      toast.error((e as Error)?.message || 'Gagal menggabungkan');
    }
  };

  return (
    <Dialog open={!!debitur} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl w-[calc(100vw-1.5rem)] max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {debitur.nama}
            <span className="font-mono text-xs font-normal text-muted-foreground">{debitur.kode}</span>
          </DialogTitle>
          <DialogDescription>
            {baris.length} kredit tercatat · {jumlahMap} map fisik · {aktif} masih aktif
          </DialogDescription>
        </DialogHeader>

        <ol className="relative border-l-2 border-muted ml-2 space-y-3 mt-2">
          {baris.map((b) => (
            <li key={b.kunci} className="ml-4">
              <span
                className={cn(
                  'absolute -left-[7px] mt-1.5 h-3 w-3 rounded-full border-2 border-background',
                  b.status === 'aktif' ? 'bg-success' : b.status === 'lunas' ? 'bg-info' : 'bg-muted-foreground/50',
                )}
              />
              <div className="rounded-xl border p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold">Akad {tglPendek(b.tanggal_akad)}</span>
                  <Lencana status={b.status} />
                  {b.plafon ? <span className="text-xs text-muted-foreground">{fmtIDR(b.plafon)}</span> : null}
                </div>
                <div className="text-xs font-mono text-muted-foreground mt-1">
                  {b.nomor_pk || (b.no_rekening ? `Rek ${b.no_rekening}` : 'tanpa nomor PK')}
                </div>
                {b.map && samakanNama(b.map.nama_debitur) !== debitur.nama_kunci && (
                  <div className="text-xs text-muted-foreground mt-0.5">Di sampul map: {b.map.nama_debitur}</div>
                )}
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {b.map ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 text-xs rounded-lg bg-muted px-2 py-1 whitespace-nowrap">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <b className="font-mono">{b.map.kode_laci} · {nomor(b.map.nomor_urut)}</b>
                        <span className="font-mono text-muted-foreground">{b.map.kode_map}</span>
                      </span>
                      {jumlahMap > 1 && (
                        <Button
                          variant="ghost" size="sm" className="h-7 ml-auto text-xs text-muted-foreground"
                          disabled={tautkan.isPending}
                          onClick={() => b.map && pisahkan(b.map)}
                        >
                          <Unlink className="w-3.5 h-3.5 mr-1" /> Bukan orang yang sama
                        </Button>
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-warning-foreground bg-warning/15 rounded-lg px-2 py-1">
                      Belum ada map di laci
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-4 rounded-xl border border-dashed p-3 space-y-2">
          <div className="text-sm font-semibold flex items-center gap-2">
            <Link2 className="w-4 h-4" /> Gabungkan map lain ke riwayat ini
          </div>
          <p className="text-xs text-muted-foreground">
            Untuk map lama yang namanya ditulis berbeda (misalnya pakai gelar atau nama panggilan) tapi orangnya sama.
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={cariGabung}
              onChange={(e) => setCariGabung(e.target.value)}
              placeholder="Ketik nama di map lain…"
              className="h-10 pl-9"
            />
          </div>
          {kandidatGabung.map(({ d, jumlah }) => (
            <div key={d.id} className="flex items-center gap-2 text-sm">
              <span className="flex-1 truncate">{d.nama}</span>
              <span className="text-xs text-muted-foreground">{jumlah} map</span>
              <Button size="sm" variant="outline" className="h-8" disabled={tautkan.isPending} onClick={() => gabungkan(d)}>
                Gabungkan
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RiwayatDebiturDialog;
