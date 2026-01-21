import { Card, CardContent } from "@/components/ui/card";
import { 
  Mail, 
  FileText, 
  Users, 
  Shield,
  Zap,
  BarChart3
} from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: Mail,
      title: "Manajemen Surat",
      description: "Kelola surat masuk dan keluar dengan mudah, terorganisir, dan dapat dilacak dengan cepat.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: FileText,
      title: "Agenda Kredit",
      description: "Pantau SPPK, PK, KK/MPAK, dan Nomor Loan dalam satu platform terintegrasi.",
      gradient: "from-brand-secondary to-amber-500"
    },
    {
      icon: Users,
      title: "Multi-User Access",
      description: "Kolaborasi tim dengan sistem role Admin, User, dan Demo yang fleksibel.",
      gradient: "from-purple-500 to-pink-500"
    },
    {
      icon: Shield,
      title: "Keamanan Terjamin",
      description: "Data tersimpan dengan aman di cloud dengan enkripsi dan backup otomatis.",
      gradient: "from-green-500 to-emerald-500"
    },
    {
      icon: Zap,
      title: "Cepat & Efisien",
      description: "Proses administrasi yang dulunya memakan waktu, kini selesai dalam hitungan detik.",
      gradient: "from-brand-primary to-blue-600"
    },
    {
      icon: BarChart3,
      title: "Laporan Real-time",
      description: "Dashboard informatif dengan statistik dan analisis data yang selalu up-to-date.",
      gradient: "from-rose-500 to-red-500"
    }
  ];

  return (
    <section id="features" className="py-24 lg:py-32 bg-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-primary" />
      <div className="absolute top-20 right-0 w-72 h-72 bg-brand-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-72 h-72 bg-brand-secondary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-brand-primary/10 text-brand-primary font-semibold text-sm mb-4">
            KEUNGGULAN UTAMA
          </span>
          <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 mb-6">
            Fitur yang Membuat{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">
              Perbedaan
            </span>
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            Solusi lengkap untuk pengelolaan administrasi dan agenda kredit perbankan 
            yang modern, aman, dan mudah digunakan.
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <Card 
              key={index}
              className="group border-0 shadow-lg hover:shadow-2xl transition-all duration-500 bg-white hover:-translate-y-2 overflow-hidden"
            >
              <CardContent className="p-8 relative">
                {/* Gradient line on top */}
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500`} />
                
                {/* Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-slate-900 mb-3 group-hover:text-brand-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-slate-600 leading-relaxed">
                  {feature.description}
                </p>

                {/* Hover arrow */}
                <div className="mt-4 flex items-center gap-2 text-brand-primary font-medium opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300">
                  <span>Pelajari lebih</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
