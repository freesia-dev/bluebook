import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

// Lazy load pages for better performance
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const SuratMasuk = lazy(() => import("./pages/SuratMasuk"));
const SuratKeluar = lazy(() => import("./pages/SuratKeluar"));
const SPPKPage = lazy(() => import("./pages/agenda-kredit/SPPKPage"));
const PKPage = lazy(() => import("./pages/agenda-kredit/PKPage"));
const KKMPAKPage = lazy(() => import("./pages/agenda-kredit/KKMPAKPage"));
const AgendaKreditPage = lazy(() => import("./pages/agenda-kredit/AgendaKreditPage"));
const UsersPage = lazy(() => import("./pages/konfigurasi/UsersPage"));
const ConfigPage = lazy(() => import("./pages/konfigurasi/ConfigPage"));
const About = lazy(() => import("./pages/About"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-muted-foreground text-sm">Memuat halaman...</p>
    </div>
  </div>
);

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
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/surat-masuk" element={<SuratMasuk />} />
              <Route path="/surat-keluar" element={<SuratKeluar />} />
              <Route path="/agenda-kredit/agenda-kredit" element={<AgendaKreditPage />} />
              <Route path="/agenda-kredit/sppk-telihan" element={<SPPKPage type="telihan" title="SPPK Telihan" />} />
              <Route path="/agenda-kredit/sppk-meranti" element={<SPPKPage type="meranti" title="SPPK Meranti" />} />
              <Route path="/agenda-kredit/pk-telihan" element={<PKPage type="telihan" title="PK Telihan" />} />
              <Route path="/agenda-kredit/pk-meranti" element={<PKPage type="meranti" title="PK Meranti" />} />
              <Route path="/agenda-kredit/kk-mpak-telihan" element={<KKMPAKPage type="telihan" title="KK & MPAK Telihan" />} />
              <Route path="/agenda-kredit/agenda-mpak-meranti" element={<KKMPAKPage type="meranti" title="Agenda & MPAK Meranti" />} />
              <Route path="/konfigurasi/users" element={<UsersPage />} />
              <Route path="/konfigurasi/jenis-kredit" element={<ConfigPage type="jenis-kredit" />} />
              <Route path="/konfigurasi/jenis-debitur" element={<ConfigPage type="jenis-debitur" />} />
              <Route path="/konfigurasi/kode-fasilitas" element={<ConfigPage type="kode-fasilitas" />} />
              <Route path="/konfigurasi/sektor-ekonomi" element={<ConfigPage type="sektor-ekonomi" />} />
              <Route path="/about" element={<About />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
