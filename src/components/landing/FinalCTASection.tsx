import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Mail, Phone } from "lucide-react";

const FinalCTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 lg:py-32 bg-gradient-to-br from-brand-primary via-blue-700 to-brand-primary relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-secondary/20 via-transparent to-brand-secondary/10" />
      
      {/* Floating shapes */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-32 h-32 bg-brand-secondary/20 rounded-full blur-xl animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/5 rounded-2xl rotate-45 animate-bounce" style={{ animationDuration: '3s' }} />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-8">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-secondary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-secondary"></span>
            </span>
            <span className="text-sm text-white/90">Sistem aktif dan siap digunakan</span>
          </div>

          {/* Main heading */}
          <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Menuju Transformasi Digital dengan{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-amber-300">
              Bluebook!
            </span>
          </h2>

          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto leading-relaxed">
            Akses sistem sekarang untuk mengelola administrasi dan agenda kredit 
            KCP Telihan secara digital dan terintegrasi.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="px-10 py-7 text-lg font-bold bg-gradient-to-r from-brand-secondary to-amber-500 hover:from-brand-secondary/90 hover:to-amber-500/90 text-slate-900 shadow-2xl shadow-brand-secondary/30 hover:shadow-brand-secondary/50 transition-all duration-300 hover:scale-105"
              onClick={() => navigate('/login')}
            >
              Masuk Sekarang
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              className="px-10 py-7 text-lg font-semibold border-2 border-white/30 text-white hover:bg-white/10 bg-transparent hover:border-white/50 transition-all duration-300"
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Lihat Fitur
            </Button>
          </div>

          {/* Contact info */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-blue-100">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              <span>kcptlh.143@gmail.com</span>
            </div>
            <div className="hidden sm:block w-1 h-1 rounded-full bg-blue-300" />
            <div className="flex items-center gap-2">
              <Phone className="w-5 h-5" />
              <span>Hubungi Admin KCP Telihan</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;
