import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { PengisianATM, ATMConfig, KartuTertelan, SelisihATM } from '@/types';
import { getPengisianATM, getATMConfig, getKartuTertelan, getSelisihATM, formatRupiah, addKartuTertelan, deleteKartuTertelan } from '@/lib/atm-store';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { FileText, Printer, Plus, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import BAPengisianDokumen from '@/components/atm/BAPengisianDokumen';

const BAPengisianContent = () => {
  const { toast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);
  
  const [data, setData] = useState<PengisianATM[]>([]);
  const [configOptions, setConfigOptions] = useState<ATMConfig[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedData, setSelectedData] = useState<PengisianATM | null>(null);
  const [kartuTertelan, setKartuTertelan] = useState<KartuTertelan[]>([]);
  const [selisihList, setSelisihList] = useState<SelisihATM[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Isian khusus berita acara (tidak ikut tersimpan — cukup untuk sekali cetak)
  const [nomorBA, setNomorBA] = useState('');
  const [petugasTerpilih, setPetugasTerpilih] = useState<string[]>([]);
  const [pemimpinTerpilih, setPemimpinTerpilih] = useState('');

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
        setData(pengisianResult);
        setConfigOptions(configResult.filter(c => c.isActive));
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
      if (item) loadDetails(item.id);
    } else {
      setSelectedData(null);
      setKartuTertelan([]);
      setSelisihList([]);
    }
  }, [selectedId, data]);

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
      await loadDetails(selectedData.id);
      setNewKartuNomor('');
      setNewKartuNama('');
      setNewKartuBank('BANKALTIMTARA');
      toast({ title: 'Sukses', description: 'Kartu tertelan berhasil ditambahkan' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menambahkan kartu tertelan', variant: 'destructive' });
    } finally {
      setIsAddingKartu(false);
    }
  };

  const handleDeleteKartuTertelan = async (ktId: string) => {
    if (!selectedData) return;
    try {
      await deleteKartuTertelan(ktId);
      await loadDetails(selectedData.id);
      toast({ title: 'Sukses', description: 'Kartu tertelan berhasil dihapus' });
    } catch (error) {
      toast({ title: 'Error', description: 'Gagal menghapus kartu tertelan', variant: 'destructive' });
    }
  };

  const getPemimpinList = () => configOptions.filter(c => c.jabatan.includes('PEMIMPIN'));

  // Petugas & pemimpin diisi otomatis dari data pengisian dan daftar pegawai,
  // tapi tetap boleh diubah sebelum dicetak.
  useEffect(() => {
    if (!selectedData) return;
    const bawaan = [selectedData.yangMenyerahkan, selectedData.namaTeller]
      .map(n => (n || '').trim())
      .filter(Boolean);
    setPetugasTerpilih(bawaan.length ? bawaan : configOptions
      .filter(c => ['STAFF KCP', 'TELLER'].some(j => c.jabatan.includes(j)))
      .slice(0, 2)
      .map(c => c.nama));
    setPemimpinTerpilih(prev => prev || getPemimpinList()[0]?.nama || '');
  }, [selectedData, configOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const togglePetugas = (nama: string) =>
    setPetugasTerpilih(prev => (prev.includes(nama) ? prev.filter(n => n !== nama) : [...prev, nama]));

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
        <title>Berita Acara Pengisian ATM</title>
        <style>
          /* Ukuran & margin mengikuti berkas Word acuan (A4, tepi 2,54 cm) */
          @page { size: A4; margin: 15mm 25mm 25mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Calibri, Carlito, 'Segoe UI', Arial, sans-serif;
            font-size: 12pt;
            line-height: 1.3;
            color: #000;
          }
          table { border-collapse: collapse; width: 100%; }
          td { vertical-align: top; }
          @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
        </style>
      </head>
      <body>${printRef.current.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  const calculateValues = () => {
    if (!selectedData) return null;
    const sisaTotal = selectedData.sisaCartridge1 + selectedData.sisaCartridge2 + 
                      selectedData.sisaCartridge3 + selectedData.sisaCartridge4;
    const tambahTotal = selectedData.tambahCartridge1 + selectedData.tambahCartridge2 + 
                        selectedData.tambahCartridge3 + selectedData.tambahCartridge4;
    const saldoLembar = Math.floor(selectedData.saldoBukuBesar / 100000);
    const sisaNominal = sisaTotal * 100000;
    const tambahNominal = tambahTotal * 100000;
    return { sisaTotal, tambahTotal, saldoLembar, sisaNominal, tambahNominal };
  };

  const values = calculateValues();

  return (
    <>
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
            <div className="text-muted-foreground">Belum ada data pengisian ATM.</div>
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
            <CardHeader>
              <CardTitle className="text-lg">Preview Berita Acara</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto bg-white p-6 text-black">
                <div ref={printRef} style={{ minWidth: '620px' }}>
                  <BAPengisianDokumen
                    data={selectedData}
                    kartuTertelan={kartuTertelan}
                    petugas={petugasTerpilih}
                    pemimpin={pemimpinTerpilih}
                    nomor={nomorBA}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Isian khusus berita acara */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Isian Berita Acara</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label className="mb-2 block">Nomor Berita Acara</Label>
                  <Input
                    value={nomorBA}
                    onChange={(e) => setNomorBA(e.target.value)}
                    placeholder="Kosongkan untuk titik-titik"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Mengetahui (Pemimpin)</Label>
                  <Select value={pemimpinTerpilih} onValueChange={setPemimpinTerpilih}>
                    <SelectTrigger><SelectValue placeholder="Pilih pemimpin..." /></SelectTrigger>
                    <SelectContent>
                      {getPemimpinList().map((c) => (
                        <SelectItem key={c.id} value={c.nama}>{c.nama}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label className="mb-2 block">Petugas Pelaksana</Label>
                {configOptions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Daftar pegawai belum diisi di Konfigurasi ATM.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {configOptions.map((c) => (
                      <label
                        key={c.id}
                        className="flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-sm transition-colors hover:bg-muted/50"
                      >
                        <Checkbox
                          checked={petugasTerpilih.includes(c.nama)}
                          onCheckedChange={() => togglePetugas(c.nama)}
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {c.nama}
                          <span className="ml-1 text-xs text-muted-foreground">({c.jabatan})</span>
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Urutan penomoran mengikuti urutan dipilih. Kalau belum ada yang dipilih, dua baris tanda tangan
                  tetap dicetak kosong.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Kartu Tertelan Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Edit Data Kartu Tertelan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                          variant="ghost" size="icon" 
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
              <div className="space-y-3 pt-4 border-t">
                <Label className="text-sm font-medium">Tambah Kartu Tertelan Baru</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nomor Kartu *</Label>
                    <Input placeholder="Nomor kartu..." value={newKartuNomor} onChange={(e) => setNewKartuNomor(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Nama Nasabah</Label>
                    <Input placeholder="Nama nasabah (opsional)..." value={newKartuNama} onChange={(e) => setNewKartuNama(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Bank</Label>
                    <Select value={newKartuBank} onValueChange={setNewKartuBank}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Button onClick={handleAddKartuTertelan} disabled={isAddingKartu || !newKartuNomor.trim()} className="gap-2">
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
    </>
  );
};

export default BAPengisianContent;
