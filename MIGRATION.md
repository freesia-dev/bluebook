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

Project Supabase yang sekarang dipakai Lovable Cloud project-nya adalah
`xcoonownhvsnsljxwumi` (dari `.env` yang ada di repo). Karena project itu
dikelola Lovable, kemungkinan besar kamu tidak punya password database
langsung — ini yang perlu diambil dari dashboard Lovable (tab **Cloud** di
project editor Lovable), biasanya ada connection string Postgres di sana.
Kirim screenshot itu kapan pun kamu sudah di depan Lovable, nanti aku bantu
proses lanjutannya.

Urutan yang aman (pakai [Supabase CLI](https://supabase.com/docs/guides/cli)):

```bash
# install CLI (sekali aja)
npm install -g supabase

# login & link ke project BARU
supabase login
supabase link --project-ref <ref-project-baru>

# 1) Replay semua 61 migration -> bikin schema identik di project baru
supabase db push

# 2) Salin ISI data (bukan schema) dari project LAMA ke project BARU
#    pakai connection string masing-masing (dapat dari Settings > Database)
pg_dump "postgresql://postgres:<password-lama>@db.xcoonownhvsnsljxwumi.supabase.co:5432/postgres" \
  --data-only --exclude-schema=auth --exclude-schema=storage \
  -f data_only.sql

psql "postgresql://postgres:<password-baru>@db.<ref-baru>.supabase.co:5432/postgres" \
  -f data_only.sql

# 3) User login (akun Supabase Auth) tidak ikut ke-dump di atas.
#    Kalau user-nya sedikit, paling gampang: minta admin bikin ulang akunnya
#    lewat menu Konfigurasi > Users di Bluebook (pakai edge function admin-create-user
#    yang sudah ada). Kalau mau migrasi identik (termasuk password lama),
#    perlu export/import lewat Supabase Auth admin API — kasih tahu aku kalau
#    ini rutenya, jumlah usernya berapa.
```

Untuk file-file di bucket `documents` (dokumen security, lampiran call memo,
dll): pakai `rclone` (support S3-compatible API Supabase Storage) atau
script kecil pakai `@supabase/supabase-js` yang `list()` semua file di
project lama lalu `download()` + `upload()` ke project baru. Kasih tahu kira-
kira berapa banyak/besar filenya, nanti aku siapkan skripnya.

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
5. Kalau sudah lolos test, baru migrasi data isi (pg_dump/restore) + file
   storage dari project lama ke baru — idealnya dilakukan pas jam sepi biar
   tidak ada transaksi baru yang "hilang" di antara waktu dump dan cutover.
6. Ganti custom domain ke Cloudflare Pages (bagian 7).
7. Setelah dipastikan stabil beberapa hari, baru boleh biarkan Lovable Pro
   lapse / hapus project dari Lovable.

## 9. Yang masih perlu dari kamu

- Screenshot tab **Cloud** di Lovable (connection string / kredensial database
  lama) buat proses pg_dump di bagian 3.
- Keputusan: OpenRouter atau tetap Lovable Gateway dulu buat BIRU (bagian 4).
- Konfirmasi: repo boleh aku push langsung (perlu ditambahin ke session ini),
  atau kamu lebih suka aku kirim sebagai patch/zip yang di-apply manual.
- Perkiraan jumlah user login yang perlu dipindah (buat rencana migrasi Auth).
