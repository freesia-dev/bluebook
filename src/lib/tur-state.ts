// Status tur pengenalan — disimpan di perangkat, bukan di server, supaya tidak
// perlu tabel baru dan tidak ada permintaan jaringan tambahan saat halaman dibuka.
const KUNCI = 'bluebook-tur-selesai';

export function sudahIkutTur(): boolean {
  try {
    return window.localStorage.getItem(KUNCI) === '1';
  } catch {
    // Tanpa localStorage, anggap saja sudah — lebih baik tidak muncul daripada
    // muncul terus-menerus setiap kali halaman dibuka.
    return true;
  }
}

export function tandaiTurSelesai(): void {
  try {
    window.localStorage.setItem(KUNCI, '1');
  } catch {
    /* noop */
  }
}

/** Dipanggil dari halaman About untuk mengulang tur. */
export function mulaiTurLagi(): void {
  try {
    window.localStorage.removeItem(KUNCI);
  } catch {
    /* noop */
  }
  window.dispatchEvent(new CustomEvent('bluebook:mulai-tur'));
}
