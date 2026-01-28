import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  getPengisianATM, 
  addPengisianATM, 
  updatePengisianATM, 
  deletePengisianATM,
  getATMConfig,
  addATMConfig,
  updateATMConfig,
  deleteATMConfig,
  getKartuTertelan,
  addKartuTertelan,
  deleteKartuTertelan,
  getSelisihATM,
  addSelisihATM,
  deleteSelisihATM
} from '@/lib/atm-store';
import { PengisianATM, ATMConfig, KartuTertelan, SelisihATM } from '@/types';

// ============= ATM CONFIG HOOKS =============
export const useATMConfig = () => {
  return useQuery({
    queryKey: ['atm-config'],
    queryFn: getATMConfig,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

export const useAddATMConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ATMConfig, 'id' | 'createdAt'>) => addATMConfig(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atm-config'] });
    },
  });
};

export const useUpdateATMConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ATMConfig> }) => updateATMConfig(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atm-config'] });
    },
  });
};

export const useDeleteATMConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteATMConfig(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['atm-config'] });
    },
  });
};

// ============= PENGISIAN ATM HOOKS =============
export const usePengisianATM = () => {
  return useQuery({
    queryKey: ['pengisian-atm'],
    queryFn: getPengisianATM,
    staleTime: 1000 * 60 * 5,
  });
};

export const useAddPengisianATM = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<PengisianATM, 'id' | 'nomor' | 'createdAt'>) => addPengisianATM(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengisian-atm'] });
    },
  });
};

export const useUpdatePengisianATM = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<PengisianATM> }) => updatePengisianATM(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengisian-atm'] });
    },
  });
};

export const useDeletePengisianATM = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deletePengisianATM(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pengisian-atm'] });
    },
  });
};

// ============= KARTU TERTELAN HOOKS =============
export const useKartuTertelan = (pengisianAtmId?: string) => {
  return useQuery({
    queryKey: ['kartu-tertelan', pengisianAtmId],
    queryFn: () => getKartuTertelan(pengisianAtmId),
    staleTime: 1000 * 60 * 5,
  });
};

export const useAddKartuTertelan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<KartuTertelan, 'id' | 'createdAt'>) => addKartuTertelan(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kartu-tertelan'] });
    },
  });
};

export const useDeleteKartuTertelan = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteKartuTertelan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kartu-tertelan'] });
    },
  });
};

// ============= SELISIH ATM HOOKS =============
export const useSelisihATM = (pengisianAtmId?: string) => {
  return useQuery({
    queryKey: ['selisih-atm', pengisianAtmId],
    queryFn: () => getSelisihATM(pengisianAtmId),
    staleTime: 1000 * 60 * 5,
  });
};

export const useAddSelisihATM = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<SelisihATM, 'id' | 'createdAt'>) => addSelisihATM(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selisih-atm'] });
    },
  });
};

export const useDeleteSelisihATM = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteSelisihATM(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['selisih-atm'] });
    },
  });
};
