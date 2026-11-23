import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { cn } from '@/lib/utils';
import { KAPASITAS_LACI, LACI_PER_KABINET, QR_LACI, kodeLaci, nomor, type Ruang } from '@/lib/arsip';
import type { MapLengkap } from '@/hooks/use-arsip-konteks';
import './arsip.css';

/** Warna utama laci menurut isi terbanyaknya. */
export const warnaLaci = (isi: MapLengkap[]) => {
  if (isi.length === 0) return 'hsl(214 25% 86%)';
  const aktif = isi.filter((m) => m.kredit === 'aktif' || m.kredit === 'tidak_dikenali');
  if (aktif.length === 0) return 'hsl(214 10% 62%)';
  const jenis = isi[0].jenis_laci;
  if (jenis === 'produktif') return 'hsl(var(--secondary))';
  if (jenis === 'jaminan') return 'hsl(var(--info))';
  return 'hsl(var(--primary))';
};

const warnaIsi = (n: number) =>
  n / KAPASITAS_LACI >= 0.95 ? 'hsl(0 72% 55%)' : n / KAPASITAS_LACI >= 0.85 ? 'hsl(var(--secondary))' : 'hsl(var(--primary))';

interface KabinetProps {
  ruang: Ruang;
  kabinet: number;
  perLaci: Map<string, MapLengkap[]>;
  aktif?: string;
  onPilih: (kode: string) => void;
  className?: string;
}

/** Satu kabinet dengan empat laci yang bisa diklik. */
export const KabinetIlustrasi: React.FC<KabinetProps> = ({ ruang, kabinet, perLaci, aktif, onPilih, className }) => (
  <div className={cn('ab-kabinet', className)}>
    <div className="ab-kabinet-kepala">{ruang === 'berkas' ? 'KABINET' : 'KHASANAH'} {kabinet}</div>
    {LACI_PER_KABINET.map((l) => {
      const kode = kodeLaci(ruang, kabinet, l);
      const isi = perLaci.get(kode) ?? [];
      const dipinjam = isi.some((m) => m.fisik === 'dipinjam' || m.fisik === 'terlambat');
      const meranti = isi.some((m) => m.unit === 'meranti');
      return (
        <button
          key={kode}
          type="button"
          onClick={() => onPilih(kode)}
          className={cn('ab-laci', aktif === kode && 'ab-aktif', isi.length === 0 && 'ab-kosong')}
          title={`${kode} · ${isi.length} map`}
        >
          <div className="flex items-center gap-1.5">
            <span className="ab-laci-kode">{kode.slice(1)}</span>
            {meranti && <span className="text-[9px] font-bold opacity-70">MRT</span>}
            <span className="ml-auto flex gap-1">
              <i className="block w-2 h-2 rounded-full" style={{ background: warnaLaci(isi) }} />
              {dipinjam && <i className="block w-2 h-2 rounded-full bg-warning" />}
            </span>
          </div>
          <span className="ab-laci-gagang" />
          <div className="ab-isi">
            <i style={{ width: `${Math.min(100, (isi.length / KAPASITAS_LACI) * 100)}%`, background: warnaIsi(isi.length) }} />
          </div>
        </button>
      );
    })}
  </div>
);

/* ------------------------------------------------------------- strip isi laci */

export const StripLaci: React.FC<{
  isi: MapLengkap[];
  pilih?: string | null;
  onPilih?: (m: MapLengkap) => void;
  tinggi?: number;
}> = ({ isi, pilih, onPilih, tinggi = 40 }) => {
  const terbesar = Math.max(KAPASITAS_LACI, ...isi.map((m) => m.nomor_urut));
  const perNomor = new Map(isi.map((m) => [m.nomor_urut, m]));
  return (
    <div>
      <div className="ab-strip" style={{ height: tinggi }}>
        {Array.from({ length: terbesar }, (_, i) => {
          const m = perNomor.get(i + 1);
          if (!m) return <span key={i} className="ab-slot ab-kosong" />;
          const kelas = cn(
            'ab-slot',
            m.kredit === 'lunas' || m.kredit === 'topup' ? 'ab-lunas' : '',
            (m.fisik === 'dipinjam' || m.fisik === 'terlambat') && 'ab-pinjam',
            m.fisik === 'telusur' && 'ab-telusur',
            pilih === m.id && 'ab-pilih',
          );
          return onPilih ? (
            <button key={i} type="button" className={kelas} title={`${nomor(m.nomor_urut)} · ${m.nama_debitur}`} onClick={() => onPilih(m)} />
          ) : (
            <span key={i} className={kelas} />
          );
        })}
      </div>
      <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
        <span>001 · belakang</span>
        {pilih && perNomor.size > 0 && (
          <span className="text-secondary-foreground font-bold">
            Map {nomor(isi.find((m) => m.id === pilih)?.nomor_urut ?? 0)}
          </span>
        )}
        <span>depan · {nomor(terbesar)}</span>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------- laci terbuka */

export const LaciTerbuka: React.FC<{
  kode: string;
  isi: MapLengkap[];
  pilih: MapLengkap | null;
  onPilih: (m: MapLengkap) => void;
  judulKabinet: string;
  jenisLabel: string;
}> = ({ kode, isi, pilih, onPilih, judulKabinet, jenisLabel }) => {
  // Laci dilihat dari depan-atas: map 001 (belakang) paling atas dan paling
  // sempit, map paling depan paling bawah dan paling lebar — seperti melihat
  // ke dalam laci yang ditarik.
  const n = isi.length;
  return (
    <div className="ab-panggung" key={kode}>
      <div className="ab-badan ab-badan-atas">
        <div className="ab-kabinet-kepala" style={{ margin: '0 -14px 0' }}>{judulKabinet.toUpperCase()}</div>
        <div className="ab-laci"><span className="ab-laci-kode">—</span><span className="ab-laci-gagang" /></div>
      </div>

      <div className="ab-wadah">
        <div className="ab-lantai" />
        {isi.map((m, i) => {
          const t = n <= 1 ? 1 : i / (n - 1);
          const sisi = 9 - 8 * t; // persen dari tepi
          const fs = 7 + 3 * t;
          return (
            <div
              key={m.id}
              onClick={() => onPilih(m)}
              className={cn(
                'ab-map',
                (m.kredit === 'lunas' || m.kredit === 'topup') && 'ab-lunas',
                (m.fisik === 'dipinjam' || m.fisik === 'terlambat') && 'ab-pinjam',
                pilih?.id === m.id && 'ab-pilih',
              )}
              style={{ top: 4 + t * 140, left: `${sisi}%`, right: `${sisi}%`, zIndex: i + 1, fontSize: fs, paddingTop: fs * 0.2 }}
              title={`${nomor(m.nomor_urut)} · ${m.nama_debitur}`}
            >
              {nomor(m.nomor_urut)} · {m.fisik === 'dipinjam' || m.fisik === 'terlambat' ? 'DIPINJAM' : m.nama_debitur}
              <span className="ab-tab" style={{ right: `${6 + ((m.nomor_urut * 37) % 58)}%`, fontSize: fs }}>{nomor(m.nomor_urut)}</span>
            </div>
          );
        })}
      </div>

      {pilih && (
        <div className="ab-kartu-map" key={pilih.id}>
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-display font-bold text-primary truncate">{pilih.nama_debitur}</div>
              <div className="text-[10px] font-mono text-muted-foreground">MAP {nomor(pilih.nomor_urut)} · LACI {kode}</div>
            </div>
            <QRCodeSVG value={pilih.kode_map} size={40} level="M" />
          </div>
        </div>
      )}

      <div className="ab-muka">
        <div className="rounded-lg bg-white text-primary px-3 py-1.5 flex items-center gap-3">
          <span className="font-mono text-2xl font-bold leading-none">{kode.slice(1)}</span>
          <span className="text-[9px] leading-tight">
            <b className="text-secondary block tracking-widest">{jenisLabel.toUpperCase()}</b>
            MAP 001 — {nomor(Math.max(isi.length, 1))}
          </span>
        </div>
        <span className="mx-auto h-2 w-20 rounded-full bg-white/70" />
        <div className="rounded-md bg-white p-1"><QRCodeSVG value={QR_LACI(kode)} size={40} level="M" /></div>
      </div>
    </div>
  );
};
