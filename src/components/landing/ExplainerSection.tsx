import { ArrowRight, CheckCircle2 } from "lucide-react";

const ExplainerSection = () => {
  const steps = [
    {
      number: "01",
      title: "Login ke Sistem",
      description: "Masuk menggunakan akun yang telah didaftarkan oleh admin. Sistem akan otomatis mengenali role Anda.",
      highlights: ["Akses aman", "Role-based", "Single sign-on"]
    },
    {
      number: "02",
      title: "Kelola Data",
      description: "Input surat masuk/keluar, kelola agenda kredit (SPPK, PK, KK/MPAK, Nomor Loan) dengan mudah.",
      highlights: ["Form intuitif", "Auto-numbering", "File upload"]
    },
    {
      number: "03",
      title: "Pantau & Laporan",
      description: "Lihat dashboard statistik, cari data dengan cepat, dan ekspor laporan sesuai kebutuhan.",
      highlights: ["Real-time data", "Export Excel", "Filter canggih"]
    }
  ];

  return (
    <section className="py-24 lg:py-32 bg-slate-900 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-secondary/20 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-white/10 text-brand-secondary font-semibold text-sm mb-4">
            PANDUAN PENGGUNAAN
          </span>
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
            Cara Menggunakan{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-amber-400">
              Sistem Ini
            </span>
          </h2>
          <p className="text-lg text-slate-300 leading-relaxed">
            Sistem ini mudah dipahami. Ikuti langkah berikut untuk mulai menggunakan Bluebook.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-secondary/30 to-transparent transform -translate-y-1/2" />

          <div className="grid lg:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div 
                key={index}
                className="relative group"
              >
                {/* Card */}
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 h-full">
                  {/* Step number */}
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-secondary to-amber-500 flex items-center justify-center text-2xl font-bold text-slate-900 shadow-lg group-hover:scale-110 transition-transform">
                      {step.number}
                    </div>
                    {index < steps.length - 1 && (
                      <ArrowRight className="hidden lg:block w-6 h-6 text-brand-secondary/50 absolute right-[-20px] top-1/2 -translate-y-1/2" />
                    )}
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-slate-400 leading-relaxed mb-6">{step.description}</p>

                  {/* Highlights */}
                  <div className="space-y-2">
                    {step.highlights.map((highlight, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm text-slate-300">
                        <CheckCircle2 className="w-4 h-4 text-green-400" />
                        <span>{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExplainerSection;
