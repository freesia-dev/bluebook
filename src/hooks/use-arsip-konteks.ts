import { useMemo } from 'react';
import {
  useArsipMaster, useBerkasArsip, useDebiturArsip, usePinjamArsip, samakanNama,
  type BerkasArsip, type DebiturArsip, type PinjamArsip, type RekeningMaster,
} from '@/hooks/use-arsip';
import { statusFisik, statusKredit, type Konteks, type StatusFisik, type StatusKredit } from '@/lib/arsip';

const KOSONG_R: RekeningMaster[] = [];
const KOSONG_B: BerkasArsip[] = [];
const KOSONG_P: PinjamArsip[] = [];
const KOSONG_D: DebiturArsip[] = [];

export interface MapLengkap extends BerkasArsip {
  kredit: StatusKredit;
  fisik: StatusFisik;
  rekening: RekeningMaster | null;
  pinjam: PinjamArsip | null;
}

/**
 * Semua data arsip dalam satu tempat: map + status terkini dari MLF + siapa
 * yang sedang memegangnya. Setiap halaman Arsip memakai hook ini supaya
 * angkanya selalu sama di mana pun dilihat.
 */
export const useArsipKonteks = () => {
  const qMaster = useArsipMaster();
  const qBerkas = useBerkasArsip();
  const qPinjam = usePinjamArsip();
  const qDebitur = useDebiturArsip();

  const master = qMaster.data ?? KOSONG_R;
  const berkas = qBerkas.data ?? KOSONG_B;
  const pinjam = qPinjam.data ?? KOSONG_P;
  const debitur = qDebitur.data ?? KOSONG_D;

  const hasil = useMemo(() => {
    const masterPerRek = new Map(master.map((r) => [r.no_rekening, r]));
    const pinjamTerbuka = new Map<string, PinjamArsip>();
    pinjam.forEach((p) => { if (!p.kembali_at) pinjamTerbuka.set(p.berkas_id, p); });
    // Top up: rekening lunas yang punya akad lebih baru dan masih aktif atas nama sama.
    const aktifTerbaru = new Map<string, string>();
    master.forEach((r) => {
      if (r.status !== 'aktif') return;
      const kn = samakanNama(r.nama_debitur);
      if ((r.tanggal_akad || '') > (aktifTerbaru.get(kn) || '')) aktifTerbaru.set(kn, r.tanggal_akad || '');
    });
    const rekTopUp = new Set<string>();
    master.forEach((r) => {
      if (r.status !== 'lunas') return;
      const t = aktifTerbaru.get(samakanNama(r.nama_debitur));
      if (t && t > (r.tanggal_akad || '')) rekTopUp.add(r.no_rekening);
    });
    const k: Konteks = { masterPerRek, pinjamTerbuka, rekTopUp };

    const maps: MapLengkap[] = berkas.map((b) => ({
      ...b,
      kredit: statusKredit(b, k),
      fisik: statusFisik(b, k),
      rekening: b.no_rekening ? masterPerRek.get(b.no_rekening) ?? null : null,
      pinjam: pinjamTerbuka.get(b.id) ?? null,
    }));
    const perId = new Map(maps.map((m) => [m.id, m]));
    const perKode = new Map(maps.map((m) => [m.kode_map, m]));
    const perLaci = new Map<string, MapLengkap[]>();
    maps.forEach((m) => {
      const l = perLaci.get(m.kode_laci) ?? [];
      l.push(m);
      perLaci.set(m.kode_laci, l);
    });
    perLaci.forEach((l) => l.sort((a, b) => a.nomor_urut - b.nomor_urut));
    const rekDiMap = new Set(maps.map((m) => m.no_rekening).filter(Boolean) as string[]);
    return { konteks: k, maps, perId, perKode, perLaci, rekDiMap, masterPerRek };
  }, [master, berkas, pinjam]);

  return {
    ...hasil,
    master,
    berkas,
    pinjam,
    debitur,
    memuat: qMaster.isLoading || qBerkas.isLoading || qPinjam.isLoading,
    galat: qMaster.error || qBerkas.error || qPinjam.error,
  };
};

export type ArsipKonteks = ReturnType<typeof useArsipKonteks>;
