import React, { useMemo, useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { useSecurityShifts, SHIFT_LABEL } from '@/hooks/use-security-log';
import { ShiftCard } from '@/components/security/ShiftCard';
import { StartShiftDialog } from '@/components/security/StartShiftDialog';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, Printer } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const LogSecurityPage: React.FC = () => {
  const { permissions } = useAuth();
  const [tanggal, setTanggal] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { data: shifts = [], isLoading } = useSecurityShifts(tanggal);
  const [startOpen, setStartOpen] = useState(false);

  const sorted = useMemo(() => {
    const order: Record<string, number> = { pagi: 0, sore: 1, malam: 2 };
    return [...shifts].sort((a, b) => {
      const o = (order[a.shift] ?? 99) - (order[b.shift] ?? 99);
      if (o !== 0) return o;
      return a.jam_mulai.localeCompare(b.jam_mulai);
    });
  }, [shifts]);

  const handlePrint = () => {
    window.open(`/security/log/cetak?tanggal=${tanggal}`, '_blank');
  };

  return (
    <MainLayout>
      <PageHeader
        title="Log Security"
        description="Catatan aktivitas pengawasan harian per shift Security KCP Telihan"
      />

      <Card className="p-4 mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground">Tanggal</label>
          <Input
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="mt-1 w-44"
          />
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(tanggal), 'EEEE, dd MMMM yyyy', { locale: idLocale })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint} disabled={sorted.length === 0}>
            <Printer className="w-4 h-4 mr-2" />Cetak BA
          </Button>
          {permissions.canEditSecurityLog && (
            <Button onClick={() => setStartOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />Mulai Shift
            </Button>
          )}
        </div>
      </Card>

      {isLoading ? (
        <Card className="p-10 text-center text-muted-foreground">Memuat...</Card>
      ) : sorted.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          Belum ada shift dicatat untuk tanggal ini.
          {permissions.canEditSecurityLog && ' Klik "Mulai Shift" untuk memulai pencatatan.'}
        </Card>
      ) : (
        <div className="space-y-4">
          {sorted.map((s) => (
            <ShiftCard key={s.id} shift={s} />
          ))}
        </div>
      )}

      <StartShiftDialog open={startOpen} onOpenChange={setStartOpen} todayShifts={shifts} />
    </MainLayout>
  );
};

export default LogSecurityPage;
