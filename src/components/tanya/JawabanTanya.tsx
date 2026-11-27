import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, Download, FileText, FolderOpen, LogOut, Pencil, Phone, Plus, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  nadaKol, nadaNpl, persen, rp, tgl,
  type HasilTanya, type JawabNpl, type JawabProfil, type JawabSimulasi, type JawabTabel, type Kolom, type Lencana, type Nada,
} from '@/lib/tanya/jawaban';
import { nilaiTeks, unduhExcel, unduhPdf } from '@/lib/tanya/unduh';

export const NADA: Record<Nada, string> = {
  hijau: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300',
  kuning: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  merah: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  jingga: 'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-300',
  biru: 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300',
  abu: 'bg-slate-100 text-slate-600 dark:bg-slate-500/15 dark:text-slate-300',
};
const TEKS_NADA: Record<Nada, string> = {
  hijau: 'text-emerald-600 dark:text-emerald-400',
  kuning: 'text-amber-600 dark:text-amber-400',
  merah: 'text-red-600 dark:text-red-400',
  jingga: 'text-orange-600 dark:text-orange-400',
  biru: 'text-sky-700 dark:text-sky-400',
  abu: 'text-muted-foreground',
};

const Cip: React.FC<{ l: Lencana }> = ({ l }) =>
  l.teks ? <span className={cn('inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[10.5px] font-bold', NADA[l.nada])}>{l.teks}</span> : null;

interface Aksi {
  onTanya: (teks: string) => void;
  onUbah: (teks: string) => void;
  onKeluarSimulasi: () => void;
}

// ------------------------------------------------------------------ paham
export const BarisPaham: React.FC<{ paham: string[]; sumber: 'pola' | 'ai'; kalimat: string; onUbah: (t: string) => void }> = ({ paham, sumber, kalimat, onUbah }) => {
  if (!paham.length) return null;
  return (
    <div className="mb-2.5 flex flex-wrap items-center gap-1.5 text-[10.5px] text-muted-foreground">
      <Sparkles className="h-3 w-3 text-primary" />
      <span>Bluebook mengartikan{sumber === 'ai' ? ' (dibantu AI)' : ''}:</span>
      {paham.map((p, i) => (
        <span key={i} className="rounded-full border border-dashed border-primary/40 bg-primary/5 px-2 py-0.5 font-semibold text-primary">{p}</span>
      ))}
      <button type="button" onClick={() => onUbah(kalimat)} className="ml-auto inline-flex items-center gap-1 font-bold text-primary hover:underline">
        <Pencil className="h-3 w-3" /> ubah
      </button>
    </div>
  );
};

// ------------------------------------------------------------------ sel tabel
const Sel: React.FC<{ k: Kolom; b: Record<string, unknown>; onTanya: (t: string) => void }> = ({ k, b, onTanya }) => {
  const v = b[k.kunci];
  let isi: React.ReactNode;
  if (k.jenis === 'lencana' || k.jenis === 'kol') isi = v ? <Cip l={v as Lencana} /> : '—';
  else if (k.jenis === 'nama' && v) {
    isi = (
      <button type="button" className="text-left font-semibold text-foreground hover:text-primary hover:underline" onClick={() => onTanya(`info debitur atas nama "${String(v)}"`)}>
        {String(v)}
      </button>
    );
  } else isi = nilaiTeks(k, v);
  return (
    <>
      <div className={cn(k.jenis === 'uang' && 'whitespace-nowrap font-medium', k.kunci === 'hari' && 'whitespace-nowrap font-semibold')}>{isi}</div>
      {k.sub && b[k.sub] ? <div className="mt-0.5 text-[10px] leading-snug text-muted-foreground">{String(b[k.sub])}</div> : null}
    </>
  );
};

const TombolUnduh: React.FC<{ t: JawabTabel }> = ({ t }) => {
  const [sibuk, setSibuk] = useState<'' | 'xls' | 'pdf'>('');
  const jalan = async (j: 'xls' | 'pdf') => {
    setSibuk(j);
    try {
      await (j === 'xls' ? unduhExcel(t) : unduhPdf(t));
    } catch (e) {
      toast.error('Gagal mengunduh', { description: e instanceof Error ? e.message : undefined });
    } finally {
      setSibuk('');
    }
  };
  return (
    <>
      <button type="button" disabled={!!sibuk} onClick={() => jalan('pdf')} className="tb-aksi">
        <FileText className="h-3.5 w-3.5" /> {sibuk === 'pdf' ? 'Menyiapkan…' : 'PDF'}
      </button>
      <button type="button" disabled={!!sibuk} onClick={() => jalan('xls')} className="tb-aksi">
        <Download className="h-3.5 w-3.5" /> {sibuk === 'xls' ? 'Menyiapkan…' : 'Excel'}
      </button>
    </>
  );
};

const BATAS = 25;

const Tabel: React.FC<{ t: JawabTabel } & Aksi> = ({ t, onTanya }) => {
  const [semua, setSemua] = useState(false);
  const tampil = semua ? t.baris : t.baris.slice(0, BATAS);
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
        <span className="font-display text-xl font-extrabold tracking-tight text-foreground">{t.angkaUtama ?? t.judul}</span>
        {t.keterangan && <span className="text-[11px] text-muted-foreground">{t.keterangan}</span>}
      </div>
      {t.angkaUtama && <div className="text-[11px] font-semibold text-primary">{t.judul}</div>}
      {t.ringkas?.length ? (
        <div className="mt-2.5 grid grid-cols-3 gap-2">
          {t.ringkas.map((r) => (
            <div key={r.label} className="rounded-lg bg-muted/60 px-2.5 py-1.5">
              <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{r.label}</div>
              <div className={cn('font-display text-sm font-extrabold', r.nada ? TEKS_NADA[r.nada] : 'text-foreground')}>{r.nilai}</div>
            </div>
          ))}
        </div>
      ) : null}
      {t.baris.length === 0 ? (
        <p className="mt-3 rounded-lg bg-muted/50 px-3 py-2.5 text-sm text-muted-foreground">{t.kosong ?? 'Tidak ada data.'}</p>
      ) : (
        <div className="mt-2.5 overflow-x-auto rounded-lg border">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="bg-muted/60">
                {t.kolom.map((k) => (
                  <th key={k.kunci} className={cn('px-2 py-1.5 text-left text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground', !k.hp && 'hidden sm:table-cell', (k.jenis === 'uang' || k.jenis === 'angka' || k.jenis === 'persen') && 'text-right')}>
                    {k.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tampil.map((b, i) => (
                <tr key={i} className="border-t align-top">
                  {t.kolom.map((k) => (
                    <td key={k.kunci} className={cn('px-2 py-1.5', !k.hp && 'hidden sm:table-cell', (k.jenis === 'uang' || k.jenis === 'angka' || k.jenis === 'persen') && 'text-right')}>
                      <Sel k={k} b={b} onTanya={onTanya} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {t.baris.length > BATAS && !semua && (
        <button type="button" onClick={() => setSemua(true)} className="mt-1.5 text-[11px] font-bold text-primary hover:underline">
          Tampilkan semua {t.baris.length} baris
        </button>
      )}
      {t.catatan?.map((c, i) => (
        <p key={i} className="mt-1.5 text-[10.5px] leading-snug text-muted-foreground">{c}</p>
      ))}
      {t.baris.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <TombolUnduh t={t} />
        </div>
      )}
    </div>
  );
};

// ------------------------------------------------------------------ profil
const Profil: React.FC<{ p: JawabProfil } & Aksi> = ({ p }) => {
  const inisial = p.nama.split(/\s+/).filter(Boolean).slice(0, 2).map((s) => s[0]).join('');
  const aktif = p.kredit.filter((k) => k.status === 'aktif');
  const utama = aktif[0];
  return (
    <div>
      <div className="flex items-center gap-2.5">
        <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-primary/10 text-sm font-extrabold text-primary">{inisial}</div>
        <div className="min-w-0">
          <div className="truncate font-display text-base font-extrabold text-foreground">{p.nama}</div>
          <div className="text-[10.5px] text-muted-foreground">{p.ringkasan}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="text-[9.5px] text-muted-foreground">Total baki aktif</div>
          <div className="font-display text-lg font-extrabold text-foreground">{rp(p.totalBaki)}</div>
        </div>
      </div>
      {utama && (
        <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Angsuran pokok', utama.angsuranPokok ? rp(utama.angsuranPokok) : '—'],
            ['Tgl bayar', utama.tanggalBayar ? `tiap ${utama.tanggalBayar}` : '—'],
            ['Jatuh tempo', tgl(utama.jatuhTempo)],
            ['Tunggakan', aktif.some((k) => k.tunggakan > 0) ? rp(aktif.reduce((s, k) => s + k.tunggakan, 0)) : 'Tidak ada'],
          ].map(([a, b]) => (
            <div key={a} className="rounded-lg bg-muted/60 px-2.5 py-1.5">
              <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">{a}</div>
              <div className={cn('text-[12.5px] font-extrabold', a === 'Tunggakan' && b !== 'Tidak ada' ? 'text-red-600' : 'text-foreground')}>{b}</div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2.5 overflow-x-auto rounded-lg border">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="bg-muted/60 text-[9.5px] uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-1.5 text-left font-bold">Akad</th>
              <th className="hidden px-2 py-1.5 text-left font-bold sm:table-cell">Nomor PK</th>
              <th className="px-2 py-1.5 text-right font-bold">Plafon</th>
              <th className="px-2 py-1.5 text-right font-bold">Baki</th>
              <th className="px-2 py-1.5 text-left font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {p.kredit.map((k, i) => (
              <tr key={i} className="border-t align-top">
                <td className="whitespace-nowrap px-2 py-1.5">
                  {tgl(k.akad)}
                  <div className="text-[10px] text-muted-foreground">{[k.produk, k.unit !== '—' ? k.unit : null].filter(Boolean).join(' · ')}</div>
                </td>
                <td className="hidden px-2 py-1.5 font-mono text-[10.5px] sm:table-cell">{k.nomorPk || k.l0lnno || '—'}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right">{rp(k.plafon)}</td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right font-bold">{k.status === 'aktif' ? rp(k.baki) : '—'}</td>
                <td className="px-2 py-1.5">
                  {k.status === 'aktif'
                    ? <Cip l={{ teks: `Aktif · Kol ${k.kol}`, nada: nadaKol(k.kol) }} />
                    : <Cip l={{ teks: 'Lunas / top up', nada: 'abu' }} />}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-2.5 flex flex-col gap-1.5 text-[11px] sm:flex-row">
        {p.map.length ? (
          p.map.map((m) => (
            <div key={m.kode} className="flex flex-1 items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-2.5 py-1.5 dark:border-orange-500/30 dark:bg-orange-500/10">
              <FolderOpen className="h-3.5 w-3.5 flex-none text-orange-600" />
              <span>Map di <b>{m.lokasi}</b> · <span className={TEKS_NADA[m.nada]}>{m.status}</span></span>
            </div>
          ))
        ) : (
          <div className="flex flex-1 items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1.5 text-muted-foreground">
            <FolderOpen className="h-3.5 w-3.5" /> Map belum dicatat di arsip
          </div>
        )}
        {p.noHp && (
          <a href={`tel:${p.noHp}`} className="flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 dark:border-sky-500/30 dark:bg-sky-500/10">
            <Phone className="h-3.5 w-3.5 text-sky-700" /> <b>{p.noHp}</b>
          </a>
        )}
      </div>
      {p.catatan.map((c, i) => (
        <p key={i} className="mt-1.5 text-[10.5px] text-muted-foreground">{c}</p>
      ))}
    </div>
  );
};

// ------------------------------------------------------------------ npl
const Npl: React.FC<{ j: JawabNpl }> = ({ j }) => {
  const turun = j.banding ? j.npl - j.banding.npl : 0;
  return (
    <div>
      <div className="text-[11px] font-semibold text-primary">{j.judul}</div>
      <div className="flex flex-wrap items-end gap-x-4">
        <div className={cn('font-display text-4xl font-extrabold tracking-tight', TEKS_NADA[nadaNpl(j.npl)])}>{persen(j.npl)}</div>
        <div className="pb-1 text-[11px] text-muted-foreground">
          {rp(j.bermasalah)} dari {rp(j.dasar)} · {j.debiturBermasalah} rekening
          {j.banding && (
            <div className={turun > 0 ? 'text-red-600' : 'text-emerald-600'}>
              {turun > 0 ? 'naik' : 'turun'} {persen(Math.abs(turun))} dari {j.banding.label} ({persen(j.banding.npl)})
            </div>
          )}
        </div>
      </div>
      <div className="mt-2.5 grid grid-cols-3 gap-2">
        {j.perKol.map((k) => (
          <div key={k.kol} className="rounded-lg bg-muted/60 px-2.5 py-1.5">
            <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">Kol {k.kol} · {k.debitur} rek</div>
            <div className="text-[13px] font-extrabold text-foreground">{rp(k.baki)}</div>
          </div>
        ))}
      </div>
      {j.catatan?.map((c, i) => <p key={i} className="mt-1.5 text-[10.5px] text-muted-foreground">{c}</p>)}
    </div>
  );
};

// ------------------------------------------------------------------ simulasi
const Simulasi: React.FC<{ s: JawabSimulasi } & Aksi> = ({ s, onUbah, onKeluarSimulasi }) => {
  const naik = s.sesudah.npl > s.sebelum.npl;
  return (
    <div>
      <div className="mb-2.5 flex items-center gap-2 rounded-lg border border-dashed border-orange-400 px-2.5 py-1.5 text-[11px] font-bold text-orange-700 [background:repeating-linear-gradient(135deg,#fff4e6_0_10px,#ffeedd_10px_20px)] dark:text-orange-300 dark:[background:repeating-linear-gradient(135deg,rgba(249,115,22,.10)_0_10px,rgba(249,115,22,.16)_10px_20px)]">
        <AlertTriangle className="h-3.5 w-3.5" /> MODE SIMULASI · hanya hitungan, data MLF tidak diubah
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="rounded-lg bg-muted/60 px-3 py-2">
          <div className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">NPL sekarang</div>
          <div className={cn('font-display text-2xl font-extrabold', TEKS_NADA[nadaNpl(s.sebelum.npl)])}>{persen(s.sebelum.npl)}</div>
          <div className="text-[10px] text-muted-foreground">{rp(s.sebelum.bermasalah)} dari {rp(s.sebelum.dasar)}</div>
        </div>
        <ArrowRight className="h-5 w-5 text-orange-500" />
        <div className={cn('rounded-lg px-3 py-2', naik ? 'bg-red-50 dark:bg-red-500/10' : 'bg-emerald-50 dark:bg-emerald-500/10')}>
          <div className={cn('text-[9px] font-bold uppercase tracking-wide', naik ? 'text-red-700' : 'text-emerald-700')}>Hasil simulasi · {s.unitLabel}</div>
          <div className={cn('font-display text-2xl font-extrabold', TEKS_NADA[nadaNpl(s.sesudah.npl)])}>{persen(s.sesudah.npl)}</div>
          <div className={cn('text-[10px]', naik ? 'text-red-700' : 'text-emerald-700')}>
            {naik ? 'naik' : 'turun'} {(Math.abs(s.sesudah.npl - s.sebelum.npl)).toLocaleString('id-ID', { maximumFractionDigits: 2 })} poin
            {s.sesudah.npl >= 2 && s.sebelum.npl < 2 ? ' · lewat batas 2%' : ''}
          </div>
        </div>
      </div>
      <div className="mt-2.5 overflow-x-auto rounded-lg border">
        <table className="w-full text-[11.5px]">
          <thead>
            <tr className="bg-muted/60 text-[9.5px] uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-1.5 text-left font-bold">Yang berubah</th>
              <th className="px-2 py-1.5 text-left font-bold">Sebelum</th>
              <th className="px-2 py-1.5 text-left font-bold">Sesudah</th>
            </tr>
          </thead>
          <tbody>
            {s.perubahan.map((p, i) => (
              <tr key={i} className="border-t align-top">
                <td className="px-2 py-1.5"><b>{p.nama}</b><div className="text-[10px] text-muted-foreground">{p.ket}</div></td>
                <td className="px-2 py-1.5"><Cip l={{ teks: p.sebelum, nada: /Kol (\d)/.test(p.sebelum) ? nadaKol(Number(p.sebelum.slice(-1))) : 'abu' }} /></td>
                <td className="px-2 py-1.5"><Cip l={{ teks: p.sesudah, nada: p.nadaSesudah }} /></td>
              </tr>
            ))}
            <tr className="border-t">
              <td className="px-2 py-1.5">Baki bermasalah (kol 3–5)</td>
              <td className="whitespace-nowrap px-2 py-1.5">{rp(s.sebelum.bermasalah)}</td>
              <td className="whitespace-nowrap px-2 py-1.5 font-bold">{rp(s.sesudah.bermasalah)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {s.saran && <p className="mt-2 text-[11px] text-foreground">{s.saran}</p>}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        <button type="button" className="tb-aksi tb-aksi-utama" onClick={() => onUbah('terus kalau ')}>
          <Plus className="h-3.5 w-3.5" /> Tambah skenario
        </button>
        <button type="button" className="tb-aksi" onClick={onKeluarSimulasi}>
          <LogOut className="h-3.5 w-3.5" /> Keluar simulasi
        </button>
      </div>
    </div>
  );
};

// ------------------------------------------------------------------ utama
export const IsiJawaban: React.FC<{ hasil: HasilTanya } & Aksi> = ({ hasil, ...aksi }) => {
  const j = hasil.jawab;
  switch (j.tipe) {
    case 'tabel':
      return <Tabel t={j} {...aksi} />;
    case 'profil':
      return <Profil p={j} {...aksi} />;
    case 'npl':
      return <Npl j={j} />;
    case 'simulasi':
      return <Simulasi s={j} {...aksi} />;
    case 'pilih':
      return (
        <div>
          <p className="mb-2 text-[12.5px]">{j.teks}</p>
          <div className="grid gap-1.5 sm:grid-cols-2">
            {j.opsi.map((o) => (
              <button key={o.kirim} type="button" onClick={() => aksi.onTanya(o.kirim)} className="rounded-lg border-2 border-border bg-background px-2.5 py-1.5 text-left transition hover:border-primary hover:bg-primary/5">
                <div className="text-[12px] font-bold">{o.label}</div>
                <div className="text-[10px] text-muted-foreground">{o.sub}</div>
              </button>
            ))}
          </div>
        </div>
      );
    case 'teks':
    default:
      return (
        <div>
          {j.judul && <div className="mb-1 text-[12px] font-bold text-primary">{j.judul}</div>}
          <p className="text-[12.5px] leading-relaxed">{j.teks}</p>
          {j.saran?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {j.saran.map((s) => (
                <button key={s} type="button" onClick={() => (s.includes('…') ? aksi.onUbah(s.replace('…', '').trimEnd() + ' ') : aksi.onTanya(s))} className="rounded-full border border-primary/25 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/10">
                  {s}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      );
  }
};
