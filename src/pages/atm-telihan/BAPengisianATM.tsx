import React, { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { PengisianATM, ATMConfig, KartuTertelan, SelisihATM } from '@/types';
import { getPengisianATM, getATMConfig, getKartuTertelan, getSelisihATM, angkaTerbilang, formatRupiah } from '@/lib/atm-store';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { FileText, Printer, Download } from 'lucide-react';

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
        <title>BA Pengisian ATM - ${selectedData?.nomor}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', serif; font-size: 11pt; padding: 20mm; }
          .header { text-align: center; margin-bottom: 20px; }
          .header h1 { font-size: 14pt; font-weight: bold; margin-bottom: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          table.bordered td, table.bordered th { border: 1px solid #000; padding: 4px 8px; }
          .section-title { font-weight: bold; margin: 15px 0 10px; }
          .signature-section { margin-top: 40px; }
          .signature-row { display: flex; justify-content: space-between; margin-top: 60px; }
          .signature-box { text-align: center; width: 45%; }
          .signature-line { border-top: 1px solid #000; margin-top: 50px; padding-top: 5px; }
          @media print { body { padding: 15mm; } }
        </style>
      </head>
      <body>
        ${printRef.current.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Preview Berita Acara</CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={printRef} className="bg-white p-8 text-black text-sm" style={{ fontFamily: "'Times New Roman', serif" }}>
                {/* Header */}
                <div className="text-center mb-6">
                  <p className="text-xs mb-1">ATM-132-01</p>
                  <h1 className="text-base font-bold">BERITA ACARA KAS ATM, DISKET MUTASI TRANSAKSI ATM,</h1>
                  <h1 className="text-base font-bold">STRUK ATM DAN KARTU TERTELAN</h1>
                </div>

                {/* Section A */}
                <div className="mb-6">
                  <p className="font-bold mb-3">A. KAS ATM</p>
                  <p className="mb-4 text-justify leading-relaxed">
                    Pada hari ini {selectedData.hari} Tanggal {format(selectedData.tanggal, 'dd MMMM yyyy', { locale: id })} Jam {selectedData.jam}, 
                    kami yang bertanda tangan di bawah ini telah melakukan cash opname pada mesin ATM di KTM15401 
                    dan selanjutnya mengisi/menambah uang pada mesin ATM tersebut
                  </p>
                  <p className="mb-3">
                    Sisa uang pada saat dilakukan cash opname, jumlah uang yang ditambahkan dan sisa terakhir 
                    saat selesai dilakukan cash opname adalah sebagai berikut:
                  </p>

                  <table className="w-full border-collapse border border-black mb-4">
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border border-black p-2 text-left w-8">No.</th>
                        <th className="border border-black p-2 text-left">Rincian</th>
                        <th className="border border-black p-2 text-right">Jumlah Lembar</th>
                        <th className="border border-black p-2 text-right">Jumlah Nominal</th>
                        <th className="border border-black p-2 text-left">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black p-2">1</td>
                        <td className="border border-black p-2">SALDO BUKU BESAR</td>
                        <td className="border border-black p-2 text-right">{values.saldoLembar.toLocaleString()}</td>
                        <td className="border border-black p-2 text-right">{formatRupiah(selectedData.saldoBukuBesar)}</td>
                        <td className="border border-black p-2"></td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2">2</td>
                        <td className="border border-black p-2">JUMLAH SISA DALAM KASET</td>
                        <td className="border border-black p-2 text-right">{values.sisaTotal.toLocaleString()}</td>
                        <td className="border border-black p-2 text-right">{formatRupiah(values.sisaNominal)}</td>
                        <td className="border border-black p-2">{selectedData.notes}</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2">3</td>
                        <td className="border border-black p-2">JUMLAH UANG YANG DI TAMBAHKAN</td>
                        <td className="border border-black p-2 text-right">{values.tambahTotal.toLocaleString()}</td>
                        <td className="border border-black p-2 text-right">{formatRupiah(values.tambahNominal)}</td>
                        <td className="border border-black p-2"></td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2">4</td>
                        <td className="border border-black p-2">JUMLAH SELISIH LEBIH / KURANG</td>
                        <td className="border border-black p-2 text-right">{selectedData.jumlahSelisih > 0 ? Math.floor(selectedData.jumlahSelisih / 100000).toLocaleString() : '-'}</td>
                        <td className="border border-black p-2 text-right">{selectedData.jumlahSelisih > 0 ? formatRupiah(selectedData.jumlahSelisih) : '-'}</td>
                        <td className="border border-black p-2">{selectedData.jumlahSelisih > 0 ? `SELISIH ${selectedData.keteranganSelisih}` : '-'}</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2">5</td>
                        <td className="border border-black p-2">JUMLAH YANG DI SETOR KE TELLER</td>
                        <td className="border border-black p-2 text-right">{selectedData.jumlahDisetor > 0 ? Math.floor(selectedData.jumlahDisetor / 100000).toLocaleString() : '-'}</td>
                        <td className="border border-black p-2 text-right">{selectedData.jumlahDisetor > 0 ? formatRupiah(selectedData.jumlahDisetor) : '-'}</td>
                        <td className="border border-black p-2">{selectedData.jumlahDisetor > 0 ? `Disetor oleh ${selectedData.yangMenyerahkan} ke ${selectedData.namaTeller}` : '-'}</td>
                      </tr>
                      <tr>
                        <td className="border border-black p-2">6</td>
                        <td className="border border-black p-2">JUMLAH YANG DI SETOR KE REK TITIPAN ATM</td>
                        <td className="border border-black p-2 text-right">{selectedData.setorKeRekTitipan > 0 ? Math.floor(selectedData.setorKeRekTitipan / 100000).toLocaleString() : '-'}</td>
                        <td className="border border-black p-2 text-right">{selectedData.setorKeRekTitipan > 0 ? formatRupiah(selectedData.setorKeRekTitipan) : '-'}</td>
                        <td className="border border-black p-2">{selectedData.setorKeRekTitipan > 0 ? `Disetor oleh ${selectedData.yangMenyerahkan} ke ${selectedData.namaTeller}` : '-'}</td>
                      </tr>
                      <tr className="bg-gray-50 font-bold">
                        <td className="border border-black p-2">7</td>
                        <td className="border border-black p-2">POSISI KAS ATM SETELAH CASHOPNAME</td>
                        <td className="border border-black p-2 text-right">10,000</td>
                        <td className="border border-black p-2 text-right">{formatRupiah(values.posisiAkhir)}</td>
                        <td className="border border-black p-2">{angkaTerbilang(values.posisiAkhir).toUpperCase()} RUPIAH.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Section B */}
                <div className="mb-6">
                  <p className="font-bold mb-2">B. DISKET MUTASI TRANSAKSI ATM DAN STRUK ATM (Terlampir)</p>
                </div>

                {/* Section C */}
                <div className="mb-6">
                  <p className="font-bold mb-2">C. KARTU TERTELAN</p>
                  <p className="mb-3">
                    Disamping itu pada kotak kartu tertelan ditemukan {selectedData.kartuTertelan} ( {selectedData.terbilang} ) Buah Kartu sebagai berikut:
                  </p>
                  {kartuTertelan.length > 0 ? (
                    <table className="w-full border-collapse border border-black mb-4">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-black p-2 w-8">NO.</th>
                          <th className="border border-black p-2">NOMOR KARTU</th>
                          <th className="border border-black p-2">NAMA NASABAH</th>
                          <th className="border border-black p-2">BANK</th>
                        </tr>
                      </thead>
                      <tbody>
                        {kartuTertelan.map((kt, idx) => (
                          <tr key={kt.id}>
                            <td className="border border-black p-2 text-center">{idx + 1}</td>
                            <td className="border border-black p-2">{kt.nomorKartu}</td>
                            <td className="border border-black p-2">{kt.namaNasabah || '-'}</td>
                            <td className="border border-black p-2">{kt.bank}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="italic text-gray-500 mb-4">Tidak ada kartu tertelan.</p>
                  )}
                </div>

                {/* Section D */}
                <div className="mb-8">
                  <p className="font-bold mb-2">D. SELISIH</p>
                  {selisihList.length > 0 ? (
                    <table className="w-full border-collapse border border-black mb-4">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="border border-black p-2 w-8">NO.</th>
                          <th className="border border-black p-2">TANGGAL</th>
                          <th className="border border-black p-2">NO REFF</th>
                          <th className="border border-black p-2">NOMINAL</th>
                          <th className="border border-black p-2">KETERANGAN</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selisihList.map((sl, idx) => (
                          <tr key={sl.id}>
                            <td className="border border-black p-2 text-center">{idx + 1}</td>
                            <td className="border border-black p-2">{format(sl.tanggal, 'dd MMM yyyy')}</td>
                            <td className="border border-black p-2">{sl.noReff || '-'}</td>
                            <td className="border border-black p-2 text-right">{formatRupiah(sl.nominal)}</td>
                            <td className="border border-black p-2">{sl.keterangan || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="italic text-gray-500 mb-4">Tidak ada selisih.</p>
                  )}
                </div>

                {/* Signature */}
                <div className="mb-4">
                  <p>Demikian Berita Acara ini dibuat dengan sebenarnya oleh :</p>
                </div>

                <div className="grid grid-cols-3 gap-8 mt-8">
                  <div className="text-center">
                    <p className="mb-16">Petugas ATM:</p>
                    <p className="font-bold border-t border-black pt-2">
                      {getPetugasATM()[0]?.nama || selectedData.yangMenyerahkan || '_________________'}
                    </p>
                    <p className="text-sm">PETUGAS ATM</p>
                  </div>
                  <div></div>
                  <div className="text-center">
                    <p className="mb-16">Mengetahui,</p>
                    <p className="font-bold border-t border-black pt-2">
                      {getPemimpinList()[0]?.nama || '_________________'}
                    </p>
                    <p className="text-sm">{getPemimpinList()[0]?.jabatan || 'Pemimpin KCP'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
