import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { isRouteAllowedFor } from '@/lib/role-permissions';
import { COMMAND_PAGES } from '@/lib/command-pages';
import { useGlobalDataSearch } from '@/hooks/use-global-data-search';

/** Tampilan tombol keyboard di penunjuk bawah command bar. */
const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px] font-medium text-foreground">{children}</kbd>
);

/**
 * Command bar utama Bluebook (Ctrl+K / Cmd+K dari mana saja). Menggabungkan
 * dua hal dalam satu kotak: navigasi cepat ke halaman/menu (COMMAND_PAGES,
 * difilter sesuai role user) dan pencarian data lintas modul (sumber sama
 * dengan kotak cari di header - lihat useGlobalDataSearch). Tujuannya biar
 * command bar ini jadi cara utama pindah-pindah di Bluebook, bukan cuma
 * shortcut kecil buat fokus ke kotak cari.
 */
export const CommandPalette: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const navigate = useNavigate();
  const { permissions, isAuthenticated } = useAuth();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 250);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Reset query tiap kali ditutup/dibuka lagi
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const { results: dataResults, groupedResults, isFetching } = useGlobalDataSearch(debounced);

  if (!isAuthenticated) return null;

  const allowedPages = COMMAND_PAGES.filter((p) => isRouteAllowedFor(p.path, permissions));
  const term = query.trim().toLowerCase();
  const matchedPages = term.length === 0
    ? allowedPages
    : allowedPages.filter((p) =>
        p.label.toLowerCase().includes(term) ||
        p.group.toLowerCase().includes(term) ||
        (p.keywords || []).some((k) => k.toLowerCase().includes(term))
      );

  const groupedPages = matchedPages.reduce<Record<string, typeof matchedPages>>((acc, p) => {
    (acc[p.group] ||= []).push(p);
    return acc;
  }, {});

  const goToPage = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  const goToRecord = (item: (typeof dataResults)[number]) => {
    setOpen(false);
    navigate(item.href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Ketik nama halaman, nasabah, nomor PK/SPPK, dsb..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {matchedPages.length === 0 && dataResults.length === 0 && !isFetching && (
          <CommandEmpty>Tidak ada hasil. Coba kata kunci lain.</CommandEmpty>
        )}

        {Object.entries(groupedPages).map(([group, pages]) => (
          <CommandGroup key={group} heading={group}>
            {pages.map((p) => (
              <CommandItem
                key={p.path}
                value={`page-${p.path}-${p.label}`}
                onSelect={() => goToPage(p.path)}
              >
                <ArrowRight className="opacity-50" />
                <span>{p.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}

        {term.length >= 2 && (
          <CommandGroup heading="Data">
            {isFetching && dataResults.length === 0 ? (
              <div className="flex items-center gap-2 px-2 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Mencari data...
              </div>
            ) : (
              Object.entries(groupedResults).map(([module, items]) =>
                items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <CommandItem
                      key={item.id}
                      value={`data-${item.id}-${item.title}`}
                      onSelect={() => goToRecord(item)}
                    >
                      <Icon className="opacity-60" />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate">{item.title}</span>
                        <span className="truncate text-xs text-muted-foreground">{item.subtitle}</span>
                      </div>
                      <Badge variant="secondary" className={`shrink-0 text-[10px] ${item.badgeColor}`}>
                        {module}
                      </Badge>
                    </CommandItem>
                  );
                })
              )
            )}
          </CommandGroup>
        )}
      </CommandList>
      {/* Penunjuk tombol — banyak yang tidak tahu bisa pilih pakai panah lalu Enter */}
      <div className="hidden items-center justify-between gap-3 border-t px-3 py-2 text-[11px] text-muted-foreground sm:flex">
        <span className="flex items-center gap-3">
          <span>
            <Kbd>↑</Kbd> <Kbd>↓</Kbd> pilih
          </span>
          <span>
            <Kbd>Enter</Kbd> buka
          </span>
          <span>
            <Kbd>Esc</Kbd> tutup
          </span>
        </span>
        <span>
          <Kbd>Ctrl</Kbd> + <Kbd>K</Kbd> dari mana saja
        </span>
      </div>
    </CommandDialog>
  );
};
