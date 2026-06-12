// Shared helpers for CS per-page Excel imports.

export function asString(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).trim();
}

export function asNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  const s = asString(v).replace(/[^\d.-]/g, '');
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

/** Convert any value (Date, ISO string, dd/mm/yyyy, Excel serial) to YYYY-MM-DD. */
export function asDate(v: unknown, fallback: string = new Date().toISOString().slice(0, 10)): string {
  if (!v && v !== 0) return fallback;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    // Excel serial date
    const utcDays = v - 25569;
    const ms = utcDays * 86400 * 1000;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(v).trim();
  if (!s) return fallback;
  // dd/mm/yyyy or dd-mm-yyyy
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    let [, d, mo, y] = m;
    if (y.length === 2) y = '20' + y;
    return `${y.padStart(4, '0')}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  // yyyy-mm-dd or other parseable
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return fallback;
}

/** Pick a value from a row using any of the accepted header names (case-insensitive). */
export function pick(row: Record<string, unknown>, ...names: string[]): unknown {
  const keys = Object.keys(row);
  for (const n of names) {
    const found = keys.find((k) => k.trim().toLowerCase() === n.trim().toLowerCase());
    if (found !== undefined) return row[found];
  }
  return undefined;
}
