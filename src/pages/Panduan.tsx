import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Printer, 
  ArrowLeft, 
  Mail, 
  FileText, 
  CreditCard, 
  Users, 
  Settings, 
  LayoutDashboard,
  LogIn,
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Eye,
  CheckCircle2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo_bluebook.png";

const Panduan = () => {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - hidden on print */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 print:hidden">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali
          </Button>
          <Button 
            onClick={handlePrint}
            className="gap-2 bg-brand-primary hover:bg-brand-primary/90"
          >
            <Printer className="w-4 h-4" />
            Cetak / Simpan PDF
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl print:max-w-none print:px-8">
        {/* Cover Section */}
        <div className="text-center mb-12 print:mb-8 print:page-break-after">
          <div className="flex justify-center mb-6">
            <img src={logo} alt="Bluebook Logo" className="w-24 h-24 print:w-20 print:h-20" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4 print:text-3xl">
            Petunjuk Teknis Penggunaan
          </h1>
          <h2 className="text-2xl font-semibold text-brand-primary mb-2 print:text-xl">
            BLUEBOOK TELIHAN
          </h2>
          <p className="text-lg text-slate-600 mb-6">
            Sistem Administrasi Digital Internal
          </p>
          <div className="inline-block px-4 py-2 bg-slate-100 rounded-lg">
            <p className="text-sm text-slate-600">
              Bankaltimtara KCP Telihan | Versi 1.0 | {new Date().getFullYear()}
            </p>
          </div>
        </div>

        <Separator className="my-8 print:my-6" />

        {/* Table of Contents */}
        <section className="mb-12 print:mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 print:text-xl">
            Daftar Isi
          </h2>
          <Card>
            <CardContent className="p-6">
              <ol className="space-y-2 text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="font-semibold text-brand-primary">1.</span>
                  Pendahuluan
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-semibold text-brand-primary">2.</span>
                  Cara Login ke Sistem
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-semibold text-brand-primary">3.</span>
                  Dashboard
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-semibold text-brand-primary">4.</span>
                  Manajemen Surat Masuk
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-semibold text-brand-primary">5.</span>
                  Manajemen Surat Keluar
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-semibold text-brand-primary">6.</span>
                  Agenda Kredit
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-semibold text-brand-primary">7.</span>
                  Konfigurasi (Khusus Admin)
                </li>
                <li className="flex items-center gap-2">
                  <span className="font-semibold text-brand-primary">8.</span>
                  Tips dan Bantuan
                </li>
              </ol>
            </CardContent>
          </Card>
        </section>

        {/* Section 1: Pendahuluan */}
        <section className="mb-12 print:mb-8 print:page-break-before">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 print:text-xl">
            <span className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm">1</span>
            Pendahuluan
          </h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              <p className="text-slate-700 leading-relaxed">
                <strong>Bluebook Telihan</strong> adalah sistem administrasi digital internal yang dikembangkan 
                khusus untuk Bankaltimtara KCP Telihan. Sistem ini dirancang untuk membantu pengelolaan 
                surat-menyurat dan agenda kredit secara lebih efisien dan terintegrasi.
              </p>
              <div className="bg-blue-50 border-l-4 border-brand-primary p-4 rounded-r">
                <h4 className="font-semibold text-slate-900 mb-2">Fitur Utama:</h4>
                <ul className="space-y-1 text-slate-700">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    Manajemen Surat Masuk dan Surat Keluar
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    Agenda Kredit (SPPK, PK, KK/MPAK, Nomor Loan)
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    Dashboard statistik real-time
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    Export data ke Excel
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                    Sistem role-based (Admin, User, Demo)
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 2: Cara Login */}
        <section className="mb-12 print:mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 print:text-xl">
            <span className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm">2</span>
            Cara Login ke Sistem
          </h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
                  <LogIn className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-900 mb-2">Langkah-langkah Login:</h4>
                  <ol className="space-y-3 text-slate-700">
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-brand-primary shrink-0">1.</span>
                      Buka website Bluebook Telihan di browser Anda
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-brand-primary shrink-0">2.</span>
                      Klik tombol <strong>"Masuk Sekarang"</strong> atau akses halaman login
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-brand-primary shrink-0">3.</span>
                      Masukkan <strong>email</strong> dan <strong>password</strong> yang telah diberikan oleh Admin
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-bold text-brand-primary shrink-0">4.</span>
                      Klik tombol <strong>"Masuk"</strong> untuk mengakses sistem
                    </li>
                  </ol>
                </div>
              </div>
              <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r">
                <p className="text-sm text-amber-800">
                  <strong>Catatan:</strong> Jika Anda belum memiliki akun, hubungi Admin untuk dibuatkan akun. 
                  Jika lupa password, hubungi Admin untuk reset password.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 3: Dashboard */}
        <section className="mb-12 print:mb-8 print:page-break-before">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 print:text-xl">
            <span className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm">3</span>
            Dashboard
          </h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-brand-primary/10 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-5 h-5 text-brand-primary" />
                </div>
                <div>
                  <p className="text-slate-700 mb-4">
                    Dashboard menampilkan ringkasan statistik dari seluruh data di sistem Bluebook.
                  </p>
                  <h4 className="font-semibold text-slate-900 mb-2">Informasi yang ditampilkan:</h4>
                  <ul className="space-y-2 text-slate-700">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      Jumlah total surat masuk dan surat keluar
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      Jumlah SPPK, PK, KK/MPAK yang tercatat
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      Total plafon kredit yang dikelola
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                      Data terbaru yang diinput ke sistem
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 4: Surat Masuk */}
        <section className="mb-12 print:mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 print:text-xl">
            <span className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm">4</span>
            Manajemen Surat Masuk
          </h2>
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-slate-700">
                  Menu Surat Masuk digunakan untuk mencatat dan mengelola semua surat yang masuk ke KCP Telihan.
                </p>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Plus className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Menambah Surat Masuk Baru</h4>
                    <ol className="mt-2 space-y-1 text-sm text-slate-600">
                      <li>1. Klik tombol <strong>"+ Tambah"</strong> di pojok kanan atas</li>
                      <li>2. Isi form dengan data surat (nomor surat, pengirim, perihal, dll)</li>
                      <li>3. Upload file surat jika ada (opsional)</li>
                      <li>4. Klik <strong>"Simpan"</strong></li>
                    </ol>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Search className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Mencari Surat</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Gunakan kolom pencarian untuk mencari surat berdasarkan nomor surat, pengirim, atau perihal.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Edit className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Mengedit Surat</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Klik ikon edit (pensil) pada baris surat yang ingin diubah, lalu update data dan simpan.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Menghapus Surat</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Klik ikon hapus (tempat sampah) pada baris surat, lalu konfirmasi penghapusan.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Download className="w-5 h-5 text-purple-600 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Export ke Excel</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Klik tombol <strong>"Export"</strong> untuk mengunduh data surat dalam format Excel.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 5: Surat Keluar */}
        <section className="mb-12 print:mb-8 print:page-break-before">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 print:text-xl">
            <span className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm">5</span>
            Manajemen Surat Keluar
          </h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-slate-700 mb-2">
                    Menu Surat Keluar digunakan untuk mencatat semua surat yang dikirim keluar dari KCP Telihan.
                  </p>
                  <p className="text-sm text-slate-600">
                    Cara penggunaan sama dengan Surat Masuk. Perbedaannya hanya pada field yang diisi 
                    (tujuan surat, nama penerima, dll).
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 6: Agenda Kredit */}
        <section className="mb-12 print:mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 print:text-xl">
            <span className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm">6</span>
            Agenda Kredit
          </h2>
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-amber-600" />
                </div>
                <p className="text-slate-700">
                  Menu Agenda Kredit digunakan untuk mengelola seluruh proses kredit, mulai dari SPPK hingga Nomor Loan.
                </p>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">📋 SPPK</h4>
                  <p className="text-sm text-slate-600">
                    Surat Persetujuan Pemberian Kredit. Mencatat persetujuan kredit awal sebelum proses lebih lanjut.
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">📝 PK</h4>
                  <p className="text-sm text-slate-600">
                    Perjanjian Kredit. Mencatat perjanjian kredit yang telah ditandatangani.
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">📊 KK & MPAK</h4>
                  <p className="text-sm text-slate-600">
                    Keputusan Kredit dan Memorandum Persetujuan Akad Kredit. Dokumentasi keputusan dan persetujuan kredit.
                  </p>
                </div>
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">🔢 Nomor Loan</h4>
                  <p className="text-sm text-slate-600">
                    Nomor rekening pinjaman yang diberikan setelah kredit dicairkan.
                  </p>
                </div>
              </div>

              <div className="bg-blue-50 border-l-4 border-brand-primary p-4 rounded-r">
                <p className="text-sm text-slate-700">
                  <strong>Catatan:</strong> Setiap jenis agenda kredit tersedia dalam dua kategori: 
                  <strong> Telihan</strong> dan <strong>Meranti</strong> sesuai unit kerja masing-masing.
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 7: Konfigurasi */}
        <section className="mb-12 print:mb-8 print:page-break-before">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 print:text-xl">
            <span className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm">7</span>
            Konfigurasi (Khusus Admin)
          </h2>
          <Card>
            <CardContent className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-slate-700 mb-2">
                    Menu Konfigurasi hanya dapat diakses oleh pengguna dengan role <strong>Admin</strong>.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-brand-primary mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Manajemen User</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Menambah user baru, mengubah role user, dan reset password user.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Settings className="w-5 h-5 text-brand-primary mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-semibold text-slate-900">Master Data</h4>
                    <p className="mt-1 text-sm text-slate-600">
                      Mengelola data referensi seperti Jenis Kredit, Jenis Debitur, Jenis Penggunaan, dan Sektor Ekonomi.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 8: Tips */}
        <section className="mb-12 print:mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-3 print:text-xl">
            <span className="w-8 h-8 rounded-full bg-brand-primary text-white flex items-center justify-center text-sm">8</span>
            Tips dan Bantuan
          </h2>
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r">
                <h4 className="font-semibold text-green-800 mb-2">💡 Tips Penggunaan</h4>
                <ul className="space-y-2 text-sm text-green-700">
                  <li>• Gunakan fitur pencarian untuk menemukan data dengan cepat</li>
                  <li>• Export data ke Excel untuk membuat laporan atau backup</li>
                  <li>• Sistem akan logout otomatis setelah 15 menit tidak aktif</li>
                  <li>• Gunakan browser modern (Chrome, Firefox, Edge) untuk pengalaman terbaik</li>
                </ul>
              </div>

              <div className="bg-blue-50 border-l-4 border-brand-primary p-4 rounded-r">
                <h4 className="font-semibold text-blue-800 mb-2">📞 Butuh Bantuan?</h4>
                <p className="text-sm text-blue-700">
                  Hubungi Admin KCP Telihan atau kirim email ke <strong>kcptlh.143@gmail.com</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-slate-500 py-8 border-t border-slate-200">
          <p className="mb-2">
            <strong>Bluebook Telihan</strong> — Sistem Administrasi Digital Internal
          </p>
          <p>
            Bankaltimtara KCP Telihan © {new Date().getFullYear()}
          </p>
          <p className="mt-4 text-xs">
            Dokumen ini dapat dicetak atau disimpan sebagai PDF melalui menu Print browser (Ctrl+P / Cmd+P)
          </p>
        </footer>
      </main>

      {/* Print Styles */}
      <style>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:page-break-before {
            page-break-before: always;
          }
          .print\\:page-break-after {
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
};

export default Panduan;
