import React, { useMemo } from 'react';
import { useLoanSimulations, type LoanSimulationRow } from '@/hooks/use-loan-calc';
import { fmtRp } from '@/lib/loan-calc';
import { History } from 'lucide-react';

interface DebiturSuggestionsProps {
  /** Teks yang sedang diketik user (nama atau nomor KTP). */
  query: string;
  /** Cari di kolom mana. */
  field: 'nama' | 'ktp';
  /** Jangan tampilkan saran kalau simulasi ini yang sedang dibuka. */
  excludeId?: string;
  /** Dipanggil saat user memilih salah satu saran. */
  onPick: (row: LoanSimulationRow) => void;
}

const MAX_SARAN = 4;

/**
 * Saran "pernah dihitung sebelumnya" yang muncul saat AO mengetik nama atau
 * nomor KTP di Kalkulator. Sering terjadi: debitur yang sama datang lagi
 * beberapa hari kemudian untuk produk lain — datanya sudah ada di riwayat,
 * tinggal dipakai ulang supaya tidak perlu input dari nol.
 */
export const DebiturSuggestions: React.FC<DebiturSuggestionsProps> = ({ query, field, excludeId, onPick }) => {
  const { data = [] } = useLoanSimulations();

  const saran = useMemo(() => {
    const q = query.trim().toLowerCase();
    // Nama minimal 3 huruf, KTP minimal 6 digit — supaya tidak muncul terlalu cepat
    if (field === 'nama' && q.length < 3) return [];
    if (field === 'ktp' && q.length < 6) return [];

    const cocok = data.filter((s) => {
      if (excludeId && s.id === excludeId) return false;
      const nilai = field === 'nama' ? s.nama_debitur : s.nomor_ktp;
      return !!nilai && String(nilai).toLowerCase().includes(q);
    });

    // Satu entri per orang (paling baru menang) — kunci pakai KTP kalau ada
    const perOrang = new Map<string, LoanSimulationRow>();
    for (const s of cocok) {
      const kunci = (s.nomor_ktp || s.nama_debitur || s.id).toLowerCase();
      const ada = perOrang.get(kunci);
      const waktu = (r: LoanSimulationRow) => new Date(r.updated_at || r.created_at).getTime();
      if (!ada || waktu(s) > waktu(ada)) perOrang.set(kunci, s);
    }
    return Array.from(perOrang.values()).slice(0, MAX_SARAN);
  }, [data, query, field, excludeId]);

  if (saran.length === 0) return null;

  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border bg-popover shadow-lg">
      <p className="flex items-center gap-1.5 border-b bg-muted/50 px-3 py-1.5 text-[11px] font-medium text-muted-foreground">
        <History className="h-3 w-3" /> Pernah dihitung sebelumnya
      </p>
      <ul className="max-h-64 overflow-y-auto py-1">
        {saran.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              // onMouseDown, bukan onClick: supaya jalan walau input kehilangan fokus dulu
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(s);
              }}
              className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors hover:bg-muted"
            >
              <span className="text-sm font-medium">{s.nama_debitur}</span>
              <span className="text-xs text-muted-foreground">
                {s.product_nama || 'Produk kredit'} · {fmtRp(s.plafon)} · {s.tenor_bulan} bln ·{' '}
                {new Date(s.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
        Pilih untuk memakai ulang datanya — hasilnya disimpan sebagai simulasi baru.
      </p>
    </div>
  );
};

export default DebiturSuggestions;
