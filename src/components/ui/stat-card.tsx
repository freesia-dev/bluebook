import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

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
   * Warna tint independen dari `variant`, dipakai oleh dashboard operasional
   * (Executive/Monitoring/Security) yang butuh lebih banyak pilihan warna
   * per-kartu ketimbang 5 varian semantik di atas. Jika diisi, `tint`
   * menggantikan styling dari `variant`.
   */
  tint?: 'blue' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky';
  className?: string;
  description?: string;
  /** Kartu lebih ringkas (padding & ukuran angka lebih kecil) untuk grid KPI yang padat. */
  compact?: boolean;
}

const tintClasses = {
  blue: { bg: 'from-blue-500/10 to-blue-500/5', icon: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', silhouette: 'text-blue-500' },
  emerald: { bg: 'from-emerald-500/10 to-emerald-500/5', icon: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', silhouette: 'text-emerald-500' },
  amber: { bg: 'from-amber-500/10 to-amber-500/5', icon: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', silhouette: 'text-amber-500' },
  rose: { bg: 'from-rose-500/10 to-rose-500/5', icon: 'bg-rose-500/15 text-rose-600 dark:text-rose-400', silhouette: 'text-rose-500' },
  violet: { bg: 'from-violet-500/10 to-violet-500/5', icon: 'bg-violet-500/15 text-violet-600 dark:text-violet-400', silhouette: 'text-violet-500' },
  sky: { bg: 'from-sky-500/10 to-sky-500/5', icon: 'bg-sky-500/15 text-sky-600 dark:text-sky-400', silhouette: 'text-sky-500' },
} as const;

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
}) => {
  const variants = {
    default: 'bg-card border border-border/50',
    primary: 'bg-gradient-to-br from-primary via-primary to-primary/80 text-primary-foreground border-0',
    secondary: 'bg-gradient-to-br from-secondary via-secondary to-secondary/80 text-secondary-foreground border-0',
    success: 'bg-gradient-to-br from-success via-success to-success/80 text-success-foreground border-0',
    warning: 'bg-gradient-to-br from-warning via-warning to-warning/80 text-warning-foreground border-0',
  };

  const iconVariants = {
    default: 'bg-primary/10 text-primary shadow-sm',
    primary: 'bg-primary-foreground/20 text-primary-foreground backdrop-blur-sm',
    secondary: 'bg-secondary-foreground/20 text-secondary-foreground backdrop-blur-sm',
    success: 'bg-success-foreground/20 text-success-foreground backdrop-blur-sm',
    warning: 'bg-warning-foreground/20 text-warning-foreground backdrop-blur-sm',
  };

  const trendColors = {
    default: trend?.isPositive ? 'text-success' : 'text-destructive',
    primary: trend?.isPositive ? 'text-success-foreground/90' : 'text-destructive-foreground/90',
    secondary: trend?.isPositive ? 'text-success' : 'text-destructive',
    success: 'text-success-foreground/80',
    warning: trend?.isPositive ? 'text-success' : 'text-destructive',
  };

  // Silhouette icon opacity based on variant
  const silhouetteOpacity = {
    default: 'opacity-[0.04]',
    primary: 'opacity-[0.08]',
    secondary: 'opacity-[0.08]',
    success: 'opacity-[0.08]',
    warning: 'opacity-[0.08]',
  };

  const t = tint ? tintClasses[tint] : null;
  // isPositive setelah memperhitungkan invert (mis. NPL turun = bagus)
  const good = trend ? (trend.invert ? !trend.isPositive : trend.isPositive) : null;

  return (
    <div className={cn(
      "relative rounded-xl shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5 overflow-hidden",
      compact ? "p-4" : "p-6",
      t ? cn('border border-border/60 bg-gradient-to-br', t.bg) : variants[variant],
      className
    )}>
      {/* Background Silhouette Icon */}
      <div className="absolute -right-4 -bottom-4 pointer-events-none">
        <Icon className={cn(
          compact ? "w-24 h-24" : "w-32 h-32",
          "transform rotate-12",
          t ? t.silhouette : (variant === 'default' ? 'text-primary' : 'text-current'),
          t ? 'opacity-[0.08]' : silhouetteOpacity[variant]
        )} strokeWidth={1.5} />
      </div>

      <div className="relative z-10 flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "font-medium tracking-wide",
            compact ? "text-[11px] uppercase" : "text-sm",
            t ? 'text-muted-foreground' : (variant === 'default' ? 'text-muted-foreground' : 'opacity-85')
          )}>
            {title}
          </p>
          <p className={cn(
            "font-display font-bold tracking-tight break-words",
            compact ? "mt-1 text-xl" : "mt-3 text-3xl"
          )}>{value}</p>
          {description && (
            <p className={cn(
              "font-medium",
              compact ? "mt-1 text-[11px]" : "mt-1.5 text-xs",
              t ? 'text-muted-foreground' : (variant === 'default' ? 'text-muted-foreground' : 'opacity-80')
            )}>
              {description}
            </p>
          )}
          {trend && (
            <div className={cn(
              "mt-2 flex items-center gap-1.5 text-sm font-medium",
              t ? (good ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400') : trendColors[variant]
            )}>
              <span className={cn(
                "inline-flex items-center justify-center w-5 h-5 rounded-full text-xs",
                good ? 'bg-success/20' : 'bg-destructive/20'
              )}>
                {trend.isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              </span>
              <span>{Math.abs(trend.value).toFixed(trend.value % 1 === 0 ? 0 : 2)}{trend.suffix ?? '% dari bulan lalu'}</span>
            </div>
          )}
        </div>
        <div className={cn(
          "rounded-xl transition-transform duration-200 shrink-0",
          compact ? "p-2.5" : "p-3",
          t ? t.icon : iconVariants[variant]
        )}>
          <Icon className={compact ? "w-5 h-5" : "w-6 h-6"} />
        </div>
      </div>
    </div>
  );
};
