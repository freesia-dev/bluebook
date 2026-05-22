import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useAuditTokens, useCreateAuditToken, useRevokeAuditToken, useDeleteAuditToken } from '@/hooks/use-security-audit';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Copy, Trash2, Ban, Plus, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { format, addDays, endOfMonth, startOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const AuditLinksAdminPage: React.FC = () => {
  const { permissions } = useAuth();
  const { toast } = useToast();
  const { data: tokens = [], isLoading } = useAuditTokens();
  const create = useCreateAuditToken();
  const revoke = useRevokeAuditToken();
  const del = useDeleteAuditToken();

  const today = new Date();
  const [dari, setDari] = useState(format(startOfMonth(today), 'yyyy-MM-dd'));
  const [sampai, setSampai] = useState(format(endOfMonth(today), 'yyyy-MM-dd'));
  const [durasi, setDurasi] = useState('30');
  const [catatan, setCatatan] = useState('');

  if (!permissions.canManageSecurityAudit) {
    return (
      <MainLayout>
        <Card className="p-10 text-center text-muted-foreground">
          Anda tidak memiliki akses ke halaman ini.
        </Card>
      </MainLayout>
    );
  }

  const buildUrl = (token: string) => `${window.location.origin}/audit/security/${token}`;

  const handleCreate = async () => {
    try {
      const expires = addDays(new Date(), parseInt(durasi || '30', 10)).toISOString();
      await create.mutateAsync({ dari, sampai, expires_at: expires, catatan: catatan || undefined });
      toast({ title: 'Link audit berhasil dibuat' });
      setCatatan('');
    } catch (err: any) {
      toast({ title: 'Gagal membuat link', description: err.message, variant: 'destructive' });
    }
  };

  const handleCopy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(buildUrl(token));
      toast({ title: 'Link disalin ke clipboard' });
    } catch {
      toast({ title: 'Gagal menyalin', variant: 'destructive' });
    }
  };

  const handleRevoke = async (id: string) => {
    if (!confirm('Cabut akses link ini? Auditor tidak akan bisa membuka lagi.')) return;
    try {
      await revoke.mutateAsync(id);
      toast({ title: 'Link dicabut' });
    } catch (err: any) {
      toast({ title: 'Gagal cabut', description: err.message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus permanen catatan link ini?')) return;
    try {
      await del.mutateAsync(id);
      toast({ title: 'Catatan dihapus' });
    } catch (err: any) {
      toast({ title: 'Gagal hapus', description: err.message, variant: 'destructive' });
    }
  };

  const statusOf = (t: { revoked_at: string | null; expires_at: string }) => {
    if (t.revoked_at) return { label: 'Dicabut', color: 'bg-slate-100 text-slate-700 border-slate-300' };
    if (new Date(t.expires_at) <= new Date()) return { label: 'Kadaluarsa', color: 'bg-amber-100 text-amber-800 border-amber-300' };
    return { label: 'Aktif', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  };

  return (
    <MainLayout>
      <PageHeader
        title="Link Audit Log Security"
        description="Bagikan akses rekap Log Security kepada Tim Audit tanpa login. Link bisa dicabut kapan saja."
      />

      <Card className="p-5 mb-5">
        <div className="flex items-center gap-2 text-sm font-semibold mb-4">
          <Plus className="w-4 h-4" />Buat Link Audit Baru
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Periode Dari</Label>
            <Input type="date" value={dari} onChange={(e) => setDari(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Periode Sampai</Label>
            <Input type="date" value={sampai} onChange={(e) => setSampai(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label className="text-xs">Berlaku (hari)</Label>
            <select
              value={durasi}
              onChange={(e) => setDurasi(e.target.value)}
              className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="7">7 hari</option>
              <option value="30">30 hari</option>
              <option value="90">90 hari</option>
              <option value="180">180 hari</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">Catatan (opsional)</Label>
            <Input value={catatan} onChange={(e) => setCatatan(e.target.value)} placeholder="mis. Audit Q1 2026" className="mt-1" />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleCreate} disabled={create.isPending}>
            <LinkIcon className="w-4 h-4 mr-2" />{create.isPending ? 'Membuat...' : 'Generate Link'}
          </Button>
        </div>
      </Card>

      <Card>
        <div className="p-4 border-b font-semibold text-sm">Daftar Link Audit</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b text-left text-xs uppercase tracking-wide text-slate-600">
              <tr>
                <th className="px-4 py-2.5">Periode</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Expired</th>
                <th className="px-4 py-2.5">Dibuat</th>
                <th className="px-4 py-2.5">Catatan</th>
                <th className="px-4 py-2.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Memuat...</td></tr>
              )}
              {!isLoading && tokens.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">Belum ada link audit.</td></tr>
              )}
              {tokens.map((t) => {
                const st = statusOf(t);
                const url = buildUrl(t.token);
                return (
                  <tr key={t.id} className="border-b hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {format(new Date(t.periode_dari), 'dd MMM yyyy', { locale: idLocale })} – {format(new Date(t.periode_sampai), 'dd MMM yyyy', { locale: idLocale })}
                      </div>
                      <div className="text-xs text-muted-foreground truncate max-w-[280px]" title={url}>{url}</div>
                    </td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`${st.color} border`}>{st.label}</Badge></td>
                    <td className="px-4 py-3 text-xs">{format(new Date(t.expires_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}</td>
                    <td className="px-4 py-3 text-xs">
                      {t.created_by_nama || '-'}<br />
                      <span className="text-muted-foreground">{format(new Date(t.created_at), 'dd MMM yyyy', { locale: idLocale })}</span>
                    </td>
                    <td className="px-4 py-3 text-xs">{t.catatan || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" title="Salin link" onClick={() => handleCopy(t.token)}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" title="Buka link" asChild>
                          <a href={url} target="_blank" rel="noreferrer"><ExternalLink className="w-3.5 h-3.5" /></a>
                        </Button>
                        {!t.revoked_at && (
                          <Button size="sm" variant="ghost" title="Cabut" className="text-amber-700" onClick={() => handleRevoke(t.id)}>
                            <Ban className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" title="Hapus" className="text-destructive" onClick={() => handleDelete(t.id)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </MainLayout>
  );
};

export default AuditLinksAdminPage;
