// Store kecil (tanpa library) untuk data "presence" live — siapa yang sedang
// online & di halaman mana. Diisi oleh <LivePresence /> (di dalam Router) dan
// dibaca oleh <PresenceBar /> di header MainLayout.
import { useSyncExternalStore } from 'react';
import { COMMAND_PAGES } from '@/lib/command-pages';

export interface PresencePeer {
  user_id: string;
  /** ID sesi/tab — satu akun bisa online di beberapa perangkat sekaligus */
  session?: string;
  /** true kalau ini akun yang sama dengan user sendiri, tapi di perangkat/tab lain */
  isMe?: boolean;
  nama: string;
  role?: string;
  path: string;
  color: string;
  /** waktu terakhir peer ini melaporkan dirinya (ISO) */
  at: string;
}

export type PresenceStatus = 'off' | 'connecting' | 'online' | 'error';

interface PresenceState {
  peers: PresencePeer[]; // tidak termasuk sesi/tab ini sendiri
  status: PresenceStatus;
  myPath: string;
  showCursors: boolean;
  shareCursor: boolean;
}

const PREF_KEY = 'bluebook-presence-prefs';

const loadPrefs = (): Pick<PresenceState, 'showCursors' | 'shareCursor'> => {
  try {
    const raw = window.localStorage.getItem(PREF_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      return { showCursors: p.showCursors !== false, shareCursor: p.shareCursor !== false };
    }
  } catch {
    /* noop */
  }
  return { showCursors: true, shareCursor: true };
};

let state: PresenceState = {
  peers: [],
  status: 'off',
  myPath: typeof window !== 'undefined' ? window.location.pathname : '/',
  ...(typeof window !== 'undefined' ? loadPrefs() : { showCursors: true, shareCursor: true }),
};
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

export const presenceStore = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  setPeers: (peers: PresencePeer[]) => {
    state = { ...state, peers };
    emit();
  },
  setStatus: (status: PresenceStatus) => {
    if (state.status === status) return;
    state = { ...state, status };
    emit();
  },
  setMyPath: (myPath: string) => {
    if (state.myPath === myPath) return;
    state = { ...state, myPath };
    emit();
  },
  setPrefs: (prefs: Partial<Pick<PresenceState, 'showCursors' | 'shareCursor'>>) => {
    state = { ...state, ...prefs };
    try {
      window.localStorage.setItem(
        PREF_KEY,
        JSON.stringify({ showCursors: state.showCursors, shareCursor: state.shareCursor }),
      );
    } catch {
      /* noop */
    }
    emit();
  },
};

export function usePresence(): PresenceState {
  return useSyncExternalStore(presenceStore.subscribe, presenceStore.get, presenceStore.get);
}

/* ------------------------------------------------------------------ util ---- */

const PALETTE = ['#2563eb', '#16a34a', '#db2777', '#ea580c', '#7c3aed', '#0891b2', '#ca8a04', '#dc2626', '#4f46e5', '#059669'];

/**
 * ID unik per tab / per kali halaman dibuka. Dipakai sebagai kunci presence,
 * supaya akun yang sama di HP & laptop tetap tercatat sebagai dua sesi.
 */
export const SESSION_ID: string = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

/** Warna konsisten per user (dari hash user id). */
export function colorForUser(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function initials(nama: string): string {
  const parts = (nama || '?').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Nama halaman yang ramah dibaca dari path, mis. "/kalkulator/riwayat" → "Riwayat Simulasi". */
export function pageLabel(path: string): string {
  const exact = COMMAND_PAGES.find((p) => p.path === path);
  if (exact) return exact.label;
  // cocokkan prefix terpanjang (untuk halaman detail)
  const prefix = [...COMMAND_PAGES]
    .filter((p) => p.path !== '/' && path.startsWith(p.path + '/'))
    .sort((a, b) => b.path.length - a.path.length)[0];
  if (prefix) return prefix.label;
  if (path === '/' || path === '/dashboard') return 'Dashboard';
  const last = path.split('/').filter(Boolean).pop() || 'Halaman';
  return last.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}
