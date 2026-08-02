import React, { useMemo, useState, useCallback } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useLoanSimulations,
  useUpdatePipelineStage,
  PIPELINE_STAGES,
  PIPELINE_LABELS,
  type PipelineStage,
  type LoanSimulationRow,
} from '@/hooks/use-loan-calc';
import { fmtRp } from '@/lib/loan-calc';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  Search, ChevronLeft, ChevronRight, Eye, GripVertical,
  Calculator, FolderInput, Loader2, Keyboard, CheckCircle2,
} from 'lucide-react';

const STAGE_META: Record<PipelineStage, { icon: React.ElementType; accent: string; note: string; dot: string; ring: string }> = {
  simulasi: {
    icon: Calculator,
    accent: 'from-slate-500/15 to-slate-500/5 text-slate-700 dark:text-slate-200',
    note: 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400',
    ring: 'ring-slate-400/40',
  },
  berkas_masuk: {
    icon: FolderInput,
    accent: 'from-blue-500/15 to-blue-500/5 text-blue-700 dark:text-blue-300',
    note: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800',
    dot: 'bg-blue-500',
    ring: 'ring-blue-400/40',
  },
  proses: {
    icon: Loader2,
    accent: 'from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-300',
    note: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
    dot: 'bg-amber-500',
    ring: 'ring-amber-400/40',
  },
  input: {
    icon: Keyboard,
    accent: 'from-violet-500/15 to-violet-500/5 text-violet-700 dark:text-violet-300',
    note: 'bg-violet-50 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800',
    dot: 'bg-violet-500',
    ring: 'ring-violet-400/40',
  },
  cair: {
    icon: CheckCircle2,
    accent: 'from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-300',
    note: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-400/40',
  },
};

const stageOf = (s: LoanSimulationRow): PipelineStage =>
  (PIPELINE_STAGES as readonly string[]).includes(String(s.pipeline_status))
    ? (s.pipeline_status as PipelineStage)
    : 'simulasi';

const fmtDate = (v?: string | null) => {
  if (!v) return '-';
  const d = new Date(v);
  return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
};

const fmtDateTime = (v?: string | null) => {
  if (!v) return '-';
  const d = new Date(v);
  return isNaN(d.getTime())
    ? '-'
    : d.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const sinceLabel = (v?: string | null) => {
  if (!v) return '';
  const t = new Date(v).getTime();
  if (isNaN(t)) return '';
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} mnt lalu`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} jam lalu`;
  return `${Math.floor(h / 24)} hari lalu`;
};

const stageLabel = (s?: string | null) =>
  s && (PIPELINE_LABELS as Record<string, string>)[s] ? (PIPELINE_LABELS as Record<string, string>)[s] : 'Simulasi Kredit';

const PipelinePage: React.FC = () => {
  const { data: sims, isLoading } = useLoanSimulations();
  const move = useUpdatePipelineStage();
  const { canEdit, userName } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<PipelineStage | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = sims || [];
    if (!q) return list;
    return list.filter((s) =>
      s.nama_debitur?.toLowerCase().includes(q) ||
      (s.nama_ao || '').toLowerCase().includes(q) ||
      (s.product_nama || '').toLowerCase().includes(q) ||
      (s.instansi || '').toLowerCase().includes(q),
    );
  }, [sims, search]);

  const grouped = useMemo(() => {
    const g: Record<PipelineStage, LoanSimulationRow[]> = {
      simulasi: [], berkas_masuk: [], proses: [], input: [], cair: [],
    };
    rows.forEach((r) => g[stageOf(r)].push(r));
    (Object.keys(g) as PipelineStage[]).forEach((k) =>
      g[k].sort((a, b) =>
        String(b.pipeline_updated_at || b.created_at).localeCompare(String(a.pipeline_updated_at || a.created_at)),
      ),
    );
    return g;
  }, [rows]);

  const handleMove = useCallback((row: LoanSimulationRow, stage: PipelineStage) => {
    if (!canEdit) {
      toast({ title: 'Hanya lihat', description: 'Role Anda tidak dapat mengubah tahap pipeline.', variant: 'destructive' });
      return;
    }
    if (stageOf(row) === stage) return;
    move.mutate({ id: row.id, stage });
    toast({ title: `${row.nama_debitur} → ${PIPELINE_LABELS[stage]}` });
  }, [canEdit, move, toast]);

  const shift = (row: LoanSimulationRow, dir: -1 | 1) => {
    const idx = PIPELINE_STAGES.indexOf(stageOf(row));
    const next = PIPELINE_STAGES[idx + dir];
    if (next) handleMove(row, next);
  };

  const totalNominal = (list: LoanSimulationRow[]) => list.reduce((a, b) => a + (Number(b.plafon) || 0), 0);

  return (
    <MainLayout>
      <PageHeader
        title="Pipeline Kredit"
        description="Papan progress permohonan kredit — geser kartu dari Simulasi sampai Cair."
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Cari debitur, AO, produk, instansi…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <GripVertical className="w-3.5 h-3.5" />
          Tarik kartu ke kolom lain, atau pakai tombol panah di kartu.
        </div>
        <Button variant="outline" size="sm" className="sm:ml-auto" onClick={() => navigate('/kalkulator/riwayat')}>
          Riwayat Simulasi
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4">
          {PIPELINE_STAGES.map((s) => <Skeleton key={s} className="h-64 rounded-xl" />)}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
          {PIPELINE_STAGES.map((stage) => {
            const meta = STAGE_META[stage];
            const Icon = meta.icon;
            const list = grouped[stage];
            const isOver = overStage === stage;
            return (
              <div
                key={stage}
                className={`shrink-0 w-[290px] snap-start rounded-xl border bg-card/60 backdrop-blur-sm transition-all duration-200 ${
                  isOver ? `ring-2 ${meta.ring} scale-[1.01]` : ''
                }`}
                onDragOver={(e) => { e.preventDefault(); setOverStage(stage); }}
                onDragLeave={() => setOverStage((s) => (s === stage ? null : s))}
                onDrop={(e) => {
                  e.preventDefault();
                  setOverStage(null);
                  const row = (sims || []).find((r) => r.id === (dragId || e.dataTransfer.getData('text/plain')));
                  if (row) handleMove(row, stage);
                  setDragId(null);
                }}
              >
                <div className={`rounded-t-xl bg-gradient-to-br ${meta.accent} px-3 py-2.5 border-b`}>
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                    <Icon className="w-4 h-4" />
                    <span className="font-semibold text-sm">{PIPELINE_LABELS[stage]}</span>
                    <Badge variant="secondary" className="ml-auto text-[10px]">{list.length}</Badge>
                  </div>
                  <p className="text-[11px] mt-1 opacity-80">{fmtRp(totalNominal(list))}</p>
                </div>

                <div className="p-2.5 space-y-2.5 min-h-[220px] max-h-[calc(100vh-330px)] overflow-y-auto">
                  {list.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-10 border border-dashed rounded-lg">
                      Belum ada berkas
                    </div>
                  )}
                  {list.map((row, i) => {
                    const idx = PIPELINE_STAGES.indexOf(stage);
                    return (
                      <div
                        key={row.id}
                        draggable={canEdit}
                        onDragStart={(e) => {
                          setDragId(row.id);
                          e.dataTransfer.setData('text/plain', row.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => { setDragId(null); setOverStage(null); }}
                        className={`group relative rounded-lg border p-3 shadow-sm ${meta.note} ${
                          canEdit ? 'cursor-grab active:cursor-grabbing' : ''
                        } ${dragId === row.id ? 'opacity-40' : 'opacity-100'}
                        transition-transform duration-150 will-change-transform hover:-translate-y-0.5 hover:shadow-md`}
                        style={{ transform: `rotate(${(i % 2 === 0 ? -0.35 : 0.35)}deg)` }}
                      >
                        <div className="flex items-start gap-2">
                          <p className="font-semibold text-sm leading-snug flex-1 line-clamp-2">{row.nama_debitur}</p>
                          <button
                            className="opacity-60 hover:opacity-100 transition"
                            title="Lihat di riwayat"
                            onClick={() => navigate('/kalkulator/riwayat')}
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-[15px] font-bold mt-1">{fmtRp(Number(row.plafon) || 0)}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          <Badge variant="outline" className="text-[10px] font-normal">{row.tenor_bulan} bln</Badge>
                          {row.product_nama && (
                            <Badge variant="outline" className="text-[10px] font-normal max-w-[130px] truncate">
                              {row.product_nama}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-2">
                          {row.nama_ao ? `AO ${row.nama_ao} · ` : ''}
                          {fmtDate(row.pipeline_updated_at || row.created_at)}
                        </p>

                        {canEdit && (
                          <div className="mt-2 flex items-center gap-1 opacity-70 group-hover:opacity-100 transition">
                            <Button
                              size="sm" variant="ghost" className="h-6 px-1.5"
                              disabled={idx === 0}
                              onClick={() => shift(row, -1)}
                              title="Kembalikan ke tahap sebelumnya"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </Button>
                            <span className="text-[10px] text-muted-foreground flex-1 text-center">pindah tahap</span>
                            <Button
                              size="sm" variant="ghost" className="h-6 px-1.5"
                              disabled={idx === PIPELINE_STAGES.length - 1}
                              onClick={() => shift(row, 1)}
                              title="Lanjut ke tahap berikutnya"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Card className="mt-4">
        <CardContent className="py-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
          <span>Total berkas: <b className="text-foreground">{rows.length}</b></span>
          <span>Belum cair: <b className="text-foreground">{rows.length - grouped.cair.length}</b></span>
          <span>Sudah cair: <b className="text-foreground">{grouped.cair.length}</b></span>
          <span>Nilai cair: <b className="text-foreground">{fmtRp(totalNominal(grouped.cair))}</b></span>
        </CardContent>
      </Card>
    </MainLayout>
  );
};

export default PipelinePage;
