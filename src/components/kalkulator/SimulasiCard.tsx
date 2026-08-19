import React from 'react';
import { fmtRp, SKEMA_LABELS, SEGMEN_LABELS, normalizeSegmen, type LoanSkema } from '@/lib/loan-calc';
import { DEFAULT_SIMULASI_THEME, SimulasiSectionKey, SimulasiTheme } from '@/lib/simulasi-theme';
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
  const s = (n: number) => Math.round(n * T.fontScale * 10) / 10;
  const totalPenghasilan = d.gajiPokok + d.ttp;

  const primaryBg = T.useGradient
    ? `linear-gradient(120deg, ${T.primaryColor} 0%, ${T.primaryColor2} 100%)`
    : T.primaryColor;
  const successBg = T.useGradient
    ? `linear-gradient(120deg, ${T.successColor} 0%, ${T.successColor2} 100%)`
    : T.successColor;

  const Chip: React.FC<{ label: string; value: string; tone?: 'blue' | 'amber' | 'violet' | 'slate' }> = ({
    label,
    value,
    tone = 'slate',
  }) => {
    const tones = {
      blue: { bg: hexToRgba(T.primaryColor, 0.08), bd: hexToRgba(T.primaryColor, 0.25), fg: T.primaryColor },
      amber: { bg: hexToRgba(T.warnColor, 0.1), bd: hexToRgba(T.warnColor, 0.28), fg: T.warnColor },
      violet: { bg: hexToRgba(T.accentColor, 0.08), bd: hexToRgba(T.accentColor, 0.25), fg: T.accentColor },
      slate: { bg: T.cardColor, bd: T.lineColor, fg: T.inkColor },
    }[tone];
    return (
      <div style={{ background: tones.bg, border: `1px solid ${tones.bd}`, borderRadius: T.radius * 0.7, padding: '10px 14px' }}>
        <div style={{ fontSize: s(10.5), letterSpacing: 0.8, textTransform: 'uppercase', color: T.subColor, fontWeight: 700 }}>
          {label}
        </div>
        <div style={{ fontSize: s(15), fontWeight: 700, color: tones.fg, marginTop: 3 }}>{value}</div>
      </div>
    );
  };

  const Tr: React.FC<{ label: string; value: string; bold?: boolean; tone?: 'green' | 'plain'; sub?: boolean }> = ({
    label,
    value,
    bold,
    tone = 'plain',
    sub,
  }) => (
    <tr style={{ borderBottom: sub ? 'none' : `1px solid ${T.lineColor}` }}>
      <td
        style={{
          padding: sub ? '2px 0 6px 18px' : '9px 0',
          color: sub ? T.subColor : bold ? T.inkColor : T.subColor,
          fontWeight: bold ? 700 : 400,
          fontSize: s(sub ? 12 : 14),
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: sub ? '2px 0 6px 0' : '9px 0',
          textAlign: 'right',
          fontWeight: bold ? 700 : sub ? 600 : 500,
          fontSize: s(sub ? 12 : 14),
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
          background: primaryBg,
          borderRadius: T.radius,
          padding: '20px 24px',
          color: T.headerTextColor,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: s(11), letterSpacing: 1.6, textTransform: 'uppercase', opacity: 0.85 }}>{T.title}</div>
          <div
            style={{
              fontSize: s(26),
              fontWeight: 800,
              marginTop: 6,
              letterSpacing: -0.4,
              lineHeight: 1.35,
              paddingBottom: 4,
            }}
          >
            {d.namaDebitur || '—'}
          </div>
          <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: normalizeSegmen(d.segmen) === 'produktif' ? '#059669' : '#2563eb',
                color: '#ffffff',
                borderRadius: 999,
                padding: '0 12px',
                height: Math.round(s(10.5) * 2),
                fontSize: s(10.5),
                fontWeight: 700,
                letterSpacing: 0.8,
                textTransform: 'uppercase',
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}
            >
              {SEGMEN_LABELS[normalizeSegmen(d.segmen)]}
            </span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                fontSize: s(13),
                opacity: 0.9,
                height: Math.round(s(10.5) * 2),
                lineHeight: 1,
              }}
            >
              {d.produk || 'Produk Kredit'}
            </span>
          </div>

        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: s(12), letterSpacing: 1.4, textTransform: 'uppercase', opacity: 0.85 }}>{T.bankName}</div>
          <div style={{ fontSize: s(15), fontWeight: 700 }}>{T.branchName}</div>
          <div style={{ fontSize: s(11), opacity: 0.85, marginTop: 4 }}>{d.tanggal}</div>
        </div>
      </div>
    ),
    sorotan: (
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 16 }}>
        <div
          style={{
            background: hexToRgba(T.primaryColor, 0.07),
            border: `1px solid ${hexToRgba(T.primaryColor, 0.22)}`,
            borderRadius: T.radius,
            padding: '18px 22px',
          }}
        >
          <div style={{ fontSize: s(11.5), letterSpacing: 1.4, textTransform: 'uppercase', color: T.primaryColor, fontWeight: 700 }}>
            Plafon Pengajuan
          </div>
          <div style={{ fontSize: s(40), fontWeight: 800, color: T.primaryColor, marginTop: 6, letterSpacing: -1 }}>
            {fmtRp(d.plafon)}
          </div>
        </div>
        <div
          style={{
            background: hexToRgba(T.accentColor, 0.07),
            border: `1px solid ${hexToRgba(T.accentColor, 0.22)}`,
            borderRadius: T.radius,
            padding: '18px 22px',
          }}
        >
          <div style={{ fontSize: s(11.5), letterSpacing: 1.4, textTransform: 'uppercase', color: T.accentColor, fontWeight: 700 }}>
            Jangka Waktu
          </div>
          <div style={{ fontSize: s(40), fontWeight: 800, color: T.accentColor, marginTop: 6, letterSpacing: -1 }}>
            {d.tenorBulan} <span style={{ fontSize: s(20), fontWeight: 700 }}>bulan</span>
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
          background: primaryBg,
          color: T.headerTextColor,
          borderRadius: T.radius,
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <div style={{ fontSize: s(11), letterSpacing: 1.6, textTransform: 'uppercase', opacity: 0.85 }}>
            Angsuran per Bulan
          </div>
          <div style={{ fontSize: s(34), fontWeight: 800, marginTop: 4 }}>{fmtRp(d.angsuranPertama)}</div>
          {d.angsuranTerakhir != null && d.angsuranTerakhir > 0 && d.angsuranTerakhir !== d.angsuranPertama && (
            <div style={{ fontSize: s(12), opacity: 0.9, marginTop: 2 }}>
              Angsuran terakhir {fmtRp(d.angsuranTerakhir)}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', fontSize: s(12.5), lineHeight: 1.7, opacity: 0.95 }}>
          <div>
            Total Angsuran: <b>{fmtRp(d.totalAngsuran)}</b>
          </div>
          <div>
            Total Bunga: <b>{fmtRp(d.totalBunga)}</b>
          </div>
        </div>
      </div>
    ),
    penghasilan:
      totalPenghasilan > 0 ? (
        <div style={{ padding: 16, background: T.cardColor, border: `1px solid ${T.lineColor}`, borderRadius: T.radius * 0.85 }}>
          <div style={{ fontSize: s(11), letterSpacing: 1.2, textTransform: 'uppercase', color: T.subColor, fontWeight: 700, marginBottom: 8 }}>
            Penghasilan Debitur
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: s(14) }}>
            <div>
              <div style={{ color: T.subColor, fontSize: s(11.5) }}>Gaji Pokok</div>
              <div style={{ fontWeight: 700 }}>{fmtRp(d.gajiPokok)}</div>
            </div>
            <div>
              <div style={{ color: T.subColor, fontSize: s(11.5) }}>Penghasilan Lainnya</div>
              <div style={{ fontWeight: 700 }}>{fmtRp(d.ttp)}</div>
            </div>
            <div>
              <div style={{ color: T.subColor, fontSize: s(11.5) }}>Total Penghasilan</div>
              <div style={{ fontWeight: 800, color: T.primaryColor }}>{fmtRp(totalPenghasilan)}</div>
            </div>
          </div>
        </div>
      ) : null,
    potongan: (
      <div style={{ border: `1px solid ${T.lineColor}`, borderRadius: T.radius * 0.85, padding: '14px 18px' }}>
        <div style={{ fontSize: s(11), letterSpacing: 1.2, textTransform: 'uppercase', color: T.subColor, fontWeight: 700, marginBottom: 4 }}>
          Rincian Potongan di Muka
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            <Tr label={`Asuransi Jiwa (${d.asuransiJiwaProvider})`} value={fmtRp(d.asuransiJiwa)} />
            {!!d.subsidiJiwa && d.subsidiJiwa > 0 && (
              <>
                <Tr sub label="Premi sebelum subsidi" value={fmtRp(d.premiJiwaAktual ?? 0)} />
                <Tr sub tone="green" label="Subsidi premi dari bank" value={`− ${fmtRp(d.subsidiJiwa)}`} />
              </>
            )}
            {d.asuransiKredit > 0 && <Tr label="Asuransi Kredit" value={fmtRp(d.asuransiKredit)} />}
            <Tr label="Provisi" value={fmtRp(d.provisi)} />
            {d.biaya.map((b, i) => (
              <Tr key={`${b.label}-${i}`} label={b.label} value={fmtRp(b.nominal)} />
            ))}
            {d.blokir > 0 && <Tr label="Blokir Angsuran" value={fmtRp(d.blokir)} />}
            <Tr label="Total Potongan" value={fmtRp(d.totalPotongan)} bold />
          </tbody>
        </table>
      </div>
    ),
    pelunasan:
      d.pelunasan && d.pelunasan.total > 0 ? (
        <div
          style={{
            padding: '14px 18px',
            background: hexToRgba(T.warnColor, 0.08),
            border: `1px solid ${hexToRgba(T.warnColor, 0.25)}`,
            borderRadius: T.radius * 0.85,
          }}
        >
          <div style={{ fontSize: s(11), letterSpacing: 1.2, textTransform: 'uppercase', color: T.warnColor, fontWeight: 700, marginBottom: 4 }}>
            Pelunasan Pinjaman Lama
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <Tr label="Sisa Pokok" value={fmtRp(d.pelunasan.pokok)} />
              <Tr label="Bunga Berjalan" value={fmtRp(d.pelunasan.bunga)} />
              <Tr label="Total Pelunasan" value={fmtRp(d.pelunasan.total)} bold />
            </tbody>
          </table>
        </div>
      ) : null,
    dana: (
      <div
        style={{
          padding: '22px 24px',
          background: successBg,
          color: T.headerTextColor,
          borderRadius: T.radius,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: s(11.5), letterSpacing: 1.6, textTransform: 'uppercase', opacity: 0.9 }}>
            Dana Diterima Debitur
          </div>
          {d.pelunasan && d.pelunasan.total > 0 && (
            <div style={{ fontSize: s(11.5), opacity: 0.9, marginTop: 4 }}>
              Sudah dikurangi pelunasan {fmtRp(d.pelunasan.total)}
            </div>
          )}
        </div>
        <div style={{ fontSize: s(38), fontWeight: 800, letterSpacing: -0.8 }}>{fmtRp(d.danaDiterima)}</div>
      </div>
    ),
    footer: (
      <div
        style={{
          paddingTop: 12,
          borderTop: `1px solid ${T.lineColor}`,
          fontSize: s(11),
          color: T.subColor,
          display: 'flex',
          justifyContent: 'space-between',
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
