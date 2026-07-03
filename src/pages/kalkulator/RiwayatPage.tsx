import React, { useRef, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLoanSimulations, useDeleteLoanSimulation, type LoanSimulationRow } from '@/hooks/use-loan-calc';
import { fmtRp, fmtNumber } from '@/lib/loan-calc';
import { Trash2, Eye, ArrowLeft, FileSpreadsheet, FileText, Pencil, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import logoBpd from '@/assets/logo-bankaltimtara.png';

const exportRowToExcel = (s: LoanSimulationRow) => {
  const wb = XLSX.utils.book_new();
  const r = s.hasil_ringkasan || ({} as any);
  const ringkasan: any[][] = [
    ['SIMULASI ANGSURAN KREDIT'],
    ['Dicetak', new Date().toLocaleString('id-ID')],
    [],
    ['— DATA DEBITUR —'],
    ['Nama Debitur', s.nama_debitur],
    ['Nomor KTP', s.nomor_ktp || '-'],
    ['Jenis Kelamin', s.jenis_kelamin === 'L' ? 'Laki-laki' : s.jenis_kelamin === 'P' ? 'Perempuan' : '-'],
    ['Tanggal Lahir', s.tanggal_lahir || '-'],
    ['Pekerjaan', s.pekerjaan || '-'],
    ['Instansi', s.instansi || '-'],
    ['Pilihan Karir', s.pilihan_karir || '-'],
    [],
    ['— PARAMETER PINJAMAN —'],
    ['Produk', s.product_nama || '-'],
    ['Skema', s.skema.toUpperCase()],
    ['Plafon', s.plafon],
    ['Tenor (bulan)', s.tenor_bulan],
    ['Tanggal Akad', s.tanggal_akad || '-'],
    ['Bunga p.a.', `${s.bunga_pa}%`],
    ['Gaji', s.gaji],
    ['Provisi', `${s.provisi_pct}%`],
    ['Asuransi', s.asuransi_nominal],
    ['Biaya Notaris', s.biaya_notaris],
    ['Biaya Perikatan', s.biaya_perikatan],
    ['Blokir Angsuran', s.blokir_angsuran],
    ['Nama AO', s.nama_ao || '-'],
    [],
    ['— RINGKASAN HASIL —'],
    ['Angsuran Pertama', r.angsuranPertama ?? 0],
    ['Angsuran Terakhir', r.angsuranTerakhir ?? 0],
    ['Total Angsuran', r.totalAngsuran ?? 0],
    ['Total Bunga', r.totalBunga ?? 0],
    ['Total Potongan di Muka', r.total ?? 0],
    ['Dana Diterima', r.danaDiterima ?? 0],
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(ringkasan), 'Ringkasan');

  if (s.tabel_angsuran && s.tabel_angsuran.length) {
    const ang = s.tabel_angsuran.map((row) => ({
      No: row.bulan,
      Tanggal: row.tanggal,
      Pokok: row.pokok,
      Bunga: row.bunga,
      Angsuran: row.angsuran,
      'Saldo Pokok': row.saldo,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ang), 'Tabel Angsuran');
  }
  XLSX.writeFile(wb, `Simulasi_${s.nama_debitur.replace(/\s+/g, '_')}_${s.id.slice(0, 8)}.xlsx`);
};

const exportRowToPDF = async (s: LoanSimulationRow) => {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const M = 14;
  const BRAND_BLUE: [number, number, number] = [0, 63, 127];
  const BRAND_ORANGE: [number, number, number] = [245, 130, 32];
  const ZEBRA: [number, number, number] = [241, 245, 249];
  const TEXT_DARK: [number, number, number] = [30, 41, 59];

  // logo
  try {
    const logoData = await fetch(logoBpd)
      .then((r) => r.blob())
      .then((b) => new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.readAsDataURL(b);
      }));
    const props = (doc as any).getImageProperties(logoData);
    const logoH = 14;
    const logoW = (props.width / props.height) * logoH;
    doc.addImage(logoData, 'PNG', M, M + 2, logoW, logoH);
  } catch {}

  const kopX = M + 34;
  doc.setTextColor(...BRAND_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PT. BPD Kalimantan Timur & Kalimantan Utara', kopX, M + 5);
  doc.setFontSize(10.5);
  doc.text('Kantor Cabang Pembantu Telihan', kopX, M + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Jl. Letjend S. Parman No. 14-15, Bontang 75383  ·  Telp. 0548-26567', kopX, M + 14.5);
  doc.text('kcp.telihan@bankaltimtara.co.id  ·  bankaltimtara.co.id', kopX, M + 18);

  doc.setFillColor(...BRAND_BLUE);
  doc.rect(M, M + 21, pageW - 2 * M, 1.2, 'F');
  doc.setFillColor(...BRAND_ORANGE);
  doc.rect(M, M + 22.4, pageW - 2 * M, 0.5, 'F');

  let y = M + 30;
  doc.setTextColor(...BRAND_BLUE);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('SIMULASI ANGSURAN KREDIT', pageW / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Disimpan: ${new Date(s.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}`, pageW / 2, y, { align: 'center' });

  const r = s.hasil_ringkasan || ({} as any);

  y += 4;
  autoTable(doc, {
    startY: y,
    theme: 'plain',
    styles: { fontSize: 8.5, cellPadding: 1.2, textColor: TEXT_DARK },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 32 },
      1: { cellWidth: 3 },
      2: { cellWidth: 50 },
      3: { fontStyle: 'bold', cellWidth: 32 },
      4: { cellWidth: 3 },
      5: { cellWidth: 50 },
    },
    head: [[
      { content: 'DATA DEBITUR', colSpan: 3, styles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 9 } },
      { content: 'PARAMETER PINJAMAN', colSpan: 3, styles: { fillColor: BRAND_BLUE, textColor: 255, fontStyle: 'bold', fontSize: 9 } },
    ]],
    body: [
      ['Nama', ':', s.nama_debitur, 'Produk', ':', s.product_nama || '-'],
      ['Nomor KTP', ':', s.nomor_ktp || '-', 'Skema', ':', s.skema.toUpperCase()],
      ['Jenis Kelamin', ':', s.jenis_kelamin === 'L' ? 'Laki-laki' : s.jenis_kelamin === 'P' ? 'Perempuan' : '-', 'Plafon', ':', fmtRp(s.plafon)],
      ['Tgl Lahir', ':', s.tanggal_lahir ? new Date(s.tanggal_lahir).toLocaleDateString('id-ID') : '-', 'Tenor', ':', `${s.tenor_bulan} bulan`],
      ['Pekerjaan', ':', s.pekerjaan || '-', 'Tanggal Akad', ':', s.tanggal_akad ? new Date(s.tanggal_akad).toLocaleDateString('id-ID') : '-'],
      ['Instansi', ':', s.instansi || '-', 'Bunga p.a.', ':', `${s.bunga_pa}%`],
      ['Pilihan Karir', ':', s.pilihan_karir || '-', 'Gaji', ':', fmtRp(s.gaji)],
      ['AO', ':', s.nama_ao || '-', 'Provisi', ':', `${s.provisi_pct}%`],
    ],
    margin: { left: M, right: M },
  });

  let yy = (doc as any).lastAutoTable.finalY + 4;
  autoTable(doc, {
    startY: yy,
    head: [['Ringkasan', 'Nilai (Rp)']],
    body: [
      ['Angsuran Pertama', fmtNumber(r.angsuranPertama ?? 0)],
      ['Angsuran Terakhir', fmtNumber(r.angsuranTerakhir ?? 0)],
      ['Total Angsuran', fmtNumber(r.totalAngsuran ?? 0)],
      ['Total Bunga', fmtNumber(r.totalBunga ?? 0)],
      ['Total Potongan di Muka', fmtNumber(r.total ?? 0)],
      [
        { content: 'DANA DITERIMA DEBITUR', styles: { fontStyle: 'bold', fillColor: BRAND_ORANGE, textColor: 255 } },
        { content: fmtNumber(r.danaDiterima ?? 0), styles: { fontStyle: 'bold', fillColor: BRAND_ORANGE, textColor: 255, halign: 'right' } },
      ],
    ],
    styles: { fontSize: 8.5, cellPadding: 2, textColor: TEXT_DARK },
    headStyles: { fillColor: BRAND_BLUE, textColor: 255 },
    columnStyles: { 0: { cellWidth: 'auto' }, 1: { cellWidth: 50, halign: 'right' } },
    margin: { left: M, right: M },
  });

  if (s.tabel_angsuran && s.tabel_angsuran.length) {
    yy = (doc as any).lastAutoTable.finalY + 4;
    autoTable(doc, {
      startY: yy,
      head: [['No', 'Tanggal', 'Pokok', 'Bunga', 'Angsuran', 'Saldo Pokok']],
      body: s.tabel_angsuran.map((row) => [
        row.bulan,
        new Date(row.tanggal).toLocaleDateString('id-ID'),
        fmtNumber(row.pokok),
        fmtNumber(row.bunga),
        fmtNumber(row.angsuran),
        fmtNumber(row.saldo),
      ]),
      styles: { fontSize: 7.5, cellPadding: 1.5, textColor: TEXT_DARK },
      headStyles: { fillColor: BRAND_BLUE, textColor: 255 },
      alternateRowStyles: { fillColor: ZEBRA },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 28 },
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right', fontStyle: 'bold' },
        5: { halign: 'right' },
      },
      margin: { left: M, right: M },
    });
  }

  doc.save(`Simulasi_${s.nama_debitur.replace(/\s+/g, '_')}_${s.id.slice(0, 8)}.pdf`);
};

const RiwayatPage: React.FC = () => {
  const { data = [], isLoading } = useLoanSimulations();
  const del = useDeleteLoanSimulation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canEdit } = useAuth();
  const [detail, setDetail] = useState<LoanSimulationRow | null>(null);
  const [jpgTarget, setJpgTarget] = useState<LoanSimulationRow | null>(null);
  const jpgRef = useRef<HTMLDivElement>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus simulasi ini?')) return;
    try {
      await del.mutateAsync(id);
      toast({ title: 'Simulasi dihapus' });
    } catch (e: any) {
      toast({ title: 'Gagal hapus', description: e.message, variant: 'destructive' });
    }
  };

  const handleExportJpg = async (s: LoanSimulationRow) => {
    setJpgTarget(s);
    // tunggu render
    await new Promise((r) => setTimeout(r, 100));
    if (!jpgRef.current) { setJpgTarget(null); return; }
    try {
      const canvas = await html2canvas(jpgRef.current, {
        scale: 4, backgroundColor: '#ffffff', useCORS: true, imageTimeout: 0, logging: false,
      });
      const url = canvas.toDataURL('image/jpeg', 1.0);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Simulasi_${s.nama_debitur.replace(/\s+/g, '_')}_${s.id.slice(0, 8)}.jpg`;
      a.click();
      toast({ title: 'Gambar simulasi diunduh' });
    } catch (e: any) {
      toast({ title: 'Gagal membuat gambar', description: e.message, variant: 'destructive' });
    } finally {
      setJpgTarget(null);
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
                    <Button size="icon" variant="ghost" onClick={() => setDetail(s)} title="Lihat detail">
                      <Eye className="w-4 h-4" />
                    </Button>
                    {canEdit && (
                      <Button size="icon" variant="ghost" onClick={() => navigate(`/kalkulator?edit=${s.id}`)} title="Edit simulasi">
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => handleExportJpg(s)} title="Export JPG">
                      <ImageIcon className="w-4 h-4 text-amber-600" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => exportRowToExcel(s)} title="Export Excel">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => exportRowToPDF(s)} title="Export PDF">
                      <FileText className="w-4 h-4 text-rose-600" />
                    </Button>
                    {canEdit && (
                      <Button size="icon" variant="ghost" onClick={() => handleDelete(s.id)} title="Hapus">
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
            <DialogTitle className="flex items-center justify-between gap-3 pr-6">
              <span>{detail?.nama_debitur} — {detail?.product_nama}</span>
              {detail && (
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => exportRowToExcel(detail)}>
                    <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> Excel
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => exportRowToPDF(detail)}>
                    <FileText className="w-3.5 h-3.5 mr-1" /> PDF
                  </Button>
                </div>
              )}
            </DialogTitle>
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

      {/* Off-screen JPG card */}
      <div style={{ position: 'fixed', left: '-10000px', top: 0, pointerEvents: 'none' }}>
        {jpgTarget && (() => {
          const s = jpgTarget;
          const r: any = s.hasil_ringkasan || {};
          const gp = s.gaji_pokok ?? s.gaji ?? 0;
          const tt = s.ttp ?? 0;
          const total = gp + tt;
          const asuransiJiwa = s.asuransi_jiwa_beban ?? s.asuransi_nominal ?? 0;
          const premiKredit = s.premi_kredit ?? 0;
          const outPokok = s.outstanding_pokok ?? 0;
          const outBunga = s.outstanding_bunga ?? 0;
          const totalPelunasan = outPokok + outBunga;
          const danaDiterima = r.danaDiterima ?? 0;
          const row = (l: string, v: string, bold = false) => (
            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
              <td style={{ padding: '8px 0', color: bold ? '#0f172a' : '#475569', fontWeight: bold ? 700 : 400 }}>{l}</td>
              <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: bold ? 700 : 500, color: '#0f172a' }}>{v}</td>
            </tr>
          );
          return (
            <div ref={jpgRef} style={{ width: 900, padding: 40, background: 'linear-gradient(135deg, #f8fafc 0%, #eff6ff 100%)', fontFamily: 'Inter, system-ui, sans-serif', color: '#0f172a' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 20, borderBottom: '2px solid #003f7f' }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#003f7f', letterSpacing: -0.5 }}>Simulasi Kredit</div>
                  <div style={{ fontSize: 13, color: '#475569', marginTop: 2 }}>{s.product_nama || 'Produk Kredit'} · {s.nama_debitur}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b' }}>Bankaltimtara</div>
                  <div style={{ fontSize: 12, color: '#003f7f', fontWeight: 600 }}>KCP Telihan</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 20 }}>
                {[['Skema', s.skema.toUpperCase()], ['Plafon', fmtRp(s.plafon)], ['Tenor', `${s.tenor_bulan} bulan`], ['Bunga p.a.', `${s.bunga_pa}%${s.cerdas_skema ? ' (CERDAS)' : ''}`]].map(([l, v]) => (
                  <div key={l} style={{ background: '#fff', padding: '10px 14px', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>{l}</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>
              {total > 0 && (
                <div style={{ marginTop: 16, padding: 14, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b', fontWeight: 700, marginBottom: 6 }}>Penghasilan Debitur</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, fontSize: 13 }}>
                    <div><div style={{ color: '#64748b', fontSize: 11 }}>Gaji Pokok</div><div style={{ fontWeight: 600 }}>{fmtRp(gp)}</div></div>
                    <div><div style={{ color: '#64748b', fontSize: 11 }}>TTP / Lainnya</div><div style={{ fontWeight: 600 }}>{fmtRp(tt)}</div></div>
                    <div><div style={{ color: '#64748b', fontSize: 11 }}>Total</div><div style={{ fontWeight: 700, color: '#003f7f' }}>{fmtRp(total)}</div></div>
                  </div>
                </div>
              )}
              <div style={{ marginTop: 20, padding: 20, background: '#003f7f', color: '#fff', borderRadius: 12 }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.8 }}>Angsuran Pertama / Bulan</div>
                <div style={{ fontSize: 36, fontWeight: 800, marginTop: 4 }}>{fmtRp(r.angsuranPertama ?? 0)}</div>
                <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, opacity: 0.9 }}>
                  <span>Total Angsuran: <b>{fmtRp(r.totalAngsuran ?? 0)}</b></span>
                  <span>Total Bunga: <b>{fmtRp(r.totalBunga ?? 0)}</b></span>
                </div>
              </div>
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#64748b', fontWeight: 700, marginBottom: 8 }}>Potongan di Muka</div>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <tbody>
                    {row(`Asuransi Jiwa (${s.asuransi_provider === 'alamin' ? 'Al-Amin' : 'Pialang'})`, fmtRp(asuransiJiwa))}
                    {row('Asuransi Kredit (Pialang)', fmtRp(premiKredit))}
                    {row('Provisi', fmtRp(r.provisi ?? 0))}
                    {row('Notaris', fmtRp(r.notaris ?? s.biaya_notaris))}
                    {row('Perikatan', fmtRp(r.perikatan ?? s.biaya_perikatan))}
                    {row('Blokir Angsuran', fmtRp(r.blokir ?? 0))}
                    {row('Total Potongan', fmtRp(r.total ?? 0), true)}
                  </tbody>
                </table>
              </div>
              {s.ada_pelunasan && totalPelunasan > 0 && (
                <div style={{ marginTop: 20, padding: 16, background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 10 }}>
                  <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: '#92400e', fontWeight: 700, marginBottom: 6 }}>Top Up / Pelunasan</div>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <tbody>
                      {row('Outstanding Pokok', fmtRp(outPokok))}
                      {row('Bunga Berjalan', fmtRp(outBunga))}
                      {row('Total Pelunasan', fmtRp(totalPelunasan), true)}
                    </tbody>
                  </table>
                </div>
              )}
              <div style={{ marginTop: 20, padding: 18, background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.5, opacity: 0.9 }}>Dana Diterima</div>
                  <div style={{ fontSize: 28, fontWeight: 800, marginTop: 2 }}>{fmtRp(danaDiterima)}</div>
                </div>
                <div style={{ fontSize: 40 }}>💰</div>
              </div>
              <div style={{ marginTop: 20, paddingTop: 14, borderTop: '1px solid #e2e8f0', fontSize: 11, color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
                <span>Simulasi · bukan dokumen perjanjian. Nilai dapat berubah sewaktu-waktu.</span>
                <span>{new Date(s.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} · AO: {s.nama_ao || '-'}</span>
              </div>
            </div>
          );
        })()}
      </div>
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
