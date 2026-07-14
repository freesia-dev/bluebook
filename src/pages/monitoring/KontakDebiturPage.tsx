import React, { useMemo, useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMLFUploads, useMLFData143 } from '@/hooks/use-mlf-data';
import { useDebiturKontak, useUpsertDebiturKontak } from '@/hooks/use-debitur-kontak';
import { normalizePhoneID, isValidPhoneID, formatPhoneDisplay } from '@/lib/wa-utils';
import { fmtIDR, kolDisplay, KOL_COLOR } from '@/lib/mlf-utils';
import { Phone, Search, AlertTriangle, CheckCircle2, Save } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';

const KontakDebiturPage: React.FC = () => {
  const { data: uploads = [] } = useMLFUploads();
  const [uploadId, setUploadId] = useState<string | undefined>();
  React.useEffect(() => {
    if (!uploadId && uploads.length > 0) setUploadId(uploads[0].id);
  }, [uploads, uploadId]);

  const { data: rows = [] } = useMLFData143(uploadId);
  const { data: kontaks = [] } = useDebiturKontak();
  const upsert = useUpsertDebiturKontak();

  const [search, setSearch] = useState('');
  const [onlyNoHp, setOnlyNoHp] = useState(false);
  const [onlyTunggakan, setOnlyTunggakan] = useState(false);

  // Deep-link filter from notifikasi (mis. /monitoring/kontak?filter=tunggakan)
  const [sp] = useSearchParams();
  useEffect(() => {
    const f = sp.get('filter');
    if (f === 'tunggakan') setOnlyTunggakan(true);
    if (f === 'no-hp') setOnlyNoHp(true);
  }, [sp]);

  // edit buffer
  const [edits, setEdits] = useState<Record<string, string>>({});

  const kontakMap = useMemo(() => {
    const m = new Map<string, (typeof kontaks)[number]>();
    kontaks.forEach((k) => k.l0lnno && m.set(k.l0lnno, k));
    return m;
  }, [kontaks]);

  const merged = useMemo(() => {
    return rows
      .filter((r) => !!r.l0lnno)
      .map((r) => {
        const k = kontakMap.get(r.l0lnno!);
        const tunggakan = (Number(r.tungpk) || 0) + (Number(r.tungbg) || 0);
        return {
          l0lnno: r.l0lnno!,
          nama: r.l0name || k?.nama || '-',
          produk: r.lytitl || '-',
          kol: Number(r.kol) || 0,
          baki: Number(r.baki) || 0,
          tunggakan,
          ao: r.l0usid || '-',
          no_hp: k?.no_hp || '',
          catatan: k?.catatan || '',
          updated_at: k?.updated_at || null,
        };
      })
      .filter((r) => {
        if (onlyNoHp && r.no_hp) return false;
        if (onlyTunggakan && r.tunggakan <= 0) return false;
        if (search) {
          const q = search.toLowerCase();
          if (!r.l0lnno.toLowerCase().includes(q) && !r.nama.toLowerCase().includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.tunggakan - a.tunggakan);
  }, [rows, kontakMap, search, onlyNoHp, onlyTunggakan]);

  const stats = useMemo(() => {
    const total = rows.filter((r) => !!r.l0lnno).length;
    const adaHp = rows.filter((r) => r.l0lnno && kontakMap.get(r.l0lnno)?.no_hp).length;
    return { total, adaHp, belum: total - adaHp };
  }, [rows, kontakMap]);

  const handleSave = async (l0lnno: string, nama: string) => {
    const raw = edits[l0lnno];
    const normalized = normalizePhoneID(raw);
    if (raw && !isValidPhoneID(raw)) {
      toast.error('Nomor HP tidak valid. Format: 08xxx / 628xxx');
      return;
    }
    try {
      await upsert.mutateAsync({ l0lnno, nama, no_hp: normalized || null });
      toast.success(`Nomor HP ${nama} tersimpan`);
      setEdits((e) => {
        const n = { ...e };
        delete n[l0lnno];
        return n;
      });
    } catch (e: any) {
      toast.error(e.message || 'Gagal menyimpan');
    }
  };

  return (
    <MainLayout>
      <PageHeader title="Kontak Debitur" description="Master nomor HP debitur — dipakai untuk reminder WhatsApp" />

      <Card className="mb-4">
        <CardContent className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatPill label="Total Debitur" value={stats.total} color="text-foreground" />
          <StatPill label="Sudah ada No HP" value={stats.adaHp} color="text-emerald-600" />
          <StatPill label="Belum ada No HP" value={stats.belum} color="text-rose-600" />
        </CardContent>
      </Card>

      <Card className="mb-4">
        <CardContent className="pt-6 flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="flex-1 min-w-[200px]">
            <Label className="text-xs">Periode Data</Label>
            <Select value={uploadId} onValueChange={setUploadId}>
              <SelectTrigger><SelectValue placeholder="Pilih periode" /></SelectTrigger>
              <SelectContent>
                {uploads.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {format(new Date(u.jobdate), 'dd MMM yyyy', { locale: idLocale })} — {u.filename}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-[2] min-w-[200px]">
            <Label className="text-xs">Cari nama / no rekening</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ketik untuk mencari..." className="pl-9" />
            </div>
          </div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2"><Switch id="f1" checked={onlyNoHp} onCheckedChange={setOnlyNoHp} /><Label htmlFor="f1" className="text-sm cursor-pointer">Belum ada HP</Label></div>
            <div className="flex items-center gap-2"><Switch id="f2" checked={onlyTunggakan} onCheckedChange={setOnlyTunggakan} /><Label htmlFor="f2" className="text-sm cursor-pointer">Hanya tunggakan</Label></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 px-2 sm:px-6">
          <div className="text-xs text-muted-foreground mb-2">{merged.length} debitur ditampilkan</div>
          <div className="overflow-x-auto">
            <Table className="[&_th]:whitespace-nowrap text-xs sm:text-sm">
              <TableHeader>
                <TableRow>
                  <TableHead>No Rek</TableHead>
                  <TableHead>Nama</TableHead>
                  <TableHead className="text-center">KOL</TableHead>
                  <TableHead className="text-right">Tunggakan</TableHead>
                  <TableHead>No HP</TableHead>
                  <TableHead>AO</TableHead>
                  <TableHead className="text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {merged.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-6 text-muted-foreground">Tidak ada data</TableCell></TableRow>
                ) : (
                  merged.slice(0, 500).map((r) => {
                    const hasHp = !!r.no_hp;
                    const editVal = edits[r.l0lnno];
                    const isEditing = editVal !== undefined;
                    return (
                      <TableRow key={r.l0lnno} className={!hasHp && r.tunggakan > 0 ? 'bg-rose-50/40 dark:bg-rose-950/10' : ''}>
                        <TableCell className="font-mono text-xs">{r.l0lnno}</TableCell>
                        <TableCell className="font-medium">{r.nama}</TableCell>
                        <TableCell className="text-center">
                          <Badge style={{ backgroundColor: KOL_COLOR[r.kol] || '#94a3b8', color: 'white' }}>{kolDisplay(r.kol)}</Badge>
                        </TableCell>
                        <TableCell className={`text-right ${r.tunggakan > 0 ? 'text-amber-600 font-semibold' : ''}`}>{fmtIDR(r.tunggakan)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[200px]">
                            <Phone className="w-3 h-3 text-muted-foreground shrink-0" />
                            <Input
                              value={isEditing ? editVal : r.no_hp}
                              onChange={(e) => setEdits((p) => ({ ...p, [r.l0lnno]: e.target.value }))}
                              placeholder="08xxx atau 628xxx"
                              className="h-8 text-xs"
                            />
                          </div>
                          {hasHp && !isEditing && <span className="text-[10px] text-muted-foreground">{formatPhoneDisplay(r.no_hp)}</span>}
                        </TableCell>
                        <TableCell className="text-xs">{r.ao}</TableCell>
                        <TableCell className="text-center">
                          {isEditing ? (
                            <Button size="sm" onClick={() => handleSave(r.l0lnno, r.nama)} disabled={upsert.isPending}>
                              <Save className="w-3 h-3 mr-1" />Simpan
                            </Button>
                          ) : hasHp ? (
                            <Badge variant="secondary" className="gap-1"><CheckCircle2 className="w-3 h-3" />OK</Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1"><AlertTriangle className="w-3 h-3" />Kosong</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
          {merged.length > 500 && (
            <p className="text-xs text-muted-foreground mt-3 text-center">Menampilkan 500 dari {merged.length} — gunakan filter untuk mempersempit.</p>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
};

const StatPill: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="text-center">
    <p className="text-xs text-muted-foreground uppercase">{label}</p>
    <p className={`text-2xl font-bold ${color}`}>{value.toLocaleString('id-ID')}</p>
  </div>
);

export default KontakDebiturPage;
