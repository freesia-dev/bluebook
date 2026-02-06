import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  Download, 
  Smartphone, 
  Share, 
  MoreVertical, 
  Plus, 
  CheckCircle2, 
  ArrowLeft, 
  Zap, 
  Wifi, 
  Shield,
  Monitor
} from "lucide-react";
import logo from "@/assets/logo_bluebook.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallApp = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Detect platform
    const ua = navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua));
    setIsAndroid(/Android/.test(ua));

    // Check if already installed (standalone mode)
    const standalone = window.matchMedia("(display-mode: standalone)").matches 
      || (navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);

    // Listen for successful install
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const benefits = [
    { icon: Zap, title: "Loading Cepat", desc: "Akses instan tanpa buka browser" },
    { icon: Wifi, title: "Akses Offline", desc: "Data yang di-cache tetap bisa diakses" },
    { icon: Shield, title: "Aman & Privat", desc: "Sama amannya seperti versi web" },
    { icon: Smartphone, title: "Tampilan Full", desc: "Tampilan fullscreen seperti app native" },
  ];

  if (isStandalone || isInstalled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4">
        <Card className="max-w-md w-full bg-white/5 border-white/10 backdrop-blur-xl">
          <CardContent className="pt-8 pb-8 text-center space-y-6">
            <div className="w-20 h-20 mx-auto bg-green-500/20 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Sudah Terinstall! 🎉</h2>
              <p className="text-slate-300 mt-2">
                Bluebook sudah terpasang di perangkat kamu. Kamu bisa mengaksesnya langsung dari home screen.
              </p>
            </div>
            <Button 
              onClick={() => navigate("/login")}
              className="w-full bg-gradient-to-r from-brand-secondary to-amber-500 text-slate-900 font-semibold"
            >
              Masuk ke Bluebook
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/20 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-lg">
        {/* Back button */}
        <button 
          onClick={() => navigate("/")} 
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Kembali</span>
        </button>

        {/* Header */}
        <div className="text-center space-y-4 mb-8">
          <div className="w-24 h-24 mx-auto">
            <img src={logo} alt="Bluebook" className="w-full h-full object-contain drop-shadow-2xl" />
          </div>
          <h1 className="text-3xl font-bold text-white">Install Bluebook</h1>
          <p className="text-slate-300">
            Pasang Bluebook di perangkatmu untuk akses cepat langsung dari home screen
          </p>
        </div>

        {/* Benefits */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          {benefits.map((b, i) => (
            <Card key={i} className="bg-white/5 border-white/10 backdrop-blur-sm">
              <CardContent className="p-4 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-xl bg-primary/20 flex items-center justify-center">
                  <b.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-sm font-semibold text-white">{b.title}</h3>
                <p className="text-xs text-slate-400">{b.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Install Button (Chrome/Android) */}
        {deferredPrompt && (
          <Card className="bg-gradient-to-r from-brand-secondary/20 to-amber-500/20 border-brand-secondary/30 mb-6">
            <CardContent className="p-6 text-center space-y-4">
              <Download className="w-8 h-8 text-brand-secondary mx-auto" />
              <h3 className="text-lg font-bold text-white">Siap Diinstall!</h3>
              <Button 
                onClick={handleInstall}
                size="lg"
                className="w-full bg-gradient-to-r from-brand-secondary to-amber-500 text-slate-900 font-bold text-lg py-6"
              >
                <Download className="w-5 h-5 mr-2" />
                Install Bluebook
              </Button>
            </CardContent>
          </Card>
        )}

        {/* iOS Instructions */}
        {isIOS && !deferredPrompt && (
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm mb-6">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Cara Install di iPhone/iPad</h3>
              </div>
              <div className="space-y-4">
                {[
                  { step: 1, icon: Share, text: "Ketuk tombol Share di Safari", sub: "(ikon kotak dengan panah ke atas)" },
                  { step: 2, icon: Plus, text: "Scroll dan pilih \"Add to Home Screen\"", sub: "" },
                  { step: 3, icon: CheckCircle2, text: "Ketuk \"Add\" untuk konfirmasi", sub: "" },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-blue-300">{item.step}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-slate-400" />
                        <p className="text-white font-medium">{item.text}</p>
                      </div>
                      {item.sub && <p className="text-xs text-slate-500 mt-1">{item.sub}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Android Instructions (if prompt not available) */}
        {isAndroid && !deferredPrompt && (
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm mb-6">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <Smartphone className="w-5 h-5 text-green-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Cara Install di Android</h3>
              </div>
              <div className="space-y-4">
                {[
                  { step: 1, icon: MoreVertical, text: "Ketuk menu ⋮ di Chrome", sub: "(tiga titik di pojok kanan atas)" },
                  { step: 2, icon: Download, text: "Pilih \"Install app\" atau \"Add to Home screen\"", sub: "" },
                  { step: 3, icon: CheckCircle2, text: "Ketuk \"Install\" untuk konfirmasi", sub: "" },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-blue-300">{item.step}</span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <item.icon className="w-4 h-4 text-slate-400" />
                        <p className="text-white font-medium">{item.text}</p>
                      </div>
                      {item.sub && <p className="text-xs text-slate-500 mt-1">{item.sub}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Desktop Instructions */}
        {!isIOS && !isAndroid && !deferredPrompt && (
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm mb-6">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <Monitor className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-bold text-white">Install di Desktop</h3>
              </div>
              <div className="space-y-4">
                {[
                  { step: 1, text: "Buka Bluebook di Chrome atau Edge" },
                  { step: 2, text: "Klik ikon install (⊕) di address bar" },
                  { step: 3, text: "Klik \"Install\" untuk konfirmasi" },
                ].map((item) => (
                  <div key={item.step} className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-blue-300">{item.step}</span>
                    </div>
                    <p className="text-white font-medium pt-1">{item.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center space-y-4 pt-4">
          <p className="text-xs text-slate-500">
            Bluebook PWA — versi web yang bisa diinstall, tidak perlu download dari App Store
          </p>
          <Button 
            variant="ghost" 
            onClick={() => navigate("/login")}
            className="text-slate-400 hover:text-white"
          >
            Atau langsung masuk via browser →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstallApp;
