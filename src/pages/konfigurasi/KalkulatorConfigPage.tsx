import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProdukKalkulatorSection } from './ProdukKalkulatorPage';
import { DaftarAOSection } from './DaftarAOPage';
import { UsiaPensiunSection } from './UsiaPensiunPage';
import ProgramPromoManager from '@/components/cerdas/ProgramPromoManager';
import SimulasiThemeEditor from '@/components/kalkulator/SimulasiThemeEditor';

/** Satu halaman konfigurasi kalkulator dengan tab: Produk, Daftar AO, Usia Pensiun, Program Promo. */
const KalkulatorConfigPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'produk';

  return (
    <MainLayout>
      <PageHeader
        title="Konfigurasi Kalkulator"
        description="Produk & biaya, aturan DSR, daftar AO, usia pensiun, dan program promo — dalam satu halaman"
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
        </TabsList>

        <TabsContent value="produk"><ProdukKalkulatorSection /></TabsContent>
        <TabsContent value="ao"><DaftarAOSection /></TabsContent>
        <TabsContent value="pensiun"><UsiaPensiunSection /></TabsContent>
        <TabsContent value="promo"><ProgramPromoManager /></TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default KalkulatorConfigPage;
