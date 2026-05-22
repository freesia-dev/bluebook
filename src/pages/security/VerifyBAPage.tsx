import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useVerifyBA } from '@/hooks/use-security-log';
import { KopSuratBank } from '@/components/print/KopSuratBank';
import { CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const SHIFT_NAMES: Record<string, string> = {
  malam: 'Malam (00:00–08:00)',
  pagi: 'Pagi (08:00–16:00)',
  sore: 'Sore (16:00–24:00)',
};

const VerifyBAPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const { data, isLoading, error } = useVerifyBA(token);

  useEffect(() => {
    document.title = 'Verifikasi BA Log Security';
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-6 md:p-10">
        <KopSuratBank />

        <div className="text-center mb-6">
          <ShieldCheck className="w-10 h-10 mx-auto text-[#003F7F]" />
          <h1 className="text-xl font-bold text-[#003F7F] mt-2">Verifikasi Berita Acara</h1>
          <p className="text-sm text-slate-600">Log Aktivitas Security — KCP Telihan</p>
        </div>

        {isLoading && (
          <div className="text-center py-10 text-slate-500">Memverifikasi token…</div>
        )}

        {!isLoading && (error || !data) && (
          <div className="border-2 border-red-200 bg-red-50 rounded-lg p-6 text-center">
            <XCircle className="w-12 h-12 mx-auto text-red-600" />
            <h2 className="text-lg font-bold text-red-700 mt-2">BA Tidak Valid</h2>
            <p className="text-sm text-red-600 mt-1">
              Token verifikasi tidak ditemukan atau BA telah dibatalkan.
            </p>
          </div>
        )}

        {data && (
          <>
            <div className="border-2 border-emerald-200 bg-emerald-50 rounded-lg p-5 text-center mb-6">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-600" />
              <h2 className="text-lg font-bold text-emerald-700 mt-2">BA Sah & Tervalidasi</h2>
              <p className="text-xs text-emerald-700 mt-1">
                Dokumen ini telah ditandatangani secara digital oleh Pemimpin KCP.
              </p>
            </div>

            <dl className="grid grid-cols-1 sm:grid-cols-3 gap-y-3 gap-x-4 text-sm">
              <dt className="font-semibold text-slate-600">Nomor BA</dt>
              <dd className="sm:col-span-2 font-mono">{data.nomor_ba}</dd>

              <dt className="font-semibold text-slate-600">Tanggal Periode</dt>
              <dd className="sm:col-span-2">
                {format(new Date(data.tanggal), 'EEEE, dd MMMM yyyy', { locale: idLocale })}
              </dd>

              <dt className="font-semibold text-slate-600">Jumlah Shift</dt>
              <dd className="sm:col-span-2">{data.total_shift} shift</dd>

              <dt className="font-semibold text-slate-600">Petugas Security</dt>
              <dd className="sm:col-span-2">
                <ul className="space-y-1">
                  {data.petugas.map((p, i) => (
                    <li key={i}>
                      <span className="text-slate-500">{SHIFT_NAMES[p.shift] || p.shift}:</span>{' '}
                      <strong>{p.nama_petugas}</strong>
                      {p.is_lembur && (
                        <span className="ml-2 text-xs bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                          Lembur
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </dd>

              <dt className="font-semibold text-slate-600">Ditandatangani Oleh</dt>
              <dd className="sm:col-span-2 font-bold">{data.ttd_pimpinan_nama}</dd>

              <dt className="font-semibold text-slate-600">Waktu TTD</dt>
              <dd className="sm:col-span-2">
                {format(new Date(data.ttd_pimpinan_at), "dd MMMM yyyy 'pukul' HH:mm", {
                  locale: idLocale,
                })}{' '}
                WITA
              </dd>
            </dl>
          </>
        )}

        <div className="mt-8 pt-4 border-t text-center text-xs text-slate-500">
          Halaman verifikasi resmi · Bluebook Telihan ·{' '}
          <Link to="/" className="text-[#003F7F] hover:underline">
            bluebook-tlh.my.id
          </Link>
        </div>
      </div>
    </div>
  );
};

export default VerifyBAPage;
