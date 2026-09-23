import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { CHANGELOG, PERUBAHAN_TERBARU, type EntriPerubahan } from '@/lib/changelog';
import { sudahIkutTur } from '@/lib/tur-state';
import { Sparkles, Check } from 'lucide-react';

const KUNCI = 'bluebook-perubahan-terakhir-dilihat';

const bacaTerakhirDilihat = (): string | null => {
  try {
    return window.localStorage.getItem(KUNCI);
  } catch {
    return null;
  }
};

const tandaiSudahDilihat = (id: string): void => {
  try {
    window.localStorage.setItem(KUNCI, id);
  } catch {
    /* noop */
  }
};

/** Dipanggil halaman About untuk membuka pop-up ini secara manual. */
export function bukaApaYangBaru(): void {
  window.dispatchEvent(new CustomEvent('bluebook:apa-yang-baru'));
}

const IsiEntri: React.FC<{ entri: EntriPerubahan }> = ({ entri }) => (
  <div>
    <p className="text-xs text-muted-foreground">
      {new Date(entri.tanggal).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}
    </p>
    <h3 className="mt-0.5 font-display text-base font-bold">{entri.judul}</h3>
    <ul className="mt-3 space-y-2">
      {entri.poin.map((p) => (
        <li key={p} className="flex items-start gap-2.5 text-sm">
          <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{p}</span>
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Pop-up "Apa yang baru" — muncul sekali tiap ada pembaruan, supaya fitur baru
 * tidak lewat begitu saja tanpa ada yang tahu.
 *
 * Aturannya sengaja sederhana:
 *   - muncul kalau entri terbaru di changelog belum pernah dilihat di perangkat ini;
 *   - TIDAK muncul untuk yang belum selesai tur pengenalan (pegawai baru cukup
 *     satu sambutan, jangan dua) — entri terbarunya langsung ditandai terlihat;
 *   - bisa dibuka lagi kapan saja dari halaman About.
 */
export const WhatsNewDialog: React.FC = () => {
  const [buka, setBuka] = useState(false);
  const [semua, setSemua] = useState(false);

  useEffect(() => {
    const terakhir = bacaTerakhirDilihat();
    if (terakhir === PERUBAHAN_TERBARU.id) return;
    // Pegawai baru: biar tur saja yang menyambut sekarang. Tidak ditandai
    // "sudah dilihat", jadi ringkasan pembaruannya tetap muncul lain kali.
    if (!sudahIkutTur()) return;
    // Beri jeda sebentar supaya halaman sempat tampil dulu
    const t = window.setTimeout(() => setBuka(true), 1200);
    return () => window.clearTimeout(t);
  }, []);

  useEffect(() => {
    const onBuka = () => {
      setSemua(true);
      setBuka(true);
    };
    window.addEventListener('bluebook:apa-yang-baru', onBuka);
    return () => window.removeEventListener('bluebook:apa-yang-baru', onBuka);
  }, []);

  const tutup = (o: boolean) => {
    if (!o) {
      tandaiSudahDilihat(PERUBAHAN_TERBARU.id);
      setBuka(false);
      setSemua(false);
    }
  };

  const entri = semua ? CHANGELOG : [PERUBAHAN_TERBARU];

  return (
    <Dialog open={buka} onOpenChange={tutup}>
      <DialogContent className="max-h-[85vh] w-[92vw] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Apa yang baru di Bluebook
          </DialogTitle>
          <DialogDescription>
            {semua ? 'Seluruh catatan pembaruan, terbaru di atas.' : 'Ada beberapa perubahan sejak terakhir kamu buka.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {entri.map((e) => (
            <IsiEntri key={e.id} entri={e} />
          ))}
        </div>

        <div className="mt-2 flex flex-wrap justify-end gap-2">
          {!semua && CHANGELOG.length > 1 && (
            <Button variant="ghost" onClick={() => setSemua(true)}>
              Lihat pembaruan sebelumnya
            </Button>
          )}
          <Button onClick={() => tutup(false)}>Siap, mengerti</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default WhatsNewDialog;
