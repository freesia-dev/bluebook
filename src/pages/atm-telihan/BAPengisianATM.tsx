import React, { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { PengisianATM, ATMConfig, KartuTertelan, SelisihATM } from '@/types';
import { getPengisianATM, getATMConfig, getKartuTertelan, getSelisihATM, angkaTerbilang, formatRupiah, addKartuTertelan, deleteKartuTertelan } from '@/lib/atm-store';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { FileText, Printer, Plus, Trash2 } from 'lucide-react';
import logoBankaltimtara from '@/assets/logo-bankaltimtara.png';
import logoBpd from '@/assets/logo-bpd.png';

const BAPengisianATM = () => {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [data, setData] = useState<PengisianATM[]>([]);
  const [configOptions, setConfigOptions] = useState<ATMConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedData, setSelectedData] = useState<PengisianATM | null>(null);
  const [kartuTertelan, setKartuTertelan] = useState<KartuTertelan[]>([]);
  const [selisihList, setSelisihList] = useState<SelisihATM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // New kartu tertelan form
  const [newKartuNomor, setNewKartuNomor] = useState('');
  const [newKartuNama, setNewKartuNama] = useState('');
  const [newKartuBank, setNewKartuBank] = useState('BANKALTIMTARA');
  const [isAddingKartu, setIsAddingKartu] = useState(false);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const [pengisianResult, configResult] = await Promise.all([
          getPengisianATM(),
          getATMConfig()
        ]);
        console.log('BA Page - Pengisian data loaded:', pengisianResult.length, 'items');
        console.log('BA Page - Config loaded:', configResult.length, 'items');
        setData(pengisianResult);
        setConfigOptions(configResult.filter(c => c.isActive));
      } catch (error) {
        console.error('BA Page - Error loading data:', error);
        toast({ title: 'Error', description: 'Gagal memuat data', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    initData();
  }, [toast]);

  useEffect(() => {
    if (selectedId) {
      const item = data.find(d => d.id === selectedId);
      setSelectedData(item || null);
      if (item) {
        loadDetails(item.id);
      }
    } else {
      setSelectedData(null);
      setKartuTertelan([]);
      setSelisihList([]);
    }
  }, [selectedId, data]);

  const loadData = async () => {
    try {
      const result = await getPengisianATM();
      console.log('BA Page - Refresh data:', result.length, 'items');
      setData(result);
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal memuat data', variant: 'destructive' });
    }
  };

  // loadConfig is now part of initData above

  const loadDetails = async (atmId: string) => {
    try {
      const [kt, sl] = await Promise.all([
        getKartuTertelan(atmId),
        getSelisihATM(atmId)
      ]);
      setKartuTertelan(kt);
      setSelisihList(sl);
    } catch (error) {
      console.error('Failed to load details:', error);
    }
  };

  const handleAddKartuTertelan = async () => {
    if (!selectedData || !newKartuNomor.trim()) {
      toast({ title: 'Error', description: 'Nomor kartu wajib diisi', variant: 'destructive' });
      return;
    }
    
    setIsAddingKartu(true);
    try {
      await addKartuTertelan({
        pengisianAtmId: selectedData.id,
        nomorKartu: newKartuNomor.trim(),
        namaNasabah: newKartuNama.trim() || undefined,
        bank: newKartuBank
      });
      
      // Refresh kartu tertelan list
      await loadDetails(selectedData.id);
      
      // Reset form
      setNewKartuNomor('');
      setNewKartuNama('');
      setNewKartuBank('BANKALTIMTARA');
      
      toast({ title: 'Sukses', description: 'Kartu tertelan berhasil ditambahkan' });
    } catch (error) {
      console.error('Failed to add kartu tertelan:', error);
      toast({ title: 'Error', description: 'Gagal menambahkan kartu tertelan', variant: 'destructive' });
    } finally {
      setIsAddingKartu(false);
    }
  };

  const handleDeleteKartuTertelan = async (id: string) => {
    if (!selectedData) return;
    
    try {
      await deleteKartuTertelan(id);
      await loadDetails(selectedData.id);
      toast({ title: 'Sukses', description: 'Kartu tertelan berhasil dihapus' });
    } catch (error) {
      console.error('Failed to delete kartu tertelan:', error);
      toast({ title: 'Error', description: 'Gagal menghapus kartu tertelan', variant: 'destructive' });
    }
  };

  const getPemimpinList = () => configOptions.filter(c => c.jabatan.includes('PEMIMPIN'));
  const getPetugasATM = () => configOptions.filter(c => c.jabatan === 'PETUGAS ATM');

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast({ title: 'Error', description: 'Popup blocker aktif. Izinkan popup untuk mencetak.', variant: 'destructive' });
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>BA Pengisian ATM - ATM-143-01</title>
        <style>
          @page { 
            size: A4; 
            margin: 15mm 20mm; 
          }
          * { 
            margin: 0; 
            padding: 0; 
            box-sizing: border-box; 
          }
          body { 
            font-family: 'Times New Roman', Times, serif; 
            font-size: 11pt; 
            line-height: 1.3;
            color: #000;
          }
          .ba-container {
            max-width: 210mm;
            margin: 0 auto;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
          }
          .logo-left, .logo-right {
            width: 100px;
          }
          .logo-left img, .logo-right img {
            max-width: 100%;
            height: auto;
          }
          .header-center {
            flex: 1;
            text-align: center;
            padding: 0 15px;
          }
          .header-center .company {
            font-size: 12pt;
            font-weight: bold;
          }
          .header-center .branch {
            font-size: 10pt;
            font-weight: bold;
            color: #0066cc;
            text-decoration: underline;
          }
          .header-center .address {
            font-size: 9pt;
          }
          .header-divider {
            border-bottom: 2px solid #000;
            margin: 8px 0 15px;
          }
          .doc-code {
            font-size: 10pt;
            margin-bottom: 10px;
          }
          .doc-title {
            font-size: 13pt;
            font-weight: bold;
            text-align: left;
            margin-bottom: 15px;
          }
          .section-label {
            font-weight: bold;
            margin: 12px 0 6px;
          }
          .section-text {
            text-align: justify;
            margin-bottom: 8px;
          }
          table.data-table {
            width: 100%;
            border-collapse: collapse;
            margin: 8px 0 12px;
            font-size: 10pt;
          }
          table.data-table th,
          table.data-table td {
            border: 1px solid #000;
            padding: 4px 6px;
            vertical-align: top;
          }
          table.data-table th {
            background: #f5f5f5;
            font-weight: bold;
            text-align: center;
          }
          table.data-table td.text-right {
            text-align: right;
          }
          table.data-table td.text-center {
            text-align: center;
          }
          .no-selisih {
            font-style: normal;
          }
          .signature-section {
            margin-top: 25px;
          }
          .signature-text {
            margin-bottom: 15px;
          }
          .signature-grid {
            display: flex;
            justify-content: space-between;
          }
          .signature-box {
            width: 45%;
          }
          .signature-box .label {
            margin-bottom: 60px;
          }
          .signature-box .name {
            font-weight: bold;
            text-transform: uppercase;
          }
          .signature-box .position {
            font-size: 10pt;
            text-transform: uppercase;
          }
          @media print {
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        ${printRef.current.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  // Calculate values
  const calculateValues = () => {
    if (!selectedData) return null;
    
    const sisaTotal = selectedData.sisaCartridge1 + selectedData.sisaCartridge2 + 
                      selectedData.sisaCartridge3 + selectedData.sisaCartridge4;
    const tambahTotal = selectedData.tambahCartridge1 + selectedData.tambahCartridge2 + 
                        selectedData.tambahCartridge3 + selectedData.tambahCartridge4;
    const saldoLembar = Math.floor(selectedData.saldoBukuBesar / 100000);
    const sisaNominal = sisaTotal * 100000;
    const tambahNominal = tambahTotal * 100000;
    const posisiAkhir = tambahNominal; // Assuming 1B refill
    
    return {
      sisaTotal,
      tambahTotal,
      saldoLembar,
      sisaNominal,
      tambahNominal,
      posisiAkhir: 1000000000, // Default 1 Milyar
    };
  };

  const values = calculateValues();

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="BA Pengisian ATM"
          description="Generate Berita Acara Pengisian ATM"
        />

        {/* Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pilih Data Pengisian ATM</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Memuat data...</span>
              </div>
            ) : data.length === 0 ? (
              <div className="text-muted-foreground">
                Belum ada data pengisian ATM. Silakan tambah data di halaman Database Pengisian ATM.
              </div>
            ) : (
              <div className="flex items-end gap-4">
                <div className="flex-1 max-w-md">
                  <Label className="mb-2 block">Data Pengisian ATM ({data.length} data)</Label>
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih data pengisian ATM..." />
                    </SelectTrigger>
                    <SelectContent>
                      {data.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          No. {item.nomor} - {format(item.tanggal, 'dd MMM yyyy', { locale: id })} - {formatRupiah(item.saldoBukuBesar)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {selectedData && (
                  <Button onClick={handlePrint} className="gap-2">
                    <Printer className="w-4 h-4" />
                    Cetak BA
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        {selectedData && values && (
          <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Preview Berita Acara</CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={printRef} className="bg-white p-6 text-black" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '11pt', lineHeight: '1.3' }}>
                <div className="ba-container">
                  {/* Header - matching PDF layout */}
                  <div className="header-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div className="logo-left" style={{ width: '120px' }}>
                      <img src={logoBankaltimtara} alt="Bankaltimtara" style={{ maxWidth: '100%', height: 'auto' }} />
                    </div>
                    <div className="header-center" style={{ flex: 1, textAlign: 'center', padding: '0 15px' }}>
                      <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>PT. BPD Kaltim Kaltara</div>
                      <div style={{ fontSize: '10pt', fontWeight: 'bold', color: '#0066cc', textDecoration: 'underline' }}>KANTOR CABANG PEMBANTU TELIHAN</div>
                      <div style={{ fontSize: '9pt' }}>Jl.Letjend S.Parman No.14-15 – Kota Bontang 75383</div>
                      <div style={{ fontSize: '9pt' }}>Telp: 0548 - 26567</div>
                      <div style={{ fontSize: '9pt' }}>Email:<span style={{ color: '#0066cc', textDecoration: 'underline' }}>kcp.telihan@bankaltimtara.co.id</span></div>
                      <div style={{ fontSize: '9pt' }}>www.bankaltimtara.co.id</div>
                    </div>
                    <div className="logo-right" style={{ width: '100px', textAlign: 'right' }}>
                      <img src={logoBpd} alt="BPD" style={{ maxWidth: '100%', height: 'auto' }} />
                    </div>
                  </div>
                  <div style={{ borderBottom: '2px solid #000', margin: '8px 0 15px' }}></div>

                  {/* Document Code and Title */}
                  <div style={{ fontSize: '10pt', marginBottom: '10px' }}>ATM-143-01</div>
                  <div style={{ fontSize: '13pt', fontWeight: 'bold', textAlign: 'left', marginBottom: '15px' }}>
                    BERITA ACARA KAS ATM, DISKET MUTASI TRANSAKSI ATM,<br />
                    STRUK ATM DAN KARTU TERTELAN
                  </div>

                  {/* Section A: KAS ATM */}
                  <div style={{ fontWeight: 'bold', margin: '12px 0 6px' }}>A. KAS ATM</div>
                  <div style={{ textAlign: 'justify', marginBottom: '8px' }}>
                    Pada hari ini {selectedData.hari.toUpperCase()} Tanggal {format(selectedData.tanggal, 'dd MMMM yyyy', { locale: id })} Jam {selectedData.jam}, kami yang bertanda tangan di bawah ini telah melakukan cash opname pada mesin ATM di KTM14301 dan selanjutnya mengisi/menambah uang pada mesin ATM tersebut.
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    Sisa uang pada saat dilakukan cash opname, jumlah uang yang ditambahkan dan sisa terakhir saat selesai dilakukan cash opname adalah sebagai berikut:
                  </div>

                  {/* Data Table - Section A */}
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0 12px', fontSize: '10pt' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center', width: '30px' }}>No.</th>
                        <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'left' }}>Rincian</th>
                        <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center', width: '100px' }}>Jumlah Lembar</th>
                        <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center', width: '120px' }}>Jumlah Nominal</th>
                        <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'left' }}>Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>1</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}>SALDO BUKU BESAR</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{values.saldoLembar.toLocaleString('id-ID')}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>Rp {selectedData.saldoBukuBesar.toLocaleString('id-ID')}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}></td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>2</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}>JUMLAH SISA DALAM KASET</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{values.sisaTotal.toLocaleString('id-ID')}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>Rp {values.sisaNominal.toLocaleString('id-ID')}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}>ATM={values.saldoLembar} FISIK={values.sisaTotal}</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>3</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}>JUMLAH UANG YANG DI TAMBAHKAN</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{values.tambahTotal.toLocaleString('id-ID')}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>Rp {values.tambahNominal.toLocaleString('id-ID')}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}></td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>4</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}>JUMLAH SELISIH LEBIH / KURANG</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{Math.abs(selectedData.jumlahSelisih) > 0 ? Math.floor(Math.abs(selectedData.jumlahSelisih) / 100000).toLocaleString('id-ID') : '-'}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{Math.abs(selectedData.jumlahSelisih) > 0 ? `Rp ${Math.abs(selectedData.jumlahSelisih).toLocaleString('id-ID')}` : '-'}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{selectedData.jumlahSelisih !== 0 ? `SELISIH ${selectedData.keteranganSelisih}` : '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>5</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}>JUMLAH YANG DI SETOR KE TELLER</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{selectedData.jumlahDisetor > 0 ? Math.floor(selectedData.jumlahDisetor / 100000).toLocaleString('id-ID') : '-'}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{selectedData.jumlahDisetor > 0 ? `Rp ${selectedData.jumlahDisetor.toLocaleString('id-ID')}` : '-'}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{selectedData.jumlahDisetor > 0 && selectedData.yangMenyerahkan && selectedData.namaTeller ? `Disetor oleh ${selectedData.yangMenyerahkan} ke ${selectedData.namaTeller}` : '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>6</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}>JUMLAH YANG DI SETOR KE REK TITIPAN ATM</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{selectedData.setorKeRekTitipan > 0 ? Math.floor(selectedData.setorKeRekTitipan / 100000).toLocaleString('id-ID') : '-'}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{selectedData.setorKeRekTitipan > 0 ? `Rp ${selectedData.setorKeRekTitipan.toLocaleString('id-ID')}` : '-'}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{selectedData.setorKeRekTitipan > 0 && selectedData.yangMenyerahkan && selectedData.namaTeller ? `Disetor oleh ${selectedData.yangMenyerahkan} ke ${selectedData.namaTeller}` : '-'}</td>
                      </tr>
                      <tr>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>7</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}>POSISI KAS ATM SETELAH CASHOPNAME</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>{(values.tambahTotal).toLocaleString('id-ID')}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>Rp {values.tambahNominal.toLocaleString('id-ID')}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold' }}>{angkaTerbilang(values.tambahNominal).toUpperCase()} RUPIAH.</td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Section B: DISKET */}
                  <div style={{ fontWeight: 'bold', margin: '12px 0 6px' }}>B. DISKET MUTASI TRANSAKSI ATM DAN STRUK ATM (Terlampir)</div>

                  {/* Section C: KARTU TERTELAN */}
                  <div style={{ fontWeight: 'bold', margin: '12px 0 6px' }}>C. KARTU TERTELAN</div>
                  <div style={{ marginBottom: '8px' }}>
                    Disamping itu pada kotak kartu tertelan ditemukan {kartuTertelan.length} ( {kartuTertelan.length === 0 ? 'Nol' : angkaTerbilang(kartuTertelan.length)} ) Buah Kartu sebagai berikut:
                  </div>

                  {kartuTertelan.length > 0 ? (
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0 12px', fontSize: '10pt' }}>
                      <thead>
                        <tr>
                          <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center', width: '40px' }}>NO.</th>
                          <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>NOMOR KARTU</th>
                          <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>NAMA NASABAH</th>
                          <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>BANK</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kartuTertelan.map((kt, idx) => (
                          <tr key={kt.id}>
                            <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{kt.nomorKartu}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{kt.namaNasabah || '-'}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{kt.bank}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : null}

                  {/* Section D: SELISIH */}
                  <div style={{ fontWeight: 'bold', margin: '12px 0 6px' }}>D. SELISIH</div>
                  {selisihList.length > 0 ? (
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0 12px', fontSize: '10pt' }}>
                      <thead>
                        <tr>
                          <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center', width: '40px' }}>NO.</th>
                          <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>TANGGAL</th>
                          <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>NO REFF</th>
                          <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>NOMINAL</th>
                          <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>KETERANGAN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selisihList.map((sl, idx) => (
                          <tr key={sl.id}>
                            <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{format(sl.tanggal, 'dd MMMM yyyy', { locale: id })}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{sl.noReff || '-'}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>Rp {sl.nominal.toLocaleString('id-ID')}</td>
                            <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{sl.keterangan || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ marginBottom: '8px' }}>Tidak ada selisih.</div>
                  )}

                  {/* Signature Section */}
                  <div style={{ marginTop: '25px' }}>
                    <div style={{ marginBottom: '15px' }}>Demikian Berita Acara ini dibuat dengan sebenarnya oleh :</div>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ width: '30%', textAlign: 'center' }}>
                        <div style={{ marginBottom: '8px' }}>Staff KCP,</div>
                        <div style={{ marginBottom: '60px' }}></div>
                        <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                          {configOptions.find(c => c.jabatan === 'STAFF KCP')?.nama || '................................'}
                        </div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>STAFF KCP</div>
                      </div>
                      <div style={{ width: '30%', textAlign: 'center' }}>
                        <div style={{ marginBottom: '8px' }}>Teller,</div>
                        <div style={{ marginBottom: '60px' }}></div>
                        <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                          {configOptions.find(c => c.jabatan === 'TELLER')?.nama || '................................'}
                        </div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>TELLER</div>
                      </div>
                      <div style={{ width: '30%', textAlign: 'center' }}>
                        <div style={{ marginBottom: '8px' }}>Mengetahui,</div>
                        <div style={{ marginBottom: '60px' }}></div>
                        <div style={{ borderTop: '1px solid #000', paddingTop: '4px' }}>
                          {getPemimpinList()[0]?.nama || '................................'}
                        </div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>PIMPINAN</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Kartu Tertelan Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Edit Data Kartu Tertelan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Cards */}
              {kartuTertelan.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Kartu Tertelan Saat Ini</Label>
                  <div className="space-y-2">
                    {kartuTertelan.map((kt, idx) => (
                      <div key={kt.id} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm font-medium w-6">{idx + 1}.</span>
                        <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                          <span>{kt.nomorKartu}</span>
                          <span>{kt.namaNasabah || '-'}</span>
                          <span>{kt.bank}</span>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteKartuTertelan(kt.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add New Card Form */}
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium">Tambah Kartu Tertelan Baru</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nomor Kartu *</Label>
                    <Input
                      placeholder="Nomor kartu..."
                      value={newKartuNomor}
                      onChange={(e) => setNewKartuNomor(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Nama Nasabah</Label>
                    <Input
                      placeholder="Nama nasabah (opsional)..."
                      value={newKartuNama}
                      onChange={(e) => setNewKartuNama(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bank</Label>
                    <Select value={newKartuBank} onValueChange={setNewKartuBank}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BANKALTIMTARA">BANKALTIMTARA</SelectItem>
                        <SelectItem value="BRI">BRI</SelectItem>
                        <SelectItem value="BNI">BNI</SelectItem>
                        <SelectItem value="MANDIRI">MANDIRI</SelectItem>
                        <SelectItem value="BCA">BCA</SelectItem>
                        <SelectItem value="LAINNYA">LAINNYA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button 
                  onClick={handleAddKartuTertelan} 
                  disabled={isAddingKartu || !newKartuNomor.trim()}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {isAddingKartu ? 'Menyimpan...' : 'Tambah Kartu'}
                </Button>
              </div>
            </CardContent>
          </Card>
          </>
        )}

        {!selectedData && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Pilih data pengisian ATM untuk melihat preview Berita Acara</p>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default BAPengisianATM;
