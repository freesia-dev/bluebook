import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DetailMapDialog } from '@/components/arsip/DetailMap';
import { useArsipKonteks, type MapLengkap } from '@/hooks/use-arsip-konteks';
import { KembaliDialog, PinjamDialog } from '@/components/arsip/DialogAksi';
import { CariArsip, usePintasanCari } from '@/components/arsip/CariArsip';
import { nomor, selisihHari, tglHari, tglPanjang } from '@/lib/arsip';
import { ArrowUpRight, ScanLine, Search, Undo2, AlarmClock, Clock } from 'lucide-react';

const PeminjamanPage: React.FC = () => {
  const k = useArsipKonteks();
  const [detail, setDetail] = useState<string | null>(null);
  const navigate = useNavigate();
  const [tab, setTab] = useState<'dipinjam' | 'riwayat'>('dipinjam');
  const [pinjam, setPinjam] = useState<MapLengkap | null>(null);
  const [kembali, setKembali] = useState<MapLengkap | null>(null);
  const [cari, setCari] = useState(false);
  usePintasanCari(setCari);

  const terbuka = useMemo(
    () => k.maps.filter((m) => m.pinjam).sort((a, b) => a.pinjam!.tenggat.localeCompare(b.pinjam!.tenggat)),
    [k.maps],
  );
  const riwayat = useMemo(() => k.pinjam.filter((p) => p.kembali_at).slice(0, 200), [k.pinjam]);
  const terlambat = terbuka.filter((m) => m.fisik === 'terlambat').length;
  const besok = terbuka.filter((m) => selisihHari(m.pinjam!.tenggat) === 1).length;

  return (
    <MainLayout>
      <PageHeader
        title="Peminjaman"
        description={`${terbuka.length} map sedang dipinjam · ${terlambat} lewat tenggat · ${besok} jatuh tenggat besok`}
        actions={
          <>
            <Button variant="outline" onClick={() => setCari(true)}><Search className="w-4 h-4 mr-2" />Pinjam lewat cari</Button>
            <Button onClick={() => navigate('/arsip/pindai')}><ScanLine className="w-4 h-4 mr-2" />Pindai label</Button>
          </>
        }
      />
      <div className="flex rounded-lg border overflow-hidden w-fit mb-3">
        {(['dipinjam', 'riwayat'] as const).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)}
            className={cn('px-4 h-10 text-sm font-semibold', tab === t ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
            {t === 'dipinjam' ? `Sedang dipinjam (${terbuka.length})` : 'Riwayat'}
          </button>
        ))}
      </div>

      {tab === 'dipinjam' ? (
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {terbuka.length === 0 && <Card className="sm:col-span-2 xl:col-span-3"><CardContent className="p-8 text-center text-sm text-muted-foreground">Tidak ada map yang sedang dipinjam.</CardContent></Card>}
          {terbuka.map((m) => {
            const sisa = selisihHari(m.pinjam!.tenggat);
            return (
              <Card key={m.id} className={cn(sisa < 0 && 'border-destructive/50')}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setDetail(m.id)}>
                      <div className="font-display font-bold truncate">{m.nama_debitur}</div>
                      <div className="text-xs text-muted-foreground font-mono">Laci {m.kode_laci.slice(1)} · #{nomor(m.nomor_urut)}</div>
                    </button>
                    <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold flex items-center gap-1',
                      sisa < 0 ? 'bg-destructive/15 text-destructive' : sisa <= 1 ? 'bg-warning/20 text-warning-foreground' : 'bg-success/15 text-success')}>
                      {sisa < 0 ? <AlarmClock className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                      {sisa < 0 ? `lewat ${-sisa} hari` : sisa === 0 ? 'tenggat hari ini' : `tenggat ${sisa} hari`}
                    </span>
                  </div>
                  <div className="mt-3 text-sm">
                    <div className="flex justify-between"><span className="text-muted-foreground">Dipegang</span><b>{m.pinjam!.peminjam}</b></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Keperluan</span><span>{m.pinjam!.keperluan || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Sejak · tenggat</span><span>{tglPanjang(m.pinjam!.dipinjam_at)} · {tglHari(m.pinjam!.tenggat)}</span></div>
                  </div>
                  <Button className="w-full mt-3 h-10 bg-success hover:bg-success/90 text-white" onClick={() => setKembali(m)}><Undo2 className="w-4 h-4 mr-2" />Kembalikan</Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {riwayat.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Belum ada riwayat peminjaman.</p>}
            {riwayat.map((p) => {
              const m = k.perId.get(p.berkas_id);
              const telat = p.kembali_at && p.kembali_at.slice(0, 10) > p.tenggat;
              return (
                <button key={p.id} type="button" onClick={() => m && setDetail(m.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40">
                  <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><ArrowUpRight className="w-4 h-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{p.peminjam} · {m?.nama_debitur ?? 'map terhapus'}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.keperluan || '—'} · {tglPanjang(p.dipinjam_at)} → {tglPanjang(p.kembali_at)}
                      {p.kondisi === 'kurang' && ' · isi kurang'}{p.catatan_kembali && ` · ${p.catatan_kembali}`}
                    </span>
                  </span>
                  {telat && <span className="text-[11px] rounded-full bg-destructive/15 text-destructive px-2 py-0.5 font-semibold">terlambat</span>}
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}

      <PinjamDialog map={pinjam} onClose={() => setPinjam(null)} namaTerakhir={[...new Set(k.pinjam.map((p) => p.peminjam))].slice(0, 20)} />
      <KembaliDialog map={kembali} isiLaci={kembali ? k.perLaci.get(kembali.kode_laci) ?? [] : []} onClose={() => setKembali(null)} />
      <CariArsip buka={cari} onBuka={setCari} k={k} onPinjam={setPinjam} />
      <DetailMapDialog id={detail} onClose={() => setDetail(null)} />
    </MainLayout>
  );
};

export default PeminjamanPage;
