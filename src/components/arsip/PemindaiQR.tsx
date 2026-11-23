import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { bacaQR, type IsiQR } from '@/lib/arsip';
import { CameraOff, Flashlight, Keyboard } from 'lucide-react';

type Detektor = { detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]> };

/**
 * Kamera pemindai label arsip. Memakai BarcodeDetector bawaan browser kalau
 * ada (Chrome Android), dan jsQR untuk browser lain. Selalu ada kotak ketik
 * sebagai cadangan — misalnya untuk map yang labelnya belum dicetak.
 */
export const PemindaiQR: React.FC<{
  onHasil: (isi: Exclude<IsiQR, null>, mentah: string) => void;
  aktif?: boolean;
  petunjuk?: string;
  className?: string;
}> = ({ onHasil, aktif = true, petunjuk = 'Arahkan ke QR di punggung map', className }) => {
  const video = useRef<HTMLVideoElement>(null);
  const kanvas = useRef<HTMLCanvasElement | null>(null);
  const aliran = useRef<MediaStream | null>(null);
  const terakhir = useRef<{ teks: string; waktu: number }>({ teks: '', waktu: 0 });
  const [galat, setGalat] = useState<string | null>(null);
  const [senter, setSenter] = useState(false);
  const [ketik, setKetik] = useState('');
  const onHasilRef = useRef(onHasil);
  onHasilRef.current = onHasil;

  const lapor = useCallback((teks: string) => {
    const isi = bacaQR(teks);
    if (!isi) return;
    const kini = Date.now();
    // QR yang sama dalam 2,5 detik dianggap satu kali scan
    if (terakhir.current.teks === teks && kini - terakhir.current.waktu < 2500) return;
    terakhir.current = { teks, waktu: kini };
    if (navigator.vibrate) navigator.vibrate(60);
    onHasilRef.current(isi, teks);
  }, []);

  useEffect(() => {
    if (!aktif) return;
    let berhenti = false;
    let detektor: Detektor | null = null;
    let jsQR: ((d: Uint8ClampedArray, w: number, h: number) => { data: string } | null) | null = null;

    (async () => {
      try {
        const s = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (berhenti) { s.getTracks().forEach((t) => t.stop()); return; }
        aliran.current = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => undefined);
        }
      } catch {
        setGalat('Kamera tidak bisa dibuka. Izinkan akses kamera, atau ketik kode di bawah.');
        return;
      }

      const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detektor }).BarcodeDetector;
      if (BD) {
        try { detektor = new BD({ formats: ['qr_code'] }); } catch { detektor = null; }
      }
      if (!detektor) {
        jsQR = (await import('jsqr')).default as unknown as typeof jsQR;
      }

      const putar = async () => {
        if (berhenti) return;
        const v = video.current;
        if (v && v.readyState >= 2) {
          try {
            if (detektor) {
              const hasil = await detektor.detect(v);
              if (hasil[0]?.rawValue) lapor(hasil[0].rawValue);
            } else if (jsQR) {
              const w = 640;
              const h = Math.round((v.videoHeight / v.videoWidth) * w) || 360;
              if (!kanvas.current) kanvas.current = document.createElement('canvas');
              const c = kanvas.current;
              c.width = w; c.height = h;
              const ctx = c.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(v, 0, 0, w, h);
                const img = ctx.getImageData(0, 0, w, h);
                const r = jsQR(img.data, w, h);
                if (r?.data) lapor(r.data);
              }
            }
          } catch { /* bingkai berikutnya */ }
        }
        window.setTimeout(() => requestAnimationFrame(putar), 120);
      };
      putar();
    })();

    return () => {
      berhenti = true;
      aliran.current?.getTracks().forEach((t) => t.stop());
      aliran.current = null;
    };
  }, [aktif, lapor]);

  const gantiSenter = async () => {
    const t = aliran.current?.getVideoTracks()[0];
    if (!t) return;
    try {
      await t.applyConstraints({ advanced: [{ torch: !senter } as MediaTrackConstraintSet] });
      setSenter(!senter);
    } catch { /* tidak semua HP punya senter */ }
  };

  const kirimKetik = () => {
    const t = ketik.trim();
    if (!t) return;
    const kode = /^[A-Z0-9]{6}$/i.test(t) ? `BB-M-${t.toUpperCase()}` : t;
    terakhir.current = { teks: '', waktu: 0 };
    lapor(kode);
    setKetik('');
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative overflow-hidden rounded-2xl bg-slate-950 aspect-[4/3]">
        {galat ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-white/80">
            <CameraOff className="w-8 h-8 opacity-60" />
            {galat}
          </div>
        ) : (
          <>
            <video ref={video} className="absolute inset-0 h-full w-full object-cover" playsInline muted />
            <div className="pointer-events-none absolute inset-[18%] rounded-xl border-2 border-secondary/90 shadow-[0_0_0_999px_rgba(2,8,23,0.45)]">
              <div className="absolute left-2 right-2 top-1/2 h-0.5 bg-secondary/90 animate-pulse" />
            </div>
            <div className="absolute bottom-3 left-0 right-0 text-center">
              <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-white">{petunjuk}</span>
            </div>
            <button
              type="button"
              onClick={gantiSenter}
              className={cn('absolute right-3 top-3 h-9 w-9 rounded-full flex items-center justify-center', senter ? 'bg-secondary text-white' : 'bg-black/50 text-white')}
              title="Senter"
            >
              <Flashlight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={ketik}
            onChange={(e) => setKetik(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') kirimKetik(); }}
            placeholder="Atau ketik kode: BB-M-xxxxxx / BB-LACI-B2.2"
            className="h-10 pl-9 font-mono text-sm uppercase"
          />
        </div>
        <Button variant="outline" className="h-10" onClick={kirimKetik} disabled={!ketik.trim()}>Cari</Button>
      </div>
    </div>
  );
};
