# Migrasi Bluebook Telihan: Lovable Cloud → Supabase sendiri + Cloudflare Pages

Dokumen ini rangkuman audit repo `freesia-dev/bluebook` (per 8 Sep 2026) plus
langkah konkret buat lepas dari Lovable Cloud tapi project tetap jalan normal.

## 1. Apa saja yang sebenarnya nempel ke Lovable

Sudah aku telusuri seluruh source code-nya. Kabar baiknya: coupling ke Lovable
jauh lebih tipis dari yang mungkin dikira, karena project ini sudah pakai
setup Supabase standar (bukan API proprietary Lovable) dan seluruh riwayat
schema database-nya sudah otomatis tersimpan sebagai file SQL di repo:

| Bagian | Status | Perlu diapain |
|---|---|---|
| `src/integrations/supabase/client.ts` | Supabase client standar, cuma baca `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` dari env | Ganti nilai env ke project Supabase baru |
| `supabase/migrations/*.sql` (61 file) | Riwayat lengkap schema — tabel, RLS policy, function, trigger, storage bucket `documents` | Replay ke project baru pakai Supabase CLI (`supabase db push`) — **tidak perlu export manual schema dari dashboard Lovable** |
| `supabase/functions/admin-*` (3 edge function) | Deno standar, cuma pakai `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` (env bawaan Supabase, otomatis ada di semua project Supabase) | Deploy apa adanya ke project baru, tidak ada perubahan kode |
| `supabase/functions/biru-chat` (asisten BIRU) | **Satu-satunya bagian yang benar-benar butuh Lovable**: manggil `ai.gateway.lovable.dev` pakai `LOVABLE_API_KEY` | **Sudah aku ubah** — sekarang bisa pilih provider lewat env var `AI_PROVIDER` (lihat bagian 4) |
| `previewAuthStorage.ts`, `pwa-registration.ts` | Cuma deteksi domain preview Lovable (`*.lovableproject.com` dll), fallback otomatis ke `localStorage` biasa di domain lain | Tidak perlu diubah, otomatis aman begitu di-hosting di domain sendiri |
| `vite.config.ts` (`lovable-tagger`) | Cuma aktif pas `mode === "development"` | Tidak muncul di production build, aman dibiarkan |
| Data debitur/user yang SUDAH ada di database (bukan schema-nya, tapi isinya) | Tidak ada di repo — cuma ada di database Postgres yang dikelola Lovable Cloud | Perlu di-export manual dari dashboard Lovable Cloud (lihat bagian 3) |
| File yang sudah ke-upload ke bucket `documents` (foto BA, dokumen security, dll) | Tidak ada di repo — fisiknya di Supabase Storage | Perlu disalin manual (lihat bagian 3) |

Yang sudah aku ubah di repo (belum di-push — lihat bagian 6):
- `public/_redirects` — biar routing React Router (SPA) jalan normal di Cloudflare Pages
- `.env.example` — template variable yang wajib diisi ulang
- `supabase/functions/biru-chat/index.ts` — provider AI sekarang bisa dipilih (default OpenRouter, bisa balik ke Lovable sementara lewat `AI_PROVIDER=lovable`)

## 2. Bikin project Supabase baru (punya sendiri, bukan punya Lovable)

1. Daftar/login di https://supabase.com/dashboard pakai akun sendiri.
2. New Project → kasih nama (misal `bluebook-telihan-prod`), pilih region terdekat
   (Singapore paling deket ke Bontang), catat **Database Password** yang dibuat.
3. Setelah project jadi, catat 3 hal ini dari Settings → API:
   - Project URL (`https://<ref>.supabase.co`)
   - `anon` `public` key
   - `service_role` key (rahasia, jangan taruh di frontend)
   - Project Reference ID (`<ref>`)

## 3. Pindahin schema + data + file dari project lama

**Koreksi penting dari versi awal dokumen ini:** aku sempat nulis cara
`pg_dump` pakai connection string langsung ke database lama — ternyata itu
**tidak bisa dipakai** untuk project Lovable Cloud. Sudah aku cek ke
dokumentasi resmi Supabase & Lovable: project Supabase yang dikelola Lovable
Cloud (project ref `xcoonownhvsnsljxwumi`, keliatan dari `.env` di repo)
**"provisioned and managed entirely by Lovable"** dan tidak muncul di
dashboard Supabase kamu sendiri — jadi tidak ada password database atau
connection string Postgres yang bisa diambil langsung. Tidak ada migrasi
satu-klik juga; ini official dari Lovable sendiri.

Jalur resmi yang dikasih Lovable (dari `docs.lovable.dev`):

1. **Bikin project Supabase baru** (bagian 2 di atas), catat Project ID,
   Project URL, dan `anon` public key.
2. **Replay schema** — dua pilihan, hasilnya sama:
   - Cara CLI (lebih cepat, tidak perlu copas 61 file satu-satu):
     ```bash
     npm install -g @supabase/cli
     supabase login
     supabase link --project-ref <ref-project-baru>
     supabase db push
     ```
   - Atau cara manual sesuai dokumentasi Lovable: buka tiap file di
     `supabase/migrations/` **berurutan sesuai nama file (tanggalnya sudah
     urut)**, copy isi SQL-nya, paste & jalankan satu-satu di **SQL Editor**
     project Supabase baru.
3. **Export data dari Lovable Cloud** — di editor project Lovable:
   **More → Cloud → Overview → Settings (ikon gear) → Advanced settings →
   Export Lovable Cloud data → tombol "Export"**. Dari screenshot yang kamu
   kirim, tinggal klik **Settings** di sidebar Cloud itu (di bawah "Usage"),
   lalu cari **Advanced settings**.
4. **Import hasil export itu** ke project Supabase baru — Lovable tidak
   menjelaskan detail format file exportnya di dokumentasi publik, jadi pas
   kamu sudah download hasil export-nya, kirim ke aku (atau kasih tahu
   formatnya apa — `.sql`, `.csv`, `.zip`, dll) biar aku bantu proses import-nya
   sesuai bentuk filenya.
5. **File storage** (bucket `documents` — dokumen security, lampiran call
   memo, dll): dari sidebar Cloud yang sama, klik **Storage → download**
   semua file, lalu upload ke **Storage** di project Supabase baru (lewat
   dashboard, atau `@supabase/supabase-js` kalau jumlahnya banyak — kasih
   tahu kira-kira berapa banyak/besar, nanti aku siapkan skripnya).
6. **User login (Supabase Auth, keliatan "29 Signups" di screenshot kamu)**
   — ini yang paling perlu dicek pelan-pelan, karena tidak jelas dari
   dokumentasi apakah akun Auth ikut ke dalam "Export data" di atas atau
   tidak. Kalau ternyata tidak ikut, opsi paling gampang: minta tiap admin
   bikin ulang akunnya lewat menu Konfigurasi > Users di Bluebook (pakai
   edge function `admin-create-user` yang sudah ada) — dengan 29 user itu
   masih realistis dikerjain manual dalam sekali duduk.
7. **Auth providers/redirect URL** — di project Supabase baru: Authentication
   → Providers, aktifkan ulang metode login yang dipakai (email/password dll)
   dan update redirect URL ke domain production yang baru.

Kalau kamu sudah nyampe ke langkah Export data / Storage / Users di atas dan
ada yang beda tampilannya dari yang aku sebutkan (Lovable sering update UI),
kirim screenshot-nya aja, nanti aku sesuaikan.

## 4. Pilih provider AI buat BIRU (asisten chat)

`biru-chat` sekarang default ke **OpenRouter** (endpoint OpenAI-compatible,
model tetap `google/gemini-2.5-flash`, cek nama model terbaru di
openrouter.ai/models karena penamaan kadang berubah):

1. Daftar di https://openrouter.ai, top-up credit secukupnya, generate API key.
2. Nanti di edge function secret, set `OPENROUTER_API_KEY` (lihat bagian 5).

Kalau mau tetap pakai Lovable AI Gateway dulu sementara (karena sudah ada
credit di sana dan belum mau top-up OpenRouter), tinggal set secret
`AI_PROVIDER=lovable` dan `LOVABLE_API_KEY=<key-dari-lovable>` — kode sudah
support dua-duanya, tinggal pilih kapan mau pindah sepenuhnya.

## 5. Deploy edge functions ke project baru

```bash
supabase functions deploy admin-create-user
supabase functions deploy admin-get-user
supabase functions deploy admin-reset-password
supabase functions deploy biru-chat

# set secrets (SUPABASE_URL & SUPABASE_SERVICE_ROLE_KEY sudah otomatis
# tersedia di semua edge function, tidak perlu di-set manual)
supabase secrets set OPENROUTER_API_KEY=sk-or-...
# atau kalau masih pakai Lovable:
# supabase secrets set AI_PROVIDER=lovable LOVABLE_API_KEY=...
```

## 6. Frontend ke Cloudflare Pages

Karena aku belum punya akses push ke repo `freesia-dev/bluebook` (butuh kamu
tambahkan repo ini ke daftar repo yang diizinkan untuk session ini, atau aku
kirim perubahan sebagai patch file yang tinggal kamu apply/commit sendiri —
mana pun lebih gampang, bilang aja), tapi untuk deploy-nya:

1. Di Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git
   → pilih repo `freesia-dev/bluebook`.
2. Build settings:
   - Framework preset: Vite
   - Build command: `npm run build` (atau `bun run build` kalau mau pakai Bun,
     repo ini punya `bun.lock` juga)
   - Build output directory: `dist`
3. Environment variables (Settings → Environment variables, untuk Production
   & Preview) — isi dengan nilai dari project Supabase BARU:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_SUPABASE_PROJECT_ID`
4. Deploy. File `public/_redirects` yang sudah aku tambahkan otomatis bikin
   semua route React Router (misal `/monitoring/upload`) tetap kebuka pas
   di-refresh langsung (tanpa ini biasanya muncul 404 di static hosting).

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

1. Bikin project Supabase baru (bagian 2) — tidak ganggu yang lama sama sekali.
2. `supabase db push` ke project baru (bagian 3) — masih tidak ganggu yang lama.
3. Deploy edge functions + set secrets (bagian 5).
4. Deploy ke Cloudflare Pages pakai domain `*.pages.dev` dulu, test semua
   fitur (login, upload MLF, BIRU chat, dll) — **project lama tetap online**
   selama proses ini jadi tidak ada downtime buat pemakai sehari-hari.
5. Kalau sudah lolos test, baru migrasi data isi (Export data dari Lovable
   Cloud + import) + file storage dari project lama ke baru — idealnya
   dilakukan pas jam sepi biar tidak ada transaksi baru yang "hilang" di
   antara waktu export dan cutover.
6. Ganti custom domain ke Cloudflare Pages (bagian 7).
7. Setelah dipastikan stabil beberapa hari, baru boleh biarkan Lovable Pro
   lapse / hapus project dari Lovable.

## 9. Yang masih perlu dari kamu

- Hasil klik **Settings → Advanced settings → Export Lovable Cloud data**
  di Lovable (bagian 3, langkah 3) — kirim file hasil export-nya atau kasih
  tahu formatnya apa.
- Konfirmasi apakah 29 user (Auth) di atas ikut ter-export atau tidak (baru
  ketahuan pas kamu buka menu export-nya).
- Keputusan: OpenRouter atau tetap Lovable Gateway dulu buat BIRU (bagian 4)
  — apalagi credit Lovable kamu keliatan udah mepet di screenshot tadi.
- Konfirmasi: repo boleh aku push langsung (perlu ditambahin ke session ini),
  atau kamu lebih suka aku kirim sebagai patch/zip yang di-apply manual.
