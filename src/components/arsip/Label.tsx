import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QR_LACI, namaKabinet } from '@/lib/arsip';
import type { BerkasArsip } from '@/hooks/use-arsip';

/**
 * Label sampul map, 62 × 29 mm. QR hanya berisi kode map yang tidak pernah
 * berubah, dan label tidak menuliskan lokasi — jadi merapikan laci tidak
 * perlu mencetak ulang label.
 */
export const LabelMap: React.FC<{ map: Pick<BerkasArsip, 'kode_map' | 'nama_debitur' | 'nomor_pk'>; skala?: number }> = ({ map, skala = 1 }) => (
  <div
    style={{ width: `${62 * skala}mm`, height: `${29 * skala}mm`, padding: `${2 * skala}mm`, gap: `${2.5 * skala}mm` }}
    className="flex items-center bg-white text-[#06284d] border border-dashed border-slate-300 rounded-[2mm] overflow-hidden break-inside-avoid"
  >
    <QRCodeSVG value={map.kode_map} level="M" style={{ width: `${24 * skala}mm`, height: `${24 * skala}mm`, flex: 'none' }} />
    <div className="min-w-0 flex-1 leading-tight">
      <div style={{ fontSize: `${2 * skala}mm`, letterSpacing: '0.12em' }} className="font-extrabold text-[#c2621c]">
        BLUEBOOK · KCP TELIHAN
      </div>
      <div style={{ fontSize: `${3.4 * skala}mm` }} className="font-extrabold uppercase line-clamp-2 mt-[0.5mm]">
        {map.nama_debitur}
      </div>
      <div style={{ fontSize: `${2 * skala}mm` }} className="font-mono text-slate-500 break-all line-clamp-2 mt-[0.5mm]">
        {map.nomor_pk || '—'}
      </div>
      <div style={{ fontSize: `${2.4 * skala}mm` }} className="font-mono font-bold mt-[0.8mm] bg-slate-100 rounded px-[1mm] inline-block">
        {map.kode_map}
      </div>
    </div>
  </div>
);

/** Label muka laci. Laci tidak pernah pindah, jadi QR ini benar selamanya. */
export const LabelLaci: React.FC<{ kode: string; jenis?: string; skala?: number }> = ({ kode, jenis, skala = 1 }) => (
  <div
    style={{ width: `${62 * skala}mm`, height: `${29 * skala}mm`, padding: `${2 * skala}mm`, gap: `${3 * skala}mm` }}
    className="flex items-center bg-white text-[#06284d] border border-dashed border-slate-300 rounded-[2mm] overflow-hidden break-inside-avoid"
  >
    <QRCodeSVG value={QR_LACI(kode)} level="M" style={{ width: `${24 * skala}mm`, height: `${24 * skala}mm`, flex: 'none' }} />
    <div className="leading-none">
      <div style={{ fontSize: `${2 * skala}mm`, letterSpacing: '0.14em' }} className="font-extrabold text-[#c2621c] uppercase">
        {namaKabinet(kode)}
      </div>
      <div style={{ fontSize: `${12 * skala}mm` }} className="font-mono font-extrabold mt-[1mm]">{kode.slice(1)}</div>
      {jenis && (
        <div style={{ fontSize: `${2.4 * skala}mm`, letterSpacing: '0.12em' }} className="font-bold uppercase mt-[1mm] text-slate-500">
          {jenis}
        </div>
      )}
    </div>
  </div>
);
