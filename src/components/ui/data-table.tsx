import React, { useState } from 'react';
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
import { Search, Download, Plus, Filter, Eye, Edit, Trash2, X } from 'lucide-react';
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

export function DataTable<T extends { id: string }>({
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

  const filteredData = data.filter((item) => {
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

  const clearFilter = () => {
    setFilterColumn('');
    setFilterValue('');
  };

  const hasActiveFilter = filterColumn && filterValue;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
          <PopoverTrigger asChild>
            <Button 
              variant={hasActiveFilter ? "default" : "outline"} 
              size="sm" 
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              Filter
              {hasActiveFilter && (
                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                  1
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-4">
              <div className="font-medium">Filter Data</div>
              
              <div className="space-y-2">
                <Label>Kolom</Label>
                <Select value={filterColumn} onValueChange={(value) => {
                  setFilterColumn(value);
                  setFilterValue('');
                }}>
                  <SelectTrigger>
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
                  <Label>Nilai</Label>
                  <Select value={filterValue} onValueChange={setFilterValue}>
                    <SelectTrigger>
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

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => {
                    clearFilter();
                    setIsFilterOpen(false);
                  }}
                >
                  Reset
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1"
                  onClick={() => setIsFilterOpen(false)}
                >
                  Terapkan
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {hasActiveFilter && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 text-muted-foreground"
            onClick={clearFilter}
          >
            <X className="w-3 h-3" />
            Hapus Filter
          </Button>
        )}

        {onExport && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
            <Download className="w-4 h-4" />
            Export
          </Button>
        )}
        {onAdd && canEdit && (
          <Button size="sm" className="gap-2" onClick={onAdd}>
            <Plus className="w-4 h-4" />
            {addLabel}
          </Button>
        )}
      </div>

      {/* Active filter indicator */}
      {hasActiveFilter && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Filter aktif:</span>
          <Badge variant="secondary">
            {columns.find(c => String(c.key) === filterColumn)?.header}: {filterValue}
          </Badge>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border bg-card shadow-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col) => (
                <TableHead key={col.key as string} className={cn("font-semibold", col.className)}>
                  {col.header}
                </TableHead>
              ))}
              {showActions && <TableHead className="w-[100px] text-center">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length + (showActions ? 1 : 0)} 
                  className="h-24 text-center text-muted-foreground"
                >
                  Tidak ada data
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/30 transition-colors">
                  {columns.map((col) => (
                    <TableCell key={col.key as string} className={col.className}>
                      {col.render ? col.render(item) : String(item[col.key as keyof T] ?? '-')}
                    </TableCell>
                  ))}
                  {showActions && (
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        {onView && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                            onClick={() => onView(item)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        {onEdit && canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-warning hover:text-warning hover:bg-warning/10"
                            onClick={() => onEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
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
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Menampilkan {filteredData.length} dari {data.length} data</p>
      </div>
    </div>
  );
}
