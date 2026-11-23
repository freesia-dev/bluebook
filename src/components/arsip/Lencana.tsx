import React from 'react';
import { cn } from '@/lib/utils';
import { LABEL_FISIK, LABEL_KREDIT, type StatusFisik, type StatusKredit } from '@/lib/arsip';
import { CheckCircle2, Check, GitBranch, HelpCircle, ArrowUpRight, Clock, Archive, HandHeart, Search } from 'lucide-react';

const dasar = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap';

export const LencanaKredit: React.FC<{ status: StatusKredit; className?: string }> = ({ status, className }) => {
  const gaya: Record<StatusKredit, string> = {
    aktif: 'bg-success/15 text-success',
    lunas: 'bg-muted text-muted-foreground',
    topup: 'bg-secondary/20 text-secondary-foreground',
    tidak_dikenali: 'bg-warning/15 text-warning-foreground',
  };
  const Ikon = { aktif: CheckCircle2, lunas: Check, topup: GitBranch, tidak_dikenali: HelpCircle }[status];
  return (
    <span className={cn(dasar, gaya[status], className)}>
      <Ikon className="w-3 h-3" /> {LABEL_KREDIT[status]}
    </span>
  );
};

export const LencanaFisik: React.FC<{ status: StatusFisik; className?: string }> = ({ status, className }) => {
  const gaya: Record<StatusFisik, string> = {
    tersimpan: 'bg-success/10 text-success',
    dipinjam: 'bg-warning/20 text-warning-foreground',
    terlambat: 'bg-destructive/15 text-destructive',
    diserahkan: 'bg-info/15 text-info',
    telusur: 'bg-destructive/10 text-destructive',
  };
  const Ikon = { tersimpan: Archive, dipinjam: ArrowUpRight, terlambat: Clock, diserahkan: HandHeart, telusur: Search }[status];
  return (
    <span className={cn(dasar, gaya[status], className)}>
      <Ikon className="w-3 h-3" /> {LABEL_FISIK[status]}
    </span>
  );
};

export const LencanaJenis: React.FC<{ jenis: string }> = ({ jenis }) => (
  <span
    className={cn(
      dasar,
      jenis === 'produktif' ? 'bg-secondary/20 text-secondary-foreground'
        : jenis === 'jaminan' ? 'bg-info/15 text-info' : 'bg-primary/10 text-primary',
    )}
  >
    {jenis === 'produktif' ? 'Produktif' : jenis === 'jaminan' ? 'Jaminan' : 'Konsumtif'}
  </span>
);
