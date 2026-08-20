import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search, Mail, Send, CreditCard, FileText, X, Pencil, ExternalLink,
  Users, Wallet, Landmark, Phone, PiggyBank, Calculator, Repeat, Shield, BarChart3, Loader2,
} from 'lucide-react';
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
import { supabase } from '@/integrations/supabase/client';

type Row = Record<string, any>;

interface SearchSpec {
  table: string;
  module: string;
  icon: React.ElementType;
  href: string | ((r: Row) => string);
  badgeColor: string;
  /** kolom teks yang dicari */
  cols: string[];
  title: (r: Row) => string;
  subtitle: (r: Row) => string;
  /** halaman mendukung ?edit=<id> */
  editable?: boolean;
}

const rp = (v: any) => (v === null || v === undefined || v === '' ? '-' : `Rp ${Number(v).toLocaleString('id-ID')}`);

const SPECS: SearchSpec[] = [
  {
    table: 'surat_masuk', module: 'Surat Masuk', icon: Mail, href: '/surat-masuk',
    badgeColor: 'bg-blue-500/10 text-blue-600', editable: true,
    cols: ['nama_pengirim', 'perihal', 'nomor_agenda', 'nomor_surat_masuk', 'kode_surat', 'tujuan_disposisi'],
    title: (r) => r.perihal, subtitle: (r) => `${r.nomor_agenda} • ${r.nama_pengirim}`,
  },
  {
    table: 'surat_keluar', module: 'Surat Keluar', icon: Send, href: '/surat-keluar',
    badgeColor: 'bg-green-500/10 text-green-600', editable: true,
    cols: ['nama_penerima', 'perihal', 'nomor_agenda', 'kode_surat', 'tujuan_surat'],
    title: (r) => r.perihal, subtitle: (r) => `${r.nomor_agenda} • ${r.nama_penerima}`,
  },
  {
    table: 'agenda_kredit_entry', module: 'Agenda Kredit', icon: FileText, href: '/agenda-kredit/agenda-kredit',
    badgeColor: 'bg-indigo-500/10 text-indigo-600', editable: true,
    cols: ['nama_pengirim', 'perihal', 'nomor_agenda', 'nomor_surat_masuk'],
    title: (r) => r.perihal, subtitle: (r) => `${r.nomor_agenda} • ${r.nama_pengirim}`,
  },
  {
    table: 'sppk', module: 'SPPK', icon: CreditCard,
    href: (r) => `/agenda-kredit/sppk-${r.type}`,
    badgeColor: 'bg-purple-500/10 text-purple-600', editable: true,
    cols: ['nama_debitur', 'nomor_sppk', 'jenis_kredit', 'marketing'],
    title: (r) => r.nama_debitur, subtitle: (r) => `${r.nomor_sppk} • ${rp(r.plafon)}`,
  },
  {
    table: 'pk', module: 'PK', icon: FileText,
    href: (r) => `/agenda-kredit/pk-${r.type}`,
    badgeColor: 'bg-orange-500/10 text-orange-600', editable: true,
    cols: ['nama_debitur', 'nomor_pk', 'jenis_kredit', 'sektor_ekonomi'],
    title: (r) => r.nama_debitur, subtitle: (r) => `${r.nomor_pk} • ${rp(r.plafon)}`,
  },
  {
    table: 'kkmpak', module: 'KK/MPAK', icon: CreditCard,
    href: (r) => (r.type === 'telihan' ? '/agenda-kredit/kk-mpak-telihan' : '/agenda-kredit/agenda-mpak-meranti'),
    badgeColor: 'bg-teal-500/10 text-teal-600', editable: true,
    cols: ['nama_debitur', 'nomor_kk', 'nomor_mpak', 'jenis_kredit'],
    title: (r) => r.nama_debitur, subtitle: (r) => `KK: ${r.nomor_kk} • MPAK: ${r.nomor_mpak}`,
  },
  {
    table: 'nomor_loan', module: 'Nomor Loan', icon: Landmark, href: '/agenda-kredit/nomor-loan',
    badgeColor: 'bg-cyan-500/10 text-cyan-600', editable: true,
    cols: ['nomor_loan', 'nama_debitur', 'nomor_pk', 'jenis_kredit', 'unit_kerja'],
    title: (r) => r.nama_debitur, subtitle: (r) => `${r.nomor_loan} • ${rp(r.plafon)}`,
  },
  {
    table: 'loan_simulation', module: 'Simulasi Kredit', icon: Calculator, href: '/kalkulator/riwayat',
    badgeColor: 'bg-sky-500/10 text-sky-600',
    cols: ['nama_debitur', 'nomor_ktp', 'instansi', 'nama_ao', 'product_nama'],
    title: (r) => r.nama_debitur, subtitle: (r) => `${r.product_nama || r.segmen} • ${rp(r.plafon)}`,
  },
  {
    table: 'cs_cif', module: 'CIF Nasabah', icon: Users, href: '/cs/cif',
    badgeColor: 'bg-violet-500/10 text-violet-600',
    cols: ['cif', 'nama'],
    title: (r) => r.nama, subtitle: (r) => `CIF ${r.cif}`,
  },
  {
    table: 'cs_rekening', module: 'Rekening', icon: Wallet,
    href: (r) => `/cs/rekening/${String(r.produk).replace('_', '-')}`,
    badgeColor: 'bg-emerald-500/10 text-emerald-600',
    cols: ['nomor_rekening', 'nama', 'cif'],
    title: (r) => r.nama, subtitle: (r) => `${r.nomor_rekening} • ${r.produk}`,
  },
  {
    table: 'cs_bilyet_deposito', module: 'Bilyet Deposito', icon: PiggyBank, href: '/cs/bilyet-deposito',
    badgeColor: 'bg-amber-500/10 text-amber-600',
    cols: ['nomor_bilyet', 'nama', 'cif'],
    title: (r) => r.nama, subtitle: (r) => `${r.nomor_bilyet} • ${rp(r.nominal)}`,
  },
  {
    table: 'cs_si', module: 'Standing Instruction', icon: Repeat, href: '/cs/si',
    badgeColor: 'bg-lime-500/10 text-lime-700',
    cols: ['kode_si', 'nama_nasabah', 'rekening_debet', 'rekening_kredit'],
    title: (r) => r.nama_nasabah || r.kode_si, subtitle: (r) => `${r.kode_si} • ${rp(r.nominal)}`,
  },
  {
    table: 'call_memo_penagihan', module: 'Call Memo', icon: Phone, href: '/monitoring/dashboard',
    badgeColor: 'bg-rose-500/10 text-rose-600',
    cols: ['nama_debitur', 'l0lnno', 'no_hp', 'no_rek', 'petugas_penagih'],
    title: (r) => r.nama_debitur, subtitle: (r) => `${r.l0lnno || '-'} • ${rp(r.total_tunggakan)}`,
  },
  {
    table: 'debitur_kontak', module: 'Kontak Debitur', icon: Phone, href: '/monitoring/kontak',
    badgeColor: 'bg-pink-500/10 text-pink-600',
    cols: ['l0lnno', 'nama', 'no_hp'],
    title: (r) => r.nama || r.l0lnno, subtitle: (r) => `${r.l0lnno} • ${r.no_hp || '-'}`,
  },
  {
    table: 'proyeksi_kredit', module: 'Proyeksi Kredit', icon: BarChart3, href: '/monitoring/kredit-produktif',
    badgeColor: 'bg-fuchsia-500/10 text-fuchsia-600',
    cols: ['nama_debitur', 'unit', 'jenis_kredit'],
    title: (r) => r.nama_debitur, subtitle: (r) => `${r.unit} • ${rp(r.plafon)}`,
  },
  {
    table: 'security_shift', module: 'Log Security', icon: Shield, href: '/security/log',
    badgeColor: 'bg-slate-500/10 text-slate-600',
    cols: ['nama_petugas', 'shift', 'serah_terima_ke_nama'],
    title: (r) => r.nama_petugas, subtitle: (r) => `${r.tanggal} • Shift ${r.shift}`,
  },
];

interface SearchResult {
  id: string;
  recordId: string;
  title: string;
  subtitle: string;
  module: string;
  icon: React.ElementType;
  href: string;
  badgeColor: string;
  editable: boolean;
  record: Row;
}

const LABELS: Record<string, string> = {
  nomor_agenda: 'Nomor Agenda', kode_surat: 'Kode Surat', nomor_surat_masuk: 'Nomor Surat Masuk',
  nama_pengirim: 'Nama Pengirim', nama_penerima: 'Nama Penerima', perihal: 'Perihal',
  tujuan_disposisi: 'Tujuan Disposisi', tujuan_surat: 'Tujuan Surat', status: 'Status',
  keterangan: 'Keterangan', user_input: 'User Input', nama_debitur: 'Nama Debitur',
  jenis_kredit: 'Jenis Kredit', plafon: 'Plafon', jangka_waktu: 'Jangka Waktu',
  jenis_debitur: 'Jenis Debitur', jenis_penggunaan: 'Jenis Penggunaan', sektor_ekonomi: 'Sektor Ekonomi',
  nomor_sppk: 'Nomor SPPK', nomor_pk: 'Nomor PK', nomor_kk: 'Nomor KK', nomor_mpak: 'Nomor MPAK',
  kode_fasilitas: 'Kode Fasilitas', marketing: 'Marketing', tanggal: 'Tanggal', tanggal_masuk: 'Tanggal Masuk',
  nomor_loan: 'Nomor Loan', unit_kerja: 'Unit Kerja', produk_kredit: 'Produk Kredit', skema: 'Skema',
  cif: 'CIF', nama: 'Nama', nomor_rekening: 'Nomor Rekening', produk: 'Produk', nominal: 'Nominal',
  nomor_bilyet: 'Nomor Bilyet', kode_si: 'Kode SI', rekening_debet: 'Rekening Debet',
  rekening_kredit: 'Rekening Kredit', l0lnno: 'Nomor Loan', no_hp: 'No. HP', no_rek: 'No. Rekening',
  total_tunggakan: 'Total Tunggakan', petugas_penagih: 'Petugas Penagih', unit: 'Unit',
  nama_petugas: 'Nama Petugas', shift: 'Shift', segmen: 'Segmen', product_nama: 'Produk',
  tenor_bulan: 'Tenor (bulan)', nama_ao: 'AO', instansi: 'Instansi', pekerjaan: 'Pekerjaan',
  gaji: 'Gaji', nomor_ktp: 'Nomor KTP', pipeline_status: 'Status Pipeline',
};

const HIDDEN = new Set([
  'id', 'created_at', 'updated_at', 'created_by', 'user_id', 'nomor', 'nomor_urut',
  'cif_id', 'pk_id', 'product_id', 'upload_id', 'penyelesaian_id', 'pengisian_atm_id',
]);

const formatValue = (key: string, v: any) => {
  if (typeof v === 'number') return v > 999 ? v.toLocaleString('id-ID') : String(v);
  if (typeof v === 'boolean') return v ? 'Ya' : 'Tidak';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v);
    if (!isNaN(d.getTime())) return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  }
  return String(v);
};

const escapeTerm = (q: string) => q.replace(/[,%()]/g, ' ').trim();

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

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['global-search', debounced],
    enabled: debounced.length >= 2,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<SearchResult[]> => {
      const term = escapeTerm(debounced);
      if (term.length < 2) return [];
      const settled = await Promise.all(
        SPECS.map(async (spec) => {
          try {
            const filter = spec.cols.map((c) => `${c}.ilike.%${term}%`).join(',');
            const { data, error } = await (supabase as any)
              .from(spec.table)
              .select('*')
              .or(filter)
              .limit(5);
            if (error || !data) return [] as SearchResult[];
            return (data as Row[]).map((r) => ({
              id: `${spec.table}-${r.id}`,
              recordId: String(r.id),
              record: r,
              title: String(spec.title(r) ?? '-'),
              subtitle: String(spec.subtitle(r) ?? ''),
              module: spec.module,
              icon: spec.icon,
              href: typeof spec.href === 'function' ? spec.href(r) : spec.href,
              badgeColor: spec.badgeColor,
              editable: !!spec.editable,
            }));
          } catch {
            return [] as SearchResult[];
          }
        }),
      );
      return settled.flat();
    },
  });

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach((r) => {
      if (!groups[r.module]) groups[r.module] = [];
      groups[r.module].push(r);
    });
    return groups;
  }, [results]);

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
      .filter(([k, v]) => !HIDDEN.has(k) && v !== null && v !== undefined && v !== '' && typeof v !== 'object')
      .map(([k, v]) => ({
        label: LABELS[k] || k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value: formatValue(k, v),
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
