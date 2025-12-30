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
import { Search, Download, Plus, Filter, Eye, Edit, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
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
}: DataTableProps<T>) {
  const [search, setSearch] = useState('');
  const [filterColumn, setFilterColumn] = useState<string>('');

  const filteredData = data.filter((item) => {
    if (!search) return true;
    return columns.some((col) => {
      const value = item[col.key as keyof T];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(search.toLowerCase());
      }
      if (typeof value === 'number') {
        return value.toString().includes(search);
      }
      return false;
    });
  });

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
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="w-4 h-4" />
          Filter
        </Button>
        {onExport && (
          <Button variant="outline" size="sm" className="gap-2" onClick={onExport}>
            <Download className="w-4 h-4" />
            Export
          </Button>
        )}
        {onAdd && (
          <Button size="sm" className="gap-2" onClick={onAdd}>
            <Plus className="w-4 h-4" />
            {addLabel}
          </Button>
        )}
      </div>

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
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-warning hover:text-warning hover:bg-warning/10"
                            onClick={() => onEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
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
