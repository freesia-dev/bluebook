import React, { useEffect, useMemo, useState } from 'react';
import logo from '@/assets/logo_bluebook.png';
import bangau1 from '@/assets/sapaan/bangau-1.webp';
import bangau2 from '@/assets/sapaan/bangau-2.webp';
import bangau3 from '@/assets/sapaan/bangau-3.webp';
import bangau4 from '@/assets/sapaan/bangau-4.webp';
import bangau5 from '@/assets/sapaan/bangau-5.webp';
import bangau6 from '@/assets/sapaan/bangau-6.webp';
import { hashKunci, type Ayat } from '@/lib/greeting-ayat';
import { isiPita, namaPanggilan, salamSekarang, tanggalPanjang, type PaletSapaan } from '@/lib/sapaan-palet';
import { KONFIG_BAWAAN, pilihPalet, type KonfigSapaan } from '@/lib/sapaan-konfig';
import './sapaan.css';

/** Enam pola bangau bawaan. Admin memilih mana yang ikut diacak. */
export const LATAR_BAWAAN = [bangau1, bangau2, bangau3, bangau4, bangau5, bangau6];

interface Props {
  nama: string;
  ayat: Ayat | null;
  /** kunci sapaan ("tanggal|waktu"), menentukan latar */
  kunci?: string;
  /** teks besar baris pertama, mis. "PAGI" (bawaan: menurut jam) */
  salam?: string;
  /** true saat sedang menutup, untuk animasi memudar */
  menutup: boolean;
  onTutup: () => void;
  konfig?: KonfigSapaan;
  /** opsional, untuk pratinjau: paksa palet / latar tertentu */
  palet?: PaletSapaan;
  latar?: string | null;
}

/** Ukuran huruf kotak ayat mengikuti panjang terjemahan + teks Arabnya. */
const ukuranAyat = (a: Ayat) => {
  const n = a.teks.length + (a.arab ? a.arab.length * 0.6 : 0);
  return n <= 110 ? 'pendek' : n <= 200 ? 'sedang' : 'panjang';
};

const formatNama = (nama: string, f: KonfigSapaan['formatNama']) => {
  if (f === 'lengkap') return nama.trim().replace(/\s+/g, ' ') || 'Kawan';
  if (f === 'depan') return nama.trim().split(/\s+/)[0]?.replace(/[^\p{L}'-]/gu, '') || 'Kawan';
  return namaPanggilan(nama);
};

/**
 * Tampilan sapaan bergaya poster: kain bermotif yang berkibar pelan, salam
 * dan nama dalam huruf raksasa, kutipan di kotak miring, dan pita berjalan
 * berisi info hari ini. Semua bagian bisa diatur di Konfigurasi → Layar Sapaan.
 */
export const SapaanPoster: React.FC<Props> = ({ nama, ayat, kunci, salam: salamProp, menutup, onTutup, konfig = KONFIG_BAWAAN, palet: paletPaksa, latar: latarPaksa }) => {
  // Dipilih sekali saat sapaan muncul, lalu tetap sampai ditutup.
  const [paletAcak] = useState(() => pilihPalet(konfig));
  const palet = paletPaksa ?? paletAcak;
  const [acak] = useState(() => ({
    miring: -(1.4 + Math.random() * 1.8), // -1,4° sampai -3,2°
    sudut: 92 + Math.round(Math.random() * 22), // arah gradient lapisan
  }));
  const [kainSiap, setKainSiap] = useState(false);
  const tanggalHariIni = useMemo(() => tanggalPanjang(), []);

  const daftarLatar = useMemo(
    () => [...konfig.latarBawaan.map((i) => LATAR_BAWAAN[i]).filter(Boolean), ...konfig.latarKustom],
    [konfig.latarBawaan, konfig.latarKustom],
  );
  const latar = latarPaksa !== undefined
    ? latarPaksa
    : daftarLatar.length ? daftarLatar[hashKunci(kunci || tanggalHariIni) % daftarLatar.length] : null;
  const ukuran = ayat ? ukuranAyat(ayat) : 'pendek';

  const salam = (salamProp || salamSekarang()).toUpperCase();
  const panggilan = formatNama(nama, konfig.formatNama).toUpperCase();
  const n = Math.max(salam.length + 1, panggilan.length + 1, 5);
  const pita = useMemo(
    () => [...(konfig.pitaOtomatis ? isiPita() : []), ...konfig.pitaTambahan],
    [konfig.pitaOtomatis, konfig.pitaTambahan],
  );

  // Gambar kain dimuat dulu, baru ditampilkan perlahan — sebelum itu yang
  // terlihat hanya warna latar, bukan kotak kosong.
  useEffect(() => {
    setKainSiap(false);
    if (!latar) return;
    const img = new Image();
    img.onload = () => setKainSiap(true);
    img.src = latar;
  }, [latar]);

  const gaya = {
    '--tint': palet.tint,
    '--aksen': palet.aksen,
    '--kotak': palet.kotak,
    '--kotakTeks': palet.kotakTeks,
    '--pita': palet.pita,
    '--pitaTeks': palet.pitaTeks,
    '--miring': konfig.kemiringan === 'lurus' ? '0deg' : `${acak.miring.toFixed(2)}deg`,
    '--sudut': `${acak.sudut}deg`,
    '--kepekatan': String(konfig.kepekatan),
    '--skala-judul': String(konfig.skalaJudul),
    '--skala-kutip': String(konfig.skalaKutipan),
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

  const kelas = [
    'sp',
    `sp--${ukuran}`,
    menutup ? 'sp-tutup' : '',
    konfig.efekKibar ? '' : 'sp--diam',
    konfig.tampilPita && pita.length ? '' : 'sp--tanpa-pita',
    ayat ? '' : 'sp--tanpa-kutip',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={kelas}
      style={gaya}
      role="dialog"
      aria-modal="true"
      aria-label={`Selamat ${salam.toLowerCase()}, ${panggilan}`}
      tabIndex={-1}
      onClick={onTutup}
    >
      {latar && (
        <div className="sp-kain" aria-hidden>
          <div
            className={`sp-kain-img${kainSiap ? ' sp-siap' : ''}`}
            style={{ backgroundImage: `url("${latar}")` }}
          />
        </div>
      )}
      <div className="sp-tint" aria-hidden />
      <div className="sp-lipat sp-lipat-1" aria-hidden />
      <div className="sp-lipat sp-lipat-2" aria-hidden />

      {(konfig.tampilLogo || konfig.tampilTanggal || konfig.tampilPetunjuk) && (
        <header className="sp-kepala">
          <div className="sp-merek">
            {konfig.tampilLogo && <img src={logo} alt="" />}
            {konfig.tampilTanggal && <span className="sp-tanggal">{tanggalHariIni}</span>}
          </div>
          {konfig.tampilPetunjuk && konfig.teksPetunjuk && <span className="sp-petunjuk sp-petunjuk-atas">{konfig.teksPetunjuk}</span>}
        </header>
      )}

      <h1 className="sp-judul" style={{ '--n': n } as React.CSSProperties}>
        <span className="sp-baris sp-baris-1">{salam},</span>
        <span className="sp-baris sp-baris-2">{panggilan}.</span>
      </h1>

      {ayat && (
        <blockquote className={`sp-kutip sp-kutip--${ukuran}`}>
          {ayat.arab && <p className="sp-arab" dir="rtl" lang="ar">{ayat.arab}</p>}
          <p className="sp-teks">{ayat.teks}</p>
          {ayat.sumber && <cite className="sp-sumber">{ayat.arab && !/^QS\.?\s/i.test(ayat.sumber) ? `QS. ${ayat.sumber}` : ayat.sumber}</cite>}
        </blockquote>
      )}

      {konfig.tampilPita && pita.length > 0 && (
        <div className="sp-pita" aria-hidden>
          <div className="sp-pita-jalan">
            {isiPitaJsx}
            {isiPitaJsx}
            {isiPitaJsx}
            {isiPitaJsx}
          </div>
        </div>
      )}

      {konfig.tampilPetunjuk && konfig.teksPetunjuk && (
        <span className="sp-petunjuk sp-petunjuk-bawah">{konfig.teksPetunjuk.replace(/^Klik atau tekan tombol apa saja/i, 'Ketuk di mana saja')}</span>
      )}
    </div>
  );
};

export default SapaanPoster;
