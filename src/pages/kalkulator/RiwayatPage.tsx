import React, { useRef, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLoanSimulations, useDeleteLoanSimulation, useUpdatePipelineStage, type LoanSimulationRow } from '@/hooks/use-loan-calc';
import { fmtRp, fmtNumber } from '@/lib/loan-calc';
import { Trash2, Eye, ArrowLeft, FileSpreadsheet, FileText, Pencil, Image as ImageIcon, Ban, Undo2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  CancelSimulationDialog,
  StageBadge,
  isCancelled,
  stageBeforeCancel,
} from '@/components/kalkulator/CancelSimulationDialog';
import { SimulasiCard, type SimulasiCardData } from '@/components/kalkulator/SimulasiCard';

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import logoBpd from '@/assets/logo-bankaltimtara.png';

const toNumber = (value: unknown, fallback = 0) => {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
};

const getCerdas = (s: LoanSimulationRow) => (s.hasil_ringkasan as any)?.cerdas ?? null;

const getCerdasLabel = (s: LoanSimulationRow) => {
  const cerdas = getCerdas(s);
  if (cerdas?.skemaLabel) return cerdas.skemaLabel;
  if (!s.cerdas_skema) return null;
  return String(s.cerdas_skema).replace(/_/g, ' ').toUpperCase();
};

const getInsuranceBreakdown = (s: LoanSimulationRow) => {
  const r: any = s.hasil_ringkasan || {};
  const cerdas = getCerdas(s);
  const premiKredit = toNumber(s.premi_kredit);
  const totalAsuransi = toNumber(r.asuransi, toNumber(s.asuransi_nominal, toNumber(s.asuransi_jiwa_beban) + premiKredit));
  const asuransiJiwaBeban = toNumber(s.asuransi_jiwa_beban, Math.max(totalAsuransi - premiKredit, 0));
  const subsidiBank = cerdas && cerdas.skema !== 'top_up'
    ? toNumber(cerdas.subsidiBank, toNumber(s.cerdas_subsidi_bank))
    : 0;
  const premiJiwaAktual = toNumber(cerdas?.premiAsuransiAktual, asuransiJiwaBeban + subsidiBank);

  return { premiJiwaAktual, subsidiBank, asuransiJiwaBeban, premiKredit, totalAsuransi };
};

const getBiayaList = (s: LoanSimulationRow): { label: string; nominal: number }[] => {
  const r: any = s.hasil_ringkasan || {};
  const fromResult: any[] = Array.isArray(r.biaya) ? r.biaya : [];
  const fromRow: any[] = Array.isArray((s as any).biaya_items) ? (s as any).biaya_items : [];
  const legacy = [
    { label: 'Biaya Notaris', nominal: toNumber(s.biaya_notaris) },
    { label: 'Biaya Perikatan', nominal: toNumber(s.biaya_perikatan) },
  ];
  const src = fromResult.length ? fromResult : fromRow.length ? fromRow : legacy;
  return src
    .map((b) => ({ label: String(b?.label || 'Biaya'), nominal: toNumber(b?.nominal) }))
    .filter((b) => b.nominal > 0);
};

const getPelunasanBreakdown = (s: LoanSimulationRow) => {
  const outPokok = toNumber(s.outstanding_pokok);
  const outBunga = toNumber(s.outstanding_bunga);
  return { outPokok, outBunga, totalPelunasan: outPokok + outBunga };
};

const exportRowToExcel = (s: LoanSimulationRow) => {
  const wb = XLSX.utils.book_new();
  const r = s.hasil_ringkasan || ({} as any);
  const cerdasLabel = getCerdasLabel(s);
  const cerdas = getCerdas(s);
  const ins = getInsuranceBreakdown(s);
  const pelunasan = getPelunasanBreakdown(s);
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
    ['Program CERDAS', cerdasLabel || '-'],
    ['Gaji Pokok', s.gaji_pokok ?? s.gaji ?? 0],
    ['TTP / Pendapatan Lainnya', s.ttp ?? 0],
    ['Total Penghasilan', s.gaji],
    ['Provisi', `${s.provisi_pct}%`],
    ['Sumber Asuransi Jiwa', s.asuransi_provider === 'alamin' ? "Al-Amin (AT TA'MIN UM)" : 'Pialang Asuransi'],
    ['Asuransi Jiwa — Premi Aktual', ins.premiJiwaAktual],
    ['Asuransi Jiwa — Subsidi Bank (CERDAS)', ins.subsidiBank],
    ['Asuransi Jiwa — Beban Debitur', ins.asuransiJiwaBeban],
    ['Asuransi Kredit — Pialang', ins.premiKredit],
    ['Total Asuransi Masuk Potongan', ins.totalAsuransi],
    ...getBiayaList(s).map((b) => [b.label, b.nominal] as [string, number]),
    ['Blokir Angsuran', s.blokir_angsuran],
    ['Nama AO', s.nama_ao || '-'],
    [],
    ['— RINGKASAN HASIL —'],
    ['Angsuran Pertama', r.angsuranPertama ?? 0],
    ['Angsuran Terakhir', r.angsuranTerakhir ?? 0],
    ['Total Angsuran', r.totalAngsuran ?? 0],
    ['Total Bunga', r.totalBunga ?? 0],
    ['Provisi', r.provisi ?? 0],
    ...getBiayaList(s).map((b) => [b.label, b.nominal] as [string, number]),
    ['Blokir Angsuran', r.blokir ?? 0],
    ['Total Potongan di Muka', r.total ?? 0],
    ['Dana Diterima', r.danaDiterima ?? 0],
  ];
  if (s.ada_pelunasan && pelunasan.totalPelunasan > 0) {
    ringkasan.push(
      [],
      ['— TOP UP / PELUNASAN —'],
      ['Outstanding Pokok', pelunasan.outPokok],
      ['Outstanding Bunga', pelunasan.outBunga],
      ['Total Pelunasan', pelunasan.totalPelunasan],
    );
  }
  if (cerdas) {
    ringkasan.push(
      [],
      ['— PROGRAM CERDAS —'],
      ['Skema', cerdasLabel || '-'],
      ['Cap Subsidi', toNumber(cerdas.capSubsidi, toNumber(s.cerdas_cap_subsidi))],
      ['Subsidi Bank', ins.subsidiBank],
      ['Beban Debitur', toNumber(cerdas.selisihDebitur, toNumber(s.cerdas_selisih_debitur))],
    );
  }
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
  const cerdasLabel = getCerdasLabel(s);
  const cerdas = getCerdas(s);
  const ins = getInsuranceBreakdown(s);
  const pelunasan = getPelunasanBreakdown(s);

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
      ['Instansi', ':', s.instansi || '-', 'Bunga p.a.', ':', `${s.bunga_pa}%${cerdasLabel ? ' (CERDAS)' : ''}`],
      ['Pilihan Karir', ':', s.pilihan_karir || '-', 'Gaji Pokok', ':', fmtRp(s.gaji_pokok ?? s.gaji ?? 0)],
      ['AO', ':', s.nama_ao || '-', 'TTP / Lainnya', ':', fmtRp(s.ttp ?? 0)],
      ['CERDAS', ':', cerdasLabel || '-', 'Total Penghasilan', ':', fmtRp(s.gaji)],
      ['', '', '', 'Provisi', ':', `${s.provisi_pct}%`],
    ],
    margin: { left: M, right: M },
  });

  let yy = (doc as any).lastAutoTable.finalY + 4;
  const summaryRows: any[] = [
    ['Angsuran Pertama', fmtNumber(r.angsuranPertama ?? 0)],
    ['Angsuran Terakhir', fmtNumber(r.angsuranTerakhir ?? 0)],
    ['Total Angsuran', fmtNumber(r.totalAngsuran ?? 0)],
    ['Total Bunga', fmtNumber(r.totalBunga ?? 0)],
    [`Asuransi Jiwa (${s.asuransi_provider === 'alamin' ? 'Al-Amin' : 'Pialang'})`, fmtNumber(ins.asuransiJiwaBeban)],
  ];
  if (cerdas && cerdas.skema !== 'top_up') {
    summaryRows.push(
      ['Premi Jiwa Aktual', fmtNumber(ins.premiJiwaAktual)],
      ['Subsidi Bank CERDAS', `(${fmtNumber(ins.subsidiBank)})`],
    );
  }
  summaryRows.push(
    ['Asuransi Kredit (Pialang)', fmtNumber(ins.premiKredit)],
    ['Total Asuransi Masuk Potongan', fmtNumber(ins.totalAsuransi)],
    ['Provisi', fmtNumber(r.provisi ?? 0)],
    ...getBiayaList(s).map((b) => [b.label, fmtNumber(b.nominal)]),
    ['Blokir Angsuran', fmtNumber(r.blokir ?? 0)],
    ['Total Potongan di Muka', fmtNumber(r.total ?? 0)],
  );
  if (s.ada_pelunasan && pelunasan.totalPelunasan > 0) {
    summaryRows.push(
      ['Outstanding Pokok', fmtNumber(pelunasan.outPokok)],
      ['Outstanding Bunga', fmtNumber(pelunasan.outBunga)],
      ['Total Pelunasan', fmtNumber(pelunasan.totalPelunasan)],
    );
  }
  summaryRows.push([
    { content: 'DANA DITERIMA DEBITUR', styles: { fontStyle: 'bold', fillColor: BRAND_ORANGE, textColor: 255 } },
    { content: fmtNumber(r.danaDiterima ?? 0), styles: { fontStyle: 'bold', fillColor: BRAND_ORANGE, textColor: 255, halign: 'right' } },
  ]);
  autoTable(doc, {
    startY: yy,
    head: [['Ringkasan', 'Nilai (Rp)']],
    body: summaryRows,
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
  const { canEdit, userName } = useAuth();
  const move = useUpdatePipelineStage();
  const [detail, setDetail] = useState<LoanSimulationRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<LoanSimulationRow | null>(null);
  const [jpgTarget, setJpgTarget] = useState<LoanSimulationRow | null>(null);
  const jpgRef = useRef<HTMLDivElement>(null);

  const handleCancel = (reason: string) => {
    if (!cancelTarget) return;
    move.mutate({ id: cancelTarget.id, stage: 'batal', note: reason, by: userName });
    toast({ title: 'Simulasi dibatalkan', description: `${cancelTarget.nama_debitur} — ${reason}` });
    setCancelTarget(null);
  };

  const handleUndoCancel = (s: LoanSimulationRow) => {
    const back = stageBeforeCancel(s);
    move.mutate({ id: s.id, stage: back, note: null, by: userName });
    toast({ title: 'Pembatalan dibatalkan', description: `${s.nama_debitur} dikembalikan ke tahap sebelumnya.` });
  };


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
                <TableHead>Status</TableHead>
                <TableHead>Dibuat oleh</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Memuat...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && data.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Belum ada simulasi tersimpan
                  </TableCell>
                </TableRow>
              )}
              {data.map((s) => (
                <TableRow key={s.id} className={isCancelled(s) ? 'opacity-70' : ''}>
                  <TableCell>{new Date(s.created_at).toLocaleDateString('id-ID')}</TableCell>
                  <TableCell className={`font-medium ${isCancelled(s) ? 'line-through' : ''}`}>{s.nama_debitur}</TableCell>
                  <TableCell>{s.product_nama || '-'}</TableCell>
                  <TableCell className="text-right">{fmtRp(s.plafon)}</TableCell>
                  <TableCell>{s.tenor_bulan} bln</TableCell>
                  <TableCell className="text-right">
                    {fmtRp(s.hasil_ringkasan?.angsuranPertama ?? 0)}
                  </TableCell>
                  <TableCell>
                    <StageBadge status={s.pipeline_status} note={s.pipeline_note} />
                    {isCancelled(s) && s.pipeline_note && (
                      <p className="text-[10px] text-muted-foreground mt-0.5 max-w-[160px] truncate" title={s.pipeline_note}>
                        {s.pipeline_note}
                      </p>
                    )}
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
                    {canEdit && (isCancelled(s) ? (
                      <Button size="icon" variant="ghost" onClick={() => handleUndoCancel(s)} title="Undo pembatalan">
                        <Undo2 className="w-4 h-4 text-emerald-600" />
                      </Button>
                    ) : (
                      <Button size="icon" variant="ghost" onClick={() => setCancelTarget(s)} title="Batalkan simulasi">
                        <Ban className="w-4 h-4 text-rose-500" />
                      </Button>
                    ))}
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

      <CancelSimulationDialog
        row={cancelTarget}
        onOpenChange={(o) => !o && setCancelTarget(null)}
        onConfirm={handleCancel}
      />



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
              <div className="rounded-xl border overflow-hidden bg-white">
                <div style={{ zoom: 0.82 }}>
                  <SimulasiCard data={rowToCardData(detail)} />
                </div>
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

      {/* Off-screen JPG card — memakai tema yang sama dengan pratinjau */}
      <div style={{ position: 'fixed', left: '-10000px', top: 0, pointerEvents: 'none' }}>
        {jpgTarget && <SimulasiCard ref={jpgRef} data={rowToCardData(jpgTarget)} />}
      </div>
    </MainLayout>
  );
};

export default RiwayatPage;

