import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ArrowDown,
  ArrowUp,
  Check,
  EyeOff,
  GripVertical,
  LayoutGrid,
  Plus,
  RotateCcw,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Tipe & util layout                                                        */
/* -------------------------------------------------------------------------- */

export type WidgetSize = 's' | 'm' | 'l';

export interface WidgetDef {
  id: string;
  title: string;
  /** Ukuran awal: s = sepertiga, m = setengah, l = selebar layar (di desktop). */
  defaultSize: WidgetSize;
  /** Ukuran yang boleh dipilih (default semua). */
  sizes?: WidgetSize[];
  /** Tersembunyi secara default (bisa ditambahkan user dari "Widget tersembunyi"). */
  defaultHidden?: boolean;
  render: () => React.ReactNode;
}

interface LayoutItem {
  id: string;
  size: WidgetSize;
  hidden: boolean;
}

interface StoredLayout {
  v: 1;
  items: LayoutItem[];
}

const SIZE_CLASS: Record<WidgetSize, string> = {
  s: 'md:col-span-6 lg:col-span-4',
  m: 'md:col-span-6 lg:col-span-6',
  l: 'md:col-span-12 lg:col-span-12',
};

const SIZE_LABEL: Record<WidgetSize, string> = { s: 'Kecil', m: 'Sedang', l: 'Lebar' };

const defaultItems = (defs: WidgetDef[]): LayoutItem[] =>
  defs.map((d) => ({ id: d.id, size: d.defaultSize, hidden: !!d.defaultHidden }));

/** Gabungkan layout tersimpan dengan daftar widget saat ini (widget baru ditambahkan, yang hilang dibuang). */
function normalize(saved: LayoutItem[] | null | undefined, defs: WidgetDef[]): LayoutItem[] {
  const byId = new Map(defs.map((d) => [d.id, d]));
  const out: LayoutItem[] = [];
  const seen = new Set<string>();
  for (const it of Array.isArray(saved) ? saved : []) {
    const def = it && byId.get(it.id);
    if (!def || seen.has(it.id)) continue;
    const allowed = def.sizes ?? ['s', 'm', 'l'];
    out.push({
      id: it.id,
      size: allowed.includes(it.size) ? it.size : def.defaultSize,
      hidden: !!it.hidden,
    });
    seen.add(it.id);
  }
  // Widget yang belum ada di layout tersimpan disisipkan di posisi default-nya
  // (setelah widget yang mendahuluinya di daftar), bukan selalu di paling bawah.
  defs.forEach((d, k) => {
    if (seen.has(d.id)) return;
    let at = 0;
    for (let j = k - 1; j >= 0; j--) {
      const idx = out.findIndex((o) => o.id === defs[j].id);
      if (idx >= 0) {
        at = idx + 1;
        break;
      }
    }
    out.splice(at, 0, { id: d.id, size: d.defaultSize, hidden: !!d.defaultHidden });
    seen.add(d.id);
  });
  return out;
}

function parseStored(raw: unknown): LayoutItem[] | null {
  try {
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (obj && typeof obj === 'object' && Array.isArray((obj as StoredLayout).items)) {
      return (obj as StoredLayout).items;
    }
  } catch {
    /* noop */
  }
  return null;
}

/* -------------------------------------------------------------------------- */
/*  Hook penyimpanan: localStorage (instan) + profiles.dashboard_layout        */
/*  (ikut pindah device). Kalau kolom belum ada di DB, tetap jalan pakai lokal. */
/* -------------------------------------------------------------------------- */

function useStoredLayout(storageKey: string, userId: string | undefined, defs: WidgetDef[]) {
  const localKey = `bluebook-layout:${storageKey}:${userId ?? 'anon'}`;
  const [items, setItems] = useState<LayoutItem[]>(() => {
    try {
      return normalize(parseStored(window.localStorage.getItem(localKey)), defs);
    } catch {
      return defaultItems(defs);
    }
  });
  const remoteOk = useRef(true);
  const saveTimer = useRef<number>();

  // Ambil dari server sekali (per user) — server menang kalau ada.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('dashboard_layout')
          .eq('user_id', userId)
          .maybeSingle();
        if (cancelled) return;
        if (error) {
          remoteOk.current = false; // kolom belum dibuat → cukup lokal
          return;
        }
        const all = (data as any)?.dashboard_layout;
        const mine = all && typeof all === 'object' ? parseStored(all[storageKey]) : null;
        if (mine) {
          setItems(normalize(mine, defs));
          try {
            window.localStorage.setItem(localKey, JSON.stringify({ v: 1, items: mine }));
          } catch {
            /* noop */
          }
        }
      } catch {
        remoteOk.current = false;
      }
    })();
    return () => {
      cancelled = true;
    };
    // defs sengaja tidak jadi dependency: cukup sekali per user
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, storageKey]);

  // Kalau daftar widget berubah (mis. role admin baru termuat), rapikan lagi.
  const defIds = defs.map((d) => d.id).join('|');
  useEffect(() => {
    setItems((prev) => normalize(prev, defs));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defIds]);

  const persist = useCallback(
    (next: LayoutItem[]) => {
      const payload: StoredLayout = { v: 1, items: next };
      try {
        window.localStorage.setItem(localKey, JSON.stringify(payload));
      } catch {
        /* noop */
      }
      if (!userId || !remoteOk.current) return;
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('dashboard_layout')
            .eq('user_id', userId)
            .maybeSingle();
          if (error) {
            remoteOk.current = false;
            return;
          }
          const prevAll = ((data as any)?.dashboard_layout as Record<string, unknown>) || {};
          await supabase
            .from('profiles')
            .update({ dashboard_layout: { ...prevAll, [storageKey]: payload } } as any)
            .eq('user_id', userId);
        } catch {
          /* best effort */
        }
      }, 700);
    },
    [localKey, storageKey, userId],
  );

  const update = useCallback(
    (fn: (prev: LayoutItem[]) => LayoutItem[]) => {
      setItems((prev) => {
        const next = fn(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const reset = useCallback(() => update(() => defaultItems(defs)), [defs, update]);

  return { items, update, reset };
}

/* -------------------------------------------------------------------------- */
/*  Komponen                                                                  */
/* -------------------------------------------------------------------------- */

interface CustomizableGridProps {
  /** Kunci unik per halaman, mis. 'dashboard'. */
  storageKey: string;
  userId?: string;
  widgets: WidgetDef[];
  /** Taruh tombol "Atur dashboard" di sini (mis. di PageHeader) lewat render prop. */
  renderToggle?: (props: { editing: boolean; toggle: () => void }) => React.ReactNode;
}

/**
 * Grid widget yang bisa disusun bebas oleh tiap user:
 * seret untuk memindah (desktop), panah naik/turun (HP), ganti ukuran,
 * sembunyikan/tampilkan lagi, dan reset. Susunan tersimpan per akun.
 */
export const CustomizableGrid: React.FC<CustomizableGridProps> = ({ storageKey, userId, widgets, renderToggle }) => {
  const { items, update, reset } = useStoredLayout(storageKey, userId, widgets);
  const [editing, setEditing] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const defsById = useMemo(() => new Map(widgets.map((w) => [w.id, w])), [widgets]);

  const visible = items.filter((i) => !i.hidden && defsById.has(i.id));
  const hidden = items.filter((i) => i.hidden && defsById.has(i.id));

  const move = (id: string, dir: -1 | 1) =>
    update((prev) => {
      const vis = prev.filter((p) => !p.hidden);
      const idx = vis.findIndex((p) => p.id === id);
      const target = vis[idx + dir];
      if (idx < 0 || !target) return prev;
      const a = prev.findIndex((p) => p.id === id);
      const b = prev.findIndex((p) => p.id === target.id);
      const next = [...prev];
      [next[a], next[b]] = [next[b], next[a]];
      return next;
    });

  const moveBefore = (id: string, beforeId: string) =>
    update((prev) => {
      if (id === beforeId) return prev;
      const item = prev.find((p) => p.id === id);
      if (!item) return prev;
      const rest = prev.filter((p) => p.id !== id);
      const at = rest.findIndex((p) => p.id === beforeId);
      rest.splice(at < 0 ? rest.length : at, 0, item);
      return rest;
    });

  const setSize = (id: string, size: WidgetSize) =>
    update((prev) => prev.map((p) => (p.id === id ? { ...p, size } : p)));
  const setHidden = (id: string, value: boolean) =>
    update((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, hidden: value } : p));
      if (value) return next;
      // widget yang ditampilkan lagi ditaruh paling bawah
      const item = next.find((p) => p.id === id)!;
      return [...next.filter((p) => p.id !== id), item];
    });

  const toggle = () => setEditing((v) => !v);

  return (
    <div>
      {renderToggle?.({ editing, toggle })}

      {editing && (
        <div className="mb-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground">
              <LayoutGrid className="mr-1.5 inline h-4 w-4 text-primary" />
              <span className="font-semibold">Mode atur dashboard.</span>{' '}
              <span className="text-muted-foreground">
                <span className="hidden lg:inline">Seret kartu untuk memindah, pilih ukuran, atau sembunyikan yang tidak perlu.</span>
                <span className="lg:hidden">Pakai panah untuk memindah, atau sembunyikan yang tidak perlu.</span>
              </span>
            </p>
            <div className="flex shrink-0 gap-2">
              <Button size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset
              </Button>
              <Button size="sm" onClick={() => setEditing(false)}>
                <Check className="mr-1.5 h-3.5 w-3.5" /> Selesai
              </Button>
            </div>
          </div>
          {hidden.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-primary/20 pt-3">
              <span className="text-xs text-muted-foreground">Widget tersembunyi:</span>
              {hidden.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setHidden(h.id, false)}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium hover:border-primary/50 hover:text-primary"
                >
                  <Plus className="h-3 w-3" /> {defsById.get(h.id)?.title}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-5">
        {visible.map((it, i) => {
          const def = defsById.get(it.id)!;
          const allowed = def.sizes ?? (['s', 'm', 'l'] as WidgetSize[]);
          return (
            <div
              key={it.id}
              className={cn(
                'relative flex min-w-0 flex-col transition-all duration-200',
                SIZE_CLASS[it.size],
                editing && 'rounded-2xl outline-dashed outline-1 outline-offset-4 outline-primary/40',
                editing && overId === it.id && dragId !== it.id && 'outline-2 outline-primary',
                dragId === it.id && 'opacity-40',
              )}
              draggable={editing}
              onDragStart={(e) => {
                if (!editing) return;
                setDragId(it.id);
                e.dataTransfer.effectAllowed = 'move';
                try {
                  e.dataTransfer.setData('text/plain', it.id);
                } catch {
                  /* noop */
                }
              }}
              onDragOver={(e) => {
                if (!editing || !dragId) return;
                e.preventDefault();
                if (overId !== it.id) setOverId(it.id);
              }}
              onDragLeave={() => setOverId((o) => (o === it.id ? null : o))}
              onDrop={(e) => {
                if (!editing || !dragId) return;
                e.preventDefault();
                moveBefore(dragId, it.id);
                setDragId(null);
                setOverId(null);
              }}
              onDragEnd={() => {
                setDragId(null);
                setOverId(null);
              }}
            >
              {editing && (
                <div className="mb-2 flex items-center gap-1 rounded-xl border bg-card/95 px-2 py-1.5 shadow-sm backdrop-blur">
                  <GripVertical className="hidden h-4 w-4 shrink-0 cursor-grab text-muted-foreground md:block" />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold">{def.title}</span>
                  <div className="hidden items-center rounded-md border p-0.5 lg:flex">
                    {allowed.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setSize(it.id, sz)}
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-medium',
                          it.size === sz ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                        )}
                        title={`Ukuran ${SIZE_LABEL[sz]}`}
                      >
                        {SIZE_LABEL[sz]}
                      </button>
                    ))}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={i === 0}
                    onClick={() => move(it.id, -1)}
                    title="Pindah ke atas"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7"
                    disabled={i === visible.length - 1}
                    onClick={() => move(it.id, 1)}
                    title="Pindah ke bawah"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-rose-600"
                    onClick={() => setHidden(it.id, true)}
                    title="Sembunyikan"
                  >
                    <EyeOff className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
              <div
                className={cn(
                  'min-h-0 flex-1 [&>*]:h-full',
                  editing && 'pointer-events-none select-none',
                )}
                aria-hidden={editing || undefined}
              >
                {def.render()}
              </div>
            </div>
          );
        })}
      </div>

      {visible.length === 0 && (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Semua widget disembunyikan. Klik <span className="font-medium">Atur dashboard</span> lalu tambahkan lagi.
        </div>
      )}
    </div>
  );
};

export default CustomizableGrid;
