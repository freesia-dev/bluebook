import React, { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWrapped, type WrappedData } from '@/hooks/use-wrapped';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fmtRp } from '@/lib/loan-calc';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Keyboard,
  Loader2,
  Calculator,
  CalendarDays,
  Clock,
  LayoutGrid,
  Sparkles,
  X,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Bagian-bagian kecil                                                       */
/* -------------------------------------------------------------------------- */

const AngkaBesar: React.FC<{ children: React.ReactNode; kecil?: boolean }> = ({ children, kecil }) => (
  <p
    className={cn(
      'font-display font-black leading-none tracking-tight tabular-nums',
      kecil ? 'text-4xl sm:text-5xl' : 'text-6xl sm:text-7xl lg:text-8xl',
    )}
  >
    {children}
  </p>
);

interface Slide {
  id: string;
  /** Gradasi latar khas slide ini */
  latar: string;
  isi: React.ReactNode;
}

const Ikon: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
    {children}
  </div>
);

const Kecil: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/70">{children}</p>
);

const Keterangan: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-5 max-w-md text-base leading-relaxed text-white/85 sm:text-lg">{children}</p>
);

/** Grafik batang sederhana per bulan — tanpa library, biar ringan. */
const BatangBulanan: React.FC<{ data: number[] }> = ({ data }) => {
  const maks = Math.max(...data, 1);
  const huruf = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  return (
    <div className="mt-8 flex h-28 w-full max-w-md items-stretch gap-1.5">
      {data.map((n, i) => (
        // Kolom harus punya tinggi pasti, supaya tinggi batang dalam persen terhitung
        <div key={i} className="flex h-full flex-1 flex-col items-center gap-1.5">
          {/* Kotak batang punya tinggi pasti (flex-1), jadi tinggi persen terhitung
              dan huruf bulannya tidak pernah ketiban batang */}
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t bg-white/85"
              style={{ height: `${Math.max((n / maks) * 100, 4)}%` }}
              title={`${huruf[i]}: ${n}`}
            />
          </div>
          <span className="shrink-0 text-[10px] leading-none text-white/60">{huruf[i]}</span>
        </div>
      ))}
    </div>
  );
};

function susunSlide(d: WrappedData): Slide[] {
  const panggilan = d.nama?.split(' ')[0] || 'Kamu';
  const slides: Slide[] = [];

  slides.push({
    id: 'pembuka',
    latar: 'from-[#0b2545] via-[#13315c] to-[#0b2545]',
    isi: (
      <>
        <Ikon>
          <Sparkles className="h-7 w-7" />
        </Ikon>
        <Kecil>Bluebook Wrapped</Kecil>
        <AngkaBesar>{d.tahun}</AngkaBesar>
        <Keterangan>
          Halo {panggilan} — ini rangkuman setahunmu di Bluebook. Geser atau ketuk untuk lanjut.
        </Keterangan>
      </>
    ),
  });

  slides.push({
    id: 'aktivitas',
    latar: 'from-[#12355b] via-[#1d4e89] to-[#12355b]',
    isi: (
      <>
        <Ikon>
          <LayoutGrid className="h-7 w-7" />
        </Ikon>
        <Kecil>Jejakmu tahun ini</Kecil>
        <AngkaBesar>{d.totalAktivitas.toLocaleString('id-ID')}</AngkaBesar>
        <Keterangan>
          data kamu tambahkan, ubah, dan rapikan sepanjang {d.tahun}
          {d.totalAktivitasKantor > 0 && (
            <>
              {' '}
              — dari total {d.totalAktivitasKantor.toLocaleString('id-ID')} perubahan satu kantor.
            </>
          )}
        </Keterangan>
      </>
    ),
  });

  if (d.modulTeratas.length > 0) {
    slides.push({
      id: 'modul',
      latar: 'from-[#1b3a2f] via-[#276749] to-[#1b3a2f]',
      isi: (
        <>
          <Ikon>
            <LayoutGrid className="h-7 w-7" />
          </Ikon>
          <Kecil>Paling sering kamu buka</Kecil>
          <ol className="mt-4 w-full max-w-md space-y-3">
            {d.modulTeratas.map((m, i) => (
              <li key={m.label} className="flex items-baseline gap-4">
                <span className="font-display text-3xl font-black text-white/50">{i + 1}</span>
                <span className="flex-1 text-xl font-bold sm:text-2xl">{m.label}</span>
                <span className="tabular-nums text-white/70">{m.jumlah.toLocaleString('id-ID')}</span>
              </li>
            ))}
          </ol>
          <Keterangan>Tiga modul yang paling sering kamu sentuh tahun ini.</Keterangan>
        </>
      ),
    });
  }

  if (d.bulanTersibuk) {
    slides.push({
      id: 'bulan',
      latar: 'from-[#4a2545] via-[#6b2d5c] to-[#4a2545]',
      isi: (
        <>
          <Ikon>
            <CalendarDays className="h-7 w-7" />
          </Ikon>
          <Kecil>Bulan tersibukmu</Kecil>
          <AngkaBesar kecil>{d.bulanTersibuk.nama}</AngkaBesar>
          <Keterangan>
            {d.bulanTersibuk.jumlah.toLocaleString('id-ID')} perubahan data dalam satu bulan. Semoga bukan karena
            tutup buku.
          </Keterangan>
          <BatangBulanan data={d.perBulan} />
        </>
      ),
    });
  }

  if (d.hariFavorit && d.jamFavorit) {
    slides.push({
      id: 'ritme',
      latar: 'from-[#3d2b1f] via-[#6b4423] to-[#3d2b1f]',
      isi: (
        <>
          <Ikon>
            <Clock className="h-7 w-7" />
          </Ikon>
          <Kecil>Ritme kerjamu</Kecil>
          <AngkaBesar kecil>{d.hariFavorit.nama}</AngkaBesar>
          <Keterangan>
            hari paling produktifmu, dan jam {String(d.jamFavorit.jam).padStart(2, '0')}.00 jadi jam tersibuk.
            {d.jamFavorit.jam >= 17 && ' Jangan lupa pulang, ya.'}
            {d.jamFavorit.jam < 8 && ' Datang pagi terus rupanya.'}
          </Keterangan>
        </>
      ),
    });
  }

  if (d.simulasi.jumlah > 0) {
    slides.push({
      id: 'simulasi',
      latar: 'from-[#0f3d3e] via-[#14746f] to-[#0f3d3e]',
      isi: (
        <>
          <Ikon>
            <Calculator className="h-7 w-7" />
          </Ikon>
          <Kecil>Kalkulator kredit</Kecil>
          <AngkaBesar>{d.simulasi.jumlah.toLocaleString('id-ID')}</AngkaBesar>
          <Keterangan>
            simulasi kamu buat tahun ini, dengan total plafon {fmtRp(d.simulasi.totalPlafon)}
            {d.simulasi.plafonTerbesar > 0 && <> — yang terbesar {fmtRp(d.simulasi.plafonTerbesar)}.</>}
          </Keterangan>
        </>
      ),
    });
  }

  if (d.commandPalette > 0) {
    slides.push({
      id: 'ctrlk',
      latar: 'from-[#2b2d42] via-[#3f4270] to-[#2b2d42]',
      isi: (
        <>
          <Ikon>
            <Keyboard className="h-7 w-7" />
          </Ikon>
          <Kecil>Jalan pintas</Kecil>
          <AngkaBesar>{d.commandPalette.toLocaleString('id-ID')}×</AngkaBesar>
          <Keterangan>
            kamu tekan Ctrl + K untuk lompat ke halaman atau mencari data. Itu{' '}
            {d.commandPalette > 100 ? 'kebiasaan yang bagus.' : 'awal yang bagus.'}
          </Keterangan>
        </>
      ),
    });
  }

  if (d.hariAktif > 0) {
    slides.push({
      id: 'runtutan',
      latar: 'from-[#5c1f1f] via-[#8c2f2f] to-[#5c1f1f]',
      isi: (
        <>
          <Ikon>
            <Flame className="h-7 w-7" />
          </Ikon>
          <Kecil>Hari aktif</Kecil>
          <AngkaBesar>{d.hariAktif.toLocaleString('id-ID')}</AngkaBesar>
          <Keterangan>
            hari kamu membuka Bluebook tahun ini
            {d.runtutanTerpanjang > 1 && <>, dengan runtutan terpanjang {d.runtutanTerpanjang} hari berturut-turut</>}.
          </Keterangan>
        </>
      ),
    });
  }

  slides.push({
    id: 'penutup',
    latar: 'from-[#0b2545] via-[#134074] to-[#0b2545]',
    isi: (
      <>
        <Ikon>
          <Sparkles className="h-7 w-7" />
        </Ikon>
        <Kecil>Sampai jumpa</Kecil>
        <AngkaBesar kecil>Terima kasih, {panggilan}</AngkaBesar>
        <Keterangan>
          Semua yang kamu rapikan tahun ini bikin kerjaan satu kantor lebih gampang. Sampai ketemu di Wrapped{' '}
          {d.tahun + 1}.
        </Keterangan>
      </>
    ),
  });

  return slides;
}

/* -------------------------------------------------------------------------- */
/*  Halaman                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Bluebook Wrapped — rangkuman pekerjaan setahun, disajikan seperti "story":
 * satu angka besar per layar, ketuk untuk lanjut. Di HP memakai seluruh layar,
 * di layar lebar disajikan sebagai panggung 16:9 di tengah.
 *
 * Halaman ini sengaja TIDAK memakai MainLayout — sidebar dan header akan
 * merusak suasananya. Penjagaan akses dilakukan sendiri di bawah.
 */
const WrappedPage: React.FC = () => {
  const { isAuthenticated, isApproved, userName } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useWrapped(userName || '');
  const [i, setI] = useState(0);

  const slides = useMemo(() => (data ? susunSlide(data) : []), [data]);
  const total = slides.length;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') setI((n) => Math.min(n + 1, total - 1));
      if (e.key === 'ArrowLeft') setI((n) => Math.max(n - 1, 0));
      if (e.key === 'Escape') navigate('/dashboard');
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [total, navigate]);

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isApproved) return <Navigate to="/dashboard" replace />;

  if (isLoading || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b2545] text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p className="text-sm text-white/70">Menyiapkan rangkumanmu…</p>
        </div>
      </div>
    );
  }

  if (data.kosong) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0b2545] px-6 text-center text-white">
        <Sparkles className="h-8 w-8 text-white/70" />
        <h1 className="font-display text-2xl font-bold">Belum ada yang bisa dirangkum</h1>
        <p className="max-w-sm text-white/75">
          Wrapped {data.tahun} akan terisi sendiri sambil kamu bekerja. Coba lagi nanti.
        </p>
        <Button variant="secondary" onClick={() => navigate('/dashboard')}>
          Kembali ke Dashboard
        </Button>
      </div>
    );
  }

  const slide = slides[Math.min(i, total - 1)];
  const terakhir = i >= total - 1;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#07152b] p-0 lg:p-8">
      <div
        className={cn(
          'relative w-full overflow-hidden bg-gradient-to-br text-white',
          // HP: seluruh layar. Layar lebar: panggung membulat di tengah.
          'min-h-screen lg:min-h-0 lg:aspect-[16/9] lg:max-w-5xl lg:rounded-3xl lg:shadow-2xl',
          slide.latar,
        )}
      >
        {/* Bilah kemajuan ala story */}
        <div className="absolute inset-x-0 top-0 z-20 flex gap-1.5 p-4">
          {slides.map((s, n) => (
            <span key={s.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/25">
              <span className={cn('block h-full rounded-full bg-white transition-all duration-300', n <= i ? 'w-full' : 'w-0')} />
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          aria-label="Tutup Wrapped"
          className="absolute right-4 top-8 z-20 rounded-full bg-white/10 p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Area ketuk kiri/kanan (HP) */}
        <button
          type="button"
          aria-label="Sebelumnya"
          onClick={() => setI((n) => Math.max(0, n - 1))}
          className="absolute inset-y-0 left-0 z-10 w-1/3 cursor-default focus:outline-none"
        />
        <button
          type="button"
          aria-label="Berikutnya"
          onClick={() => setI((n) => Math.min(total - 1, n + 1))}
          className="absolute inset-y-0 right-0 z-10 w-2/3 cursor-default focus:outline-none"
        />

        <div key={slide.id} className="relative z-0 flex min-h-screen flex-col justify-center px-7 py-20 animate-fade-in lg:min-h-0 lg:h-full lg:px-16">
          {slide.isi}
        </div>

        {/* Tombol navigasi yang kelihatan (supaya tidak harus menebak) */}
        <div className="absolute inset-x-0 bottom-0 z-20 flex items-center justify-between gap-3 p-5 lg:p-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setI((n) => Math.max(0, n - 1))}
            disabled={i === 0}
            className="text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-0"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Kembali
          </Button>
          <span className="text-xs text-white/60">
            {i + 1} / {total}
          </span>
          {terakhir ? (
            <Button size="sm" variant="secondary" onClick={() => navigate('/dashboard')}>
              Selesai
            </Button>
          ) : (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setI((n) => Math.min(total - 1, n + 1))}
            >
              Lanjut <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WrappedPage;
