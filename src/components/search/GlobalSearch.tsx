import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Pencil, ExternalLink, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { SearchResult, SEARCH_LABELS, SEARCH_HIDDEN_FIELDS, formatSearchValue } from '@/lib/global-search-specs';
import { useGlobalDataSearch } from '@/hooks/use-global-data-search';

export const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Ctrl+K/Cmd+K sekarang dipegang oleh CommandPalette (command bar utama);
  // kotak cari header ini tetap bisa dipakai langsung via klik/tap seperti biasa.

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

  const { results, groupedResults, isFetching } = useGlobalDataSearch(debounced);
  const flatResults = results;

  const [detailItem, setDetailItem] = useState<SearchResult | null>(null);

  const openDetail = (item: SearchResult) => {
    setIsFocused(false);
    setQuery('');
    setSelectedIndex(-1);
    setDetailItem(item);
  };

  const handleEditFromDetail = () => {
    if (!detailItem) return;
    const item = detailItem;
    setDetailItem(null);
    navigate(`${item.href}?edit=${item.recordId}`);
  };

  const handleOpenPage = () => {
    if (!detailItem) return;
    const item = detailItem;
    setDetailItem(null);
    navigate(item.href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && flatResults[selectedIndex]) {
      e.preventDefault();
      openDetail(flatResults[selectedIndex]);
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const renderDetailFields = (item: SearchResult) => {
    const r = item.record;
    return Object.entries(r)
      .filter(([k, v]) => !SEARCH_HIDDEN_FIELDS.has(k) && v !== null && v !== undefined && v !== '' && typeof v !== 'object')
      .map(([k, v]) => ({
        label: SEARCH_LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value: formatSearchValue(k, v),
        full: ['perihal', 'keterangan', 'catatan', 'kejadian', 'deskripsi'].includes(k),
      }));
  };

  const showDropdown = isFocused && query.length >= 1;

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          placeholder="Cari semua data..."
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
          ) : isFetching && results.length === 0 ? (
            <div className="px-4 py-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Mencari di seluruh Bluebook...
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
                      const globalIdx = flatResults.findIndex((r) => r.id === item.id);
                      const isSelected = globalIdx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={() => openDetail(item)}
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

      <Dialog open={!!detailItem} onOpenChange={(o) => !o && setDetailItem(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {detailItem && <detailItem.icon className="h-5 w-5 text-primary" />}
              Detail {detailItem?.module}
            </DialogTitle>
          </DialogHeader>
          {detailItem && (
            <div className="grid grid-cols-2 gap-4 py-2">
              {renderDetailFields(detailItem).map((f, i) => (
                <div key={i} className={cn(f.full && 'col-span-2')}>
                  <p className="text-xs text-muted-foreground">{f.label}</p>
                  <p className="text-sm font-medium break-words">{String(f.value)}</p>
                </div>
              ))}
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={handleOpenPage} className="gap-1.5">
              <ExternalLink className="h-4 w-4" /> Buka Halaman
            </Button>
            {detailItem?.editable && (
              <Button onClick={handleEditFromDetail} className="gap-1.5">
                <Pencil className="h-4 w-4" /> Edit Data
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
