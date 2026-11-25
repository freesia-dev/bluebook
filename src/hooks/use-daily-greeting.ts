import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { pakaiAlkitab, pilihAyat, type Ayat } from '@/lib/greeting-ayat';
import { waktuSapaan, type WaktuSapaan } from '@/lib/sapaan-palet';

interface DailyGreeting {
  /** true kalau sapaan harus ditampilkan sekarang */
  show: boolean;
  /** ayat untuk sapaan ini */
  ayat: Ayat | null;
  /** waktu sapaan yang sedang tampil */
  waktu: WaktuSapaan | null;
  /** kunci acak sapaan ini ("tanggal|waktu"), untuk memilih latar */
  kunci: string;
  /** panggil begitu sapaan ditutup (klik, tombol, atau 3 menit) */
  dismiss: () => void;
}

/**
 * Sapaan muncul tiga kali sehari — pagi (sebelum 10.00), siang (10.00–15.00),
 * dan sore (15.00–18.00) — masing-masing saat Bluebook pertama dibuka di
 * waktu itu. Dilacak di profiles.last_greeting_slot ("2026-11-25|siang"),
 * bukan localStorage, supaya konsisten walau pindah-pindah perangkat.
 * Kalau kolom itu belum ada (SQL belum dijalankan), jatuh ke cara lama:
 * sekali sehari lewat last_greeting_date.
 */
export function useDailyGreeting(): DailyGreeting {
  const { user, isAuthenticated, userName } = useAuth();
  const [show, setShow] = useState(false);
  const [ayat, setAyat] = useState<Ayat | null>(null);
  const [waktu, setWaktu] = useState<WaktuSapaan | null>(null);
  const [kunci, setKunci] = useState('');
  const [pakaiSlot, setPakaiSlot] = useState(true);
  const todayKey = format(new Date(), 'yyyy-MM-dd');

  const cek = useCallback(async (cancelled: () => boolean) => {
    if (!user) return;
    const w = waktuSapaan();
    if (!w) return; // malam: tidak ada sapaan
    const slot = `${todayKey}|${w}`;

    let sudah = false;
    const r = await supabase.from('profiles').select('last_greeting_slot').eq('user_id', user.id).maybeSingle();
    if (r.error) {
      // kolom belum ada → sekali sehari seperti dulu
      setPakaiSlot(false);
      const lama = await supabase.from('profiles').select('last_greeting_date').eq('user_id', user.id).maybeSingle();
      if (lama.error) return;
      sudah = lama.data?.last_greeting_date === todayKey;
    } else {
      setPakaiSlot(true);
      sudah = (r.data as { last_greeting_slot?: string | null } | null)?.last_greeting_slot === slot;
    }
    if (cancelled() || sudah) return;

    setWaktu(w);
    setKunci(slot);
    setAyat(pilihAyat(`${slot}|${user.id}`, w, pakaiAlkitab(userName)));
    setShow(true);
  }, [user, todayKey, userName]);

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let batal = false;
    void cek(() => batal);
    // Bluebook sering dibiarkan terbuka seharian: cek lagi tiap 5 menit dan
    // saat jendela kembali dibuka, supaya sapaan siang/sore tetap muncul.
    const t = window.setInterval(() => { if (!document.hidden) void cek(() => batal); }, 5 * 60 * 1000);
    const lihat = () => { if (!document.hidden) void cek(() => batal); };
    document.addEventListener('visibilitychange', lihat);
    return () => {
      batal = true;
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', lihat);
    };
  }, [isAuthenticated, user, cek]);

  const userId = user?.id;
  // Waktu sapaan ditandai SETELAH sapaan benar-benar tampil dan ditutup,
  // supaya reload mendadak (mis. update PWA) tidak membuatnya hangus.
  const dismiss = useCallback(() => {
    setShow(false);
    if (!userId) return;
    const ubah = pakaiSlot
      ? { last_greeting_slot: kunci, last_greeting_date: todayKey }
      : { last_greeting_date: todayKey };
    void supabase
      .from('profiles')
      .update(ubah as never)
      .eq('user_id', userId)
      .then(() => undefined, () => undefined);
  }, [userId, todayKey, kunci, pakaiSlot]);

  return { show, ayat, waktu, kunci, dismiss };
}
