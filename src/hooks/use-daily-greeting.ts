import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { pickGreetingQuote } from '@/lib/greeting-quotes';

interface DailyGreeting {
  /** true kalau overlay sapaan penyemangat harus ditampilkan sekarang */
  show: boolean;
  /** kalimat penyemangat hari ini (sudah dipilih dari bank kata-kata) */
  quote: string;
  /** panggil begitu overlay ditutup (klik atau auto-timeout) */
  dismiss: () => void;
}

/**
 * Nunjukin sapaan penyemangat sekali per hari, di login/kunjungan PERTAMA
 * hari itu — dilacak lewat kolom profiles.last_greeting_date (bukan
 * localStorage), supaya konsisten meskipun user pindah-pindah device/browser
 * di hari yang sama.
 */
export function useDailyGreeting(): DailyGreeting {
  const { user, isAuthenticated } = useAuth();
  const [show, setShow] = useState(false);
  const todayKey = format(new Date(), 'yyyy-MM-dd');
  const [quote] = useState(() => pickGreetingQuote(todayKey));

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('last_greeting_date')
        .eq('user_id', user.id)
        .maybeSingle();

      if (cancelled || error) return;

      const lastShown = data?.last_greeting_date;
      if (lastShown === todayKey) return; // sudah tampil hari ini

      setShow(true);
      // Tandai sudah ditampilkan hari ini (best-effort, tidak menghalangi UI)
      await supabase
        .from('profiles')
        .update({ last_greeting_date: todayKey })
        .eq('user_id', user.id);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  return { show, quote, dismiss: () => setShow(false) };
}
