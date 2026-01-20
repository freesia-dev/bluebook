import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { 
  Mail, 
  FileText, 
  Users, 
  Shield, 
  CheckCircle2, 
  ArrowRight,
  Building2,
  Lock,
  FileCheck,
  TrendingUp
} from "lucide-react";
import logo from "@/assets/logo_bluebook.png";

const Index = () => {
  const navigate = useNavigate();

  const features = [
    {
      icon: Mail,
      title: "Manajemen Surat",
      description: "Kelola surat masuk dan keluar dengan mudah dan terorganisir."
    },
    {
      icon: FileText,
      title: "Agenda Kredit",
      description: "Pantau SPPK, PK, KK/MPAK, dan Nomor Loan dalam satu platform."
    },
    {
      icon: Users,
      title: "Multi-User",
      description: "Kolaborasi tim dengan sistem role Admin, User, dan Demo."
    },
    {
      icon: Shield,
      title: "Aman & Terpercaya",
      description: "Data tersimpan dengan aman di cloud dengan backup otomatis."
    }
  ];

  const values = [
    {
      icon: Building2,
      text: "Mendukung operasional perbankan"
    },
    {
      icon: FileCheck,
      text: "Terintegrasi dan terdokumentasi"
    },
    {
      icon: TrendingUp,
      text: "Mengurangi risiko human error"
    },
    {
      icon: Lock,
      text: "Akses berbasis role & keamanan data"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        
        <div className="relative container mx-auto px-4 pt-12 pb-20 lg:pt-20 lg:pb-32">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            {/* Logo */}
            <div className="mb-8 animate-fade-in">
              <div className="w-24 h-24 lg:w-32 lg:h-32 rounded-2xl bg-white shadow-lg p-4 flex items-center justify-center">
                <img 
                  src={logo} 
                  alt="Bluebook Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
            </div>

            {/* Title */}
            <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 mb-4 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Bluebook Telihan
            </h1>

            {/* Tagline */}
            <p className="text-xl lg:text-2xl font-medium text-primary mb-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              In Bluebook we Trust!
            </p>

            {/* Description */}
            <p className="text-lg text-slate-600 max-w-2xl mb-10 leading-relaxed animate-fade-in" style={{ animationDelay: '0.3s' }}>
              Bluebook adalah sistem Digital Logbook yang dirancang khusus untuk Bank Kaltimtara KCP Telihan. 
              Aplikasi ini membantu mengelola administrasi surat-menyurat dan agenda kredit secara digital, 
              efisien, dan terintegrasi.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              <Button 
                size="lg" 
                className="px-8 py-6 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={() => navigate('/login')}
              >
                Masuk
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="px-8 py-6 text-lg font-semibold border-2 hover:bg-slate-50"
                onClick={() => navigate('/login?mode=register')}
              >
                Daftar
              </Button>
              <Button 
                size="lg" 
                variant="ghost"
                className="px-8 py-6 text-lg font-medium text-slate-600 hover:text-primary"
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Lihat Fitur
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 lg:py-28 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
              Fitur Utama
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Solusi lengkap untuk pengelolaan administrasi dan agenda kredit perbankan
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="group border-0 shadow-md hover:shadow-xl transition-all duration-300 bg-white hover:-translate-y-1"
              >
                <CardContent className="p-8">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Values Section */}
      <section className="py-20 lg:py-28 bg-gradient-to-b from-slate-50 to-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-4">
                Keunggulan Bluebook
              </h2>
              <p className="text-lg text-slate-600">
                Nilai-nilai yang kami tawarkan untuk mendukung operasional Anda
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {values.map((value, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 p-6 rounded-xl bg-white shadow-sm border border-slate-100 hover:shadow-md transition-all duration-300"
                >
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-green-50 flex items-center justify-center">
                    <value.icon className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-lg font-medium text-slate-800">
                    {value.text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-28 bg-primary">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-white mb-4">
              Siap menggunakan Bluebook?
            </h2>
            <p className="text-xl text-blue-100 mb-10">
              Kelola administrasi dan agenda kredit secara digital dan terpercaya.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                variant="secondary"
                className="px-8 py-6 text-lg font-semibold bg-white text-primary hover:bg-slate-50 shadow-lg"
                onClick={() => navigate('/login')}
              >
                Masuk Sekarang
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="px-8 py-6 text-lg font-semibold border-2 border-white text-white hover:bg-white/10 bg-transparent"
                onClick={() => navigate('/login?mode=register')}
              >
                Daftar Akun
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-slate-900">
        <div className="container mx-auto px-4">
          <div className="flex flex-col items-center text-center">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-white/10 p-2 flex items-center justify-center">
                <img 
                  src={logo} 
                  alt="Bluebook Logo" 
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xl font-semibold text-white">
                Bluebook Telihan
              </span>
            </div>
            <p className="text-slate-400 mb-6">
              Internal Application – Bank Kaltimtara KCP Telihan
            </p>
            <div className="w-16 h-px bg-slate-700 mb-6" />
            <p className="text-sm text-slate-500">
              © {new Date().getFullYear()} Bluebook Telihan. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
