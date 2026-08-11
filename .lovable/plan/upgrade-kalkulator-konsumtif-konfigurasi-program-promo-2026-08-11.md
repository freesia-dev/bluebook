# Upgrade Kalkulator Konsumtif, Konfigurasi & Program Promo

## 1. Hero card Dashboard Loan Monitoring
Kartu KPI (Rasio NPL / KKR) saat ini punya tinggi tetap sehingga terlihat kosong.
Ubah jadi tinggi mengikuti isi (auto height), grid responsif, ukuran angka memakai skala
`clamp()` agar proporsional di layar kecil maupun besar, dan ikon watermark diperkecil
mengikuti kartu.

## 2. Konfigurasi kalkulator disatukan
Gabungkan 4 halaman terpisah (Produk Kalkulator, Usia Pensiun, Program CERDAS, Promo)
menjadi satu halaman `Konfigurasi Kalkulator` dengan tab:

```text
[ Produk & Biaya ] [ DSR & Karir ] [ Daftar AO ] [ Program Promo ]
```

Route lama tetap ada tapi diarahkan ke tab yang sesuai. Menu sidebar dipangkas jadi satu entri.

### Yang berubah di konfigurasi
- **Biaya**: field `Biaya Notaris` dan `Biaya Perikatan` dihapus sebagai field tetap. Diganti
  daftar biaya dinamis per produk (nama biaya + nominal, bisa tambah/hapus baris).
  Data lama notaris/perikatan otomatis dipindah jadi dua baris biaya saat pertama dibuka.
- **Daftar AO**: tabel nama AO (tambah/edit/hapus/aktif) — dipakai kalkulator sebagai dropdown.
- **Aturan DSR**: per produk kredit bisa diatur kategori DSR (GAJI / TTP) beserta persentase
  maksimalnya, jadi saat produk dipilih di kalkulator, DSR langsung menyesuaikan otomatis.
- **Program Promo**: CERDAS tidak lagi hard-coded. Menjadi satu daftar program promo yang
  bisa diberi nama, periode, skema (Debitur Baru / Take Over / Top Up), bunga per skema,
  tier plafon + cap subsidi premi, dan diskon provisi. CERDAS jadi baris pertama di daftar ini.

## 3. Kalkulator konsumtif — input baru
- Hapus input biaya notaris & perikatan, ganti dengan daftar biaya dari konfigurasi produk
  (nilai bisa ditimpa manual per simulasi).
- `Nama AO` jadi dropdown dari daftar AO.
- **Angsuran Gaji (jika ada)** — checkbox + nominal. Bila nominal melebihi Gaji Pokok,
  muncul teks selisihnya. Selisih ini (**Selisih AG**) menjadi pengurang DSR TTP.
- **Angsuran Praja (jika ada)** — checkbox + nominal (**AP**), juga pengurang DSR TTP.

## 4. Rumus DSR baru
```text
DSR GAJI : batas angsuran = Gaji Pokok (100%), TTP tidak menambah batas
DSR TTP  : batas angsuran = (TTP x 30%) - Selisih AG - AP
           Selisih AG = max(0, Angsuran Gaji - Gaji Pokok)
```
Persentase 30% diambil dari konfigurasi (bisa diubah). Rumus ini dipakai di badge DSR,
tombol Hitung Max Plafon, hasil JPG/PDF, dan halaman Riwayat.

## 5. Tata letak kalkulator dibuat berbasis tab
Agar tidak perlu scroll panjang, kolom input dipecah jadi tab, sementara panel hasil
di sebelah kanan tetap terlihat (sticky) sepanjang proses:

```text
+---------------------------------+------------------+
| [Debitur] [Kredit] [Penghasilan]|                  |
| [Biaya & Promo]                 |   RINCIAN HASIL  |
|                                 |   (selalu tampil)|
|  ...field tab aktif...          |   angsuran, DSR, |
|                                 |   potongan, dll  |
|        < Kembali   Lanjut >     |                  |
+---------------------------------+------------------+
```
Tab menandai bagian yang belum lengkap, dan tombol Lanjut/Kembali memandu urutan pengisian.

## 6. Menu terkait yang ikut disesuaikan
Riwayat Simulasi (tampilan, edit, export JPG/PDF/Excel), Pipeline, dan Kalkulator Produktif
mengikuti struktur biaya dinamis, dropdown AO, dan program promo baru agar hasilnya konsisten.

## Catatan teknis
- Tabel baru: `loan_ao` (daftar AO), `loan_promo_program` (menggantikan `cerdas_config`
  sebagai program multi-entri; data CERDAS dimigrasi ke sana).
- `loan_product_config` mendapat kolom `biaya_items` (jsonb) dan `dsr_rules` (jsonb);
  kolom `biaya_notaris`/`biaya_perikatan` disimpan sementara untuk kompatibilitas data lama.
- `loan_simulation` mendapat kolom `biaya_items`, `angsuran_gaji`, `angsuran_praja`,
  `dsr_basis`, `dsr_max_pct` agar simulasi lama tetap terbaca dan yang baru tersimpan utuh.
- Semua tabel baru memakai RLS + GRANT mengikuti pola role yang ada (`can_use_loan_calc`,
  admin untuk tulis konfigurasi).
