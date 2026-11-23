import React, { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useArsipKonteks, type MapLengkap } from '@/hooks/use-arsip-konteks';
import { riwayatDebitur, useUbahBerkas } from '@/hooks/use-arsip';
import { LencanaFisik, LencanaJenis, LencanaKredit } from '@/components/arsip/Lencana';
import { StripLaci } from '@/components/arsip/Kabinet';
import { LabelMap } from '@/components/arsip/Label';
import { KembaliDialog, PinjamDialog, SerahDialog } from '@/components/arsip/DialogAksi';
import { RiwayatDebiturDialog } from './RiwayatDebiturDialog';
import { KELENGKAPAN, namaKabinet, nomor, rupiahPendek, selisihHari, tglPanjang } from '@/lib/arsip';
import { fmtIDR } from '@/lib/mlf-utils';
import {
  ArrowLeft, ArrowUpRight, CheckCircle2, ClipboardCheck, Circle, FileText, FolderOpen, GitBranch, HandHeart,
  History, MapPin, Printer, QrCode, Undo2, Zap, AlertCircle, Pencil,
} from 'lucide-react';
import { toast } from 'sonner';

const Kotak: React.FC<{ ikon: React.ElementType; judul: string; kanan?: React.ReactNode; children: React.ReactNode; className?: string }> = ({ ikon: Ikon, judul, kanan, children, className }) => (
  <Card className={className}>
    <CardContent className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <Ikon className="w-4 h-4" />
        <h2 className="font-semibold">{judul}</h2>
        <span className="ml-auto text-xs text-muted-foreground">{kanan}</span>
      </div>
      {children}
    </CardContent>
  </Card>
);

const DetailMapPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const k = useArsipKonteks();
  const ubah = useUbahBerkas();
  const [pinjam, setPinjam] = useState<MapLengkap | null>(null);
  const [kembali, setKembali] = useState<MapLengkap | null>(null);
  const [serah, setSerah] = useState<MapLengkap | null>(null);
  const [lihatRiwayat, setLihatRiwayat] = useState(false);

  const map = k.perId.get(id) ?? null;
  const debitur = map?.debitur_id ? k.debitur.find((d) => d.id === map.debitur_id) ?? null : null;
  const riwayat = useMemo(() => (debitur ? riwayatDebitur(debitur, k.berkas, k.master) : []), [debitur, k.berkas, k.master]);
  const isiLaci = map ? k.perLaci.get(map.kode_laci) ?? [] : [];
  const pinjamMap = useMemo(() => k.pinjam.filter((p) => p.berkas_id === id), [k.pinjam, id]);

  if (!map) {
    return (
      <MainLayout>
        <p className="text-muted-foreground">{k.memuat ? 'Memuat…' : 'Map tidak ditemukan.'}</p>
      </MainLayout>
    );
  }

  const daftarCek = KELENGKAPAN[map.jenis_laci] ?? KELENGKAPAN.konsumtif;
  const cek = map.kelengkapan ?? {};
  const lengkap = daftarCek.filter((d) => cek[d]).length;
  const r = map.rekening;
  const sebelum = isiLaci.filter((m) => m.nomor_urut < map.nomor_urut).slice(-1)[0];
  const sesudah = isiLaci.find((m) => m.nomor_urut > map.nomor_urut);

  const centang = async (item: string) => {
    try {
      await ubah.mutateAsync({ id: map.id, ubah: { kelengkapan: { ...cek, [item]: !cek[item] } } });
    } catch (e) {
      toast.error((e as Error)?.message || 'Gagal menyimpan');
    }
  };

  return (
    <MainLayout>
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-muted-foreground flex items-center gap-1 mb-2 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>
      <div className="flex flex-col md:flex-row md:items-start gap-3 mb-5">
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-bold flex flex-wrap items-center gap-2">
            {map.nama_debitur}
            <LencanaKredit status={map.kredit} />
            <LencanaJenis jenis={map.jenis_laci} />
            {r?.kol != null && <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', r.kol > 1 ? 'bg-destructive/15 text-destructive' : 'bg-success/15 text-success')}>Kol {r.kol}</span>}
            {map.fisik !== 'tersimpan' && <LencanaFisik status={map.fisik} />}
          </h1>
          <p className="font-mono text-sm text-muted-foreground mt-1 break-all">
            PK {map.nomor_pk || '—'}{map.no_rekening && <> · rekening {map.no_rekening}</>} · {map.kode_map}
          </p>
        </div>
        <div className="md:ml-auto flex flex-wrap gap-2">
          <Button variant="outline" className="h-11" onClick={() => navigate(`/arsip/label?map=${map.id}`)}><Printer className="w-4 h-4 mr-2" />Cetak label</Button>
          {map.jenis_laci === 'jaminan' && !map.diserahkan_at && (
            <Button variant="outline" className="h-11" onClick={() => setSerah(map)}><HandHeart className="w-4 h-4 mr-2" />Serahkan jaminan</Button>
          )}
          {map.pinjam ? (
            <Button className="h-11 bg-success hover:bg-success/90 text-white" onClick={() => setKembali(map)}><Undo2 className="w-4 h-4 mr-2" />Kembalikan</Button>
          ) : (
            <Button className="h-11" onClick={() => setPinjam(map)} disabled={!!map.diserahkan_at}><ArrowUpRight className="w-4 h-4 mr-2" />Pinjam</Button>
          )}
        </div>
      </div>

      {map.diserahkan_at && (
        <Card className="mb-4 border-info/40 bg-info/5">
          <CardContent className="p-4 text-sm flex gap-3">
            <HandHeart className="w-5 h-5 text-info shrink-0" />
            <div>Jaminan sudah diserahkan kepada <b>{map.diserahkan_kepada}</b> pada {tglPanjang(map.diserahkan_at)}.{map.catatan_serah && <> Catatan: {map.catatan_serah}</>}</div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4 items-start">
        <Kotak ikon={GitBranch} judul="Riwayat kredit" kanan={debitur ? <button type="button" className="underline" onClick={() => setLihatRiwayat(true)}>kelola</button> : 'belum tertaut'}>
          {riwayat.length === 0 && <p className="text-sm text-muted-foreground">Belum ada riwayat. Jalankan SQL 2026-11-23 untuk menautkan debitur.</p>}
          <ol className="relative space-y-3">
            {riwayat.map((b, i) => {
              const ini = b.map?.id === map.id;
              return (
                <li key={b.kunci} className="relative pl-7">
                  {i < riwayat.length - 1 && <span className="absolute left-[9px] top-6 bottom-[-14px] border-l-2 border-dashed border-secondary/50" />}
                  <span className={cn('absolute left-0 top-3 w-5 h-5 rounded-full border-4', ini ? 'border-secondary bg-white' : 'border-muted-foreground/30 bg-background')} />
                  <div className={cn('rounded-xl border p-3', ini && 'border-secondary/60 bg-secondary/5')}>
                    <div className="text-xs text-muted-foreground">{b.tanggal_akad ? tglPanjang(b.tanggal_akad) : 'tanggal akad ?'}</div>
                    <div className="font-display font-bold">{i === 0 ? 'Akad pertama' : i === riwayat.length - 1 && b.status === 'aktif' ? 'Akad berjalan' : `Akad ke-${i + 1}`}</div>
                    <div className="text-[11px] font-mono text-muted-foreground break-all">{b.nomor_pk || b.no_rekening || '—'}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="font-semibold text-sm">{b.plafon ? fmtIDR(b.plafon) : '—'}</span>
                      <LencanaKredit status={b.status === 'lunas' ? 'lunas' : b.status === 'aktif' ? 'aktif' : 'tidak_dikenali'} />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs">
                      <span className="flex items-center gap-1 text-muted-foreground"><MapPin className="w-3 h-3" />{b.map ? `Laci ${b.map.kode_laci.slice(1)} · Map ${nomor(b.map.nomor_urut)}` : 'belum ada map'}</span>
                      {b.map && !ini && <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => navigate(`/arsip/map/${b.map!.id}`)}>Buka</Button>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          {riwayat.length > 1 && (
            <p className="mt-3 text-[11px] text-muted-foreground flex gap-1.5"><Zap className="w-3 h-3 mt-0.5 text-secondary shrink-0" />Akad-akad ini dikenali sebagai satu debitur dari nama di MLF dan sambungan di arsip.</p>
          )}
        </Kotak>

        <div className="space-y-4">
          <Kotak ikon={FileText} judul="Data kredit" kanan={r ? <span className="rounded-md bg-primary/10 text-primary px-2 py-0.5">MLF {tglPanjang(r.terakhir_lihat)}</span> : 'tidak ada di MLF'}>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div><div className="text-xs text-muted-foreground">Plafon</div><div className="font-semibold">{fmtIDR(r?.plafon ?? map.plafon ?? 0)}</div></div>
              <div><div className="text-xs text-muted-foreground">Baki debet</div><div className="font-semibold">{r ? fmtIDR(r.baki ?? 0) : '—'}</div></div>
              <div><div className="text-xs text-muted-foreground">Akad</div><div className="font-semibold">{tglPanjang(map.tanggal_akad ?? r?.tanggal_akad)}</div></div>
              <div><div className="text-xs text-muted-foreground">Jatuh tempo</div><div className="font-semibold">{tglPanjang(r?.jatuh_tempo ?? map.jatuh_tempo)}</div></div>
              <div className="col-span-2"><div className="text-xs text-muted-foreground">Produk</div><div className="font-semibold">{r?.produk || r?.jenis_kredit || map.jenis_kredit || '—'}</div></div>
            </div>
          </Kotak>
          <Kotak ikon={ClipboardCheck} judul="Kelengkapan map" kanan={`${lengkap} dari ${daftarCek.length}`}>
            <div className="space-y-1.5">
              {daftarCek.map((d) => (
                <button key={d} type="button" onClick={() => centang(d)} disabled={ubah.isPending}
                  className={cn('w-full flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-left border',
                    cek[d] ? 'bg-success/10 border-success/30' : 'bg-warning/10 border-warning/30')}>
                  {cek[d] ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Circle className="w-4 h-4 text-warning-foreground/60" />}
                  <span className="flex-1">{d}</span>
                  {!cek[d] && <span className="text-[10px] font-bold text-warning-foreground">belum ada</span>}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground mt-2 flex items-center gap-1"><Pencil className="w-3 h-3" /> Ketuk untuk mencentang.</p>
          </Kotak>
        </div>

        <div className="space-y-4">
          <Kotak ikon={QrCode} judul="Label map" kanan="siap cetak">
            <div className="flex justify-center overflow-hidden"><LabelMap map={map} skala={1} /></div>
            <p className="text-[11px] text-muted-foreground mt-2">Label tidak memuat lokasi, jadi tidak perlu dicetak ulang saat laci dirapikan. 62 × 29 mm.</p>
          </Kotak>
          <Kotak ikon={History} judul="Riwayat pinjam" kanan={`${pinjamMap.length} kali`}>
            <div className="divide-y">
              {pinjamMap.map((p) => (
                <div key={p.id} className="py-2 flex items-start gap-3 text-sm">
                  <span className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', p.kembali_at ? 'bg-primary/10 text-primary' : 'bg-warning/20 text-warning-foreground')}>
                    {p.kembali_at ? <Undo2 className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-semibold">{p.peminjam}</span>
                    <span className="block text-xs text-muted-foreground">
                      {p.keperluan || '—'} · {p.kembali_at
                        ? `${Math.max(1, Math.round((new Date(p.kembali_at).getTime() - new Date(p.dipinjam_at).getTime()) / 86_400_000))} hari${p.kondisi === 'kurang' ? ' · isi kurang' : ''}`
                        : selisihHari(p.tenggat) < 0 ? `lewat ${-selisihHari(p.tenggat)} hari` : `tenggat ${tglPanjang(p.tenggat)}`}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">{tglPanjang(p.dipinjam_at)}</span>
                </div>
              ))}
              <div className="py-2 flex items-start gap-3 text-sm">
                <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0"><FolderOpen className="w-4 h-4" /></span>
                <span className="flex-1"><span className="block font-semibold">Masuk laci {map.kode_laci.slice(1)}</span><span className="block text-xs text-muted-foreground">disortir {map.sumber === 'mlf' ? 'dari MLF' : 'manual'}</span></span>
                <span className="text-xs text-muted-foreground">{tglPanjang(map.created_at)}</span>
              </div>
            </div>
          </Kotak>
        </div>
      </div>

      <Card className="mt-4">
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-4">
          <MapPin className="w-5 h-5 text-secondary shrink-0 hidden md:block" />
          <div className="min-w-0">
            <div className="font-semibold">Posisi fisik: {namaKabinet(map.kode_laci)} › Laci {map.kode_laci.slice(1)} › Map {nomor(map.nomor_urut)}</div>
            <div className="text-xs text-muted-foreground">
              {sebelum ? `di depan ${sebelum.nama_debitur}` : 'paling belakang'}{sesudah ? `, di belakang ${sesudah.nama_debitur}` : ', paling depan'}
            </div>
            {map.perlu_telusur && <div className="text-xs text-destructive mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Tidak ditemukan saat opname terakhir.</div>}
          </div>
          <div className="md:flex-1 md:max-w-sm"><StripLaci isi={isiLaci} pilih={map.id} tinggi={34} /></div>
          <Button className="h-12 md:w-48" onClick={() => navigate(`/arsip/laci/${map.kode_laci}?map=${map.id}`)}><FolderOpen className="w-4 h-4 mr-2" />Buka laci {map.kode_laci.slice(1)}</Button>
        </CardContent>
      </Card>

      <PinjamDialog map={pinjam} onClose={() => setPinjam(null)} namaTerakhir={[...new Set(k.pinjam.map((p) => p.peminjam))].slice(0, 20)} />
      <KembaliDialog map={kembali} isiLaci={isiLaci} onClose={() => setKembali(null)} />
      <SerahDialog map={serah} onClose={() => setSerah(null)} />
      <RiwayatDebiturDialog debitur={lihatRiwayat ? debitur : null} onClose={() => setLihatRiwayat(false)} berkas={k.berkas} master={k.master} semuaDebitur={k.debitur} />
    </MainLayout>
  );
};

export default DetailMapPage;
