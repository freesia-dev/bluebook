import React, { useState, useMemo } from 'react';
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
import { Search, Download, Plus, Filter, Eye, Edit, Trash2, X, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
}

type SortOrder = 'asc' | 'desc' | null;

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
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [filterColumn, setFilterColumn] = useState<string>('');
  const [filterValue, setFilterValue] = useState<string>('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc'); // Default: terbaru

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
      // Apply search filter
      const matchesSearch = !search || columns.some((col) => {
        const value = item[col.key as keyof T];
        if (typeof value === 'string') {
          return value.toLowerCase().includes(search.toLowerCase());
        }
        if (typeof value === 'number') {
          return value.toString().includes(search);
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
  }, [data, search, columns, filterColumn, filterValue, sortOrder]);

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

      {/* Table */}
      <div className="rounded-xl border border-border/50 bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/60 hover:bg-muted/60 border-b-2 border-border/30">
              {columns.map((col) => (
                <TableHead key={col.key as string} className={cn("font-semibold", col.className)}>
                  {col.header}
                </TableHead>
              ))}
              {showActions && <TableHead className="w-[120px] text-center">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell 
                  colSpan={columns.length + (showActions ? 1 : 0)} 
                  className="h-32 text-center text-muted-foreground"
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center">
                      <Search className="w-5 h-5 text-muted-foreground/50" />
                    </div>
                    <span>Tidak ada data</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item, index) => (
                <TableRow 
                  key={item.id} 
                  className={cn(
                    "group transition-all duration-150",
                    index % 2 === 1 && "bg-muted/20"
                  )}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key as string} className={cn("py-3.5", col.className)}>
                      {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '-')}
                    </TableCell>
                  ))}
                  {showActions && (
                    <TableCell className="py-3.5">
                      <div className="flex items-center justify-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
                        {onView && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-primary hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => onView(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {onEdit && canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-warning hover:text-warning hover:bg-warning/10 transition-colors"
                            onClick={() => onEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() => onDelete(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
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
      <div className="flex items-center justify-between px-1">
        <p className="text-sm text-muted-foreground">
          Menampilkan <span className="font-medium text-foreground">{filteredData.length}</span> dari <span className="font-medium text-foreground">{data.length}</span> data
        </p>
      </div>
    </div>
  );
}
