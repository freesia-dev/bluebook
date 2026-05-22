## Perubahan BA Log Security

### 1. Pengelompokan periode: Malam → Pagi → Sore (1 hari kerja)

**Konsep periode**:
- 1 "periode BA" = `tanggal_periode` (date) = tanggal kalender shift Pagi & Sore.
- Shift **Malam** (00:00–08:00) di tanggal X dikelompokkan bersama **Pagi** & **Sore** tanggal X (karena malam itu kelanjutan jaga sore tanggal sebelumnya, ditutup pagi hari X).
- Urutan tampil & cetak: **Malam → Pagi → Sore**.
- BA dicetak/ditandatangani setelah shift Sore tanggal X selesai (semua 3 shift sudah komplit).

**Implementasi**:
- Tidak perlu kolom baru di DB. Cukup query: untuk `tanggal_periode = X`, ambil:
  - shift `malam` dengan `tanggal = X`
  - shift `pagi` dengan `tanggal = X`
  - shift `sore` dengan `tanggal = X`
- `BAHarianPrintPage` & `LogSecurityPage` (header daftar shift hari ini) di-sort dengan order `{ malam: 0, pagi: 1, sore: 2 }`.
- Narasi BA disesuaikan: "telah dilaksanakan pengawasan keamanan dalam 3 shift berurutan (Malam, Pagi, Sore)…".
- Nomor BA tetap pakai tanggal periode: `DDMM/BA-SEC/KCP-TLH/YYYY`.

**Note kontinuitas (UX)**:
- Saat security mulai shift **Malam** di tanggal X, otomatis pre-fill "kondisi awal" dari `kondisi_akhir` shift Sore tanggal X (jika ada handover lintas-shift). Sama untuk Pagi←Malam, Sore←Pagi.

---

### 2. Tanda tangan digital + QR verifikasi

**Alur approve oleh Pimpinan**:
1. Setelah shift Sore selesai, BA berstatus **"Menunggu Persetujuan Pimpinan"**.
2. Di halaman BA (atau notifikasi/menu khusus), user dengan role `pemimpin` melihat tombol **"Setujui & Tanda Tangani"**.
3. Saat klik: simpan `ttd_pimpinan_user_id`, `ttd_pimpinan_nama`, `ttd_pimpinan_at`, dan **token signature unik** (mis. `ba_signature_token` = uuid v4).
4. Setelah approve: blok tanda tangan menampilkan **QR code** + nama pimpinan + timestamp, menggantikan kotak ttd manual.

**Isi QR (rekomendasi: URL verifikasi publik)**:

Pilihan terbaik: QR berisi URL ke halaman verifikasi publik di app:
```
https://bluebook-tlh.my.id/verify/ba-security/{ba_signature_token}
```

Halaman `/verify/ba-security/:token` (public, tanpa login) menampilkan:
- ✅ Status: "BA Sah & Tervalidasi"
- Nomor BA, tanggal periode, 3 nama petugas shift
- Nama pimpinan penandatangan + tanggal/jam TTD
- Hash ringkas isi BA (8 char) untuk integritas

**Kenapa URL, bukan JSON mentah di QR?**
- QR JSON panjang → padat & sulit di-scan dari kertas.
- URL pendek → QR rapat & cepat di-scan dengan kamera HP biasa.
- Verifier (auditor/OJK) cukup scan → buka browser → lihat status langsung dari sumber tepercaya. Tidak bisa dipalsukan karena data datang dari DB live.
- Kalau token tidak ditemukan / BA dihapus → halaman tampilkan "❌ BA tidak valid / dibatalkan".

**Implementasi teknis**:
- Tambah kolom `ba_signature_token uuid` di `security_shift` (di-set saat approve, satu token per periode—pakai shift sore sbg "anchor", atau tambah table `security_ba` 1 row per tanggal_periode—lihat catatan teknis).
- Library QR: `qrcode.react` (sudah umum, ringan). Render `<QRCodeSVG value={verifyUrl} size={110} />` di kotak ttd pimpinan.
- Halaman verify: route public di `App.tsx`, query token via Supabase anon key (RLS: izinkan SELECT row mana saja yang `ttd_pimpinan_at IS NOT NULL` untuk anon? Atau pakai RPC `verify_ba_security(token)` SECURITY DEFINER yang return data minimal). **Pakai RPC** lebih aman.

**Catatan teknis — di mana simpan token & ttd?**
Saat ini `useSignBA` update semua shift dengan `tanggal = X`. Itu mencerminkan "BA per tanggal". Untuk pola baru, BA = 1 periode (3 shift di tanggal X). Dua opsi:

- **Opsi A (minim perubahan)**: simpan `ba_signature_token`, `ttd_pimpinan_*` di setiap row shift periode itu (3 row, nilai sama). Sudah cocok dgn pola sekarang.
- **Opsi B (lebih bersih)**: tabel baru `security_ba_harian (tanggal_periode PK, ttd_pimpinan_*, ba_signature_token, status)`. Migrasi lebih banyak tapi lebih semantik.

**Rekomendasi: Opsi A** — cepat, tidak refactor besar, sudah didukung query existing.

---

### 3. Status BA (badge di halaman cetak & list)

- `Draft` — masih ada shift `aktif` di periode itu.
- `Menunggu TTD` — 3 shift `selesai`, belum ada `ttd_pimpinan_nama`.
- `Sah` — sudah TTD pimpinan (tampilkan QR).
- `Lembur` — kalau ada shift `is_lembur=true` di periode itu (badge sekunder).

---

### Files yang akan diubah/dibuat

**Database (migration)**:
- `ALTER TABLE security_shift ADD COLUMN ba_signature_token uuid`
- RPC `verify_ba_security(token uuid)` SECURITY DEFINER → return ringkasan BA

**Frontend**:
- `src/hooks/use-security-log.ts` — sort `{malam, pagi, sore}`; `useSignBA` generate token; tambah `useBAStatus(tanggal)`.
- `src/pages/security/BAHarianPrintPage.tsx` — urutan baru, narasi baru, render QR setelah TTD, badge status di toolbar.
- `src/pages/security/LogSecurityPage.tsx` — sort kartu shift hari ini malam→pagi→sore; pre-fill kondisi awal dari shift sebelumnya.
- `src/pages/security/VerifyBAPage.tsx` *(baru)* — halaman publik `/verify/ba-security/:token`, panggil RPC.
- `src/App.tsx` — daftarkan route publik verify.
- `package.json` — tambah `qrcode.react`.

**Tidak diubah**: kop surat, struktur entry, dialog start/handover/entry, RLS existing.

---

### Pertanyaan untuk dikonfirmasi sebelum implementasi
1. Token & ttd disimpan ke 3 row shift (Opsi A) — setuju?
2. Halaman verify publik (siapa saja yang scan QR bisa lihat ringkasan BA) — oke, atau harus login dulu?
3. Notifikasi ke Pimpinan saat BA siap di-approve: cukup badge di sidebar/dashboard, atau perlu email juga?