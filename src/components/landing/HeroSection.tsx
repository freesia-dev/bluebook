import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Lock, Download, Check } from "lucide-react";
import logo from "@/assets/logo_bluebook.png";

const HeroSection = () => {
  const navigate = useNavigate();

  const bullets = [
    "15+ modul operasional untuk KCP Telihan dan Unit Meranti",
    "Penomoran otomatis, berita acara siap cetak, dan jejak audit",
    "Dashboard real-time, pencarian global, dan aplikasi installable",
  ];

  const facts = [
    { value: "15+", label: "Modul aktif" },
    { value: "2", label: "Unit terintegrasi" },
    { value: "2026", label: "Aktif sejak" },
  ];

  return (
    <section className="relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

      <div className="relative container mx-auto px-4 py-20 lg:py-28">
        <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-14 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-medium tracking-wide text-slate-300">
                Sistem Administrasi Internal Bankaltimtara
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-[3.4rem] font-semibold text-white leading-[1.1] tracking-tight">
                Bluebook Telihan
              </h1>
              <p className="text-lg lg:text-xl text-slate-300 font-medium">
                Portal administrasi digital KCP Telihan dan Unit Meranti
              </p>
              <p className="text-base text-slate-400 max-w-xl leading-relaxed">
                Satu tempat untuk administrasi surat, agenda kredit, simulasi pinjaman, operasional ATM,
                monitoring kredit, layanan Customer Service, dan log security — terstandar, terdokumentasi,
                dan siap audit.
              </p>
            </div>

            <ul className="space-y-2.5">
              {bullets.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-slate-300">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-secondary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="px-7 bg-brand-secondary text-slate-900 hover:bg-brand-secondary/90"
                onClick={() => navigate("/login")}
              >
                Masuk Sistem
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="px-7 border-white/20 bg-transparent text-white hover:bg-white/10"
                onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })}
              >
                Lihat Fitur
              </Button>
              <Button
                size="lg"
                variant="ghost"
                className="px-5 text-slate-300 hover:bg-white/10 hover:text-white"
                onClick={() => navigate("/install")}
              >
                <Download className="mr-2 h-4 w-4" />
                Install App
              </Button>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Lock className="h-3.5 w-3.5" />
              <span>Akses terbatas untuk pegawai Bankaltimtara</span>
            </div>
          </div>

          <div className="lg:justify-self-end w-full max-w-sm">
            <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-8">
              <div className="mx-auto flex h-28 w-28 items-center justify-center rounded-2xl bg-white p-4">
                <img src={logo} alt="Logo Bluebook Telihan" className="h-full w-full object-contain" />
              </div>
              <div className="mt-6 text-center">
                <div className="text-lg font-semibold text-white">Bluebook Telihan</div>
                <div className="mt-1 text-sm text-slate-400">Digital Logbook System</div>
              </div>

              <div className="mt-8 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-6">
                {facts.map((f) => (
                  <div key={f.label} className="px-2 text-center">
                    <div className="text-xl font-semibold text-white">{f.value}</div>
                    <div className="mt-1 text-[11px] leading-tight text-slate-500">{f.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
