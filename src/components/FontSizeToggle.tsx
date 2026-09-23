import React, { useEffect, useState } from 'react';
import { Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const KEY = 'bluebook-huruf-besar';

const bacaPreferensi = (): boolean => {
  try {
    return window.localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
};

/** Pasang/lepas mode huruf besar di <html>. Dipanggil juga sebelum React jalan (lihat main.tsx). */
export function terapkanHurufBesar(aktif: boolean): void {
  document.documentElement.dataset.huruf = aktif ? 'besar' : 'normal';
}

/** Dipanggil sekali sedini mungkin supaya tidak ada kedipan ukuran huruf. */
export function pasangHurufBesarAwal(): void {
  if (typeof document === 'undefined') return;
  terapkanHurufBesar(bacaPreferensi());
}

/**
 * Mode huruf besar — semua ukuran teks naik sekitar 12,5%. Berguna untuk layar
 * besar di ruang kerja, dan untuk yang matanya sudah tidak setajam dulu.
 * Pilihannya tersimpan per perangkat.
 */
export const FontSizeToggle: React.FC = () => {
  const [besar, setBesar] = useState(bacaPreferensi);

  useEffect(() => {
    terapkanHurufBesar(besar);
    try {
      window.localStorage.setItem(KEY, besar ? '1' : '0');
    } catch {
      /* mode privat / penyimpanan penuh — cukup berlaku untuk sesi ini */
    }
  }, [besar]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={besar ? 'secondary' : 'ghost'}
          size="icon"
          onClick={() => setBesar((v) => !v)}
          aria-pressed={besar}
          aria-label={besar ? 'Kembalikan ukuran huruf normal' : 'Perbesar ukuran huruf'}
          // Di HP header sudah padat, dan ukuran huruf bisa diatur dari setelan HP
          className="hidden sm:inline-flex"
        >
          <Type className="h-5 w-5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{besar ? 'Kembalikan huruf normal' : 'Perbesar huruf'}</TooltipContent>
    </Tooltip>
  );
};

export default FontSizeToggle;
