import React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { DebouncedInput } from "@/components/ui/debounced-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { formatCurrencyDisplay, parseCurrencyValue } from "@/hooks/use-currency-input";
import { CalendarIcon, Calculator, Clock, CreditCard, Banknote, Users, FileText, TrendingDown, TrendingUp, Equal } from "lucide-react";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export type PengisianATMFormData = {
  tanggal: Date;
  jam: string;
  sisaCartridge1: string;
  sisaCartridge2: string;
  sisaCartridge3: string;
  sisaCartridge4: string;
  tambahCartridge1: string;
  tambahCartridge2: string;
  tambahCartridge3: string;
  tambahCartridge4: string;
  saldoBukuBesar: string;
  kartuTertelan: string;
  yangMenyerahkan: string;
  namaTeller: string;
  tellerSelisih: string;
};

export type PengisianATMCalculations = {
  lembarATM: number;
  lembarFisik: number;
  uangFisik: number;
  selisihNominal: number;
  selisihAbs: number;
  keteranganSelisih: string;
  jumlahDisetor: number;
  setorKeRekTitipan: number;
  retracts: number;
  notes: string;
};

type Props = {
  formData: PengisianATMFormData;
  setFormData: React.Dispatch<React.SetStateAction<PengisianATMFormData>>;
  calculations: PengisianATMCalculations;
  formatSaldoInput: (value: string) => string;
  petugasOptions: Array<{ id: string; nama: string }>;
  tellerOptions: Array<{ id: string; nama: string }>;
};

function DatePickerField({ value, onChange, label }: { value: Date; onChange: (date: Date) => void; label: string }) {
  return (
    <div className="space-y-2">
      <Label className="flex items-center gap-2">
        <CalendarIcon className="h-4 w-4 text-muted-foreground" />
        {label}
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !value && "text-muted-foreground")}>
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(value, "EEEE, dd MMMM yyyy", { locale: id }) : <span>Pilih tanggal</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={value} onSelect={(date) => date && onChange(date)} initialFocus />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function DatabasePengisianATMFormFields({
  formData,
  setFormData,
  calculations,
  formatSaldoInput,
  petugasOptions,
  tellerOptions,
}: Props) {
  return (
    <div className="space-y-6">
      {/* Section 1: Waktu & Tanggal */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Waktu Pengisian
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <DatePickerField value={formData.tanggal} onChange={(date) => setFormData((p) => ({ ...p, tanggal: date }))} label="Tanggal" />
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Jam
            </Label>
            <Input type="time" value={formData.jam} onChange={(e) => setFormData((p) => ({ ...p, jam: e.target.value }))} className="h-10" />
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Sisa & Tambah Cartridge */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" />
            Data Cartridge (Lembar)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sisa Cartridge</Label>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((num) => (
                <div key={`sisa-${num}`} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">#{num}</Label>
                  <DebouncedInput
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    value={formData[`sisaCartridge${num}` as keyof PengisianATMFormData] as string}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, [`sisaCartridge${num}`]: v }) as PengisianATMFormData)}
                    className="text-center"
                  />
                </div>
              ))}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tambah Cartridge</Label>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((num) => (
                <div key={`tambah-${num}`} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">#{num}</Label>
                  <DebouncedInput
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="0"
                    value={formData[`tambahCartridge${num}` as keyof PengisianATMFormData] as string}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, [`tambahCartridge${num}`]: v }) as PengisianATMFormData)}
                    className="text-center"
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Saldo & Kartu Tertelan */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Banknote className="h-4 w-4 text-primary" />
            Saldo & Kartu
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2">Saldo Buku Besar <span className="text-destructive">*</span></Label>
            <DebouncedInput
              inputMode="numeric"
              value={formData.saldoBukuBesar}
              onValueChange={(v) => setFormData((p) => ({ ...p, saldoBukuBesar: formatSaldoInput(v) }))}
              placeholder="1.000.000"
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label>Kartu Tertelan</Label>
            <DebouncedInput
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.kartuTertelan}
              onValueChange={(v) => setFormData((p) => ({ ...p, kartuTertelan: v }))}
              placeholder="0"
              className="text-center"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Auto-Calculated Summary */}
      <Card className="border-accent bg-accent/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calculator className="h-4 w-4 text-accent-foreground" />
            Perhitungan Otomatis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-background border">
              <div className="text-xs text-muted-foreground mb-1">Lembar ATM (Buku Besar)</div>
              <div className="text-xl font-bold text-primary">{calculations.lembarATM.toLocaleString("id-ID")}</div>
              <div className="text-xs text-muted-foreground">= {formatCurrencyDisplay(parseCurrencyValue(formData.saldoBukuBesar))} / 100.000</div>
            </div>
            <div className="p-3 rounded-lg bg-background border">
              <div className="text-xs text-muted-foreground mb-1">Lembar Fisik (Cartridge)</div>
              <div className="text-xl font-bold text-primary">{calculations.lembarFisik.toLocaleString("id-ID")}</div>
              <div className="text-xs text-muted-foreground">= {formatCurrencyDisplay(calculations.uangFisik)}</div>
            </div>
          </div>

          <div
            className={cn(
              "p-3 rounded-lg border-2 flex items-center justify-between",
              calculations.selisihNominal > 0
                ? "border-success bg-success/10"
                : calculations.selisihNominal < 0
                  ? "border-destructive bg-destructive/10"
                  : "border-muted bg-muted/20",
            )}
          >
            <div>
              <div className="text-xs text-muted-foreground mb-1">Selisih (Fisik - Buku Besar)</div>
              <div className="text-xl font-bold flex items-center gap-2">
                {calculations.selisihNominal > 0 ? (
                  <>
                    <TrendingUp className="h-5 w-5 text-success" />
                    <span className="text-success">+{formatCurrencyDisplay(calculations.selisihAbs)}</span>
                  </>
                ) : calculations.selisihNominal < 0 ? (
                  <>
                    <TrendingDown className="h-5 w-5 text-destructive" />
                    <span className="text-destructive">-{formatCurrencyDisplay(calculations.selisihAbs)}</span>
                  </>
                ) : (
                  <>
                    <Equal className="h-5 w-5 text-muted-foreground" />
                    <span className="text-muted-foreground">Nihil</span>
                  </>
                )}
              </div>
            </div>
            <Badge
              variant={
                calculations.selisihNominal > 0 ? "default" : calculations.selisihNominal < 0 ? "destructive" : "secondary"
              }
            >
              {calculations.keteranganSelisih}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-background border text-center">
              <div className="text-xs text-muted-foreground mb-1">Disetor ke Teller</div>
              <div className="font-semibold text-sm">{formatCurrencyDisplay(calculations.jumlahDisetor)}</div>
            </div>
            <div className="p-3 rounded-lg bg-background border text-center">
              <div className="text-xs text-muted-foreground mb-1">Setor Rek Titipan</div>
              <div className="font-semibold text-sm">{formatCurrencyDisplay(calculations.setorKeRekTitipan)}</div>
            </div>
            <div className="p-3 rounded-lg bg-background border text-center">
              <div className="text-xs text-muted-foreground mb-1">Total Retracts</div>
              <div className="font-semibold text-sm">{calculations.retracts.toLocaleString("id-ID")} lembar</div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <FileText className="h-3 w-3" /> Notes (Otomatis)
            </div>
            <div className="font-mono text-sm">{calculations.notes}</div>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Petugas */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Petugas
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Yang Menyerahkan (Petugas ATM)</Label>
            <Select value={formData.yangMenyerahkan} onValueChange={(v) => setFormData((p) => ({ ...p, yangMenyerahkan: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih petugas" />
              </SelectTrigger>
              <SelectContent>
                {petugasOptions.map((p) => (
                  <SelectItem key={p.id} value={p.nama}>
                    {p.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Teller Penerima</Label>
            <Select value={formData.namaTeller} onValueChange={(v) => setFormData((p) => ({ ...p, namaTeller: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih teller" />
              </SelectTrigger>
              <SelectContent>
                {tellerOptions.map((t) => (
                  <SelectItem key={t.id} value={t.nama}>
                    {t.nama}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-2">
            <Label>Teller Selisih (jika ada)</Label>
            <Input
              value={formData.tellerSelisih}
              onChange={(e) => setFormData((p) => ({ ...p, tellerSelisih: e.target.value }))}
              placeholder="Nama/Kode Teller yang menangani selisih"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
