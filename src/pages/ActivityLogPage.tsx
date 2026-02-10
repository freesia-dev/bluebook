import React, { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { useActivityLog, getTableLabel, getActionLabel } from '@/hooks/use-activity-log';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Plus, Pencil, Trash2, Clock, User, Filter, Search, 
  ChevronDown, ChevronUp, RefreshCw, Database 
} from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const ACTION_ICONS: Record<string, React.ElementType> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
};

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  update: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  delete: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
};

const ChangesViewer: React.FC<{ oldData: Record<string, unknown> | null; newData: Record<string, unknown> | null; action: string }> = ({ oldData, newData, action }) => {
  if (action === 'create' && newData) {
    const keys = Object.keys(newData).filter(k => !['id', 'created_at', 'user_input'].includes(k));
    return (
      <div className="mt-2 p-3 bg-muted/50 rounded-lg text-xs space-y-1 max-h-40 overflow-auto">
        {keys.slice(0, 8).map(key => (
          <div key={key} className="flex gap-2">
            <span className="text-muted-foreground font-medium min-w-[100px]">{key}:</span>
            <span className="text-foreground truncate">{String(newData[key] ?? '-')}</span>
          </div>
        ))}
        {keys.length > 8 && <p className="text-muted-foreground">... dan {keys.length - 8} field lainnya</p>}
      </div>
    );
  }

  if (action === 'update' && oldData && newData) {
    const changedKeys = Object.keys(newData).filter(
      k => !['id', 'created_at', 'user_input'].includes(k) && JSON.stringify(oldData[k]) !== JSON.stringify(newData[k])
    );
    if (changedKeys.length === 0) return <p className="text-xs text-muted-foreground mt-1">Tidak ada perubahan terdeteksi</p>;
    return (
      <div className="mt-2 p-3 bg-muted/50 rounded-lg text-xs space-y-2 max-h-40 overflow-auto">
        {changedKeys.slice(0, 6).map(key => (
          <div key={key} className="space-y-0.5">
            <span className="text-muted-foreground font-medium">{key}:</span>
            <div className="flex gap-2 items-start">
              <span className="text-red-500 line-through truncate max-w-[45%]">{String(oldData[key] ?? '-')}</span>
              <span className="text-muted-foreground">→</span>
              <span className="text-emerald-600 dark:text-emerald-400 truncate max-w-[45%]">{String(newData[key] ?? '-')}</span>
            </div>
          </div>
        ))}
        {changedKeys.length > 6 && <p className="text-muted-foreground">... dan {changedKeys.length - 6} perubahan lainnya</p>}
      </div>
    );
  }

  if (action === 'delete' && oldData) {
    return (
      <div className="mt-2 p-3 bg-red-500/5 rounded-lg text-xs space-y-1 max-h-40 overflow-auto">
        {Object.keys(oldData).filter(k => !['id', 'created_at', 'user_input'].includes(k)).slice(0, 5).map(key => (
          <div key={key} className="flex gap-2">
            <span className="text-muted-foreground font-medium min-w-[100px]">{key}:</span>
            <span className="text-red-500/80 truncate">{String(oldData[key] ?? '-')}</span>
          </div>
        ))}
      </div>
    );
  }

  return null;
};

const ActivityLogPage: React.FC = () => {
  const { data: logs, isLoading } = useActivityLog(200);
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterAction, setFilterAction] = useState<string>('all');
  const [filterTable, setFilterTable] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: storageCounts } = useQuery({
    queryKey: ['storage-counts'],
    queryFn: async () => {
      const tables = ['surat_masuk', 'surat_keluar', 'sppk', 'pk', 'kkmpak', 'nomor_loan', 'pengisian_atm', 'activity_log', 'recycle_bin', 'penyelesaian_selisih', 'selisih_atm', 'kartu_tertelan', 'agenda_kredit_entry'] as const;
      const counts: Record<string, number> = {};
      let total = 0;
      for (const table of tables) {
        const { count } = await supabase.from(table).select('*', { count: 'exact', head: true });
        counts[table] = count || 0;
        total += count || 0;
      }
      return { counts, total };
    },
    staleTime: 1000 * 60 * 5,
  });

  const maxRows = 100000; // Lovable Cloud free tier approximate limit
  const usedPercent = storageCounts ? Math.min(Math.round((storageCounts.total / maxRows) * 100), 100) : 0;

  const filteredLogs = useMemo(() => {
    if (!logs) return [];
    return logs.filter(log => {
      const matchesSearch = !searchQuery ||
        (log.userName?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (log.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        getTableLabel(log.tableName).toLowerCase().includes(searchQuery.toLowerCase());
      const matchesAction = filterAction === 'all' || log.action === filterAction;
      const matchesTable = filterTable === 'all' || log.tableName === filterTable;
      return matchesSearch && matchesAction && matchesTable;
    });
  }, [logs, searchQuery, filterAction, filterTable]);

  const uniqueTables = useMemo(() => {
    if (!logs) return [];
    return [...new Set(logs.map(l => l.tableName))];
  }, [logs]);

  return (
    <MainLayout>
      <PageHeader
        title="Activity Log"
        description="Riwayat semua perubahan data di aplikasi"
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['activity-log'] })}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        }
      />

      {/* Storage Usage Bar */}
      {storageCounts && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <Database className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Penggunaan Database</span>
                  <span className="text-sm text-muted-foreground">
                    {storageCounts.total.toLocaleString('id-ID')} / {maxRows.toLocaleString('id-ID')} rows
                  </span>
                </div>
                {/* Stacked bar: used + remaining */}
                <div className="relative h-4 w-full rounded-full bg-secondary overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-primary rounded-l-full transition-all"
                    style={{ width: `${usedPercent}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-primary" />
                    <span className="text-muted-foreground">Digunakan: <span className="font-medium text-foreground">{storageCounts.total.toLocaleString('id-ID')} rows ({usedPercent}%)</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-sm bg-secondary border border-border" />
                    <span className="text-muted-foreground">Sisa: <span className="font-medium text-foreground">{(maxRows - storageCounts.total).toLocaleString('id-ID')} rows ({100 - usedPercent}%)</span></span>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
              {Object.entries(storageCounts.counts)
                .filter(([, count]) => count > 0)
                .sort(([, a], [, b]) => b - a)
                .map(([table, count]) => (
                  <div key={table} className="flex justify-between gap-1 px-2 py-1 rounded bg-muted/50">
                    <span className="truncate">{getTableLabel(table) || table}</span>
                    <span className="font-medium text-foreground">{count}</span>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari berdasarkan nama user atau deskripsi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterAction} onValueChange={setFilterAction}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="h-4 w-4 mr-2 opacity-50" />
            <SelectValue placeholder="Semua Aksi" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Aksi</SelectItem>
            <SelectItem value="create">Tambah</SelectItem>
            <SelectItem value="update">Ubah</SelectItem>
            <SelectItem value="delete">Hapus</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterTable} onValueChange={setFilterTable}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2 opacity-50" />
            <SelectValue placeholder="Semua Modul" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Modul</SelectItem>
            {uniqueTables.map(t => (
              <SelectItem key={t} value={t}>{getTableLabel(t)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground mb-4">
        Menampilkan {filteredLogs.length} dari {logs?.length || 0} log
      </p>

      {/* Log entries */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Clock className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Belum ada activity log</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Semua perubahan data akan otomatis tercatat di sini
            </p>
          </CardContent>
        </Card>
      ) : (
        <ScrollArea className="h-[calc(100vh-320px)]">
          <div className="space-y-2 pr-4">
            {filteredLogs.map((log) => {
              const ActionIcon = ACTION_ICONS[log.action] || Pencil;
              const isExpanded = expandedId === log.id;
              return (
                <Card
                  key={log.id}
                  className="transition-all hover:shadow-sm cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Action Icon */}
                      <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${ACTION_COLORS[log.action]}`}>
                        <ActionIcon className="h-4 w-4" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium">
                              <span className="text-foreground">{log.userName || 'System'}</span>
                              {' '}
                              <span className="text-muted-foreground font-normal">
                                {getActionLabel(log.action).toLowerCase()} data di
                              </span>
                              {' '}
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                {getTableLabel(log.tableName)}
                              </Badge>
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {format(log.createdAt, 'dd MMM yyyy, HH:mm', { locale: id })}
                            </span>
                            {(log.oldData || log.newData) && (
                              isExpanded 
                                ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> 
                                : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                        </div>

                        {/* Expanded changes */}
                        {isExpanded && (
                          <ChangesViewer 
                            oldData={log.oldData} 
                            newData={log.newData} 
                            action={log.action} 
                          />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </MainLayout>
  );
};

export default ActivityLogPage;
