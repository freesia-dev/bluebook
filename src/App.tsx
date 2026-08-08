import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { 
  DashboardSkeleton, 
  TablePageSkeleton, 
  GenericPageSkeleton 
} from "@/components/ui/page-skeleton";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";
import { PWAUpdatePrompt } from "@/components/PWAUpdatePrompt";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SuratMasuk = lazy(() => import("./pages/SuratMasuk"));
const SuratKeluar = lazy(() => import("./pages/SuratKeluar"));
const SPPKPage = lazy(() => import("./pages/agenda-kredit/SPPKPage"));
const PKPage = lazy(() => import("./pages/agenda-kredit/PKPage"));
const KKMPAKPage = lazy(() => import("./pages/agenda-kredit/KKMPAKPage"));
const AgendaKreditPage = lazy(() => import("./pages/agenda-kredit/AgendaKreditPage"));
const NomorLoanPage = lazy(() => import("./pages/agenda-kredit/NomorLoanPage"));
const RecycleBinPage = lazy(() => import("./pages/RecycleBinPage"));
const UsersPage = lazy(() => import("./pages/konfigurasi/UsersPage"));
const OnlineUsersPage = lazy(() => import("./pages/konfigurasi/OnlineUsersPage"));
const ConfigPage = lazy(() => import("./pages/konfigurasi/ConfigPage"));
const About = lazy(() => import("./pages/About"));
const Panduan = lazy(() => import("./pages/Panduan"));
const NotFound = lazy(() => import("./pages/NotFound"));
const UnderConstruction = lazy(() => import("./pages/UnderConstruction"));
const InstallApp = lazy(() => import("./pages/InstallApp"));
const DatabasePengisianATM = lazy(() => import("./pages/atm-telihan/DatabasePengisianATM"));
const BeritaAcaraATM = lazy(() => import("./pages/atm-telihan/BeritaAcaraATM"));
const KonfigurasiATMPage = lazy(() => import("./pages/atm-telihan/KonfigurasiATMPage"));
const PenyelesaianSelisihPage = lazy(() => import("./pages/atm-telihan/PenyelesaianSelisihPage"));
const ActivityLogPage = lazy(() => import("./pages/ActivityLogPage"));
const UploadDataPage = lazy(() => import("./pages/monitoring/UploadDataPage"));
const MonitoringDashboardPage = lazy(() => import("./pages/monitoring/MonitoringDashboardPage"));
const KreditProduktifPage = lazy(() => import("./pages/monitoring/KreditProduktifPage"));
const LaporanBulananPage = lazy(() => import("./pages/monitoring/LaporanBulananPage"));
const ExportPDFPage = lazy(() => import("./pages/monitoring/ExportPDFPage"));
const KontakDebiturPage = lazy(() => import("./pages/monitoring/KontakDebiturPage"));
const ReminderTunggakanPage = lazy(() => import("./pages/monitoring/ReminderTunggakanPage"));
const CallMemoPrintPage = lazy(() => import("./pages/monitoring/CallMemoPrintPage"));
const LogSecurityPage = lazy(() => import("./pages/security/LogSecurityPage"));
const BAHarianPrintPage = lazy(() => import("./pages/security/BAHarianPrintPage"));
const BAHarianBulkPrintPage = lazy(() => import("./pages/security/BAHarianBulkPrintPage"));
const VerifyBAPage = lazy(() => import("./pages/security/VerifyBAPage"));
const KondisiKantorTemplatePage = lazy(() => import("./pages/security/KondisiKantorTemplatePage"));
const AuditLinksAdminPage = lazy(() => import("./pages/security/AuditLinksAdminPage"));
const AuditPublicPage = lazy(() => import("./pages/security/AuditPublicPage"));
const KalkulatorPage = lazy(() => import("./pages/kalkulator/KalkulatorPage"));
const KalkulatorProduktifPage = lazy(() => import("./pages/kalkulator/KalkulatorProduktifPage"));
const RiwayatKalkulatorPage = lazy(() => import("./pages/kalkulator/RiwayatPage"));
const PipelineKreditPage = lazy(() => import("./pages/kalkulator/PipelinePage"));
const ExecutiveDashboardPage = lazy(() => import("./pages/executive/ExecutiveDashboardPage"));

const ProdukKalkulatorPage = lazy(() => import("./pages/konfigurasi/ProdukKalkulatorPage"));
const UsiaPensiunPage = lazy(() => import("./pages/konfigurasi/UsiaPensiunPage"));
const ProgramCerdasPage = lazy(() => import("./pages/konfigurasi/ProgramCerdasPage"));
const KalkulatorPromoPage = lazy(() => import("./pages/konfigurasi/KalkulatorPromoPage"));
const CIFPage = lazy(() => import("./pages/cs/CIFPage"));
const RekeningPage = lazy(() => import("./pages/cs/RekeningPage"));
const SIPage = lazy(() => import("./pages/cs/SIPage"));
const KartuATMPage = lazy(() => import("./pages/cs/KartuATMPage"));
const BukuTabunganPage = lazy(() => import("./pages/cs/BukuTabunganPage"));
const BilyetDepositoPage = lazy(() => import("./pages/cs/BilyetDepositoPage"));





// Minimal login loader (no layout needed)
const LoginLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Pemimpin masuk ke Executive Dashboard, role lain ke dashboard biasa
const DashboardRouter = () => {
  const { userRole } = useAuth();
  if (userRole === 'pemimpin') return <Navigate to="/executive" replace />;
  return <Dashboard />;
};

// Component to handle inactivity logout
const InactivityHandler = () => {
  useInactivityLogout();
  return null;
};

// Configure QueryClient with caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh
      gcTime: 1000 * 60 * 30, // 30 minutes - cache garbage collection
      refetchOnWindowFocus: false, // Don't refetch when window regains focus
      retry: 1, // Only retry once on failure
    },
  },
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <InactivityHandler />
          <PWAUpdatePrompt />
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
            <Route path="/" element={
              <Suspense fallback={<LoginLoader />}><Index /></Suspense>
            } />
            <Route path="/login" element={
              <Suspense fallback={<LoginLoader />}><Login /></Suspense>
            } />
            <Route path="/forgot-password" element={
              <Suspense fallback={<LoginLoader />}><ForgotPassword /></Suspense>
            } />
            <Route path="/reset-password" element={
              <Suspense fallback={<LoginLoader />}><ResetPassword /></Suspense>
            } />
            <Route path="/executive" element={
              <Suspense fallback={<DashboardSkeleton />}><ExecutiveDashboardPage /></Suspense>
            } />
            <Route path="/dashboard" element={
              <Suspense fallback={<DashboardSkeleton />}><DashboardRouter /></Suspense>
            } />
            <Route path="/surat-masuk" element={
              <Suspense fallback={<TablePageSkeleton />}><SuratMasuk /></Suspense>
            } />
            <Route path="/surat-keluar" element={
              <Suspense fallback={<TablePageSkeleton />}><SuratKeluar /></Suspense>
            } />
            <Route path="/agenda-kredit/agenda-kredit" element={
              <Suspense fallback={<TablePageSkeleton />}><AgendaKreditPage /></Suspense>
            } />
            <Route path="/agenda-kredit/sppk-telihan" element={
              <Suspense fallback={<TablePageSkeleton />}><SPPKPage type="telihan" title="SPPK Telihan" /></Suspense>
            } />
            <Route path="/agenda-kredit/sppk-meranti" element={
              <Suspense fallback={<TablePageSkeleton />}><SPPKPage type="meranti" title="SPPK Meranti" /></Suspense>
            } />
            <Route path="/agenda-kredit/pk-telihan" element={
              <Suspense fallback={<TablePageSkeleton />}><PKPage type="telihan" title="PK Telihan" /></Suspense>
            } />
            <Route path="/agenda-kredit/pk-meranti" element={
              <Suspense fallback={<TablePageSkeleton />}><PKPage type="meranti" title="PK Meranti" /></Suspense>
            } />
            <Route path="/agenda-kredit/kk-mpak-telihan" element={
              <Suspense fallback={<TablePageSkeleton />}><KKMPAKPage type="telihan" title="KK & MPAK Telihan" /></Suspense>
            } />
            <Route path="/agenda-kredit/agenda-mpak-meranti" element={
              <Suspense fallback={<TablePageSkeleton />}><KKMPAKPage type="meranti" title="Agenda & MPAK Meranti" /></Suspense>
            } />
            <Route path="/agenda-kredit/nomor-loan" element={
              <Suspense fallback={<TablePageSkeleton />}><NomorLoanPage /></Suspense>
            } />
            <Route path="/recycle-bin" element={
              <Suspense fallback={<TablePageSkeleton />}><RecycleBinPage /></Suspense>
            } />
            <Route path="/activity-log" element={
              <Suspense fallback={<TablePageSkeleton />}><ActivityLogPage /></Suspense>
            } />
            <Route path="/konfigurasi/users" element={
              <Suspense fallback={<TablePageSkeleton />}><UsersPage /></Suspense>
            } />
            <Route path="/konfigurasi/online-users" element={
              <Suspense fallback={<TablePageSkeleton />}><OnlineUsersPage /></Suspense>
            } />
            <Route path="/konfigurasi/jenis-kredit" element={
              <Suspense fallback={<TablePageSkeleton />}><ConfigPage type="jenis-kredit" /></Suspense>
            } />
            <Route path="/konfigurasi/jenis-debitur" element={
              <Suspense fallback={<TablePageSkeleton />}><ConfigPage type="jenis-debitur" /></Suspense>
            } />
            <Route path="/konfigurasi/jenis-penggunaan" element={
              <Suspense fallback={<TablePageSkeleton />}><ConfigPage type="jenis-penggunaan" /></Suspense>
            } />
            <Route path="/konfigurasi/sektor-ekonomi" element={
              <Suspense fallback={<TablePageSkeleton />}><ConfigPage type="sektor-ekonomi" /></Suspense>
            } />
            <Route path="/konfigurasi/kondisi-kantor" element={
              <Suspense fallback={<TablePageSkeleton />}><KondisiKantorTemplatePage /></Suspense>
            } />
            <Route path="/about" element={
              <Suspense fallback={<GenericPageSkeleton />}><About /></Suspense>
            } />
            <Route path="/panduan" element={
              <Suspense fallback={<GenericPageSkeleton />}><Panduan /></Suspense>
            } />
            {/* ATM Telihan Routes */}
            <Route path="/atm-telihan/database-pengisian" element={
              <Suspense fallback={<TablePageSkeleton />}><DatabasePengisianATM /></Suspense>
            } />
            <Route path="/atm-telihan/ba-pengisian" element={
              <Suspense fallback={<GenericPageSkeleton />}><BeritaAcaraATM /></Suspense>
            } />
            <Route path="/atm-telihan/konfigurasi" element={
              <Suspense fallback={<TablePageSkeleton />}><KonfigurasiATMPage /></Suspense>
            } />
            <Route path="/atm-telihan/penyelesaian-selisih" element={
              <Suspense fallback={<TablePageSkeleton />}><PenyelesaianSelisihPage /></Suspense>
            } />
            {/* Monitoring KKR & NPL */}
            <Route path="/monitoring/upload" element={
              <Suspense fallback={<TablePageSkeleton />}><UploadDataPage /></Suspense>
            } />
            <Route path="/monitoring/dashboard" element={
              <Suspense fallback={<DashboardSkeleton />}><MonitoringDashboardPage /></Suspense>
            } />
            <Route path="/monitoring/kredit-produktif" element={
              <Suspense fallback={<TablePageSkeleton />}><KreditProduktifPage /></Suspense>
            } />
            <Route path="/monitoring/laporan-bulanan" element={
              <Navigate to="/monitoring/kredit-produktif?tab=laporan" replace />
            } />

            <Route path="/monitoring/export-pdf" element={
              <Suspense fallback={<GenericPageSkeleton />}><ExportPDFPage /></Suspense>
            } />
            <Route path="/monitoring/kontak" element={
              <Suspense fallback={<TablePageSkeleton />}><KontakDebiturPage /></Suspense>
            } />
            <Route path="/monitoring/reminder" element={
              <Suspense fallback={<TablePageSkeleton />}><ReminderTunggakanPage /></Suspense>
            } />
            <Route path="/monitoring/call-memo/print" element={
              <Suspense fallback={<LoginLoader />}><CallMemoPrintPage /></Suspense>
            } />
            {/* Install PWA */}
            <Route path="/install" element={
              <Suspense fallback={<LoginLoader />}><InstallApp /></Suspense>
            } />
            {/* Log Security */}
            <Route path="/security/log" element={
              <Suspense fallback={<TablePageSkeleton />}><LogSecurityPage /></Suspense>
            } />
            <Route path="/security/log/cetak" element={
              <Suspense fallback={<LoginLoader />}><BAHarianPrintPage /></Suspense>
            } />
            <Route path="/security/log/cetak-bulk" element={
              <Suspense fallback={<LoginLoader />}><BAHarianBulkPrintPage /></Suspense>
            } />
            <Route path="/security/audit-links" element={
              <Suspense fallback={<TablePageSkeleton />}><AuditLinksAdminPage /></Suspense>
            } />
            {/* Public BA verification (QR code target) */}
            <Route path="/verify/ba-security/:token" element={
              <Suspense fallback={<LoginLoader />}><VerifyBAPage /></Suspense>
            } />
            {/* Public audit report (token-based) */}
            <Route path="/audit/security/:token" element={
              <Suspense fallback={<LoginLoader />}><AuditPublicPage /></Suspense>
            } />

            {/* Kalkulator Loan */}
            <Route path="/kalkulator" element={
              <Suspense fallback={<GenericPageSkeleton />}><KalkulatorPage /></Suspense>
            } />
            <Route path="/kalkulator/produktif" element={
              <Suspense fallback={<GenericPageSkeleton />}><KalkulatorProduktifPage /></Suspense>
            } />
            <Route path="/kalkulator/riwayat" element={
              <Suspense fallback={<TablePageSkeleton />}><RiwayatKalkulatorPage /></Suspense>
            } />
            <Route path="/kalkulator/pipeline" element={
              <Suspense fallback={<GenericPageSkeleton />}><PipelineKreditPage /></Suspense>
            } />

            <Route path="/konfigurasi/produk-kalkulator" element={
              <Suspense fallback={<TablePageSkeleton />}><ProdukKalkulatorPage /></Suspense>
            } />
            <Route path="/konfigurasi/usia-pensiun" element={
              <Suspense fallback={<TablePageSkeleton />}><UsiaPensiunPage /></Suspense>
            } />
            <Route path="/konfigurasi/program-cerdas" element={
              <Suspense fallback={<TablePageSkeleton />}><ProgramCerdasPage /></Suspense>
            } />
            <Route path="/konfigurasi/promo-kalkulator" element={
              <Suspense fallback={<TablePageSkeleton />}><KalkulatorPromoPage /></Suspense>
            } />
            {/* Coming soon menus for role-restricted users */}
            <Route path="/ob" element={
              <Suspense fallback={<GenericPageSkeleton />}><UnderConstruction /></Suspense>
            } />
            {/* Customer Service */}
            <Route path="/cs/cif" element={
              <Suspense fallback={<TablePageSkeleton />}><CIFPage /></Suspense>
            } />
            <Route path="/cs/rekening/simpeda" element={
              <Suspense fallback={<TablePageSkeleton />}><RekeningPage produk="simpeda" /></Suspense>
            } />
            <Route path="/cs/rekening/simpeda-ib" element={
              <Suspense fallback={<TablePageSkeleton />}><RekeningPage produk="simpeda_ib" /></Suspense>
            } />
            <Route path="/cs/rekening/prama" element={
              <Suspense fallback={<TablePageSkeleton />}><RekeningPage produk="prama" /></Suspense>
            } />
            <Route path="/cs/rekening/simpel" element={
              <Suspense fallback={<TablePageSkeleton />}><RekeningPage produk="simpel" /></Suspense>
            } />
            <Route path="/cs/rekening/tabunganku" element={
              <Suspense fallback={<TablePageSkeleton />}><RekeningPage produk="tabunganku" /></Suspense>
            } />
            <Route path="/cs/rekening/giro" element={
              <Suspense fallback={<TablePageSkeleton />}><RekeningPage produk="giro" /></Suspense>
            } />
            <Route path="/cs/rekening/alamin" element={
              <Suspense fallback={<TablePageSkeleton />}><RekeningPage produk="alamin" /></Suspense>
            } />
            <Route path="/cs/rekening/taspen" element={
              <Suspense fallback={<TablePageSkeleton />}><RekeningPage produk="taspen" /></Suspense>
            } />
            <Route path="/cs/si" element={
              <Suspense fallback={<TablePageSkeleton />}><SIPage /></Suspense>
            } />
            <Route path="/cs/kartu-atm" element={
              <Suspense fallback={<TablePageSkeleton />}><KartuATMPage /></Suspense>
            } />
            <Route path="/cs/buku-tabungan" element={
              <Suspense fallback={<TablePageSkeleton />}><BukuTabunganPage /></Suspense>
            } />
            <Route path="/cs/bilyet-deposito" element={
              <Suspense fallback={<TablePageSkeleton />}><BilyetDepositoPage /></Suspense>
            } />
            <Route path="*" element={
              <Suspense fallback={<GenericPageSkeleton />}><NotFound /></Suspense>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
