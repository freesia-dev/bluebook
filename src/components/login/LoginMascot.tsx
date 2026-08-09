import React, { useEffect, useRef, useState } from 'react';

export type MascotMood = 'idle' | 'typing' | 'peeking' | 'covering' | 'success' | 'error';

interface LoginMascotProps {
  /** -1 (kiri) .. 1 (kanan): posisi kursor di field yang sedang diketik */
  gaze?: number;
  mood?: MascotMood;
  className?: string;
}

/**
 * Karakter maskot Bluebook — dibangun sepenuhnya dengan SVG + CSS transform,
 * sehingga mata/kepala/tangan benar-benar bergerak (bukan sprite atau GIF).
 */
const LoginMascot: React.FC<LoginMascotProps> = ({ gaze = 0, mood = 'idle', className }) => {
  const [blink, setBlink] = useState(false);
  const [breath, setBreath] = useState(0);
  const rafRef = useRef<number>();

  // Kedipan acak yang natural
  useEffect(() => {
    let timeout: number;
    const schedule = () => {
      timeout = window.setTimeout(() => {
        setBlink(true);
        window.setTimeout(() => setBlink(false), 130);
        schedule();
      }, 2200 + Math.random() * 3200);
    };
    schedule();
    return () => window.clearTimeout(timeout);
  }, []);

  // Nafas halus (idle motion)
  useEffect(() => {
    let start: number | null = null;
    const loop = (t: number) => {
      if (start === null) start = t;
      setBreath(Math.sin((t - start) / 900));
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const covering = mood === 'covering';
  const peeking = mood === 'peeking';
  const eyesClosed = covering || (blink && !peeking);

  const clampedGaze = Math.max(-1, Math.min(1, gaze));
  const lookX = clampedGaze * 5;
  const lookY = mood === 'typing' || covering || peeking ? 3.4 : mood === 'success' ? -2 : 0;
  const headTilt = clampedGaze * 4 + (mood === 'success' ? -2 : 0);
  const headY = breath * 1.4 + (mood === 'success' ? -4 : 0);

  const mouth =
    mood === 'success'
      ? 'M 86 120 q 14 16 28 0 q -14 8 -28 0 Z'
      : mood === 'error'
        ? 'M 90 124 q 10 -9 20 0'
        : mood === 'typing' || covering || peeking
          ? 'M 92 120 q 8 7 16 0'
          : 'M 90 119 q 10 10 20 0';

  return (
    <div
      className={className}
      aria-hidden="true"
      style={{ perspective: 600 }}
    >
      <svg viewBox="0 0 200 200" className="w-full h-full overflow-visible">
        <defs>
          <linearGradient id="mascot-jacket" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(221 70% 32%)" />
            <stop offset="100%" stopColor="hsl(222 75% 22%)" />
          </linearGradient>
          <linearGradient id="mascot-hair" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#4a2f22" />
            <stop offset="100%" stopColor="#2f1c14" />
          </linearGradient>
          <radialGradient id="mascot-skin" cx="50%" cy="40%">
            <stop offset="0%" stopColor="#ffe6d4" />
            <stop offset="100%" stopColor="#f7cdb2" />
          </radialGradient>
          <linearGradient id="mascot-glow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="hsl(212 92% 58%)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="hsl(212 92% 58%)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Aura */}
        <ellipse cx="100" cy="120" rx="82" ry="70" fill="url(#mascot-glow)" />

        {/* Badan / jaket */}
        <g style={{ transform: `translateY(${breath * 0.8}px)`, transition: 'transform 120ms linear' }}>
          <path
            d="M 52 200 q 0 -46 48 -54 q 48 8 48 54 Z"
            fill="url(#mascot-jacket)"
          />
          <path d="M 100 146 L 100 200" stroke="hsl(212 92% 58%)" strokeWidth="2.5" opacity="0.7" />
          <circle cx="100" cy="162" r="3" fill="hsl(212 92% 62%)" />
        </g>

        {/* Kepala */}
        <g
          style={{
            transform: `translate(${clampedGaze * 4}px, ${headY}px) rotate(${headTilt}deg)`,
            transformOrigin: '100px 150px',
            transition: 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          {/* Rambut belakang + ponytail */}
          <path
            d="M 100 26 q -46 0 -46 52 q 0 30 12 44 q -8 -36 6 -56 q 20 12 56 4 q 14 8 18 52 q 12 -14 12 -44 q 0 -52 -46 -52 Z"
            fill="url(#mascot-hair)"
          />
          <g
            style={{
              transform: `rotate(${clampedGaze * -7 + breath * 2}deg)`,
              transformOrigin: '146px 62px',
              transition: 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            <ellipse cx="152" cy="76" rx="13" ry="24" fill="url(#mascot-hair)" />
            <circle cx="145" cy="56" r="6" fill="hsl(212 92% 58%)" />
          </g>

          {/* Wajah */}
          <ellipse cx="100" cy="86" rx="40" ry="42" fill="url(#mascot-skin)" />

          {/* Poni */}
          <path
            d="M 60 74 q 6 -40 40 -42 q 36 2 40 42 q -12 -20 -40 -18 q -28 -2 -40 18 Z"
            fill="url(#mascot-hair)"
          />

          {/* Mata */}
          <g
            style={{
              transform: `translate(${lookX}px, ${lookY}px)`,
              transition: 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          >
            {eyesClosed ? (
              <>
                <path d="M 76 88 q 8 6 16 0" stroke="#3a2418" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M 108 88 q 8 6 16 0" stroke="#3a2418" strokeWidth="3" fill="none" strokeLinecap="round" />
              </>
            ) : (
              <>
                <ellipse cx="84" cy="88" rx="9" ry="11" fill="#3a2418" />
                <ellipse cx="116" cy="88" rx="9" ry="11" fill="#3a2418" />
                <circle cx="87" cy="84" r="3.2" fill="#fff" />
                <circle cx="119" cy="84" r="3.2" fill="#fff" />
                <circle cx="82" cy="92" r="1.6" fill="#fff" opacity="0.7" />
                <circle cx="114" cy="92" r="1.6" fill="#fff" opacity="0.7" />
              </>
            )}
          </g>

          {/* Alis */}
          <path
            d={mood === 'error' ? 'M 74 74 q 10 4 18 1' : 'M 74 73 q 10 -4 18 -1'}
            stroke="#3a2418"
            strokeWidth="2.6"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d={mood === 'error' ? 'M 108 75 q 8 -3 18 -1' : 'M 108 72 q 8 -3 18 1'}
            stroke="#3a2418"
            strokeWidth="2.6"
            fill="none"
            strokeLinecap="round"
          />

          {/* Pipi */}
          <ellipse cx="70" cy="100" rx="7" ry="4.5" fill="#ff9d9d" opacity={mood === 'success' ? 0.6 : 0.35} />
          <ellipse cx="130" cy="100" rx="7" ry="4.5" fill="#ff9d9d" opacity={mood === 'success' ? 0.6 : 0.35} />

          {/* Mulut */}
          <path d={mouth} stroke="#a8443f" strokeWidth="2.6" fill={mood === 'success' ? '#a8443f' : 'none'} strokeLinecap="round" />
        </g>

        {/* Tangan menutup mata (saat isi password) */}
        <g
          style={{
            transform: covering || peeking ? 'translateY(0)' : 'translateY(70px)',
            opacity: covering || peeking ? 1 : 0,
            transition: 'transform 480ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease',
          }}
        >
          <g style={{ transform: peeking ? 'translate(-14px, 10px) rotate(-14deg)' : 'none', transformOrigin: '72px 96px', transition: 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)' }}>
            <ellipse cx="74" cy="92" rx="19" ry="15" fill="url(#mascot-skin)" stroke="#e9b696" strokeWidth="1.5" />
            <path d="M 60 88 q 14 -6 28 0" stroke="#e9b696" strokeWidth="1.4" fill="none" />
          </g>
          <g style={{ transformOrigin: '128px 96px' }}>
            <ellipse cx="126" cy="92" rx="19" ry="15" fill="url(#mascot-skin)" stroke="#e9b696" strokeWidth="1.5" />
            <path d="M 112 88 q 14 -6 28 0" stroke="#e9b696" strokeWidth="1.4" fill="none" />
          </g>
        </g>

        {/* Sparkles saat sukses */}
        {mood === 'success' && (
          <g className="animate-fade-in">
            <path d="M 44 48 l 3 8 l 8 3 l -8 3 l -3 8 l -3 -8 l -8 -3 l 8 -3 Z" fill="hsl(45 93% 58%)" />
            <path d="M 160 40 l 2.5 6 l 6 2.5 l -6 2.5 l -2.5 6 l -2.5 -6 l -6 -2.5 l 6 -2.5 Z" fill="hsl(45 93% 58%)" />
          </g>
        )}
      </svg>
    </div>
  );
};

export default LoginMascot;
