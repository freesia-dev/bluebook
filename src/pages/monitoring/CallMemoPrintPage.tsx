import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useCallMemo, JENIS_AKTIVITAS_LABEL, STATUS_KOMITMEN_LABEL } from '@/hooks/use-call-memo';
import { KopSuratBank } from '@/components/print/KopSuratBank';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { fmtIDR } from '@/lib/mlf-utils';

import { useAuth } from '@/contexts/AuthContext';

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const CallMemoPrintPage: React.FC = () => {
  const [params] = useSearchParams();
  const id = params.get('id') || '';
  const { user, isLoading: authLoading } = useAuth();
  const { data: memo, isLoading } = useCallMemo(id);

  useEffect(() => {
    document.title = memo ? `Call Memo #${memo.nomor} — ${memo.nama_debitur}` : 'Call Memo';
  }, [memo]);

  if (authLoading || isLoading) {
    return <div className="p-10 text-center">Memuat dokumen...</div>;
  }
  if (!user) {
    const redirect = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?redirect=${redirect}`;
    return null;
  }
  if (!memo) {
    return <div className="p-10 text-center text-muted-foreground">Call Memo tidak ditemukan.</div>;
  }

  const tanggal = new Date(memo.tanggal);
  const hariStr = HARI_ID[tanggal.getDay()];
  const tanggalStr = format(tanggal, 'dd MMMM yyyy', { locale: idLocale });
  const yyyy = tanggal.getFullYear();
  const nomorDoc = `${String(memo.nomor).padStart(3, '0')}/CM-PNG/KCP-TLH/${yyyy}`;

  const isImage = (url: string) => /\.(jpe?g|png|webp|gif)$/i.test(url);
  const imageLampiran = memo.lampiran_urls.filter(isImage);
  const otherLampiran = memo.lampiran_urls.filter((u) => !isImage(u));

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      {/* Print toolbar (hidden when printing) */}
      <div className="print:hidden sticky top-0 z-10 bg-white border-b shadow-sm px-4 py-2 flex items-center justify-between">
        <Button variant="ghost" onClick={() => window.close()}>
          <ArrowLeft className="w-4 h-4 mr-1" />Tutup
        </Button>
        <Button onClick={() => window.print()} className="bg-primary">
          <Printer className="w-4 h-4 mr-2" />Cetak / Save as PDF
        </Button>
      </div>

      {/* A4 page */}
      <div
        className="mx-auto bg-white shadow-lg print:shadow-none my-6 print:my-0 p-[2cm] print:p-[1.8cm]"
        style={{ width: '21cm', minHeight: '29.7cm', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10.5pt', color: '#111' }}
      >
        <KopSuratBank />

        {/* Judul */}
        <div className="text-center my-4">
          <h1 className="text-[13pt] font-bold tracking-wide text-[#003F7F]">CALL MEMO PENAGIHAN KREDIT</h1>
          <div className="text-[10pt] mt-1 text-slate-600">Nomor: {nomorDoc}</div>
        </div>

        {/* Identitas debitur */}
        <table className="w-full mb-4" style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td className="py-0.5 align-top w-[35%]">Nama Debitur</td>
              <td className="py-0.5 w-[3%]">:</td>
              <td className="py-0.5 font-semibold">{memo.nama_debitur}</td>
            </tr>
            <tr>
              <td className="py-0.5 align-top">No. Rekening / Pinjaman</td>
              <td className="py-0.5">:</td>
              <td className="py-0.5">{memo.no_rek || '—'}</td>
            </tr>
            <tr>
              <td className="py-0.5 align-top">Produk Kredit</td>
              <td className="py-0.5">:</td>
              <td className="py-0.5">{memo.produk || '—'}</td>
            </tr>
            <tr>
              <td className="py-0.5 align-top">No. HP / Kontak</td>
              <td className="py-0.5">:</td>
              <td className="py-0.5">{memo.no_hp || '—'}</td>
            </tr>
          </tbody>
        </table>

        {/* Narasi */}
        <p className="text-justify mb-3 leading-relaxed">
          Pada hari <strong>{hariStr}</strong>, tanggal <strong>{tanggalStr}</strong>, pukul{' '}
          <strong>{memo.jam} WITA</strong>, telah dilakukan penagihan kredit kepada debitur tersebut
          di atas melalui <strong>{JENIS_AKTIVITAS_LABEL[memo.jenis_aktivitas]}</strong> dengan
          rincian tunggakan sebagai berikut:
        </p>

        {/* Tunggakan */}
        <table className="w-full mb-4 border border-black" style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr className="bg-slate-200">
              <th className="border border-black px-2 py-1 text-left">Uraian</th>
              <th className="border border-black px-2 py-1 text-right w-[35%]">Nominal (Rp)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black px-2 py-1">Tunggakan Pokok</td>
              <td className="border border-black px-2 py-1 text-right">{fmtIDR(memo.tunggakan_pokok).replace('Rp', '').trim()}</td>
            </tr>
            <tr>
              <td className="border border-black px-2 py-1">Tunggakan Bunga</td>
              <td className="border border-black px-2 py-1 text-right">{fmtIDR(memo.tunggakan_bunga).replace('Rp', '').trim()}</td>
            </tr>
            <tr className="font-bold bg-slate-100">
              <td className="border border-black px-2 py-1">TOTAL TUNGGAKAN</td>
              <td className="border border-black px-2 py-1 text-right">{fmtIDR(memo.total_tunggakan).replace('Rp', '').trim()}</td>
            </tr>
          </tbody>
        </table>

        {/* Hasil */}
        <div className="mb-3">
          <p className="font-semibold mb-1">Hasil Penagihan:</p>
          <div className="border border-black p-2 min-h-[3rem] whitespace-pre-wrap text-justify">
            {memo.hasil || '—'}
          </div>
        </div>

        {/* Janji bayar */}
        {(memo.janji_bayar_tanggal || memo.janji_bayar_nominal) && (
          <div className="mb-3 p-2 border-l-4 border-sky-700 bg-sky-50">
            <strong>Janji Bayar:</strong>{' '}
            {memo.janji_bayar_tanggal && (
              <>Tanggal <strong>{format(new Date(memo.janji_bayar_tanggal), 'dd MMMM yyyy', { locale: idLocale })}</strong></>
            )}
            {memo.janji_bayar_nominal != null && (
              <> sebesar <strong>{fmtIDR(memo.janji_bayar_nominal)}</strong></>
            )}
          </div>
        )}

        {/* Status komitmen */}
        <p className="mb-3">
          <strong>Status Komitmen Debitur:</strong> {STATUS_KOMITMEN_LABEL[memo.status_komitmen]}
        </p>

        {/* Catatan tambahan */}
        {memo.catatan_tambahan && (
          <div className="mb-3">
            <p className="font-semibold mb-1">Catatan Tambahan:</p>
            <div className="border border-black p-2 whitespace-pre-wrap text-justify">{memo.catatan_tambahan}</div>
          </div>
        )}

        {/* Tanda tangan: Officer — Saksi (opsional) — Pemimpin KCP */}
        <div className={`mt-10 grid gap-6 ${memo.saksi ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className="text-center">
            <p className="text-[10pt]">Officer Relationship Kredit,</p>
            <div style={{ height: '4.5rem' }} />
            <p className="font-bold underline">{memo.petugas_penagih}</p>
          </div>
          {memo.saksi && (
            <div className="text-center">
              <p className="text-[10pt]">Saksi,</p>
              <div style={{ height: '4.5rem' }} />
              <p className="font-bold underline">{memo.saksi}</p>
            </div>
          )}
          <div className="text-center">
            <p className="text-[10pt]">Mengetahui,</p>
            <p className="text-[10pt]">Pemimpin KCP Telihan,</p>
            <div style={{ height: '4rem' }} />
            <p className="font-bold underline">{memo.nama_pimpinan || '—'}</p>
          </div>
        </div>

        <p className="text-[9pt] text-slate-500 italic mt-8 text-center">
          Dicetak dari Bluebook Telihan — {format(new Date(), "dd MMMM yyyy 'pukul' HH:mm", { locale: idLocale })} WITA
        </p>

        {/* Lampiran gambar — page break baru */}
        {imageLampiran.length > 0 && (
          <>
            <div style={{ pageBreakBefore: 'always' }} />
            <div className="mt-6">
              <KopSuratBank />
              <h2 className="text-[12pt] font-bold text-center my-4 underline">LAMPIRAN BUKTI PENAGIHAN</h2>
              <p className="text-center text-[10pt] mb-3 italic">Call Memo Nomor {nomorDoc}</p>
              <div className="grid grid-cols-2 gap-4">
                {imageLampiran.map((url, i) => (
                  <div key={url} className="border border-black p-1">
                    <img src={url} alt={`Bukti ${i + 1}`} className="w-full h-auto object-contain max-h-[10cm]" />
                    <p className="text-[9pt] text-center mt-1">Bukti {i + 1}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {otherLampiran.length > 0 && (
          <div className="mt-4 text-[10pt]">
            <p className="font-semibold">Lampiran tambahan (file):</p>
            <ul className="list-disc list-inside">
              {otherLampiran.map((url, i) => (
                <li key={url}><a href={url} className="text-blue-700 underline" target="_blank" rel="noreferrer">Dokumen {i + 1}</a></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
};

export default CallMemoPrintPage;
