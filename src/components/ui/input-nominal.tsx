import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { formatCurrencyInput, parseCurrencyValue, rapikanNominalInput } from '@/hooks/use-currency-input';

export interface InputNominalProps
  extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> {
  /** Nilai tersimpan: boleh angka (10000000.22) atau teks yang sudah diformat. */
  value: string | number | null | undefined;
  /**
   * Dipanggil dengan dua bentuk sekaligus: teks yang sudah diformat
   * ("10.000.000,22") dan angkanya (10000000.22). Halaman yang menyimpan teks
   * memakai argumen pertama, yang menyimpan angka memakai yang kedua.
   */
  onValueChange: (teks: string, angka: number) => void;
}

/**
 * Satu-satunya komponen isian nominal uang di Bluebook.
 *
 * Perilakunya seragam di semua halaman: pemisah ribuan muncul otomatis sambil
 * mengetik, koma dipakai sebagai pemisah desimal (maksimal dua angka), dan
 * begitu kursor meninggalkan kolom angkanya dirapikan jadi dua desimal penuh —
 * "500" jadi "500,00", "100.000,1" jadi "100.000,10".
 *
 * Selama kolom sedang diketik, komponen memegang teks mentahnya sendiri. Tanpa
 * itu, halaman yang menyimpan nilainya sebagai angka akan menghapus koma yang
 * baru saja diketik ("10.000," langsung kembali jadi "10.000") sehingga desimal
 * mustahil dimasukkan.
 *
 * Sebelum ini sebagian kolom uang memakai <Input type="number"> biasa sehingga
 * tidak punya pemisah ribuan sama sekali dan malah menampilkan panah naik-turun.
 * Kolom uang baru harus memakai komponen ini, bukan Input biasa.
 */
export const InputNominal = React.forwardRef<HTMLInputElement, InputNominalProps>(
  ({ value, onValueChange, onBlur, onFocus, inputMode = 'decimal', placeholder = '0,00', ...sisa }, ref) => {
    const [draf, setDraf] = useState<string | null>(null);
    const tampil = draf ?? formatCurrencyInput(value);

    return (
      <Input
        {...sisa}
        ref={ref}
        inputMode={inputMode}
        placeholder={placeholder}
        value={tampil}
        onChange={(e) => {
          const teks = formatCurrencyInput(e.target.value);
          setDraf(teks);
          onValueChange(teks, parseCurrencyValue(teks));
        }}
        onFocus={(e) => {
          setDraf(e.target.value);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          const rapi = rapikanNominalInput(e.target.value);
          setDraf(null);
          onValueChange(rapi, parseCurrencyValue(rapi));
          onBlur?.(e);
        }}
      />
    );
  },
);
InputNominal.displayName = 'InputNominal';

export default InputNominal;
