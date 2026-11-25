import React, { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { samakanNama } from '@/hooks/use-arsip';
import { DetailMapDialog } from '@/components/arsip/DetailMap';
import { useArsipKonteks } from '@/hooks/use-arsip-konteks';
import { LencanaFisik, LencanaJenis, LencanaKredit } from '@/components/arsip/Lencana';
import { nomor, rupiahPendek, tglPanjang, type StatusFisik } from '@/lib/arsip';
import { Search, FolderPlus, Download, ArrowLeft } from 'lucide-react';
import * as XLSX from 'xlsx';

type Kredit = 'semua' | 'aktif' | 'lunas' | 'tidak_dikenali';

const DaftarBerkasPage: React.FC = () => {
  const k = useArsipKonteks();
  const [detail, setDetail] = useState<string | null>(null);
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const tab = sp.get('tab') === 'belum' ? 'belum' : 'map';
  const [kata, setKata] = useState('');
  const [kredit, setKredit] = useState<Kredit>((sp.get('kredit') as Kredit) || (sp.get('saring') === 'jaminan-lunas' ? 'lunas' : 'semua'));
  const [fisik, setFisik] = useState<StatusFisik | 'semua'>((sp.get('fisik') as StatusFisik) || 'semua');
  const [jenis, setJenis] = useState<string>(sp.get('saring') === 'jaminan-lunas' ? 'jaminan' : 'semua');
  const [batas, setBatas] = useState(100);

  const daftar = useMemo(() => {
    const q = samakanNama(kata);
    const qr = kata.trim().toUpperCase();
    return k.maps
      .filter((m) => kredit === 'semua' || (kredit === 'lunas' ? m.kredit === 'lunas' || m.kredit === 'topup' : m.kredit === kredit))
      .filter((m) => fisik === 'semua' || m.fisik === fisik)
      .filter((m) => jenis === 'semua' || m.jenis_laci === jenis)
      .filter((m) => !qr || samakanNama(m.nama_debitur).includes(q) || (m.nomor_pk || '').toUpperCase().includes(qr) || m.kode_map.includes(qr) || (m.no_rekening || '').includes(qr))
      .sort((a, b) => a.kode_laci.localeCompare(b.kode_laci) || a.nomor_urut - b.nomor_urut);
  }, [k.maps, kata, kredit, fisik, jenis]);

  const belum = useMemo(() => {
    const q = samakanNama(kata);
    return k.master
      .filter((r) => r.status === 'aktif' && !k.rekDiMap.has(r.no_rekening))
      .filter((r) => !q || samakanNama(r.nama_debitur).includes(q) || (r.nomor_pk || '').toUpperCase().includes(kata.trim().toUpperCase()))
      .sort((a, b) => (a.tanggal_akad || '').localeCompare(b.tanggal_akad || ''));
  }, [k.master, k.rekDiMap, kata]);

  const unduh = () => {
    const baris = daftar.map((m) => ({
      'Kode map': m.kode_map, Laci: m.kode_laci, 'No urut': m.nomor_urut, Nama: m.nama_debitur, 'Nomor PK': m.nomor_pk,
      Rekening: m.no_rekening, Akad: m.tanggal_akad, Plafon: m.rekening?.plafon ?? m.plafon, Jenis: m.jenis_laci, Unit: m.unit,
      'Status kredit': m.kredit, 'Status fisik': m.fisik, Peminjam: m.pinjam?.peminjam ?? '',
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(baris), 'Arsip');
    XLSX.writeFile(wb, `daftar-arsip-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const pil = (aktif: boolean) => cn('h-8 px-3 rounded-full text-xs font-semibold', aktif ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70');

  return (
    <MainLayout>
      <button type="button" onClick={() => navigate('/arsip')} className="text-sm text-muted-foreground flex items-center gap-1 mb-2 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Peta kabinet
      </button>
      <PageHeader
        title="Daftar Berkas"
        description={`${k.maps.length} map di arsip · ${belum.length} kredit aktif belum punya map`}
        actions={tab === 'map' ? <Button variant="outline" onClick={unduh}><Download className="w-4 h-4 mr-2" />Unduh Excel</Button> : undefined}
      />
      <div className="flex rounded-lg border overflow-hidden w-fit mb-3">
        <button type="button" className={cn('px-4 h-10 text-sm font-semibold', tab === 'map' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')} onClick={() => setSp({})}>Map di laci</button>
        <button type="button" className={cn('px-4 h-10 text-sm font-semibold', tab === 'belum' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')} onClick={() => setSp({ tab: 'belum' })}>Belum ada map ({belum.length})</button>
      </div>

      <Card className="mb-3">
        <CardContent className="p-3 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={kata} onChange={(e) => setKata(e.target.value)} placeholder="Nama, nomor PK, rekening, kode map…" className="h-11 pl-9" />
          </div>
          {tab === 'map' && (
            <div className="flex flex-wrap gap-1.5">
              {(['semua', 'aktif', 'lunas', 'tidak_dikenali'] as Kredit[]).map((s) => (
                <button key={s} type="button" className={pil(kredit === s)} onClick={() => setKredit(s)}>{s === 'tidak_dikenali' ? 'belum pasti' : s}</button>
              ))}
              <span className="w-px bg-border mx-1" />
              {(['semua', 'tersimpan', 'dipinjam', 'terlambat', 'telusur', 'diserahkan'] as const).map((s) => (
                <button key={s} type="button" className={pil(fisik === s)} onClick={() => setFisik(s)}>{s === 'semua' ? 'semua posisi' : s}</button>
              ))}
              <span className="w-px bg-border mx-1" />
              {['semua', 'konsumtif', 'produktif', 'jaminan'].map((s) => (
                <button key={s} type="button" className={pil(jenis === s)} onClick={() => setJenis(s)}>{s === 'semua' ? 'semua jenis' : s}</button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {tab === 'map' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs text-muted-foreground">
                  <tr>
                    <th className="text-left px-3 py-2.5 font-semibold">Posisi</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Debitur</th>
                    <th className="text-left px-3 py-2.5 font-semibold hidden md:table-cell">Akad</th>
                    <th className="text-right px-3 py-2.5 font-semibold hidden md:table-cell">Plafon</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {daftar.slice(0, batas).map((m) => (
                    <tr key={m.id} className="hover:bg-muted/40 cursor-pointer" onClick={() => setDetail(m.id)}>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="font-mono font-bold text-primary">{m.kode_laci.slice(1)} · {nomor(m.nomor_urut)}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{m.kode_map}</div>
                      </td>
                      <td className="px-3 py-2.5 min-w-[180px]">
                        <div className="font-semibold">{m.nama_debitur}</div>
                        <div className="text-[11px] font-mono text-muted-foreground truncate max-w-[260px]">{m.nomor_pk || '—'}</div>
                      </td>
                      <td className="px-3 py-2.5 hidden md:table-cell whitespace-nowrap">{tglPanjang(m.tanggal_akad)}</td>
                      <td className="px-3 py-2.5 hidden md:table-cell text-right whitespace-nowrap">{rupiahPendek(m.rekening?.plafon ?? m.plafon)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          <LencanaKredit status={m.kredit} />
                          <LencanaJenis jenis={m.jenis_laci} />
                          {m.fisik !== 'tersimpan' && <LencanaFisik status={m.fisik} />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {daftar.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">Tidak ada map yang cocok.</p>}
            {daftar.length > batas && (
              <div className="p-3 text-center"><Button variant="outline" onClick={() => setBatas(batas + 200)}>Tampilkan lebih banyak ({daftar.length - batas} lagi)</Button></div>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0 divide-y">
            {belum.slice(0, batas).map((r) => (
              <div key={r.no_rekening} className="flex items-center gap-3 px-3 py-2.5">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold">{r.nama_debitur}</div>
                  <div className="text-[11px] font-mono text-muted-foreground truncate">{r.nomor_pk || r.no_rekening} · akad {tglPanjang(r.tanggal_akad)}</div>
                </div>
                <span className="text-xs text-muted-foreground hidden sm:inline">{rupiahPendek(r.plafon)}</span>
              </div>
            ))}
            {belum.length > batas && (
              <div className="p-3 text-center"><Button variant="outline" onClick={() => setBatas(batas + 200)}>Tampilkan lebih banyak</Button></div>
            )}
            <div className="p-3 text-center">
              <Button onClick={() => navigate('/arsip/sortir')}><FolderPlus className="w-4 h-4 mr-2" />Lanjut sortir</Button>
            </div>
          </CardContent>
        </Card>
      )}
      <DetailMapDialog id={detail} onClose={() => setDetail(null)} />
    </MainLayout>
  );
};

export default DaftarBerkasPage;
