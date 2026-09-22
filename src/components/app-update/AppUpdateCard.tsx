import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Download, Loader2, RefreshCw, WifiOff } from 'lucide-react';
import {
  CURRENT_BUILD_ID,
  CURRENT_BUILT_AT,
  checkForAppUpdate,
  forceUpdateAndReload,
  formatBuildTime,
  type RemoteVersion,
} from '@/lib/app-update';

type State =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'latest' }
  | { kind: 'available'; remote: RemoteVersion }
  | { kind: 'unknown' }
  | { kind: 'installing' };

/** Kartu "Versi Aplikasi" + tombol cek & pasang update (halaman About). */
export const AppUpdateCard: React.FC = () => {
  const [state, setState] = useState<State>({ kind: 'idle' });

  const check = async () => {
    setState({ kind: 'checking' });
    const res = await checkForAppUpdate();
    if (res.status === 'update-available') setState({ kind: 'available', remote: res.remote });
    else if (res.status === 'up-to-date') setState({ kind: 'latest' });
    else setState({ kind: 'unknown' });
  };

  const install = () => {
    setState({ kind: 'installing' });
    void forceUpdateAndReload();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">Versi Aplikasi</h3>
          <p className="text-xs text-muted-foreground">
            Build <span className="font-mono font-semibold text-foreground">{CURRENT_BUILD_ID}</span>
            {' · '}dipasang {formatBuildTime(CURRENT_BUILT_AT)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {state.kind === 'available' ? (
            <Button onClick={install}>
              <Download className="mr-2 h-4 w-4" /> Pasang update sekarang
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={check}
              disabled={state.kind === 'checking' || state.kind === 'installing'}
            >
              {state.kind === 'checking' || state.kind === 'installing' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {state.kind === 'installing' ? 'Memasang…' : 'Cek update'}
            </Button>
          )}
        </div>
      </div>

      {state.kind === 'latest' && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-700 dark:text-emerald-300 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" /> Kamu sudah memakai versi terbaru.
          </span>
          <button type="button" onClick={install} className="text-xs underline underline-offset-2 opacity-80 hover:opacity-100">
            Tampilan masih aneh? Muat ulang bersih
          </button>
        </div>
      )}
      {state.kind === 'available' && (
        <p className="mt-4 rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
          Versi baru tersedia (build <span className="font-mono font-semibold">{state.remote.build}</span>
          {state.remote.builtAt ? `, ${formatBuildTime(state.remote.builtAt)}` : ''}). Data & login kamu tetap aman.
        </p>
      )}
      {state.kind === 'unknown' && (
        <div className="mt-4 flex flex-col gap-2 rounded-lg bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2">
            <WifiOff className="h-4 w-4" /> Tidak bisa cek versi (koneksi?). Tetap bisa muat ulang bersih.
          </span>
          <button type="button" onClick={install} className="text-xs underline underline-offset-2">
            Muat ulang bersih
          </button>
        </div>
      )}
    </div>
  );
};

export default AppUpdateCard;
