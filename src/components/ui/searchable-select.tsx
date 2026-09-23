import React, { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface OpsiPilihan {
  value: string;
  label: string;
  /** Kata kunci tambahan supaya gampang ketemu (mis. kode lama, singkatan). */
  keywords?: string;
}

interface SearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: OpsiPilihan[];
  placeholder?: string;
  /** Teks di kotak pencarian */
  searchPlaceholder?: string;
  /** Teks kalau tidak ada yang cocok */
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
  'aria-label'?: string;
}

/**
 * Dropdown yang bisa diketik untuk mencari.
 *
 * Dropdown bawaan (Radix Select) memang bisa "lompat" ke pilihan saat huruf
 * diketik, tapi ketikannya tidak kelihatan di mana pun dan cuma cocok dari
 * huruf pertama — jadi untuk daftar panjang seperti Jenis Kredit (kode 00, 01,
 * 02, …) orang gampang salah pilih tanpa sadar. Di sini ketikannya terlihat,
 * pencariannya mencocokkan bagian mana pun dari label, kodenya, atau kata
 * kunci tambahan, dan pilihan yang sedang aktif ditandai centang.
 *
 * Dipakai lewat komponen ini supaya semua daftar panjang di Bluebook
 * berperilaku sama.
 */
export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  value,
  onValueChange,
  options,
  placeholder = 'Pilih...',
  searchPlaceholder = 'Ketik untuk mencari...',
  emptyText = 'Tidak ada yang cocok',
  disabled,
  className,
  id,
  'aria-label': ariaLabel,
}) => {
  const [buka, setBuka] = useState(false);
  const [cari, setCari] = useState('');

  const terpilih = options.find((o) => o.value === value);

  const hasil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    if (!q) return options;
    // Cocokkan per kata, jadi "kredit modal" tetap ketemu "KREDIT MODAL KERJA"
    const kata = q.split(/\s+/);
    return options.filter((o) => {
      const teks = `${o.label} ${o.value} ${o.keywords ?? ''}`.toLowerCase();
      return kata.every((k) => teks.includes(k));
    });
  }, [options, cari]);

  const pilih = (v: string) => {
    onValueChange(v);
    setBuka(false);
    setCari('');
  };

  return (
    <Popover
      open={buka}
      onOpenChange={(o) => {
        setBuka(o);
        if (!o) setCari('');
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={buka}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !terpilih && 'text-muted-foreground',
            className,
          )}
        >
          <span className="min-w-0 truncate text-left">{terpilih ? terpilih.label : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
        // Fokus langsung ke kotak cari begitu dibuka
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          const el = document.getElementById(`${id || 'cari'}-kotak-cari`);
          (el as HTMLInputElement | null)?.focus();
        }}
      >
        <div className="relative border-b">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id={`${id || 'cari'}-kotak-cari`}
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 border-0 pl-9 focus-visible:ring-0 focus-visible:ring-offset-0"
            onKeyDown={(e) => {
              // Enter langsung memilih satu-satunya hasil — biar cepat saat mengetik kode
              if (e.key === 'Enter' && hasil.length === 1) {
                e.preventDefault();
                pilih(hasil[0].value);
              }
            }}
          />
        </div>

        <div className="max-h-64 overflow-y-auto py-1" role="listbox">
          {hasil.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
          ) : (
            hasil.map((o) => {
              const aktif = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={aktif}
                  onClick={() => pilih(o.value)}
                  className={cn(
                    'flex w-full items-start gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-muted',
                    aktif && 'bg-primary/5 font-medium',
                  )}
                >
                  <Check className={cn('mt-0.5 h-4 w-4 shrink-0 text-primary', !aktif && 'opacity-0')} />
                  <span className="min-w-0 flex-1">{o.label}</span>
                </button>
              );
            })
          )}
        </div>

        {options.length > 8 && (
          <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
            {hasil.length} dari {options.length} pilihan
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default SearchableSelect;
