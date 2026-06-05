## Perubahan yang diminta

### 1. Dashboard — perbaiki arti "Pengajuan Diproses"
Saat ini kartu **"Pengajuan Diproses"** menghitung `diajukan + diproses`. Itu salah — "diproses" artinya pengajuan yang sudah di-**checklist (✓) Jalankan** (lanjut ke proses), bukan yang masih menunggu aksi.

**Penyesuaian** di `src/pages/Dashboard.tsx` (dan/atau label di `use-dashboard-data.ts` tidak perlu diubah, hanya cara render):
- **Total Pengajuan OJK** → `ojkStats.total` (tetap)
- **Pengajuan Diproses** → `ojkStats.diproses` saja (status `diproses`)
- **Pengajuan Dibatalkan** → `ojkStats.ditolak` (tetap)
- Tambahan opsional: jika perlu, tampilkan juga jumlah `diajukan` sebagai sub-info kecil di kartu "Total" ("X menunggu aksi") supaya admin tau ada yang belum direspon. Akan saya tambahkan sebagai baris kecil di bawah angka Total.

### 2. Popup konfirmasi sebelum proses / tolak
Di `src/pages/SuratKeluar.tsx`, tombol ✅ dan ❌ pada baris OJK saat ini langsung mengubah status. Ubah jadi:

1. Klik tombol ✅ atau ❌ → buka **Dialog konfirmasi** (`@/components/ui/dialog` atau `alert-dialog`).
2. Dialog menampilkan **ringkasan info surat**:
   - Nomor Agenda / Nomor surat
   - Kode Surat (B-4)
   - Tanggal
   - Nama Penerima
   - Tujuan Surat
   - Perihal
   - Status OJK saat ini
   - User Input
3. Judul dialog dinamis:
   - ✅ → "Proses Pengajuan OJK?" dengan deskripsi "Surat akan ditandai sebagai **Diproses** (dilanjutkan ke proses pengajuan)."
   - ❌ → "Batalkan Pengajuan OJK?" dengan deskripsi "Surat akan ditandai sebagai **Dibatalkan/Ditolak**."
   - ✓ (saat sudah `diproses`) → "Tandai Selesai?"
4. Tombol footer: **Batal** + **Konfirmasi** (warna sesuai aksi: hijau untuk proses/selesai, merah untuk tolak).
5. Setelah konfirmasi → jalankan `updateOjkStatus` (mutation existing) → tutup dialog → toast sukses.

**Implementasi**:
- Tambah state lokal di `SuratKeluar.tsx`: `ojkConfirm: { surat, action: 'diproses'|'ditolak'|'selesai' } | null`.
- Komponen dialog inline (tidak perlu file baru — cukup di `SuratKeluar.tsx` karena spesifik halaman ini).
- Hak akses tetap: hanya `user_input === currentUser.nama` atau admin yang bisa lihat tombol & buka dialog.

### File yang akan diubah
- `src/pages/Dashboard.tsx` — perbaiki sumber angka kartu "Pengajuan Diproses" (pakai `ojkStats.diproses` saja) + tambah sub-info "X menunggu aksi" di kartu Total.
- `src/pages/SuratKeluar.tsx` — bungkus aksi tombol ✅/❌/✓ dengan dialog konfirmasi yang menampilkan ringkasan info surat.

Tidak ada perubahan database/RLS/hook — murni UI.
