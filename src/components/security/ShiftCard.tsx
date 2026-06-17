import React, { useState } from 'react';
import { SecurityShift, SecurityLogEntry, SHIFT_LABEL, useSecurityEntries, useDeleteEntry, useDeleteShift } from '@/hooks/use-security-log';
import { useToggleIncident } from '@/hooks/use-security-audit';
import { CommentThread } from './CommentThread';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { EntryDialog } from './EntryDialog';
import { HandoverDialog } from './HandoverDialog';
import { EditShiftDialog } from './EditShiftDialog';
import { Plus, Pencil, Trash2, ArrowRightLeft, Video, ShieldCheck, Clock, Flag, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';


interface Props {
  shift: SecurityShift;
  insidenOnly?: boolean;
}


const jenisColor: Record<string, string> = {
  mulai_shift: 'bg-blue-100 text-blue-800 border-blue-300',
  kejadian: 'bg-slate-100 text-slate-800 border-slate-300',
  serah_terima: 'bg-amber-100 text-amber-800 border-amber-300',
  akhir_shift: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};

export const ShiftCard: React.FC<Props> = ({ shift, insidenOnly }) => {
  const { permissions, userRole, isAdmin } = useAuth();
  const canEdit = permissions.canEditSecurityLog;
  const canFlag = permissions.canCommentSecurityLog;
  const { data: entriesAll = [], isLoading } = useSecurityEntries(shift.id);
  const entries = insidenOnly ? entriesAll.filter((e) => (e as any).is_insiden) : entriesAll;
  const del = useDeleteEntry();
  const delShift = useDeleteShift();
  const toggleIncident = useToggleIncident();
  const { toast } = useToast();


  const [entryOpen, setEntryOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<SecurityLogEntry | null>(null);
  const [handoverOpen, setHandoverOpen] = useState(false);

  const isMine = shift.nama_petugas && userRole !== 'pemimpin'; // pemimpin view-only
  const isActive = shift.status === 'aktif';

  const handleDelete = async (e: SecurityLogEntry) => {
    if (!confirm('Hapus kejadian ini?')) return;
    try {
      await del.mutateAsync({ id: e.id, shift_id: shift.id });
      toast({ title: 'Kejadian dihapus' });
    } catch (err: any) {
      toast({ title: 'Gagal hapus', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-3 sm:px-4 py-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 shrink-0 rounded-full bg-white/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="font-semibold flex items-center gap-2 flex-wrap">
              <span className="truncate">{SHIFT_LABEL[shift.shift]}</span>
              {shift.is_lembur && <Badge variant="secondary" className="text-[10px]">LEMBUR</Badge>}
              {isActive ? (
                <Badge className="bg-emerald-500 hover:bg-emerald-500 text-white text-[10px]">AKTIF</Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] border-white/30 text-white">SELESAI</Badge>
              )}
            </div>
            <div className="text-xs text-white/70 truncate">
              {shift.nama_petugas} · {format(new Date(shift.jam_mulai), 'HH:mm')}
              {shift.jam_selesai && ` – ${format(new Date(shift.jam_selesai), 'HH:mm')}`}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {canEdit && isActive && (
            <>
              <Button size="sm" className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white" onClick={() => { setEditEntry(null); setEntryOpen(true); }}>
                <Plus className="w-4 h-4 mr-1" />Catat Kejadian
              </Button>
              <Button size="sm" variant="outline" className="flex-1 sm:flex-none bg-amber-500 hover:bg-amber-600 text-white border-amber-500" onClick={() => setHandoverOpen(true)}>
                <ArrowRightLeft className="w-4 h-4 mr-1" />Akhiri & Serah Terima
              </Button>
            </>
          )}
          {isAdmin && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1 sm:flex-none bg-red-600 hover:bg-red-700 text-white border-red-600">
                  <Trash2 className="w-4 h-4 mr-1" />Hapus Shift
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Hapus shift ini?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Semua kejadian ({entries.length}) di shift {SHIFT_LABEL[shift.shift]} oleh <strong>{shift.nama_petugas}</strong> akan ikut terhapus permanen.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Batal</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 hover:bg-red-700"
                    onClick={async () => {
                      try {
                        await delShift.mutateAsync(shift.id);
                        toast({ title: 'Shift dihapus' });
                      } catch (err: any) {
                        toast({ title: 'Gagal hapus shift', description: err.message, variant: 'destructive' });
                      }
                    }}
                  >
                    Hapus
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground py-4 text-center">Memuat kejadian...</div>
        ) : entries.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center italic">
            {insidenOnly
              ? 'Tidak ada kejadian yang ditandai sebagai insiden di shift ini. Klik ikon 🚩 pada kejadian untuk menandainya sebagai insiden.'
              : 'Belum ada kejadian dicatat di shift ini.'}
          </div>
        ) : (
          <ol className="relative border-l-2 border-slate-200 ml-2 space-y-4">
            {entries.map((e) => (
              <li key={e.id} className="ml-4">
                <div className="absolute -left-[7px] mt-1.5 w-3 h-3 rounded-full bg-slate-400 border-2 border-white" />
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="font-medium">
                      {format(new Date(e.waktu_kejadian), 'HH:mm', { locale: idLocale })} WITA
                    </span>
                    <Badge variant="outline" className={`${jenisColor[e.jenis]} text-[10px]`}>
                      {e.jenis === 'mulai_shift' && 'Mulai Shift'}
                      {e.jenis === 'kejadian' && 'Kejadian'}
                      {e.jenis === 'serah_terima' && 'Serah Terima'}
                      {e.jenis === 'akhir_shift' && 'Akhir Shift'}
                    </Badge>
                    {(e as any).is_insiden && (
                      <Badge className="bg-red-100 text-red-800 border-red-300 border text-[10px] hover:bg-red-100">
                        <Flag className="w-2.5 h-2.5 mr-0.5" />INSIDEN
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    {canFlag && e.jenis === 'kejadian' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        title={(e as any).is_insiden ? 'Hapus tanda insiden' : 'Tandai sebagai insiden penting'}
                        className={`h-7 w-7 p-0 ${(e as any).is_insiden ? 'text-red-600' : 'text-muted-foreground'}`}
                        onClick={() => toggleIncident.mutate({ id: e.id, is_insiden: !(e as any).is_insiden })}
                      >
                        <Flag className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {canEdit && isActive && e.jenis === 'kejadian' && (
                      <>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => { setEditEntry(e); setEntryOpen(true); }}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleDelete(e)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <p className="text-sm mt-1 whitespace-pre-wrap text-foreground/90">{e.kejadian}</p>
                {(e.foto_urls?.length > 0 || e.video_url) && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {e.foto_urls?.map((u, i) => (
                      <a key={u} href={u} target="_blank" rel="noreferrer" className="w-16 h-16 rounded border overflow-hidden block">
                        <img src={u} alt={`foto ${i + 1}`} className="w-full h-full object-cover" />
                      </a>
                    ))}
                    {e.video_url && (
                      <a href={e.video_url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded border flex items-center justify-center bg-slate-100 text-slate-600">
                        <Video className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                )}
                {e.jenis === 'kejadian' && (
                  <CommentThread entry_id={e.id} compact />
                )}
              </li>
            ))}
          </ol>
        )}


        {/* Footer info */}
        {!isActive && shift.kondisi_akhir && (
          <div className="mt-4 border-t pt-3 text-xs space-y-1 bg-amber-50 -mx-4 px-4 py-3">
            <div><strong>Kondisi Akhir:</strong> {shift.kondisi_akhir}</div>
            <div><strong>Diserahkan kepada:</strong> {shift.serah_terima_ke_nama}</div>
            {shift.catatan_serah_terima && <div><strong>Catatan:</strong> {shift.catatan_serah_terima}</div>}
          </div>
        )}

        <CommentThread shift_id={shift.id} compact />
      </div>


      <EntryDialog open={entryOpen} onOpenChange={setEntryOpen} shift={shift} entry={editEntry} />
      <HandoverDialog open={handoverOpen} onOpenChange={setHandoverOpen} shift={shift} />
    </Card>
  );
};
