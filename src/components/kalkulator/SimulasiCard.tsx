import React from 'react';
import { fmtRp } from '@/lib/loan-calc';

export interface SimulasiCardData {
  namaDebitur: string;
  produk: string;
  skema: string;
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

const C = {
  ink: '#0f172a',
  sub: '#64748b',
  line: '#e2e8f0',
  blue: '#003f7f',
  blueSoft: '#eef4fb',
  green: '#047857',
  amber: '#b45309',
  white: '#ffffff',
};

const Chip: React.FC<{ label: string; value: string; tone?: 'blue' | 'amber' | 'violet' | 'slate' }> = ({
  label,
  value,
  tone = 'slate',
}) => {
  const tones = {
    blue: { bg: '#eef4fb', bd: '#c7dcf2', fg: C.blue },
    amber: { bg: '#fef6e7', bd: '#f6d9a4', fg: '#b45309' },
    violet: { bg: '#f2effc', bd: '#d9d0f5', fg: '#5b34c7' },
    slate: { bg: '#f5f7fa', bd: C.line, fg: C.ink },
  }[tone];
  return (
    <div style={{ background: tones.bg, border: `1px solid ${tones.bd}`, borderRadius: 10, padding: '10px 14px' }}>
      <div style={{ fontSize: 10.5, letterSpacing: 0.8, textTransform: 'uppercase', color: C.sub, fontWeight: 700 }}>
        {label}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: tones.fg, marginTop: 3 }}>{value}</div>
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
  <tr style={{ borderBottom: sub ? 'none' : `1px solid ${C.line}` }}>
    <td
      style={{
        padding: sub ? '2px 0 6px 18px' : '9px 0',
        color: sub ? C.sub : bold ? C.ink : '#475569',
        fontWeight: bold ? 700 : 400,
        fontSize: sub ? 12 : 14,
      }}
    >
      {label}
    </td>
    <td
      style={{
        padding: sub ? '2px 0 6px 0' : '9px 0',
        textAlign: 'right',
        fontWeight: bold ? 700 : sub ? 600 : 500,
        fontSize: sub ? 12 : 14,
        color: tone === 'green' ? C.green : C.ink,
      }}
    >
      {value}
    </td>
  </tr>
);

/** Kartu ringkasan simulasi — dipakai untuk export JPG dan pratinjau detail. */
export const SimulasiCard = React.forwardRef<HTMLDivElement, { data: SimulasiCardData }>(({ data: d }, ref) => {
  const totalPenghasilan = d.gajiPokok + d.ttp;
  return (
    <div
      ref={ref}
      style={{
        width: 900,
        padding: 36,
        background: C.white,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: C.ink,
      }}
    >
      {/* Header */}
      <div
        style={{
          background: 'linear-gradient(120deg, #003f7f 0%, #0b5fa5 55%, #1181c4 100%)',
          borderRadius: 14,
          padding: '20px 24px',
          color: C.white,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', opacity: 0.85 }}>
            Simulasi Angsuran Kredit
          </div>
          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 4, letterSpacing: -0.4 }}>{d.namaDebitur || '—'}</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 2 }}>{d.produk || 'Produk Kredit'}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', opacity: 0.85 }}>Bankaltimtara</div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>KCP Telihan</div>
          <div style={{ fontSize: 11, opacity: 0.85, marginTop: 4 }}>{d.tanggal}</div>
        </div>
      </div>

      {/* Plafon & Jangka Waktu — sorotan utama */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 16, marginTop: 18 }}>
        <div
          style={{
            background: C.blueSoft,
            border: '1px solid #c7dcf2',
            borderRadius: 14,
            padding: '18px 22px',
          }}
        >
          <div style={{ fontSize: 11.5, letterSpacing: 1.4, textTransform: 'uppercase', color: C.blue, fontWeight: 700 }}>
            Plafon Pengajuan
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, color: C.blue, marginTop: 6, letterSpacing: -1 }}>
            {fmtRp(d.plafon)}
          </div>
        </div>
        <div
          style={{
            background: '#f2effc',
            border: '1px solid #d9d0f5',
            borderRadius: 14,
            padding: '18px 22px',
          }}
        >
          <div style={{ fontSize: 11.5, letterSpacing: 1.4, textTransform: 'uppercase', color: '#5b34c7', fontWeight: 700 }}>
            Jangka Waktu
          </div>
          <div style={{ fontSize: 40, fontWeight: 800, color: '#5b34c7', marginTop: 6, letterSpacing: -1 }}>
            {d.tenorBulan} <span style={{ fontSize: 20, fontWeight: 700 }}>bulan</span>
          </div>
        </div>
      </div>

      {/* Chips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginTop: 14 }}>
        <Chip label="Skema" value={String(d.skema).toUpperCase()} />
        <Chip label="Suku Bunga" value={`${d.bungaPa}% p.a.`} tone={d.promoLabel ? 'amber' : 'blue'} />
        {d.promoLabel ? (
          <Chip label={d.promoNama || 'Program Promo'} value={d.promoLabel} tone="amber" />
        ) : (
          <Chip label="Angsuran / Bulan" value={fmtRp(d.angsuranPertama)} tone="blue" />
        )}
        <Chip
          label="Rasio Angsuran (DSR)"
          value={d.dsrPct != null ? `${d.dsrPct.toFixed(1)}%` : '-'}
          tone="violet"
        />
      </div>

      {/* Angsuran */}
      <div
        style={{
          marginTop: 16,
          background: 'linear-gradient(120deg, #003f7f 0%, #0b5fa5 100%)',
          color: C.white,
          borderRadius: 14,
          padding: '20px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <div style={{ fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', opacity: 0.85 }}>
            Angsuran per Bulan
          </div>
          <div style={{ fontSize: 34, fontWeight: 800, marginTop: 4 }}>{fmtRp(d.angsuranPertama)}</div>
          {d.angsuranTerakhir != null && d.angsuranTerakhir > 0 && d.angsuranTerakhir !== d.angsuranPertama && (
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 2 }}>
              Angsuran terakhir {fmtRp(d.angsuranTerakhir)}
            </div>
          )}
        </div>
        <div style={{ textAlign: 'right', fontSize: 12.5, lineHeight: 1.7, opacity: 0.95 }}>
          <div>
            Total Angsuran: <b>{fmtRp(d.totalAngsuran)}</b>
          </div>
          <div>
            Total Bunga: <b>{fmtRp(d.totalBunga)}</b>
          </div>
        </div>
      </div>

      {/* Penghasilan */}
      {totalPenghasilan > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: 16,
            background: '#f5f7fa',
            border: `1px solid ${C.line}`,
            borderRadius: 12,
          }}
        >
          <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: C.sub, fontWeight: 700, marginBottom: 8 }}>
            Penghasilan Debitur
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, fontSize: 14 }}>
            <div>
              <div style={{ color: C.sub, fontSize: 11.5 }}>Gaji Pokok</div>
              <div style={{ fontWeight: 700 }}>{fmtRp(d.gajiPokok)}</div>
            </div>
            <div>
              <div style={{ color: C.sub, fontSize: 11.5 }}>Penghasilan Lainnya</div>
              <div style={{ fontWeight: 700 }}>{fmtRp(d.ttp)}</div>
            </div>
            <div>
              <div style={{ color: C.sub, fontSize: 11.5 }}>Total Penghasilan</div>
              <div style={{ fontWeight: 800, color: C.blue }}>{fmtRp(totalPenghasilan)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Potongan */}
      <div style={{ marginTop: 18, border: `1px solid ${C.line}`, borderRadius: 12, padding: '14px 18px' }}>
        <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: C.sub, fontWeight: 700, marginBottom: 4 }}>
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

      {/* Pelunasan */}
      {d.pelunasan && d.pelunasan.total > 0 && (
        <div style={{ marginTop: 16, padding: '14px 18px', background: '#fef6e7', border: '1px solid #f6d9a4', borderRadius: 12 }}>
          <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: C.amber, fontWeight: 700, marginBottom: 4 }}>
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
      )}

      {/* Dana diterima */}
      <div
        style={{
          marginTop: 18,
          padding: '22px 24px',
          background: 'linear-gradient(120deg, #047857 0%, #10a06b 100%)',
          color: C.white,
          borderRadius: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ fontSize: 11.5, letterSpacing: 1.6, textTransform: 'uppercase', opacity: 0.9 }}>
            Dana Diterima Debitur
          </div>
          {d.pelunasan && d.pelunasan.total > 0 && (
            <div style={{ fontSize: 11.5, opacity: 0.9, marginTop: 4 }}>
              Sudah dikurangi pelunasan {fmtRp(d.pelunasan.total)}
            </div>
          )}
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, letterSpacing: -0.8 }}>{fmtRp(d.danaDiterima)}</div>
      </div>

      <div
        style={{
          marginTop: 16,
          paddingTop: 12,
          borderTop: `1px solid ${C.line}`,
          fontSize: 11,
          color: C.sub,
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Simulasi — bukan dokumen perjanjian kredit. Nilai dapat berubah sewaktu-waktu.</span>
        <span>Account Officer: {d.namaAo || '-'}</span>
      </div>
    </div>
  );
});
SimulasiCard.displayName = 'SimulasiCard';

export default SimulasiCard;
