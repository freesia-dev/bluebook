import React from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    type: 'up' | 'down' | 'neutral';
  };
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'info';
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  variant = 'default',
  className,
}) => {
  const variantStyles = {
    default: {
      card: 'bg-card border border-border/50',
      icon: 'bg-primary/10 text-primary',
      iconGlow: '',
    },
    primary: {
      card: 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground border-primary/20',
      icon: 'bg-white/20 text-white',
      iconGlow: 'shadow-glow',
    },
    secondary: {
      card: 'bg-gradient-to-br from-secondary to-secondary/90 text-secondary-foreground border-secondary/20',
      icon: 'bg-white/20 text-secondary-foreground',
      iconGlow: 'shadow-glow-secondary',
    },
    success: {
      card: 'bg-gradient-to-br from-success to-success/90 text-success-foreground border-success/20',
      icon: 'bg-white/20 text-white',
      iconGlow: '',
    },
    warning: {
      card: 'bg-gradient-to-br from-warning to-warning/90 text-warning-foreground border-warning/20',
      icon: 'bg-white/20 text-warning-foreground',
      iconGlow: '',
    },
    info: {
      card: 'bg-gradient-to-br from-info to-info/90 text-info-foreground border-info/20',
      icon: 'bg-white/20 text-white',
      iconGlow: '',
    },
  };

  const TrendIcon = trend?.type === 'up' ? TrendingUp : trend?.type === 'down' ? TrendingDown : Minus;
  const trendColor = trend?.type === 'up' 
    ? (variant === 'default' ? 'text-success' : 'text-white/90')
    : trend?.type === 'down' 
    ? (variant === 'default' ? 'text-destructive' : 'text-white/90')
    : 'text-muted-foreground';

  return (
    <div className={cn(
      "relative rounded-2xl p-5 shadow-card hover:shadow-card-hover transition-all duration-300 hover-lift overflow-hidden group",
      variantStyles[variant].card,
      className
    )}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 -mr-8 -mt-8 opacity-10">
        <Icon className="w-full h-full" />
      </div>
      
      <div className="relative flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <p className={cn(
            "text-sm font-medium mb-1 truncate",
            variant === 'default' ? 'text-muted-foreground' : 'opacity-90'
          )}>
            {title}
          </p>
          <p className="text-3xl font-display font-bold tracking-tight">{value}</p>
          
          {(description || trend) && (
            <div className="mt-2 flex items-center gap-2">
              {trend && (
                <div className={cn("flex items-center gap-1 text-sm font-medium", trendColor)}>
                  <TrendIcon className="w-4 h-4" />
                  <span>{trend.value}%</span>
                </div>
              )}
              {description && (
                <p className={cn(
                  "text-xs truncate",
                  variant === 'default' ? 'text-muted-foreground' : 'opacity-75'
                )}>
                  {description}
                </p>
              )}
            </div>
          )}
        </div>
        
        <div className={cn(
          "rounded-xl p-3 transition-transform duration-300 group-hover:scale-110",
          variantStyles[variant].icon,
          variantStyles[variant].iconGlow
        )}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
};