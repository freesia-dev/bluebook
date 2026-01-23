import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { 
  DashboardSkeleton, 
  TablePageSkeleton, 
  GenericPageSkeleton 
} from "@/components/ui/page-skeleton";
import { useInactivityLogout } from "@/hooks/use-inactivity-logout";

// Lazy load pages for better performance
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SuratMasuk = lazy(() => import("./pages/SuratMasuk"));
const SuratKeluar = lazy(() => import("./pages/SuratKeluar"));
const SPPKPage = lazy(() => import("./pages/agenda-kredit/SPPKPage"));
const PKPage = lazy(() => import("./pages/agenda-kredit/PKPage"));
const KKMPAKPage = lazy(() => import("./pages/agenda-kredit/KKMPAKPage"));
const AgendaKreditPage = lazy(() => import("./pages/agenda-kredit/AgendaKreditPage"));
const NomorLoanPage = lazy(() => import("./pages/agenda-kredit/NomorLoanPage"));
const UsersPage = lazy(() => import("./pages/konfigurasi/UsersPage"));
const ConfigPage = lazy(() => import("./pages/konfigurasi/ConfigPage"));
const About = lazy(() => import("./pages/About"));
const Panduan = lazy(() => import("./pages/Panduan"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Minimal login loader (no layout needed)
const LoginLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

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
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <InactivityHandler />
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
            <Route path="/dashboard" element={
              <Suspense fallback={<DashboardSkeleton />}><Dashboard /></Suspense>
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
            <Route path="/konfigurasi/users" element={
              <Suspense fallback={<TablePageSkeleton />}><UsersPage /></Suspense>
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
            <Route path="/about" element={
              <Suspense fallback={<GenericPageSkeleton />}><About /></Suspense>
            } />
            <Route path="/panduan" element={
              <Suspense fallback={<GenericPageSkeleton />}><Panduan /></Suspense>
            } />
            <Route path="*" element={
              <Suspense fallback={<GenericPageSkeleton />}><NotFound /></Suspense>
            } />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
