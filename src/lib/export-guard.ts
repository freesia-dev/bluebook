// Global export guard: only role "admin" may trigger XLSX/PDF file downloads.
// AuthContext sets window.__BLUEBOOK_IS_ADMIN__ whenever the role changes.
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { downloadBlob, isStandalonePWA } from '@/lib/download';

const isAdmin = () =>
  !!(typeof window !== 'undefined' && ((window as any).__BLUEBOOK_IS_ADMIN__ || (window as any).__BLUEBOOK_CAN_EXPORT__));

const denied = () => {
  try { toast.error('Export dibatasi', { description: 'Hanya Admin dan Pemimpin yang dapat mengunduh/export data.' }); } catch {}
};

// Patch XLSX.writeFile so every Excel export in the app funnels through the guard.
const origWriteFile = XLSX.writeFile;
(XLSX as any).writeFile = function (workbook: any, filename: string, ...rest: any[]) {
  if (!isAdmin()) { denied(); return; }
  // Di mode PWA standalone (installed app), <a download> ke blob: URL yang
  // dipakai XLSX.writeFile() secara internal sering di-drop diam-diam oleh
  // Chrome Android — user cuma lihat toast "berhasil" tapi file nggak
  // ke-download. Kalau kedeteksi standalone, bikin file-nya sendiri lalu
  // download lewat jalur yang lebih aman (lihat src/lib/download.ts).
  if (isStandalonePWA()) {
    try {
      const arrayBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([arrayBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      downloadBlob(blob, filename);
      return;
    } catch (err) {
      console.error('Gagal download Excel di mode PWA, coba jalur biasa:', err);
      // lanjut ke jalur asli di bawah sebagai upaya terakhir
    }
  }
  // @ts-ignore
  return origWriteFile.apply(this, [workbook, filename, ...rest]);
};

// Patch jsPDF.prototype.save so every PDF download funnels through the guard.
const origSave = (jsPDF as any).prototype.save;
(jsPDF as any).prototype.save = function (filename: string, ...rest: any[]) {
  if (!isAdmin()) { denied(); return this; }
  if (isStandalonePWA()) {
    try {
      const blob: Blob = this.output('blob');
      downloadBlob(blob, filename);
      return this;
    } catch (err) {
      console.error('Gagal download PDF di mode PWA, coba jalur biasa:', err);
    }
  }
  return origSave.apply(this, [filename, ...rest]);
};

export {};
