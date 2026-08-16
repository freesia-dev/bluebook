import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import {
  Flame, Instagram, Linkedin,
  Mail, CreditCard, Banknote, Calculator, TrendingUp, Shield,
  FileSearch, Archive, Users, Zap, BarChart3, Smartphone,
  Bot, UserSquare, Bell, LineChart,
} from 'lucide-react';
import logoImage from '@/assets/logo_bluebook.png';

const modules = [
  { icon: Mail, title: 'Manajemen Surat', description: 'Registrasi surat masuk dan keluar dengan penomoran otomatis dan lampiran.' },
  { icon: CreditCard, title: 'Agenda Kredit', description: 'Pengelolaan SPPK, PK, KK/MPAK, dan Nomor Loan — Telihan & Meranti.' },
  { icon: Calculator, title: 'Simulasi Kredit', description: 'Kalkulator Konsumtif, Produktif, program promo, serta ekspor hasil.' },
  { icon: Banknote, title: 'Operasional ATM', description: 'Pencatatan pengisian, penyelesaian selisih, dan Berita Acara siap cetak.' },
  { icon: TrendingUp, title: 'Loan Monitoring', description: 'Dashboard KKR dan NPL berbasis MLF dengan filter cabang serta pantauan bulan berjalan.' },
  { icon: LineChart, title: 'Kredit Produktif', description: 'Pemisahan portofolio Telihan dan Meranti berdasarkan format PK, siap ekspor.' },
  { icon: UserSquare, title: 'Customer Service', description: 'Logbook Kartu ATM, Buku Tabungan, Bilyet Deposito, CIF, Rekening, dan SI.' },
  { icon: Shield, title: 'Log Security', description: 'Shift, handover, BA Harian, bulk print, dan audit publik satpam.' },
  { icon: FileSearch, title: 'SLIK OJK', description: 'Permohonan per pengguna dengan alur setuju/tolak dan laporan PDF terpisah.' },
  { icon: Bot, title: 'Asisten BIRU', description: 'Asisten internal untuk tanya jawab operasional dan pencarian data debitur.' },
  { icon: Bell, title: 'Pusat Notifikasi', description: 'Notifikasi menyesuaikan hak akses per role dan cabang, lengkap dengan tautan tindakan.' },
  { icon: Archive, title: 'Activity Log & Recycle Bin', description: 'Jejak audit menyeluruh dan pemulihan data yang terhapus.' },
];

const platformPerks = [
  { icon: Users, label: 'Hak Akses per Role', desc: 'Admin, User, KIC, dan Demo dengan persetujuan admin' },
  { icon: Zap, label: 'Global Search (Ctrl+K)', desc: 'Cari modul dan data dalam hitungan detik' },
  { icon: BarChart3, label: 'Dashboard Real-time', desc: 'Statistik diperbarui otomatis tanpa refresh' },
  { icon: Smartphone, label: 'PWA Installable', desc: 'Dapat dipasang di Android, iOS, dan Desktop' },
];

const About: React.FC = () => {
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto py-8 space-y-12">
        {/* Header */}
        <div className="rounded-xl border border-border bg-card p-8 md:p-10">
          <div className="flex flex-col items-center text-center md:flex-row md:items-center md:text-left md:gap-8">
            <div className="mb-6 flex h-24 w-24 shrink-0 items-center justify-center rounded-xl border border-border bg-background p-4 md:mb-0">
              <img src={logoImage} alt="Logo Bluebook Telihan" className="h-full w-full object-contain" />
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
                Aplikasi Internal · Aktif sejak 2026
              </div>
              <h1 className="font-display text-3xl md:text-4xl font-semibold text-foreground">
                Bluebook Telihan
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Digital Logbook System — Bankaltimtara KCP Telihan dan Unit Meranti
              </p>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                Portal terpusat untuk administrasi surat, agenda kredit, simulasi pinjaman, operasional ATM,
                monitoring kredit, layanan Customer Service, log security, dan SLIK OJK — dilengkapi asisten
                internal BIRU, notifikasi sesuai role, serta jejak audit yang menyeluruh.
              </p>
            </div>
          </div>
        </div>

        {/* Modules Grid */}
        <div>
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
              Modul Utama
            </div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Apa saja yang ada di dalamnya
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {modules.map((m, i) => (
              <Card key={i} className="border-border transition-colors hover:border-primary/40">
                <CardContent className="p-5 flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                    <m.icon className="h-5 w-5 text-primary" />
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
          <div className="mb-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-2">
              Platform
            </div>
            <h2 className="font-display text-2xl font-semibold text-foreground">
              Dibangun untuk cepat dan aman
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
        <Card className="text-center border-border">
          <CardContent className="py-8 px-6">
            <p className="text-muted-foreground flex items-center justify-center gap-2 mb-2">
              Dibuat dengan <Flame className="w-4 h-4 text-orange-500 fill-orange-500" /> oleh
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
