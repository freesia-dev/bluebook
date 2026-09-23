// Penjaga export: hanya role "admin" (dan Pemimpin) yang boleh mengunduh file
// XLSX/PDF. AuthContext mengisi window.__BLUEBOOK_IS_ADMIN__ setiap role berubah.
//
// Catatan soal pemuatan:
//   Dulu file ini meng-import xlsx dan jspdf secara langsung. Karena file ini
//   dipanggil dari main.tsx, dua library itu (total >1 MB) ikut masuk ke bundle
//   utama dan diunduh SETIAP kali aplikasi dibuka — termasuk di halaman login,
//   dan termasuk oleh user yang tidak pernah meng-export apa pun.
//
//   Sekarang keduanya di-import secara dinamis, dan penjaganya dipasang saat
//   browser sedang senggang (requestIdleCallback) setelah halaman tampil. Jadi:
//     - bundle utama jauh lebih kecil → aplikasi terbuka lebih cepat,
//     - library-nya tetap sudah siap jauh sebelum ada tombol export diklik,
//     - halaman yang memang memakai XLSX/jsPDF memakai modul yang sama persis,
//       jadi patch-nya tetap berlaku.
//   Kalau pemuatannya gagal (offline, dsb), aplikasi tetap jalan normal.
import { toast } from 'sonner';
import { downloadBlob, isStandalonePWA } from '@/lib/download';

const isAdmin = () =>
  !!(typeof window !== 'undefined' && ((window as any).__BLUEBOOK_IS_ADMIN__ || (window as any).__BLUEBOOK_CAN_EXPORT__));

const denied = () => {
  try {
    toast.error('Export dibatasi', { description: 'Hanya Admin dan Pemimpin yang dapat mengunduh/export data.' });
  } catch {
    /* noop */
  }
};

let terpasang: Promise<void> | null = null;

async function pasangPenjaga(): Promise<void> {
  const [XLSX, jspdfMod] = await Promise.all([import('xlsx'), import('jspdf')]);
  const jsPDF: any = (jspdfMod as any).default ?? jspdfMod;

  // ── Excel ────────────────────────────────────────────────────────────────
  if (!(XLSX as any).__bluebookGuarded) {
    const origWriteFile = XLSX.writeFile;
    (XLSX as any).writeFile = function (workbook: any, filename: string, ...rest: any[]) {
      if (!isAdmin()) {
        denied();
        return;
      }
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
    (XLSX as any).__bluebookGuarded = true;
  }

  // ── PDF ──────────────────────────────────────────────────────────────────
  if (jsPDF?.prototype && !jsPDF.prototype.__bluebookGuarded) {
    const origSave = jsPDF.prototype.save;
    jsPDF.prototype.save = function (filename: string, ...rest: any[]) {
      if (!isAdmin()) {
        denied();
        return this;
      }
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
    jsPDF.prototype.__bluebookGuarded = true;
  }
}

/**
 * Pastikan penjaga export sudah terpasang. Aman dipanggil berkali-kali —
 * pemuatannya cuma sekali. Dipanggil otomatis saat browser senggang, dan bisa
 * dipanggil ulang kalau suatu saat perlu dipastikan sebelum export.
 */
export function pastikanPenjagaExport(): Promise<void> {
  if (!terpasang) {
    terpasang = pasangPenjaga().catch((err) => {
      // Gagal memuat (offline / chunk hilang) → jangan sampai bikin app error.
      console.warn('Penjaga export belum bisa dipasang:', err);
      terpasang = null;
    });
  }
  return terpasang;
}

if (typeof window !== 'undefined') {
  const mulai = () => void pastikanPenjagaExport();
  const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void, o?: any) => number);
  if (ric) ric(mulai, { timeout: 4000 });
  else window.setTimeout(mulai, 2000);
}
