import React, { useState } from 'react';
import { useSecurityComments, useAddComment, useDeleteComment, SecurityComment } from '@/hooks/use-security-audit';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Send, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

interface Props {
  shift_id?: string;
  entry_id?: string;
  /** Compact: inline mini-list under an entry. Otherwise: full panel for a shift. */
  compact?: boolean;
}

export const CommentThread: React.FC<Props> = ({ shift_id, entry_id, compact }) => {
  const { permissions, userName, isAdmin } = useAuth();
  const { data: comments = [], isLoading } = useSecurityComments({ shift_id, entry_id });
  const add = useAddComment();
  const del = useDeleteComment();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(!compact);

  const canPost = permissions.canCommentSecurityLog;

  const handleAdd = async () => {
    if (!text.trim()) return;
    try {
      await add.mutateAsync({ shift_id, entry_id, komentar: text.trim(), nama: userName });
      setText('');
      toast({ title: 'Komentar dikirim' });
    } catch (err: any) {
      toast({ title: 'Gagal kirim', description: err.message, variant: 'destructive' });
    }
  };

  const count = comments.length;
  if (compact && !canPost && count === 0) return null;

  return (
    <div className={compact ? 'mt-2' : 'mt-3 border-t pt-3'}>
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>{count} komentar TL</span>
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      ) : (
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
          <MessageSquare className="w-4 h-4" />
          Komentar Team Leader ({count})
        </div>
      )}

      {open && (
        <div className="space-y-2 mt-2">
          {isLoading && <div className="text-xs text-muted-foreground">Memuat...</div>}
          {comments.map((c: SecurityComment) => (
            <div key={c.id} className="rounded-md bg-violet-50 border border-violet-200 px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs font-medium text-violet-900">
                  {c.created_by_nama || 'Anonim'}
                  <span className="font-normal text-violet-700/70 ml-2">
                    {format(new Date(c.created_at), 'dd MMM yyyy HH:mm', { locale: idLocale })}
                  </span>
                </div>
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 text-violet-700 hover:text-red-600"
                    onClick={() => {
                      if (confirm('Hapus komentar ini?')) del.mutate(c.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-violet-900 mt-1 whitespace-pre-wrap">{c.komentar}</p>
            </div>
          ))}

          {canPost && (
            <div className="flex gap-2 mt-2">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tulis komentar / catatan supervisi..."
                rows={2}
                className="text-sm"
              />
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={add.isPending || !text.trim()}
                className="self-end bg-violet-600 hover:bg-violet-700 text-white"
              >
                <Send className="w-3.5 h-3.5 mr-1" />Kirim
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
