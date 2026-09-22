import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Maximize, Minimize, X, AlertTriangle, Radio } from 'lucide-react';
import { fmtIDR, fmtNum, KOL_COLOR, kolDisplay } from '@/lib/mlf-utils';
import { cn } from '@/lib/utils';

/* -------------------------------------------------------------------------- */
/*  Tipe data yang dioper dari MonitoringDashboardPage                        */
/* -------------------------------------------------------------------------- */

interface KolItem { kol: number; name: string; count: number; baki: number; tunggakan: number }
interface AoItem { ao: string; count: number; baki: number; tunggakan: number; nplRatio: number }

export interface ControlRoomStats {
  totalDebitur: number;
  totalBaki: number;
  totalPlafon: number;
  totalTunggakan: number;
  nplRatio: number;
  nplBaki: number;
  nplCount: number;
  kkrRatio: number;
  kkrBaki: number;
  kkrCount: number;
  tunggakanRatio: number;
  dpkCount: number;
  dpkBaki: number;
  lancarCount: number;
  lancarBaki: number;
  kolData: KolItem[];
  aoData: AoItem[];
  topDebitur: any[];
}

interface Props {
  open: boolean;
  onClose: () => void;
  branchLabel: string;
  jobdate?: string;
  stats: ControlRoomStats;
  baruCair: { count: number; plafon: number; available: boolean };
  baruLunas: { count: number; baki: number; available: boolean };
  akanLunas: { count: number; baki: number; rangeLabel: string };
  arrearsMap?: Map<string, any>;
}

/* -------------------------------------------------------------------------- */
/*  Util                                                                      */
/* -------------------------------------------------------------------------- */

const tone = (value: number, warn: number, bad: number) =>
  value >= bad ? 'bad' : value >= warn ? 'warn' : 'good';

const TONE_HEX = { good: '#34d399', warn: '#fbbf24', bad: '#f87171' } as const;
const TONE_TEXT = { good: 'text-emerald-300', warn: 'text-amber-300', bad: 'text-rose-300' } as const;
const TONE_LABEL = { good: 'AMAN', warn: 'WASPADA', bad: 'KRITIS' } as const;

/** Singkat angka rupiah besar jadi "12,4 M" / "850 jt" supaya muat di layar TV. */
const shortIDR = (n: number) => {
  const a = Math.abs(n);
  if (a >= 1e12) return `${(n / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 2 })} T`;
  if (a >= 1e9) return `${(n / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
  if (a >= 1e6) return `${(n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  return fmtNum(n);
};

/* -------------------------------------------------------------------------- */
/*  Komponen kecil                                                            */
/* -------------------------------------------------------------------------- */

const Panel: React.FC<{ title?: string; right?: React.ReactNode; className?: string; children: React.ReactNode }> = ({
  title,
  right,
  className,
  children,
}) => (
  <section
    className={cn(
      'relative flex flex-col overflow-hidden rounded-2xl lg:min-h-0 border border-cyan-500/15 bg-[#0a1526]/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]',
      className,
    )}
  >
    {title && (
      <header className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-200/70">{title}</h3>
        {right}
      </header>
    )}
    {children}
  </section>
);

/** Gauge setengah lingkaran untuk rasio (%). */
const Gauge: React.FC<{
  label: string;
  value: number;
  max: number;
  warn: number;
  bad: number;
  sub?: string;
}> = ({ label, value, max, warn, bad, sub }) => {
  const t = tone(value, warn, bad);
  const pct = Math.max(0, Math.min(1, value / max));
  const R = 80;
  const C = Math.PI * R; // panjang busur setengah lingkaran
  const markerAngle = (v: number) => Math.PI * (1 - Math.min(1, v / max));
  const marker = (v: number, color: string) => {
    const a = markerAngle(v);
    const x1 = 100 + (R - 12) * Math.cos(a);
    const y1 = 100 - (R - 12) * Math.sin(a);
    const x2 = 100 + (R + 12) * Math.cos(a);
    const y2 = 100 - (R + 12) * Math.sin(a);
    return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2} strokeLinecap="round" opacity={0.8} />;
  };
  return (
    <div className="flex min-w-0 flex-col items-center">
      <svg viewBox="0 0 200 115" className="w-full max-w-[260px]" role="img" aria-label={`${label} ${value.toFixed(2)}%`}>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="rgba(148,163,184,0.15)" strokeWidth={14} strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={TONE_HEX[t]}
          strokeWidth={14}
          strokeLinecap="round"
          strokeDasharray={`${C * pct} ${C}`}
          style={{ transition: 'stroke-dasharray 900ms ease, stroke 300ms ease', filter: `drop-shadow(0 0 6px ${TONE_HEX[t]}66)` }}
        />
        {marker(warn, TONE_HEX.warn)}
        {marker(bad, TONE_HEX.bad)}
        <text x="100" y="96" textAnchor="middle" className="fill-white" style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
          {value.toFixed(2)}
          <tspan style={{ fontSize: 14, fontWeight: 600 }} dx="2">%</tspan>
        </text>
      </svg>
      <div className="-mt-1 text-center">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-300 sm:text-xs sm:tracking-[0.18em]">{label}</div>
        <div className={cn('mt-1 text-[11px] font-bold tracking-widest', TONE_TEXT[t])}>● {TONE_LABEL[t]}</div>
        {sub && <div className="mt-1 text-[11px] text-slate-400">{sub}</div>}
      </div>
    </div>
  );
};

const Tile: React.FC<{ label: string; value: string; sub?: string; accent?: string }> = ({ label, value, sub, accent = '#22d3ee' }) => (
  <div className="relative min-w-0 overflow-hidden rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3">
    <div className="absolute inset-y-0 left-0 w-1" style={{ background: accent }} />
    <div className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">{label}</div>
    <div className="mt-1 truncate text-xl font-extrabold tabular-nums text-white sm:text-2xl xl:text-3xl">{value}</div>
    {sub && <div className="mt-0.5 truncate text-[11px] text-slate-400">{sub}</div>}
  </div>
);

/* -------------------------------------------------------------------------- */
/*  Mode Ruang Kontrol                                                        */
/* -------------------------------------------------------------------------- */

/**
 * Tampilan layar penuh bergaya "ruang kontrol" untuk Dashboard Monitoring —
 * dirancang untuk dipajang di TV/monitor kantor: latar gelap, angka besar,
 * indikator warna ambang batas (aman/waspada/kritis), jam live, dan daftar
 * tunggakan yang berganti otomatis. Layar dijaga tetap menyala (Wake Lock)
 * selama mode aktif kalau browser mendukung.
 */
export const ControlRoomMode: React.FC<Props> = ({
  open,
  onClose,
  branchLabel,
  jobdate,
  stats,
  baruCair,
  baruLunas,
  akanLunas,
  arrearsMap,
}) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(() => new Date());
  const [isFs, setIsFs] = useState(false);
  const [page, setPage] = useState(0);

  // Jam live
  useEffect(() => {
    if (!open) return;
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, [open]);

  // Esc untuk keluar, kunci scroll halaman di belakang
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.fullscreenElement) onClose();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  // Status fullscreen
  useEffect(() => {
    const on = () => setIsFs(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);

  // Jaga layar tetap menyala (kalau didukung)
  useEffect(() => {
    if (!open) return;
    let lock: any = null;
    let released = false;
    const request = async () => {
      try {
        const wl = (navigator as any).wakeLock;
        if (wl && document.visibilityState === 'visible') lock = await wl.request('screen');
      } catch {
        /* tidak didukung / ditolak — abaikan */
      }
    };
    void request();
    const onVis = () => {
      if (!released && document.visibilityState === 'visible') void request();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      released = true;
      document.removeEventListener('visibilitychange', onVis);
      try {
        lock?.release?.();
      } catch {
        /* noop */
      }
    };
  }, [open]);

  // Rotasi daftar tunggakan teratas
  const PAGE_SIZE = 5;
  const pages = Math.max(1, Math.ceil(stats.topDebitur.length / PAGE_SIZE));
  useEffect(() => {
    if (!open || pages <= 1) return;
    const t = window.setInterval(() => setPage((p) => (p + 1) % pages), 7000);
    return () => window.clearInterval(t);
  }, [open, pages]);
  useEffect(() => {
    if (page >= pages) setPage(0);
  }, [page, pages]);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await (rootRef.current ?? document.documentElement).requestFullscreen();
    } catch {
      /* browser menolak — tetap tampil sebagai overlay biasa */
    }
  };

  const handleClose = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
    } catch {
      /* noop */
    }
    onClose();
  };

  const kolTotal = useMemo(() => stats.kolData.reduce((s, k) => s + k.baki, 0) || 1, [stats.kolData]);
  const aoTop = useMemo(() => stats.aoData.slice(0, 8), [stats.aoData]);
  const aoMaxTunggakan = Math.max(1, ...aoTop.map((a) => a.tunggakan));
  const nplTone = tone(stats.nplRatio, 2, 5);
  const visibleDebitur = stats.topDebitur.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  if (!open) return null;

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Mode ruang kontrol monitoring"
      className="fixed inset-0 z-[150] flex flex-col overflow-y-auto bg-[#040914] text-slate-100 lg:overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(ellipse at top, rgba(34,211,238,0.08), transparent 55%), linear-gradient(rgba(148,163,184,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.04) 1px, transparent 1px)',
        backgroundSize: '100% 100%, 40px 40px, 40px 40px',
      }}
    >
      {/* Bar atas */}
      <header className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-cyan-500/10 px-4 py-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-cyan-300/80">
              <Radio className="h-3.5 w-3.5" /> Ruang Kontrol · KKR &amp; NPL
            </div>
            <div className="truncate text-sm font-semibold text-white lg:text-base">{branchLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl font-bold tabular-nums tracking-tight text-white lg:text-3xl">
              {format(now, 'HH:mm:ss')}
            </div>
            <div className="text-[11px] text-slate-400">
              {format(now, 'EEEE, dd MMMM yyyy', { locale: idLocale })}
              {jobdate && <> · data MLF {format(new Date(jobdate), 'dd MMM yyyy', { locale: idLocale })}</>}
            </div>
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-white/10"
              title={isFs ? 'Keluar layar penuh' : 'Layar penuh (cocok untuk TV)'}
            >
              {isFs ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-200 hover:bg-rose-500/20 hover:text-rose-200"
              title="Keluar mode ruang kontrol (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {nplTone === 'bad' && (
        <div className="flex shrink-0 items-center justify-center gap-2 bg-rose-500/15 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-rose-200">
          <AlertTriangle className="h-4 w-4 animate-pulse" /> NPL di atas batas 5% — perlu tindakan
        </div>
      )}

      {/* Isi */}
      <main className="grid flex-1 grid-cols-1 lg:min-h-0 gap-4 p-4 lg:grid-cols-12 lg:grid-rows-[auto_minmax(0,1fr)] lg:p-6">
        {/* Gauge */}
        <Panel title="Indikator Kualitas Kredit" className="lg:col-span-7">
          <div className="grid flex-1 grid-cols-3 content-center gap-2 sm:gap-4">
            <Gauge
              label="Rasio NPL"
              value={stats.nplRatio}
              max={10}
              warn={2}
              bad={5}
              sub={`${fmtNum(stats.nplCount)} deb · ${shortIDR(stats.nplBaki)}`}
            />
            <Gauge
              label="Rasio KKR"
              value={stats.kkrRatio}
              max={30}
              warn={10}
              bad={15}
              sub={`${fmtNum(stats.kkrCount)} deb · ${shortIDR(stats.kkrBaki)}`}
            />
            <Gauge
              label="Tunggakan / OS"
              value={stats.tunggakanRatio}
              max={10}
              warn={2}
              bad={5}
              sub={shortIDR(stats.totalTunggakan)}
            />
          </div>
        </Panel>

        {/* KPI */}
        <Panel title="Portofolio" className="lg:col-span-5">
          <div className="grid grid-cols-2 gap-3">
            <Tile label="Total Debitur" value={fmtNum(stats.totalDebitur)} sub="non-ekstrakom" accent="#38bdf8" />
            <Tile label="Outstanding" value={shortIDR(stats.totalBaki)} sub={`Plafon ${shortIDR(stats.totalPlafon)}`} accent="#34d399" />
            <Tile label="DPK (KOL 2)" value={fmtNum(stats.dpkCount)} sub={shortIDR(stats.dpkBaki)} accent="#fbbf24" />
            <Tile label="Akan Lunas" value={fmtNum(akanLunas.count)} sub={akanLunas.rangeLabel || '—'} accent="#a78bfa" />
            <Tile
              label="Baru Cair (bln ini)"
              value={baruCair.available ? fmtNum(baruCair.count) : '—'}
              sub={baruCair.available ? `Plafon ${shortIDR(baruCair.plafon)}` : 'butuh baseline'}
              accent="#22d3ee"
            />
            <Tile
              label="Lunas / Ditutup"
              value={baruLunas.available ? fmtNum(baruLunas.count) : '—'}
              sub={baruLunas.available ? shortIDR(baruLunas.baki) : 'butuh baseline'}
              accent="#60a5fa"
            />
          </div>
        </Panel>

        {/* KOL */}
        <Panel title="Komposisi Outstanding per KOL" className="lg:col-span-4">
          <div className="flex h-5 w-full overflow-hidden rounded-full bg-white/5">
            {stats.kolData.map((k) => (
              <div
                key={k.kol}
                className="h-full transition-all duration-700"
                style={{ width: `${(k.baki / kolTotal) * 100}%`, background: KOL_COLOR[k.kol] || '#94a3b8' }}
                title={`KOL ${kolDisplay(k.kol)}`}
              />
            ))}
          </div>
          <ul className="mt-4 space-y-2.5 overflow-y-auto">
            {stats.kolData.map((k) => (
              <li key={k.kol} className="flex items-center gap-3 text-sm">
                <span className="h-3 w-3 shrink-0 rounded-sm" style={{ background: KOL_COLOR[k.kol] || '#94a3b8' }} />
                <span className="min-w-0 flex-1 truncate text-slate-300">{k.name}</span>
                <span className="w-14 text-right tabular-nums text-slate-400">{fmtNum(k.count)}</span>
                <span className="w-20 text-right font-semibold tabular-nums text-white">{shortIDR(k.baki)}</span>
                <span className="w-14 text-right text-xs tabular-nums text-slate-400">
                  {((k.baki / kolTotal) * 100).toFixed(1)}%
                </span>
              </li>
            ))}
          </ul>
        </Panel>

        {/* AO */}
        <Panel title="Tunggakan per AO" className="lg:col-span-3">
          {aoTop.length === 0 ? (
            <p className="text-sm text-slate-500">Tidak ada data.</p>
          ) : (
            <ul className="space-y-3 overflow-y-auto">
              {aoTop.map((a) => {
                const t = tone(a.nplRatio, 2, 5);
                return (
                  <li key={a.ao}>
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="truncate font-semibold text-white">{a.ao}</span>
                      <span className={cn('text-xs font-bold tabular-nums', TONE_TEXT[t])}>NPL {a.nplRatio.toFixed(1)}%</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-rose-500 transition-all duration-700"
                        style={{ width: `${(a.tunggakan / aoMaxTunggakan) * 100}%` }}
                      />
                    </div>
                    <div className="mt-0.5 flex justify-between text-[11px] text-slate-500">
                      <span>{fmtNum(a.count)} deb</span>
                      <span className="tabular-nums">{shortIDR(a.tunggakan)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>

        {/* Top tunggakan (berganti otomatis) */}
        <Panel
          title="Tunggakan Tertinggi"
          className="lg:col-span-5"
          right={
            pages > 1 ? (
              <div className="flex gap-1">
                {Array.from({ length: pages }).map((_, i) => (
                  <span key={i} className={cn('h-1.5 w-4 rounded-full', i === page ? 'bg-cyan-400' : 'bg-white/10')} />
                ))}
              </div>
            ) : undefined
          }
        >
          {visibleDebitur.length === 0 ? (
            <p className="text-sm text-slate-500">Tidak ada debitur dengan tunggakan berjalan. 🎉</p>
          ) : (
            <ol key={page} className="space-y-2 overflow-y-auto animate-in fade-in duration-500">
              {visibleDebitur.map((d, i) => {
                const ar = arrearsMap?.get(d.l0lnno || '');
                const hari = ar?.hariTunggak as number | undefined;
                return (
                  <li key={d.id ?? `${page}-${i}`} className="flex items-center gap-3 rounded-lg bg-white/[0.03] px-3 py-2">
                    <span className="w-6 text-center text-sm font-bold tabular-nums text-cyan-300/80">
                      {page * PAGE_SIZE + i + 1}
                    </span>
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-bold text-white"
                      style={{ background: KOL_COLOR[Number(d.kol) || 0] || '#94a3b8' }}
                      title="KOL"
                    >
                      {kolDisplay(d.kol)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-white">{d.l0name}</div>
                      <div className="truncate text-[11px] text-slate-500">
                        {d.l0usid || '-'} · OS {shortIDR(Number(d.baki) || 0)}
                        {hari != null && <> · {hari} hari</>}
                      </div>
                    </div>
                    <span className="text-right text-sm font-bold tabular-nums text-amber-300">{fmtIDR(d.tunggakan)}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </Panel>
      </main>

      <footer className="shrink-0 px-6 pb-3 text-center text-[10px] uppercase tracking-[0.25em] text-slate-600">
        Bluebook Telihan · Basis NPL: outstanding non-ekstrakomtabel · Tekan Esc untuk keluar
      </footer>
    </div>,
    document.body,
  );
};

export default ControlRoomMode;
