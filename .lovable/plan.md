
## Tujuan

Menambahkan fitur untuk mengirim reminder WhatsApp ke debitur yang punya tunggakan, langsung dari modul Monitoring KKR & NPL. Petugas bisa filter bebas, pilih debitur, pakai template tersimpan, lalu kirim via WhatsApp Web/Desktop. Semua aktivitas tercatat dalam log audit.

## Struktur Database (Migrasi Baru)

**1. `debitur_kontak`** — master nomor HP debitur (persisten lintas upload MLF)
- `l0lnno` (No Rekening) — unique key
- `nama` — nama debitur (cache dari MLF terakhir)
- `no_hp` — format E.164 tanpa `+` (contoh `628123456789`)
- `catatan` — opsional
- `updated_by`, `updated_at`, `created_at`

**2. `wa_template`** — template pesan
- `nama_template` (contoh: "Reminder Halus", "Reminder Tegas KOL 3+")
- `isi` — body pesan dengan placeholder `{nama}`, `{no_rek}`, `{tunggakan}`, `{kol}`, `{produk}`, `{tungpk}`, `{tungbg}`, `{baki}`, `{ao}`
- `is_default` — boolean
- `created_by`, `created_at`, `updated_at`

**3. `wa_reminder_log`** — riwayat reminder
- `l0lnno`, `nama`, `no_hp` (snapshot saat kirim)
- `pesan` — pesan final yang dikirim (sudah render placeholder)
- `template_id` (nullable, FK soft ke wa_template)
- `metode` — enum: `wame` | `twilio`
- `status` — `opened` (wa.me dibuka), `sent` (Twilio sukses), `failed`
- `kol`, `tunggakan` — snapshot kondisi saat reminder
- `upload_id` — FK ke mlf_uploads (periode data sumber)
- `sent_by`, `sent_at`

RLS: authenticated read/insert; admin delete. Trigger `log_activity` opsional (hindari double-log karena `wa_reminder_log` sudah jadi log).

## Halaman & UI Baru

**A. Sidebar — grup "Monitoring KKR & NPL" tambah 2 menu:**
- Kontak Debitur
- Reminder Tunggakan

**B. `KontakDebiturPage`** (`/monitoring/kontak`)
- Tabel semua `l0lnno` dari upload MLF terbaru, JOIN `debitur_kontak`.
- Indikator: badge merah "Belum ada HP" untuk yang kosong; badge oranye "Punya tunggakan" untuk yang KOL ≥ 2 atau tunggakan > 0.
- Edit inline nomor HP (DebouncedInput, validasi format Indonesia: auto-normalize `08xxx` → `628xxx`).
- Filter cepat: "Hanya yang belum ada HP", "Hanya tunggakan", search nama/no rek.
- Bulk import dari Excel (opsional, kolom: `l0lnno`, `no_hp`, `catatan`).

**C. `ReminderTunggakanPage`** (`/monitoring/reminder`)
- **Panel Filter (bebas, sesuai pilihan kamu):** periode upload, KOL (multi), min tunggakan, AO, search nama. Default kosong/semua — user yang atur.
- **Tabel kandidat:** checkbox + No Rek, Nama, KOL (badge warna), Produk, Outstanding, Tunggakan, AO, No HP (atau tombol "Isi HP" inline kalau kosong), Last Reminder (tanggal terakhir dari `wa_reminder_log`).
- Row tanpa HP otomatis disabled checkbox-nya + highlight merah.
- **Panel Kanan (sticky):**
  - Dropdown pilih template (dari `wa_template`)
  - Preview pesan untuk debitur pertama yang dipilih (placeholder ter-render real-time)
  - Tombol "Edit template untuk batch ini" (override sementara, tidak menyimpan)
  - Pilihan metode kirim: `wa.me` (aktif) / `Twilio` (disabled dengan tooltip "Aktifkan di Konfigurasi")
  - Tombol **"Kirim Reminder (N debitur)"**

**D. Flow Kirim wa.me — mode Antrian (rekomendasi)**
- Klik "Kirim Reminder" → modal "Antrian Pengiriman" muncul.
- Tampilkan debitur saat ini (1 dari N), pesan final, dan tombol besar **"Buka WhatsApp & Tandai Terkirim"**.
- Klik tombol → `window.open('https://wa.me/<no_hp>?text=<encoded>', '_blank')` + insert ke `wa_reminder_log` dengan status `opened` + auto-advance ke debitur berikutnya.
- Ada tombol "Skip" dan "Batalkan Antrian".
- Setelah selesai semua → toast ringkasan: X terkirim, Y di-skip.
- Alternatif "Buka Semua Sekaligus" (popup blocker warning) — kurang direkomendasikan tapi disediakan.

**E. `KonfigurasiTemplateWA`** — sub-section di halaman Reminder (atau di Konfigurasi)
- CRUD template: nama, isi, set default.
- Tampilkan daftar placeholder yang tersedia dengan tombol "Insert".
- Live preview dengan data dummy.

## Helper / Utilities

- `src/lib/wa-utils.ts`:
  - `normalizePhoneID(input)` — `08xxx`/`+628xxx`/`628xxx` → `628xxx`
  - `renderTemplate(template, data)` — replace placeholder
  - `buildWAUrl(noHp, pesan)` — return `https://wa.me/...`
  - `formatIDRForWA(n)` — Rp 1.250.000

- `src/hooks/use-debitur-kontak.ts` — React Query: list, upsert, bulk import
- `src/hooks/use-wa-template.ts` — CRUD template
- `src/hooks/use-wa-reminder-log.ts` — list per debitur (untuk "Last Reminder"), insert

## Persiapan Twilio (struktur saja, belum aktif)

- Field `metode` di `wa_reminder_log` sudah enum `wame | twilio`.
- Edge function `send-wa-reminder` di-scaffold tapi return 501 "Twilio belum dikonfigurasi" untuk sekarang.
- Saat user nanti minta aktifkan Twilio: tinggal connect connector Twilio, isi WA Business sender number, dan ganti UI radio metode menjadi aktif. Tidak perlu refactor frontend.

## Teknis

- **Tabel `mlf_data` dipakai sebagai sumber tunggakan**, JOIN dengan `debitur_kontak` di sisi client (React Query) — sederhana, volume tidak besar.
- **Auto-cache `nama`**: ketika user pertama kali isi nomor HP, otomatis isi `nama` dari MLF terbaru. Update juga setiap kali ada upload MLF baru (trigger atau on-demand di hook).
- **Validasi nomor HP** pakai Zod: harus diawali `62`, 10-15 digit total.
- **Activity log**: insert template, edit kontak, dan kirim reminder semuanya tercatat (template & kontak via trigger `log_activity`; reminder via `wa_reminder_log` sendiri).
- **Performa**: tabel kandidat pakai useMemo untuk filter, pagination 50 row/page.

## Yang TIDAK termasuk di plan ini (bisa fase berikutnya)

- Pengiriman Twilio aktual (menunggu connect connector + persetujuan biaya)
- Scheduled reminder otomatis (cron) — fase 2
- Statistik efektivitas reminder (debitur yang bayar setelah di-reminder) — fase 2
- Reminder via SMS / Email — fase 2

## Ringkasan File yang Akan Disentuh

**Baru:**
- `supabase/migrations/...` — 3 tabel + RLS + triggers
- `src/pages/monitoring/KontakDebiturPage.tsx`
- `src/pages/monitoring/ReminderTunggakanPage.tsx`
- `src/components/monitoring/AntrianWAModal.tsx`
- `src/components/monitoring/TemplateEditor.tsx`
- `src/components/monitoring/IsiHPInline.tsx`
- `src/hooks/use-debitur-kontak.ts`
- `src/hooks/use-wa-template.ts`
- `src/hooks/use-wa-reminder-log.ts`
- `src/lib/wa-utils.ts`
- `supabase/functions/send-wa-reminder/index.ts` (scaffold untuk Twilio)

**Edit:**
- `src/App.tsx` — 2 route baru
- `src/components/layout/Sidebar.tsx` — 2 menu baru di grup Monitoring
