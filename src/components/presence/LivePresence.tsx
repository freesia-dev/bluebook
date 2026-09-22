import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { colorForUser, presenceStore, usePresence, type PresencePeer } from '@/lib/presence-store';

/* -------------------------------------------------------------------------- */
/*  Presence "lobby": siapa online & sedang di halaman mana                   */
/* -------------------------------------------------------------------------- */

const LOBBY = 'presence-lobby';
const HEARTBEAT_MS = 20_000;

/**
 * Dipasang sekali di dalam <BrowserRouter>. Melaporkan halaman yang sedang
 * dibuka user ini ke channel realtime, mengumpulkan daftar user lain yang
 * online (untuk avatar di header), dan menjalankan kursor live per halaman.
 * Semua best-effort: kalau realtime gagal, aplikasi tetap jalan normal.
 */
export const LivePresence: React.FC = () => {
  const { user, userName, userRole, isAuthenticated, isApproved } = useAuth();
  const location = useLocation();
  const path = location.pathname;
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const pathRef = useRef(path);
  pathRef.current = path;

  const enabled = !!user && isAuthenticated && isApproved;

  useEffect(() => {
    presenceStore.setMyPath(path);
  }, [path]);

  // Satu channel lobby per sesi login
  useEffect(() => {
    if (!enabled || !user) return;
    const color = colorForUser(user.id);
    const ch = supabase.channel(LOBBY, { config: { presence: { key: user.id } } });
    channelRef.current = ch;

    const sync = () => {
      try {
        const st = ch.presenceState<PresencePeer>();
        const map = new Map<string, PresencePeer>();
        Object.values(st).forEach((arr) =>
          arr.forEach((p: any) => {
            if (!p?.user_id || p.user_id === user.id) return;
            const cur = map.get(p.user_id);
            if (!cur || new Date(p.at) > new Date(cur.at)) map.set(p.user_id, p as PresencePeer);
          }),
        );
        presenceStore.setPeers(Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama)));
      } catch {
        /* noop */
      }
    };

    const track = () => {
      if (document.visibilityState === 'hidden') return;
      void ch
        .track({ user_id: user.id, nama: userName, role: userRole, path: pathRef.current, color, at: new Date().toISOString() })
        .catch(() => {});
    };

    ch.on('presence', { event: 'sync' }, sync);
    ch.on('presence', { event: 'join' }, sync);
    ch.on('presence', { event: 'leave' }, sync);
    ch.subscribe((status) => {
      if (status === 'SUBSCRIBED') track();
    });

    const hb = window.setInterval(track, HEARTBEAT_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') track();
      else void ch.untrack().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearInterval(hb);
      document.removeEventListener('visibilitychange', onVis);
      channelRef.current = null;
      presenceStore.setPeers([]);
      try {
        void ch.untrack();
      } catch {
        /* noop */
      }
      supabase.removeChannel(ch);
    };
  }, [enabled, user, userName, userRole]);

  // Laporkan pindah halaman secepatnya
  useEffect(() => {
    const ch = channelRef.current;
    if (!ch || !user) return;
    void ch
      .track({
        user_id: user.id,
        nama: userName,
        role: userRole,
        path,
        color: colorForUser(user.id),
        at: new Date().toISOString(),
      })
      .catch(() => {});
  }, [path, user, userName, userRole]);

  if (!enabled || !user) return null;
  return <LiveCursors path={path} userId={user.id} nama={userName} />;
};

/* -------------------------------------------------------------------------- */
/*  Kursor live per halaman (desktop saja)                                    */
/* -------------------------------------------------------------------------- */

interface RemoteCursor {
  u: string;
  n: string;
  c: string;
  x: number; // rasio 0..1 terhadap lebar <main>
  y: number; // px dari atas <main>
  t: number; // waktu terima (ms)
}

const THROTTLE_MS = 70;
const IDLE_MS = 6_000;

const isFinePointer = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: fine)').matches && window.innerWidth >= 1024;

const topicFor = (path: string) => `cursor${path.replace(/[^a-zA-Z0-9]+/g, '-')}`;

const getMain = () => document.querySelector('main') as HTMLElement | null;

const LiveCursors: React.FC<{ path: string; userId: string; nama: string }> = ({ path, userId, nama }) => {
  const { showCursors, shareCursor, peers } = usePresence();
  const [cursors, setCursors] = useState<Record<string, RemoteCursor>>({});
  const [, force] = useState(0);
  const desktop = isFinePointer();
  const someoneHere = peers.some((p) => p.path === path);

  useEffect(() => {
    setCursors({});
    // Tidak usah buka channel kalau di HP, atau tidak ada orang lain di halaman ini
    if (!desktop || !someoneHere || (!showCursors && !shareCursor)) return;

    const color = colorForUser(userId);
    const ch = supabase.channel(topicFor(path), { config: { broadcast: { self: false } } });
    let ready = false;
    let last = 0;

    ch.on('broadcast', { event: 'cursor' }, ({ payload }) => {
      const p = payload as Partial<RemoteCursor> & { gone?: boolean };
      if (!p?.u || p.u === userId) return;
      setCursors((prev) => {
        if (p.gone) {
          if (!prev[p.u!]) return prev;
          const { [p.u!]: _, ...rest } = prev;
          return rest;
        }
        return { ...prev, [p.u!]: { u: p.u!, n: p.n || '?', c: p.c || '#2563eb', x: Number(p.x) || 0, y: Number(p.y) || 0, t: Date.now() } };
      });
    });
    ch.subscribe((status) => {
      ready = status === 'SUBSCRIBED';
    });

    const onMove = (e: PointerEvent) => {
      if (!ready || !presenceStore.get().shareCursor || document.visibilityState !== 'visible') return;
      const now = Date.now();
      if (now - last < THROTTLE_MS) return;
      last = now;
      const main = getMain();
      if (!main) return;
      const r = main.getBoundingClientRect();
      if (e.clientX < r.left || e.clientX > r.right) return;
      void ch
        .send({
          type: 'broadcast',
          event: 'cursor',
          payload: { u: userId, n: nama, c: color, x: (e.clientX - r.left) / r.width, y: e.clientY - r.top },
        })
        .catch(() => {});
    };
    const onLeave = () => {
      if (!ready) return;
      void ch.send({ type: 'broadcast', event: 'cursor', payload: { u: userId, gone: true } }).catch(() => {});
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    window.addEventListener('blur', onLeave);

    // Bersihkan kursor yang diam terlalu lama
    const sweep = window.setInterval(() => {
      const now = Date.now();
      setCursors((prev) => {
        let changed = false;
        const next: Record<string, RemoteCursor> = {};
        for (const [k, v] of Object.entries(prev)) {
          if (now - v.t < IDLE_MS) next[k] = v;
          else changed = true;
        }
        return changed ? next : prev;
      });
    }, 1500);

    return () => {
      onLeave();
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.removeEventListener('blur', onLeave);
      window.clearInterval(sweep);
      supabase.removeChannel(ch);
    };
  }, [path, userId, nama, desktop, someoneHere, showCursors, shareCursor]);

  // Posisi kursor dihitung ulang saat ukuran layar / sidebar berubah
  useEffect(() => {
    const onResize = () => force((n) => n + 1);
    window.addEventListener('resize', onResize);
    const main = getMain();
    let ro: ResizeObserver | undefined;
    if (main && typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(onResize);
      ro.observe(main);
    }
    return () => {
      window.removeEventListener('resize', onResize);
      ro?.disconnect();
    };
  }, [path]);

  const list = Object.values(cursors);
  if (!showCursors || list.length === 0) return null;
  const main = getMain();
  if (!main) return null;
  const r = main.getBoundingClientRect();
  const baseLeft = r.left + window.scrollX;
  const baseTop = r.top + window.scrollY;
  const maxTop = Math.max(document.documentElement.scrollHeight - 40, 0);

  return createPortal(
    <div aria-hidden className="pointer-events-none">
      {list.map((c) => (
        <div
          key={c.u}
          className="pointer-events-none absolute left-0 top-0 z-[60] transition-transform duration-100 ease-linear"
          style={{
            transform: `translate(${Math.round(baseLeft + c.x * r.width)}px, ${Math.round(Math.min(baseTop + c.y, maxTop))}px)`,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" className="drop-shadow" style={{ color: c.c }}>
            <path d="M3 2l7.5 19 2.6-7.6L21 11 3 2z" fill="currentColor" stroke="white" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          <span
            className="ml-3 -mt-1 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold text-white shadow"
            style={{ background: c.c }}
          >
            {c.n.split(' ')[0]}
          </span>
        </div>
      ))}
    </div>,
    document.body,
  );
};

export default LivePresence;
