## Konfirmasi dari file yang di-upload
File `MLF_KUR_ULM_30-06-2026.xlsx` sudah diperiksa. Kolom `L0NARR` (di aplikasi = `l0narr`) berisi nomor PK dengan pola:
- `.../ULM-TLH/YYYY` → **Meranti** (KUR ULM)
- `.../BPD-TLH/YYYY` → **Telihan** (default)

**Pengecualian format lama (5 PK BPD-TLH tapi milik Meranti)** — hard-coded whitelist berdasarkan `l0lnno`:

| l0lnno | Nama | Nomor PK |
|---|---|---|
| 14306737 | SULIS | 087/886/59/6500/BPD-TLH/2023 |
| 14306741 | BAHARUDDIN | 101/886/59/6500/BPD-TLH/2023 |
| 14306742 | TASNADI | 102/886/59/1171/BPD-TLH/2023 |
| 14306744 | YANA | 113/886/59/8900/BPD-TLH/2023 |
| 14306753 | WINDI | 004/886/59/1160/BPD-TLH/2024 |

Jika kedepannya ada penambahan/pengurangan whitelist, cukup edit array di `src/lib/produktif-utils.ts`.

## 1. Rename menu group
Sidebar: label `"Monitoring KKR & NPL"` → `"Loan Monitoring"` (di `src/components/layout/Sidebar.tsx`).

## 2. Halaman baru: Kredit Produktif Unit

Route `/monitoring/kredit-produktif` → `src/pages/monitoring/KreditProduktifPage.tsx`, ditambahkan ke sidebar Loan Monitoring dan `src/App.tsx`. Menghormati `permissions.monitoringDashboardOnly`.

### Sumber data
- `useMLFUploads()` + `useMLFDataByBranch(uploadId, '143')`.
- Filter Produktif: `group2 IN ('Kredit Modal Kerja', 'Kredit Investasi')`.
- Penentuan unit dari `l0lnno` + `l0narr`:
  1. Kalau `l0lnno` ada di whitelist Meranti → **Meranti**.
  2. Kalau `l0narr` mengandung `/ULM-TLH/` → **Meranti**.
  3. Kalau `l0narr` mengandung `/BPD-TLH/` → **Telihan**.
  4. Selain itu → bucket `Tanpa Unit` (info).

### Kolom baru: Angsuran Pokok
Kolom baru pada tabel debitur & export:
- **Jangka Waktu (bulan)** = selisih bulan antara `date` (tanggal mulai) dan `date1` (jatuh tempo), dibulatkan.
- **Angsuran Pokok / bulan** = `pla / jangkaWaktuBulan` (dibulatkan ke rupiah terdekat, `-` bila jangka waktu 0).

Ditampilkan sebagai 2 kolom terpisah agar user bisa verifikasi hitungannya.

### Layout
Card "Kredit Produktif Unit" berisi:
- Header controls: pilih periode MLF + toggle "Sertakan Ekstrakomtabel" (default off).
- Bar chart mini perbandingan Telihan vs Meranti (debitur, outstanding, NPL%, tunggakan, **total angsuran pokok/bulan**).
- Tabs `Telihan` | `Meranti`. Setiap tab menampilkan:
  - Stat row: total debitur, plafon, outstanding, tunggakan, NPL%, **total angsuran pokok/bulan**.
  - Breakdown Modal Kerja vs Investasi.
  - Distribusi KOL (badge warna + count).
  - Tabel debitur (search + filter KOL + sort): No, Nomor Loan, Nama, Nomor PK, Produk, Jenis, Plafon, Outstanding, Tunggakan, **Jangka Waktu (bln)**, **Angsuran Pokok/bln**, KOL, AO, Jatuh Tempo. Baris KOL ≥ 3 di-highlight rose.
  - Tombol **Export Excel** & **Export PDF**.

### Export
- Excel: `xlsx`, 1 sheet per tab, header + total baris bawah termasuk total angsuran pokok/bulan.
- PDF: `jspdf` + `jspdf-autotable`, landscape A4, kop mirip monitoring lain, ringkasan + tabel.

## 3. Tambahan
- ✅ Bar chart perbandingan Telihan vs Meranti.
- ✅ Highlight baris KOL ≥ 3 + quick-link ke Kontak Debitur.
- ✅ KPI ringkas share Telihan/Meranti.

## Technical
- File baru: `src/pages/monitoring/KreditProduktifPage.tsx`, helper `src/lib/produktif-utils.ts` berisi:
  - `MERANTI_OVERRIDE_L0LNNO: Set<string>` (5 nomor loan di atas).
  - `getUnit(row)` → `'telihan' | 'meranti' | 'unknown'`.
  - `getJangkaWaktuBulan(row)`, `getAngsuranPokok(row)`.
  - Aggregator per unit / KOL / jenis; builder Excel & PDF.
- Reuse: `useMLFUploads`, `useMLFDataByBranch('143')`, `fmtIDR`, `fmtNum`, `KOL_LABEL`, `KOL_COLOR`.
- Router: satu entry baru di `src/App.tsx`.
- Sidebar: tambah item + ganti label group.
- Tidak ada perubahan schema DB. File Excel referensi tidak disimpan ke repo.
