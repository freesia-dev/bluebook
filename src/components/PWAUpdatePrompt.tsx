import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2 } from "lucide-react";

type Phase = "idle" | "updating" | "done";

/**
 * Fully automatic PWA updater.
 * - Detects new service worker
 * - Activates it immediately (SKIP_WAITING)
 * - Clears all caches to bust stale assets
 * - Reloads the page
 * No user interaction required.
 */
export const PWAUpdatePrompt = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const startedRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration | null = null;
    let pollId: number | undefined;

    const triggerAutoUpdate = (worker: ServiceWorker | null) => {
      if (startedRef.current) return;
      startedRef.current = true;
      setPhase("updating");
      setProgress(10);

      const tick = window.setInterval(() => {
        setProgress((p) => (p < 90 ? p + Math.max(1, Math.round((92 - p) / 6)) : p));
      }, 200);

      const finalize = async () => {
        window.clearInterval(tick);
        try {
          if ("caches" in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map((k) => caches.delete(k)));
          }
        } catch {
          /* ignore */
        }
        setProgress(100);
        setPhase("done");
        setTimeout(() => window.location.reload(), 500);
      };

      navigator.serviceWorker.addEventListener("controllerchange", finalize, { once: true });

      // Ask the waiting worker to activate now
      try {
        worker?.postMessage({ type: "SKIP_WAITING" });
      } catch {
        /* ignore */
      }

      // Safety net: force reload even if controllerchange doesn't fire
      setTimeout(finalize, 6000);
    };

    navigator.serviceWorker.ready.then((registration) => {
      reg = registration;
      if (registration.waiting) triggerAutoUpdate(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const nw = registration.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            triggerAutoUpdate(nw);
          }
        });
      });
      pollId = window.setInterval(() => registration.update().catch(() => {}), 20_000);
    });

    return () => {
      if (pollId) window.clearInterval(pollId);
      reg = null;
    };
  }, []);

  if (phase === "idle") return null;

  return (
    <Dialog open onOpenChange={() => { /* non-dismissible */ }}>
      <DialogContent
        className="sm:max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            {phase === "updating" && <Loader2 className="w-7 h-7 text-primary animate-spin" />}
            {phase === "done" && <CheckCircle2 className="w-7 h-7 text-emerald-500" />}
          </div>
          <DialogTitle className="text-center">
            {phase === "updating" && "Memperbarui Bluebook…"}
            {phase === "done" && "Pembaruan Selesai"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {phase === "updating" && "Versi terbaru sedang dipasang otomatis. Mohon tunggu, jangan tutup jendela ini."}
            {phase === "done" && "Bluebook akan dimuat ulang sebentar lagi."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 pt-2">
          <Progress value={progress} />
          <p className="text-xs text-center text-muted-foreground">{progress}%</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
