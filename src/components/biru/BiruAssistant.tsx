import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Send, X, Sparkles, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Hitung angsuran KPR 500 juta, tenor 15 tahun, bunga 8% anuitas",
  "Bagaimana cara upload data MLF untuk monitoring NPL?",
  "Bantu draft surat peringatan tunggakan (SP-1) yang sopan",
  "Apa bedanya kalkulator konsumtif dan produktif di Bluebook?",
];

export const BiruAssistant: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streaming]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open, streaming]);

  // Ctrl+I / Cmd+I to toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "i") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || streaming) return;

    const nextMsgs: Msg[] = [...messages, { role: "user", content }];
    setMessages([...nextMsgs, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/biru-chat`;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${token ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: nextMsgs }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const errBody = await res.json().catch(() => ({ error: "Terjadi kesalahan" }));
        throw new Error(errBody.error ?? `HTTP ${res.status}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: acc };
          return copy;
        });
      }
    } catch (e: any) {
      if (e.name === "AbortError") return;
      const msg = e?.message ?? "Gagal menghubungi BIRU";
      setMessages((prev) => {
        const copy = [...prev];
        copy[copy.length - 1] = { role: "assistant", content: `⚠️ ${msg}` };
        return copy;
      });
      toast.error(msg);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  const stop = () => {
    abortRef.current?.abort();
    setStreaming(false);
  };

  const clearChat = () => {
    if (streaming) stop();
    setMessages([]);
  };

  return (
    <>
      {/* Floating trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Buka asisten BIRU (Ctrl+I)"
        className={cn(
          "fixed bottom-5 right-5 z-40 h-14 w-14 rounded-full shadow-lg shadow-primary/30",
          "bg-gradient-to-br from-primary to-blue-600 text-primary-foreground",
          "flex items-center justify-center transition-all duration-200",
          "hover:scale-110 hover:shadow-xl hover:shadow-primary/40",
          open && "scale-0 pointer-events-none",
        )}
      >
        <Bot className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-background animate-pulse" />
      </button>

      {/* Backdrop on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Panel */}
      <aside
        className={cn(
          "fixed z-50 flex flex-col overflow-hidden",
          "inset-x-3 bottom-3 top-16 sm:inset-x-auto sm:top-auto sm:right-5 sm:bottom-24",
          "sm:w-[400px] sm:h-[min(620px,calc(100vh-9rem))]",
          "rounded-3xl border border-white/20 dark:border-white/10",
          "bg-background/70 backdrop-blur-2xl shadow-2xl shadow-primary/10",
          "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] origin-bottom-right",
          open
            ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
            : "opacity-0 translate-y-4 scale-95 pointer-events-none",
        )}
        aria-hidden={!open}
      >

        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-white/15 dark:border-white/10 bg-gradient-to-r from-primary/15 via-blue-500/10 to-transparent backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-md">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-base leading-tight">BIRU</h2>
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              </div>
              <p className="text-[11px] text-muted-foreground leading-tight">
                Bluebook Intelligent Response Unit
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button variant="ghost" size="icon" onClick={clearChat} title="Chat baru">
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} title="Tutup (Esc)">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </header>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white shadow-lg mb-3">
                  <Bot className="h-8 w-8" />
                </div>
                <h3 className="font-bold text-lg">Halo, saya BIRU 👋</h3>
                <p className="text-sm text-muted-foreground mt-1 px-4">
                  Asisten AI internal Bluebook Telihan. Tanyakan apa saja tentang aplikasi, hitungan
                  kredit, draft dokumen, atau minta bantuan lainnya.
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">
                  Contoh yang bisa ditanyakan
                </p>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    className="w-full text-left text-sm px-3 py-2.5 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div
                key={i}
                className={cn("flex gap-2.5", m.role === "user" ? "justify-end" : "justify-start")}
              >
                {m.role === "assistant" && (
                  <div className="h-8 w-8 shrink-0 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted rounded-bl-sm",
                  )}
                >
                  {m.role === "assistant" ? (
                    m.content ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:my-2 prose-ul:my-1.5 prose-ol:my-1.5 prose-pre:my-2 prose-pre:text-xs">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )
                  ) : (
                    <span className="whitespace-pre-wrap">{m.content}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Composer */}
        <div className="border-t border-white/15 dark:border-white/10 p-3 bg-white/30 dark:bg-white/5 backdrop-blur-xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-end gap-2"
          >
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Tanya BIRU apa saja..."
              rows={1}
              className="min-h-[42px] max-h-32 resize-none text-sm bg-white/60 dark:bg-white/5 border-white/30 dark:border-white/10 rounded-2xl backdrop-blur"
              disabled={streaming}
            />
            {streaming ? (
              <Button type="button" size="icon" variant="destructive" onClick={stop} title="Stop" className="rounded-2xl">
                <X className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                className="bg-gradient-to-br from-primary to-blue-600 rounded-2xl"
                title="Kirim"
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </form>
        </div>

      </aside>
    </>
  );
};
