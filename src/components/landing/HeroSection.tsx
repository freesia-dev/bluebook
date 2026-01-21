import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Play, Sparkles } from "lucide-react";
import logo from "@/assets/logo_bluebook.png";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-secondary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-r from-brand-primary/10 to-brand-secondary/10 rounded-full blur-3xl" />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      </div>

      <div className="relative container mx-auto px-4 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left content */}
          <div className="text-left space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
              <Sparkles className="w-4 h-4 text-brand-secondary" />
              <span className="text-sm text-white/80">Digital Logbook System</span>
            </div>

            {/* Main heading */}
            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight">
                Selamat Datang di{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-amber-400">
                  Bluebook TLH
                </span>
              </h1>
              <p className="text-xl lg:text-2xl text-blue-100/80 font-medium">
                Solusi Andal untuk Pengelolaan Administrasi Perbankan
              </p>
            </div>

            {/* Description */}
            <p className="text-lg text-slate-300 max-w-xl leading-relaxed">
              Sistem Digital Logbook yang dirancang khusus untuk Bank Kaltimtara KCP Telihan. 
              Kelola surat-menyurat dan agenda kredit secara digital, efisien, dan terintegrasi.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                className="px-8 py-6 text-lg font-semibold bg-gradient-to-r from-brand-secondary to-amber-500 hover:from-brand-secondary/90 hover:to-amber-500/90 text-slate-900 shadow-lg shadow-brand-secondary/25 hover:shadow-xl hover:shadow-brand-secondary/30 transition-all duration-300"
                onClick={() => navigate('/login')}
              >
                Mulai Sekarang
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="px-8 py-6 text-lg font-semibold border-2 border-white/20 text-white hover:bg-white/10 bg-transparent"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Play className="mr-2 w-5 h-5" />
                Lihat Demo
              </Button>
            </div>

            {/* Trust badges */}
            <div className="flex items-center gap-6 pt-4">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-slate-900 flex items-center justify-center text-xs text-white font-medium">
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-slate-400">Dipercaya oleh tim KCP Telihan</span>
              </div>
            </div>
          </div>

          {/* Right content - Logo/Visual */}
          <div className="relative flex justify-center lg:justify-end">
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-brand-primary to-brand-secondary rounded-3xl blur-2xl opacity-30 animate-pulse" />
              
              {/* Main card */}
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 lg:p-12">
                <div className="w-48 h-48 lg:w-64 lg:h-64 mx-auto">
                  <img 
                    src={logo} 
                    alt="Bluebook Logo" 
                    className="w-full h-full object-contain drop-shadow-2xl"
                  />
                </div>
                <div className="text-center mt-6">
                  <h2 className="text-2xl lg:text-3xl font-bold text-white">Bluebook TLH</h2>
                  <p className="text-brand-secondary font-medium mt-2">In Bluebook we Trust!</p>
                </div>

                {/* Floating elements */}
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-gradient-to-br from-brand-secondary to-amber-500 rounded-2xl flex items-center justify-center shadow-lg animate-bounce" style={{ animationDuration: '3s' }}>
                  <span className="text-2xl font-bold text-slate-900">📊</span>
                </div>
                <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-gradient-to-br from-blue-500 to-brand-primary rounded-xl flex items-center justify-center shadow-lg animate-bounce" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}>
                  <span className="text-xl">📨</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 animate-bounce">
        <span className="text-sm text-slate-400">Scroll</span>
        <div className="w-6 h-10 border-2 border-slate-400 rounded-full flex justify-center pt-2">
          <div className="w-1.5 h-3 bg-slate-400 rounded-full animate-pulse" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
