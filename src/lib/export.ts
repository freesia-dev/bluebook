import * as XLSX from 'xlsx';
import { getSuratMasuk, getSuratKeluar, getSPPK, getPK, getKKMPAK } from './store';

export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Sheet1') => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};

export const exportAllTables = () => {
  const workbook = XLSX.utils.book_new();
  
  // Surat Masuk
  const suratMasuk = getSuratMasuk().map(item => ({
    'No': item.nomor,
    'Nomor Agenda': item.nomorAgenda,
    'Kode Surat': item.kodeSurat,
    'Nomor Surat Masuk': item.nomorSuratMasuk,
    'Nama Pengirim': item.namaPengirim,
    'Perihal': item.perihal,
    'Tujuan Disposisi': item.tujuanDisposisi,
    'Status': item.status,
    'Keterangan': item.keterangan,
    'User Input': item.userInput,
    'Tanggal': new Date(item.createdAt).toLocaleDateString('id-ID'),
  }));
  if (suratMasuk.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(suratMasuk), 'Surat Masuk');
  }
  
  // Surat Keluar
  const suratKeluar = getSuratKeluar().map(item => ({
    'No': item.nomor,
    'Nomor Agenda': item.nomorAgenda,
    'Kode Surat': item.kodeSurat,
    'Nama Penerima': item.namaPenerima,
    'Perihal': item.perihal,
    'Tujuan Surat': item.tujuanSurat,
    'Status': item.status,
    'Keterangan': item.keterangan,
    'User Input': item.userInput,
    'Tanggal': new Date(item.createdAt).toLocaleDateString('id-ID'),
  }));
  if (suratKeluar.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(suratKeluar), 'Surat Keluar');
  }
  
  // SPPK Telihan
  const sppkTelihan = getSPPK().filter(s => s.type === 'telihan').map(item => ({
    'No': item.nomor,
    'Nomor SPPK': item.nomorSPPK,
    'Nama Debitur': item.namaDebitur,
    'Jenis Kredit': item.jenisKredit,
    'Plafon': item.plafon,
    'Jangka Waktu': item.jangkaWaktu,
    'Marketing': item.marketing,
    'Tanggal': new Date(item.createdAt).toLocaleDateString('id-ID'),
  }));
  if (sppkTelihan.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sppkTelihan), 'SPPK Telihan');
  }
  
  // SPPK Meranti
  const sppkMeranti = getSPPK().filter(s => s.type === 'meranti').map(item => ({
    'No': item.nomor,
    'Nomor SPPK': item.nomorSPPK,
    'Nama Debitur': item.namaDebitur,
    'Jenis Kredit': item.jenisKredit,
    'Plafon': item.plafon,
    'Jangka Waktu': item.jangkaWaktu,
    'Marketing': item.marketing,
    'Tanggal': new Date(item.createdAt).toLocaleDateString('id-ID'),
  }));
  if (sppkMeranti.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(sppkMeranti), 'SPPK Meranti');
  }
  
  // PK Telihan
  const pkTelihan = getPK().filter(s => s.type === 'telihan').map(item => ({
    'No': item.nomor,
    'Nomor PK': item.nomorPK,
    'Nama Debitur': item.namaDebitur,
    'Jenis Kredit': item.jenisKredit,
    'Plafon': item.plafon,
    'Jangka Waktu': item.jangkaWaktu,
    'Jenis Debitur': item.jenisDebitur,
    'Jenis Penggunaan': item.jenisPenggunaan,
    'Sektor Ekonomi': item.sektorEkonomi,
    'Tanggal': new Date(item.createdAt).toLocaleDateString('id-ID'),
  }));
  if (pkTelihan.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(pkTelihan), 'PK Telihan');
  }
  
  // PK Meranti
  const pkMeranti = getPK().filter(s => s.type === 'meranti').map(item => ({
    'No': item.nomor,
    'Nomor PK': item.nomorPK,
    'Nama Debitur': item.namaDebitur,
    'Jenis Kredit': item.jenisKredit,
    'Plafon': item.plafon,
    'Jangka Waktu': item.jangkaWaktu,
    'Jenis Debitur': item.jenisDebitur,
    'Jenis Penggunaan': item.jenisPenggunaan,
    'Sektor Ekonomi': item.sektorEkonomi,
    'Tanggal': new Date(item.createdAt).toLocaleDateString('id-ID'),
  }));
  if (pkMeranti.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(pkMeranti), 'PK Meranti');
  }
  
  // KK & MPAK Telihan
  const kkmpakTelihan = getKKMPAK().filter(s => s.type === 'telihan').map(item => ({
    'No': item.nomor,
    'Nomor KK': item.nomorKK,
    'Nomor MPAK': item.nomorMPAK,
    'Nama Debitur': item.namaDebitur,
    'Jenis Kredit': item.jenisKredit,
    'Plafon': item.plafon,
    'Jangka Waktu': item.jangkaWaktu,
    'Jenis Debitur': item.jenisDebitur,
    'Kode Fasilitas': item.kodeFasilitas,
    'Sektor Ekonomi': item.sektorEkonomi,
    'Tanggal': new Date(item.createdAt).toLocaleDateString('id-ID'),
  }));
  if (kkmpakTelihan.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(kkmpakTelihan), 'KK MPAK Telihan');
  }
  
  // Agenda & MPAK Meranti
  const kkmpakMeranti = getKKMPAK().filter(s => s.type === 'meranti').map(item => ({
    'No': item.nomor,
    'Nomor Agenda': item.nomorKK,
    'Nomor MPAK': item.nomorMPAK,
    'Nama Debitur': item.namaDebitur,
    'Jenis Kredit': item.jenisKredit,
    'Plafon': item.plafon,
    'Jangka Waktu': item.jangkaWaktu,
    'Jenis Debitur': item.jenisDebitur,
    'Kode Fasilitas': item.kodeFasilitas,
    'Sektor Ekonomi': item.sektorEkonomi,
    'Tanggal': new Date(item.createdAt).toLocaleDateString('id-ID'),
  }));
  if (kkmpakMeranti.length > 0) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(kkmpakMeranti), 'Agenda MPAK Meranti');
  }
  
  const now = new Date();
  const filename = `Bluebook_Export_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  XLSX.writeFile(workbook, `${filename}.xlsx`);
};
