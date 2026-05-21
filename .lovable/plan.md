## Perubahan Log Security

### 1. Hapus shift yang sudah terinput
- Tambah tombol **Hapus Shift** di header `ShiftCard` (icon trash, warna destructive) — hanya muncul untuk admin (sesuai RLS yang sudah ada: `Admins delete security_shift`).
- Konfirmasi via `AlertDialog`: "Hapus shift ini beserta semua kejadiannya?"
- Tambah hook `useDeleteShift` di `use-security-log.ts`:
  - Hapus semua `security_log_entry` dengan `shift_id` terkait dulu
  - Lalu hapus row di `security_shift`
  - Invalidate query `security-shifts`
- Untuk user non-admin (security/staff_admin_kcp): tombol tidak ditampilkan. Mereka tetap bisa hapus per-kejadian (sudah ada).

### 2. Nama Security dari daftar user role `security`
- Tambah hook `useSecurityUsers` (di `use-users-data.ts` atau hook baru) yang query:
  ```
  user_roles (role='security') JOIN profiles → ambil profiles.nama
  ```
  Hasilnya list `{ user_id, nama }` user dengan role security yang `status='approved'`.
- Di `StartShiftDialog`: ganti `Input` nama petugas → `Select` (Combobox) berisi nama security, default ke user login jika dia security. Tetap simpan `nama_petugas` (text) + `petugas_user_id` (sudah ada).
- Di `HandoverDialog`: field "Diserahkan kepada" juga jadi `Select` dari list security (exclude petugas yang sedang aktif), simpan ke `serah_terima_ke_nama` + `serah_terima_ke_user_id`.
- Fallback: jika list kosong (mis. belum ada user role security), tampilkan input text manual seperti sekarang.

### Files yang akan diubah
- `src/hooks/use-security-log.ts` — tambah `useDeleteShift`, `useSecurityUsers`
- `src/components/security/ShiftCard.tsx` — tombol hapus shift (admin only) + AlertDialog
- `src/components/security/StartShiftDialog.tsx` — Select nama security
- `src/components/security/HandoverDialog.tsx` — Select penerima shift

Tidak ada perubahan database/RLS (policy admin delete sudah ada, profiles & user_roles sudah bisa di-query).
