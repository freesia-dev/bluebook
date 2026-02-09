import React, { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams } from 'react-router-dom';
import BAPengisianContent from '@/components/atm/BAPengisianContent';
import BAPenyelesaianContent from '@/components/atm/BAPenyelesaianContent';

const BeritaAcaraATM = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'pengisian';
  const penyelesaianId = searchParams.get('id') || '';

  return (
    <MainLayout>
      <div className="space-y-6">
        <PageHeader
          title="Berita Acara ATM"
          description="Generate dan cetak Berita Acara ATM"
        />

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="pengisian">BA Pengisian</TabsTrigger>
            <TabsTrigger value="penyelesaian">BA Penyelesaian Selisih</TabsTrigger>
          </TabsList>

          <TabsContent value="pengisian" className="space-y-6">
            <BAPengisianContent />
          </TabsContent>

          <TabsContent value="penyelesaian" className="space-y-6">
            <BAPenyelesaianContent initialId={penyelesaianId} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default BeritaAcaraATM;
