import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useArsipKonteks, type MapLengkap } from '@/hooks/use-arsip-konteks';
import { PemindaiQR } from '@/components/arsip/PemindaiQR';
import { KembaliDialog, PinjamDialog } from '@/components/arsip/DialogAksi';
import { LencanaFisik, LencanaKredit } from '@/components/arsip/Lencana';
import { nomor, type IsiQR } from '@/lib/arsip';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';

type Mode = 'pinjam' | 'kembali' | 'cek';

/**
 * Satu layar untuk tiga pekerjaan: pinjam, kembalikan, dan cek posisi.
 * Scan label map → langsung ke langkah berikutnya. Scan label laci → laci itu terbuka.
 */
const PindaiPage: React.FC = () => {
  const k = useArsipKonteks();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('pinjam');
  const [pinjam, setPinjam] = useState<MapLengkap | null>(null);
  const [kembali, setKembali] = useState<MapLengkap | null>(null);
  const [terakhir, setTerakhir] = useState<MapLengkap | null>(null);

  const hasil = (isi: Exclude<IsiQR, null>) => {
    if (isi.jenis === 'laci') {
      navigate(`/arsip/laci/${isi.kode}`);
      return;
    }
    const m = k.perKode.get(isi.kode);
    if (!m) {
      toast.error(`Kode ${isi.kode} tidak dikenal di arsip`);
      return;
    }
    setTerakhir(m);
    if (mode === 'cek') {
      navigate(`/arsip/laci/${m.kode_laci}?map=${m.id}`);
    } else if (mode === 'pinjam') {
      if (m.pinjam) {
        toast.message(`Map ini sedang dipegang ${m.pinjam.peminjam}`, { description: 'Beralih ke mode kembali.' });
        setMode('kembali');
        setKembali(m);
      } else if (m.diserahkan_at) {
        toast.error('Jaminan ini sudah diserahkan ke debitur.');
      } else {
        setPinjam(m);
      }
    } else if (m.pinjam) {
      setKembali(m);
    } else {
      toast.message(`${m.nama_debitur} tidak sedang dipinjam`, { description: `Tempatnya di laci ${m.kode_laci.slice(1)} #${nomor(m.nomor_urut)}` });
    }
  };

  const sibuk = !!pinjam || !!kembali;

  return (
    <MainLayout>
      <button type="button" onClick={() => navigate('/arsip')} className="text-sm text-muted-foreground flex items-center gap-1 mb-2 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Peta kabinet
      </button>
      <PageHeader title="Pindai label" description="Pinjam, kembalikan, atau cek posisi map cukup dengan scan QR di punggung map." />
      <div className="max-w-xl mx-auto space-y-3">
        <div className="grid grid-cols-3 rounded-xl border p-1 bg-muted/40">
          {(['pinjam', 'kembali', 'cek'] as Mode[]).map((m) => (
            <button key={m} type="button" onClick={() => setMode(m)}
              className={cn('h-10 rounded-lg text-sm font-semibold', mode === m ? 'bg-secondary text-white shadow' : 'text-muted-foreground')}>
              {m === 'pinjam' ? 'Pinjam' : m === 'kembali' ? 'Kembali' : 'Cek posisi'}
            </button>
          ))}
        </div>
        <PemindaiQR aktif={!sibuk} onHasil={hasil} petunjuk={mode === 'cek' ? 'Scan map atau laci' : 'Arahkan ke QR di punggung map'} />
        {terakhir && (
          <Card>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">TERAKHIR DISCAN</div>
                <div className="font-semibold truncate">{terakhir.nama_debitur}</div>
                <div className="text-xs font-mono text-muted-foreground">Laci {terakhir.kode_laci.slice(1)} · #{nomor(terakhir.nomor_urut)}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <LencanaKredit status={terakhir.kredit} />
                <LencanaFisik status={k.perId.get(terakhir.id)?.fisik ?? terakhir.fisik} />
              </div>
            </CardContent>
          </Card>
        )}
        <p className="text-xs text-muted-foreground text-center">
          Label belum dicetak? Cetak di menu <button type="button" className="underline" onClick={() => navigate('/arsip/label')}>Cetak Label</button>, atau ketik kode map di kotak atas.
        </p>
      </div>

      <PinjamDialog map={pinjam} onClose={() => setPinjam(null)} namaTerakhir={[...new Set(k.pinjam.map((p) => p.peminjam))].slice(0, 20)} />
      <KembaliDialog map={kembali} isiLaci={kembali ? k.perLaci.get(kembali.kode_laci) ?? [] : []} onClose={() => setKembali(null)} />
    </MainLayout>
  );
};

export default PindaiPage;
