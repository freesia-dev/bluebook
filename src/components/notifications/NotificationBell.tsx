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
  Settings2,
  Shield,
  FileText,
  Briefcase,
  CreditCard,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import {
  useAppNotifications,
  AppNotification,
  NotifLevel,
  NotifCategory,
  CATEGORY_LABELS,
} from '@/hooks/use-notifications';

const iconMap: Record<AppNotification['icon'], React.ComponentType<any>> = {
  alert: AlertTriangle,
  users: Users,
  sheet: FileSpreadsheet,
  mail: Mail,
  'user-check': UserCheck,
  calendar: CalendarClock,
  wa: MessageSquareX,
  atm: Wallet,
  shield: Shield,
  file: FileText,
  briefcase: Briefcase,
  card: CreditCard,
};

const levelStyle: Record<NotifLevel, { dot: string; iconBg: string; iconFg: string }> = {
  critical: { dot: 'bg-rose-500', iconBg: 'bg-rose-500/10', iconFg: 'text-rose-600 dark:text-rose-400' },
  warning: { dot: 'bg-amber-500', iconBg: 'bg-amber-500/10', iconFg: 'text-amber-600 dark:text-amber-400' },
  success: { dot: 'bg-emerald-500', iconBg: 'bg-emerald-500/10', iconFg: 'text-emerald-600 dark:text-emerald-400' },
  info: { dot: 'bg-sky-500', iconBg: 'bg-sky-500/10', iconFg: 'text-sky-600 dark:text-sky-400' },
};

const CATEGORY_GROUPS: { label: string; items: NotifCategory[] }[] = [
  {
    label: 'Loan Monitoring',
    items: ['monitoring_npl', 'monitoring_dpk', 'monitoring_lunas', 'monitoring_wa', 'monitoring_upload'],
  },
  { label: 'Surat', items: ['surat_masuk', 'surat_keluar'] },
  { label: 'Agenda Kredit', items: ['agenda_kredit'] },
  { label: 'ATM Telihan', items: ['atm_selisih', 'atm_pengisian'] },
  { label: 'Security', items: ['security_shift', 'security_ba_pending', 'security_comment'] },
  { label: 'Customer Service', items: ['cs_activity'] },
  { label: 'Admin', items: ['admin_pending_users', 'admin_audit_token'] },
];

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [tab, setTab] = useState<'unread' | 'all'>('unread');
  const {
    notifications,
    unreadCount,
    readIds,
    markRead,
    markAllRead,
    clearRead,
    isLoading,
    enabledCategories,
    toggleCategory,
    roleDefaults,
    savePrefs,
  } = useAppNotifications();

  const handleClick = (n: AppNotification) => {
    markRead(n.id);
    setOpen(false);
    navigate(n.href);
  };

  const visible = tab === 'unread'
    ? notifications.filter((n) => !readIds.has(n.id))
    : notifications;

  return (
    <>
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
        <PopoverContent align="end" className="w-[400px] p-0" sideOffset={8}>
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div>
              <h3 className="font-semibold text-sm">Notifikasi</h3>
              <p className="text-[11px] text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} belum dibaca` : 'Semua sudah dibaca'}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-8" onClick={markAllRead}>
                  <CheckCheck className="w-3.5 h-3.5 mr-1" />
                  Tandai semua
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPrefsOpen(true)}
                aria-label="Pengaturan notifikasi"
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <Tabs value={tab} onValueChange={(v) => setTab(v as 'unread' | 'all')}>
            <TabsList className="w-full rounded-none border-b bg-transparent h-9">
              <TabsTrigger value="unread" className="flex-1 text-xs">
                Belum dibaca {unreadCount > 0 && `(${unreadCount})`}
              </TabsTrigger>
              <TabsTrigger value="all" className="flex-1 text-xs">
                Semua ({notifications.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={tab} className="m-0">
              <ScrollArea className="max-h-[420px]">
                {isLoading ? (
                  <div className="p-6 text-center text-xs text-muted-foreground">
                    Memuat notifikasi…
                  </div>
                ) : visible.length === 0 ? (
                  <div className="p-8 text-center">
                    <Inbox className="w-10 h-10 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-medium">
                      {tab === 'unread' ? 'Semua sudah dibaca' : 'Tidak ada notifikasi'}
                    </p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {tab === 'unread'
                        ? 'Pindah tab "Semua" untuk melihat riwayat.'
                        : 'Semua data terpantau baik.'}
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y">
                    {visible.map((n) => {
                      const Icon = iconMap[n.icon] ?? AlertTriangle;
                      const style = levelStyle[n.level];
                      const unread = !readIds.has(n.id);
                      return (
                        <li key={n.id}>
                          <button
                            onClick={() => handleClick(n)}
                            className={cn(
                              'w-full text-left px-4 py-3 flex gap-3 hover:bg-muted/60 transition-colors relative',
                              unread ? 'bg-primary/[0.03]' : 'opacity-70',
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
                              <Icon className="w-4 h-4" />
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
            </TabsContent>
          </Tabs>

          <div className="px-4 py-2 border-t bg-muted/30 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">
              Diperbarui otomatis tiap 1 menit
            </span>
            <button
              onClick={clearRead}
              className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
              title="Reset status dibaca"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Pengaturan Notifikasi</DialogTitle>
            <DialogDescription>
              Pilih kategori notifikasi yang ingin Anda terima. Preferensi ini disimpan lokal per user.
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[420px] pr-3">
            <div className="space-y-4">
              {CATEGORY_GROUPS.map((group) => {
                const groupItems = group.items.filter((c) =>
                  roleDefaults.includes(c) || enabledCategories.has(c),
                );
                if (groupItems.length === 0) return null;
                return (
                  <div key={group.label}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                      {group.label}
                    </h4>
                    <div className="space-y-2">
                      {groupItems.map((c) => (
                        <label
                          key={c}
                          className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-muted/60 cursor-pointer"
                        >
                          <span className="text-sm">{CATEGORY_LABELS[c]}</span>
                          <Switch
                            checked={enabledCategories.has(c)}
                            onCheckedChange={() => toggleCategory(c)}
                          />
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => savePrefs(new Set(roleDefaults))}
            >
              Reset ke default role
            </Button>
            <Button size="sm" onClick={() => setPrefsOpen(false)}>Selesai</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
