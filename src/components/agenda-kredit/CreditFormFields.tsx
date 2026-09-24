import React from 'react';
import { InputNominal } from '@/components/ui/input-nominal';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar } from '@/components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/**
 * Skema field yang dipakai bareng oleh form Tambah/Edit di modul Agenda Kredit
 * (PK, SPPK, KK & MPAK, Nomor Loan). Tujuannya supaya perubahan/perbaikan pada
 * satu jenis input (mis. currency, date picker) cukup dilakukan di satu tempat,
 * bukan disalin manual ke tiap halaman.
 */
export interface SelectOption {
  value: string;
  label: string;
}

export type CreditField<V extends Record<string, any> = Record<string, any>> =
  | { type: 'text'; key: keyof V & string; label: string; required?: boolean; placeholder?: string; visible?: (v: V) => boolean }
  | { type: 'currency'; key: keyof V & string; label: string; required?: boolean; placeholder?: string; visible?: (v: V) => boolean }
  | { type: 'select'; key: keyof V & string; label: string; required?: boolean; placeholder?: string; options: SelectOption[]; visible?: (v: V) => boolean }
  | { type: 'checkbox'; key: keyof V & string; label: string; visible?: (v: V) => boolean }
  | { type: 'date'; key: keyof V & string; label: string; visible?: (v: V) => boolean }
  | { type: 'custom'; key: string; render: (values: V, setValues: (next: V) => void) => React.ReactNode; visible?: (v: V) => boolean };

interface CreditFormFieldsProps<V extends Record<string, any>> {
  fields: CreditField<V>[];
  values: V;
  onChange: (values: V) => void;
  /** formatCurrencyInput dari @/hooks/use-currency-input, dipakai untuk field bertipe 'currency' */
  formatCurrencyInput: (raw: string) => string;
}

export function CreditFormFields<V extends Record<string, any>>({
  fields,
  values,
  onChange,
  formatCurrencyInput,
}: CreditFormFieldsProps<V>) {
  const setField = (key: string, val: unknown) => onChange({ ...values, [key]: val } as V);

  return (
    <div className="space-y-4 py-4">
      {fields.map((f) => {
        if (f.visible && !f.visible(values)) return null;

        if (f.type === 'custom') {
          return <React.Fragment key={f.key}>{f.render(values, onChange)}</React.Fragment>;
        }

        const required = 'required' in f && f.required;
        const labelNode = (
          <Label htmlFor={f.key}>
            {f.label} {required && <span className="text-destructive">*</span>}
          </Label>
        );

        switch (f.type) {
          case 'text':
            return (
              <div className="space-y-2" key={f.key}>
                {labelNode}
                <Input
                  id={f.key}
                  value={(values[f.key] as string) ?? ''}
                  placeholder={f.placeholder}
                  onChange={(e) => setField(f.key, e.target.value)}
                />
              </div>
            );
          case 'currency':
            return (
              <div className="space-y-2" key={f.key}>
                {labelNode}
                <InputNominal
                  id={f.key}
                  value={(values[f.key] as string) ?? ''}
                  placeholder={f.placeholder || '1.000.000,00'}
                  onValueChange={(teks) => setField(f.key, teks)}
                />
              </div>
            );
          case 'select': {
            // Daftar panjang (mis. Jenis Kredit, Sektor Ekonomi) pakai dropdown
            // yang bisa diketik; daftar pendek tetap dropdown biasa supaya tidak
            // ada kotak cari yang mubazir.
            const panjang = f.options.length > 6;
            return (
              <div className="space-y-2" key={f.key}>
                {labelNode}
                {panjang ? (
                  <SearchableSelect
                    id={f.key}
                    value={(values[f.key] as string) ?? ''}
                    onValueChange={(v) => setField(f.key, v)}
                    options={f.options}
                    placeholder={f.placeholder || `Pilih ${f.label.toLowerCase()}`}
                    searchPlaceholder={`Cari ${f.label.toLowerCase()}...`}
                  />
                ) : (
                  <Select value={(values[f.key] as string) ?? ''} onValueChange={(v) => setField(f.key, v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={f.placeholder || `Pilih ${f.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {f.options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            );
          }
          case 'checkbox':
            return (
              <div className="flex items-center space-x-2" key={f.key}>
                <Checkbox
                  id={f.key}
                  checked={!!values[f.key]}
                  onCheckedChange={(checked) => setField(f.key, checked === true)}
                />
                <Label htmlFor={f.key} className="cursor-pointer">{f.label}</Label>
              </div>
            );
          case 'date': {
            const dateValue = values[f.key] ? new Date(values[f.key] as string) : undefined;
            return (
              <div className="space-y-2" key={f.key}>
                {labelNode}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn('w-full justify-start text-left font-normal', !dateValue && 'text-muted-foreground')}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateValue ? format(dateValue, 'dd MMMM yyyy', { locale: localeId }) : <span>Pilih tanggal</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateValue}
                      onSelect={(date) => date && setField(f.key, date)}
                      initialFocus
                      className="p-3 pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}

/** Satu baris label/nilai di dialog Detail. */
export interface DetailField<T> {
  label: string;
  render: (item: T) => React.ReactNode;
  /** Set true untuk field yang butuh lebar penuh (2 kolom), mis. teks panjang. */
  fullWidth?: boolean;
}

export function CreditDetailGrid<T>({ item, fields }: { item: T; fields: DetailField<T>[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 py-4">
      {fields.map((f, i) => (
        <div key={i} className={f.fullWidth ? 'col-span-2' : undefined}>
          <p className="text-sm text-muted-foreground">{f.label}</p>
          <p className="font-medium">{f.render(item)}</p>
        </div>
      ))}
    </div>
  );
}
