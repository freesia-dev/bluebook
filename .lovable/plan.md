# Log Security — Modul Team Leader & Audit

Menambahkan dua kapabilitas baru di modul Log Security tanpa mengganggu alur petugas/Pimpinan yang sudah ada.

## 1. Team Leader Security (Supervisor Harian)

**Posisi:** atasan langsung security, fokus pengawasan harian. **Bukan** approver BA (approve tetap di Pimpinan).

**Yang bisa dilakukan:**
- Lihat semua shift & kejadian (read-only ke data utama)
- Beri **komentar/feedback** ke tiap kejadian (mis. "tindak lanjuti ke CCTV", "laporan kurang detail")
- Tandai kejadian sebagai **insiden penting** (flag untuk auditor)
- Tidak bisa start shift, tidak bisa edit kejadian milik petugas, tidak bisa approve BA

**Yang ditambahkan:**
- Role baru `team_leader_security` di enum `app_role`
- Tabel `security_log_comment` (shift_id/entry_id, komentar, dibuat oleh, waktu)
- Kolom `is_insiden boolean` di `security_log_entry`
- UI komentar inline di kartu kejadian + filter "Tampilkan hanya insiden" di LogSecurityPage

## 2. Modul Audit (Akses publik via link bertanda tangan)

Auditor **tidak perlu login**. Admin generate link rekap periode (kadaluarsa), bagikan ke auditor.

**Halaman audit baru `/audit/security/:token`:**
- Header: identitas periode, tanggal generate, oleh siapa
- **Tab "Bulanan"** — kalender 1 bulan, klik tanggal → detail shift, kejadian, TTD Pimpinan, status BA
- **Tab "Rentang"** — pilih dari–sampai, tabel semua shift + statistik ringkas (total shift, total kejadian, kejadian insiden, % BA sudah disetujui)
- Tombol **Export Excel** & **Cetak rekap PDF**
- Tiap baris BA punya link ke halaman verifikasi QR yang sudah ada

**Halaman admin baru `/security/audit-links`** (admin only):
- Form: pilih periode (bulan atau rentang), durasi token (7/30/90 hari)
- Daftar token aktif: periode, expired, dibuat oleh, tombol copy link & revoke

**Yang ditambahkan:**
- Tabel `security_audit_token` (token uuid, periode_dari, periode_sampai, expires_at, created_by, revoked_at)
- RPC `get_security_audit_report(_token uuid)` — return rekap shift + kejadian sesuai periode token, validasi expired & revoked
- RPC `create_security_audit_token(_dari, _sampai, _expires_at)` — admin only
- Route publik `/audit/security/:token` (tanpa auth)
- Route admin `/security/audit-links`

## Akses Ringkas

| Role | Start Shift | Catat Kejadian | Komentar TL | Approve BA | Cetak BA | Generate Link Audit |
|---|---|---|---|---|---|---|
| security | ✓ | ✓ | – | – | – | – |
| team_leader_security | – | – | ✓ | – | – | – |
| pemimpin | – | – | – | ✓ | – | – |
| staff_admin_kcp | – | – | – | – | ✓ | – |
| admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| (publik via token) | – | – | – | – | – | – (hanya baca rekap) |

## Detail Teknis

- Enum `app_role` += `team_leader_security`
- Function helper `can_comment_security_log()` untuk RLS komentar
- Token audit pakai `gen_random_uuid()`, validasi `expires_at > now() AND revoked_at IS NULL` via **trigger**, bukan CHECK
- Halaman publik audit pakai supabase anon client + RPC `SECURITY DEFINER`, tidak expose tabel langsung
- Komponen baru:
  - `src/pages/security/AuditPublicPage.tsx`
  - `src/pages/security/AuditLinksAdminPage.tsx`
  - `src/components/security/CommentThread.tsx`
  - `src/components/security/AuditMonthlyCalendar.tsx`
  - `src/components/security/AuditRangeTable.tsx`
- Update `src/lib/role-permissions.ts` untuk role baru
- Update sidebar (nav item "Audit Links" untuk admin)

## Tidak termasuk plan ini
- Notifikasi WhatsApp ke TL saat ada kejadian baru (bisa fase berikutnya)
- Approval 2-lapis (TL → Pimpinan) — sesuai pilihan user, TL hanya supervisor
