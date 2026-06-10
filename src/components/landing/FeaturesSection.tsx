import { Card, CardContent } from "@/components/ui/card";
import {
  Mail,
  CreditCard,
  Banknote,
  Calculator,
  TrendingUp,
  Shield,
  FileSearch,
  Archive,
  Users,
  Zap,
  BarChart3,
  Smartphone,
} from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: Mail,
      title: "Manajemen Surat",
      description: "Surat masuk & keluar dengan auto-numbering, upload lampiran, dan pencarian cepat.",
      gradient: "from-blue-500 to-cyan-500",
      tag: "Arsip Digital",
    },
    {
      icon: CreditCard,
      title: "Agenda Kredit",
      description: "SPPK, PK, KK/MPAK, dan Nomor Loan untuk KCP Telihan & Meranti dalam satu tempat.",
      gradient: "from-brand-secondary to-amber-500",
      tag: "Multi-Cabang",
    },
    {
      icon: Calculator,
      title: "Simulasi Kredit",
      description: "Kalkulator Konsumtif & Produktif lengkap dengan Program CERDAS dan promo bunga.",
      gradient: "from-violet-500 to-purple-500",
      tag: "Konsumtif & Produktif",
    },
    {
      icon: Banknote,
      title: "ATM Telihan",
      description: "Catat pengisian, selesaikan selisih kas, dan cetak Berita Acara otomatis.",
      gradient: "from-teal-500 to-emerald-500",
      tag: "Berita Acara Otomatis",
    },
    {
      icon: TrendingUp,
      title: "Monitoring KKR & NPL",
      description: "Upload data, dashboard real-time, kontak debitur, dan reminder tunggakan via WhatsApp.",
      gradient: "from-rose-500 to-red-500",
      tag: "Real-time",
    },
    {
      icon: Shield,
      title: "Log Security",
      description: "Shift handover, kondisi kantor, audit publik, dan Berita Acara Harian satpam.",
      gradient: "from-slate-600 to-slate-800",
      tag: "Audit Trail",
    },
    {
      icon: FileSearch,
      title: "SLIK OJK",
      description: "Permohonan SLIK OJK per user input dengan workflow setujui/tolak dan laporan PDF.",
      gradient: "from-indigo-500 to-blue-600",
      tag: "Per User Input",
    },
    {
      icon: Archive,
      title: "Activity Log & Recycle Bin",
      description: "Audit trail lengkap untuk setiap perubahan, plus pemulihan data yang terhapus.",
      gradient: "from-amber-500 to-orange-500",
      tag: "Soft Delete",
    },
    {
      icon: Users,
      title: "Role-Based Access",
      description: "Admin, User, dan Demo dengan persetujuan admin sebelum akun aktif.",
      gradient: "from-purple-500 to-pink-500",
      tag: "Approval Workflow",
    },
    {
      icon: Zap,
      title: "Global Search",
      description: "Tekan Ctrl+K untuk mencari surat, kredit, debitur, atau modul apapun dalam hitungan detik.",
      gradient: "from-yellow-500 to-amber-500",
      tag: "Ctrl + K",
    },
    {
      icon: BarChart3,
      title: "Dashboard Real-time",
      description: "Statistik live dengan Supabase Realtime — angka berubah otomatis tanpa refresh.",
      gradient: "from-green-500 to-emerald-500",
      tag: "Live Update",
    },
    {
      icon: Smartphone,
      title: "PWA — Install di HP",
      description: "Pasang di Android, iOS, atau Desktop. Cepat, ringan, dan bisa diakses sebagai aplikasi.",
      gradient: "from-brand-primary to-blue-600",
      tag: "Installable",
    },
  ];

  return (
    <section id="features" className="py-24 lg:py-32 bg-white relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-primary via-brand-secondary to-brand-primary" />
      <div className="absolute top-20 right-0 w-72 h-72 bg-brand-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-20 left-0 w-72 h-72 bg-brand-secondary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-brand-primary/10 text-brand-primary font-semibold text-sm mb-4">
            FITUR LENGKAP
          </span>
          <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 mb-6">
            Semua yang Dibutuhkan KCP{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">
              dalam Satu Portal
            </span>
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            Dari surat-menyurat sampai monitoring NPL, dari simulasi kredit sampai BA ATM — Bluebook
            menyatukan operasional harian KCP Telihan & Meranti dalam satu sistem yang ringan dan cepat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="group border border-slate-200 shadow-sm hover:shadow-xl transition-all duration-300 bg-white hover:-translate-y-1 overflow-hidden relative"
            >
              <CardContent className="p-6 relative">
                <div
                  className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${feature.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`}
                />

                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center shadow-md group-hover:scale-110 transition-transform duration-300`}
                  >
                    <feature.icon className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                    {feature.tag}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-brand-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Stats strip */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {[
            { value: "12+", label: "Modul Aktif" },
            { value: "2", label: "KCP Terintegrasi" },
            { value: "Real-time", label: "Dashboard Live" },
            { value: "PWA", label: "Installable" },
          ].map((stat, i) => (
            <div
              key={i}
              className="text-center p-4 rounded-xl bg-gradient-to-br from-slate-50 to-white border border-slate-200"
            >
              <div className="text-2xl lg:text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">
                {stat.value}
              </div>
              <div className="text-xs text-slate-600 mt-1 font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
