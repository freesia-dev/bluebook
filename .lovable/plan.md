## Tujuan
Menandai surat keluar dengan kode **B-4** yang ditujukan ke **OJK / Otoritas Jasa Keuangan** sebagai "Pengajuan OJK" dengan workflow proses/tolak, plus 3 hero card di dashboard.

## 1. Database (migration)
Tambah kolom baru di `surat_keluar`:
- `ojk_status` TEXT — nilai: `diajukan` | `diproses` | `ditolak` | `selesai` | NULL
- `ojk_status_updated_at` TIMESTAMPTZ
- `ojk_status_updated_by` UUID (user id)
- `ojk_status_updated_by_nama` TEXT

Backfill data lampau: untuk semua baris dengan `kode_surat = 'B-4'` AND (nama_penerima/tujuan_surat ILIKE `%ojk%` OR `%otoritas jasa keuangan%`), set `ojk_status = 'diproses'`.

RLS update: kolom-kolom ini ikut policy `surat_keluar` yang sudah ada. Aksi proses/tolak hanya boleh oleh **user_input asli** atau **admin** — di-enforce di UI + dipertegas di policy update.

## 2. Deteksi otomatis (helper)
Helper `isOjkSurat(s)`: `kode_surat === 'B-4' && /ojk|otoritas\s+jasa\s+keuangan/i.test(nama_penerima + ' ' + tujuan_surat)`.

Saat **insert/update** surat keluar, jika `isOjkSurat` true dan `ojk_status` masih NULL → otomatis set `ojk_status = 'diajukan'`.

## 3. UI Surat Keluar (`src/pages/SuratKeluar.tsx`)
Di tabel, untuk baris OJK tampilkan:
- **Badge status** OJK: Diajukan (kuning) / Diproses (biru) / Ditolak (merah) / Selesai (hijau)
- **Action buttons** (hanya jika `user_input === currentUser.nama` atau role admin):
  - ✅ tombol hijau → set `diproses`
  - ❌ tombol merah → set `ditolak`
  - (saat status `diproses`, tambah tombol ✓ "Selesai")
- Optimistic update via React Query mutation di `use-surat-data.ts`.

## 4. Dashboard hero cards (`src/pages/Dashboard.tsx`)
Tambah **3 StatCard baru** di atas grid statistik dokumen, dalam section "Pengajuan OJK":
- **Total Pengajuan OJK** (variant primary)
- **Pengajuan Diproses** (variant warning — status `diajukan` + `diproses`)
- **Pengajuan Dibatalkan** (variant default — status `ditolak`)

Data via query baru di `use-dashboard-data.ts` (`ojk-stats`): hitung dari `surat_keluar` filter `ojk_status NOT NULL`. Subscribe realtime supaya update langsung.

## 5. File yang akan diubah
- migration baru (kolom + backfill)
- `src/pages/SuratKeluar.tsx` — kolom status OJK + tombol aksi
- `src/hooks/use-surat-data.ts` — mutation `updateOjkStatus` + auto-set `diajukan` saat insert OJK
- `src/lib/supabase-store.ts` — mapping kolom baru
- `src/types/index.ts` — tambah field `ojkStatus`, dll.
- `src/hooks/use-dashboard-data.ts` — query stats OJK
- `src/pages/Dashboard.tsx` — section hero OJK
- `src/lib/utils.ts` (atau file kecil baru) — helper `isOjkSurat`

## Catatan
- Aksi hanya muncul untuk baris OJK; surat keluar non-OJK tidak berubah tampilan.
- Demo/pemimpin tetap read-only.
- Data lampau OJK otomatis muncul di card sebagai "Diproses".
