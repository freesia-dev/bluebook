import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
    /** Teks setelah angka, default "% dari bulan lalu". Set '' untuk kosongkan. */
    suffix?: string;
    /** true jika turun dianggap bagus (mis. rasio NPL) — membalik warna hijau/merah. */
    invert?: boolean;
  };
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning';
  /**
   * Warna aksen kartu (ikon, garis tipis, sparkline). Dipakai dashboard
   * operasional yang butuh lebih banyak pilihan warna per-kartu ketimbang
   * varian semantik di atas.
   */
  tint?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky';
  className?: string;
  description?: string;
  /** Kartu lebih ringkas (padding & ukuran angka lebih kecil) untuk grid KPI yang padat. */
  compact?: boolean;
  /**
   * Deretan angka riwayat (mis. 6-12 bulan terakhir) untuk grafik mini di dalam
   * kartu. Cukup 2 angka untuk mulai menggambar.
   */
  sparkline?: number[];
  /**
   * Kartu ini butuh tindak lanjut (mis. ada berkas jatuh tempo). Hanya kartu
   * seperti inilah yang diberi warna oranye, supaya oranye benar-benar berarti
   * "lihat saya", bukan sekadar hiasan.
   */
  attention?: boolean;
}

/** Warna aksen — hanya untuk ikon, angka tren, dan garis grafik. Badan kartu tetap putih. */
const ACCENT = {
  blue: 'text-blue-600 dark:text-blue-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  amber: 'text-amber-600 dark:text-amber-400',
  rose: 'text-rose-600 dark:text-rose-400',
  violet: 'text-violet-600 dark:text-violet-400',
  sky: 'text-sky-600 dark:text-sky-400',
  primary: 'text-primary',
} as const;

const ACCENT_BG = {
  blue: 'bg-blue-500/10',
  emerald: 'bg-emerald-500/10',
  amber: 'bg-amber-500/10',
  rose: 'bg-rose-500/10',
  violet: 'bg-violet-500/10',
  sky: 'bg-sky-500/10',
  primary: 'bg-primary/10',
} as const;

type AccentKey = keyof typeof ACCENT;

/** Varian semantik lama dipetakan ke warna aksen — tidak lagi jadi kartu penuh warna. */
const VARIANT_ACCENT: Record<NonNullable<StatCardProps['variant']>, AccentKey> = {
  default: 'primary',
  primary: 'primary',
  secondary: 'sky',
  success: 'emerald',
  warning: 'amber',
};

/** Grafik mini: garis tipis + area samar, tanpa sumbu dan tanpa label. */
const Sparkline: React.FC<{ data: number[]; className?: string }> = ({ data, className }) => {
  const W = 72;
  const H = 24;
  const bersih = data.filter((n) => Number.isFinite(n));
  if (bersih.length < 2) return null;
  const min = Math.min(...bersih);
  const max = Math.max(...bersih);
  const span = max - min || 1;
  const titik = bersih.map((n, i) => {
    const x = (i / (bersih.length - 1)) * W;
    const y = H - ((n - min) / span) * (H - 2) - 1;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width={W}
      height={H}
      className={cn('overflow-visible', className)}
      aria-hidden
      focusable="false"
    >
      <polygon points={`0,${H} ${titik.join(' ')} ${W},${H}`} fill="currentColor" opacity={0.12} />
      <polyline
        points={titik.join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
};

/**
 * Kartu angka penting. Sengaja tenang: badan kartu putih (atau gelap di dark
 * mode), warna cuma dipakai di ikon, tren, dan grafik mini — kecuali kartu yang
 * ditandai `attention`, yang boleh oranye karena memang perlu ditindaklanjuti.
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  tint,
  className,
  description,
  compact = false,
  sparkline,
  attention = false,
}) => {
  const aksen: AccentKey = attention ? 'amber' : tint ?? VARIANT_ACCENT[variant];
  // isPositive setelah memperhitungkan invert (mis. NPL turun = bagus)
  const good = trend ? (trend.invert ? !trend.isPositive : trend.isPositive) : null;
  const datar = trend ? Math.abs(trend.value) < 0.005 : false;

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl border bg-card transition-shadow duration-200 hover:shadow-card-hover',
        compact ? 'p-4' : 'p-5',
        attention ? 'border-amber-400/70 shadow-[inset_3px_0_0_0_hsl(var(--warning))]' : 'border-border/60 shadow-card',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn('font-medium text-muted-foreground', compact ? 'text-[11px] uppercase tracking-wide' : 'text-sm')}>
            {title}
          </p>
          <p
            className={cn(
              'font-display font-bold tracking-tight tabular-nums break-words text-foreground',
              compact ? 'mt-1 text-xl' : 'mt-2 text-3xl',
            )}
          >
            {value}
          </p>
          {description && (
            <p className={cn('text-muted-foreground', compact ? 'mt-1 text-[11px]' : 'mt-1.5 text-xs')}>{description}</p>
          )}
          {trend && (
            <div
              className={cn(
                'mt-2 flex items-center gap-1.5 text-sm font-medium',
                datar ? 'text-muted-foreground' : good ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400',
              )}
            >
              {datar ? (
                <ArrowRight className="h-3.5 w-3.5" />
              ) : trend.isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5" />
              )}
              <span className="tabular-nums">
                {Math.abs(trend.value).toFixed(trend.value % 1 === 0 ? 0 : 2)}
                {trend.suffix ?? '% dari bulan lalu'}
              </span>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className={cn('rounded-xl', compact ? 'p-2' : 'p-2.5', ACCENT_BG[aksen], ACCENT[aksen])}>
            <Icon className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
          </div>
          {sparkline && sparkline.length >= 2 && <Sparkline data={sparkline} className={ACCENT[aksen]} />}
        </div>
      </div>
    </div>
  );
};
