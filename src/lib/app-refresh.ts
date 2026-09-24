/* -------------------------------------------------------------------------- */
/*  Muat ulang sesudah ada versi baru — tanpa halaman gagal muat                */
/*                                                                            */
/*  Riwayat masalahnya: dulu tiap kali ada deploy baru, Bluebook menghapus     */
/*  SEMUA cache lalu memanggil location.reload(). Cache precache service       */
/*  worker yang baru ikut terhapus, jadi setelah reload tidak ada berkas yang  */
/*  bisa dilayani dan halaman gagal muat — di browser harus ketik ulang        */
/*  alamatnya, di PWA malah harus force close. Sekarang:                       */
/*                                                                            */
/*  - cache tidak dihapus (workbox sudah membersihkan precache lama sendiri)   */
/*  - muat ulang pakai location.replace ke alamat yang sama, jadi pengguna     */
/*    tetap di halaman yang sedang dibuka dan tidak menumpuk riwayat back      */
/*  - kalau dua kali percobaan tetap gagal, baru jatuh ke halaman depan        */
/*  - ada jeda minimum antar percobaan supaya tidak pernah jadi loop reload    */
/* -------------------------------------------------------------------------- */

const KUNCI_WAKTU = 'bluebook-muat-ulang-pada';
const KUNCI_PERCOBAAN = 'bluebook-muat-ulang-percobaan';
const JEDA_MINIMUM_MS = 15_000;

const bacaSesi = (kunci: string): number => {
  try {
    return Number(sessionStorage.getItem(kunci) || 0) || 0;
  } catch {
    return 0;
  }
};

const tulisSesi = (kunci: string, nilai: number) => {
  try {
    sessionStorage.setItem(kunci, String(nilai));
  } catch {
    /* mode privat / storage penuh — tidak masalah, cuma kehilangan penjaga loop */
  }
};

/**
 * Tandai bahwa halaman berhasil dimuat sampai React jalan. Dipanggil dari
 * App setelah render pertama, supaya hitungan percobaan kembali nol.
 */
export const tandaiMuatBerhasil = () => {
  tulisSesi(KUNCI_PERCOBAAN, 0);
};

/**
 * Muat ulang halaman karena ada versi baru atau berkas lama sudah tidak ada
 * di server. Mengembalikan false kalau sengaja tidak dilakukan (baru saja
 * reload), supaya pemanggilnya tahu tidak perlu menunggu.
 */
export const muatUlangUntukVersiBaru = (alasan: string): boolean => {
  const sekarang = Date.now();
  if (sekarang - bacaSesi(KUNCI_WAKTU) < JEDA_MINIMUM_MS) return false;

  const percobaan = bacaSesi(KUNCI_PERCOBAAN) + 1;
  tulisSesi(KUNCI_WAKTU, sekarang);
  tulisSesi(KUNCI_PERCOBAAN, percobaan);

  if (import.meta.env.DEV) console.info('[bluebook] muat ulang:', alasan, 'percobaan', percobaan);

  // Percobaan ketiga: kemungkinan index.html yang tersimpan sudah tidak cocok
  // dengan berkas di server. Buang cache halaman lalu mulai dari halaman depan.
  if (percobaan >= 3) {
    void (async () => {
      try {
        if ('caches' in window) {
          const kunci = await caches.keys();
          await Promise.all(kunci.filter((k) => /html-pages/i.test(k)).map((k) => caches.delete(k)));
        }
      } catch {
        /* noop */
      }
      window.location.replace('/');
    })();
    return true;
  }

  const alamat = window.location.pathname + window.location.search + window.location.hash;
  window.location.replace(alamat);
  return true;
};

/**
 * Pasang penjaga untuk berkas halaman (chunk) yang hilang setelah deploy.
 * Ini penyebab utama "halaman gagal muat" di browser: index.html lama masih
 * menunjuk berkas dengan hash lama yang sudah tidak ada di server.
 */
export const pasangPenjagaChunk = () => {
  const cocokChunkHilang = (pesan: string) =>
    !!pesan &&
    (pesan.includes('Importing a module script failed') ||
      pesan.includes('Failed to fetch dynamically imported module') ||
      pesan.includes('error loading dynamically imported module') ||
      pesan.includes('Loading chunk') ||
      pesan.includes('Loading CSS chunk'));

  const tangani = (pesan: string) => {
    if (cocokChunkHilang(pesan)) muatUlangUntukVersiBaru('chunk lama tidak ditemukan');
  };

  window.addEventListener('error', (e) => tangani(e.message));
  window.addEventListener('unhandledrejection', (e) =>
    tangani(String((e.reason && (e.reason as Error).message) || e.reason || '')),
  );
  // Event khusus Vite saat preload modul gagal — lebih awal daripada error di atas
  window.addEventListener('vite:preloadError', (e) => {
    e.preventDefault();
    muatUlangUntukVersiBaru('preload modul gagal');
  });
};
