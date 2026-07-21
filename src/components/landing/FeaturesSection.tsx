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
  Bot,
  UserSquare,
  Bell,
  LineChart,
} from "lucide-react";

const FeaturesSection = () => {
  const features = [
    {
      icon: Mail,
      title: "Manajemen Surat",
      description: "Registrasi surat masuk dan keluar dengan penomoran otomatis, unggah lampiran, serta pencarian arsip yang cepat.",
      gradient: "from-blue-500 to-cyan-500",
      tag: "Arsip Digital",
    },
    {
      icon: CreditCard,
      title: "Agenda Kredit",
      description: "Pengelolaan SPPK, PK, KK/MPAK, dan Nomor Loan terintegrasi untuk KCP Telihan dan Unit Meranti.",
      gradient: "from-brand-secondary to-amber-500",
      tag: "Multi-Unit",
    },
    {
      icon: Calculator,
      title: "Simulasi Kredit",
      description: "Kalkulator Konsumtif dan Produktif dengan Program CERDAS, promo bunga, serta ekspor hasil simulasi.",
      gradient: "from-violet-500 to-purple-500",
      tag: "Konsumtif & Produktif",
    },
    {
      icon: Banknote,
      title: "Operasional ATM",
      description: "Pencatatan pengisian kas, penyelesaian selisih, dan pembuatan Berita Acara siap cetak.",
      gradient: "from-teal-500 to-emerald-500",
      tag: "Berita Acara Otomatis",
    },
    {
      icon: TrendingUp,
      title: "Loan Monitoring",
      description: "Dashboard KKR dan NPL berbasis data MLF, filter cabang, pemantauan fasilitas cair dan lunas bulan berjalan.",
      gradient: "from-rose-500 to-red-500",
      tag: "Berbasis MLF",
    },
    {
      icon: LineChart,
      title: "Kredit Produktif",
      description: "Pemisahan portofolio Telihan dan Meranti berdasarkan format PK, lengkap dengan ekspor Excel dan PDF terformat.",
      gradient: "from-emerald-500 to-teal-600",
      tag: "Telihan & Meranti",
    },
    {
      icon: UserSquare,
      title: "Customer Service",
      description: "Logbook Kartu ATM, Buku Tabungan, Bilyet Deposito, CIF, Nomor Rekening, dan SI autodebet dalam satu grup menu.",
      gradient: "from-cyan-500 to-blue-500",
      tag: "6 Submenu",
    },
    {
      icon: Shield,
      title: "Log Security",
      description: "Shift handover, kondisi kantor, audit publik satpam, dan Berita Acara Harian dengan bulk print.",
      gradient: "from-slate-600 to-slate-800",
      tag: "Audit Trail",
    },
    {
      icon: FileSearch,
      title: "SLIK OJK",
      description: "Permohonan SLIK per user dengan alur setuju/tolak dan laporan PDF yang terpisah per pengguna.",
      gradient: "from-indigo-500 to-blue-600",
      tag: "Per User Input",
    },
    {
      icon: Bot,
      title: "Asisten BIRU",
      description: "Asisten AI internal untuk tanya jawab operasional dan pencarian data debitur lintas modul.",
      gradient: "from-violet-500 to-purple-600",
      tag: "AI Assistant",
    },
    {
      icon: Bell,
      title: "Pusat Notifikasi",
      description: "Notifikasi berbasis peran dan cabang, dengan deep-link langsung ke tindakan yang perlu diambil.",
      gradient: "from-amber-500 to-orange-500",
      tag: "Role-Based",
    },
    {
      icon: Users,
      title: "Manajemen Peran",
      description: "Admin, User, KIC, dan Demo dengan alur persetujuan admin serta hak akses granular per modul.",
      gradient: "from-purple-500 to-pink-500",
      tag: "Approval Workflow",
    },
    {
      icon: Zap,
      title: "Global Search",
      description: "Tekan Ctrl+K untuk mencari surat, kredit, debitur, atau modul apa pun dari mana saja.",
      gradient: "from-yellow-500 to-amber-500",
      tag: "Ctrl + K",
    },
    {
      icon: BarChart3,
      title: "Dashboard Real-time",
      description: "Statistik operasional yang diperbarui otomatis melalui langganan realtime pada basis data.",
      gradient: "from-green-500 to-emerald-500",
      tag: "Live Update",
    },
    {
      icon: Archive,
      title: "Activity Log & Recycle Bin",
      description: "Jejak audit lengkap untuk setiap perubahan data dan pemulihan entri yang terhapus.",
      gradient: "from-amber-500 to-yellow-500",
      tag: "Soft Delete",
    },
    {
      icon: Smartphone,
      title: "PWA Installable",
      description: "Dapat dipasang sebagai aplikasi di Android, iOS, dan Desktop dengan performa ringan.",
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
            Modul operasional harian KCP Telihan dan Unit Meranti dikelola dalam satu portal terintegrasi
            dengan penomoran otomatis, jejak audit, dan pelaporan siap cetak.
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
            { value: "2", label: "Unit Terintegrasi" },
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
