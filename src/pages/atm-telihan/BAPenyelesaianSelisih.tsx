import React, { useState, useEffect, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { PenyelesaianSelisih, SelisihATM } from '@/types';
import { getPenyelesaianSelisih, getSelisihByPenyelesaianId, generateBANumber } from '@/lib/penyelesaian-store';
import { formatRupiah } from '@/lib/atm-store';
import { getATMConfig } from '@/lib/atm-store';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Printer } from 'lucide-react';
import logoBankaltimtara from '@/assets/logo-bankaltimtara.png';
import logoBpd from '@/assets/logo-bpd.png';
import { useSearchParams } from 'react-router-dom';

const BAPenyelesaianSelisih = () => {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  const [searchParams] = useSearchParams();
  
  const [data, setData] = useState<PenyelesaianSelisih[]>([]);
  const [selectedId, setSelectedId] = useState<string>(searchParams.get('id') || '');
  const [selectedData, setSelectedData] = useState<PenyelesaianSelisih | null>(null);
  const [linkedSelisih, setLinkedSelisih] = useState<SelisihATM[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initData = async () => {
      setIsLoading(true);
      try {
        const result = await getPenyelesaianSelisih();
        setData(result);
      } catch (error) {
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
        loadSelisih(item.id);
      }
    } else {
      setSelectedData(null);
      setLinkedSelisih([]);
    }
  }, [selectedId, data]);

  const loadSelisih = async (penyelesaianId: string) => {
    try {
      const result = await getSelisihByPenyelesaianId(penyelesaianId);
      setLinkedSelisih(result);
    } catch (error) {
      console.error('Failed to load selisih:', error);
    }
  };

  const totalNominal = linkedSelisih.reduce((sum, s) => sum + s.nominal, 0);

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
        <title>BA Penyelesaian Selisih ATM</title>
        <style>
          @page { size: A4; margin: 15mm 20mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.4; color: #000; }
          .ba-container { max-width: 210mm; margin: 0 auto; }
          table.data-table { width: 100%; border-collapse: collapse; margin: 8px 0 12px; font-size: 10pt; }
          table.data-table th, table.data-table td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
          table.data-table th { background: #f5f5f5; font-weight: bold; text-align: center; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>${printRef.current.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="BA Penyelesaian Selisih"
          description="Generate Berita Acara Penyelesaian Selisih ATM"
        />

        {/* Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pilih Data Penyelesaian</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span>Memuat data...</span>
              </div>
            ) : data.length === 0 ? (
              <div className="text-muted-foreground">
                Belum ada data penyelesaian selisih.
              </div>
            ) : (
              <div className="flex items-end gap-4">
                <div className="flex-1 max-w-md">
                  <Label className="mb-2 block">Penyelesaian Selisih ({data.length} data)</Label>
                  <Select value={selectedId} onValueChange={setSelectedId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih penyelesaian..." />
                    </SelectTrigger>
                    <SelectContent>
                      {data.map(item => (
                        <SelectItem key={item.id} value={item.id}>
                          {generateBANumber(item.nomor, item.tanggalPengaduan)} - {item.status}
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
        {selectedData && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview Berita Acara</CardTitle>
            </CardHeader>
            <CardContent>
              <div ref={printRef} className="bg-white p-6 text-black" style={{ fontFamily: "'Times New Roman', Times, serif", fontSize: '11pt', lineHeight: '1.4' }}>
                <div className="ba-container">
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ width: '120px' }}>
                      <img src={logoBankaltimtara} alt="Bankaltimtara" style={{ maxWidth: '100%', height: 'auto' }} />
                    </div>
                    <div style={{ flex: 1, textAlign: 'center', padding: '0 15px' }}>
                      <div style={{ fontSize: '12pt', fontWeight: 'bold' }}>PT. BPD Kaltim Kaltara</div>
                      <div style={{ fontSize: '10pt', fontWeight: 'bold', color: '#0066cc', textDecoration: 'underline' }}>KANTOR CABANG PEMBANTU TELIHAN</div>
                      <div style={{ fontSize: '9pt' }}>Jl.Letjend S.Parman No.14-15 – Kota Bontang 75383</div>
                      <div style={{ fontSize: '9pt' }}>Telp: 0548 - 26567</div>
                      <div style={{ fontSize: '9pt' }}>Email:<span style={{ color: '#0066cc', textDecoration: 'underline' }}>kcp.telihan@bankaltimtara.co.id</span></div>
                      <div style={{ fontSize: '9pt' }}>www.bankaltimtara.co.id</div>
                    </div>
                    <div style={{ width: '100px', textAlign: 'right' }}>
                      <img src={logoBpd} alt="BPD" style={{ maxWidth: '100%', height: 'auto' }} />
                    </div>
                  </div>
                  <div style={{ borderBottom: '2px solid #000', margin: '8px 0 15px' }}></div>

                  {/* Document Title */}
                  <div style={{ fontSize: '10pt', marginBottom: '10px' }}>
                    No: {generateBANumber(selectedData.nomor, selectedData.tanggalPengaduan)}
                  </div>
                  <div style={{ fontSize: '13pt', fontWeight: 'bold', textAlign: 'center', marginBottom: '15px' }}>
                    BERITA ACARA PENYELESAIAN SELISIH ATM
                  </div>

                  {/* Opening */}
                  <div style={{ textAlign: 'justify', marginBottom: '12px' }}>
                    Pada hari ini {selectedData.tanggalPenyelesaian 
                      ? format(selectedData.tanggalPenyelesaian, 'EEEE', { locale: idLocale }).toUpperCase()
                      : format(selectedData.tanggalPengaduan, 'EEEE', { locale: idLocale }).toUpperCase()
                    } Tanggal {format(
                      selectedData.tanggalPenyelesaian || selectedData.tanggalPengaduan, 
                      'dd MMMM yyyy', 
                      { locale: idLocale }
                    )}, telah dilakukan penyelesaian selisih ATM di KCP Telihan dengan rincian sebagai berikut:
                  </div>

                  {/* Table Selisih */}
                  <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', margin: '8px 0 12px', fontSize: '10pt' }}>
                    <thead>
                      <tr>
                        <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center', width: '30px' }}>No.</th>
                        <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>Tanggal Selisih</th>
                        <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center', width: '150px' }}>Nominal</th>
                        <th style={{ border: '1px solid #000', padding: '4px 6px', background: '#f5f5f5', fontWeight: 'bold', textAlign: 'center' }}>Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {linkedSelisih.map((s, idx) => (
                        <tr key={s.id}>
                          <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>{idx + 1}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'center' }}>{format(s.tanggal, 'dd MMMM yyyy', { locale: idLocale })}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right' }}>Rp {s.nominal.toLocaleString('id-ID')}</td>
                          <td style={{ border: '1px solid #000', padding: '4px 6px' }}>{s.keterangan || '-'}</td>
                        </tr>
                      ))}
                      <tr>
                        <td colSpan={2} style={{ border: '1px solid #000', padding: '4px 6px', fontWeight: 'bold', textAlign: 'center' }}>Total</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px', textAlign: 'right', fontWeight: 'bold' }}>Rp {totalNominal.toLocaleString('id-ID')}</td>
                        <td style={{ border: '1px solid #000', padding: '4px 6px' }}></td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Detail Penyelesaian */}
                  <div style={{ marginTop: '12px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '6px' }}>Detail Penyelesaian:</div>
                    <table style={{ fontSize: '10pt', marginBottom: '8px' }}>
                      <tbody>
                        <tr>
                          <td style={{ padding: '2px 0', width: '180px' }}>Tanggal Pengaduan</td>
                          <td style={{ padding: '2px 0', width: '10px' }}>:</td>
                          <td style={{ padding: '2px 0' }}>{format(selectedData.tanggalPengaduan, 'dd MMMM yyyy', { locale: idLocale })}</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '2px 0' }}>Tanggal Penyelesaian</td>
                          <td style={{ padding: '2px 0' }}>:</td>
                          <td style={{ padding: '2px 0' }}>
                            {selectedData.tanggalPenyelesaian 
                              ? format(selectedData.tanggalPenyelesaian, 'dd MMMM yyyy', { locale: idLocale })
                              : '-'
                            }
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '2px 0' }}>Durasi Penyelesaian</td>
                          <td style={{ padding: '2px 0' }}>:</td>
                          <td style={{ padding: '2px 0' }}>
                            {selectedData.tanggalPenyelesaian 
                              ? `${Math.ceil((selectedData.tanggalPenyelesaian.getTime() - selectedData.tanggalPengaduan.getTime()) / (1000 * 60 * 60 * 24))} hari`
                              : '-'
                            }
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Catatan */}
                  {selectedData.catatan && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Catatan Penyelesaian:</div>
                      <div style={{ textAlign: 'justify', padding: '4px 0' }}>{selectedData.catatan}</div>
                    </div>
                  )}

                  {/* Closing */}
                  <div style={{ marginTop: '15px', textAlign: 'justify' }}>
                    Demikian Berita Acara ini dibuat untuk digunakan sebagaimana mestinya.
                  </div>

                  {/* Signatures - 3 columns */}
                  <div style={{ marginTop: '30px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div style={{ width: '30%', textAlign: 'center' }}>
                        <div style={{ marginBottom: '60px' }}>Petugas ATM,</div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedData.petugas}</div>
                        <div style={{ fontSize: '10pt', textTransform: 'uppercase' }}>STAFF KCP</div>
                      </div>
                      <div style={{ width: '30%', textAlign: 'center' }}>
                        <div style={{ marginBottom: '60px' }}>Teller,</div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedData.teller || '_______________'}</div>
                        <div style={{ fontSize: '10pt', textTransform: 'uppercase' }}>TELLER</div>
                      </div>
                      <div style={{ width: '30%', textAlign: 'center' }}>
                        <div style={{ marginBottom: '60px' }}>Pemimpin KCP,</div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase' }}>{selectedData.pemimpin || '_______________'}</div>
                        <div style={{ fontSize: '10pt', textTransform: 'uppercase' }}>PEMIMPIN KCP</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
};

export default BAPenyelesaianSelisih;
