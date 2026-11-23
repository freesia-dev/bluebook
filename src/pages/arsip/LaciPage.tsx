import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useArsipKonteks, type MapLengkap } from '@/hooks/use-arsip-konteks';
import { LaciTerbuka, StripLaci } from '@/components/arsip/Kabinet';
import { LencanaFisik, LencanaJenis, LencanaKredit } from '@/components/arsip/Lencana';
import { KembaliDialog, PinjamDialog } from '@/components/arsip/DialogAksi';
import { CariArsip, usePintasanCari } from '@/components/arsip/CariArsip';
import { KAPASITAS_LACI, namaKabinet, nomor, rupiahPendek, tglPanjang, urai } from '@/lib/arsip';
import { ArrowLeft, ArrowUpRight, ClipboardCheck, FileText, Printer, Sparkles, Undo2, Layers, Search, GitBranch } from 'lucide-react';

const LaciPage: React.FC = () => {
  const { kode = '' } = useParams();
  const [sp, setSp] = useSearchParams();
  const navigate = useNavigate();
  const k = useArsipKonteks();
  const [pinjam, setPinjam] = useState<MapLengkap | null>(null);
  const [kembali, setKembali] = useState<MapLengkap | null>(null);
  const [cari, setCari] = useState(false);
  usePintasanCari(setCari);

  const isi = useMemo(() => k.perLaci.get(kode) ?? [], [k.perLaci, kode]);
  const pilih = useMemo(() => {
    const id = sp.get('map');
    return (id && isi.find((m) => m.id === id)) || null;
  }, [sp, isi]);
  const [mulai] = useState(() => performance.now());
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => { if (isi.length && ms === null) setMs(Math.round(performance.now() - mulai)); }, [isi.length, ms, mulai]);

  const pilihMap = (m: MapLengkap) => setSp({ map: m.id }, { replace: true });
  const u = urai(kode);
  const jenis = isi[0]?.jenis_laci ?? (u?.ruang === 'khasanah' ? 'jaminan' : 'konsumtif');
  const jenisLabel = jenis === 'produktif' ? 'Produktif' : jenis === 'jaminan' ? 'Jaminan' : 'Konsumtif';
  const akad = isi.map((m) => m.tanggal_akad).filter(Boolean).sort() as string[];
  const sekitar = pilih ? isi.filter((m) => Math.abs(m.nomor_urut - pilih.nomor_urut) <= 2) : isi.slice(-5);
  const lama = pilih?.kredit === 'aktif' && pilih.debitur_id
    ? k.maps.filter((m) => m.debitur_id === pilih.debitur_id && m.id !== pilih.id && (m.kredit === 'lunas' || m.kredit === 'topup'))
    : [];

  if (!u) {
    return <MainLayout><p className="text-muted-foreground">Kode laci tidak dikenal: {kode}</p></MainLayout>;
  }

  return (
    <MainLayout>
      <button type="button" onClick={() => navigate('/arsip')} className="text-sm text-muted-foreground flex items-center gap-1 mb-2 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Peta kabinet
      </button>
      <div className="flex flex-col sm:flex-row sm:items-start gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold flex items-center gap-3 flex-wrap">
            Laci {kode.slice(1)} <LencanaJenis jenis={jenis} />
            {isi.some((m) => m.unit === 'meranti') && <span className="text-xs rounded-full bg-secondary/20 px-2 py-0.5">Meranti</span>}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {namaKabinet(kode)} · {isi.length} dari {KAPASITAS_LACI} map
            {akad.length > 0 && <> · akad {tglPanjang(akad[0])} sampai {tglPanjang(akad[akad.length - 1])}</>}
          </p>
        </div>
        <div className="sm:ml-auto flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setCari(true)}><Search className="w-4 h-4 mr-2" />Cari</Button>
          <Button variant="outline" onClick={() => navigate(`/arsip/label?laci=${kode}`)}><Printer className="w-4 h-4 mr-2" />Cetak label laci</Button>
          <Button variant="outline" onClick={() => navigate(`/arsip/opname?laci=${kode}`)}><ClipboardCheck className="w-4 h-4 mr-2" />Opname laci ini</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-[1.45fr_1fr] gap-4 items-start">
        <div className="space-y-4 min-w-0">
          <Card className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                <Sparkles className="w-4 h-4 text-secondary" />
                {pilih ? 'Laci meluncur terbuka, map yang dicari terangkat' : 'Pilih map di laci atau di bilah bawah'}
                {ms !== null && <span className="ml-auto rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] text-primary">{ms} ms</span>}
              </div>
              <LaciTerbuka kode={kode} isi={isi} pilih={pilih} onPilih={pilihMap} judulKabinet={namaKabinet(kode)} jenisLabel={jenisLabel} />
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-[#e9cd8f]" /> Map di tempat</span>
                <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-slate-300" /> Lunas</span>
                <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-secondary" /> Yang dipilih</span>
                <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-slate-800" /> Sedang dipinjam</span>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4" />
                <h2 className="font-semibold">Seluruh isi laci</h2>
                <span className="ml-auto text-xs text-muted-foreground">{isi.length} terisi · {Math.max(0, KAPASITAS_LACI - isi.length)} slot lega</span>
              </div>
              <StripLaci isi={isi} pilih={pilih?.id} onPilih={pilihMap} tinggi={46} />
            </CardContent>
          </Card>
        </div>

        <Card className="lg:sticky lg:top-2">
          <CardContent className="p-4">
            <div className="flex items-center mb-2">
              <h2 className="font-semibold">{pilih ? 'Di sekitar map ini' : 'Map paling depan'}</h2>
              {pilih && <span className="ml-auto text-xs text-muted-foreground">{nomor(Math.max(1, pilih.nomor_urut - 2))}–{nomor(pilih.nomor_urut + 2)}</span>}
            </div>
            {isi.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Laci ini belum berisi map. Isi lewat <Link className="underline" to="/arsip/sortir">Sortir Berkas</Link>.</p>}
            <div className="space-y-1">
              {sekitar.map((m) => (
                <button key={m.id} type="button" onClick={() => pilihMap(m)}
                  className={cn('w-full flex items-center gap-3 rounded-xl px-2.5 py-2 text-left border', pilih?.id === m.id ? 'border-secondary bg-secondary/10' : 'border-transparent hover:bg-muted/60')}>
                  <span className={cn('font-mono text-xs font-bold rounded-md px-1.5 py-1', pilih?.id === m.id ? 'bg-secondary text-white' : 'bg-primary/10 text-primary')}>{nomor(m.nomor_urut)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{m.nama_debitur}</span>
                    <span className="block text-[11px] text-muted-foreground">{m.tanggal_akad ? tglPanjang(m.tanggal_akad) : 'akad ?'} · {rupiahPendek(m.plafon ?? m.rekening?.plafon)}</span>
                  </span>
                  <LencanaFisik status={m.fisik} />
                </button>
              ))}
            </div>

            {pilih && (
              <div className="mt-4 rounded-2xl border bg-muted/30 p-3.5">
                <div className="flex items-start gap-2">
                  <div className="font-display text-lg font-bold flex-1">{pilih.nama_debitur}</div>
                  <LencanaKredit status={pilih.kredit} />
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-2 text-xs">
                  <div><div className="text-muted-foreground">Nomor PK</div><div className="font-mono font-semibold break-all">{pilih.nomor_pk || '—'}</div></div>
                  <div><div className="text-muted-foreground">Plafon</div><div className="font-semibold">{rupiahPendek(pilih.rekening?.plafon ?? pilih.plafon)}</div></div>
                  <div><div className="text-muted-foreground">Jatuh tempo</div><div className="font-semibold">{tglPanjang(pilih.rekening?.jatuh_tempo ?? pilih.jatuh_tempo)}</div></div>
                  <div><div className="text-muted-foreground">Kolektibilitas</div><div className="font-semibold">{pilih.rekening?.kol ?? '—'}</div></div>
                </div>
                {lama.length > 0 && (
                  <div className="mt-3 rounded-lg bg-secondary/15 px-3 py-2 text-xs flex gap-2">
                    <GitBranch className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>Map lama <b>lunas</b> di laci {lama.map((m) => `${m.kode_laci.slice(1)} #${nomor(m.nomor_urut)}`).join(', ')}, ter-top up ke akad ini.</span>
                  </div>
                )}
                {pilih.pinjam && (
                  <div className="mt-3 rounded-lg bg-warning/15 px-3 py-2 text-xs">
                    Dipegang <b>{pilih.pinjam.peminjam}</b> · tenggat {tglPanjang(pilih.pinjam.tenggat)}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {pilih.pinjam ? (
                    <Button className="h-11 bg-success hover:bg-success/90 text-white" onClick={() => setKembali(pilih)}><Undo2 className="w-4 h-4 mr-1.5" />Kembalikan</Button>
                  ) : (
                    <Button className="h-11" onClick={() => setPinjam(pilih)} disabled={pilih.fisik === 'diserahkan'}><ArrowUpRight className="w-4 h-4 mr-1.5" />Pinjam</Button>
                  )}
                  <Button variant="outline" className="h-11" onClick={() => navigate(`/arsip/map/${pilih.id}`)}><FileText className="w-4 h-4 mr-1.5" />Detail</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <PinjamDialog map={pinjam} onClose={() => setPinjam(null)} namaTerakhir={[...new Set(k.pinjam.map((p) => p.peminjam))].slice(0, 20)} />
      <KembaliDialog map={kembali} isiLaci={isi} onClose={() => setKembali(null)} />
      <CariArsip buka={cari} onBuka={setCari} k={k} onPinjam={setPinjam} />
    </MainLayout>
  );
};

export default LaciPage;
