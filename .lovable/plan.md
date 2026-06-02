
# Kalkulator Loan & Simulasi Angsuran (Revisi)

## Alur

```text
[Konfigurasi Produk + Usia Pensiun]
            │ (admin)
            ▼
[Form Kalkulator] ─► [Auto-hitung pensiun, DSR, angsuran]
            │
            ▼
[Ringkasan + Tabel Angsuran] ─► [Simpan / Excel / PDF tanpa kop]
            │
            ▼
[Riwayat Simulasi]
```

## Field Input Kalkulator

**Data Calon Debitur**
- Nomor KTP (16 digit)
- Nama calon debitur
- Tanggal lahir → otomatis hitung umur
- Pekerjaan, Instansi
- Pilihan Karir: PNS Fungsional / PNS Struktural / PPPK Penuh Waktu / PPPK Paruh Waktu / Pensiunan
- **Waktu pensiun (auto):** umur pensiun (dari konfigurasi per karir) − umur sekarang → tampil "Sisa X tahun Y bulan" + tanggal pensiun.

**Data Pinjaman**
- Produk kredit (dropdown — auto-isi rate default)
- Plafon pengajuan
- Jangka waktu (bulan) — **warning kuning** jika melebihi sisa bulan ke pensiun, tapi tetap bisa lanjut
- Gaji bersih per bulan
- Rate bunga (dropdown dari preset produk + opsi "Manual")
- Asuransi (dropdown preset + manual)
- Provisi % (dropdown preset + manual)
- ☐ Ada pelunasan? → jika dicentang, muncul input "Pelunasan di bulan ke-?" → hitung sisa pokok + bunga berjalan
- Nama AO

**Helper otomatis:**
- **Max plafon by DSR** — input DSR target (default 40%), tombol "Hitung Max Plafon" → reverse-calc dari gaji × DSR / angsuran per juta.
- **Indikator DSR** real-time: angsuran/gaji → badge hijau (≤40%), kuning (40–50%), merah (>50%).

## Konfigurasi (Admin)

**1. Produk Kredit Kalkulator** (`loan_product_config`)
- Nama produk, skema (anuitas/efektif/sliding), max tenor
- **Rate preset (jsonb)**: array `[{label: "Bunga 10%", value: 10}, ...]` untuk bunga, asuransi, provisi
- Biaya tetap: notaris, perikatan, blokir angsuran (0/1/2)

**2. Aturan Usia Pensiun** (`pension_rule`)
- Pilihan karir → usia pensiun (int)
- Default seed: Fungsional 60, Struktural 58, PPPK Penuh Waktu 58, PPPK Paruh Waktu 58, Pensiunan 75. Admin bebas ubah.

## Output

**Ringkasan:**
- Nama, KTP, Karir, Pensiun (tanggal & sisa bulan)
- Plafon · Tenor · Skema · Bunga · Asuransi · Provisi
- Angsuran/bulan · Total angsuran · Total bunga
- Potongan di muka (asuransi + provisi + notaris + perikatan + blokir) · Dana diterima
- DSR badge · Pelunasan di bulan ke-N (jika dicentang)

**Tabel Angsuran:** No | Bulan | Tanggal | Pokok | Bunga | Angsuran | Saldo Pokok

**Export:** Excel (.xlsx) + PDF biasa tanpa kop. Header PDF: nama debitur, AO, tanggal cetak.

## Akses
- **Kalkulator:** semua role login kecuali `security`, `ob`, `teller`, `cs`.
- **Konfigurasi produk & usia pensiun:** admin only.
- Demo user: bisa simulasi, tidak bisa simpan.

## Bagian Teknis

**Migrasi DB (3 tabel + 1 enum):**

```sql
-- enum
CREATE TYPE loan_skema AS ENUM ('anuitas','efektif','sliding');

-- 1. Produk
CREATE TABLE loan_product_config (
  id uuid PK,
  nama text, skema loan_skema, max_tenor_bulan int,
  bunga_options jsonb,        -- [{label,value}]
  asuransi_options jsonb,
  provisi_options jsonb,
  biaya_notaris bigint, biaya_perikatan bigint,
  blokir_angsuran int default 0,
  is_active bool, urutan int,
  created_at, updated_at
);

-- 2. Aturan pensiun
CREATE TABLE pension_rule (
  id uuid PK,
  pilihan_karir text UNIQUE,
  usia_pensiun int
);

-- 3. Simulasi
CREATE TABLE loan_simulation (
  id uuid PK,
  -- debitur
  nomor_ktp text, nama_debitur text, tanggal_lahir date,
  pekerjaan text, instansi text, pilihan_karir text,
  -- pinjaman
  product_id uuid FK, plafon bigint, tenor_bulan int,
  gaji bigint, bunga_pa numeric, asuransi_pct numeric, provisi_pct numeric,
  ada_pelunasan bool, pelunasan_bulan_ke int,
  nama_ao text,
  -- hasil cache
  hasil_ringkasan jsonb, tabel_angsuran jsonb,
  created_by uuid, created_at
);
```
RLS: read authenticated, insert/update non-demo & bukan role security/ob/teller/cs, delete admin/owner. Konfigurasi tabel: write admin only. GRANT lengkap di tiap migrasi.

**Frontend:**
- `src/lib/loan-calc.ts` — `calcAnuitas`, `calcEfektif`, `calcSliding`, `calcPensiun(tglLahir, usiaPensiun)`, `calcMaxPlafonByDSR(gaji, dsr, ...)`.
- `src/lib/validation/loan.ts` — schema zod (KTP 16 digit, plafon > 0, dst).
- `src/hooks/use-loan-calc.ts` — React Query untuk products, pension rules, simulations.
- `src/pages/kalkulator/KalkulatorPage.tsx` — form + ringkasan + tabel + export.
- `src/pages/kalkulator/RiwayatPage.tsx` — list simulasi tersimpan.
- `src/pages/konfigurasi/ProdukKalkulatorPage.tsx` — CRUD produk + preset rate.
- `src/pages/konfigurasi/UsiaPensiunPage.tsx` — CRUD aturan pensiun.
- Route baru di `App.tsx`, menu di `Sidebar.tsx`, permission di `role-permissions.ts`.

## Tidak termasuk
- OCR KTP otomatis (KTP manual input).
- Generate PDF dengan kop bank.
- Integrasi ke modul Nomor Loan / PK.
- Halaman public untuk calon debitur.

Klik Implement Plan kalau setuju — aku langsung bikin migrasi DB-nya dulu (3 tabel + seed produk awal + seed aturan pensiun), baru lanjut halaman & form.
