import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Send, Plus, Edit3, FileText, Phone, Gift, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';
import { MLFRow } from '@/hooks/use-mlf-data';
import { useWATemplates, useSaveWATemplate, WATemplate } from '@/hooks/use-wa-template';
import { renderTemplate, formatPhoneDisplay, DEFAULT_PENAWARAN_TEMPLATE } from '@/lib/wa-utils';
import { fmtIDR, KOL_COLOR, kolDisplay } from '@/lib/mlf-utils';
import { AntrianWAModal, QueueItem } from '@/components/monitoring/AntrianWAModal';
import { TemplateEditor } from '@/components/monitoring/TemplateEditor';

interface Props {
  rows: MLFRow[];
  uploadId?: string;
  jobdate?: string;
  kontakMap: Map<string, string>;
  canEdit: boolean;
  initialSearch?: string;
  onIsiHp: (l0lnno: string, nama: string) => void;
}

export const PenawaranKreditTab: React.FC<Props> = ({
  rows, uploadId, jobdate, kontakMap, canEdit, initialSearch, onIsiHp,
}) => {
  const { data: templates = [] } = useWATemplates();
  const saveTpl = useSaveWATemplate();

  const penawaranTpls = useMemo(() => templates.filter((t) => (t.kategori || 'tagihan') === 'penawaran'), [templates]);

  const [selectedTplId, setSelectedTplId] = useState<string | undefined>();
  const [useOverride, setUseOverride] = useState(false);
  const [overrideTpl, setOverrideTpl] = useState('');
  const [horizon, setHorizon] = useState('3');
  const [onlyLancar, setOnlyLancar] = useState(true);
  const [hideNoHp, setHideNoHp] = useState(false);
  const [search, setSearch] = useState(initialSearch || '');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [queueOpen, setQueueOpen] = useState(false);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [editTplOpen, setEditTplOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<WATemplate | null>(null);

  useEffect(() => { if (initialSearch) setSearch(initialSearch); }, [initialSearch]);

  useEffect(() => {
    if (!selectedTplId && penawaranTpls.length > 0) setSelectedTplId(penawaranTpls[0].id);
  }, [penawaranTpls, selectedTplId]);

  const currentTpl = penawaranTpls.find((t) => t.id === selectedTplId);
  const effectiveTpl = useOverride ? overrideTpl : currentTpl?.isi || '';

  const baseDate = useMemo(() => (jobdate ? new Date(jobdate) : new Date()), [jobdate]);

  const candidates = useMemo(() => {
    const months = Number(horizon) || 3;
    const start = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const end = new Date(baseDate.getFullYear(), baseDate.getMonth() + months, 0);
    const q = search.trim().toLowerCase();
    return rows
      .filter((r) => r.l0lnno && r.date1)
      .map((r) => {
        const due = new Date(r.date1 as string);
        const sisaBulan = Math.max(
          0,
          (due.getFullYear() - baseDate.getFullYear()) * 12 + (due.getMonth() - baseDate.getMonth()),
        );
        return {
          l0lnno: r.l0lnno as string,
          nama: r.l0name || '-',
          produk: r.lytitl || '-',
          kol: Number(r.kol) || 0,
          baki: Number(r.baki) || 0,
          plafon: Number(r.pla) || 0,
          ao: r.l0usid || '-',
          due,
          sisaBulan,
          no_hp: kontakMap.get(r.l0lnno as string) || '',
        };
      })
      .filter((c) => {
        if (c.due < start || c.due > end) return false;
        if (onlyLancar && c.kol !== 1) return false;
        if (hideNoHp && !c.no_hp) return false;
        if (q && !c.nama.toLowerCase().includes(q) && !c.l0lnno.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => a.due.getTime() - b.due.getTime());
  }, [rows, kontakMap, horizon, onlyLancar, hideNoHp, search, baseDate]);

  const selectableIds = candidates.filter((c) => !!c.no_hp).map((c) => c.l0lnno);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(selectableIds));
  const toggleOne = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const dataOf = (c: (typeof candidates)[number]) => ({
    nama: c.nama, no_rek: c.l0lnno, kol: c.kol, produk: c.produk,
    baki: c.baki, plafon: c.plafon, ao: c.ao,
    jatuh_tempo: format(c.due, 'dd MMMM yyyy', { locale: idLocale }),
    sisa_bulan: c.sisaBulan,
  });

  const previewDebitur = candidates.find((c) => selected.has(c.l0lnno)) || candidates.find((c) => !!c.no_hp);
  const previewText = previewDebitur && effectiveTpl ? renderTemplate(effectiveTpl, dataOf(previewDebitur)) : '';

  const handleCreateDefault = async () => {
    try {
      const t = await saveTpl.mutateAsync({
        nama_template: 'Penawaran Top Up / Pengajuan Kembali',
        isi: DEFAULT_PENAWARAN_TEMPLATE,
        kategori: 'penawaran',
      } as any);
      setSelectedTplId(t.id);
      toast.success('Template penawaran dibuat');
    } catch (e: any) {
      toast.error(e.message || 'Gagal membuat template');
    }
  };

  const handleStartQueue = () => {
    if (!canEdit) { toast.error('Mode View Only — Anda tidak dapat mengirim pesan'); return; }
    if (selected.size === 0) { toast.error('Pilih minimal 1 debitur'); return; }
    if (!effectiveTpl) { toast.error('Template pesan kosong'); return; }
    const items: QueueItem[] = candidates
      .filter((c) => selected.has(c.l0lnno) && c.no_hp)
      .map((c) => ({
        l0lnno: c.l0lnno,
        nama: c.nama,
        no_hp: c.no_hp,
        pesan: renderTemplate(effectiveTpl, dataOf(c)),
        kol: c.kol,
        tunggakan: 0,
        template_id: useOverride ? null : (selectedTplId || null),
        upload_id: uploadId || null,
        kategori: 'penawaran',
      }));
    setQueueItems(items);
    setQueueOpen(true);
  };

  const totalBaki = candidates.reduce((s, c) => s + c.baki, 0);

  return (
    <>
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="w-4 h-4 text-emerald-600" />
            Kandidat Penawaran — Loan Akan Lunas
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs">Rentang Jatuh Tempo</Label>
            <Select value={horizon} onValueChange={setHorizon}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Bulan berjalan</SelectItem>
                <SelectItem value="3">3 bulan ke depan</SelectItem>
                <SelectItem value="6">6 bulan ke depan</SelectItem>
                <SelectItem value="12">12 bulan ke depan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2">
            <Label className="text-xs">Cari</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nama / no rekening" />
          </div>
          <div className="col-span-2 lg:col-span-2 flex flex-wrap items-end gap-4">
            <div className="flex items-center gap-2">
              <Switch id="lancar" checked={onlyLancar} onCheckedChange={setOnlyLancar} />
              <Label htmlFor="lancar" className="text-sm cursor-pointer">Hanya KOL 1 (lancar)</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="phn" checked={hideNoHp} onCheckedChange={setHideNoHp} />
              <Label htmlFor="phn" className="text-sm cursor-pointer">Sembunyikan tanpa HP</Label>
            </div>
          </div>
          <div className="col-span-2 md:col-span-3 lg:col-span-5 flex flex-wrap gap-4 text-sm pt-1 border-t">
            <span><span className="text-muted-foreground">Kandidat:</span> <strong>{candidates.length}</strong></span>
            <span><span className="text-muted-foreground">Total Outstanding:</span> <strong>{fmtIDR(totalBaki)}</strong></span>
            <span className="ml-auto"><span className="text-muted-foreground">Dipilih:</span> <strong className="text-primary">{selected.size}</strong></span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardContent className="pt-6 px-2 sm:px-6">
            <div className="overflow-x-auto">
              <Table className="[&_th]:whitespace-nowrap text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></TableHead>
                    <TableHead>Nama / No Rek</TableHead>
                    <TableHead>Jatuh Tempo</TableHead>
                    <TableHead className="text-center">KOL</TableHead>
                    <TableHead className="text-right">Sisa Pinjaman</TableHead>
                    <TableHead>No HP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada kandidat pada rentang ini</TableCell></TableRow>
                  ) : candidates.slice(0, 300).map((c) => {
                    const hasHp = !!c.no_hp;
                    return (
                      <TableRow key={c.l0lnno} className={!hasHp ? 'bg-rose-50/40 dark:bg-rose-950/10' : ''}>
                        <TableCell><Checkbox disabled={!hasHp} checked={selected.has(c.l0lnno)} onCheckedChange={() => toggleOne(c.l0lnno)} /></TableCell>
                        <TableCell>
                          <div className="font-medium">{c.nama}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{c.l0lnno} • {c.produk}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{format(c.due, 'dd MMM yyyy', { locale: idLocale })}</div>
                          <div className="text-[10px] text-muted-foreground">{c.sisaBulan} bulan lagi</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge style={{ backgroundColor: KOL_COLOR[c.kol] || '#94a3b8', color: 'white' }}>{kolDisplay(c.kol)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold">{fmtIDR(c.baki)}</TableCell>
                        <TableCell>
                          {hasHp ? (
                            <span className="font-mono text-xs flex items-center gap-1"><Phone className="w-3 h-3" />{formatPhoneDisplay(c.no_hp)}</span>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!canEdit} onClick={() => onIsiHp(c.l0lnno, c.nama)}>
                              <Plus className="w-3 h-3 mr-1" />Isi HP
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {candidates.length > 300 && (
              <p className="text-xs text-muted-foreground mt-3 text-center">Menampilkan 300 dari {candidates.length} — persempit dengan filter.</p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><FileText className="w-4 h-4" />Template Penawaran</span>
                <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => { setEditingTpl(null); setEditTplOpen(true); }}><Plus className="w-3 h-3 mr-1" />Baru</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {penawaranTpls.length === 0 ? (
                <div className="text-xs text-muted-foreground space-y-2">
                  <p>Belum ada template kategori penawaran.</p>
                  <Button size="sm" className="w-full" disabled={!canEdit || saveTpl.isPending} onClick={handleCreateDefault}>
                    Buat template penawaran standar
                  </Button>
                </div>
              ) : (
                <Select value={selectedTplId} onValueChange={(v) => { setSelectedTplId(v); setUseOverride(false); }}>
                  <SelectTrigger><SelectValue placeholder="Pilih template" /></SelectTrigger>
                  <SelectContent>
                    {penawaranTpls.map((t) => <SelectItem key={t.id} value={t.id}>{t.nama_template}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
              {currentTpl && (
                <Button size="sm" variant="outline" className="w-full" disabled={!canEdit} onClick={() => { setEditingTpl(currentTpl); setEditTplOpen(true); }}>
                  <Edit3 className="w-3 h-3 mr-1" />Edit template "{currentTpl.nama_template}"
                </Button>
              )}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Switch id="ovr-pen" checked={useOverride} onCheckedChange={(v) => { setUseOverride(v); if (v && !overrideTpl) setOverrideTpl(currentTpl?.isi || DEFAULT_PENAWARAN_TEMPLATE); }} />
                <Label htmlFor="ovr-pen" className="text-xs cursor-pointer">Override untuk batch ini saja</Label>
              </div>
              {useOverride && (
                <Textarea value={overrideTpl} onChange={(e) => setOverrideTpl(e.target.value)} className="font-mono text-xs h-32" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageCircle className="w-4 h-4" />Preview Pesan</CardTitle></CardHeader>
            <CardContent>
              {previewDebitur ? (
                <>
                  <p className="text-xs text-muted-foreground mb-2">untuk: <strong>{previewDebitur.nama}</strong></p>
                  <div className="bg-emerald-50/40 dark:bg-emerald-950/10 border border-emerald-200/60 rounded-lg p-3 max-h-64 overflow-y-auto">
                    <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">{previewText || <span className="text-muted-foreground">— template kosong —</span>}</pre>
                  </div>
                </>
              ) : <p className="text-xs text-muted-foreground">Pilih debitur untuk melihat preview</p>}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Button onClick={handleStartQueue} disabled={!canEdit || selected.size === 0} className="w-full bg-emerald-600 hover:bg-emerald-700">
                <Send className="w-4 h-4 mr-2" />Kirim Penawaran ({selected.size})
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <AntrianWAModal open={queueOpen} items={queueItems} onClose={() => setQueueOpen(false)} />
      <TemplateEditor open={editTplOpen} template={editingTpl} defaultKategori="penawaran" onClose={() => setEditTplOpen(false)} />
    </>
  );
};
