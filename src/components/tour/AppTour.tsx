import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { sudahIkutTur, tandaiTurSelesai } from '@/lib/tur-state';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface Langkah {
  /** Elemen yang disorot; kosong = kartu di tengah layar (pembuka/penutup). */
  target?: string;
  judul: string;
  isi: string;
}

const LANGKAH: Langkah[] = [
  {
    judul: 'Selamat datang di Bluebook 👋',
    isi: 'Sebentar saja — kurang dari satu menit untuk berkeliling. Semua pekerjaan kantor ada di sini: surat, agenda kredit, kalkulator, ATM, sampai laporan.',
  },
  {
    target: '[data-tur="sidebar"]',
    judul: 'Menu utama',
    isi: 'Semua modul ada di daftar ini. Menu yang sedang dibuka ditandai garis biru di sisi kiri. Tombol garis tiga di atas untuk membuka dan menutupnya.',
  },
  {
    target: '[data-tur="cari"]',
    judul: 'Cari apa saja',
    isi: 'Ketik nama nasabah, nomor PK, atau perihal surat — hasilnya dari semua modul sekaligus. Bisa juga tekan Ctrl + K dari halaman mana pun.',
  },
  {
    target: '[data-tur="presence"]',
    judul: 'Siapa yang sedang online',
    isi: 'Di sini terlihat rekan kerja yang sedang membuka Bluebook dan halaman apa yang mereka buka — berguna supaya tidak dobel mengerjakan hal yang sama.',
  },
  {
    target: '[data-tur="notifikasi"]',
    judul: 'Pemberitahuan',
    isi: 'Hal yang perlu ditindaklanjuti muncul di lonceng ini, misalnya berkas yang menunggu giliran.',
  },
  {
    target: '[data-tur="tampilan"]',
    judul: 'Atur kenyamanan mata',
    isi: 'Huruf bisa diperbesar, dan tampilan bisa diubah ke mode gelap. Pilihanmu diingat di perangkat ini.',
  },
  {
    judul: 'Sudah, itu saja',
    isi: 'Kalau nanti lupa, tur ini bisa diulang kapan saja lewat halaman About. Selamat bekerja!',
  },
];

const JARAK = 12;

interface Kotak {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * Tur pengenalan untuk pegawai baru: menyorot satu bagian layar, menjelaskan
 * fungsinya, lalu lanjut. Muncul sekali saat pertama kali masuk, dan bisa
 * diulang dari halaman About.
 *
 * Sengaja tanpa library tur: cuma lapisan gelap dengan lubang di posisi elemen,
 * dihitung dari getBoundingClientRect. Langkah yang elemennya tidak ada di layar
 * (misalnya di HP) dilewati sendiri, jadi tidak pernah menyorot ruang kosong.
 */
export const AppTour: React.FC = () => {
  const { isAuthenticated, isApproved } = useAuth();
  const [aktif, setAktif] = useState(false);
  const [i, setI] = useState(0);
  const [kotak, setKotak] = useState<Kotak | null>(null);

  // Mulai otomatis untuk yang belum pernah ikut
  useEffect(() => {
    if (!isAuthenticated || !isApproved) return;
    if (sudahIkutTur()) return;
    const t = window.setTimeout(() => setAktif(true), 1500);
    return () => window.clearTimeout(t);
  }, [isAuthenticated, isApproved]);

  // Bisa dipanggil ulang dari About
  useEffect(() => {
    const onMulai = () => {
      setI(0);
      setAktif(true);
    };
    window.addEventListener('bluebook:mulai-tur', onMulai);
    return () => window.removeEventListener('bluebook:mulai-tur', onMulai);
  }, []);

  const langkah = LANGKAH[i];

  const hitungKotak = useCallback(() => {
    if (!langkah?.target) {
      setKotak(null);
      return true;
    }
    const el = document.querySelector(langkah.target) as HTMLElement | null;
    if (!el) {
      setKotak(null);
      return false;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) {
      setKotak(null);
      return false;
    }
    setKotak({ top: r.top - 6, left: r.left - 6, width: r.width + 12, height: r.height + 12 });
    return true;
  }, [langkah]);

  // Lewati sendiri langkah yang elemennya tidak ada (mis. sidebar di HP)
  useLayoutEffect(() => {
    if (!aktif) return;
    const ada = hitungKotak();
    if (!ada && langkah?.target) {
      setI((n) => (n + 1 < LANGKAH.length ? n + 1 : n));
    }
  }, [aktif, i, hitungKotak, langkah]);

  useEffect(() => {
    if (!aktif) return;
    const ulang = () => hitungKotak();
    window.addEventListener('resize', ulang);
    window.addEventListener('scroll', ulang, true);
    return () => {
      window.removeEventListener('resize', ulang);
      window.removeEventListener('scroll', ulang, true);
    };
  }, [aktif, hitungKotak]);

  const selesai = useCallback(() => {
    tandaiTurSelesai();
    setAktif(false);
    setI(0);
  }, []);

  // Esc untuk keluar
  useEffect(() => {
    if (!aktif) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') selesai();
      if (e.key === 'ArrowRight') setI((n) => Math.min(n + 1, LANGKAH.length - 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [aktif, selesai]);

  if (!aktif || !langkah) return null;

  const terakhir = i === LANGKAH.length - 1;

  // Kartu penjelasan: di bawah elemen kalau muat, kalau tidak di atasnya.
  const lebarKartu = Math.min(360, window.innerWidth - 32);
  let gayaKartu: React.CSSProperties = {
    width: lebarKartu,
    left: Math.max(16, (window.innerWidth - lebarKartu) / 2),
    top: Math.max(16, window.innerHeight / 2 - 120),
  };
  if (kotak) {
    const bawah = kotak.top + kotak.height + JARAK;
    const muatDiBawah = bawah + 200 < window.innerHeight;
    gayaKartu = {
      width: lebarKartu,
      left: Math.min(Math.max(16, kotak.left + kotak.width / 2 - lebarKartu / 2), window.innerWidth - lebarKartu - 16),
      top: muatDiBawah ? bawah : Math.max(16, kotak.top - JARAK - 200),
    };
  }

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label="Tur pengenalan Bluebook">
      {/* Lapisan gelap — dipotong jadi 4 bagian supaya elemen yang disorot tetap terang */}
      {kotak ? (
        <>
          <div className="absolute inset-x-0 top-0 bg-black/60" style={{ height: Math.max(kotak.top, 0) }} />
          <div
            className="absolute inset-x-0 bottom-0 bg-black/60"
            style={{ top: kotak.top + kotak.height }}
          />
          <div
            className="absolute left-0 bg-black/60"
            style={{ top: kotak.top, height: kotak.height, width: Math.max(kotak.left, 0) }}
          />
          <div
            className="absolute right-0 bg-black/60"
            style={{ top: kotak.top, height: kotak.height, left: kotak.left + kotak.width }}
          />
          <div
            className="pointer-events-none absolute rounded-xl ring-2 ring-primary ring-offset-2 ring-offset-transparent transition-all duration-200"
            style={{ top: kotak.top, left: kotak.left, width: kotak.width, height: kotak.height }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-black/60" />
      )}

      <div
        className={cn('absolute rounded-xl border bg-card p-5 shadow-2xl transition-all duration-200')}
        style={gayaKartu}
      >
        <button
          type="button"
          onClick={selesai}
          aria-label="Tutup tur"
          className="absolute right-3 top-3 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <p className="text-xs font-medium text-muted-foreground">
          Langkah {i + 1} dari {LANGKAH.length}
        </p>
        <h3 className="mt-1 pr-6 font-display text-lg font-bold">{langkah.judul}</h3>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{langkah.isi}</p>

        <div className="mt-5 flex items-center gap-2">
          <div className="flex flex-1 gap-1.5" aria-hidden>
            {LANGKAH.map((_, n) => (
              <span
                key={n}
                className={cn('h-1.5 rounded-full transition-all', n === i ? 'w-5 bg-primary' : 'w-1.5 bg-muted-foreground/30')}
              />
            ))}
          </div>
          {i > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setI((n) => Math.max(0, n - 1))}>
              Kembali
            </Button>
          )}
          {!terakhir && (
            <Button variant="ghost" size="sm" onClick={selesai}>
              Lewati
            </Button>
          )}
          <Button size="sm" onClick={() => (terakhir ? selesai() : setI((n) => n + 1))}>
            {terakhir ? 'Selesai' : 'Lanjut'}
          </Button>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default AppTour;
