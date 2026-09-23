import React, { useState, useMemo, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, SearchX, Inbox, Download, Plus, Filter, Eye, Edit, Trash2, X, MoreHorizontal, ArrowUp, ArrowDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

/** Debounce delay (ms) sebelum pencarian benar-benar diterapkan ke data. */
const SEARCH_DEBOUNCE_MS = 300;

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  filterable?: boolean;
  sortable?: boolean;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onAdd?: () => void;
  onExport?: () => void;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  searchPlaceholder?: string;
  addLabel?: string;
  showActions?: boolean;
  canDelete?: boolean;
  canEdit?: boolean;
  toolbarActions?: React.ReactNode;
  /** Item tambahan untuk menu "⋯" per baris (di atas tombol Hapus). */
  rowMenuItems?: (item: T) => React.ReactNode;
}

type SortOrder = 'asc' | 'desc' | null;

/**
 * Keadaan kosong yang ramah: bukan cuma tulisan "Tidak ada data", tapi juga
 * penjelasan singkat dan tombol untuk langsung menambah data pertama.
 */
const EmptyState: React.FC<{ search: string; onAdd?: () => void; addLabel: string }> = ({ search, onAdd, addLabel }) => (
  <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
      {search ? (
        <SearchX className="h-6 w-6 text-muted-foreground/70" />
      ) : (
        <Inbox className="h-6 w-6 text-muted-foreground/70" />
      )}
    </div>
    <p className="font-medium text-foreground">{search ? 'Tidak ada yang cocok' : 'Belum ada data'}</p>
    <p className="max-w-xs text-sm text-muted-foreground">
      {search
        ? `Tidak ada data yang cocok dengan "${search}". Coba kata kunci lain atau hapus filternya.`
        : 'Data yang ditambahkan akan muncul di sini.'}
    </p>
    {!search && onAdd && (
      <Button size="sm" className="mt-2 gap-2" onClick={onAdd}>
        <Plus className="h-4 w-4" /> {addLabel}
      </Button>
    )}
  </div>
);

interface RowActionsProps<T> {
  item: T;
  onView?: (item: T) => void;
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  canEdit: boolean;
  canDelete: boolean;
  rowMenuItems?: (item: T) => React.ReactNode;
}

/**
 * Aksi per baris yang ringkas: Lihat & Edit langsung terlihat, sisanya masuk
 * menu "⋯". Hapus selalu paling bawah dan berwarna merah, dipisah garis, supaya
 * tidak kepencet saat buru-buru.
 */
function RowActions<T>({ item, onView, onEdit, onDelete, canEdit, canDelete, rowMenuItems }: RowActionsProps<T>) {
  const bolehHapus = !!onDelete && canDelete;
  const isiMenu = rowMenuItems?.(item);
  const adaMenu = bolehHapus || !!isiMenu;

  return (
    <div className="flex items-center gap-0.5">
      {onView && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
              onClick={() => onView(item)}
              aria-label="Lihat detail"
            >
              <Eye className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Lihat detail</TooltipContent>
        </Tooltip>
      )}
      {onEdit && canEdit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-primary/10 hover:text-primary"
              onClick={() => onEdit(item)}
              aria-label="Edit"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Edit</TooltipContent>
        </Tooltip>
      )}
      {adaMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted"
              aria-label="Aksi lain"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            {isiMenu}
            {bolehHapus && (
              <>
                {isiMenu ? <DropdownMenuSeparator /> : null}
                <DropdownMenuItem
                  className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                  onClick={() => onDelete!(item)}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Hapus
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

export function DataTable<T extends { id: string; created_at?: string; nomor?: number }>({
  data,
  columns,
  onAdd,
  onExport,
  onView,
  onEdit,
  onDelete,
  searchPlaceholder = 'Cari...',
  addLabel = 'Tambah',
  showActions = true,
  canDelete = true,
  canEdit = true,
  toolbarActions,
  rowMenuItems,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // Default: terbaru
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Debounce: baru terapkan pencarian ke data setelah user berhenti mengetik sejenak,
  // supaya tabel besar tidak re-filter/re-render di setiap ketukan tombol.
  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedSearch(search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [search]);

  // Kembali ke halaman 1 setiap kali pencarian/filter/urutan/ukuran halaman berubah,
  // supaya tidak "nyangkut" di halaman kosong.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterColumn, filterValue, sortOrder, pageSize]);

  // Get unique values for filter dropdown
  const getUniqueValues = (columnKey: string): string[] => {
    const values = new Set<string>();
    data.forEach((item) => {
      const value = item[columnKey as keyof T];
      if (typeof value === 'string' && value) {
        values.add(value);
      }
    });
    return Array.from(values).sort();
  };

  // Get filterable columns
  const filterableColumns = columns.filter(col => {
    // Exclude columns that are typically not filterable
    const nonFilterableKeys = ['id', 'createdAt', 'nomor'];
    const key = String(col.key);
    return !nonFilterableKeys.includes(key);
  });

  const filteredData = useMemo(() => {
    let result = data.filter((item) => {
      // Apply search filter (pakai nilai yang sudah di-debounce)
      const matchesSearch = !debouncedSearch || columns.some((col) => {
        const value = item[col.key as keyof T];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(debouncedSearch.toLowerCase());
        }
        if (typeof value === 'number') {
          return value.toString().includes(debouncedSearch);
        }
        return false;
      });

      // Apply column filter
      const matchesFilter = !filterColumn || !filterValue || (() => {
        const value = item[filterColumn as keyof T];
        if (typeof value === 'string') {
          return value === filterValue;
        }
        return true;
      })();

      return matchesSearch && matchesFilter;
    });

    // Apply sorting
    if (sortOrder) {
      result = [...result].sort((a, b) => {
        // Try to sort by created_at first, then by nomor
        const aDate = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bDate = b.created_at ? new Date(b.created_at).getTime() : 0;
        const aNomor = a.nomor ?? 0;
        const bNomor = b.nomor ?? 0;

        if (aDate && bDate) {
          return sortOrder === 'desc' ? bDate - aDate : aDate - bDate;
        }
        return sortOrder === 'desc' ? bNomor - aNomor : aNomor - bNomor;
      });
    }

    return result;
  }, [data, debouncedSearch, columns, filterColumn, filterValue, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const clearFilter = () => {
    setFilterColumn('');
    setFilterValue('');
  };

  const toggleSortOrder = () => {
    if (sortOrder === 'desc') {
      setSortOrder('asc');
    } else {
      setSortOrder('desc');
    }
  };

  const hasActiveFilter = filterColumn && filterValue;

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-10 bg-background border-border/60 focus:border-primary/50 transition-colors"
          />
        </div>
        
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant={hasActiveFilter ? "default" : "outline"} 
              size="sm" 
              className="gap-2 h-10"
            >
              <Filter className="w-4 h-4" />
              Filter
              {hasActiveFilter && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary-foreground/20">
                  1
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4" align="start">
            <div className="space-y-4">
              <div className="font-semibold text-foreground">Filter Data</div>
              
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Kolom</Label>
                <Select value={filterColumn} onValueChange={(value) => {
                  setFilterColumn(value);
                  setFilterValue('');
                }}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Pilih kolom" />
                  </SelectTrigger>
                  <SelectContent>
                    {filterableColumns.map((col) => (
                      <SelectItem key={String(col.key)} value={String(col.key)}>
                        {col.header}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {filterColumn && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Nilai</Label>
                  <Select value={filterValue} onValueChange={setFilterValue}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Pilih nilai" />
                    </SelectTrigger>
                    <SelectContent>
                      {getUniqueValues(filterColumn).map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1 h-9"
                  onClick={() => {
                    clearFilter();
                    setIsFilterOpen(false);
                  }}
                >
                  Reset
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1 h-9"
                  onClick={() => setIsFilterOpen(false)}
                >
                  Terapkan
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Sort Button */}
        <Button 
          variant={sortOrder ? "default" : "outline"} 
          size="sm" 
          className="gap-2 h-10"
          onClick={toggleSortOrder}
        >
          {sortOrder === 'desc' ? (
            <ArrowDown className="w-4 h-4" />
          ) : (
            <ArrowUp className="w-4 h-4" />
          )}
          {sortOrder === 'desc' ? 'Terbaru' : 'Terlama'}
        </Button>

        {hasActiveFilter && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5 text-muted-foreground hover:text-foreground h-10"
            onClick={clearFilter}
          >
            <X className="w-3.5 h-3.5" />
            Hapus Filter
          </Button>
        )}

        {toolbarActions}

        <div className="flex-1" />

        {onExport && (
          <Button variant="outline" size="sm" className="gap-2 h-10" onClick={onExport}>
            <Download className="w-4 h-4" />
            Export
          </Button>
        )}
        {onAdd && canEdit && (
          <Button size="sm" className="gap-2 h-10" onClick={onAdd}>
            <Plus className="w-4 h-4" />
            {addLabel}
          </Button>
        )}
      </div>

      {/* Active filter indicator */}
      {hasActiveFilter && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Filter aktif:</span>
          <Badge variant="secondary" className="font-medium">
            {columns.find(c => String(c.key) === filterColumn)?.header}: {filterValue}
          </Badge>
        </div>
      )}

      {/* Kartu — tampilan HP / PWA (tabel lebar tidak nyaman di layar kecil) */}
      <div className="space-y-3 md:hidden">
        {paginatedData.length === 0 ? (
          <EmptyState search={debouncedSearch} onAdd={onAdd && canEdit ? onAdd : undefined} addLabel={addLabel} />
        ) : (
          paginatedData.map((item) => {
            const [utama, ...sisa] = columns;
            return (
              <div key={item.id} className="rounded-xl border border-border/50 bg-card p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 font-semibold leading-snug">
                    {utama?.render ? utama.render(item) : String(item[utama?.key as keyof T] ?? '-')}
                  </div>
                  {showActions && (
                    <RowActions
                      item={item}
                      onView={onView}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      rowMenuItems={rowMenuItems}
                    />
                  )}
                </div>
                <dl className="mt-3 space-y-1.5">
                  {sisa.map((col) => (
                    <div key={col.key as string} className="flex items-baseline justify-between gap-3">
                      <dt className="shrink-0 text-xs text-muted-foreground">{col.header}</dt>
                      <dd className={cn('min-w-0 text-right text-sm', col.className?.includes('text-right') && 'tabular-nums')}>
                        {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '-')}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            );
          })
        )}
      </div>

      {/* Tabel — tampilan layar lebar */}
      <div className="hidden rounded-xl border border-border/50 bg-card shadow-card overflow-hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60 border-b-2 border-border/30">
              {columns.map((col) => (
                <TableHead key={col.key as string} className={cn("font-semibold", col.className)}>
                  {col.header}
                </TableHead>
              ))}
              {showActions && <TableHead className="w-[110px] text-center">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell 
                  colSpan={columns.length + (showActions ? 1 : 0)} 
                  className="p-0"
                >
                  <EmptyState search={debouncedSearch} onAdd={onAdd && canEdit ? onAdd : undefined} addLabel={addLabel} />
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item, index) => (
                <TableRow 
                  key={item.id} 
                  className={cn(
                    "group transition-all duration-150",
                    index % 2 === 1 && "bg-muted/20"
                  )}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key as string}
                      className={cn(
                        'py-3.5',
                        // Kolom angka (rata kanan) pakai angka berlebar sama supaya
                        // digit rupiah lurus dari baris ke baris
                        col.className?.includes('text-right') && 'tabular-nums',
                        col.className,
                      )}
                    >
                      {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '-')}
                    </TableCell>
                  ))}
                  {showActions && (
                    <TableCell className="py-3.5">
                      <div className="flex items-center justify-center">
                        <RowActions
                          item={item}
                          onView={onView}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          canEdit={canEdit}
                          canDelete={canDelete}
                          rowMenuItems={rowMenuItems}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <p className="text-sm text-muted-foreground">
          {filteredData.length === 0 ? (
            <>Menampilkan <span className="font-medium text-foreground">0</span> dari <span className="font-medium text-foreground">{data.length}</span> data</>
          ) : (
            <>
              Menampilkan <span className="font-medium text-foreground">{(currentPage - 1) * pageSize + 1}</span>-
              <span className="font-medium text-foreground">{Math.min(currentPage * pageSize, filteredData.length)}</span> dari{' '}
              <span className="font-medium text-foreground">{filteredData.length}</span> data
              {filteredData.length !== data.length && <> (disaring dari {data.length})</>}
            </>
          )}
        </p>

        {filteredData.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Baris/halaman</Label>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(1)}
                disabled={currentPage <= 1}
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2 whitespace-nowrap">
                Hal <span className="font-medium text-foreground">{currentPage}</span> / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(totalPages)}
                disabled={currentPage >= totalPages}
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
