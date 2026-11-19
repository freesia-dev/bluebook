import React, { useEffect, useMemo, useState } from 'react';
import logo from '@/assets/logo_bluebook.png';
import kainBangau from '@/assets/sapaan/kain-bangau.webp';
import { isiPita, namaPanggilan, pilihPaletAcak, salamSekarang, tanggalPanjang, type PaletSapaan } from '@/lib/sapaan-palet';
import './sapaan.css';

interface Props {
  nama: string;
  kutipan: string;
  /** true saat sedang menutup, untuk animasi memudar */
  menutup: boolean;
  onTutup: () => void;
  /** opsional, untuk pratinjau: paksa palet tertentu */
  palet?: PaletSapaan;
}

const kelasKutipan = (teks: string) =>
  teks.length <= 48 ? 'sp-kutip--pendek' : teks.length <= 85 ? 'sp-kutip--sedang' : 'sp-kutip--panjang';

/**
 * Tampilan sapaan harian bergaya poster: kain motif bangau yang berkibar
 * pelan, salam dan nama dalam huruf raksasa, kutipan di kotak miring, dan
 * pita berjalan berisi info hari ini. Warna dipilih acak tiap kali muncul.
 */
export const SapaanPoster: React.FC<Props> = ({ nama, kutipan, menutup, onTutup, palet: paletPaksa }) => {
  // Dipilih sekali saat sapaan muncul, lalu tetap sampai ditutup.
  const [palet] = useState(() => paletPaksa ?? pilihPaletAcak());
  const [acak] = useState(() => ({
    miring: -(1.4 + Math.random() * 1.8), // -1,4° sampai -3,2°
    sudut: 92 + Math.round(Math.random() * 22), // arah gradient lapisan
  }));
  const [kainSiap, setKainSiap] = useState(false);

  const salam = salamSekarang();
  const panggilan = namaPanggilan(nama).toUpperCase();
  const n = Math.max(salam.length + 1, panggilan.length + 1, 5);
  const pita = useMemo(() => isiPita(), []);
  const tanggal = useMemo(() => tanggalPanjang(), []);

  // Gambar kain dimuat dulu, baru ditampilkan perlahan — sebelum itu yang
  // terlihat hanya warna latar, bukan kotak kosong.
  useEffect(() => {
    const img = new Image();
    img.onload = () => setKainSiap(true);
    img.src = kainBangau;
  }, []);

  const gaya = {
    '--tint': palet.tint,
    '--aksen': palet.aksen,
    '--kotak': palet.kotak,
    '--kotakTeks': palet.kotakTeks,
    '--pita': palet.pita,
    '--pitaTeks': palet.pitaTeks,
    '--miring': `${acak.miring.toFixed(2)}deg`,
    '--sudut': `${acak.sudut}deg`,
  } as React.CSSProperties;

  const isiPitaJsx = (
    <span>
      {pita.map((p, i) => (
        <React.Fragment key={i}>
          {p}
          <i>✦</i>
        </React.Fragment>
      ))}
    </span>
  );

  return (
    <div
      className={`sp${menutup ? ' sp-tutup' : ''}`}
      style={gaya}
      role="dialog"
      aria-modal="true"
      aria-label={`Selamat ${salam.toLowerCase()}, ${namaPanggilan(nama)}`}
      tabIndex={-1}
      onClick={onTutup}
    >
      <div className="sp-kain" aria-hidden>
        <div
          className={`sp-kain-img${kainSiap ? ' sp-siap' : ''}`}
          style={{ backgroundImage: `url(${kainBangau})` }}
        />
      </div>
      <div className="sp-tint" aria-hidden />
      <div className="sp-lipat sp-lipat-1" aria-hidden />
      <div className="sp-lipat sp-lipat-2" aria-hidden />

      <header className="sp-kepala">
        <div className="sp-merek">
          <img src={logo} alt="" />
          <span className="sp-tanggal">{tanggal}</span>
        </div>
        <span className="sp-petunjuk sp-petunjuk-atas">Klik atau tekan tombol apa saja untuk lanjut</span>
      </header>

      <h1 className="sp-judul" style={{ '--n': n } as React.CSSProperties}>
        <span className="sp-baris sp-baris-1">{salam},</span>
        <span className="sp-baris sp-baris-2">{panggilan}.</span>
      </h1>

      {kutipan && <blockquote className={`sp-kutip ${kelasKutipan(kutipan)}`}>“{kutipan}”</blockquote>}

      <div className="sp-pita" aria-hidden>
        <div className="sp-pita-jalan">
          {isiPitaJsx}
          {isiPitaJsx}
          {isiPitaJsx}
          {isiPitaJsx}
        </div>
      </div>

      <span className="sp-petunjuk sp-petunjuk-bawah">Ketuk di mana saja untuk lanjut</span>
    </div>
  );
};

export default SapaanPoster;
