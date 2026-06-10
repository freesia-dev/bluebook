import { ArrowRight, CheckCircle2 } from "lucide-react";

const ExplainerSection = () => {
  const steps = [
    {
      number: "01",
      title: "Login ke Sistem",
      description:
        "Masuk dengan akun yang disetujui admin. Sistem otomatis mengenali role dan menampilkan modul sesuai hak akses Anda.",
      highlights: ["Approval Workflow", "Role-based Access", "Auto Logout 1 Jam"],
    },
    {
      number: "02",
      title: "Kerjakan Modul Harian",
      description:
        "Input surat, kelola agenda kredit, simulasikan pinjaman, catat pengisian ATM, pantau NPL, atau jalankan shift security — semua di satu tempat.",
      highlights: ["Auto-numbering", "Cetak Berita Acara", "Reminder WhatsApp"],
    },
    {
      number: "03",
      title: "Pantau & Laporkan",
      description:
        "Dashboard real-time, global search (Ctrl+K), export Excel/PDF, activity log, dan recycle bin untuk audit penuh dan ketenangan pikiran.",
      highlights: ["Realtime Stats", "Audit Trail", "Recycle Bin"],
    },
  ];

  return (
    <section className="py-24 lg:py-32 bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:64px_64px]" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-secondary/20 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-white/10 text-brand-secondary font-semibold text-sm mb-4">
            ALUR PENGGUNAAN
          </span>
          <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
            Dari Login Sampai{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-secondary to-amber-400">
              Laporan Selesai
            </span>
          </h2>
          <p className="text-lg text-slate-300 leading-relaxed">
            Tiga langkah sederhana — sisanya ditangani sistem.
          </p>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-secondary/30 to-transparent -translate-y-1/2" />

          <div className="grid lg:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <div key={index} className="relative group">
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300 h-full">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-secondary to-amber-500 flex items-center justify-center text-2xl font-bold text-slate-900 shadow-lg group-hover:scale-110 transition-transform">
                      {step.number}
                    </div>
                    {index < steps.length - 1 && (
                      <ArrowRight className="hidden lg:block w-6 h-6 text-brand-secondary/50 absolute right-[-20px] top-1/2 -translate-y-1/2" />
                    )}
                  </div>

                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-slate-400 leading-relaxed mb-6">{step.description}</p>

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
