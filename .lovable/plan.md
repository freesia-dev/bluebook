# Fix Tarif Al-Amin & Tambah Program CERDAS

## 1. Bug Tarif Al-Amin (SUDAH DIPERBAIKI)

Penyebab: hook `useAlaminTarif` di `src/hooks/use-alamin.ts` hanya ambil 1.000 baris pertama (default limit Supabase), padahal data 9.813 baris → umur 29 tenor 120 (rate 48) tidak ter-load. Sudah saya tambahkan paginasi `.range()`. Setelah refresh, lookup tarif akan jalan normal.

## 2. Program CERDAS — Promo 2 Juni – 31 Agustus 2026

### Aturan program
- **Debitur Baru**: bunga **9,50% p.a. fixed (anuitas)** + **gratis AJK** sesuai cap tier
- **Take Over**: bunga **9,00% p.a. fixed (anuitas)** + **gratis AJK** sesuai cap tier
- **Top Up**: bunga **10,50% p.a. fixed (anuitas)** + **diskon provisi 50%** (TIDAK ada subsidi AJK)
- **Cap subsidi AJK per tier plafon**:
  - Tier 1: plafon ≤ Rp 75 jt → cap **Rp 1.400.000**
  - Tier 2: Rp 75 jt < plafon ≤ Rp 150 jt → cap **Rp 3.000.000**
  - Tier 3: Rp 150 jt < plafon ≤ Rp 300 jt → cap **Rp 5.000.000**
  - Plafon > Rp 300 jt → tidak ikut subsidi (asuransi normal)
- **Logika subsidi**: jika premi AJK aktual ≤ cap → debitur GRATIS (bank tanggung penuh). Jika premi > cap → debitur bayar **selisih** = `premiGross - cap`.
- **Pelunasan dipercepat/top up ≤ 1 tahun**: wajib mengganti premi yang telah dibayar bank (ditampilkan sebagai catatan di PDF, tidak mengubah angka simulasi).

### Database (1 migration)
- Tabel `cerdas_config` (single row, editable admin):
  - `id`, `nama_program` (default "CERDAS"), `aktif` (bool), `periode_mulai`, `periode_selesai`
  - `bunga_debitur_baru`, `bunga_take_over`, `bunga_top_up` (numeric, default 9.5/9.0/10.5)
  - `diskon_provisi_top_up_pct` (default 50)
  - `cap_tier_1`, `cap_tier_2`, `cap_tier_3` (default 1.4jt/3jt/5jt)
  - `plafon_tier_1_max`, `plafon_tier_2_max`, `plafon_tier_3_max` (default 75jt/150jt/300jt)
- Kolom baru di `loan_simulation`:
  - `cerdas_skema text` (`null` | `debitur_baru` | `take_over` | `top_up`)
  - `cerdas_cap_subsidi int` (cap yang dipakai)
  - `cerdas_subsidi_bank int` (nominal yang ditanggung bank)
  - `cerdas_selisih_debitur int` (selisih beban debitur)
- Grants + RLS: read `authenticated`, write `admin`.

### Engine kalkulasi
File baru `src/lib/cerdas-calc.ts`:
- `getCerdasTier(plafon, config)` → tier 1/2/3 atau `null`
- `getCerdasCap(plafon, config)` → nominal cap
- `applyCerdas({ skema, plafon, premiGross, provisiPct, bungaPa, config })` →
  - return: `{ bungaFinal, provisiFinalPct, capSubsidi, subsidiBank, selisihDebitur, asuransiBebanDebitur, status: 'gratis'|'selisih'|'tidak-eligible' }`
  - Untuk Top Up: provisi × (1 − diskon%), tidak ada subsidi AJK.

### UI Kalkulator (`src/pages/kalkulator/KalkulatorPage.tsx`)
- Section baru **"Program CERDAS"** (collapsible / toggle) di antara Pinjaman & Asuransi:
  - Switch "Ikut Program CERDAS"
  - Bila on: radio 3 opsi (Debitur Baru / Take Over / Top Up) dengan badge bunga
  - Auto-override `bungaPa` & (untuk Top Up) `provisiPct`
  - Tampilkan info card cap tier saat plafon diisi
- Section Asuransi (Al-Amin) menampilkan breakdown subsidi:
  - "Subsidi bank: − Rp xxx (cap tier)", "Beban debitur: Rp yyy" (atau "GRATIS")
  - Badge **GRATIS** / **Bayar Selisih** sesuai gambar
- Ringkasan: nominal asuransi yang masuk potongan = `asuransiBebanDebitur` (bukan premiGross penuh).
- Auto-disable program CERDAS jika plafon > 300 jt atau periode di luar.

### PDF
- Section baru **"Program CERDAS"** dengan skema, bunga promo, cap, subsidi, status (GRATIS/Bayar Selisih).
- Section asuransi tampil rincian: Premi Gross, Cap, Subsidi Bank, Beban Debitur.
- Catatan kaki: "Pelunasan dipercepat/top up ≤ 1 tahun wajib mengganti premi AJK yang telah disubsidi bank."

### Halaman konfigurasi admin
`/konfigurasi/program-cerdas` — form edit `cerdas_config` (periode, bunga, cap tier, diskon provisi). Dilindungi role admin.

### Yang TIDAK termasuk
- Tracking total anggaran subsidi/sisa anggaran (tidak ada data realtime), waiting list logic.
- Workflow rekap divisi/akuntansi.

---

Saya akan mulai dari migration → engine → UI → PDF → halaman config. Lanjut?
