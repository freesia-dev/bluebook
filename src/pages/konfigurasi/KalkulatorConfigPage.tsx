import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { ProdukKalkulatorSection } from './ProdukKalkulatorPage';
import { DaftarAOSection } from './DaftarAOPage';
import { UsiaPensiunSection } from './UsiaPensiunPage';
import ProgramPromoManager from '@/components/cerdas/ProgramPromoManager';
import SimulasiThemeEditor from '@/components/kalkulator/SimulasiThemeEditor';

/** Konfigurasi kalkulator. Admin: semua tab. Non-admin: hanya tampilan kartu JPG (preferensi pribadi). */
const KalkulatorConfigPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const { isAdmin } = useAuth();
  const tab = isAdmin ? params.get('tab') || 'produk' : 'tampilan';

  if (!isAdmin) {
    return (
      <MainLayout>
        <PageHeader
          title="Tampilan Kartu JPG"
          description="Atur susunan, font, dan warna kartu simulasi sesuai preferensi Anda sendiri"
        />
        <SimulasiThemeEditor />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <PageHeader
        title="Konfigurasi Kalkulator"
        description="Produk & biaya, aturan DSR, daftar AO, usia pensiun, program promo, dan tampilan kartu JPG — dalam satu halaman"
      />
      <Tabs
        value={tab}
        onValueChange={(v) => setParams({ tab: v }, { replace: true })}
        className="space-y-4"
      >
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="produk">Produk & Biaya</TabsTrigger>
          <TabsTrigger value="ao">Daftar AO</TabsTrigger>
          <TabsTrigger value="pensiun">Usia Pensiun</TabsTrigger>
          <TabsTrigger value="promo">Program Promo</TabsTrigger>
          <TabsTrigger value="tampilan">Tampilan JPG</TabsTrigger>
        </TabsList>

        <TabsContent value="produk"><ProdukKalkulatorSection /></TabsContent>
        <TabsContent value="ao"><DaftarAOSection /></TabsContent>
        <TabsContent value="pensiun"><UsiaPensiunSection /></TabsContent>
        <TabsContent value="promo"><ProgramPromoManager /></TabsContent>
        <TabsContent value="tampilan"><SimulasiThemeEditor /></TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default KalkulatorConfigPage;
