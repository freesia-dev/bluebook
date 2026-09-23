import React from 'react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { KartuTertelan, PengisianATM } from '@/types';
import { angkaTerbilang } from '@/lib/atm-store';
import logoBankaltimtara from '@/assets/logo-bankaltimtara.png';
import logoBpd from '@/assets/logo-bpd.png';

/* -------------------------------------------------------------------------- */
/*  Berita Acara Pengisian ATM — mengikuti format Word resmi KCP Telihan       */
/*                                                                            */
/*  Susunan, perataan, dan bagian yang dicetak tebal disalin persis dari       */
/*  berkas BERITA_ACARA_PENGISIAN_ATM.docx: judul tebal bergaris bawah di      */
/*  tengah, isi rata kanan-kiri 12pt Calibri, tabel rincian tanpa garis        */
/*  dengan nominal rata kanan berformat 261,000,000.00, lalu blok tanda        */
/*  tangan petugas dan pemimpin.                                              */
/*                                                                            */
/*  Catatan: dua salah ketik di dokumen asli ("Kalimatan" dan "kamu telah      */
/*  melakukan pemeriksaan") sengaja DIPERTAHANKAN supaya hasilnya benar-benar  */
/*  sama dengan berkas acuan. Kalau nanti mau dirapikan, ubah di dua tempat    */
/*  yang ditandai komentar di bawah.                                          */
/* -------------------------------------------------------------------------- */

export interface BAPengisianDokumenProps {
  data: PengisianATM;
  kartuTertelan: KartuTertelan[];
  /** Nama-nama petugas pelaksana yang menandatangani */
  petugas: string[];
  /** Nama pemimpin yang mengetahui */
  pemimpin: string;
  /** Jabatan yang dicetak di bawah nama pemimpin */
  jabatanPemimpin?: string;
  /** Nomor berita acara; kosong → titik-titik seperti di format asli */
  nomor?: string;
  /** Kode device mesin ATM */
  device?: string;
}

/** Format angka gaya dokumen asli: 261,000,000.00 (koma ribuan, dua desimal). */
const nominal = (n: number): string =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Sel nominal: tanda "-" kalau nol, persis seperti baris selisih di format asli. */
const nominalAtauStrip = (n: number): string => (n === 0 ? '-' : nominal(n));

const BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const sel: React.CSSProperties = { padding: '0 0 2px', verticalAlign: 'top' };

export const BAPengisianDokumen: React.FC<BAPengisianDokumenProps> = ({
  data,
  kartuTertelan,
  petugas,
  pemimpin,
  jabatanPemimpin = 'Pemimpin',
  nomor,
  device = 'KTM14301',
}) => {
  const tanggal = data.tanggal instanceof Date ? data.tanggal : new Date(data.tanggal);

  // Hari diambil dari isian, tapi kalau kosong dihitung sendiri dari tanggalnya
  const hari = data.hari?.trim()
    ? data.hari.trim().charAt(0).toUpperCase() + data.hari.trim().slice(1).toLowerCase()
    : format(tanggal, 'EEEE', { locale: localeId });

  /* ---- Angka-angka rincian --------------------------------------------- */
  const lembarKeNominal = (lembar: number) => lembar * 100000;
  const sisaFisik = lembarKeNominal(
    data.sisaCartridge1 + data.sisaCartridge2 + data.sisaCartridge3 + data.sisaCartridge4,
  );
  const ditambahkan = lembarKeNominal(
    data.tambahCartridge1 + data.tambahCartridge2 + data.tambahCartridge3 + data.tambahCartridge4,
  );
  const sebelum = data.saldoBukuBesar;
  const setelah = sebelum + ditambahkan;

  // Selisih dihitung dari fisik vs sistem. Kalau keduanya sama tapi ada catatan
  // selisih yang diinput manual, catatan itu yang dipakai.
  let selisih = sisaFisik - sebelum;
  if (selisih === 0 && data.jumlahSelisih) {
    const besar = Math.abs(data.jumlahSelisih);
    selisih = /LEBIH/i.test(data.keteranganSelisih || '') ? besar : -besar;
  }
  const selisihKurang = selisih < 0 ? Math.abs(selisih) : 0;
  const selisihLebih = selisih > 0 ? selisih : 0;

  const rincian: { no: number; uraian: string; nilai: string }[] = [
    { no: 1, uraian: 'Saldo Kas Sebelum Pengisian (System Core)', nilai: nominal(sebelum) },
    { no: 2, uraian: 'Saldo Kas yang Ditambahkan (System Core)', nilai: nominal(ditambahkan) },
    { no: 3, uraian: 'Saldo Kas Setelah Penambahan (System Core)', nilai: nominal(setelah) },
    { no: 4, uraian: 'Saldo Kas Menurut Jumlah Fisik', nilai: nominal(sisaFisik) },
    { no: 5, uraian: 'Selisih Kurang Saldo Kas', nilai: nominalAtauStrip(selisihKurang) },
    { no: 6, uraian: 'Selisih Lebih Saldo Kas', nilai: nominalAtauStrip(selisihLebih) },
  ];

  const daftarPetugas = petugas.filter((p) => p && p.trim());

  return (
    <div
      className="ba-doc"
      style={{
        fontFamily: 'Calibri, Carlito, "Segoe UI", Arial, sans-serif',
        fontSize: '12pt',
        lineHeight: 1.3,
        color: '#000',
        background: '#fff',
      }}
    >
      {/* ── Kop surat ────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <img src={logoBankaltimtara} alt="" style={{ width: '120px', height: 'auto' }} />
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: '13pt', fontWeight: 'bold' }}>PT. BPD Kaltim Kaltara</div>
          <div style={{ fontSize: '11pt', fontWeight: 'bold', color: '#0066cc', textDecoration: 'underline' }}>
            KANTOR CABANG PEMBANTU TELIHAN
          </div>
          <div style={{ fontSize: '9.5pt' }}>Jl.Letjend S.Parman No.14-15 – Kota Bontang 75383</div>
          <div style={{ fontSize: '9.5pt' }}>Telp: 0548 - 26567</div>
          <div style={{ fontSize: '9.5pt' }}>
            Email:
            <span style={{ color: '#0066cc', textDecoration: 'underline' }}>kcp.telihan@bankaltimtara.co.id</span>
          </div>
          <div style={{ fontSize: '9.5pt', color: '#0066cc', textDecoration: 'underline' }}>www.bankaltimtara.co.id</div>
        </div>
        <img src={logoBpd} alt="" style={{ width: '95px', height: 'auto' }} />
      </div>
      <div style={{ borderBottom: '2px solid #000', margin: '6px 0 22px' }} />

      {/* ── Judul ────────────────────────────────────────────────────────── */}
      <p style={{ textAlign: 'center', fontWeight: 'bold', textDecoration: 'underline', margin: 0 }}>
        BERITA ACARA PENGISIAN ATM
      </p>
      <p style={{ textAlign: 'center', margin: 0 }}>Nomor: {nomor?.trim() || '……………….'}</p>
      <p style={{ margin: 0 }}>&nbsp;</p>

      {/* ── Paragraf pembuka ─────────────────────────────────────────────── */}
      <p style={{ textAlign: 'justify', margin: 0 }}>
        Pada hari <b>{hari}</b> tanggal <b>{angkaTerbilang(tanggal.getDate())}</b> bulan{' '}
        <b>{BULAN[tanggal.getMonth()]}</b> <b> </b>tahun <b>{angkaTerbilang(tanggal.getFullYear())}</b> (
        {format(tanggal, 'dd/MM/yyyy')}) pukul <b>{data.jam} WITA</b> telah dilakukan pengisian Kas ATM (Cash
        Opname) pada mesin ATM PT Bank Pembangunan Daerah Kalimantan Timur dan Kalimatan Utara KCP Telihan (Device{' '}
        {device}). Dengan rincian sebagai berikut:
        {/* "Kalimatan" di atas mengikuti berkas asli — ubah di sini kalau mau dibetulkan */}
      </p>
      <p style={{ margin: 0 }}>&nbsp;</p>

      {/* ── Tabel rincian (tanpa garis, seperti dokumen asli) ────────────── */}
      <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
        <tbody>
          {rincian.map((r) => (
            <tr key={r.no}>
              <td style={{ ...sel, width: '5%' }}>{r.no}.</td>
              <td style={{ ...sel, width: '57%' }}>{r.uraian}</td>
              <td style={{ ...sel, width: '8%', whiteSpace: 'nowrap' }}>: Rp</td>
              <td style={{ ...sel, width: '30%', textAlign: 'right' }}>{r.nilai}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ margin: 0 }}>&nbsp;</p>

      {/* ── Lampiran & hasil pemeriksaan ─────────────────────────────────── */}
      <p style={{ textAlign: 'justify', margin: 0 }}>
        Sebagai lampiran kami sampaikan struk jurnal mesin sebelum dan setelah dilakukan pengisian. Selain itu, kamu
        telah melakukan pemeriksaan terhadap mesin atm tersebut di atas, Dimana terdapat selisih Rp.
        {Math.abs(selisih).toLocaleString('id-ID')},-.
        {/* "kamu telah melakukan" mengikuti berkas asli — ubah di sini kalau mau dibetulkan */}
      </p>
      <p style={{ margin: 0 }}>&nbsp;</p>

      {/* ── Kartu tertahan ───────────────────────────────────────────────── */}
      <p style={{ textAlign: 'justify', margin: 0 }}>Kartu ATM Tertahan:</p>
      {kartuTertelan.length > 0 ? (
        kartuTertelan.map((kt) => (
          <p key={kt.id} style={{ textAlign: 'justify', margin: 0 }}>
            – {kt.nomorKartu}
            {kt.namaNasabah ? ` a.n. ${kt.namaNasabah}` : ''}
            {kt.bank ? ` (${kt.bank})` : ''}
          </p>
        ))
      ) : (
        <>
          <p style={{ margin: 0 }}>–</p>
          <p style={{ margin: 0 }}>–</p>
        </>
      )}
      <p style={{ margin: 0 }}>&nbsp;</p>

      <p style={{ textAlign: 'justify', margin: 0 }}>
        Demikian berita acara ini dibuat sesuai dengan keadaan yang sebenarnya.
      </p>
      <p style={{ margin: 0 }}>&nbsp;</p>

      {/* ── Penanda tangan ───────────────────────────────────────────────── */}
      <p style={{ margin: 0, fontWeight: 'bold' }}>
        PT BANK PEMBANGUNAN DAERAH KALIMANTAN TIMUR DAN KALIMANTAN UTARA
      </p>
      <p style={{ margin: 0, fontWeight: 'bold' }}>KANTOR CABANG PEMBANTU TELIHAN</p>
      <p style={{ margin: 0 }}>&nbsp;</p>
      <p style={{ margin: 0 }}>Petugas Pelaksana:</p>

      <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '2px' }}>
        <tbody>
          {(daftarPetugas.length ? daftarPetugas : ['', '']).map((nama, i) => (
            <tr key={`${nama}-${i}`}>
              <td style={{ ...sel, width: '8%' }}>{i + 1}</td>
              <td style={{ ...sel, width: '40%' }}>{nama || '…………………………..'}</td>
              <td style={{ ...sel, width: '52%' }}>Tanda Tangan …………………………..</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ margin: 0 }}>&nbsp;</p>

      <p style={{ textAlign: 'center', margin: 0 }}>Mengetahui,</p>
      <p style={{ margin: 0 }}>&nbsp;</p>
      <p style={{ margin: 0 }}>&nbsp;</p>
      <p style={{ margin: 0 }}>&nbsp;</p>
      <p style={{ textAlign: 'center', margin: 0, fontWeight: 'bold' }}>
        {pemimpin || '…………………………..'}
      </p>
      <p style={{ textAlign: 'center', margin: 0 }}>{jabatanPemimpin}</p>
    </div>
  );
};

export default BAPengisianDokumen;
