import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import {
  Flame, Instagram, Linkedin,
  Mail, CreditCard, Banknote, Calculator, TrendingUp, Shield,
  FileSearch, Archive, Users, Zap, BarChart3, Smartphone, Sparkles,
  Bot, UserSquare, Bell, LineChart, KeyRound, Search, Printer, CheckCircle2,
} from 'lucide-react';
import logoImage from '@/assets/logo_bluebook.png';
import biruGirl from '@/assets/biru-girl.png.asset.json';
import biruRobot from '@/assets/biru-robot.png.asset.json';
import biruTeam from '@/assets/biru-team.png.asset.json';
import biruThinking from '@/assets/biru-thinking.png.asset.json';

const modules = [
  { icon: Mail, title: 'Manajemen Surat', description: 'Catat surat masuk dan keluar, nomor surat terisi otomatis, lampiran ikut tersimpan.', color: 'from-blue-500 to-cyan-500' },
  { icon: CreditCard, title: 'Agenda Kredit', description: 'Register SPPK, PK, KK/MPAK, dan Nomor Loan untuk Telihan maupun Meranti.', color: 'from-amber-500 to-orange-500' },
  { icon: Calculator, title: 'Simulasi Kredit', description: 'Hitung angsuran konsumtif dan produktif, termasuk Program CERDAS. Hasilnya bisa disimpan, dicetak, atau diunduh sebagai gambar.', color: 'from-violet-500 to-purple-500' },
  { icon: LineChart, title: 'Pipeline Pengajuan', description: 'Papan progress dari hitungan sampai cair. Geser kartunya, riwayat perpindahan tercatat lengkap dengan waktunya.', color: 'from-fuchsia-500 to-pink-500' },
  { icon: Banknote, title: 'Operasional ATM', description: 'Pencatatan pengisian, penyelesaian selisih, dan Berita Acara yang tinggal cetak.', color: 'from-teal-500 to-emerald-500' },
  { icon: TrendingUp, title: 'Loan Monitoring', description: 'Pantau KKR, NPL, hari tunggakan, pembayaran terakhir, fasilitas cair dan lunas — lengkap dengan filter cabang.', color: 'from-rose-500 to-red-500' },
  { icon: UserSquare, title: 'Customer Service', description: 'Logbook Kartu ATM, Buku Tabungan, Bilyet Deposito, CIF, Rekening, dan Standing Instruction.', color: 'from-cyan-500 to-blue-500' },
  { icon: Shield, title: 'Log Security', description: 'Shift satpam, serah terima, Berita Acara Harian, cetak massal, dan halaman audit publik.', color: 'from-slate-600 to-slate-800' },
  { icon: FileSearch, title: 'SLIK OJK', description: 'Permohonan per petugas dengan alur setuju/tolak dan laporan PDF yang rapi.', color: 'from-indigo-500 to-blue-600' },
  { icon: Bot, title: 'Asisten BIRU', description: 'Teman kerja digital yang siap ditanya soal data debitur, agenda, sampai isi modul lain.', color: 'from-violet-500 to-purple-600' },
  { icon: Bell, title: 'Pusat Notifikasi', description: 'Pemberitahuan yang menyesuaikan Role User dan langsung mengarah ke halaman yang perlu ditindaklanjuti.', color: 'from-amber-500 to-orange-500' },
  { icon: Archive, title: 'Activity Log & Recycle Bin', description: 'Semua perubahan tercatat, data yang terlanjur terhapus masih bisa dipulihkan.', color: 'from-amber-500 to-yellow-500' },
];

const platformPerks = [
  { icon: Users, label: 'Hak Akses sesuai Role User', desc: 'Admin, User, Pemimpin, KIC, dan Demo — akun baru disetujui admin' },
  { icon: Zap, label: 'Global Search (Ctrl+K)', desc: 'Cari modul dan data dalam hitungan detik' },
  { icon: BarChart3, label: 'Dashboard Real-time', desc: 'Angka ikut berubah tanpa perlu refresh halaman' },
  { icon: Smartphone, label: 'PWA Installable', desc: 'Bisa dipasang di Android, iOS, dan Desktop' },
];

const howTo = [
  { icon: KeyRound, title: 'Masuk dengan akun kantor', desc: 'Akun dibuat atau disetujui admin dulu. Menu yang muncul menyesuaikan tugas masing-masing.' },
  { icon: Search, title: 'Cari cepat, bukan cari manual', desc: 'Tekan Ctrl+K untuk lompat ke modul atau data. Kalau masih bingung, tanya BIRU di pojok kanan bawah.' },
  { icon: CheckCircle2, title: 'Input sekali, dipakai bersama', desc: 'Nomor dokumen dan penomoran urut dibuat otomatis, jadi tidak ada nomor kembar atau bolong.' },
  { icon: Printer, title: 'Cetak & ekspor tinggal klik', desc: 'Berita Acara, laporan, dan rekap sudah rapi ukuran A4. Ekspor Excel/PDF khusus admin.' },
];

const faqs = [
  { q: 'Datanya disimpan di mana?', a: 'Di database terpusat milik aplikasi, bukan di file Excel yang berpindah-pindah. Setiap perubahan tercatat siapa dan kapan.' },
  { q: 'Kalau salah hapus bagaimana?', a: 'Data masuk ke Recycle Bin dulu, bukan langsung hilang. Admin bisa memulihkannya kembali.' },
  { q: 'Apakah semua orang bisa lihat semua?', a: 'Tidak. Tampilan menu dan tombol menyesuaikan Role User. Ada peran yang memang hanya bisa melihat.' },
  { q: 'Bisa dipakai di HP?', a: 'Bisa. Buka lewat browser lalu pasang seperti aplikasi biasa dari menu Install.' },
];

const About: React.FC = () => {
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto py-8 space-y-12">
        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-primary via-blue-700 to-slate-900 p-8 md:p-12">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-brand-secondary/30 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-brand-primary/40 rounded-full blur-3xl" />

          <div className="relative grid md:grid-cols-[1.2fr_1fr] gap-8 items-center">
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-brand-secondary/40 blur-3xl rounded-full scale-125" />
                <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-white to-blue-50 shadow-2xl ring-4 ring-white/40 flex items-center justify-center">
                  <img src={logoImage} alt="Logo Bluebook Telihan" className="w-20 h-20 object-contain" />
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
              <p className="max-w-xl text-blue-100/90 leading-relaxed">
                <strong className="text-white">Buku catatan digital</strong> untuk keseharian{' '}
                <strong className="text-white">Bankaltimtara KCP Telihan dan Unit Meranti</strong>. Semua yang
                dulu tersebar di banyak file dan buku tulis — surat, agenda kredit, simulasi, ATM, monitoring
                kredit, layanan CS, log security, sampai SLIK — sekarang berkumpul di satu tempat, bisa dicari,
                dan jelas siapa yang mengerjakan.
              </p>
            </div>

            <div className="relative flex items-end justify-center">
              <img
                src={biruGirl.url}
                alt="Maskot petugas Bluebook Telihan"
                className="w-52 md:w-64 drop-shadow-2xl animate-fade-in"
                loading="lazy"
              />
              <img
                src={biruRobot.url}
                alt="BIRU, asisten digital Bluebook"
                className="absolute -bottom-2 -right-2 w-24 md:w-28 drop-shadow-2xl hover-scale"
                loading="lazy"
              />
            </div>
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

        {/* Cara pakai */}
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 md:p-8">
          <img
            src={biruTeam.url}
            alt="Ilustrasi tim Bluebook Telihan"
            className="hidden lg:block absolute right-4 bottom-0 w-64 opacity-90 pointer-events-none"
            loading="lazy"
          />
          <div className="relative lg:max-w-[62%]">
            <span className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
              CARA PAKAI
            </span>
            <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
              Empat Langkah, Selesai
            </h2>
            <div className="space-y-4">
              {howTo.map((s, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{i + 1}. {s.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
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

        {/* FAQ */}
        <div className="grid md:grid-cols-[auto_1fr] gap-6 items-start rounded-3xl border border-border bg-card p-6 md:p-8">
          <img
            src={biruThinking.url}
            alt="BIRU sedang berpikir"
            className="w-24 md:w-32 mx-auto drop-shadow-xl"
            loading="lazy"
          />
          <div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-5">Pertanyaan yang Sering Muncul</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {faqs.map((f, i) => (
                <div key={i} className="rounded-xl bg-muted/50 border border-border p-4">
                  <p className="font-semibold text-sm text-foreground mb-1">{f.q}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                </div>
              ))}
            </div>
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
                aria-label="Instagram"
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.linkedin.com/in/harisf/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
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
