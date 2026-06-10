import React, { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Printer } from 'lucide-react';
import { BAHarianDocument } from '@/components/security/BAHarianDocument';
import { useAuth } from '@/contexts/AuthContext';

const BAHarianBulkPrintPage: React.FC = () => {
  const [params] = useSearchParams();
  const dari = params.get('dari') || format(new Date(), 'yyyy-MM-dd');
  const sampai = params.get('sampai') || dari;
  const { user, isLoading: authLoading } = useAuth();

  // Fetch all shifts in range, then group by tanggal
  const { data: shifts = [], isLoading: shiftsLoading } = useQuery({
    queryKey: ['security-shifts-range', dari, sampai],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_shift' as any)
        .select('*')
        .gte('tanggal', dari)
        .lte('tanggal', sampai)
        .order('tanggal', { ascending: true })
        .order('jam_mulai', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const shiftIds = useMemo(() => shifts.map((s: any) => s.id), [shifts]);

  const { data: entries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ['security-entries-range', shiftIds],
    enabled: shiftIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('security_log_entry' as any)
        .select('*')
        .in('shift_id', shiftIds)
        .order('waktu_kejadian', { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  // Group dates
  const dates = useMemo(() => {
    const set = new Set<string>(shifts.map((s: any) => s.tanggal));
    return Array.from(set).sort();
  }, [shifts]);

  // Batch fetch nomor BA per tanggal
  const { data: nomorMap = {} } = useQuery({
    queryKey: ['ba-security-nomor-batch', dates],
    enabled: dates.length > 0,
    queryFn: async () => {
      const results = await Promise.all(
        dates.map(async (t) => {
          const { data, error } = await supabase.rpc('get_ba_security_nomor' as any, { _tanggal: t });
          if (error) throw error;
          return [t, (data as string) || ''] as const;
        }),
      );
      return Object.fromEntries(results) as Record<string, string>;
    },
  });

  useEffect(() => {
    document.title = `Cetak Bulk BA Security — ${dari} s/d ${sampai}`;
  }, [dari, sampai]);

  if (authLoading || shiftsLoading || entriesLoading) {
    return <div className="p-10 text-center">Memuat dokumen...</div>;
  }
  if (!user) {
    window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-100 print:bg-white">
      <div className="print:hidden sticky top-0 z-10 bg-white border-b shadow-sm px-4 py-2 flex flex-wrap items-center justify-between gap-2">
        <Button variant="ghost" onClick={() => window.close()}>
          <ArrowLeft className="w-4 h-4 mr-1" />Tutup
        </Button>
        <div className="text-sm text-slate-600">
          <strong>Cetak Banyak BA</strong> — {format(new Date(dari), 'dd MMM yyyy', { locale: idLocale })}
          {' '}s/d {format(new Date(sampai), 'dd MMM yyyy', { locale: idLocale })}
          {' '}· <span className="font-semibold text-[#003F7F]">{dates.length} hari</span>
        </div>
        <Button onClick={() => window.print()} className="bg-primary" disabled={dates.length === 0}>
          <Printer className="w-4 h-4 mr-2" />Cetak / Save as PDF
        </Button>
      </div>

      {dates.length === 0 ? (
        <div className="p-10 text-center text-slate-500">
          Tidak ada BA tercatat di rentang tanggal ini.
        </div>
      ) : (
        dates.map((t, i) => {
          const dayShifts = shifts.filter((s: any) => s.tanggal === t);
          const dayShiftIds = new Set(dayShifts.map((s: any) => s.id));
          const dayEntries = entries.filter((e: any) => dayShiftIds.has(e.shift_id));
          return (
            <BAHarianDocument
              key={t}
              tanggal={t}
              nomorBA={nomorMap[t] || ''}
              shifts={dayShifts as any}
              entries={dayEntries as any}
              pageBreakAfter={i < dates.length - 1}
            />
          );
        })
      )}

      <style>{`
        @media print {
          @page { size: A4; margin: 1.5cm 1.4cm 1.5cm 1.6cm; }
          body { background: white !important; }
          .ba-print-page { width: auto !important; min-height: 0 !important; box-shadow: none !important; }
        }
      `}</style>
    </div>
  );
};

export default BAHarianBulkPrintPage;
