# Rencana Migrasi Self-Hosted Bluebook (Docker + Cloudflare, Backend di Laptop)

## Tujuan
Pindahkan Bluebook dari Lovable Cloud ke infrastruktur sendiri: **frontend di Cloudflare Pages**, **backend (self-hosted Supabase) jalan di laptop via Docker**, **akses lewat Cloudflare Tunnel** (tanpa buka port / IP publik). BIRU (AI assistant) **dimatikan**.

## Prinsip penting
Bluebook menempel dalam pada ekosistem Supabase (Auth, Storage, Realtime, Edge Functions, RLS, trigger). Karena itu jalur migrasinya **bukan** "ganti Postgres biasa", tapi **"jalankan self-hosted Supabase"** — semua fitur langsung kompatibel tanpa rewrite aplikasi React.

```text
 Cloudflare Pages (frontend, vite build)
        │  VITE_SUPABASE_URL → https://api.domainkamu
        ▼
 Cloudflare Tunnel (cloudflared) ──► Laptop (Docker)
        │                              ┌────────────────────────┐
        │                              │ self-hosted Supabase    │
        │                              │  Postgres + Auth + REST │
        │                              │  Storage + Realtime     │
        │                              │  Edge Runtime (Deno)    │
        │                              └────────────────────────┘
```

## Bagian A — Perubahan kode di repo Bluebook (yang aku kerjakan)

### 1. Matikan BIRU
- Hapus import & render `<BiruAssistant />` di `src/components/layout/MainLayout.tsx`.
- Hapus `src/components/biru/BiruAssistant.tsx`.
- Hapus edge function `supabase/functions/biru-chat/` (tidak dipakai lagi).
- Hapus secret `LOVABLE_API_KEY` dari konfigurasi self-host (tidak diperlukan).
- Catatan: konten/memory BIRU hilang total; tidak ada pengganti AI.

### 2. Tambah `self-host/` directory berisi artefak deployment
File baru di repo (dipakai di laptop, bukan di Lovable):

- `self-host/Dockerfile` — multi-stage build frontend (node → nginx static). Serve `dist/` lewat nginx.
- `self-host/nginx.conf` — SPA fallback (`try_files $uri /index.html`), gzip, cache asset.
- `self-host/docker-compose.yml` — 2 service:
  - `bluebook-web`: build dari Dockerfile, expose port 8080.
  - `cloudflared`: image `cloudflare/cloudflared`, jalankan tunnel ke service web + ke Supabase.
- `self-host/bootstrap-supabase.sh` — script yang:
  1. Clone repo resmi `supabase/supabase` (self-hosting docker-compose).
  2. Generate `.env` Supabase (JWT secret, anon key, service role key via `openssl`).
  3. `docker compose up -d` Supabase.
  4. Restore `pg_dump` dari Lovable Cloud (schema `public`, `auth`, `storage`).
  5. Re-create bucket `documents` + upload ulang file storage.
- `self-host/cloudflared/config.yml` — template routing tunnel (frontend + API backend).
- `self-host/DEPLOY.md` — panduan langkah-demi-langkah lengkap (lihat Bagian B).

### 3. Penyesuaian env / build
- Tidak ada perubahan kode aplikasi untuk env (sudah pakai `import.meta.env.VITE_SUPABASE_URL` & `_PUBLISHABLE_KEY`).
- `self-host/.env.example` berisi nilai-nilai yang di-set di Cloudflare Pages:
  - `VITE_SUPABASE_URL` → URL backend self-host (lewat tunnel).
  - `VITE_SUPABASE_PUBLISHABLE_KEY` → anon key self-host.

## Bagian B — Langkah infrastruktur (dikerjakan di laptop + Cloudflare, didokumentasikan di DEPLOY.md)

1. **Git sync** proyek ke GitHub (via Lovable Git sync).
2. **Backup dari Lovable Cloud**:
   - `pg_dump` schema `public` + `auth` + `storage` (bawa semua tabel, RLS, trigger, functions, user akun).
   - Download semua file di bucket `documents`.
3. **Setup laptop**:
   - Install Docker Desktop + Docker Compose.
   - Jalankan `self-host/bootstrap-supabase.sh` → self-hosted Supabase jalan lokal.
   - Restore database + storage.
4. **Deploy Edge Functions** (`admin-create-user`, `admin-get-user`, `admin-reset-password`) ke Edge Runtime self-host via `supabase functions deploy`. (biru-chat tidak ikut.)
5. **Konfigurasi Auth**:
   - Reconfigure Google OAuth: redirect URI → domain Cloudflare baru (bukan `.lovable.app`).
   - Verifikasi trigger `handle_new_user` + flow approval admin jalan.
6. **Cloudflare Tunnel**:
   - Install `cloudflared`, login, buat tunnel.
   - Route: `api.domainkamu` → Supabase self-host (port lokal), `bluebook.domainkamu` → frontend container.
   - DNS otomatis dibuat Cloudflare.
7. **Frontend ke Cloudflare Pages**:
   - Connect repo GitHub → Cloudflare Pages, build command `bun install && bun run build`, output `dist`.
   - Set env vars `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`.
8. **Testing & cutover**:
   - Test login, CRUD semua modul, upload file, realtime presence, Google OAuth.
   - Arahkan custom domain `bluebook-tlh.my.id` ke Cloudflare Pages.
   - Setelah stabil, decommission Lovable Cloud (atau simpan backup).

## Pertimbangan laptop dipakai harian
Karena laptop juga dipakai kerja, perlu strategi **keep-alive** (didokumentasikan):
- Setting `docker compose restart: unless-stopped` agar container auto-start saat laptop nyala.
- Cegah sleep saat di-charge (Power settings: "Never sleep when plugged in").
- **Backup otomatis harian**: cron `pg_dump` → drive eksternal / cloud (script `self-host/backup.sh`).
- Resiko downtime tetap ada (laptop mati/WiFi putus) — ini konsekuensi dari arsitektur, tidak bisa dihindari tanpa dedicated server.

## Yang TIDAK berubah
- Seluruh aplikasi React, RLS, trigger, dan Edge Functions admin tetap sama (kompatibel dengan self-hosted Supabase).
- Hanya BIRU yang dihapus; tidak ada fitur lain yang hilang.

## Catatan kerugian self-host vs Lovable Cloud
- Kamu jadi sysadmin: update Docker image Supabase, patch Postgres, ganti key, monitor disk, backup.
- Tidak ada auto-scaling, SSL otomatis diurus Cloudflare (frontend) tapi backend tunnel = tanggung jawabmu.
- Downtime mengikuti uptime laptop & internet rumah.
- Hilang: BIRU AI assistant, hosting managed Lovable, AI Gateway.
