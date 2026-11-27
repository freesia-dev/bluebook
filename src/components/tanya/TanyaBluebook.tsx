import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Calendar, CheckCircle2, Clock, LineChart, Send, User, X, FlaskConical } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import maskot from '@/assets/tanya/maskot.webp';
import kepala from '@/assets/tanya/maskot-kepala.webp';
import { pahami, bulanDepanLabel, bulanIniLabel } from '@/lib/tanya/pahami';
import { jalankan } from '@/lib/tanya/jalankan';
import { siapkanSumber, tanyaAi, type GagalAi } from '@/lib/tanya/sumber';
import type { HasilTanya } from '@/lib/tanya/jawaban';
import type { Skenario, UnitTanya } from '@/lib/tanya/perintah';
import { BarisPaham, IsiJawaban } from './JawabanTanya';
import './tanya.css';

export const BUKA_TANYA = 'tanya-bluebook:buka';

/** Buka pop up Tanya Bluebook dari mana saja, opsional langsung dengan pertanyaan. */
export const bukaTanya = (teks?: string) => window.dispatchEvent(new CustomEvent(BUKA_TANYA, { detail: { teks } }));

/** Tanya Bluebook memakai data MLF, jadi hanya untuk peran yang boleh membuka Loan Monitoring. */
export const useBolehTanya = () => {
  const { permissions } = useAuth();
  return !!(permissions.monitoring || permissions.executiveDashboard);
};

const KUNCI_RIWAYAT = 'tanya-bluebook:riwayat';
const bacaRiwayat = (): string[] => {
  try {
    const v = JSON.parse(localStorage.getItem(KUNCI_RIWAYAT) || '[]');
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 6) : [];
  } catch {
    return [];
  }
};
const simpanRiwayat = (teks: string) => {
  try {
    const baru = [teks, ...bacaRiwayat().filter((x) => x.toLowerCase() !== teks.toLowerCase())].slice(0, 6);
    localStorage.setItem(KUNCI_RIWAYAT, JSON.stringify(baru));
  } catch {
    /* penyimpanan browser tidak tersedia */
  }
};

type Pesan =
  | { id: number; dari: 'saya'; teks: string }
  | { id: number; dari: 'bb'; kalimat: string; status: 'memuat' }
  | { id: number; dari: 'bb'; kalimat: string; status: 'siap'; hasil: HasilTanya; sumber: 'pola' | 'ai' };

const PESAN_GAGAL: Record<GagalAi, string> = {
  belum_dipasang: 'Bluebook belum mengenali pertanyaan ini, dan bantuan AI belum dipasang. Coba tulis dengan pola seperti contoh di bawah.',
  jatah_habis: 'Bluebook belum mengenali pertanyaan ini, dan jatah AI gratis hari ini sudah habis. Pertanyaan berpola seperti contoh di bawah tetap bisa dijawab.',
  gagal: 'Bluebook belum mengenali pertanyaan ini dan AI sedang tidak bisa dihubungi. Coba lagi sebentar, atau pakai contoh di bawah.',
  tidak_paham: 'Maaf, Bluebook belum paham maksudnya. Coba tulis lebih singkat, misalnya seperti contoh di bawah.',
};

const SARAN_DASAR = [
  'info debitur atas nama …',
  'siapa yang jatuh tempo bulan depan?',
  'berapa NPL Telihan?',
  'debitur kol 2 ke atas',
  'simulasikan kalau … jadi kol 5, berapa NPL?',
];

/** Tombol di kepala halaman: "Tanya Bluebook!" */
export const TombolTanya: React.FC<{ className?: string }> = ({ className }) => {
  const boleh = useBolehTanya();
  if (!boleh) return null;
  return (
    <button
      type="button"
      onClick={() => bukaTanya()}
      className={cn(
        'group inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-br from-[#0a508a] to-[#1167b1] py-1 pl-1.5 pr-3.5 text-sm font-extrabold text-white shadow-[0_6px_16px_rgba(10,80,138,0.35)] transition hover:-translate-y-px hover:shadow-[0_10px_22px_rgba(10,80,138,0.4)]',
        className,
      )}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95">
        <img src={kepala} alt="" className="h-7 w-7 object-contain transition group-hover:scale-110" />
      </span>
      Tanya Bluebook!
      <kbd className="hidden rounded bg-white/20 px-1.5 font-mono text-[10px] font-bold sm:inline">/</kbd>
    </button>
  );
};

/**
 * Pop up Tanya Bluebook + tombol bulat melayang. Pasang sekali di halaman
 * (Dashboard). Bisa dibuka dengan TombolTanya, tombol melayang, atau "/".
 */
export const TanyaBluebook: React.FC<{ fab?: boolean }> = ({ fab = true }) => {
  const boleh = useBolehTanya();
  const qc = useQueryClient();
  const [buka, setBuka] = useState(false);
  const [masukan, setMasukan] = useState('');
  const [pesan, setPesan] = useState<Pesan[]>([]);
  const [riwayat, setRiwayat] = useState<string[]>(() => bacaRiwayat());
  const [sim, setSim] = useState<{ langkah: Skenario[]; unit: UnitTanya } | null>(null);
  const idRef = useRef(1);
  const inputRef = useRef<HTMLInputElement>(null);
  const bawahRef = useRef<HTMLDivElement>(null);
  const sibuk = pesan.some((p) => p.dari === 'bb' && p.status === 'memuat');

  const fokus = useCallback(() => window.setTimeout(() => inputRef.current?.focus(), 60), []);

  const tanya = useCallback(async (teksMentah: string) => {
    const teks = teksMentah.trim();
    if (!teks) return;
    const idSaya = idRef.current++;
    const idBb = idRef.current++;
    setPesan((p) => [...p, { id: idSaya, dari: 'saya', teks }, { id: idBb, dari: 'bb', kalimat: teks, status: 'memuat' }]);
    setMasukan('');
    simpanRiwayat(teks);
    setRiwayat(bacaRiwayat());

    const selesai = (hasil: HasilTanya, sumber: 'pola' | 'ai') =>
      setPesan((p) => p.map((m) => (m.id === idBb ? { id: idBb, dari: 'bb', kalimat: teks, status: 'siap', hasil, sumber } : m)));

    try {
      let perintah = pahami(teks);
      let sumber: 'pola' | 'ai' = 'pola';
      if (!perintah) {
        const ai = await tanyaAi(teks);
        if ('gagal' in ai) {
          selesai({ paham: [], jawab: { tipe: 'teks', teks: PESAN_GAGAL[ai.gagal], saran: SARAN_DASAR } }, 'pola');
          return;
        }
        perintah = ai.perintah;
        sumber = 'ai';
      }
      const sumberData = await siapkanSumber(qc);
      const hasil = await jalankan(perintah, sumberData, { kalimat: teks, simulasiSebelumnya: sim ?? undefined });
      if (hasil.simulasi) setSim(hasil.simulasi);
      selesai(hasil, sumber);
    } catch (e) {
      console.error('Tanya Bluebook:', e);
      selesai({ paham: [], jawab: { tipe: 'teks', teks: 'Data belum bisa dimuat. Periksa koneksi lalu coba lagi.' } }, 'pola');
    }
  }, [qc, sim]);

  // buka dari tombol lain / tombol "/"
  useEffect(() => {
    if (!boleh) return;
    const onBuka = (e: Event) => {
      setBuka(true);
      const teks = (e as CustomEvent<{ teks?: string }>).detail?.teks;
      if (teks) void tanya(teks);
      else fokus();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      if (document.querySelector('.sp')) return; // layar sapaan sedang tampil
      e.preventDefault();
      setBuka(true);
      fokus();
    };
    window.addEventListener(BUKA_TANYA, onBuka);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener(BUKA_TANYA, onBuka);
      window.removeEventListener('keydown', onKey);
    };
  }, [boleh, tanya, fokus]);

  useEffect(() => {
    bawahRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [pesan]);

  const ubah = useCallback((teks: string) => {
    setMasukan(teks);
    fokus();
  }, [fokus]);

  const keluarSimulasi = useCallback(() => {
    setSim(null);
    const id = idRef.current++;
    setPesan((p) => [...p, { id, dari: 'bb', kalimat: '', status: 'siap', sumber: 'pola', hasil: { paham: [], jawab: { tipe: 'teks', teks: 'Mode simulasi ditutup. Angka berikutnya kembali memakai data MLF asli.' } } }]);
  }, []);

  if (!boleh) return null;

  const contoh: { ikon: React.ElementType; teks: string; isi?: string }[] = [
    { ikon: User, teks: 'Info debitur atas nama …', isi: 'info debitur atas nama ' },
    { ikon: Calendar, teks: 'Rencana kunjungan debitur yang baru cair 3 bulan terakhir, Telihan' },
    { ikon: Clock, teks: `Siapa saja yang jatuh tempo bulan ${bulanDepanLabel()}?` },
    { ikon: CheckCircle2, teks: `Siapa saja yang lunas bulan ${bulanIniLabel()}?` },
    { ikon: AlertTriangle, teks: 'Debitur kol 2 ke atas, urut tunggakan terbesar' },
    { ikon: LineChart, teks: 'Berapa NPL Telihan sekarang?' },
    { ikon: FlaskConical, teks: 'Simulasikan kalau … jadi kol 5, berapa NPL?', isi: 'simulasikan kalau  jadi kol 5, berapa NPL Telihan?' },
    { ikon: LineChart, teks: 'Berapa yang harus ditagih biar NPL di bawah 2%?' },
  ];

  return (
    <>
      {fab && !buka && (
        <button type="button" className="tb-fab" onClick={() => { setBuka(true); fokus(); }} aria-label="Tanya Bluebook">
          <img src={kepala} alt="" />
          <span className="tb-fab-label">Tanya Bluebook!</span>
        </button>
      )}
      <DialogPrimitive.Root open={buka} onOpenChange={setBuka}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            onOpenAutoFocus={(e) => { e.preventDefault(); fokus(); }}
            className={cn(
              'fixed z-50 flex flex-col overflow-hidden bg-background shadow-2xl outline-none',
              'inset-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[min(780px,90vh)] sm:w-[min(760px,94vw)] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl sm:border',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            )}
          >
            {/* kepala */}
            <div className="flex items-center gap-2.5 border-b bg-gradient-to-b from-muted/40 to-background px-4 py-2.5 pt-[max(10px,env(safe-area-inset-top))]">
              <img src={kepala} alt="" className="h-9 w-9 object-contain" />
              <div className="min-w-0">
                <DialogPrimitive.Title className="font-display text-[15px] font-extrabold leading-tight text-[#0a3558] dark:text-sky-100">Tanya Bluebook!</DialogPrimitive.Title>
                <DialogPrimitive.Description className="truncate text-[10.5px] text-muted-foreground">
                  Tanya apa saja soal data MLF · angka dihitung langsung dari Bluebook
                </DialogPrimitive.Description>
              </div>
              {sim && (
                <button type="button" onClick={keluarSimulasi} className="ml-auto hidden items-center gap-1 rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-bold text-orange-700 sm:inline-flex">
                  <FlaskConical className="h-3 w-3" /> Mode simulasi · tutup
                </button>
              )}
              <DialogPrimitive.Close className={cn('rounded-lg p-1.5 text-muted-foreground hover:bg-muted', !sim && 'ml-auto')}>
                <X className="h-5 w-5" />
                <span className="sr-only">Tutup</span>
              </DialogPrimitive.Close>
            </div>

            {/* isi */}
            <div className="flex-1 overflow-y-auto bg-muted/30 px-3 py-3 sm:px-4">
              {pesan.length === 0 ? (
                <div className="mx-auto max-w-xl">
                  <div className="flex flex-col items-center text-center">
                    <img src={maskot} alt="Tanya Bluebook!" className="tb-maskot-goyang h-36 w-36 object-contain sm:h-44 sm:w-44" />
                    <div className="mt-1 font-display text-lg font-extrabold text-[#0a3558] dark:text-sky-100">Mau cari apa hari ini?</div>
                    <p className="text-[12px] text-muted-foreground">Tanya dengan bahasa sehari-hari. Angka selalu dihitung langsung dari MLF.</p>
                  </div>
                  <div className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-orange-600">Coba tanyakan</div>
                  <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                    {contoh.map(({ ikon: Ikon, teks, isi }) => (
                      <button
                        key={teks}
                        type="button"
                        onClick={() => (isi ? ubah(isi) : void tanya(teks))}
                        className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-left text-[12px] font-semibold text-foreground transition hover:border-primary/50 hover:bg-primary/5"
                      >
                        <Ikon className="h-4 w-4 flex-none text-primary" />
                        {teks}
                      </button>
                    ))}
                  </div>
                  {riwayat.length > 0 && (
                    <>
                      <div className="mt-4 text-[10px] font-extrabold uppercase tracking-[0.14em] text-orange-600">Terakhir ditanyakan</div>
                      <div className="mt-1 flex flex-col">
                        {riwayat.map((r) => (
                          <button key={r} type="button" onClick={() => void tanya(r)} className="flex items-center gap-2 rounded-md px-1 py-1 text-left text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground">
                            <Clock className="h-3 w-3 flex-none" /> {r}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {pesan.map((m) =>
                    m.dari === 'saya' ? (
                      <div key={m.id} className="max-w-[85%] self-end rounded-2xl rounded-br-md bg-primary px-3 py-2 text-[12.5px] font-medium text-primary-foreground">
                        {m.teks}
                      </div>
                    ) : (
                      <div key={m.id} className="flex items-start gap-2">
                        <img src={kepala} alt="" className="mt-0.5 hidden h-7 w-7 flex-none object-contain sm:block" />
                        <div className="min-w-0 flex-1 rounded-2xl rounded-tl-md border bg-background px-3 py-2.5 shadow-sm">
                          {m.status === 'memuat' ? (
                            <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                              <span className="tb-titik"><i /><i /><i /></span> Bluebook sedang menghitung…
                            </div>
                          ) : (
                            <>
                              <BarisPaham paham={m.hasil.paham} sumber={m.sumber} kalimat={m.kalimat} onUbah={ubah} />
                              <IsiJawaban hasil={m.hasil} onTanya={(t) => void tanya(t)} onUbah={ubah} onKeluarSimulasi={keluarSimulasi} />
                            </>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                  <div ref={bawahRef} />
                </div>
              )}
            </div>

            {/* kaki */}
            <form
              className="border-t bg-background px-3 py-2.5 pb-[max(10px,env(safe-area-inset-bottom))]"
              onSubmit={(e) => {
                e.preventDefault();
                if (!sibuk) void tanya(masukan);
              }}
            >
              <div className="flex items-center gap-2 rounded-xl border-2 border-input bg-background py-1 pl-3 pr-1 focus-within:border-primary">
                <input
                  ref={inputRef}
                  value={masukan}
                  onChange={(e) => setMasukan(e.target.value)}
                  maxLength={300}
                  placeholder={sim ? 'Lanjutkan simulasi, mis. "terus kalau … lunas?"' : 'Ketik pertanyaan, mis. "jatuh tempo bulan depan"…'}
                  className="h-9 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                  enterKeyHint="send"
                />
                <button type="submit" disabled={sibuk || !masukan.trim()} className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-primary text-primary-foreground transition disabled:opacity-40" aria-label="Kirim">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  );
};

export default TanyaBluebook;
