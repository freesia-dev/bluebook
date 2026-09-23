// Catatan perubahan Bluebook, dipakai pop-up "Apa yang baru" dan halaman About.
//
// Cara menambah: taruh entri BARU di paling atas, dan pakai `id` yang belum
// pernah dipakai (biasanya tanggalnya). Pop-up muncul sekali untuk tiap `id`
// yang belum pernah dilihat user di perangkat itu — jadi cukup tambah entri,
// tidak ada yang perlu disetel lagi.

export interface EntriPerubahan {
  /** Kunci unik & abadi; dipakai menandai "sudah dilihat". */
  id: string;
  /** Tanggal rilis, format ISO (yyyy-mm-dd). */
  tanggal: string;
  judul: string;
  /** Poin perubahan, ditulis dari sisi manfaat untuk pemakai. */
  poin: string[];
}

export const CHANGELOG: EntriPerubahan[] = [
  {
    id: '2026-09-23-gelombang-3',
    tanggal: '2026-09-23',
    judul: 'Tur pengenalan, Wrapped, dan aplikasi yang lebih ringan',
    poin: [
      'Pegawai baru langsung dituntun berkeliling Bluebook saat pertama kali masuk — bisa diulang kapan saja dari halaman About.',
      'Bluebook Wrapped: rangkuman pekerjaan setahun, bisa dilihat di HP maupun layar lebar.',
      'Aplikasi terbuka lebih cepat karena library export baru diunduh saat dibutuhkan.',
      'Pop-up ini sendiri juga baru: tiap ada pembaruan, ringkasannya muncul sekali di sini.',
    ],
  },
  {
    id: '2026-09-23-gelombang-2',
    tanggal: '2026-09-23',
    judul: 'Kalkulator lebih pintar & tampilan lebih tenang',
    poin: [
      'Debitur yang pernah dihitung bisa dipakai ulang — ketik namanya, datanya langsung terisi.',
      'Tanggal lahir dan jenis kelamin terisi sendiri dari nomor KTP.',
      'Isian kalkulator tersimpan otomatis; kalau keluar halaman, bisa dilanjutkan.',
      'Dua sampai tiga simulasi bisa dibandingkan berdampingan.',
      'Tabel berubah jadi kartu di HP, aksi barisnya lebih ringkas, dan ada mode huruf besar.',
    ],
  },
  {
    id: '2026-09-22-gelombang-1',
    tanggal: '2026-09-22',
    judul: 'Pengamanan data & pengecekan otomatis',
    poin: [
      'Akun yang belum disetujui admin tidak lagi bisa membaca data lewat jalur mana pun.',
      'Setiap perubahan kode dicek otomatis di GitHub sebelum bisa digabung — mencegah layar putih.',
    ],
  },
  {
    id: '2026-09-21-presence',
    tanggal: '2026-09-21',
    judul: 'Sapaan harian, Ctrl+K, dan siapa yang sedang online',
    poin: [
      'Sapaan singkat tiap pertama kali membuka Bluebook di hari itu.',
      'Tekan Ctrl + K untuk lompat ke halaman mana saja atau mencari data.',
      'Terlihat siapa saja yang sedang online dan di halaman apa, lengkap dengan kursor langsung.',
      'Tombol perbarui aplikasi di halaman About — tidak perlu hapus cache lagi.',
    ],
  },
];

/** Entri terbaru (yang dipakai pop-up). */
export const PERUBAHAN_TERBARU = CHANGELOG[0];
