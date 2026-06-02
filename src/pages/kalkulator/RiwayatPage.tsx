import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLoanSimulations, useDeleteLoanSimulation, type LoanSimulationRow } from '@/hooks/use-loan-calc';
import { fmtRp, fmtNumber } from '@/lib/loan-calc';
import { Trash2, Eye, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

const RiwayatPage: React.FC = () => {
  const { data = [], isLoading } = useLoanSimulations();
  const del = useDeleteLoanSimulation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit } = useAuth();
  const [detail, setDetail] = useState<LoanSimulationRow | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus simulasi ini?')) return;
    try {
      await del.mutateAsync(id);
      toast({ title: 'Simulasi dihapus' });
    } catch (e: any) {
      toast({ title: 'Gagal hapus', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <MainLayout>
      <PageHeader
        title="Riwayat Simulasi Loan"
        description={`${data.length} simulasi tersimpan`}
        actions={
          <Button variant="outline" onClick={() => navigate('/kalkulator')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Kalkulator
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tanggal</TableHead>
                <TableHead>Nama Debitur</TableHead>
                <TableHead>Produk</TableHead>
                <TableHead className="text-right">Plafon</TableHead>
                <TableHead>Tenor</TableHead>
                <TableHead className="text-right">Angsuran</TableHead>
                <TableHead>Dibuat oleh</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Memuat...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Belum ada simulasi tersimpan
                  </TableCell>
                </TableRow>
              )}
              {data.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{new Date(s.created_at).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell className="font-medium">{s.nama_debitur}</TableCell>
                  <TableCell>{s.product_nama || '-'}</TableCell>
                  <TableCell className="text-right">{fmtRp(s.plafon)}</TableCell>
                  <TableCell>{s.tenor_bulan} bln</TableCell>
                  <TableCell className="text-right">
                    {fmtRp(s.hasil_ringkasan?.angsuranPertama ?? 0)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.created_by_nama || '-'}</TableCell>
                  <TableCell className="text-right">
                    <Button size="icon" variant="ghost" onClick={() => setDetail(s)}>
                      <Eye className="w-4 h-4" />
                    </Button>
                    {canEdit && (
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)}>
                        <Trash2 className="w-4 h-4 text-rose-600" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{detail?.nama_debitur} — {detail?.product_nama}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <Info label="KTP" v={detail.nomor_ktp} />
                <Info label="Pekerjaan" v={detail.pekerjaan} />
                <Info label="Instansi" v={detail.instansi} />
                <Info label="Karir" v={detail.pilihan_karir} />
                <Info label="Skema" v={detail.skema.toUpperCase()} />
                <Info label="Bunga p.a." v={`${detail.bunga_pa}%`} />
                <Info label="Plafon" v={fmtRp(detail.plafon)} />
                <Info label="Tenor" v={`${detail.tenor_bulan} bln`} />
                <Info label="Angsuran" v={fmtRp(detail.hasil_ringkasan?.angsuranPertama ?? 0)} />
                <Info label="Total Bunga" v={fmtRp(detail.hasil_ringkasan?.totalBunga ?? 0)} />
                <Info label="Dana Diterima" v={fmtRp(detail.hasil_ringkasan?.danaDiterima ?? 0)} />
                <Info label="AO" v={detail.nama_ao} />
              </div>
              {detail.tabel_angsuran && (
                <div className="max-h-[400px] overflow-auto border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>No</TableHead>
                        <TableHead>Tgl</TableHead>
                        <TableHead className="text-right">Pokok</TableHead>
                        <TableHead className="text-right">Bunga</TableHead>
                        <TableHead className="text-right">Angsuran</TableHead>
                        <TableHead className="text-right">Saldo</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detail.tabel_angsuran.map((r) => (
                        <TableRow key={r.bulan}>
                          <TableCell>{r.bulan}</TableCell>
                          <TableCell>{new Date(r.tanggal).toLocaleDateString('id-ID')}</TableCell>
                          <TableCell className="text-right">{fmtNumber(r.pokok)}</TableCell>
                          <TableCell className="text-right">{fmtNumber(r.bunga)}</TableCell>
                          <TableCell className="text-right font-medium">{fmtNumber(r.angsuran)}</TableCell>
                          <TableCell className="text-right">{fmtNumber(r.saldo)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
};

const Info: React.FC<{ label: string; v: any }> = ({ label, v }) => (
  <div>
    <div className="text-xs text-muted-foreground">{label}</div>
    <div className="font-medium">{v || '-'}</div>
  </div>
);

export default RiwayatPage;
