import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  Users,
  FileSpreadsheet,
  Mail,
  UserCheck,
  CalendarClock,
  MessageSquareX,
  Wallet,
  CheckCheck,
  Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAppNotifications, AppNotification, NotifLevel } from '@/hooks/use-notifications';

const iconMap: Record<AppNotification['icon'], React.ComponentType<any>> = {
  alert: AlertTriangle,
  users: Users,
  sheet: FileSpreadsheet,
  mail: Mail,
  'user-check': UserCheck,
  calendar: CalendarClock,
  wa: MessageSquareX,
  atm: Wallet,
};

const levelStyle: Record<NotifLevel, { dot: string; iconBg: string; iconFg: string; ring: string }> = {
  critical: {
    dot: 'bg-rose-500',
    iconBg: 'bg-rose-500/10',
    iconFg: 'text-rose-600 dark:text-rose-400',
    ring: 'ring-rose-500/30',
  },
  warning: {
    dot: 'bg-amber-500',
    iconBg: 'bg-amber-500/10',
    iconFg: 'text-amber-600 dark:text-amber-400',
    ring: 'ring-amber-500/30',
  },
  success: {
    dot: 'bg-emerald-500',
    iconBg: 'bg-emerald-500/10',
    iconFg: 'text-emerald-600 dark:text-emerald-400',
    ring: 'ring-emerald-500/30',
  },
  info: {
    dot: 'bg-sky-500',
    iconBg: 'bg-sky-500/10',
    iconFg: 'text-sky-600 dark:text-sky-400',
    ring: 'ring-sky-500/30',
  },
};

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, readIds, markRead, markAllRead, isLoading } =
    useAppNotifications();

  const handleClick = (n: AppNotification) => {
    markRead(n.id);
    setOpen(false);
    navigate(n.href);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifikasi${unreadCount ? ` (${unreadCount} baru)` : ''}`}
          className="relative"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <>
              <span className="absolute top-1 right-1 h-4 min-w-[16px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center leading-none">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
              <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-rose-500/50 animate-ping" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[380px] p-0" sideOffset={8}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div>
            <h3 className="font-semibold text-sm">Notifikasi</h3>
            <p className="text-[11px] text-muted-foreground">
              {unreadCount > 0
                ? `${unreadCount} belum dibaca`
                : 'Semua sudah dibaca'}
            </p>
          </div>
          {notifications.length > 0 && unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-8" onClick={markAllRead}>
              <CheckCheck className="w-3.5 h-3.5 mr-1" />
              Tandai semua
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-[420px]">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Memuat notifikasi…
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Inbox className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-medium">Tidak ada notifikasi</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Semua data terpantau baik. 👍
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const Icon = iconMap[n.icon] ?? AlertTriangle;
                const style = levelStyle[n.level];
                const unread = !readIds.has(n.id);
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className={cn(
                        'w-full text-left px-4 py-3 flex gap-3 hover:bg-muted/60 transition-colors relative',
                        unread && 'bg-primary/[0.03]',
                      )}
                    >
                      {unread && (
                        <span className={cn('absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full', style.dot)} />
                      )}
                      <div
                        className={cn(
                          'shrink-0 h-9 w-9 rounded-lg flex items-center justify-center',
                          style.iconBg,
                          style.iconFg,
                        )}
                      >
                        <Icon className="w-4.5 h-4.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm leading-snug', unread ? 'font-semibold' : 'font-medium')}>
                          {n.title}
                        </p>
                        {n.description && (
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {n.description}
                          </p>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>

        <div className="px-4 py-2 border-t bg-muted/30 text-[10px] text-muted-foreground text-center">
          Diperbarui otomatis tiap 1 menit
        </div>
      </PopoverContent>
    </Popover>
  );
};
