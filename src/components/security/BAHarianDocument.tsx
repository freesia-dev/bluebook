import React from 'react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { QRCodeSVG } from 'qrcode.react';
import { KopSuratBank } from '@/components/print/KopSuratBank';
import { SHIFT_LABEL, SHIFT_PERIODE_ORDER, type SecurityShift, type SecurityLogEntry } from '@/hooks/use-security-log';

interface Props {
  tanggal: string;
  nomorBA: string;
  shifts: SecurityShift[];
  entries: SecurityLogEntry[];
  pageBreakAfter?: boolean;
}

/**
 * Body BA Mutasi Aktivitas Pengamanan untuk 1 hari.
 * Dipakai oleh halaman cetak harian & cetak bulk (gabungan banyak tanggal).
 */
export const BAHarianDocument: React.FC<Props> = ({
  tanggal,
  nomorBA,
  shifts,
  entries,
  pageBreakAfter = false,
}) => {
  const sorted = [...shifts].sort((a, b) => {
    const o = (SHIFT_PERIODE_ORDER[a.shift] ?? 9) - (SHIFT_PERIODE_ORDER[b.shift] ?? 9);
    if (o !== 0) return o;
    return a.jam_mulai.localeCompare(b.jam_mulai);
  });

  const signedShift = sorted.find((s) => s.ttd_pimpinan_nama);
  const ttdName = signedShift?.ttd_pimpinan_nama;
  const ttdAt = signedShift?.ttd_pimpinan_at;
  const baToken = (signedShift as any)?.ba_signature_token as string | undefined;
  const VERIFY_BASE = 'https://bluebook-tlh.my.id';
  const verifyUrl = baToken ? `${VERIFY_BASE}/verify/ba-security/${baToken}` : null;

  const tanggalStr = format(new Date(tanggal), 'dd MMMM yyyy', { locale: idLocale });
  const hariStr = format(new Date(tanggal), 'EEEE', { locale: idLocale });

  return (
    <div
      className="ba-print-page mx-auto bg-white shadow-lg print:shadow-none my-6 print:my-0 p-[2cm] print:p-0"
      style={{
        width: '21cm',
        minHeight: '29.7cm',
        fontFamily: 'Arial, Helvetica, sans-serif',
        fontSize: '10.5pt',
        color: '#111',
        pageBreakAfter: pageBreakAfter ? 'always' : 'auto',
      }}
    >
      <KopSuratBank />

      <div className="text-center my-4">
        <h1 className="text-[13pt] font-bold tracking-wide text-[#003F7F]">
          BERITA ACARA MUTASI AKTIVITAS PENGAMANAN
        </h1>
        <div className="text-[10pt] mt-1 text-slate-600">Nomor: {nomorBA}</div>
      </div>

      <p className="text-justify mb-4 leading-relaxed">
        Pada hari <strong>{hariStr}</strong>, tanggal <strong>{tanggalStr}</strong>, telah dilaksanakan
        pengawasan keamanan di lingkungan PT. BPD Kaltim Kaltara Kantor Cabang Pembantu Telihan oleh
        petugas Security dalam {sorted.length} shift berurutan (Pagi → Sore → Malam), dengan rincian
        aktivitas sebagai berikut:
      </p>

      {sorted.length === 0 && (
        <p className="italic text-center text-slate-500">Tidak ada shift tercatat pada tanggal ini.</p>
      )}

      {sorted.map((s, idx) => {
        const shiftEntries = entries.filter((e: any) => e.shift_id === s.id);
        return (
          <div key={s.id} className="mb-5" style={{ pageBreakInside: 'avoid' }}>
            <div className="bg-[#003F7F] text-white px-3 py-1.5 font-bold text-[11pt] flex justify-between items-center">
              <span>
                Shift {idx + 1}: {SHIFT_LABEL[s.shift]}
                {s.is_lembur && <span className="text-[9pt] font-normal ml-2">(Lembur)</span>}
              </span>
              <span className="text-[9pt] font-normal">
                {format(new Date(s.jam_mulai), 'HH:mm')} – {s.jam_selesai ? format(new Date(s.jam_selesai), 'HH:mm') : 'masih berjalan'}
              </span>
            </div>
            <div className="border border-t-0 border-slate-300 p-2 text-[10pt]">
              <div className="mb-2"><strong>Petugas:</strong> {s.nama_petugas}</div>
              <table className="w-full" style={{ borderCollapse: 'collapse' }}>
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-400 px-2 py-1 text-left w-[18%]">Waktu</th>
                    <th className="border border-slate-400 px-2 py-1 text-left">Kejadian</th>
                  </tr>
                </thead>
                <tbody>
                  {shiftEntries.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="border border-slate-400 px-2 py-2 italic text-center text-slate-500">
                        Tidak ada kejadian dicatat.
                      </td>
                    </tr>
                  ) : (
                    shiftEntries.map((e: any) => (
                      <tr key={e.id}>
                        <td className="border border-slate-400 px-2 py-1 align-top">
                          {format(new Date(e.waktu_kejadian), 'HH:mm')} WITA
                        </td>
                        <td className="border border-slate-400 px-2 py-1 whitespace-pre-wrap">
                          {e.kejadian}
                          {Array.isArray(e.foto_urls) && e.foto_urls.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {e.foto_urls.slice(0, 6).map((u: string, i: number) => (
                                <img
                                  key={`${e.id}-${i}`}
                                  src={u}
                                  alt={`Dokumentasi ${i + 1}`}
                                  style={{
                                    width: '3.2cm',
                                    height: '2.4cm',
                                    objectFit: 'cover',
                                    border: '1px solid #cbd5e1',
                                    borderRadius: 2,
                                  }}
                                  crossOrigin="anonymous"
                                />
                              ))}
                            </div>
                          )}
                          {e.video_url && (
                            <div className="text-[9pt] text-slate-500 italic mt-0.5">
                              [Video terlampir: {e.video_url}]
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {s.status === 'selesai' && s.kondisi_akhir && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 text-[10pt]">
                  <strong>Serah Terima:</strong> diserahkan kepada <strong>{s.serah_terima_ke_nama}</strong>.
                  <br /><strong>Kondisi akhir:</strong> {s.kondisi_akhir}
                  {s.catatan_serah_terima && (<><br /><strong>Catatan:</strong> {s.catatan_serah_terima}</>)}
                </div>
              )}
            </div>
          </div>
        );
      })}

      <p className="text-justify mt-4 mb-6 leading-relaxed">
        Demikian Berita Acara ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana
        mestinya.
      </p>

      <div className="grid grid-cols-2 gap-6 mt-8">
        <div>
          <p className="text-[10pt] mb-2 font-semibold">Petugas Security:</p>
          <div className="space-y-3">
            {sorted.map((s) => (
              <div key={s.id} className="text-[10pt]">
                <div>Shift {SHIFT_LABEL[s.shift].split(' ')[0]}:</div>
                <div className="font-bold underline mt-6">{s.nama_petugas}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="text-center">
          <p className="text-[10pt]">Bontang, {tanggalStr}</p>
          <p className="text-[10pt]">Mengetahui & Menyetujui,</p>
          <p className="text-[10pt]">Pemimpin KCP Telihan,</p>
          {ttdName && verifyUrl ? (
            <div className="flex flex-col items-center mt-2">
              <div className="bg-white p-2 border-2 border-[#003F7F] rounded">
                <QRCodeSVG value={verifyUrl} size={96} level="M" includeMargin={false} />
              </div>
              <p className="text-[8pt] text-slate-600 mt-1">Scan untuk verifikasi keaslian</p>
              <p className="font-bold underline mt-1">{ttdName}</p>
            </div>
          ) : (
            <>
              <div style={{ height: '5rem' }} />
              <p className="font-bold underline">{ttdName || '( .......................... )'}</p>
            </>
          )}
          {ttdAt && (
            <p className="text-[8pt] italic text-slate-500 mt-1">
              Ditandatangani digital pada {format(new Date(ttdAt), "dd MMM yyyy 'pukul' HH:mm", { locale: idLocale })} WITA
            </p>
          )}
        </div>
      </div>

      <p className="text-[9pt] text-slate-500 italic mt-8 text-center">
        Dicetak dari Bluebook Telihan — {format(new Date(), "dd MMMM yyyy 'pukul' HH:mm", { locale: idLocale })} WITA
      </p>
    </div>
  );
};
