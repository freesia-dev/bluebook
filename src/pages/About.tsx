import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import {
  Flame, Instagram, Linkedin,
  Mail, CreditCard, Banknote, Calculator, TrendingUp, Shield,
  FileSearch, Archive, Users, Zap, BarChart3, Smartphone, Sparkles,
  Bot, UserSquare, Bell, LineChart,
} from 'lucide-react';
import logoImage from '@/assets/logo_bluebook.png';

const modules = [
  { icon: Mail, title: 'Manajemen Surat', description: 'Registrasi surat masuk dan keluar dengan penomoran otomatis dan lampiran.', color: 'from-blue-500 to-cyan-500' },
  { icon: CreditCard, title: 'Agenda Kredit', description: 'Pengelolaan SPPK, PK, KK/MPAK, dan Nomor Loan — Telihan & Meranti.', color: 'from-amber-500 to-orange-500' },
  { icon: Calculator, title: 'Simulasi Kredit', description: 'Kalkulator Konsumtif, Produktif, Program CERDAS, serta ekspor hasil.', color: 'from-violet-500 to-purple-500' },
  { icon: Banknote, title: 'Operasional ATM', description: 'Pencatatan pengisian, penyelesaian selisih, dan Berita Acara siap cetak.', color: 'from-teal-500 to-emerald-500' },
  { icon: TrendingUp, title: 'Loan Monitoring', description: 'Dashboard KKR dan NPL berbasis MLF dengan filter cabang serta pantauan bulan berjalan.', color: 'from-rose-500 to-red-500' },
  { icon: LineChart, title: 'Kredit Produktif', description: 'Pemisahan portofolio Telihan dan Meranti berdasarkan format PK, siap ekspor.', color: 'from-emerald-500 to-teal-600' },
  { icon: UserSquare, title: 'Customer Service', description: 'Logbook Kartu ATM, Buku Tabungan, Bilyet Deposito, CIF, Rekening, dan SI.', color: 'from-cyan-500 to-blue-500' },
  { icon: Shield, title: 'Log Security', description: 'Shift, handover, BA Harian, bulk print, dan audit publik satpam.', color: 'from-slate-600 to-slate-800' },
  { icon: FileSearch, title: 'SLIK OJK', description: 'Permohonan per user dengan alur setuju/tolak dan laporan PDF terpisah.', color: 'from-indigo-500 to-blue-600' },
  { icon: Bot, title: 'Asisten BIRU', description: 'Asisten AI internal untuk tanya jawab operasional dan pencarian data debitur.', color: 'from-violet-500 to-purple-600' },
  { icon: Bell, title: 'Pusat Notifikasi', description: 'Notifikasi disesuaikan dengan Hak Akses per Role User dan cabang, lengkap dengan deep-link ke tindakan terkait.', color: 'from-amber-500 to-orange-500' },
  { icon: Archive, title: 'Activity Log & Recycle Bin', description: 'Jejak audit menyeluruh dan pemulihan data yang terhapus.', color: 'from-amber-500 to-yellow-500' },
];

const platformPerks = [
  { icon: Users, label: 'Hak Akses sesuai Role User', desc: 'Admin, User, KIC, dan Demo dengan persetujuan admin' },
  { icon: Zap, label: 'Global Search (Ctrl+K)', desc: 'Cari modul dan data dalam hitungan detik' },
  { icon: BarChart3, label: 'Dashboard Real-time', desc: 'Statistik diperbarui otomatis tanpa refresh' },
  { icon: Smartphone, label: 'PWA Installable', desc: 'Dapat dipasang di Android, iOS, dan Desktop' },
];

const About: React.FC = () => {
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto py-8 space-y-12">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-primary via-blue-700 to-slate-900 p-8 md:p-12 text-center">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-brand-secondary/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-brand-primary/40 rounded-full blur-3xl" />

          <div className="relative flex flex-col items-center">
            <div className="relative mb-6">
              <div className="absolute inset-0 bg-brand-secondary/40 blur-3xl rounded-full scale-125" />
              <div className="relative w-32 h-32 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-white to-blue-50 shadow-2xl ring-4 ring-white/40 flex items-center justify-center">
                <img
                  src={logoImage}
                  alt="Bluebook Logo"
                  className="w-24 h-24 md:w-28 md:h-28 object-contain"
                />
              </div>
              <Sparkles className="absolute -top-1 -right-1 w-6 h-6 text-brand-secondary animate-pulse" />
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs text-white/90 mb-4">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              Sistem aktif sejak 2026
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold text-white mb-3">
              Bluebook Telihan
            </h1>
            <p className="text-lg md:text-xl text-brand-secondary italic mb-5">
              "In Bluebook we Trust!"
            </p>
            <p className="max-w-2xl mx-auto text-blue-100/90 leading-relaxed">
              <strong className="text-white">Digital Logbook</strong> internal untuk{' '}
              <strong className="text-white">Bankaltimtara KCP Telihan dan Unit Meranti</strong>. Portal
              terpusat untuk administrasi surat, agenda kredit, simulasi pinjaman, operasional ATM,
              monitoring kredit, layanan Customer Service, log security, dan SLIK OJK — dilengkapi
              asisten AI BIRU, notifikasi sesuai Role User, serta jejak audit yang menyeluruh.
            </p>
          </div>
        </div>

        {/* Modules Grid */}
        <div>
          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
              MODUL UTAMA
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Apa Saja yang Ada di Dalamnya?
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((m, i) => (
              <Card key={i} className="group hover:shadow-lg transition-all duration-300 border-muted hover:border-primary/30 hover:-translate-y-0.5">
                <CardContent className="p-5 flex gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${m.color} flex items-center justify-center shrink-0 shadow-md group-hover:scale-110 transition-transform`}>
                    <m.icon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{m.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{m.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Platform Perks */}
        <div>
          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 rounded-full bg-secondary/10 text-secondary-foreground text-xs font-semibold mb-3">
              PLATFORM
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground">
              Dibangun untuk Cepat & Aman
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {platformPerks.map((p, i) => (
              <div key={i} className="rounded-xl border border-border bg-card p-4 text-center hover:border-primary/30 transition-colors">
                <div className="w-10 h-10 mx-auto rounded-lg bg-primary/10 flex items-center justify-center mb-2">
                  <p.icon className="w-5 h-5 text-primary" />
                </div>
                <div className="text-sm font-semibold text-foreground">{p.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{p.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tech stack chips */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="text-center mb-4">
            <h3 className="font-display text-lg font-bold text-foreground">Teknologi yang Digunakan</h3>
            <p className="text-xs text-muted-foreground">Stack modern, ringan, dan terpercaya</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {['React 18', 'TypeScript', 'Vite', 'Tailwind CSS', 'shadcn/ui', 'Supabase', 'React Query', 'PWA', 'Recharts', 'jsPDF'].map((t) => (
              <span key={t} className="px-3 py-1 rounded-full bg-muted text-xs font-medium text-muted-foreground border border-border">
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* Creator Section */}
        <Card className="text-center shadow-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary via-secondary to-primary" />
          <CardContent className="py-8 px-6">
            <p className="text-muted-foreground flex items-center justify-center gap-2 mb-2">
              Dibuat dengan <Flame className="w-4 h-4 text-orange-500 fill-orange-500 animate-pulse" /> oleh
            </p>
            <p className="font-display text-2xl font-bold text-foreground mb-4">Haris Fadilah</p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <a
                href="https://instagram.com/va.ys"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/harisf/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
            <div className="h-px bg-border my-4" />
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Bluebook Telihan. All rights reserved.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default About;
