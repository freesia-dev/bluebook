# Migrasi Bluebook Telihan: Lovable Cloud → Supabase sendiri + Cloudflare Pages

Dokumen ini rangkuman audit repo `freesia-dev/bluebook` plus progres migrasi
lepas dari Lovable Cloud, tapi project tetap jalan normal. **Update terakhir:
8 Sep 2026** — schema, data (51 tabel, 5.805 baris), 29 user Auth, dan
seluruh 356 file storage (~995 MB) sudah pindah ke project Supabase baru;
3 edge function sudah di-deploy dan CORS-nya sudah ditambahin buat domain
Cloudflare Pages; Auth Site URL/Redirect URL sudah di-set; testing di
`bluebook-d10.pages.dev` sudah dilakukan dan tidak ketemu error. BIRU sudah
dihapus dari aplikasi. Repo GitHub sudah ditambahin akses tapi push masih
kegagal (lihat bagian 5). **Yang masih pending: cutover domain produksi
(bagian 7) — nunggu konfirmasi eksplisit kamu — dan upload ulang MLF Excel
yang kamu lakuin sendiri lewat fitur "Upload MLF" di aplikasi.**

## 1. Apa saja yang sebenarnya nempel ke Lovable

Sudah ditelusuri seluruh source code-nya. Kabar baiknya: coupling ke Lovable
jauh lebih tipis dari yang mungkin dikira, karena project ini sudah pakai
setup Supabase standar (bukan API proprietary Lovable) dan seluruh riwayat
schema database-nya sudah otomatis tersimpan sebagai file SQL di repo:

| Bagian | Status | Perlu diapain |
|---|---|---|
| `src/integrations/supabase/client.ts` | Supabase client standar, cuma baca `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` dari env | Ganti nilai env ke project Supabase baru |
| `supabase/migrations/*.sql` (61 file) | Riwayat lengkap schema — tabel, RLS policy, function, trigger, storage bucket `documents` | **Sudah direplay** ke project baru (bagian 2) |
| `supabase/functions/admin-*` (3 edge function) | Deno standar, cuma pakai `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (env bawaan Supabase, otomatis ada di semua project Supabase) | Deploy apa adanya ke project baru, tidak ada perubahan kode |
| ~~`supabase/functions/biru-chat` (asisten BIRU)~~ | Satu-satunya bagian yang benar-benar butuh Lovable (`ai.gateway.lovable.dev` + `LOVABLE_API_KEY`) | **Sudah dihapus total** atas keputusan kamu — edge function, komponen UI, dan referensinya di landing page/About sudah dibuang dari repo |
| `previewAuthStorage.ts`, `pwa-registration.ts` | Cuma deteksi domain preview Lovable (`*.lovableproject.com` dll), fallback otomatis ke `localStorage` biasa di domain lain | Tidak perlu diubah, otomatis aman begitu di-hosting di domain sendiri |
| `vite.config.ts` (`lovable-tagger`) | Cuma aktif pas `mode === "development"` | Tidak muncul di production build, aman dibiarkan |
| Data debitur/user yang SUDAH ada di database (bukan schema-nya, tapi isinya) | Sudah di-export ke file `bluebook_260908.backup` (17MB, ada di Cloud Storage Lovable) | Masih perlu didownload + di-import ke project baru (bagian 3) |
| File yang sudah ke-upload ke bucket `documents` (foto BA, dokumen security, dll) | Tidak ada di repo — fisiknya di Supabase Storage | Perlu disalin manual (bagian 3) |

Yang sudah diubah di repo (lokal, belum ke-push — lihat bagian 5):
- `public/_redirects` — biar routing React Router (SPA) jalan normal di Cloudflare Pages
- `.env.example` — template variable yang wajib diisi ulang, mengarah ke project baru
- `supabase/config.toml` — `project_id` diganti ke project baru (`mhbcxnmsgtvkudoscfhn`)
- **BIRU dihapus sepenuhnya**: `supabase/functions/biru-chat/` (edge function), `src/components/biru/BiruAssistant.tsx`, pemanggilannya di `MainLayout.tsx`, dan entri "Asisten BIRU" di landing page (`FeaturesSection.tsx`) serta halaman About

## 2. Project Supabase baru — sudah ada, sudah di-setup

Ternyata kamu udah punya project Supabase kosong yang otomatis ke-link ke
repo GitHub ini, jadi tidak perlu bikin baru:

- Nama: **bluebook**, org **Vays Studio**
- Project ref: `mhbcxnmsgtvkudoscfhn`
- Region: ap-northeast-1 (Tokyo)

Schema sudah **selesai direplay** ke project ini lewat SQL Editor (61 file
migrasi dijalankan dalam 7 batch supaya tidak kena error transaksi enum
Postgres). Hasil akhirnya sudah dicek cocok persis sama project lama:
**51 tabel, 199 RLS policy, 31 function, bucket storage `documents`.**

## 3. Pindahin data + file + user dari project lama

**Koreksi penting dari versi awal dokumen ini:** sempat ditulis cara
`pg_dump` pakai connection string langsung ke database lama — ternyata itu
**tidak bisa dipakai** untuk project Lovable Cloud (dikonfirmasi dari
dokumentasi resmi Supabase & Lovable). Project Supabase yang dikelola Lovable
Cloud (project ref lama `xcoonownhvsnsljxwumi`) **"provisioned and managed
entirely by Lovable"** dan tidak muncul di dashboard Supabase sendiri.

Progres saat ini — **semua poin di bagian ini sudah selesai**:

1. ✅ **Export data dari Lovable Cloud** — sudah dijalankan lewat
   **More → Cloud → Overview → Settings → Advanced settings → Export Lovable
   Cloud data**. Hasilnya file `bluebook_260908.backup` (~17MB) ada di Cloud
   Storage Lovable (bucket `database_export_08_09_26`) — bucket ini tidak
   jadi dipakai di jalur final (lihat poin 3), jadi masih ngendon di sana,
   tidak masalah kalau mau dihapus belakangan.
2. ✅ **29 user (Supabase Auth)** — sudah dibuat ulang di project baru
   dengan **ID (UUID) yang sama persis** seperti akun lama, supaya referensi
   di `profiles`, `user_roles`, dan tabel data lain (surat masuk/keluar,
   SPPK, PK, agenda kredit, dll) tetap nyambung. Sudah dicek: 29/29 user ada
   di `auth.users` project baru, sample email cocok sama yang lama.
3. ✅ **Import isi tabel** — seluruh 51 tabel sudah dipindah (bukan cuma
   schema-nya). Total 5.805 baris, tabel terbesar: `activity_log` (2.438),
   `security_log_entry` (1.279), `surat_keluar` (387), `sppk`/`pk` (118
   masing-masing). Tabel yang kosong (`cs_*`, `mlf_data`, `loan_promo`, dll)
   memang kosong juga di project lama — bukan gagal migrasi.
4. ✅ **File storage** (bucket `documents`) — seluruh **356 file, ~995 MB**
   sudah disalin: `call-memo` (35), `security-log/foto` (317),
   `security-log/video` (2), `surat-keluar` (1), `surat-masuk` (1). Dicek
   ulang lewat Storage API, cocok 356/356. **Catatan penting:** ini sudah
   pakai ~97% dari kuota storage 1 GB di free tier Supabase — kalau upload
   dokumen terus jalan, kemungkinan besar bakal kena limit dalam waktu
   dekat dan perlu upgrade plan.
5. ✅ **Auth providers/redirect URL** — di project Supabase baru: cuma
   Email yang aktif (sama seperti project lama, tidak ada OAuth provider
   lain yang perlu disetel ulang). Redirect URL sudah diisi 4:
   `https://bluebook-d10.pages.dev/**`, `https://bluebook-tlh.my.id/**`,
   `http://localhost:5173/**`, `http://localhost:8080/**`. Site URL diset ke
   `https://bluebook-d10.pages.dev`.

## 4. Deploy edge functions ke project baru — ✅ selesai

Ketiga function (`admin-create-user`, `admin-get-user`,
`admin-reset-password`) sudah di-deploy ke project baru lewat dashboard
Supabase (Edge Functions → Code editor → Deploy updates), karena CLI di sesi
ini tidak punya akses token buat `supabase login`. `SUPABASE_URL` &
`SUPABASE_SERVICE_ROLE_KEY` otomatis tersedia, tidak ada secret tambahan.

**Bug yang ketemu & sudah diperbaiki:** daftar `ALLOWED_ORIGINS` di
`supabase/functions/_shared/cors.ts` (dan versi yang di-inline di masing-
masing function pas deploy) awalnya cuma isi domain Lovable lama +
localhost — belum ada domain Cloudflare Pages, jadi ketiga admin function
gagal dipanggil dari `bluebook-d10.pages.dev` (browser block di tahap CORS,
sebelum request-nya nyampe ke server). Sudah ditambahin
`https://bluebook-d10.pages.dev` ke allowlist-nya di file lokal maupun di
ketiga function yang ter-deploy, dan sudah dites ulang — ketiganya sekarang
bisa dipanggil dari domain Pages (balikin `401 Unauthorized` yang benar buat
request tanpa token, bukan CORS error lagi). Domain produksi
`bluebook-tlh.my.id` sendiri sudah ada dari awal di allowlist, jadi tidak
perlu diapa-apain lagi pas cutover nanti.

## 5. Push perubahan kode ke GitHub — masih kegagal

Kamu sudah nambahin akses repo `freesia-dev/bluebook` ke GitHub App-nya,
tapi pas dicoba push lagi masih ditolak oleh git proxy sesi ini:

> access denied by the git proxy: freesia-dev/bluebook is not in this
> session's authorized repository set

Jadi ada dua lapis izin yang beda: akses GitHub App (sudah kamu tambahin)
vs. daftar "sources" khusus sesi/task Claude ini (belum nyantol otomatis).
Sementara ini opsinya:

- Kamu cek pengaturan task/session ini di app Claude (kadang di menu
  Sources/GitHub pada task) buat nambahin repo tsb secara eksplisit, **atau**
- Aku kirim semua perubahan sebagai file lengkap / patch, kamu commit &
  push manual dari komputer sendiri.

Perubahan yang menunggu untuk di-push: `public/_redirects`, `.env.example`,
`supabase/config.toml`, penghapusan seluruh kode BIRU (edge function +
komponen UI + referensi di landing/About).

## 6. Frontend ke Cloudflare Pages — ✅ selesai, sudah live & dites

Sudah live di `https://bluebook-d10.pages.dev`, connect ke project Supabase
baru (`mhbcxnmsgtvkudoscfhn`). Sudah dites: landing page, login (sesi yang
ada di browser masih nyambung ke akun Haris Fadilah, Admin IT), Dashboard +
Executive Dashboard nampilin data asli yang cocok sama hasil migrasi (Surat
Masuk 12, Surat Keluar 387, Agenda Kredit 355), Surat Masuk nampilin
12/12 data asli, role-gate ke halaman `/security/log` jalan bener (redirect
ke dashboard karena role Admin IT memang bukan role security) — tanda RLS/
role logic ikut pindah dengan benar. Tidak ada error di console browser pas
load Dashboard. Ketiga admin edge function juga sudah dicek bisa dipanggil
dari domain ini (lihat catatan CORS di bagian 4).

Untuk referensi, setup awalnya:
1. Di Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git
   → pilih repo `freesia-dev/bluebook`.
2. Build settings:
   - Framework preset: Vite
   - Build command: `npm run build` (atau `bun run build`, repo ini punya
     `bun.lock` juga)
   - Build output directory: `dist`
3. Environment variables (Settings → Environment variables, untuk Production
   & Preview) — isi dengan nilai dari project Supabase **baru**
   (`mhbcxnmsgtvkudoscfhn`):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
4. File `public/_redirects` bikin semua route React Router (misal
   `/monitoring/upload`) tetap kebuka pas di-refresh langsung (tanpa ini
   biasanya muncul 404 di static hosting).

## 7. Pindahin domain bluebook-tlh.my.id

Domain-nya dari Arenhost, saat ini di-front Cloudflare lalu diarahkan ke
Lovable Cloud. Setelah Cloudflare Pages di atas jalan dan sudah dites pakai
domain sementara (`*.pages.dev`), tinggal:

1. Di project Cloudflare Pages → Custom domains → Add `bluebook-tlh.my.id`.
2. Karena domain sudah di Cloudflare, Cloudflare akan otomatis bikin/ubah
   record DNS yang perlu (biasanya CNAME ke `<project>.pages.dev`) — tidak
   perlu ubah apa pun di sisi Arenhost.
3. Setelah propagasi (biasanya cepat karena sama-sama di Cloudflare), cek
   `bluebook-tlh.my.id` sudah serve dari Pages, baru matikan/putuskan custom
   domain yang lama di Lovable.

## 8. Urutan eksekusi yang disaranin (biar zero-downtime)

1. ✅ Project Supabase baru — sudah ada, tidak ganggu yang lama sama sekali.
2. ✅ Replay schema (bagian 2) — sudah selesai, masih tidak ganggu yang lama.
3. ✅ Deploy edge functions (bagian 4) — termasuk fix CORS buat domain Pages.
4. ✅ Deploy ke Cloudflare Pages pakai domain `*.pages.dev`, test semua fitur
   (bagian 6) — **project lama (`bluebook-tlh.my.id`) tetap online tanpa
   diganggu sama sekali** selama proses ini, jadi tidak ada downtime buat
   pemakai sehari-hari.
5. ✅ Migrasi data isi + user + file storage dari project lama ke baru
   (bagian 3) — sudah selesai dan dicek cocok.
6. ⏳ **Upload ulang MLF Excel** — kamu lakuin sendiri lewat fitur "Upload
   MLF" di aplikasi (tabel `mlf_data` di project baru masih kosong, memang
   sengaja tidak diisi dari migrasi otomatis).
7. ⏳ Ganti custom domain ke Cloudflare Pages (bagian 7) — **nunggu
   konfirmasi eksplisit kamu**, ini langkah terakhir yang langsung
   berdampak ke pemakai sehari-hari.
8. Setelah dipastikan stabil beberapa hari pasca-cutover, baru boleh
   biarkan Lovable Pro lapse / hapus project dari Lovable.

## 9. Yang masih perlu dari kamu

- **Cutover domain** (bagian 7/8) — semua persiapan teknis sudah selesai
  dan sudah dites, tinggal tunggu kamu bilang "lanjut" buat pindahin
  `bluebook-tlh.my.id` ke Cloudflare Pages.
- **Upload ulang MLF Excel** lewat aplikasi setelah cutover (atau kapan
  aja, tidak harus nunggu cutover — tabelnya independen).
- Cek pengaturan task/session Claude ini buat nyoba nambahin
  `freesia-dev/bluebook` sebagai source (kalau ketemu), **atau** bilang aja
  kalau lebih mau terima perubahan kode sebagai file/patch buat di-push
  manual — masih ada beberapa commit lokal (termasuk fix CORS di bagian 4)
  yang belum ke-push ke GitHub (lihat bagian 5).
- **Perhatian kuota storage:** project Supabase baru sudah pakai ~97% dari
  1 GB kuota storage free tier (lihat bagian 3 poin 4). Kalau pemakaian
  upload dokumen terus jalan seperti biasa, kemungkinan besar perlu upgrade
  ke plan berbayar dalam waktu tidak terlalu lama setelah cutover.
