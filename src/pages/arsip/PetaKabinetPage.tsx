import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useArsipKonteks, type MapLengkap } from '@/hooks/use-arsip-konteks';
import { KabinetIlustrasi } from '@/components/arsip/Kabinet';
import { CariArsip, usePintasanCari } from '@/components/arsip/CariArsip';
import { PinjamDialog } from '@/components/arsip/DialogAksi';
import {
  KABINET, KAPASITAS_LACI, jamAtauTanggal, rupiahPendek, selisihHari, semuaLaci, type Ruang,
} from '@/lib/arsip';
import {
  FolderOpen, Layers, ArrowUpRight, Link2, Printer, ClipboardCheck, ScanLine, Search, History,
  Undo2, GitBranch, AlarmClock, AlertTriangle, HandHeart, Archive,
} from 'lucide-react';

const Stat: React.FC<{ ikon: React.ElementType; warna: string; judul: string; angka: React.ReactNode; sub: string }> = ({ ikon: Ikon, warna, judul, angka, sub }) => (
  <Card>
    <CardContent className="p-4 flex items-center gap-3">
      <span className={cn('w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0', warna)}><Ikon className="w-6 h-6" /></span>
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{judul}</div>
        <div className="font-display text-2xl font-bold leading-tight">{angka}</div>
        <div className="text-[11px] text-muted-foreground truncate">{sub}</div>
      </div>
    </CardContent>
  </Card>
);

const PetaKabinetPage: React.FC = () => {
  const k = useArsipKonteks();
  const navigate = useNavigate();
  const [ruang, setRuang] = useState<Ruang>('berkas');
  const [cari, setCari] = useState(false);
  const [pinjam, setPinjam] = useState<MapLengkap | null>(null);
  usePintasanCari(setCari);

  const stat = useMemo(() => {
    const diLaci = k.maps.filter((m) => m.fisik !== 'diserahkan');
    const aktif = diLaci.filter((m) => m.kredit === 'aktif');
    const plafon = aktif.reduce((s, m) => s + (m.rekening?.plafon ?? m.plafon ?? 0), 0);
    const laci = semuaLaci('berkas').concat(semuaLaci('khasanah'));
    const terisi = laci.filter((l) => (k.perLaci.get(l) ?? []).length > 0).length;
    const dipinjam = k.maps.filter((m) => m.fisik === 'dipinjam' || m.fisik === 'terlambat');
    const terlambat = dipinjam.filter((m) => m.fisik === 'terlambat');
    const tertaut = diLaci.filter((m) => m.no_rekening).length;
    const aktifMlf = k.master.filter((r) => r.status === 'aktif');
    const belumMap = aktifMlf.filter((r) => !k.rekDiMap.has(r.no_rekening)).length;
    return { diLaci, aktif, plafon, laci, terisi, dipinjam, terlambat, tertaut, aktifMlf, belumMap };
  }, [k]);

  const aktivitas = useMemo(() => {
    const ev: { waktu: string; ikon: React.ElementType; judul: string; sub: string; ke?: string }[] = [];
    k.pinjam.slice(0, 40).forEach((p) => {
      const m = k.perId.get(p.berkas_id);
      if (!m) return;
      ev.push({ waktu: p.dipinjam_at, ikon: ArrowUpRight, judul: `${p.peminjam} meminjam map`, sub: `${m.nama_debitur} · laci ${m.kode_laci.slice(1)}`, ke: `/arsip/map/${m.id}` });
      if (p.kembali_at) ev.push({ waktu: p.kembali_at, ikon: Undo2, judul: `${p.peminjam} mengembalikan map`, sub: `${m.nama_debitur} · laci ${m.kode_laci.slice(1)}`, ke: `/arsip/map/${m.id}` });
    });
    [...k.maps].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 15).forEach((m) => {
      ev.push({ waktu: m.created_at, ikon: Archive, judul: 'Map masuk laci', sub: `${m.nama_debitur} · laci ${m.kode_laci.slice(1)} #${String(m.nomor_urut).padStart(3, '0')}`, ke: `/arsip/map/${m.id}` });
      if (m.diserahkan_at) ev.push({ waktu: m.diserahkan_at, ikon: HandHeart, judul: 'Jaminan diserahkan', sub: `${m.nama_debitur} → ${m.diserahkan_kepada}`, ke: `/arsip/map/${m.id}` });
    });
    return ev.sort((a, b) => b.waktu.localeCompare(a.waktu)).slice(0, 6);
  }, [k]);

  const perhatian = useMemo(() => {
    const out: { ikon: React.ElementType; warna: string; judul: string; sub: string; ke: string }[] = [];
    stat.terlambat.forEach((m) => out.push({
      ikon: AlarmClock, warna: 'bg-destructive/15 text-destructive',
      judul: `Lewat tenggat ${-selisihHari(m.pinjam!.tenggat)} hari`,
      sub: `${m.nama_debitur} · dipegang ${m.pinjam!.peminjam}`, ke: '/arsip/pinjam',
    }));
    stat.laci.forEach((l) => {
      const n = (k.perLaci.get(l) ?? []).length;
      if (n / KAPASITAS_LACI >= 0.9) out.push({ ikon: Layers, warna: 'bg-warning/20 text-warning-foreground', judul: `Laci ${l.slice(1)} hampir penuh`, sub: `${n} dari ${KAPASITAS_LACI} map`, ke: `/arsip/laci/${l}` });
    });
    const telusur = k.maps.filter((m) => m.fisik === 'telusur');
    if (telusur.length) out.push({ ikon: Search, warna: 'bg-destructive/10 text-destructive', judul: `${telusur.length} map perlu ditelusuri`, sub: 'tidak ditemukan saat opname terakhir', ke: '/arsip/daftar?fisik=telusur' });
    const jaminanLunas = k.maps.filter((m) => m.jenis_laci === 'jaminan' && !m.diserahkan_at && (m.kredit === 'lunas' || m.kredit === 'topup'));
    if (jaminanLunas.length) out.push({ ikon: HandHeart, warna: 'bg-info/15 text-info', judul: `${jaminanLunas.length} jaminan siap diserahkan`, sub: 'kreditnya sudah lunas di MLF', ke: '/arsip/daftar?saring=jaminan-lunas' });
    const jadiLunas = k.maps.filter((m) => m.jenis_laci !== 'jaminan' && m.status_kredit === 'aktif' && (m.kredit === 'lunas' || m.kredit === 'topup'));
    if (jadiLunas.length) out.push({ ikon: GitBranch, warna: 'bg-secondary/20 text-secondary-foreground', judul: `${jadiLunas.length} map berubah jadi lunas`, sub: 'sejak disortir — bisa dipindah ke laci lunas', ke: '/arsip/daftar?kredit=lunas' });
    if (stat.belumMap) out.push({ ikon: FolderOpen, warna: 'bg-primary/10 text-primary', judul: `${stat.belumMap} kredit aktif belum punya map di laci`, sub: 'lanjutkan di Sortir Berkas', ke: '/arsip/daftar?tab=belum' });
    return out.slice(0, 6);
  }, [k, stat]);

  return (
    <MainLayout>
      <PageHeader
        title="Peta Kabinet"
        description={`${KABINET.berkas.length} kabinet berkas · ${KABINET.khasanah.length} kabinet khasanah · ${stat.diLaci.length} map tercatat`}
        actions={
          <>
            <Button variant="outline" className="h-11" onClick={() => setCari(true)}>
              <Search className="w-4 h-4 mr-2" /> Cari map <kbd className="ml-2 hidden sm:inline text-[10px] rounded border px-1">Ctrl K</kbd>
            </Button>
            <Button variant="outline" className="h-11" onClick={() => navigate('/arsip/label')}><Printer className="w-4 h-4 mr-2" />Cetak label</Button>
            <Button variant="outline" className="h-11" onClick={() => navigate('/arsip/opname')}><ClipboardCheck className="w-4 h-4 mr-2" />Opname</Button>
            <Button className="h-11" onClick={() => navigate('/arsip/pindai')}><ScanLine className="w-4 h-4 mr-2" />Pindai QR</Button>
          </>
        }
      />

      {k.galat && (
        <Card className="mb-4 border-destructive/40">
          <CardContent className="p-4 flex gap-3 text-sm">
            <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
            Data arsip gagal dimuat. Pastikan SQL 2026-11-23 dan 2026-11-24 sudah dijalankan. ({(k.galat as Error).message})
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <Stat ikon={FolderOpen} warna="bg-primary" judul="Map aktif" angka={stat.aktif.length} sub={`plafon ${rupiahPendek(stat.plafon)}`} />
        <Stat ikon={Layers} warna="bg-secondary" judul="Laci terisi" angka={<>{stat.terisi}<span className="text-base text-muted-foreground">/{stat.laci.length}</span></>} sub={`${stat.laci.length - stat.terisi} laci masih kosong`} />
        <Stat ikon={ArrowUpRight} warna="bg-warning" judul="Sedang dipinjam" angka={stat.dipinjam.length} sub={stat.terlambat.length ? `${stat.terlambat.length} lewat tenggat` : 'semua tepat waktu'} />
        <Stat
          ikon={Link2} warna="bg-success" judul="Tertaut ke MLF"
          angka={<>{stat.diLaci.length ? Math.round((stat.tertaut / stat.diLaci.length) * 100) : 0}<span className="text-base text-muted-foreground">%</span></>}
          sub={`${stat.aktifMlf.length - stat.belumMap} dari ${stat.aktifMlf.length} kredit aktif sudah di laci`}
        />
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <div className="flex rounded-lg border overflow-hidden">
              {(['berkas', 'khasanah'] as Ruang[]).map((r) => (
                <button key={r} type="button" onClick={() => setRuang(r)}
                  className={cn('px-4 h-9 text-sm font-semibold', ruang === r ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                  {r === 'berkas' ? 'Kabinet berkas kredit' : 'Khasanah jaminan'}
                </button>
              ))}
            </div>
            <span className="ml-auto text-xs text-muted-foreground">Klik laci untuk membukanya</span>
          </div>
          <div className={cn('grid gap-4', ruang === 'berkas' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5' : 'grid-cols-2 max-w-md mx-auto')}>
            {KABINET[ruang].map((no) => (
              <KabinetIlustrasi key={no} ruang={ruang} kabinet={no} perLaci={k.perLaci} onPilih={(kode) => navigate(`/arsip/laci/${kode}`)} />
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-primary" /> Konsumtif</span>
            <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-secondary" /> Produktif</span>
            <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-info" /> Jaminan</span>
            <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-slate-400" /> Lunas semua</span>
            <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-full bg-warning" /> Ada map dipinjam</span>
            <span className="flex items-center gap-1.5">Bilah: isi laci (merah = hampir penuh)</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold flex items-center gap-2 mb-3"><History className="w-4 h-4" /> Aktivitas terbaru</h2>
            {aktivitas.length === 0 && <p className="text-sm text-muted-foreground py-4">Belum ada aktivitas.</p>}
            <div className="divide-y">
              {aktivitas.map((a, i) => (
                <button key={i} type="button" onClick={() => a.ke && navigate(a.ke)} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-muted/40 rounded-lg px-1">
                  <span className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0"><a.ikon className="w-4 h-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{a.judul}</span>
                    <span className="block text-xs text-muted-foreground truncate">{a.sub}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">{jamAtauTanggal(a.waktu)}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h2 className="font-semibold flex items-center gap-2 mb-3"><AlertTriangle className="w-4 h-4" /> Perlu perhatian</h2>
            {perhatian.length === 0 && <p className="text-sm text-muted-foreground py-4">Semua beres.</p>}
            <div className="divide-y">
              {perhatian.map((a, i) => (
                <button key={i} type="button" onClick={() => navigate(a.ke)} className="w-full flex items-center gap-3 py-2.5 text-left hover:bg-muted/40 rounded-lg px-1">
                  <span className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', a.warna)}><a.ikon className="w-4 h-4" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">{a.judul}</span>
                    <span className="block text-xs text-muted-foreground truncate">{a.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <CariArsip buka={cari} onBuka={setCari} k={k} onPinjam={setPinjam} />
      <PinjamDialog map={pinjam} onClose={() => setPinjam(null)} namaTerakhir={[...new Set(k.pinjam.map((p) => p.peminjam))].slice(0, 20)} />
    </MainLayout>
  );
};

export default PetaKabinetPage;
