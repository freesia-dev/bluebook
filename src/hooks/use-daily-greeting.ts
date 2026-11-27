import { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { Ayat } from '@/lib/greeting-ayat';
import { pilihKutipan, slotSekarang, type SlotSapaan } from '@/lib/sapaan-konfig';
import { useKonfigSapaan } from '@/hooks/use-sapaan-konfig';

interface DailyGreeting {
  /** true kalau sapaan harus ditampilkan sekarang */
  show: boolean;
  /** kutipan untuk sapaan ini (null kalau kutipan dimatikan) */
  ayat: Ayat | null;
  /** slot sapaan yang sedang tampil */
  slot: SlotSapaan | null;
  /** kunci acak sapaan ini ("tanggal|waktu"), untuk memilih latar */
  kunci: string;
  /** panggil begitu sapaan ditutup (klik, tombol, atau waktu habis) */
  dismiss: () => void;
}

/**
 * Sapaan muncul di tiap waktu yang diatur di Konfigurasi → Layar Sapaan
 * (bawaan: pagi, siang, sore), masing-masing saat Bluebook pertama dibuka di
 * waktu itu. Dilacak di profiles.last_greeting_slot ("2026-11-25|siang"),
 * bukan localStorage, supaya konsisten walau pindah-pindah perangkat — dan
 * supaya admin bisa me-reset sapaan seseorang dari halaman konfigurasi.
 * Kalau kolom itu belum ada (SQL belum dijalankan), jatuh ke cara lama:
 * sekali sehari lewat last_greeting_date.
 */
export function useDailyGreeting(): DailyGreeting {
  const { user, isAuthenticated, userName } = useAuth();
  const { konfig, siap } = useKonfigSapaan();
  const [show, setShow] = useState(false);
  const [ayat, setAyat] = useState<Ayat | null>(null);
  const [slot, setSlot] = useState<SlotSapaan | null>(null);
  const [kunci, setKunci] = useState('');
  const [pakaiSlot, setPakaiSlot] = useState(true);
  const tampilRef = useRef(false);
  tampilRef.current = show;

  const cek = useCallback(async (cancelled: () => boolean) => {
    if (!user || !siap || tampilRef.current) return;
    const s = slotSekarang(konfig);
    if (!s) return; // di luar jadwal, atau sapaan dimatikan
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const kunciSlot = `${todayKey}|${s.id}`;

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
      sudah = (r.data as { last_greeting_slot?: string | null } | null)?.last_greeting_slot === kunciSlot;
    }
    if (cancelled() || sudah) return;

    setSlot(s);
    setKunci(kunciSlot);
    setAyat(pilihKutipan(konfig, `${kunciSlot}|${user.id}`, s.id, userName));
    setShow(true);
  }, [user, userName, konfig, siap]);

  useEffect(() => {
    if (!isAuthenticated || !user || !siap) return;
    let batal = false;
    void cek(() => batal);
    // Bluebook sering dibiarkan terbuka seharian: cek lagi tiap 5 menit dan
    // saat jendela kembali dibuka, supaya sapaan waktu berikutnya tetap muncul.
    const t = window.setInterval(() => { if (!document.hidden) void cek(() => batal); }, 5 * 60 * 1000);
    const lihat = () => { if (!document.hidden) void cek(() => batal); };
    document.addEventListener('visibilitychange', lihat);
    return () => {
      batal = true;
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', lihat);
    };
  }, [isAuthenticated, user, siap, cek]);

  const userId = user?.id;
  // Waktu sapaan ditandai SETELAH sapaan benar-benar tampil dan ditutup,
  // supaya reload mendadak (mis. update PWA) tidak membuatnya hangus.
  const dismiss = useCallback(() => {
    setShow(false);
    if (!userId) return;
    const todayKey = kunci.split('|')[0] || format(new Date(), 'yyyy-MM-dd');
    const ubah = pakaiSlot
      ? { last_greeting_slot: kunci, last_greeting_date: todayKey }
      : { last_greeting_date: todayKey };
    void supabase
      .from('profiles')
      .update(ubah as never)
      .eq('user_id', userId)
      .then(() => undefined, () => undefined);
  }, [userId, kunci, pakaiSlot]);

  return { show, ayat, slot, kunci, dismiss };
}
