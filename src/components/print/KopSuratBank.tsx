import React from 'react';
import logo from '@/assets/logo-bankaltimtara.png';

/**
 * Kop surat resmi Bankaltimtara KCP Telihan.
 * Desain modern: kompak, profesional, sans-serif untuk header, dengan aksen warna brand.
 */
export const KopSuratBank: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`mb-5 ${className}`}>
      <div className="flex items-center gap-4 pb-3">
        <img
          src={logo}
          alt="Logo Bankaltimtara"
          className="h-14 w-auto object-contain shrink-0"
          crossOrigin="anonymous"
        />
        <div
          className="flex-1 leading-tight"
          style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}
        >
          <div className="text-[12pt] font-bold tracking-tight text-[#003F7F]">
            PT. BPD Kalimantan Timur &amp; Kalimantan Utara
          </div>
          <div className="text-[10.5pt] font-semibold text-[#003F7F]">
            Kantor Cabang Pembantu Telihan
          </div>
          <div className="text-[8.5pt] text-slate-700 mt-0.5">
            Jl. Letjend S. Parman No. 14–15, Bontang 75383 &nbsp;·&nbsp; Telp. 0548-26567
          </div>
          <div className="text-[8.5pt] text-slate-700">
            kcp.telihan@bankaltimtara.co.id &nbsp;·&nbsp; bankaltimtara.co.id
          </div>
        </div>
      </div>
      {/* Garis aksen brand: biru tebal + tipis */}
      <div className="h-[3px] bg-[#003F7F]" />
      <div className="h-[1px] bg-[#F58220] mt-[2px]" />
    </div>
  );
};
