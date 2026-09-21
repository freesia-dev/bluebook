// Util download yang aman dipakai di mode PWA standalone (installed app).
//
// Kenapa ini perlu: XLSX.writeFile() dan jsPDF.prototype.save() secara
// internal memicu download lewat <a download="..."> yang diklik lewat
// JavaScript ke sebuah blob: URL. Itu jalan normal kalau Bluebook dibuka di
// tab browser biasa. TAPI begitu Bluebook di-install jadi PWA (standalone,
// "Add to Home Screen"), klik <a download> ke blob: URL itu sering DI-DROP
// DIAM-DIAM oleh Chrome di Android — nggak ada error, nggak ada apa-apa,
// user cuma lihat toast "berhasil" dari kode kita padahal file nggak pernah
// benar-benar ke-download. Ini limitasi/bug yang cukup dikenal di ekosistem
// PWA Android, bukan sesuatu yang bisa "salah kode" biasa.
//
// Fix-nya: begitu terdeteksi jalan di mode standalone, jangan pakai <a
// download>, tapi window.open() blob: URL sebagai navigasi/tab baru — itu
// jauh lebih konsisten memicu download manager Android meskipun app-nya
// standalone.

export function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true;
    // iOS Safari lama nggak dukung matchMedia display-mode, pakai flag legacy ini
    if ((window.navigator as any).standalone === true) return true;
  } catch {
    /* noop */
  }
  return false;
}

function triggerAnchorDownload(url: string, filename: string) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

/**
 * Download satu Blob sebagai file bernama `filename`. Otomatis pakai jalur
 * yang lebih aman (window.open) kalau lagi jalan di mode PWA standalone,
 * dan jalur biasa (<a download>) di tab browser normal.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  try {
    if (isStandalonePWA()) {
      const win = window.open(url, '_blank');
      if (!win) {
        // Fallback kalau popup ke-blok browser
        triggerAnchorDownload(url, filename);
      }
    } else {
      triggerAnchorDownload(url, filename);
    }
  } finally {
    // Kasih waktu browser mulai proses download-nya dulu sebelum URL dilepas
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
