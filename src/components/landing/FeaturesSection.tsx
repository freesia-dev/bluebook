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
      description:
        "Registrasi surat masuk dan keluar dengan penomoran otomatis, unggah lampiran, serta pencarian arsip yang cepat.",
      tag: "Arsip Digital",
    },
    {
      icon: CreditCard,
      title: "Agenda Kredit",
      description:
        "Pengelolaan SPPK, PK, KK/MPAK, dan Nomor Loan terintegrasi untuk KCP Telihan dan Unit Meranti.",
      tag: "Multi-Unit",
    },
    {
      icon: Calculator,
      title: "Simulasi Kredit",
      description:
        "Kalkulator Konsumtif dan Produktif dengan program promo, perhitungan DSR, serta ekspor hasil simulasi.",
      tag: "Konsumtif & Produktif",
    },
    {
      icon: Banknote,
      title: "Operasional ATM",
      description:
        "Pencatatan pengisian kas, penyelesaian selisih, dan pembuatan Berita Acara siap cetak.",
      tag: "Berita Acara",
    },
    {
      icon: TrendingUp,
      title: "Loan Monitoring",
      description:
        "Dashboard KKR dan NPL berbasis data MLF, filter cabang, serta pemantauan fasilitas cair dan lunas bulan berjalan.",
      tag: "Berbasis MLF",
    },
    {
      icon: LineChart,
      title: "Kredit Produktif",
      description:
        "Pemisahan portofolio Telihan dan Meranti berdasarkan format PK, lengkap dengan ekspor Excel dan PDF terformat.",
      tag: "Telihan & Meranti",
    },
    {
      icon: UserSquare,
      title: "Customer Service",
      description:
        "Logbook Kartu ATM, Buku Tabungan, Bilyet Deposito, CIF, Nomor Rekening, dan SI autodebet dalam satu grup menu.",
      tag: "6 Submenu",
    },
    {
      icon: Shield,
      title: "Log Security",
      description:
        "Shift handover, kondisi kantor, audit publik satpam, dan Berita Acara Harian dengan bulk print.",
      tag: "Audit Trail",
    },
    {
      icon: FileSearch,
      title: "SLIK OJK",
      description:
        "Permohonan SLIK per pengguna dengan alur setuju/tolak dan laporan PDF yang terpisah per pengguna.",
      tag: "Per User",
    },
    {
      icon: Bot,
      title: "Asisten BIRU",
      description:
        "Asisten internal untuk tanya jawab operasional dan pencarian data debitur lintas modul.",
      tag: "Asisten Internal",
    },
    {
      icon: Bell,
      title: "Pusat Notifikasi",
      description:
        "Notifikasi menyesuaikan hak akses per role dan cabang, dengan tautan langsung ke tindakan yang perlu diambil.",
      tag: "Role-Based",
    },
    {
      icon: Users,
      title: "Manajemen Peran",
      description:
        "Admin, User, KIC, dan Demo dengan alur persetujuan admin serta hak akses granular per modul.",
      tag: "Approval",
    },
    {
      icon: Zap,
      title: "Global Search",
      description: "Tekan Ctrl+K untuk mencari surat, kredit, debitur, atau modul apa pun dari mana saja.",
      tag: "Ctrl + K",
    },
    {
      icon: BarChart3,
      title: "Dashboard Real-time",
      description: "Statistik operasional yang diperbarui otomatis melalui langganan realtime pada basis data.",
      tag: "Live Update",
    },
    {
      icon: Archive,
      title: "Activity Log & Recycle Bin",
      description: "Jejak audit lengkap untuk setiap perubahan data dan pemulihan entri yang terhapus.",
      tag: "Soft Delete",
    },
    {
      icon: Smartphone,
      title: "PWA Installable",
      description: "Dapat dipasang sebagai aplikasi di Android, iOS, dan Desktop dengan performa ringan.",
      tag: "Installable",
    },
  ];

  return (
    <section id="features" className="bg-white py-20 lg:py-28">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mb-12">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">
            Modul Operasional
          </div>
          <h2 className="text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">
            Semua kebutuhan operasional dalam satu portal
          </h2>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            Modul harian KCP Telihan dan Unit Meranti dikelola terpusat dengan penomoran otomatis,
            jejak audit, dan pelaporan siap cetak.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-slate-200">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="border-b border-r border-slate-200 p-6 transition-colors hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                  <feature.icon className="h-5 w-5 text-brand-primary" />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  {feature.tag}
                </span>
              </div>
              <h3 className="text-base font-semibold text-slate-900 mb-1.5">{feature.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
