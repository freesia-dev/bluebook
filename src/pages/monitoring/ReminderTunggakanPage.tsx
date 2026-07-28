import React, { useMemo, useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useMLFUploads, useMLFData143 } from '@/hooks/use-mlf-data';
import { useDebiturKontak, useUpsertDebiturKontak } from '@/hooks/use-debitur-kontak';
import { useWATemplates, WATemplate } from '@/hooks/use-wa-template';
import { useWAReminderLog } from '@/hooks/use-wa-reminder-log';
import { fmtIDR, KOL_COLOR, kolDisplay } from '@/lib/mlf-utils';
import { renderTemplate, isValidPhoneID, normalizePhoneID, formatPhoneDisplay } from '@/lib/wa-utils';
import { AntrianWAModal, QueueItem } from '@/components/monitoring/AntrianWAModal';
import { TemplateEditor } from '@/components/monitoring/TemplateEditor';
import { CallMemoTable } from '@/components/monitoring/CallMemoTable';
import { CallMemoDialog } from '@/components/monitoring/CallMemoDialog';
import { format, formatDistanceToNow } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Send, Plus, Edit3, MessageCircle, Phone, FileText, ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock } from 'lucide-react';

const ReminderTunggakanPage: React.FC = () => {
  const { canEdit } = useAuth();
  const { data: uploads = [] } = useMLFUploads();
  const [uploadId, setUploadId] = useState<string | undefined>();
  useEffect(() => { if (!uploadId && uploads.length > 0) setUploadId(uploads[0].id); }, [uploads, uploadId]);

  const { data: rows = [] } = useMLFData143(uploadId);
  const { data: kontaks = [] } = useDebiturKontak();
  const { data: templates = [] } = useWATemplates();
  const { data: logs = [] } = useWAReminderLog(1000);
  const upsertKontak = useUpsertDebiturKontak();

  // filters
  const [kolFilter, setKolFilter] = useState<string>('all'); // 'all' | '2-5' | '3-5' | specific kol
  const [minTunggakan, setMinTunggakan] = useState<string>('1');
  const [aoFilter, setAoFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [hideNoHp, setHideNoHp] = useState(false);
  const [hideRecent, setHideRecent] = useState(true);

  // selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [selectedTplId, setSelectedTplId] = useState<string | undefined>();
  const [overrideTpl, setOverrideTpl] = useState<string>('');
  const [useOverride, setUseOverride] = useState(false);

  // modals
  const [queueOpen, setQueueOpen] = useState(false);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [editTplOpen, setEditTplOpen] = useState(false);
  const [editingTpl, setEditingTpl] = useState<WATemplate | null>(null);

  // Call Memo dialog
  const [memoDialogOpen, setMemoDialogOpen] = useState(false);
  const [memoPrefillL0lnno, setMemoPrefillL0lnno] = useState<string | undefined>();

  // pick default template
  useEffect(() => {
    if (!selectedTplId && templates.length > 0) {
      const def = templates.find((t) => t.is_default) || templates[0];
      setSelectedTplId(def.id);
    }
  }, [templates, selectedTplId]);

  const currentTpl = templates.find((t) => t.id === selectedTplId);
  const effectiveTpl = useOverride ? overrideTpl : currentTpl?.isi || '';

  const kontakMap = useMemo(() => {
    const m = new Map<string, string>();
    kontaks.forEach((k) => k.l0lnno && k.no_hp && m.set(k.l0lnno, k.no_hp));
    return m;
  }, [kontaks]);

  // last reminder per l0lnno
  const lastReminderMap = useMemo(() => {
    const m = new Map<string, string>();
    logs.forEach((l) => {
      if (!m.has(l.l0lnno)) m.set(l.l0lnno, l.sent_at);
    });
    return m;
  }, [logs]);

  // AO list
  const aoList = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.l0usid && s.add(r.l0usid));
    return Array.from(s).sort();
  }, [rows]);

  const candidates = useMemo(() => {
    const min = Number(minTunggakan) || 0;
    return rows
      .filter((r) => !!r.l0lnno)
      .map((r) => {
        const tunggakan = (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0);
        const kol = Number(r.kol) || 0;
        const no_hp = kontakMap.get(r.l0lnno!) || '';
        const lastSent = lastReminderMap.get(r.l0lnno!);
        return {
          l0lnno: r.l0lnno!,
          nama: r.l0name || '-',
          produk: r.lytitl || '-',
          kol,
          baki: Number(r.baki) || 0,
          tungpk: Number(r.tungpk) || 0,
          tungbg: Number(r.tungbg) || 0,
          tunggakan,
          ao: r.l0usid || '-',
          no_hp,
          lastSent,
        };
      })
      .filter((r) => {
        if (r.tunggakan < min) return false;
        if (kolFilter === '2-5' && (r.kol < 2 || r.kol > 5)) return false;
        if (kolFilter === '3-5' && (r.kol < 3 || r.kol > 5)) return false;
        if (/^\d+$/.test(kolFilter) && r.kol !== Number(kolFilter)) return false;
        if (aoFilter !== 'all' && r.ao !== aoFilter) return false;
        if (hideNoHp && !r.no_hp) return false;
        if (hideRecent && r.lastSent) {
          const hours = (Date.now() - new Date(r.lastSent).getTime()) / 3600_000;
          if (hours < 24) return false;
        }
        if (search) {
          const q = search.toLowerCase();
          if (!r.nama.toLowerCase().includes(q) && !r.l0lnno.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.tunggakan - a.tunggakan);
  }, [rows, kontakMap, lastReminderMap, kolFilter, minTunggakan, aoFilter, search, hideNoHp, hideRecent]);

  const selectableIds = candidates.filter((c) => !!c.no_hp).map((c) => c.l0lnno);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(selectableIds));
  };

  const toggleOne = (id: string) => {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  // quick fill phone
  const [quickFill, setQuickFill] = useState<{ l0lnno: string; nama: string; value: string } | null>(null);
  const handleQuickSave = async () => {
    if (!quickFill) return;
    if (!isValidPhoneID(quickFill.value)) {
      toast.error('Nomor HP tidak valid');
      return;
    }
    try {
      await upsertKontak.mutateAsync({ l0lnno: quickFill.l0lnno, nama: quickFill.nama, no_hp: normalizePhoneID(quickFill.value) });
      toast.success('Nomor HP tersimpan');
      setQuickFill(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const previewDebitur = candidates.find((c) => selected.has(c.l0lnno)) || candidates.find((c) => !!c.no_hp);
  const previewText = previewDebitur && effectiveTpl ? renderTemplate(effectiveTpl, {
    nama: previewDebitur.nama, no_rek: previewDebitur.l0lnno, kol: previewDebitur.kol, produk: previewDebitur.produk,
    baki: previewDebitur.baki, tungpk: previewDebitur.tungpk, tungbg: previewDebitur.tungbg, tunggakan: previewDebitur.tunggakan, ao: previewDebitur.ao,
  }) : '';

  const handleStartQueue = () => {
    if (selected.size === 0) { toast.error('Pilih minimal 1 debitur'); return; }
    if (!effectiveTpl) { toast.error('Template pesan kosong'); return; }
    const items: QueueItem[] = candidates
      .filter((c) => selected.has(c.l0lnno) && c.no_hp)
      .map((c) => ({
        l0lnno: c.l0lnno,
        nama: c.nama,
        no_hp: c.no_hp,
        pesan: renderTemplate(effectiveTpl, {
          nama: c.nama, no_rek: c.l0lnno, kol: c.kol, produk: c.produk,
          baki: c.baki, tungpk: c.tungpk, tungbg: c.tungbg, tunggakan: c.tunggakan, ao: c.ao,
        }),
        kol: c.kol,
        tunggakan: c.tunggakan,
        template_id: useOverride ? null : (selectedTplId || null),
        upload_id: uploadId || null,
      }));
    setQueueItems(items);
    setQueueOpen(true);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Reminder & Penagihan Tunggakan"
        description="Kirim reminder WhatsApp & catat Call Memo penagihan kredit"
      />

      {!canEdit && (
        <Alert className="mb-4 border-amber-500/50 bg-amber-500/10">
          <Lock className="h-4 w-4 text-amber-500" />
          <AlertDescription className="text-amber-600 dark:text-amber-400">
            Mode <strong>View Only</strong> — Anda dapat melihat data reminder & call memo, namun tidak dapat mengirim pesan, menyimpan kontak, atau mengubah template.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="reminder" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="reminder"><MessageCircle className="w-4 h-4 mr-1" />Kirim Reminder</TabsTrigger>
          <TabsTrigger value="memo"><ClipboardList className="w-4 h-4 mr-1" />Riwayat Call Memo</TabsTrigger>
        </TabsList>

        <TabsContent value="memo">
          <CallMemoTable />
        </TabsContent>

        <TabsContent value="reminder" className="space-y-0">
      {/* Filters */}
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Filter Kandidat</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="col-span-2">
            <Label className="text-xs">Periode Data</Label>
            <Select value={uploadId} onValueChange={setUploadId}>
              <SelectTrigger><SelectValue placeholder="Pilih" /></SelectTrigger>
              <SelectContent>
                {uploads.map((u) => <SelectItem key={u.id} value={u.id}>{format(new Date(u.jobdate), 'dd MMM yyyy', { locale: idLocale })}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">KOL</Label>
            <Select value={kolFilter} onValueChange={setKolFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua KOL</SelectItem>
                <SelectItem value="2-5">KOL 2 - 5</SelectItem>
                <SelectItem value="3-5">NPL (3-5)</SelectItem>
                <SelectItem value="1">KOL 1</SelectItem>
                <SelectItem value="2">KOL 2</SelectItem>
                <SelectItem value="3">KOL 3</SelectItem>
                <SelectItem value="4">KOL 4</SelectItem>
                <SelectItem value="5">KOL 5</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Min Tunggakan</Label>
            <Input type="number" value={minTunggakan} onChange={(e) => setMinTunggakan(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">AO</Label>
            <Select value={aoFilter} onValueChange={setAoFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua AO</SelectItem>
                {aoList.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Cari</Label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nama/no rek" />
          </div>
          <div className="col-span-2 md:col-span-3 lg:col-span-6 flex flex-wrap gap-4 pt-1">
            <div className="flex items-center gap-2"><Switch id="hh" checked={hideNoHp} onCheckedChange={setHideNoHp} /><Label htmlFor="hh" className="text-sm cursor-pointer">Sembunyikan yang belum ada HP</Label></div>
            <div className="flex items-center gap-2"><Switch id="hr" checked={hideRecent} onCheckedChange={setHideRecent} /><Label htmlFor="hr" className="text-sm cursor-pointer">Sembunyikan yang sudah di-reminder &lt; 24 jam</Label></div>
            <div className="ml-auto text-sm">
              <span className="text-muted-foreground">Kandidat:</span> <strong>{candidates.length}</strong>
              <span className="text-muted-foreground ml-3">Dipilih:</span> <strong className="text-primary">{selected.size}</strong>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Table */}
        <Card className="lg:col-span-2">
          <CardContent className="pt-6 px-2 sm:px-6">
            <div className="overflow-x-auto">
              <Table className="[&_th]:whitespace-nowrap text-xs sm:text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"><Checkbox checked={allSelected} onCheckedChange={toggleAll} /></TableHead>
                    <TableHead>Nama / No Rek</TableHead>
                    <TableHead className="text-center">KOL</TableHead>
                    <TableHead className="text-right">Tunggakan</TableHead>
                    <TableHead>No HP</TableHead>
                    <TableHead>Last Reminder</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {candidates.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Tidak ada kandidat sesuai filter</TableCell></TableRow>
                  ) : candidates.slice(0, 300).map((c) => {
                    const hasHp = !!c.no_hp;
                    return (
                      <TableRow key={c.l0lnno} className={!hasHp ? 'bg-rose-50/40 dark:bg-rose-950/10' : ''}>
                        <TableCell><Checkbox disabled={!hasHp} checked={selected.has(c.l0lnno)} onCheckedChange={() => toggleOne(c.l0lnno)} /></TableCell>
                        <TableCell>
                          <div className="font-medium">{c.nama}</div>
                          <div className="text-[10px] font-mono text-muted-foreground">{c.l0lnno} • {c.produk}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge style={{ backgroundColor: KOL_COLOR[c.kol] || '#94a3b8', color: 'white' }}>{kolDisplay(c.kol)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-amber-600">{fmtIDR(c.tunggakan)}</TableCell>
                        <TableCell>
                          {hasHp ? (
                            <span className="font-mono text-xs flex items-center gap-1"><Phone className="w-3 h-3" />{formatPhoneDisplay(c.no_hp)}</span>
                          ) : (
                            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={!canEdit} onClick={() => setQuickFill({ l0lnno: c.l0lnno, nama: c.nama, value: '' })}>
                              <Plus className="w-3 h-3 mr-1" />Isi HP
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex items-center gap-1">
                            {c.lastSent ? (
                              <Tooltip>
                                <TooltipTrigger><span className="text-muted-foreground">{formatDistanceToNow(new Date(c.lastSent), { locale: idLocale, addSuffix: true })}</span></TooltipTrigger>
                                <TooltipContent>{format(new Date(c.lastSent), 'dd MMM yyyy HH:mm', { locale: idLocale })}</TooltipContent>
                              </Tooltip>
                            ) : <span className="text-muted-foreground">—</span>}
                            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-[10px] ml-auto" title="Buat Call Memo" disabled={!canEdit} onClick={() => { setMemoPrefillL0lnno(c.l0lnno); setMemoDialogOpen(true); }}>
                              <ClipboardList className="w-3 h-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {candidates.length > 300 && (
              <p className="text-xs text-muted-foreground mt-3 text-center">Menampilkan 300 dari {candidates.length} — pakai filter untuk mempersempit.</p>
            )}
          </CardContent>
        </Card>

        {/* Right panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center justify-between">
                <span className="flex items-center gap-2"><FileText className="w-4 h-4" />Template Pesan</span>
                <Button size="sm" variant="ghost" onClick={() => { setEditingTpl(null); setEditTplOpen(true); }}><Plus className="w-3 h-3 mr-1" />Baru</Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select value={selectedTplId} onValueChange={(v) => { setSelectedTplId(v); setUseOverride(false); }}>
                <SelectTrigger><SelectValue placeholder="Pilih template" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.nama_template}{t.is_default ? ' ⭐' : ''}</SelectItem>)}
                </SelectContent>
              </Select>
              {currentTpl && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => { setEditingTpl(currentTpl); setEditTplOpen(true); }}>
                  <Edit3 className="w-3 h-3 mr-1" />Edit template "{currentTpl.nama_template}"
                </Button>
              )}
              <div className="flex items-center gap-2 pt-2 border-t">
                <Switch id="ovr" checked={useOverride} onCheckedChange={(v) => { setUseOverride(v); if (v && !overrideTpl) setOverrideTpl(currentTpl?.isi || ''); }} />
                <Label htmlFor="ovr" className="text-xs cursor-pointer">Override untuk batch ini saja</Label>
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
            <CardContent className="pt-6 space-y-3">
              <div>
                <Label className="text-xs mb-1 block">Metode Kirim</Label>
                <div className="flex gap-2">
                  <Badge variant="default" className="bg-emerald-600">WhatsApp Web/Desktop</Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="opacity-50 cursor-not-allowed">Twilio Auto</Badge>
                    </TooltipTrigger>
                    <TooltipContent>Belum dikonfigurasi. Hubungi admin untuk aktifkan.</TooltipContent>
                  </Tooltip>
                </div>
              </div>
              <Button onClick={handleStartQueue} disabled={selected.size === 0} className="w-full bg-emerald-600 hover:bg-emerald-700">
                <Send className="w-4 h-4 mr-2" />Kirim Reminder ({selected.size})
              </Button>
              <Link to="/monitoring/kontak" className="block text-center text-xs text-primary hover:underline">
                Kelola nomor HP debitur →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
        </TabsContent>
      </Tabs>

      <AntrianWAModal open={queueOpen} items={queueItems} onClose={() => setQueueOpen(false)} />
      <TemplateEditor open={editTplOpen} template={editingTpl} onClose={() => setEditTplOpen(false)} />
      <CallMemoDialog
        open={memoDialogOpen}
        onClose={() => { setMemoDialogOpen(false); setMemoPrefillL0lnno(undefined); }}
        prefillL0lnno={memoPrefillL0lnno}
      />

      {/* Quick fill HP dialog */}
      {quickFill && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setQuickFill(null)}>
          <Card className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <CardHeader><CardTitle className="text-base">Isi Nomor HP — {quickFill.nama}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Input
                autoFocus
                placeholder="08xxx atau 628xxx"
                value={quickFill.value}
                onChange={(e) => setQuickFill({ ...quickFill, value: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleQuickSave()}
              />
              <p className="text-xs text-muted-foreground">Format otomatis ke 628xxx</p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setQuickFill(null)}>Batal</Button>
                <Button onClick={handleQuickSave} disabled={upsertKontak.isPending}>Simpan</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </MainLayout>
  );
};

export default ReminderTunggakanPage;
