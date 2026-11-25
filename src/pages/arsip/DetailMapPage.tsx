import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { MainLayout } from '@/components/layout/MainLayout';
import { DetailMap } from '@/components/arsip/DetailMap';
import { ArrowLeft } from 'lucide-react';

/** Halaman detail map — isinya sama dengan pop up detail. */
const DetailMapPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  return (
    <MainLayout>
      <button type="button" onClick={() => navigate(-1)} className="text-sm text-muted-foreground flex items-center gap-1 mb-2 hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Kembali
      </button>
      <DetailMap id={id} />
    </MainLayout>
  );
};

export default DetailMapPage;
