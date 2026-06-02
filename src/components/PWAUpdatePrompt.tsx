import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Download, Loader2, CheckCircle2, Sparkles } from "lucide-react";

type Phase = "idle" | "available" | "updating" | "done";

export const PWAUpdatePrompt = () => {
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reg: ServiceWorkerRegistration | null = null;
    let didReload = false;
    let pollId: number | undefined;

    const handleWaiting = (worker: ServiceWorker | null) => {
      if (!worker) return;
      setWaitingWorker(worker);
      setPhase("available");
    };

    navigator.serviceWorker.ready.then((registration) => {
      reg = registration;
      if (registration.waiting) handleWaiting(registration.waiting);
      registration.addEventListener("updatefound", () => {
        const nw = registration.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed" && navigator.serviceWorker.controller) {
            handleWaiting(nw);
          }
        });
      });
      // Aggressive polling inside the prompt as a second line of defence
      pollId = window.setInterval(() => registration.update().catch(() => {}), 20_000);
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (didReload) return;
      if (phase !== "updating" && phase !== "available") return;
      didReload = true;
    });

    return () => {
      if (pollId) window.clearInterval(pollId);
      reg = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdate = () => {
    if (!waitingWorker) return;
    setPhase("updating");
    setProgress(8);

    // Simulated progress while SW activates
    const tick = setInterval(() => {
      setProgress((p) => (p < 90 ? p + Math.max(1, Math.round((92 - p) / 8)) : p));
    }, 250);

    const onController = () => {
      clearInterval(tick);
      setProgress(100);
      setPhase("done");
      setTimeout(() => window.location.reload(), 600);
    };
    navigator.serviceWorker.addEventListener("controllerchange", onController, { once: true });

    // Tell waiting SW to activate
    waitingWorker.postMessage({ type: "SKIP_WAITING" });

    // Safety: if controllerchange doesn't fire within 10s, reload anyway
    setTimeout(() => {
      if (phase !== "done") {
        clearInterval(tick);
        window.location.reload();
      }
    }, 10000);
  };

  if (phase === "idle") return null;

  const blocking = phase === "updating" || phase === "done";

  return (
    <Dialog open onOpenChange={() => { /* non-dismissible */ }}>
      <DialogContent
        className={`sm:max-w-md ${blocking ? "[&>button]:hidden" : ""}`}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-2">
            {phase === "available" && <Sparkles className="w-7 h-7 text-primary" />}
            {phase === "updating" && <Loader2 className="w-7 h-7 text-primary animate-spin" />}
            {phase === "done" && <CheckCircle2 className="w-7 h-7 text-emerald-500" />}
          </div>
          <DialogTitle className="text-center">
            {phase === "available" && "Versi Baru Tersedia"}
            {phase === "updating" && "Memperbarui Bluebook…"}
            {phase === "done" && "Pembaruan Selesai"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {phase === "available" && "Ada pembaruan Bluebook. Klik Update untuk memasang versi terbaru. Aplikasi akan dimuat ulang setelah selesai."}
            {phase === "updating" && "Mohon tunggu, jangan tutup jendela ini. Bluebook akan otomatis terbuka kembali."}
            {phase === "done" && "Bluebook akan dimuat ulang sebentar lagi."}
          </DialogDescription>
        </DialogHeader>

        {(phase === "updating" || phase === "done") && (
          <div className="space-y-2 pt-2">
            <Progress value={progress} />
            <p className="text-xs text-center text-muted-foreground">{progress}%</p>
          </div>
        )}

        {phase === "available" && (
          <div className="flex justify-center pt-2">
            <Button onClick={handleUpdate} size="lg" className="gap-2">
              <Download className="w-4 h-4" />
              Update Sekarang
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
