import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ROLE_LABELS } from '@/lib/role-permissions';
import { cn } from '@/lib/utils';
import { initials, pageLabel, presenceStore, usePresence, type PresencePeer } from '@/lib/presence-store';
import { MousePointer2, Users, WifiOff } from 'lucide-react';

const Avatar: React.FC<{ peer: PresencePeer; size?: 'sm' | 'md'; here?: boolean; className?: string }> = ({
  peer,
  size = 'sm',
  here,
  className,
}) => (
  <span
    className={cn(
      'relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-2 ring-background',
      size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs',
      className,
    )}
    style={{ background: peer.color }}
  >
    {initials(peer.nama)}
    <span
      className={cn(
        'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500',
        here && 'animate-pulse',
      )}
    />
  </span>
);

/**
 * Tumpukan avatar user yang sedang online (di header). Yang sedang membuka
 * halaman yang sama ditaruh paling depan dan diberi tanda. Klik untuk lihat
 * semua orang + halaman yang sedang mereka buka, dan pengaturan kursor live.
 */
export const PresenceBar: React.FC = () => {
  const { peers, myPath, showCursors, shareCursor, status } = usePresence();
  const navigate = useNavigate();

  // Presence belum aktif sama sekali (mis. belum login) → tidak usah tampil
  if (status === 'off' && peers.length === 0) return null;

  // Gagal konek ke server realtime → tampilkan indikator abu-abu supaya ketahuan
  if (status === 'error' && peers.length === 0) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="flex items-center gap-1 rounded-full px-2 py-1 text-xs text-muted-foreground" aria-label="Presence offline">
            <WifiOff className="h-4 w-4" />
          </span>
        </TooltipTrigger>
        <TooltipContent>Status online tidak terhubung ke server realtime. Coba muat ulang.</TooltipContent>
      </Tooltip>
    );
  }

  // Cuma kamu yang online → indikator kecil, tetap bisa buka pengaturan kursor
  if (peers.length === 0) {
    return (
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted"
                aria-label="Hanya kamu yang online"
              >
                <span className="relative flex h-2.5 w-2.5">
                  {status === 'online' && (
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  )}
                  <span
                    className={cn(
                      'relative inline-flex h-2.5 w-2.5 rounded-full',
                      status === 'online' ? 'bg-emerald-500' : 'bg-amber-400',
                    )}
                  />
                </span>
                <span className="hidden md:inline">{status === 'online' ? 'Online' : 'Menghubungkan…'}</span>
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent>
            {status === 'online' ? 'Terhubung · saat ini cuma kamu yang online' : 'Menghubungkan ke server realtime…'}
          </TooltipContent>
        </Tooltip>
        <PopoverContent align="end" className="w-72 p-4">
          <p className="text-sm font-semibold">Belum ada orang lain online</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Begitu rekan kerja membuka Bluebook, avatar mereka muncul di sini beserta halaman yang sedang dibuka.
          </p>
        </PopoverContent>
      </Popover>
    );
  }

  const others = peers.filter((p) => !p.isMe);
  const mine = peers.filter((p) => p.isMe);
  const here = peers.filter((p) => p.path === myPath);
  const elsewhere = peers.filter((p) => p.path !== myPath);
  const ordered = [...here, ...elsewhere];
  const shown = ordered.slice(0, 4);
  const extra = ordered.length - shown.length;

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center rounded-full py-0.5 pl-0.5 pr-1 transition-colors hover:bg-muted"
              aria-label={`${peers.length} orang lain sedang online`}
            >
              <span className="flex -space-x-2">
                {shown.map((p) => (
                  <Avatar key={`${p.user_id}:${p.session ?? ""}`} peer={p} here={p.path === myPath} className="hidden sm:inline-flex" />
                ))}
              </span>
              <span className="flex items-center gap-1 px-1.5 text-xs font-medium text-muted-foreground sm:hidden">
                <Users className="h-4 w-4" /> {peers.length}
              </span>
              {extra > 0 && (
                <span className="ml-1 hidden text-xs font-medium text-muted-foreground sm:inline">+{extra}</span>
              )}
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          {here.length > 0
            ? `${here.length} orang juga di halaman ini · ${peers.length} online`
            : `${peers.length} orang sedang online`}
        </TooltipContent>
      </Tooltip>

      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-3">
          <p className="text-sm font-semibold">Sedang online</p>
          <p className="text-xs text-muted-foreground">
            {others.length} orang selain kamu
            {mine.length > 0 && ` · kamu juga aktif di ${mine.length} perangkat lain`}
          </p>
        </div>
        <ul className="max-h-72 overflow-y-auto py-1">
          {ordered.map((p) => {
            const same = p.path === myPath;
            return (
              <li key={`${p.user_id}:${p.session ?? ""}`}>
                <button
                  type="button"
                  onClick={() => !same && navigate(p.path)}
                  className={cn(
                    'flex w-full items-center gap-3 px-4 py-2 text-left transition-colors',
                    same ? 'cursor-default bg-primary/5' : 'hover:bg-muted',
                  )}
                  title={same ? 'Sedang di halaman yang sama denganmu' : `Buka ${pageLabel(p.path)}`}
                >
                  <Avatar peer={p} size="md" here={same} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {p.isMe ? 'Kamu · perangkat lain' : p.nama}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {same ? (
                        <span className="font-medium text-primary">● Di halaman ini</span>
                      ) : (
                        <>di {pageLabel(p.path)}</>
                      )}
                      {p.role && ROLE_LABELS[p.role as keyof typeof ROLE_LABELS] ? (
                        <> · {ROLE_LABELS[p.role as keyof typeof ROLE_LABELS]}</>
                      ) : null}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <div className="hidden space-y-2.5 border-t px-4 py-3 lg:block">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <MousePointer2 className="h-3.5 w-3.5" /> Kursor live
          </p>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="pres-show" className="text-xs font-normal">Tampilkan kursor orang lain</Label>
            <Switch
              id="pres-show"
              checked={showCursors}
              onCheckedChange={(v) => presenceStore.setPrefs({ showCursors: v })}
            />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="pres-share" className="text-xs font-normal">Bagikan kursor saya</Label>
            <Switch
              id="pres-share"
              checked={shareCursor}
              onCheckedChange={(v) => presenceStore.setPrefs({ shareCursor: v })}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default PresenceBar;
