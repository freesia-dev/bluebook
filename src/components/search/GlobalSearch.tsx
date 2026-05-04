import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Search, Mail, Send, CreditCard, FileText, X, Pencil, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { SuratMasuk, SuratKeluar, SPPK, PK, KKMPAK, AgendaKreditEntry } from '@/types';

type AnyRecord = SuratMasuk | SuratKeluar | SPPK | PK | KKMPAK | AgendaKreditEntry;

interface SearchResult {
  id: string;
  recordId: string;
  title: string;
  subtitle: string;
  module: string;
  icon: React.ElementType;
  href: string;
  badgeColor: string;
  record: AnyRecord;
}

export const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getSearchResults = useCallback((q: string): SearchResult[] => {
    if (!q || q.length < 2) return [];
    const lower = q.toLowerCase();
    const results: SearchResult[] = [];
    const maxPerModule = 5;

    const suratMasuk = queryClient.getQueryData<SuratMasuk[]>(['surat-masuk']);
    if (suratMasuk) {
      results.push(...suratMasuk
        .filter(s => s.namaPengirim.toLowerCase().includes(lower) || s.perihal.toLowerCase().includes(lower) || s.nomorAgenda.toLowerCase().includes(lower) || s.nomorSuratMasuk.toLowerCase().includes(lower))
        .slice(0, maxPerModule)
        .map(s => ({ id: `sm-${s.id}`, title: s.perihal, subtitle: `${s.nomorAgenda} • ${s.namaPengirim}`, module: 'Surat Masuk', icon: Mail, href: '/surat-masuk', badgeColor: 'bg-blue-500/10 text-blue-600' })));
    }

    const suratKeluar = queryClient.getQueryData<SuratKeluar[]>(['surat-keluar']);
    if (suratKeluar) {
      results.push(...suratKeluar
        .filter(s => s.namaPenerima.toLowerCase().includes(lower) || s.perihal.toLowerCase().includes(lower) || s.nomorAgenda.toLowerCase().includes(lower))
        .slice(0, maxPerModule)
        .map(s => ({ id: `sk-${s.id}`, title: s.perihal, subtitle: `${s.nomorAgenda} • ${s.namaPenerima}`, module: 'Surat Keluar', icon: Send, href: '/surat-keluar', badgeColor: 'bg-green-500/10 text-green-600' })));
    }

    const sppk = queryClient.getQueryData<SPPK[]>(['sppk']);
    if (sppk) {
      results.push(...sppk
        .filter(s => s.namaDebitur.toLowerCase().includes(lower) || s.nomorSPPK.toLowerCase().includes(lower) || s.jenisKredit.toLowerCase().includes(lower))
        .slice(0, maxPerModule)
        .map(s => ({ id: `sppk-${s.id}`, title: s.namaDebitur, subtitle: `${s.nomorSPPK} • Rp ${s.plafon.toLocaleString('id-ID')}`, module: `SPPK ${s.type === 'telihan' ? 'Telihan' : 'Meranti'}`, icon: CreditCard, href: `/agenda-kredit/sppk-${s.type}`, badgeColor: 'bg-purple-500/10 text-purple-600' })));
    }

    const pk = queryClient.getQueryData<PK[]>(['pk']);
    if (pk) {
      results.push(...pk
        .filter(s => s.namaDebitur.toLowerCase().includes(lower) || s.nomorPK.toLowerCase().includes(lower) || s.jenisKredit.toLowerCase().includes(lower))
        .slice(0, maxPerModule)
        .map(s => ({ id: `pk-${s.id}`, title: s.namaDebitur, subtitle: `${s.nomorPK} • Rp ${s.plafon.toLocaleString('id-ID')}`, module: `PK ${s.type === 'telihan' ? 'Telihan' : 'Meranti'}`, icon: FileText, href: `/agenda-kredit/pk-${s.type}`, badgeColor: 'bg-orange-500/10 text-orange-600' })));
    }

    const kkmpak = queryClient.getQueryData<KKMPAK[]>(['kkmpak']);
    if (kkmpak) {
      results.push(...kkmpak
        .filter(s => s.namaDebitur.toLowerCase().includes(lower) || s.nomorKK.toLowerCase().includes(lower) || s.nomorMPAK.toLowerCase().includes(lower))
        .slice(0, maxPerModule)
        .map(s => ({ id: `kk-${s.id}`, title: s.namaDebitur, subtitle: `KK: ${s.nomorKK} • MPAK: ${s.nomorMPAK}`, module: `KK/MPAK ${s.type === 'telihan' ? 'Telihan' : 'Meranti'}`, icon: CreditCard, href: s.type === 'telihan' ? '/agenda-kredit/kk-mpak-telihan' : '/agenda-kredit/agenda-mpak-meranti', badgeColor: 'bg-teal-500/10 text-teal-600' })));
    }

    const agendaKredit = queryClient.getQueryData<AgendaKreditEntry[]>(['agenda-kredit-entry']);
    if (agendaKredit) {
      results.push(...agendaKredit
        .filter(s => s.namaPengirim.toLowerCase().includes(lower) || s.perihal.toLowerCase().includes(lower) || s.nomorAgenda.toLowerCase().includes(lower))
        .slice(0, maxPerModule)
        .map(s => ({ id: `ak-${s.id}`, title: s.perihal, subtitle: `${s.nomorAgenda} • ${s.namaPengirim}`, module: 'Agenda Kredit', icon: FileText, href: '/agenda-kredit/agenda-kredit', badgeColor: 'bg-indigo-500/10 text-indigo-600' })));
    }

    return results;
  }, [queryClient]);

  const results = useMemo(() => getSearchResults(query), [query, getSearchResults]);

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach(r => {
      if (!groups[r.module]) groups[r.module] = [];
      groups[r.module].push(r);
    });
    return groups;
  }, [results]);

  const flatResults = useMemo(() => results, [results]);

  const handleSelect = (href: string) => {
    setIsFocused(false);
    setQuery('');
    setSelectedIndex(-1);
    navigate(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < flatResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : flatResults.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && flatResults[selectedIndex]) {
      e.preventDefault();
      handleSelect(flatResults[selectedIndex].href);
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const showDropdown = isFocused && query.length >= 1;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          placeholder="Cari data..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedIndex(-1); }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          className="h-9 w-9 pl-9 pr-9 md:w-64 rounded-lg bg-muted/50 border-transparent focus-visible:border-border focus-visible:bg-background transition-all"
        />
        {query ? (
          <button
            onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted"
          >
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        ) : (
          <kbd className="hidden md:inline-flex absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        )}
      </div>

      {showDropdown && (
        <div className="fixed md:absolute left-2 right-2 md:left-auto md:right-0 top-14 md:top-full md:mt-1.5 md:w-[420px] rounded-lg border bg-popover text-popover-foreground shadow-lg z-50 overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-150">
          {query.length < 2 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Ketik minimal 2 karakter untuk mencari...
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              Tidak ada hasil ditemukan.
            </div>
          ) : (
            <div className="max-h-[50vh] overflow-y-auto overscroll-contain">
              <div className="p-1.5">
                {Object.entries(groupedResults).map(([module, items]) => (
                  <div key={module}>
                    <div className="px-2.5 py-1.5 text-xs font-medium text-muted-foreground">
                      {module}
                    </div>
                    {items.map((item) => {
                      const Icon = item.icon;
                      const globalIdx = flatResults.findIndex(r => r.id === item.id);
                      const isSelected = globalIdx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleSelect(item.href)}
                          onMouseEnter={() => setSelectedIndex(globalIdx)}
                          className={cn(
                            "flex items-center gap-3 w-full px-2.5 py-2.5 rounded-md text-left transition-colors cursor-pointer",
                            isSelected ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0 opacity-60" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                          </div>
                          <Badge variant="secondary" className={cn("shrink-0 text-[10px]", item.badgeColor)}>
                            {item.module}
                          </Badge>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
