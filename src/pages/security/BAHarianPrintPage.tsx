import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSecurityShifts, SHIFT_LABEL, SHIFT_PERIODE_ORDER, useSignBA } from '@/hooks/use-security-log';
import { supabase } from '@/integrations/supabase/client';
import { KopSuratBank } from '@/components/print/KopSuratBank';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Printer, ArrowLeft, PenLine } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';

const BAHarianPrintPage: React.FC = () => {
  const [params] = useSearchParams();
  const tanggal = params.get('tanggal') || format(new Date(), 'yyyy-MM-dd');
  const { user, isLoading: authLoading, userName, permissions } = useAuth();
  const { data: shifts = [], isLoading } = useSecurityShifts(tanggal);
  const sign = useSignBA();
  const { toast } = useToast();
  const [namaPimpinan, setNamaPimpinan] = useState(userName);

  // Fetch all entries for these shifts in one go
  const shiftIds = useMemo(() => shifts.map((s) => s.id), [shifts]);
  const { data: allEntries = [] } = useQuery({
    queryKey: ['security-entries-batch', shiftIds],
    enabled: shiftIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_log_entry' as any)
        .select('*')
        .in('shift_id', shiftIds)
        .order('waktu_kejadian', { ascending: true });
      if (error) throw error;
      return data as any[];
    },
  });

  useEffect(() => {
    document.title = `BA Log Security — ${tanggal}`;
  }, [tanggal]);

  if (authLoading || isLoading) return <div className="p-10 text-center">Memuat dokumen...</div>;
  if (!user) {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return null;
  }

  const sorted = [...shifts].sort((a, b) => {
    const o = (SHIFT_PERIODE_ORDER[a.shift] ?? 9) - (SHIFT_PERIODE_ORDER[b.shift] ?? 9);
    if (o !== 0) return o;
    return a.jam_mulai.localeCompare(b.jam_mulai);
  });

  const allSelesai = sorted.length > 0 && sorted.every((s) => s.status === 'selesai');
  const signedShift = sorted.find((s) => s.ttd_pimpinan_nama);
  const ttdName = signedShift?.ttd_pimpinan_nama;
  const ttdAt = signedShift?.ttd_pimpinan_at;
  const baToken = (signedShift as any)?.ba_signature_token as string | undefined;
  const verifyUrl = baToken
    ? `${window.location.origin}/verify/ba-security/${baToken}`
    : null;

  const statusBadge = !allSelesai
    ? { label: 'Draft', cls: 'bg-slate-200 text-slate-700' }
    : !ttdName
      ? { label: 'Menunggu TTD Pimpinan', cls: 'bg-amber-100 text-amber-800 border-amber-300' }
      : { label: 'Sah & Tervalidasi', cls: 'bg-emerald-100 text-emerald-800 border-emerald-300' };

  const tanggalStr = format(new Date(tanggal), 'dd MMMM yyyy', { locale: idLocale });
  const hariStr = format(new Date(tanggal), 'EEEE', { locale: idLocale });
  const yyyy = new Date(tanggal).getFullYear();
  const nomorBA = `${format(new Date(tanggal), 'ddMM')}/BA-SEC/KCP-TLH/${yyyy}`;

  const signedShift = sorted.find((s) => s.ttd_pimpinan_nama);
  const ttdName = signedShift?.ttd_pimpinan_nama;
  const ttdAt = signedShift?.ttd_pimpinan_at;

  const handleSign = async () => {
    if (!namaPimpinan.trim()) {
      toast({ title: 'Nama pimpinan wajib diisi', variant: 'destructive' });
      return;
    }
    try {
      await sign.mutateAsync({ tanggal, nama_pimpinan: namaPimpinan.trim() });
      toast({ title: 'BA ditandatangani' });
    } catch (err: any) {
      toast({ title: 'Gagal tanda tangan', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="print:hidden sticky top-0 z-10 bg-white border-b shadow-sm px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => window.close()}>
          <ArrowLeft className="w-4 h-4 mr-1" />Tutup
        </Button>
        <div className="flex items-center gap-2">
          {permissions.canSignSecurityBA && !ttdName && (
            <div className="flex items-center gap-2">
              <Input
                placeholder="Nama Pimpinan KCP"
                value={namaPimpinan}
                onChange={(e) => setNamaPimpinan(e.target.value)}
                className="w-56 h-9"
              />
              <Button onClick={handleSign} disabled={sign.isPending} variant="secondary">
                <PenLine className="w-4 h-4 mr-1" />Tanda Tangani BA
              </Button>
            </div>
          )}
          <Button onClick={() => window.print()} className="bg-primary">
            <Printer className="w-4 h-4 mr-2" />Cetak / Save as PDF
          </Button>
        </div>
      </div>

      <div
        className="mx-auto bg-white shadow-lg print:shadow-none my-6 print:my-0 p-[2cm] print:p-[1.8cm]"
        style={{ width: '21cm', minHeight: '29.7cm', fontFamily: 'Arial, Helvetica, sans-serif', fontSize: '10.5pt', color: '#111' }}
      >
        <KopSuratBank />

        <div className="text-center my-4">
          <h1 className="text-[13pt] font-bold tracking-wide text-[#003F7F]">
            BERITA ACARA LOG AKTIVITAS SECURITY
          </h1>
          <div className="text-[10pt] mt-1 text-slate-600">Nomor: {nomorBA}</div>
        </div>

        <p className="text-justify mb-4 leading-relaxed">
          Pada hari <strong>{hariStr}</strong>, tanggal <strong>{tanggalStr}</strong>, telah dilaksanakan
          pengawasan keamanan di lingkungan PT. BPD Kaltim Kaltara Kantor Cabang Pembantu Telihan oleh
          petugas Security dalam {sorted.length} shift, dengan rincian aktivitas sebagai berikut:
        </p>

        {sorted.length === 0 && (
          <p className="italic text-center text-slate-500">Tidak ada shift tercatat pada tanggal ini.</p>
        )}

        {sorted.map((s, idx) => {
          const entries = (allEntries as any[]).filter((e) => e.shift_id === s.id);
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
                    {entries.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="border border-slate-400 px-2 py-2 italic text-center text-slate-500">
                          Tidak ada kejadian dicatat.
                        </td>
                      </tr>
                    ) : (
                      entries.map((e: any) => (
                        <tr key={e.id}>
                          <td className="border border-slate-400 px-2 py-1 align-top">
                            {format(new Date(e.waktu_kejadian), 'HH:mm')} WITA
                          </td>
                          <td className="border border-slate-400 px-2 py-1 whitespace-pre-wrap">
                            {e.kejadian}
                            {(e.foto_urls?.length > 0 || e.video_url) && (
                              <div className="text-[9pt] text-slate-500 italic mt-0.5">
                                [Dokumentasi: {e.foto_urls?.length ? `${e.foto_urls.length} foto` : ''}
                                {e.foto_urls?.length && e.video_url ? ', ' : ''}
                                {e.video_url ? '1 video' : ''}]
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

        {/* Signatures: petugas tiap shift + pimpinan */}
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
            <div style={{ height: '5rem' }} />
            <p className="font-bold underline">{ttdName || '( .......................... )'}</p>
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

      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
};

export default BAHarianPrintPage;
