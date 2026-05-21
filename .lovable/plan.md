## Fitur: Call Memo Penagihan

Catatan aktivitas penagihan yang **bisa auto-fill dari data MLF/kontak debitur** ATAU **diisi manual sepenuhnya** (untuk debitur yang tidak ada di MLF, misal walk-in / debitur lama). Setiap memo bisa dicetak sebagai dokumen formal dengan kop bank lengkap & lampiran foto/screenshot.

---

### 1. Database (1 tabel baru)

**Tabel `call_memo_penagihan`:**
- `nomor` (auto-increment, untuk format dokumen)
- `tanggal`, `jam`
- `l0lnno` (nullable) — link opsional ke MLF; kosong = manual
- `nama_debitur`, `no_hp`, `no_rek`, `produk` — auto-fill MLF atau manual, semua editable
- `tunggakan_pokok`, `tunggakan_bunga`, `total_tunggakan` — editable
- `jenis_aktivitas` — `call` | `wa` | `kunjungan` | `surat_peringatan` | `lainnya`
- `hasil` (text), `janji_bayar_tanggal`, `janji_bayar_nominal`
- `status_komitmen` — `belum_ada` | `janji_bayar` | `sudah_bayar` | `ingkar_janji` | `negosiasi`
- `petugas_penagih`, `saksi` (nullable)
- `lampiran_urls` (jsonb array) — URL bukti
- `catatan_tambahan`
- standar: `id`, `created_at`, `created_by`

**RLS:** pola sama dengan tabel lain (auth read, non-demo insert/update, admin delete). Trigger `log_activity` + recycle bin + auto-renumber.

**Storage:** reuse bucket `documents` dengan prefix `call-memo/{memo_id}/`, max 5MB/file (jpg/png/pdf).

---

### 2. UI — Tab baru di `ReminderTunggakanPage`

Bungkus halaman existing dengan `Tabs`:
- **Tab "Kirim Reminder"** — halaman existing (tidak diubah).
- **Tab "Riwayat Penagihan / Call Memo"** — baru.

**Tab Call Memo berisi:**
- Tabel riwayat (filter: tanggal, petugas, status komitmen, jenis aktivitas, search nama/no rek).
- Tombol **"+ Buat Call Memo"** → dialog form.
- Aksi per row: detail, edit, **cetak**, hapus (admin).

**Dialog Form:**
- Toggle **"Pilih dari MLF"** ↔ **"Isi manual"**.
  - Mode MLF: combobox cari `l0lnno`/nama → auto-fill (semua tetap editable).
  - Mode manual: kosong, isi sendiri.
- Tanggal/jam (default sekarang, bisa backdate).
- Jenis aktivitas, hasil, janji bayar, status komitmen (badge berwarna).
- Petugas (default user login), saksi (opsional).
- **Upload bukti**: multi-file drag & drop, preview thumbnail.
- Catatan tambahan.

**Bonus:** di tab Kirim Reminder existing, tambah tombol kecil **"+ Call Memo"** per row → buka dialog dengan data debitur sudah terisi.

---

### 3. Dokumen Cetak — Call Memo Formal

Route baru `/monitoring/call-memo/print?id=...` — A4 Times New Roman 11pt, mirip BA ATM Telihan.

**Kop Surat (wajib ada di semua BA cetak):**

```
[LOGO bankaltimtara]   PT. BPD KALIMANTAN TIMUR DAN KALIMANTAN UTARA
                       KANTOR CABANG PEMBANTU TELIHAN
                       Jl. Letjend S. Parman No. 14-15 — Kota Bontang 75383
                       Telp: 0548 - 26567  |  Email: kcp.telihan@bankaltimtara.co.id
                       www.bankaltimtara.co.id
─────────────────────────────────────────────────────────────────────
```

- Logo dari `src/assets/logo-bankaltimtara.png` (perlu di-copy dari upload saat masuk build mode).
- Garis horizontal pembatas di bawah kop.
- Komponen kop dibuat reusable: `src/components/print/KopSuratBank.tsx` — supaya bisa dipakai juga untuk BA ATM ke depan jika perlu konsistensi.

**Body dokumen:**
- Judul tengah: **"CALL MEMO PENAGIHAN KREDIT"** + nomor memo (mis. `001/CM-PNG/KCP-TLH/2026`).
- Tabel identitas debitur (Nama, No Rek, Produk, No HP).
- Tabel rincian tunggakan (Pokok, Bunga, Total).
- Narasi: "Pada hari …, tanggal …, pukul …, telah dilakukan penagihan via {jenis_aktivitas} dengan hasil sebagai berikut: …"
- Janji bayar (jika diisi).
- **Lampiran bukti**: gambar di-embed di halaman setelahnya dengan caption.
- Tanda tangan: petugas penagih + saksi (jika ada) + tanggal cetak.
- Footer kecil: "Dicetak dari Bluebook Telihan".

**Cetak:** `window.print()` + CSS `@media print` (page A4, margin 2cm, logo & garis tampil di setiap halaman via CSS print header).

---

### 4. Permission

Mengikuti `role-permissions.ts`:
- View: semua role dengan akses Monitoring KKR & NPL.
- Create/Edit: non-demo, non-pemimpin.
- Delete: admin only.

---

### Files to create/edit

**Database (1 migration):**
- Tabel `call_memo_penagihan` + RLS + trigger renumber/log/recycle.

**Assets:**
- Copy `user-uploads://Logo_Bankaltimtara.png` → `src/assets/logo-bankaltimtara.png`.

**Frontend baru:**
- `src/hooks/use-call-memo.ts`
- `src/components/print/KopSuratBank.tsx` — kop reusable (logo + alamat KCP Telihan).
- `src/components/monitoring/CallMemoDialog.tsx` — form hybrid + uploader.
- `src/components/monitoring/CallMemoTable.tsx` — tabel riwayat + filter.
- `src/pages/monitoring/CallMemoPrintPage.tsx` — dokumen A4 print.

**Frontend edit:**
- `src/pages/monitoring/ReminderTunggakanPage.tsx` — wrap dengan `Tabs`, tambah tab Riwayat + tombol "+ Call Memo" per row reminder.
- `src/App.tsx` — route `/monitoring/call-memo/print`.

---

### Catatan
- Logo & data kantor tersimpan di komponen `KopSuratBank` (single source of truth) — bisa dipakai ulang untuk dokumen formal lain di masa depan.
- Lampiran ikut ke recycle bin (URL tersimpan di JSONB), file fisik di storage tetap.
- Status komitmen pakai badge interaktif (pola yang sama dengan badge status existing) — klik untuk update cepat dari tabel.