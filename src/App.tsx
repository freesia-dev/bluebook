import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import SuratMasuk from "./pages/SuratMasuk";
import SuratKeluar from "./pages/SuratKeluar";
import SPPKPage from "./pages/agenda-kredit/SPPKPage";
import PKPage from "./pages/agenda-kredit/PKPage";
import KKMPAKPage from "./pages/agenda-kredit/KKMPAKPage";
import AgendaKreditPage from "./pages/agenda-kredit/AgendaKreditPage";
import UsersPage from "./pages/konfigurasi/UsersPage";
import ConfigPage from "./pages/konfigurasi/ConfigPage";
import About from "./pages/About";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
