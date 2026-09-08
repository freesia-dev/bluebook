# Migrasi Bluebook Telihan: Lovable Cloud → Supabase sendiri + Cloudflare Pages

Dokumen ini rangkuman audit repo `freesia-dev/bluebook` plus progres migrasi
lepas dari Lovable Cloud, tapi project tetap jalan normal. **Update terakhir:
8 Sep 2026** — schema sudah direplay ke project Supabase baru, BIRU sudah
dihapus dari aplikasi, dan repo GitHub sudah ditambahin akses tapi push masih
kegagal (lihat bagian 5).

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

Progres saat ini:

1. ✅ **Export data dari Lovable Cloud** — sudah dijalankan lewat
   **More → Cloud → Overview → Settings → Advanced settings → Export Lovable
   Cloud data**. Hasilnya file `bluebook_260908.backup` (~17MB) sekarang ada
   di Cloud Storage Lovable (bucket `database_export_08_09_26`).
2. ⏳ **Download + proses file backup itu** — masih perlu izin kamu buat
   didownload dari sana, baru bisa diolah datanya (ini juga jadi sumber data
   user lama, lihat poin 4).
3. ⏳ **Import isi tabel** ke project Supabase baru dari hasil backup.
4. ⏳ **29 user (Supabase Auth)** — kamu sudah pilih: dibuat ulang manual
   dengan password default **`capem143`** untuk semua, TAPI dengan ID
   (UUID) yang **sama persis** seperti akun lama (bukan ID acak baru).
   Ini penting karena tabel `profiles`, `user_roles`, dan beberapa tabel
   data (surat masuk/keluar, SPPK, PK, agenda kredit, dll) menyimpan
   referensi ke ID user itu buat catatan "siapa yang input/approve" — kalau
   ID-nya beda, riwayat itu jadi tidak nyambung pas data lama diimport.
   ID lama ini yang akan diambil dari file backup di poin 1-2, jadi tidak
   perlu kamu list manual satu-satu.
5. ⏳ **File storage** (bucket `documents` — dokumen security, lampiran call
   memo, dll): dari sidebar Cloud Lovable yang sama, download semua file dari
   **Storage**, lalu upload ke **Storage** project Supabase baru.
6. ⏳ **Auth providers/redirect URL** — di project Supabase baru: Authentication
   → Providers, aktifkan ulang metode login yang dipakai (email/password dll)
   dan update redirect URL ke domain production yang baru.

## 4. Deploy edge functions ke project baru

```bash
supabase functions deploy admin-create-user
supabase functions deploy admin-get-user
supabase functions deploy admin-reset-password

# SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY sudah otomatis tersedia di semua
# edge function, tidak perlu di-set manual — tidak ada secret tambahan yang
# perlu di-set sejak BIRU dihapus.
```

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

## 6. Frontend ke Cloudflare Pages

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
4. Deploy. File `public/_redirects` bikin semua route React Router (misal
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
3. Deploy edge functions (bagian 4).
4. Deploy ke Cloudflare Pages pakai domain `*.pages.dev` dulu, test semua
   fitur (login, upload MLF, dll) — **project lama tetap online** selama
   proses ini jadi tidak ada downtime buat pemakai sehari-hari.
5. Kalau sudah lolos test, baru migrasi data isi + user (bagian 3) + file
   storage dari project lama ke baru — idealnya dilakukan pas jam sepi biar
   tidak ada transaksi baru yang "hilang" di antara waktu export dan cutover.
6. Ganti custom domain ke Cloudflare Pages (bagian 7).
7. Setelah dipastikan stabil beberapa hari, baru boleh biarkan Lovable Pro
   lapse / hapus project dari Lovable.

## 9. Yang masih perlu dari kamu

- Izin download file `bluebook_260908.backup` (~17MB) dari Cloud Storage
  Lovable, biar bisa mulai proses import data + ambil daftar user lama.
- Cek pengaturan task/session Claude ini buat nyoba nambahin
  `freesia-dev/bluebook` sebagai source (kalau ketemu), **atau** bilang aja
  kalau lebih mau terima perubahan kode sebagai file/patch buat di-push manual.
- Setup Cloudflare Pages (bagian 6) — belum dimulai, tinggal tunggu giliran.
- Nanti di akhir: konfirmasi eksplisit buat cutover domain (bagian 7/8) —
  ini yang paling terakhir dan langsung berdampak ke pemakai sehari-hari.
