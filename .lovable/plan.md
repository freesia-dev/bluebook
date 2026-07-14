## Tujuan
Tambah **Pusat Notifikasi** (lonceng 🔔 di header) yang otomatis mengumpulkan hal-hal penting yang perlu diperhatikan user, dan setiap notifikasi bisa diklik untuk langsung diarahkan ke halaman/aksi yang tepat.

## Sumber notifikasi (Phase 1)
Semua dihitung real-time dari data yang sudah ada — **tidak perlu tabel baru**.

| Kategori | Kondisi | Deep link |
|---|---|---|
| 🔴 NPL tinggi | Jumlah debitur `kol >= 3` di snapshot MLF terbaru untuk cabang user | `/monitoring/dashboard` |
| 🟠 Debitur DPK banyak tunggakan | `kol == 2` & `tunggakan > 0`, top 5 | `/monitoring/kontak-debitur?filter=tunggakan` |
| 🟢 Prospek baru (baru lunas / KOL membaik) | Diff snapshot terbaru vs bulan sebelumnya | `/monitoring/dashboard#prospek` |
| 📅 Kredit akan jatuh tempo | `date1` dalam 30 hari ke depan | `/monitoring/dashboard#akan-lunas` |
| 📥 Data MLF baru diupload | Ada `mlf_uploads` baru dalam 24 jam | `/monitoring/upload` |
| ✉️ Surat masuk baru | `surat_masuk` dibuat dalam 24 jam terakhir | `/surat-masuk` |
| 👤 User pending approval (admin only) | `profiles.status = 'pending'` | `/konfigurasi/users` |
| 💳 ATM selisih belum selesai | `selisih_atm.status = 'Belum Diselesaikan'` | `/atm-telihan/penyelesaian` |
| 🛡️ Shift security belum ditutup | `security_shift.status = 'aktif'` melebihi jam selesai | `/security/log` |
| 📝 Reminder WA gagal | `wa_reminder_log.status != 'sent'` dalam 24 jam | `/monitoring/reminder-tunggakan` |

Kategori difilter otomatis sesuai role (mis. admin dapat semua, `cs` tidak dapat notifikasi monitoring, dsb).

## UX
1. **Icon lonceng** di header (samping ThemeToggle) dengan badge angka unread (merah, animasi pulse kalau > 0).
2. Klik lonceng → **Popover dropdown** (w-96) berisi list notifikasi terurut prioritas (merah > oranye > hijau > info), tiap item:
   - Icon warna kategori
   - Judul singkat + jumlah (mis. "12 debitur NPL perlu ditindaklanjuti")
   - Deskripsi 1 baris (mis. "Cabang 143 · snapshot 10 Jul 2026")
   - Waktu relatif ("2 jam lalu")
   - Chevron kanan → klik = navigate ke deep link + tandai read
3. Header popover: judul "Notifikasi" · tombol "Tandai semua dibaca" · link "Pengaturan".
4. Footer: link "Lihat semua" → halaman `/notifikasi` (full page list, opsional Phase 1).
5. **Persisten dismiss**: state read/dismissed disimpan di `localStorage` per-user (key `biru-notif-read-<userId>`) — cukup untuk Phase 1, tidak perlu tabel DB.
6. Auto-refresh tiap 60 detik (React Query `refetchInterval`).
7. **BIRU integration** (bonus kecil): kalau ada notifikasi merah, tombol "Tanya BIRU cara menangani ini" di item — buka BIRU dengan pre-filled prompt.

## Deep-link handler
Beberapa target butuh state pre-filled saat halaman terbuka. Pakai **URL query params** dan **hash** yang sudah didukung:
- `?filter=tunggakan` di KontakDebitur → auto-toggle switch "hanya tunggakan".
- `#prospek` / `#akan-lunas` di dashboard → auto-scroll ke section.

Halaman yang perlu edit sudah minimal (baca query param di `useEffect` awal).

## File yang diubah / ditambah

**Baru:**
- `src/hooks/use-notifications.ts` — hitung semua notifikasi (React Query, refetchInterval 60s), gabung dengan read-state dari localStorage.
- `src/components/notifications/NotificationBell.tsx` — icon + badge + popover.
- `src/components/notifications/NotificationItem.tsx` — 1 row.
- `src/lib/notification-sources.ts` — pure functions per-sumber (input: data yang sudah di-fetch, output: `Notification[]`). Mudah ditest & ditambah source baru.

**Diedit:**
- `src/components/layout/MainLayout.tsx` — sisipkan `<NotificationBell />` di header.
- `src/pages/monitoring/KontakDebiturPage.tsx` — baca `?filter=tunggakan` untuk auto-set switch.
- `src/pages/monitoring/MonitoringDashboardPage.tsx` — tambah `id="prospek"` / `id="akan-lunas"` pada section terkait untuk hash scroll.

## Yang tidak masuk Phase 1
- Push notification browser (Web Push) — bisa nanti pakai skill PWA jika user mau.
- Notifikasi email/WA.
- Tabel `notifications` di DB + realtime — sekarang derivasi client-side sudah cukup dan hemat.
- Halaman `/notifikasi` full page (link "Lihat semua" bisa disembunyikan dulu).
- Pengaturan per-user (mute kategori tertentu).

## Teknis singkat
- Semua sumber dihitung dari hook yang sudah ada (`useMLFUploads`, `useMLFDataByBranch`, `useDebiturKontak`, dsb) — jadi tidak menambah beban query signifikan; cukup subscribe ke query yang memang sudah aktif.
- Prioritas: `critical` (merah) > `warning` (oranye) > `success` (hijau) > `info` (biru).
- Total ditampilkan maksimal 20 item; jika lebih, ada "+ N lainnya".