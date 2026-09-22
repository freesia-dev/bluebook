import React, { useLayoutEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface ScaleToFitProps {
  children: React.ReactNode;
  /**
   * 'contain' = seluruh konten muat di kotak (lebar DAN tinggi) — semua kelihatan tanpa scroll.
   * 'width'   = hanya menyesuaikan lebar; kalau konten tinggi, kotak luar yang di-scroll.
   */
  mode?: 'contain' | 'width';
  /** Skala maksimum (default 1 = tidak pernah diperbesar melebihi ukuran asli). */
  maxScale?: number;
  className?: string;
  /** Dipanggil setiap skala berubah (misal buat nampilin "72%"). */
  onScaleChange?: (scale: number) => void;
}

/**
 * Menampilkan elemen berukuran tetap (mis. kartu simulasi 900px untuk export JPG)
 * supaya pas di wadah mana pun — desktop, tablet, atau layar HP/PWA — tanpa
 * terpotong di kanan. Pakai transform: scale (bukan CSS `zoom`, yang tidak
 * konsisten antar browser), lalu ukuran wadah disetel ke ukuran hasil skala
 * supaya layout di sekitarnya tetap rapi.
 */
export const ScaleToFit: React.FC<ScaleToFitProps> = ({
  children,
  mode = 'width',
  maxScale = 1,
  className,
  onScaleChange,
}) => {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [natural, setNatural] = useState({ w: 0, h: 0 });

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (!outer || !inner) return;

    const recompute = () => {
      // offsetWidth/offsetHeight tidak terpengaruh transform → ukuran asli konten
      const nw = inner.offsetWidth;
      const nh = inner.offsetHeight;
      const cw = outer.clientWidth;
      const ch = outer.clientHeight;
      if (!nw || !nh || !cw) return;
      let next = cw / nw;
      if (mode === 'contain' && ch > 0) next = Math.min(next, ch / nh);
      next = Math.max(0.1, Math.min(maxScale, next));
      setNatural((prev) => (prev.w === nw && prev.h === nh ? prev : { w: nw, h: nh }));
      setScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next));
    };

    recompute();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => recompute());
    ro.observe(outer);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [mode, maxScale]);

  useLayoutEffect(() => {
    onScaleChange?.(scale);
  }, [scale, onScaleChange]);

  return (
    <div
      ref={outerRef}
      className={cn('relative w-full', mode === 'contain' ? 'h-full overflow-hidden' : 'overflow-x-hidden', className)}
    >
      <div
        className="mx-auto"
        style={{
          width: natural.w ? natural.w * scale : undefined,
          height: natural.h ? natural.h * scale : undefined,
        }}
      >
        <div
          ref={innerRef}
          style={{
            width: 'max-content',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default ScaleToFit;
