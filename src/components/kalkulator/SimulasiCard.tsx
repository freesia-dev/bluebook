import React from 'react';
import { fmtRp, SKEMA_LABELS, SEGMEN_LABELS, normalizeSegmen, type LoanSkema } from '@/lib/loan-calc';
import {
  DEFAULT_SIMULASI_THEME,
  SimulasiSectionKey,
  SimulasiTheme,
  getLabel,
  warnaBagian,
  cssRataMendatar,
  flexRataMendatar,
  flexRataTegak,
} from '@/lib/simulasi-theme';
import { useSimulasiTheme } from '@/hooks/use-simulasi-theme';

export interface SimulasiCardData {
  namaDebitur: string;
  produk: string;
  skema: string;
  segmen?: string | null;
  plafon: number;
  tenorBulan: number;
  bungaPa: number | string;
  promoNama?: string | null;
  promoLabel?: string | null;
  gajiPokok: number;
  ttp: number;
  dsrPct?: number | null;
  angsuranPertama: number;
  angsuranTerakhir?: number;
  totalAngsuran: number;
  totalBunga: number;
  asuransiJiwa: number;
  asuransiJiwaProvider: string;
  premiJiwaAktual?: number;
  subsidiJiwa?: number;
  asuransiKredit: number;
  provisi: number;
  biaya: { label: string; nominal: number }[];
  blokir: number;
  totalPotongan: number;
  pelunasan?: { pokok: number; bunga: number; total: number } | null;
  danaDiterima: number;
  namaAo?: string | null;
  tanggal: string;
}

const hexToRgba = (hex: string, a: number) => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full || '000000', 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
};

/** Kartu ringkasan simulasi — dipakai untuk export JPG dan pratinjau detail. */
export const SimulasiCard = React.forwardRef<
  HTMLDivElement,
  { data: SimulasiCardData; theme?: SimulasiTheme; scaleToFit?: boolean }
>(({ data: d, theme: themeProp, scaleToFit }, ref) => {
  const { theme: themeDb } = useSimulasiTheme();
  const T = themeProp ?? themeDb ?? DEFAULT_SIMULASI_THEME;
  const scaleFor = (key: SimulasiSectionKey) => T.sectionFontScale?.[key] ?? 1;
  const s = (n: number, key: SimulasiSectionKey = 'header') =>
    Math.round(n * T.fontScale * scaleFor(key) * 10) / 10;
  const totalPenghasilan = d.gajiPokok + d.ttp;

  /* Warna per bagian: kalau bagian itu punya warna sendiri, itu yang dipakai;
     kalau tidak, ikut warna global seperti sebelumnya. */
  const w = (key: SimulasiSectionKey, bidang: 'color' | 'color2' | 'textColor', bawaan: string) =>
    warnaBagian(T, key, bidang, bawaan);

  /** Latar blok berwarna (header, angsuran, dana) dengan warna khusus bagiannya. */
  const latar = (key: SimulasiSectionKey, c1: string, c2: string) => {
    const a = w(key, 'color', c1);
    const b = w(key, 'color2', c2);
    return T.useGradient ? `linear-gradient(120deg, ${a} 0%, ${b} 100%)` : a;
  };

  const gaya = (key: SimulasiSectionKey) => T.sectionStyle?.[key];

  const warnaChip = warnaBagian(T, 'chips', 'color', T.primaryColor);
  const warnaChip2 = warnaBagian(T, 'chips', 'color2', T.accentColor);

  const Chip: React.FC<{ label: string; value: string; tone?: 'blue' | 'amber' | 'violet' | 'slate' }> = ({
    label,
    value,
    tone = 'slate',
  }) => {
    const tones = {
      blue: { bg: hexToRgba(warnaChip, 0.08), bd: hexToRgba(warnaChip, 0.25), fg: warnaChip },
      amber: { bg: hexToRgba(T.warnColor, 0.1), bd: hexToRgba(T.warnColor, 0.28), fg: T.warnColor },
      violet: { bg: hexToRgba(warnaChip2, 0.08), bd: hexToRgba(warnaChip2, 0.25), fg: warnaChip2 },
      slate: { bg: T.cardColor, bd: T.lineColor, fg: T.inkColor },
    }[tone];
    return (
      <div style={{ background: tones.bg, border: `1px solid ${tones.bd}`, borderRadius: T.radius * 0.7, padding: '10px 14px', textAlign: cssRataMendatar(T.sectionStyle?.chips?.align) }}>
        <div style={{ fontSize: s(10.5, 'chips'), letterSpacing: 0.8, textTransform: 'uppercase', color: T.subColor, fontWeight: 700 }}>
          {label}
        </div>
        <div style={{ fontSize: s(15, 'chips'), fontWeight: 700, color: tones.fg, marginTop: 3 }}>{value}</div>
      </div>
    );
  };

  const Tr: React.FC<{
    label: string;
    value: string;
    bold?: boolean;
    tone?: 'green' | 'plain';
    sub?: boolean;
    section: 'potongan' | 'pelunasan';
  }> = ({ label, value, bold, tone = 'plain', sub, section }) => (
    <tr style={{ borderBottom: sub ? 'none' : `1px solid ${T.lineColor}` }}>
      <td
        style={{
          padding: sub ? '2px 0 6px 18px' : '9px 0',
          color: sub ? T.subColor : bold ? T.inkColor : T.subColor,
          fontWeight: bold ? 700 : 400,
          fontSize: s(sub ? 12 : 14, section),
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: sub ? '2px 0 6px 0' : '9px 0',
          textAlign: 'right',
          fontWeight: bold ? 700 : sub ? 600 : 500,
          fontSize: s(sub ? 12 : 14, section),
          color: tone === 'green' ? T.successColor : T.inkColor,
        }}
      >
        {value}
      </td>
    </tr>
  );

  const sections: Record<SimulasiSectionKey, React.ReactNode> = {
    header: (
      <div
        style={{
          background: latar('header', T.primaryColor, T.primaryColor2),
          borderRadius: T.radius,
          padding: '20px 24px',
          color: w('header', 'textColor', T.headerTextColor),
          display: 'flex',
          justifyContent: gaya('header')?.align ? flexRataMendatar(gaya('header')!.align) : 'space-between',
          alignItems: flexRataTegak(gaya('header')?.valign ?? 'tengah'),
          gap: gaya('header')?.align ? 24 : 0,
        }}
      >
        <div style={{ textAlign: cssRataMendatar(gaya('header')?.align) }}>
          <div style={{ fontSize: s(11, 'header'), letterSpacing: 1.6, textTransform: 'uppercase', opacity: 0.85 }}>{T.title}</div>
          <div
            style={{
              fontSize: s(26, 'header'),
              fontWeight: 800,
              marginTop: 6,
              letterSpacing: -0.4,
              lineHeight: 1.35,
              paddingBottom: 4,
            }}
          >
            {d.namaDebitur || '—'}
          </div>
          <div style={{ marginTop: 10, fontSize: s(13, 'header'), opacity: 0.9, lineHeight: 1.4 }}>
            {d.produk || 'Produk Kredit'}
          </div>

        </div>
        <div style={{ textAlign: gaya('header')?.align ? cssRataMendatar(gaya('header')!.align) : 'right' }}>
          <div style={{ fontSize: s(12, 'header'), letterSpacing: 1.4, textTransform: 'uppercase', opacity: 0.85 }}>{T.bankName}</div>
          <div style={{ fontSize: s(15, 'header'), fontWeight: 700 }}>{T.branchName}</div>
          <div style={{ fontSize: s(11, 'header'), opacity: 0.85, marginTop: 4 }}>{d.tanggal}</div>
          <div
            style={{
              fontSize: s(10.5, 'header'),
              fontWeight: 700,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              opacity: 0.9,
              marginTop: 12,
              lineHeight: 1.3,
            }}
          >
            Kredit {SEGMEN_LABELS[normalizeSegmen(d.segmen)]}
          </div>
        </div>
      </div>
    ),
    sorotan: (
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 16 }}>
        <div
          style={{
            background: hexToRgba(w('sorotan', 'color', T.primaryColor), 0.07),
            border: `1px solid ${hexToRgba(w('sorotan', 'color', T.primaryColor), 0.22)}`,
            borderRadius: T.radius,
            padding: '18px 22px',
            textAlign: cssRataMendatar(gaya('sorotan')?.align),
          }}
        >
          <div style={{ fontSize: s(11.5, 'sorotan'), letterSpacing: 1.4, textTransform: 'uppercase', color: w('sorotan', 'color', T.primaryColor), fontWeight: 700 }}>
            {getLabel(T, 'sorotan.plafon')}
          </div>
          <div style={{ fontSize: s(40, 'sorotan'), fontWeight: 800, color: w('sorotan', 'color', T.primaryColor), marginTop: 6, letterSpacing: -1 }}>
            {fmtRp(d.plafon)}
          </div>
        </div>
        <div
          style={{
            background: hexToRgba(w('sorotan', 'color2', T.accentColor), 0.07),
            border: `1px solid ${hexToRgba(w('sorotan', 'color2', T.accentColor), 0.22)}`,
            borderRadius: T.radius,
            padding: '18px 22px',
            textAlign: cssRataMendatar(gaya('sorotan')?.align),
          }}
        >
          <div style={{ fontSize: s(11.5, 'sorotan'), letterSpacing: 1.4, textTransform: 'uppercase', color: w('sorotan', 'color2', T.accentColor), fontWeight: 700 }}>
            {getLabel(T, 'sorotan.tenor')}
          </div>
          <div style={{ fontSize: s(40, 'sorotan'), fontWeight: 800, color: w('sorotan', 'color2', T.accentColor), marginTop: 6, letterSpacing: -1 }}>
            {d.tenorBulan} <span style={{ fontSize: s(20, 'sorotan'), fontWeight: 700 }}>bulan</span>
          </div>
        </div>
      </div>
    ),
    chips: (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        <Chip label="Skema" value={SKEMA_LABELS[d.skema as LoanSkema] ?? String(d.skema).toUpperCase()} />
        <Chip label="Suku Bunga" value={`${d.bungaPa}% p.a.`} tone={d.promoLabel ? 'amber' : 'blue'} />
        {d.promoLabel ? (
          <Chip label={d.promoNama || 'Program Promo'} value={d.promoLabel} tone="amber" />
        ) : (
          <Chip label="Angsuran / Bulan" value={fmtRp(d.angsuranPertama)} tone="blue" />
        )}
        <Chip label="Rasio Angsuran (DSR)" value={d.dsrPct != null ? `${d.dsrPct.toFixed(1)}%` : '-'} tone="violet" />
      </div>
    ),
    angsuran: (
      <div
        style={{
          background: latar('angsuran', T.primaryColor, T.primaryColor2),
          color: w('angsuran', 'textColor', T.headerTextColor),
          borderRadius: T.radius,
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: gaya('angsuran')?.align ? flexRataMendatar(gaya('angsuran')!.align) : 'center',
          textAlign: gaya('angsuran')?.align ? cssRataMendatar(gaya('angsuran')!.align) : 'center',
        }}
      >
        <div style={{ fontSize: s(11, 'angsuran'), letterSpacing: 1.6, textTransform: 'uppercase', opacity: 0.85 }}>
          {getLabel(T, 'angsuran.title')}
        </div>
        <div style={{ fontSize: s(34, 'angsuran'), fontWeight: 800, marginTop: 4 }}>{fmtRp(d.angsuranPertama)}</div>
        {d.angsuranTerakhir != null && d.angsuranTerakhir > 0 && d.angsuranTerakhir !== d.angsuranPertama && (
          <div style={{ fontSize: s(12, 'angsuran'), opacity: 0.9, marginTop: 2 }}>
            Angsuran terakhir {fmtRp(d.angsuranTerakhir)}
          </div>
        )}
      </div>
    ),
    penghasilan:
      totalPenghasilan > 0 ? (
        <div style={{ padding: 16, background: T.cardColor, border: `1px solid ${T.lineColor}`, borderRadius: T.radius * 0.85, textAlign: cssRataMendatar(gaya('penghasilan')?.align) }}>
          <div style={{ fontSize: s(11, 'penghasilan'), letterSpacing: 1.2, textTransform: 'uppercase', color: T.subColor, fontWeight: 700, marginBottom: 8 }}>
            {getLabel(T, 'penghasilan.title')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: s(14, 'penghasilan') }}>
            <div>
              <div style={{ color: T.subColor, fontSize: s(11.5, 'penghasilan') }}>Gaji Pokok</div>
              <div style={{ fontWeight: 700 }}>{fmtRp(d.gajiPokok)}</div>
            </div>
            <div>
              <div style={{ color: T.subColor, fontSize: s(11.5, 'penghasilan') }}>Penghasilan Lainnya</div>
              <div style={{ fontWeight: 700 }}>{fmtRp(d.ttp)}</div>
            </div>
            <div>
              <div style={{ color: T.subColor, fontSize: s(11.5, 'penghasilan') }}>Total Penghasilan</div>
              <div style={{ fontWeight: 800, color: w('penghasilan', 'color', T.primaryColor) }}>{fmtRp(totalPenghasilan)}</div>
            </div>
          </div>
        </div>
      ) : null,
    potongan: (
      <div style={{ border: `1px solid ${T.lineColor}`, borderRadius: T.radius * 0.85, padding: '14px 18px' }}>
        <div style={{ fontSize: s(11, 'potongan'), letterSpacing: 1.2, textTransform: 'uppercase', color: w('potongan', 'color', T.subColor), fontWeight: 700, marginBottom: 4, textAlign: cssRataMendatar(gaya('potongan')?.align) }}>
          {getLabel(T, 'potongan.title')}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <Tr section="potongan" label={`Asuransi Jiwa (${d.asuransiJiwaProvider})`} value={fmtRp(d.asuransiJiwa)} />
            {!!d.subsidiJiwa && d.subsidiJiwa > 0 && (
              <>
                <Tr section="potongan" sub label="Premi sebelum subsidi" value={fmtRp(d.premiJiwaAktual ?? 0)} />
                <Tr section="potongan" sub tone="green" label="Subsidi premi dari bank" value={`− ${fmtRp(d.subsidiJiwa)}`} />
              </>
            )}
            {d.asuransiKredit > 0 && <Tr section="potongan" label="Asuransi Kredit" value={fmtRp(d.asuransiKredit)} />}
            <Tr section="potongan" label="Provisi" value={fmtRp(d.provisi)} />
            {d.biaya.map((b, i) => (
              <Tr section="potongan" key={`${b.label}-${i}`} label={b.label} value={fmtRp(b.nominal)} />
            ))}
            {d.blokir > 0 && <Tr section="potongan" label="Blokir Angsuran" value={fmtRp(d.blokir)} />}
            <Tr section="potongan" label="Total Potongan" value={fmtRp(d.totalPotongan)} bold />
          </tbody>
        </table>
      </div>
    ),
    pelunasan:
      d.pelunasan && d.pelunasan.total > 0 ? (
        <div
          style={{
            padding: '14px 18px',
            background: hexToRgba(w('pelunasan', 'color', T.warnColor), 0.08),
            border: `1px solid ${hexToRgba(w('pelunasan', 'color', T.warnColor), 0.25)}`,
            borderRadius: T.radius * 0.85,
          }}
        >
          <div style={{ fontSize: s(11, 'pelunasan'), letterSpacing: 1.2, textTransform: 'uppercase', color: w('pelunasan', 'color', T.warnColor), fontWeight: 700, marginBottom: 4, textAlign: cssRataMendatar(gaya('pelunasan')?.align) }}>
            {getLabel(T, 'pelunasan.title')}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <Tr section="pelunasan" label="Sisa Pokok" value={fmtRp(d.pelunasan.pokok)} />
              <Tr section="pelunasan" label="Bunga Berjalan" value={fmtRp(d.pelunasan.bunga)} />
              <Tr section="pelunasan" label="Total Pelunasan" value={fmtRp(d.pelunasan.total)} bold />
            </tbody>
          </table>
        </div>
      ) : null,
    dana: (
      <div
        style={{
          padding: '22px 24px',
          background: latar('dana', T.successColor, T.successColor2),
          color: w('dana', 'textColor', T.headerTextColor),
          borderRadius: T.radius,
          display: 'flex',
          justifyContent: gaya('dana')?.align ? flexRataMendatar(gaya('dana')!.align) : 'space-between',
          alignItems: flexRataTegak(gaya('dana')?.valign ?? 'tengah'),
          gap: gaya('dana')?.align ? 20 : 0,
          textAlign: cssRataMendatar(gaya('dana')?.align),
        }}
      >
        <div>
          <div style={{ fontSize: s(11.5, 'dana'), letterSpacing: 1.6, textTransform: 'uppercase', opacity: 0.9 }}>
            {getLabel(T, 'dana.title')}
          </div>
          {d.pelunasan && d.pelunasan.total > 0 && (
            <div style={{ fontSize: s(11.5, 'dana'), opacity: 0.9, marginTop: 4 }}>
              Sudah dikurangi pelunasan {fmtRp(d.pelunasan.total)}
            </div>
          )}
        </div>
        <div style={{ fontSize: s(38, 'dana'), fontWeight: 800, letterSpacing: -0.8 }}>{fmtRp(d.danaDiterima)}</div>
      </div>
    ),
    footer: (
      <div
        style={{
          paddingTop: 12,
          borderTop: `1px solid ${T.lineColor}`,
          fontSize: s(11, 'footer'),
          color: w('footer', 'color', T.subColor),
          display: 'flex',
          justifyContent: gaya('footer')?.align ? flexRataMendatar(gaya('footer')!.align) : 'space-between',
          alignItems: flexRataTegak(gaya('footer')?.valign),
          gap: 16,
        }}
      >
        <span>{T.footerNote}</span>
        <span>Account Officer: {d.namaAo || '-'}</span>
      </div>
    ),
  };

  return (
    <div
      ref={ref}
      style={{
        width: T.cardWidth,
        padding: T.padding,
        background: T.bgColor,
        fontFamily: T.fontFamily,
        color: T.inkColor,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        ...(scaleToFit
          ? { transform: 'scale(var(--sim-scale, 1))', transformOrigin: 'top left' }
          : {}),
      }}
    >
      {T.order
        .filter((k) => !T.hidden.includes(k))
        .map((k) => {
          const node = sections[k];
          return node ? <React.Fragment key={k}>{node}</React.Fragment> : null;
        })}
    </div>
  );
});
SimulasiCard.displayName = 'SimulasiCard';

export default SimulasiCard;
