import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useDailyGreeting } from '@/hooks/use-daily-greeting';
import { useKonfigSapaan } from '@/hooks/use-sapaan-konfig';
import { SapaanPoster } from './SapaanPoster';

const DURASI_MEMUDAR_MS = 350;

/**
 * Sapaan yang muncul di tiap waktu yang dijadwalkan (bawaan pagi, siang,
 * sore) saat Bluebook pertama dibuka di waktu itu. Isi, tampilan, dan jam
 * munculnya diatur di Konfigurasi → Layar Sapaan.
 * Tutup dengan klik/ketuk di mana saja, menekan tombol apa pun, atau
 * otomatis setelah durasi yang diatur.
 */
export const DailyGreetingOverlay: React.FC = () => {
  const { userName } = useAuth();
  const { konfig } = useKonfigSapaan();
  const { show, ayat, slot, kunci, dismiss } = useDailyGreeting();
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
    const t = konfig.durasiDetik > 0 ? window.setTimeout(handleClose, konfig.durasiDetik * 1000) : undefined;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      handleClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      if (t) window.clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [show, handleClose, konfig.durasiDetik]);

  if (!show) return null;

  return (
    <SapaanPoster
      nama={userName}
      ayat={ayat}
      kunci={kunci}
      salam={slot?.salam}
      konfig={konfig}
      menutup={closing}
      onTutup={handleClose}
    />
  );
};
