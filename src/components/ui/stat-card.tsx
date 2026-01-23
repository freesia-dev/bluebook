import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  variant = 'default',
  className,
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

  return (
    <div className={cn(
      "rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-0.5",
      variants[variant],
      className
    )}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium tracking-wide",
            variant === 'default' ? 'text-muted-foreground' : 'opacity-85'
          )}>
            {title}
          </p>
          <p className="mt-3 text-3xl font-display font-bold tracking-tight">{value}</p>
          {trend && (
            <div className={cn(
              "mt-2 flex items-center gap-1.5 text-sm font-medium",
              trendColors[variant]
            )}>
              <span className={cn(
                "inline-flex items-center justify-center w-5 h-5 rounded-full text-xs",
                trend.isPositive ? 'bg-success/20' : 'bg-destructive/20'
              )}>
                {trend.isPositive ? '↑' : '↓'}
              </span>
              <span>{Math.abs(trend.value)}% dari bulan lalu</span>
            </div>
          )}
        </div>
        <div className={cn(
          "rounded-xl p-3 transition-transform duration-200",
          iconVariants[variant]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
