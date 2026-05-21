## Diagnosis

Halaman cetak terbuka di tab baru via `window.open(...)`. Di tab baru:

1. `CallMemoPrintPage` langsung mount dan memanggil `useCallMemo(id)`.
2. Sebelum Supabase selesai me-restore sesi dari localStorage (async), React Query sudah mengirim request anonim.
3. Tabel `call_memo_penagihan` punya RLS `SELECT` khusus role `authenticated` → request anonim balikin 0 baris.
4. `maybeSingle()` → `data = null` → halaman render "Call Memo tidak ditemukan."

Data sebenarnya ada di DB (id `2fa81f0f-…`, nama HASNAWATI), dan route `/monitoring/call-memo/print` sudah terdaftar di `App.tsx`. Jadi murni race-condition antara auth-restore vs query.

## Fix

Gate query pada user yang sudah authenticated, dan tampilkan loader sampai sesi siap.

### `src/hooks/use-call-memo.ts`
- Tambahkan parameter opsional / pakai `useAuth()` di dalam hook untuk set `enabled: !!id && !!user`. Karena hook tidak boleh tahu context auth secara global di sini, paling bersih: terima `enabled` flag dari caller, atau import `useAuth` langsung di hook. Pilih impor `useAuth` (sudah dipakai di hook lain di project).

```ts
import { useAuth } from '@/contexts/AuthContext';
...
export const useCallMemo = (id?: string) => {
  const { user, loading } = useAuth();
  return useQuery({
    queryKey: ['call-memo', id],
    queryFn: async () => { ... },
    enabled: !!id && !!user && !loading,
  });
};
```

### `src/pages/monitoring/CallMemoPrintPage.tsx`
- Tampilkan state loading ketika `auth` masih restore (sebelum hanya cek `isLoading` query).
- Pakai `useAuth()` untuk redirect ke `/login?redirect=...` kalau benar-benar tidak ada sesi setelah loading selesai (bukan langsung "tidak ditemukan"), supaya user tahu harus login dulu jika tab baru kehilangan sesi.

```tsx
const { user, loading: authLoading } = useAuth();
if (authLoading) return <Loader/>;
if (!user) { window.location.href = `/login?redirect=${encodeURIComponent(location.pathname + location.search)}`; return null; }
if (isLoading) return <Loader/>;
if (!memo) return <NotFoundState/>;
```

### Catatan
- Tidak ada perubahan database atau RLS — policy sudah benar (`authenticated` read).
- Tidak menyentuh fitur lain. Pattern yang sama bisa dipakai ulang kalau ada print page lain.

## File yang diubah
- `src/hooks/use-call-memo.ts` — gate query pada auth ready.
- `src/pages/monitoring/CallMemoPrintPage.tsx` — handle auth loading + redirect login bila perlu.
