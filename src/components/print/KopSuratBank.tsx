import React from 'react';
import logo from '@/assets/logo-bankaltimtara.png';

/**
 * Kop surat resmi Bankaltimtara KCP Telihan.
 * Dipakai di semua dokumen BA / Call Memo yang akan dicetak.
 */
export const KopSuratBank: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`pb-3 mb-4 border-b-[3px] border-double border-black ${className}`}>
      <div className="flex items-center gap-5">
        <img
          src={logo}
          alt="Logo Bankaltimtara"
          className="h-20 w-auto object-contain shrink-0"
          crossOrigin="anonymous"
        />
        <div className="flex-1 text-center" style={{ fontFamily: '"Times New Roman", serif' }}>
          <div className="text-[15pt] font-bold leading-tight tracking-wide">
            PT. BPD KALIMANTAN TIMUR DAN KALIMANTAN UTARA
          </div>
          <div className="text-[14pt] font-bold leading-tight tracking-wide">
            KANTOR CABANG PEMBANTU TELIHAN
          </div>
          <div className="text-[10pt] leading-snug mt-1">
            Jl. Letjend S. Parman No. 14-15 — Kota Bontang 75383
          </div>
          <div className="text-[10pt] leading-snug">
            Telp: 0548 - 26567 &nbsp;|&nbsp; Email: kcp.telihan@bankaltimtara.co.id
          </div>
          <div className="text-[10pt] leading-snug italic">www.bankaltimtara.co.id</div>
        </div>
      </div>
    </div>
  );
};
