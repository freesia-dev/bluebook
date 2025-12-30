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
    default: 'bg-card',
    primary: 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground',
    secondary: 'bg-gradient-to-br from-secondary to-secondary/80 text-secondary-foreground',
    success: 'bg-gradient-to-br from-success to-success/80 text-success-foreground',
    warning: 'bg-gradient-to-br from-warning to-warning/80 text-warning-foreground',
  };

  const iconVariants = {
    default: 'bg-primary/10 text-primary',
    primary: 'bg-primary-foreground/20 text-primary-foreground',
    secondary: 'bg-secondary-foreground/20 text-secondary-foreground',
    success: 'bg-success-foreground/20 text-success-foreground',
    warning: 'bg-warning-foreground/20 text-warning-foreground',
  };

  return (
    <div className={cn(
      "rounded-xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300",
      variants[variant],
      className
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className={cn(
            "text-sm font-medium",
            variant === 'default' ? 'text-muted-foreground' : 'opacity-80'
          )}>
            {title}
          </p>
          <p className="mt-2 text-3xl font-display font-bold">{value}</p>
          {trend && (
            <p className={cn(
              "mt-1 text-sm font-medium",
              trend.isPositive ? 'text-success' : 'text-destructive'
            )}>
              {trend.isPositive ? '+' : ''}{trend.value}% dari bulan lalu
            </p>
          )}
        </div>
        <div className={cn(
          "rounded-lg p-3",
          iconVariants[variant]
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};
