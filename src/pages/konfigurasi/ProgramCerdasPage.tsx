import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import ProgramCerdasManager from '@/components/cerdas/ProgramCerdasManager';

const ProgramCerdasPage: React.FC = () => (
  <MainLayout>
    <PageHeader
      title="Program CERDAS"
      description="Konfigurasi promo Cicilan Extra Ringan dan Diskon Asuransi"
    />
    <ProgramCerdasManager />
  </MainLayout>
);

export default ProgramCerdasPage;
