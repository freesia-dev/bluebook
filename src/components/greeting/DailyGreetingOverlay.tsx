import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyGreeting } from '@/hooks/use-daily-greeting';
import { SapaanPoster } from './SapaanPoster';

/** Sapaan bertahan paling lama 3 menit, lalu menutup sendiri. */
const AUTO_DISMISS_MS = 3 * 60 * 1000;
const DURASI_MEMUDAR_MS = 350;

/**
 * Sapaan harian yang muncul sekali di kunjungan/login PERTAMA hari itu
 * (dilacak lewat useDailyGreeting -> profiles.last_greeting_date).
 * Tutup dengan klik/ketuk di mana saja, menekan tombol apa pun, atau
 * otomatis setelah 3 menit.
 */
export const DailyGreetingOverlay: React.FC = () => {
  const { userName } = useAuth();
  const { show, quote, dismiss } = useDailyGreeting();
  const [closing, setClosing] = useState(false);
  const closingRef = useRef(false);

  const handleClose = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    // beri waktu animasi memudar sebelum benar-benar dilepas
    window.setTimeout(() => {
      dismiss();
      closingRef.current = false;
      setClosing(false);
    }, DURASI_MEMUDAR_MS);
  }, [dismiss]);

  useEffect(() => {
    if (!show) return;
    const t = window.setTimeout(handleClose, AUTO_DISMISS_MS);
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [show, handleClose]);

  if (!show) return null;

  return <SapaanPoster nama={userName} kutipan={quote} menutup={closing} onTutup={handleClose} />;
};
