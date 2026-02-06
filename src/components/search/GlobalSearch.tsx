import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Mail, Send, CreditCard, FileText, Banknote, X } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SuratMasuk, SuratKeluar, SPPK, PK, KKMPAK, NomorLoan, AgendaKreditEntry, PengisianATM } from '@/types';

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  module: string;
  icon: React.ElementType;
  href: string;
  badgeColor: string;
}

export const GlobalSearch: React.FC = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const getSearchResults = useCallback((query: string): SearchResult[] => {
    if (!query || query.length < 2) return [];
    const q = query.toLowerCase();
    const results: SearchResult[] = [];
    const maxPerModule = 5;

    // Search Surat Masuk
    const suratMasuk = queryClient.getQueryData<SuratMasuk[]>(['surat-masuk']);
    if (suratMasuk) {
      const matches = suratMasuk
        .filter(s =>
          s.namaPengirim.toLowerCase().includes(q) ||
          s.perihal.toLowerCase().includes(q) ||
          s.nomorAgenda.toLowerCase().includes(q) ||
          s.nomorSuratMasuk.toLowerCase().includes(q)
        )
        .slice(0, maxPerModule)
        .map(s => ({
          id: `sm-${s.id}`,
          title: s.perihal,
          subtitle: `${s.nomorAgenda} • ${s.namaPengirim}`,
          module: 'Surat Masuk',
          icon: Mail,
          href: '/surat-masuk',
          badgeColor: 'bg-blue-500/10 text-blue-600',
        }));
      results.push(...matches);
    }

    // Search Surat Keluar
    const suratKeluar = queryClient.getQueryData<SuratKeluar[]>(['surat-keluar']);
    if (suratKeluar) {
      const matches = suratKeluar
        .filter(s =>
          s.namaPenerima.toLowerCase().includes(q) ||
          s.perihal.toLowerCase().includes(q) ||
          s.nomorAgenda.toLowerCase().includes(q)
        )
        .slice(0, maxPerModule)
        .map(s => ({
          id: `sk-${s.id}`,
          title: s.perihal,
          subtitle: `${s.nomorAgenda} • ${s.namaPenerima}`,
          module: 'Surat Keluar',
          icon: Send,
          href: '/surat-keluar',
          badgeColor: 'bg-green-500/10 text-green-600',
        }));
      results.push(...matches);
    }

    // Search SPPK
    const sppk = queryClient.getQueryData<SPPK[]>(['sppk']);
    if (sppk) {
      const matches = sppk
        .filter(s =>
          s.namaDebitur.toLowerCase().includes(q) ||
          s.nomorSPPK.toLowerCase().includes(q) ||
          s.jenisKredit.toLowerCase().includes(q)
        )
        .slice(0, maxPerModule)
        .map(s => ({
          id: `sppk-${s.id}`,
          title: s.namaDebitur,
          subtitle: `${s.nomorSPPK} • Rp ${s.plafon.toLocaleString('id-ID')}`,
          module: `SPPK ${s.type === 'telihan' ? 'Telihan' : 'Meranti'}`,
          icon: CreditCard,
          href: `/agenda-kredit/sppk-${s.type}`,
          badgeColor: 'bg-purple-500/10 text-purple-600',
        }));
      results.push(...matches);
    }

    // Search PK
    const pk = queryClient.getQueryData<PK[]>(['pk']);
    if (pk) {
      const matches = pk
        .filter(s =>
          s.namaDebitur.toLowerCase().includes(q) ||
          s.nomorPK.toLowerCase().includes(q) ||
          s.jenisKredit.toLowerCase().includes(q)
        )
        .slice(0, maxPerModule)
        .map(s => ({
          id: `pk-${s.id}`,
          title: s.namaDebitur,
          subtitle: `${s.nomorPK} • Rp ${s.plafon.toLocaleString('id-ID')}`,
          module: `PK ${s.type === 'telihan' ? 'Telihan' : 'Meranti'}`,
          icon: FileText,
          href: `/agenda-kredit/pk-${s.type}`,
          badgeColor: 'bg-orange-500/10 text-orange-600',
        }));
      results.push(...matches);
    }

    // Search KKMPAK
    const kkmpak = queryClient.getQueryData<KKMPAK[]>(['kkmpak']);
    if (kkmpak) {
      const matches = kkmpak
        .filter(s =>
          s.namaDebitur.toLowerCase().includes(q) ||
          s.nomorKK.toLowerCase().includes(q) ||
          s.nomorMPAK.toLowerCase().includes(q)
        )
        .slice(0, maxPerModule)
        .map(s => ({
          id: `kk-${s.id}`,
          title: s.namaDebitur,
          subtitle: `KK: ${s.nomorKK} • MPAK: ${s.nomorMPAK}`,
          module: `KK/MPAK ${s.type === 'telihan' ? 'Telihan' : 'Meranti'}`,
          icon: CreditCard,
          href: s.type === 'telihan' ? '/agenda-kredit/kk-mpak-telihan' : '/agenda-kredit/agenda-mpak-meranti',
          badgeColor: 'bg-teal-500/10 text-teal-600',
        }));
      results.push(...matches);
    }

    // Search Agenda Kredit
    const agendaKredit = queryClient.getQueryData<AgendaKreditEntry[]>(['agenda-kredit-entry']);
    if (agendaKredit) {
      const matches = agendaKredit
        .filter(s =>
          s.namaPengirim.toLowerCase().includes(q) ||
          s.perihal.toLowerCase().includes(q) ||
          s.nomorAgenda.toLowerCase().includes(q)
        )
        .slice(0, maxPerModule)
        .map(s => ({
          id: `ak-${s.id}`,
          title: s.perihal,
          subtitle: `${s.nomorAgenda} • ${s.namaPengirim}`,
          module: 'Agenda Kredit',
          icon: FileText,
          href: '/agenda-kredit/agenda-kredit',
          badgeColor: 'bg-indigo-500/10 text-indigo-600',
        }));
      results.push(...matches);
    }

    return results;
  }, [queryClient]);

  const [query, setQuery] = useState('');
  const results = useMemo(() => getSearchResults(query), [query, getSearchResults]);

  // Group results by module
  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach(r => {
      if (!groups[r.module]) groups[r.module] = [];
      groups[r.module].push(r);
    });
    return groups;
  }, [results]);

  const handleSelect = (href: string) => {
    setOpen(false);
    setQuery('');
    navigate(href);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="relative h-9 w-9 md:w-64 md:justify-start md:px-3 md:py-2 gap-2"
      >
        <Search className="h-4 w-4 shrink-0 opacity-50" />
        <span className="hidden md:inline-flex text-sm text-muted-foreground">
          Cari data...
        </span>
        <kbd className="hidden md:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-auto">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Cari di semua modul (surat, kredit, ATM)..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>
            {query.length < 2 
              ? 'Ketik minimal 2 karakter untuk mencari...'
              : 'Tidak ada hasil ditemukan.'
            }
          </CommandEmpty>
          {Object.entries(groupedResults).map(([module, items]) => (
            <CommandGroup key={module} heading={module}>
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.title} ${item.subtitle}`}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center gap-3 py-3 cursor-pointer"
                  >
                    <Icon className="h-4 w-4 shrink-0 opacity-60" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                    </div>
                    <Badge variant="secondary" className={`shrink-0 text-[10px] ${item.badgeColor}`}>
                      {item.module}
                    </Badge>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
};
