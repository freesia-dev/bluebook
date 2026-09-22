import React from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

/**
 * Error "gagal memuat modul" biasanya muncul sesaat setelah deploy baru (file
 * chunk lama sudah tidak ada). Obatnya cukup reload — sama seperti logika di
 * main.tsx, yang tidak lagi kebagian event-nya karena error sudah ditangkap
 * boundary ini. Dijaga maksimal sekali per 10 detik supaya tidak loop.
 */
const CHUNK_ERR = /Importing a module script failed|Failed to fetch dynamically imported module|error loading dynamically imported module|Loading chunk .* failed/i;
function reloadIfChunkError(error: unknown): boolean {
  const msg = String((error as any)?.message || error || '');
  if (!CHUNK_ERR.test(msg)) return false;
  try {
    const key = '__chunk_reload_at';
    const last = Number(sessionStorage.getItem(key) || 0);
    if (Date.now() - last > 10_000) {
      sessionStorage.setItem(key, String(Date.now()));
      window.location.reload();
      return true;
    }
  } catch {
    /* noop */
  }
  return false;
}

interface BoundaryProps {
  children: React.ReactNode;
  /** Kalau nilai ini berubah (mis. pindah halaman), boundary di-reset otomatis. */
  resetKey?: string;
  /** Tampilan pengganti saat error. Default: null (diam-diam disembunyikan). */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  /** Label untuk log console. */
  name?: string;
}

interface BoundaryState {
  error: Error | null;
}

/**
 * Penangkap error render. Tujuannya: satu komponen yang error TIDAK boleh
 * bikin seluruh aplikasi jadi layar putih/blank.
 */
export class ErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): BoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    if (reloadIfChunkError(error)) return;
    // eslint-disable-next-line no-console
    console.error(`[ErrorBoundary${this.props.name ? `:${this.props.name}` : ''}]`, error, info?.componentStack);
  }

  componentDidUpdate(prev: BoundaryProps) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) return this.props.fallback ? this.props.fallback(this.state.error, this.reset) : null;
    return this.props.children;
  }
}

/** Untuk fitur tambahan global (sapaan, presence, pengecek versi): kalau error, cukup disembunyikan. */
export const SilentBoundary: React.FC<{ name: string; children: React.ReactNode }> = ({ name, children }) => (
  <ErrorBoundary name={name}>{children}</ErrorBoundary>
);

/** Tampilan ramah saat satu halaman error — sidebar & header tetap bisa dipakai. */
export const PageErrorFallback: React.FC<{ error: Error; onRetry: () => void }> = ({ error, onRetry }) => (
  <div className="mx-auto mt-10 max-w-lg rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
      <AlertTriangle className="h-6 w-6 text-amber-600" />
    </div>
    <h2 className="font-display text-lg font-semibold">Halaman ini sedang bermasalah</h2>
    <p className="mt-1 text-sm text-muted-foreground">
      Bagian lain Bluebook tetap bisa dipakai. Coba muat ulang, atau kembali ke Dashboard.
    </p>
    <div className="mt-5 flex flex-wrap justify-center gap-2">
      <button
        type="button"
        onClick={() => {
          onRetry();
          window.location.reload();
        }}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        <RefreshCw className="h-4 w-4" /> Muat ulang
      </button>
      <a
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        <Home className="h-4 w-4" /> Ke Dashboard
      </a>
    </div>
    <details className="mt-4 text-left text-xs text-muted-foreground">
      <summary className="cursor-pointer select-none">Detail teknis</summary>
      <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded bg-muted p-2">{String(error?.message || error)}</pre>
    </details>
  </div>
);

/** Boundary per halaman yang otomatis reset saat user pindah route. */
export const RouteErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  return (
    <ErrorBoundary
      name="route"
      resetKey={location.pathname}
      fallback={(error, reset) => <PageErrorFallback error={error} onRetry={reset} />}
    >
      {children}
    </ErrorBoundary>
  );
};

export default ErrorBoundary;
