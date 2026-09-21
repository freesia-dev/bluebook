import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyGreeting } from '@/hooks/use-daily-greeting';
import { cn } from '@/lib/utils';

const AUTO_DISMISS_MS = 5000;

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 10) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/**
 * Sapaan penyemangat singkat yang muncul sekali di kunjungan/login PERTAMA
 * hari itu (dilacak lewat useDailyGreeting -> profiles.last_greeting_date).
 * Hilang otomatis dalam 5 detik, atau langsung begitu diklik di mana saja.
 */
export const DailyGreetingOverlay: React.FC = () => {
  const { userName } = useAuth();
  const { show, quote, dismiss } = useDailyGreeting();
  const [closing, setClosing] = useState(false);

  const handleClose = () => {
    if (closing) return;
    setClosing(true);
    // beri waktu buat animasi fade-out sebelum benar-benar unmount
    window.setTimeout(dismiss, 250);
  };

  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(handleClose, AUTO_DISMISS_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show]);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      onClick={handleClose}
      className={cn(
        'fixed inset-0 z-[200] flex cursor-pointer items-center justify-center gradient-hero px-6',
        'transition-opacity duration-300 ease-out',
        closing ? 'opacity-0' : 'opacity-100 animate-in fade-in'
      )}
    >
      <div
        className={cn(
          'max-w-lg text-center text-white transition-all duration-300 ease-out',
          closing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        )}
      >
        <p className="font-display text-2xl font-bold sm:text-3xl">
          {getTimeGreeting()}, {userName}
        </p>
        <p className="mt-4 text-base text-white/85 sm:text-lg">
          {quote}
        </p>
        <p className="mt-8 text-xs uppercase tracking-widest text-white/50">
          Klik di mana saja untuk lanjut
        </p>
      </div>
    </div>
  );
};
