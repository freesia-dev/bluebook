import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { useArsipKonteks } from '@/hooks/use-arsip-konteks';
import { LabelLaci, LabelMap } from '@/components/arsip/Label';
import { KABINET, LACI_PER_KABINET, kodeLaci, nomor, type Ruang } from '@/lib/arsip';
import { Printer } from 'lucide-react';
import '@/components/arsip/arsip.css';

type Tata = 'a4' | 'gulung';

/**
 * Cetak label QR untuk map dan muka laci. Dua tata letak: lembar A4
 * (3 kolom × 9 baris label 62×29 mm) atau gulungan printer label 62 mm.
 */
const CetakLabelPage: React.FC = () => {
  const k = useArsipKonteks();
  const [sp] = useSearchParams();
  const [ruang, setRuang] = useState<Ruang>(sp.get('laci')?.startsWith('J') ? 'khasanah' : 'berkas');
  const [laci, setLaci] = useState<string[]>(sp.get('laci') ? [sp.get('laci')!] : []);
  const [denganLaci, setDenganLaci] = useState(!!sp.get('laci'));
  const [denganMap, setDenganMap] = useState(true);
  const [tata, setTata] = useState<Tata>('a4');
  const mapTunggal = sp.get('map');

  const maps = useMemo(() => {
    if (mapTunggal) return k.maps.filter((m) => m.id === mapTunggal);
    return laci.flatMap((l) => (k.perLaci.get(l) ?? []).filter((m) => !m.diserahkan_at));
  }, [k.maps, k.perLaci, laci, mapTunggal]);

  const label = [
    ...(denganLaci && !mapTunggal ? laci.map((l) => ({ jenis: 'laci' as const, kode: l })) : []),
    ...(denganMap ? maps.map((m) => ({ jenis: 'map' as const, m })) : []),
  ];

  // ukuran halaman ikut tata letak yang dipilih
  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = tata === 'a4'
      ? '@page { size: A4 portrait; margin: 8mm 6mm; }'
      : '@page { size: 62mm 29mm; margin: 0; }';
    document.head.appendChild(el);
    return () => { el.remove(); };
  }, [tata]);

  const gantiLaci = (kode: string) => setLaci((l) => (l.includes(kode) ? l.filter((x) => x !== kode) : [...l, kode]));

  return (
    <MainLayout>
      <div>
        <PageHeader
          title="Cetak Label"
          description="QR di label hanya berisi kode tetap. Merapikan laci tidak perlu mencetak ulang label."
          actions={<Button onClick={() => window.print()} disabled={!label.length}><Printer className="w-4 h-4 mr-2" />Cetak {label.length} label</Button>}
        />
        <Card className="mb-4">
          <CardContent className="p-4 space-y-3">
            {mapTunggal ? (
              <p className="text-sm">Label untuk satu map: <b>{maps[0]?.nama_debitur ?? '…'}</b></p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex rounded-lg border overflow-hidden">
                    {(['berkas', 'khasanah'] as Ruang[]).map((r) => (
                      <button key={r} type="button" onClick={() => setRuang(r)} className={cn('px-4 h-9 text-sm font-semibold', ruang === r ? 'bg-primary text-primary-foreground' : 'hover:bg-muted')}>
                        {r === 'berkas' ? 'Berkas' : 'Khasanah'}
                      </button>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">Pilih laci yang labelnya mau dicetak</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {KABINET[ruang].flatMap((kb) => LACI_PER_KABINET.map((l) => {
                    const kode = kodeLaci(ruang, kb, l);
                    const n = (k.perLaci.get(kode) ?? []).length;
                    return (
                      <button key={kode} type="button" onClick={() => gantiLaci(kode)}
                        className={cn('h-12 min-w-[72px] rounded-lg border px-2 text-left', laci.includes(kode) ? 'border-primary bg-primary/10' : 'hover:bg-muted')}>
                        <div className="font-mono text-sm font-bold text-primary">{kode.slice(1)}</div>
                        <div className="text-[10px] text-muted-foreground">{n} map</div>
                      </button>
                    );
                  }))}
                </div>
              </>
            )}
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <label className="flex items-center gap-2"><Checkbox checked={denganMap} onCheckedChange={(v) => setDenganMap(!!v)} /> Label map</label>
              {!mapTunggal && <label className="flex items-center gap-2"><Checkbox checked={denganLaci} onCheckedChange={(v) => setDenganLaci(!!v)} /> Label muka laci</label>}
              <span className="w-px h-5 bg-border" />
              {(['a4', 'gulung'] as Tata[]).map((t) => (
                <button key={t} type="button" onClick={() => setTata(t)} className={cn('h-8 px-3 rounded-full text-xs font-semibold', tata === t ? 'bg-primary text-primary-foreground' : 'bg-muted')}>
                  {t === 'a4' ? 'Lembar A4 (27 label)' : 'Printer label 62 mm'}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground mb-2">Pratinjau ({label.length} label{tata === 'a4' ? `, ${Math.ceil(label.length / 27)} lembar` : ''})</p>
      </div>

      {(() => {
        const isi = label.map((x, i) => (
          <div key={i}>
            {x.jenis === 'laci'
              ? <LabelLaci kode={x.kode} jenis={k.perLaci.get(x.kode)?.[0]?.jenis_laci} />
              : <LabelMap map={x.m} />}
          </div>
        ));
        return (
          <>
            <div className="grid gap-2 justify-start overflow-x-auto" style={{ gridTemplateColumns: 'repeat(auto-fill, 62mm)' }}>{isi}</div>
            {createPortal(
              <div className="ab-lembar-cetak"><div className={tata === 'a4' ? 'ab-hal-a4' : 'ab-hal-gulung'}>{isi}</div></div>,
              document.body,
            )}
          </>
        );
      })()}
      {label.length === 0 && <p className="text-sm text-muted-foreground">Belum ada label. Pilih laci di atas.</p>}
      {maps.length > 0 && !mapTunggal && (
        <p className="text-[11px] text-muted-foreground mt-3">
          Urutan label mengikuti nomor map: {maps.slice(0, 3).map((m) => `${m.kode_laci.slice(1)}-${nomor(m.nomor_urut)}`).join(', ')}{maps.length > 3 ? ', …' : ''}
        </p>
      )}
    </MainLayout>
  );
};

export default CetakLabelPage;
