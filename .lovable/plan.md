## Customer Service (CS) — Modul Baru

Grup menu baru di sidebar khusus role `cs` (+ `admin`), berisi master CIF, register rekening per produk tabungan, logbook kartu ATM, register buku tabungan, register bilyet deposito, dan import data lama dari Excel.

### Sidebar — Grup "Customer Service" (icon Headphones)
Visible hanya untuk `cs` & `admin`.

- CIF Nasabah → `/cs/cif`
- Register Rekening (sub-menu per produk):
  - Simpeda → `/cs/rekening/simpeda`
  - Prama → `/cs/rekening/prama`
  - Simpel → `/cs/rekening/simpel`
  - TabunganKu → `/cs/rekening/tabunganku`
  - Giro → `/cs/rekening/giro`
  - Al-Amin → `/cs/rekening/alamin`
  - Taspen → `/cs/rekening/taspen`
  - SI (Standing Instruction) → `/cs/rekening/si`
- Logbook Kartu ATM → `/cs/kartu-atm`
- Register Buku Tabungan → `/cs/buku-tabungan`
- Register Bilyet Deposito → `/cs/bilyet-deposito`
- Import Data Lama (admin only) → `/cs/import`

### Modul 1 — CIF Nasabah
- Tabel: nomor urut (auto-suggest, bisa lompat / override), CIF (unik), nama, tanggal input, user input.
- Form input: auto-suggest nomor berikutnya dari max+1, bisa diubah manual (validasi CIF unik saja, nomor boleh lompat).
- Search by CIF/nama, sort terbaru/terlama, filter, export Excel.
- Backdating: field tanggal input bisa diisi tanggal lampau.

### Modul 2 — Register Rekening per Produk (8 produk)
Satu halaman generic `RekeningPage` dengan param produk. Tiap baris:
nomor urut (auto-suggest, boleh lompat) · nomor rekening (unik per produk) · CIF (autocomplete dari CIF Nasabah, kalau belum ada bisa quick-create) · nama nasabah · tanggal buka · keterangan · user input.

- Prefix nomor rekening: ikut data lama (tidak di-hardcode). Saat import, format apa adanya dari Excel; saat input baru, auto-suggest = nomor rekening terakhir + 1 (string increment), user bisa override.
- Backdating tanggal buka.
- Export Excel per produk.

### Modul 3 — Logbook Kartu ATM
- 2 tab: **Stok Saat Ini** (Simpeda / Prama / TabunganKu, dihitung dari mutasi) & **Mutasi** (masuk / keluar, jenis kartu, jumlah, keterangan, user, tanggal).
- Export Excel.

### Modul 4 — Register Buku Tabungan
- 2 tab: **Masuk** (stok kosong yang diterima) & **Keluar** (diberikan ke nasabah, link CIF + rekening).
- Auto-hitung sisa stok.

### Modul 5 — Register Bilyet Deposito Keluar
- Nomor bilyet, CIF, nama, nominal, jangka waktu, tanggal terbit, tanggal jatuh tempo, status (aktif / cair / pindah), keterangan.
- Filter status & export Excel.

### Modul 6 — Import Data Lama (admin only)
- Upload `.xlsx`, parse via `xlsx` di browser.
- Auto-detect sheet (CIF, SIMPEDA, PRAMA, SIMPEL, TABUNGANKU, GIRO, AL-AMIN, TASPEN, SI).
- Preview 50 baris pertama tiap sheet, mapping kolom, lalu batch insert.
- Dedupe: CIF by `cif`; rekening by `(produk, nomor_rekening)`.
- Kalau CIF di register belum ada di master, auto-buat stub CIF.

### Database (migration baru)

Enums:
- `cs_produk_tabungan`: simpeda, prama, simpel, tabunganku, giro, alamin, taspen, si
- `cs_jenis_kartu`: simpeda, prama, tabunganku
- `cs_mutasi_tipe`: masuk, keluar
- `cs_deposito_status`: aktif, cair, pindah

Tables (semua dengan trigger `log_activity`, RLS role `cs`/`admin` only):
- `cs_cif` — nomor_urut int, cif text unique, nama text, tanggal_input date, user_input
- `cs_rekening` — produk enum, nomor_urut int, nomor_rekening text, cif_id fk → cs_cif, nama, tanggal_buka date, keterangan, user_input; UNIQUE(produk, nomor_rekening)
- `cs_kartu_atm_mutasi` — jenis_kartu enum, tipe enum, jumlah int, tanggal, keterangan, user_input
- `cs_buku_tabungan` — tipe enum (masuk/keluar), jumlah int, tanggal, cif_id nullable, nomor_rekening nullable, keterangan, user_input
- `cs_bilyet_deposito` — nomor_bilyet text unique, cif_id fk, nama, nominal numeric, jangka_waktu_bulan int, tanggal_terbit date, tanggal_jatuh_tempo date, status enum, keterangan, user_input

GRANTs `authenticated` + `service_role`. RLS: only `cs`/`admin` boleh CRUD; demo/pemimpin read-only.

### Role permissions
- Tambah flag `customerService` di `src/lib/role-permissions.ts`, true untuk `cs` & `admin`.
- Tambah role enum `cs` (sudah ada di `can_use_loan_calc`), pastikan label di `ROLE_LABELS`.

### File changes ringkas
**Baru:**
- `src/pages/cs/CIFPage.tsx`
- `src/pages/cs/RekeningPage.tsx` (generic, param produk)
- `src/pages/cs/KartuATMPage.tsx`
- `src/pages/cs/BukuTabunganPage.tsx`
- `src/pages/cs/BilyetDepositoPage.tsx`
- `src/pages/cs/ImportPage.tsx`
- `src/hooks/use-cs-data.ts`
- `src/lib/cs-store.ts`

**Edit:**
- `src/App.tsx` — 12 route baru
- `src/components/layout/Sidebar.tsx` — grup CS
- `src/lib/role-permissions.ts` — flag `customerService`
- `src/components/search/GlobalSearch.tsx` — index modul baru
- `src/pages/Panduan.tsx` — section panduan CS

### Out of scope (Phase 1)
- Recycle bin & soft-delete untuk tabel CS
- BA printing untuk modul CS
- Notifikasi otomatis deposito jatuh tempo
- Workflow approval

Phase 2 nanti bisa ditambah kalau sudah jalan.