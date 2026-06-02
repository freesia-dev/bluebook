
# Asuransi Al-Amin + Manual Nominal + Jenis Kelamin + PDF Cantik

## 1. Field "Jenis Kelamin" di Data Calon Debitur
- Radio `Laki-laki` / `Perempuan`. Wajib.
- Disimpan ke `loan_simulation.jenis_kelamin` (`L`/`P`).
- Tampil di PDF & Excel di bagian data debitur.

## 2. Asuransi: dropdown provider

Refactor field asuransi jadi 2 mode pilihan **Provider Asuransi**:

**a. Manual** (default)
- Input satu angka: **Nominal Premi (Rp)** dengan currency formatter.
- Helper text: "Diambil dari quotation web pihak ketiga".
- Nilai ini langsung masuk `potongan.asuransi`.

**b. Al-Amin (AT TA'MIN UM)**
- Auto-compute dari Excel logic:
  - Umur = `ROUND((TglAkad − TglLahir)/365.25)`
  - Tarif = lookup matriks `alamin_tarif(umur, tenor_bulan)`
  - **Premi Gross = Tarif × Plafon / 1.000** (min Rp 5.000) → ini yang masuk potongan
  - Ujroh Gross = 10% × Premi Gross
  - Pajak = 2% × Ujroh Gross
  - Ujroh Net = Ujroh Gross − Pajak (feebase bank)
  - Premi Net = Premi Gross − Ujroh Net (bank → Al-Amin)
- Readonly card menampilkan: tarif per 1.000 UP, premi gross, ujroh net, premi net, pajak.
- Badge underwriting (Non Medis / Medis A-E / Tolak) dari tabel rule + tooltip detail.

Catatan: lookup tarif tidak butuh jenis kelamin (sesuai Excel), tapi jenis kelamin tetap dicatat sebagai data debitur.

## 3. Database

**Migrasi baru:**
- Tambah kolom di `loan_simulation`:
  - `jenis_kelamin text` (`L`/`P`, nullable)
  - `asuransi_provider text` default `manual` (`manual` | `alamin`)
  - `asuransi_nominal bigint` default 0 (premi nominal yang dipakai)
- Tambah kolom di `loan_product_config`:
  - `asuransi_provider_default text` default `manual`
- Tabel baru:
  - `alamin_tarif (umur int, tenor_bulan int, rate numeric)` PK komposit
  - `alamin_underwriting_rule (id, umur_min, umur_max, plafon_min, plafon_max, kategori, x_plus_n_max, tenor_max_bulan, urutan)`
  - `alamin_config (id, ujroh_pct=10, pajak_pct=2, premi_min=5000, x_plus_n_default=70)` — singleton
- Grants standar: SELECT `authenticated`, write admin via RLS; GRANT ALL ke `service_role`.
- Seed: matriks tarif (~25rb baris) dan 24 rule underwriting di-embed di body migrasi.

## 4. Calculation engine
- `src/lib/alamin-calc.ts`: `calcUmur`, `lookupTarif`, `calcAlamin`, `cekUnderwriting`.
- `src/lib/loan-calc.ts` → `calcPotongan` ganti `asuransiPct` → terima `asuransiNominal` langsung (cleaner). Caller hitung nominal sebelum panggil.
- Hook `useAlamin()` (React Query, cache 1 jam, tarif dinormalisasi jadi `Map<umur, Map<tenor, rate>>`).

## 5. UI KalkulatorPage
- Tambah radio Jenis Kelamin di card Data Calon Debitur.
- Refactor section Asuransi: dropdown Provider → render Manual input ATAU Al-Amin readonly breakdown + badge underwriting.
- Ringkasan: baris "Asuransi" pakai nominal aktual (manual atau premi gross Al-Amin). Untuk Al-Amin tambahkan sub-baris "Ujroh Net · Premi Net" sebagai info.

## 6. PDF Print — redesign cantik & lengkap

Pakai **jsPDF + autotable** tetap, tapi tata ulang:

**a. Kop surat Bankaltimtara** di atas (gambar logo + teks header — port dari `KopSuratBank.tsx` jadi versi PDF: logo dari import asset → `addImage`, lalu teks alamat). Garis aksen biru + oranye.

**b. Judul** "SIMULASI ANGSURAN KREDIT" + nomor simulasi ringkas + tanggal cetak.

**c. Section 1 — Data Calon Debitur** (2 kolom):
Nama, KTP, Tanggal Lahir, **Jenis Kelamin**, Pekerjaan, Instansi, Pilihan Karir, Tanggal Pensiun, Sisa Masa Kerja, Nama AO.

**d. Section 2 — Parameter Pinjaman** (2 kolom):
Produk, Skema, Plafon, Tenor, Tanggal Akad, Bunga p.a., Gaji, DSR, Provider Asuransi.

**e. Section 3 — Rincian Biaya / Potongan di Muka** (tabel head biru):
| Komponen | Dasar | Nilai |
- Asuransi — (Manual: "Input nominal" / Al-Amin: "Tarif X per 1.000 × Plafon, umur Y, tenor Z bln") — Rp
- Provisi — "X% × Plafon" — Rp
- Biaya Notaris — — Rp
- Biaya Perikatan — — Rp
- Blokir Angsuran — "N × Angsuran Pertama" — Rp
- **TOTAL POTONGAN** — — Rp (bold)
- **DANA DITERIMA** — Plafon − Total — Rp (highlighted)

**f. Section 4 — Khusus Al-Amin** (kalau provider = alamin):
breakdown Premi Gross / Ujroh Gross / Pajak / Ujroh Net / Premi Net + badge underwriting.

**g. Section 5 — Ringkasan Angsuran:**
Angsuran Pertama, Angsuran Terakhir, Total Angsuran, Total Bunga, DSR %.

**h. Section 6 — Skenario Pelunasan Dipercepat** (kalau `adaPelunasan`):
Bulan ke-N, Sisa Pokok, Bunga Berjalan, **Total Pelunasan** (highlighted), serta penghematan vs total sisa angsuran normal.

**i. Section 7 — Tabel Angsuran lengkap** (zebra rows, font 7, header biru, page-break otomatis).

**j. Footer tiap halaman**: nomor halaman + "Dicetak oleh {nama AO/user} · {timestamp}" + watermark "SIMULASI - bukan dokumen perjanjian" tipis di tengah halaman.

**k. Palet warna PDF**: header `#003F7F` (biru BPD), aksen `#F58220` (oranye BPD), zebra `#F1F5F9`. Konsisten dengan kop surat.

## Tidak termasuk
- Bulk peserta multi-row.
- Cover note polis Al-Amin.
- Provider asuransi lain (Jiwasraya dsb).
- BMI sheet.

## Konfirmasi sebelum jalan
Matriks tarif Al-Amin ~25rb baris akan **di-embed langsung di SQL migrasi** (self-contained, ~2-3 MB file SQL). OK?
