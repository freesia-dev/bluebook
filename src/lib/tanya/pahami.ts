// Tanya Bluebook — penerjemah pertanyaan berbasis pola (tanpa AI).
//
// Pertanyaan yang umum dikenali langsung di sini: cepat, gratis, dan tidak
// keluar dari HP. Yang tidak cocok pola mana pun baru dikirim ke Workers AI.

import { iso, namaBulan, periodeBulan, type Perintah, type Periode, type PilihRekening, type Skenario, type UnitTanya } from './perintah';

// ------------------------------------------------------------------ angka
const KATA_ANGKA: Record<string, number> = {
  satu: 1, se: 1, dua: 2, tiga: 3, empat: 4, lima: 5, enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
  sebelas: 11, 'dua belas': 12,
};

const bacaBilangan = (s: string): number | null => {
  const t = s.trim();
  if (/^\d+$/.test(t)) return Number(t);
  return KATA_ANGKA[t] ?? null;
};

/** "500 jt", "Rp 1,5 M", "1.500.000", "150juta" → rupiah. */
export function bacaNominal(s: string): number | null {
  const m = s.match(/(?:rp\.?\s*)?(\d+(?:[.,]\d+)*)\s*(miliar|milyar|m\b|juta|jt\b|ribu|rb\b|k\b)?/i);
  if (!m) return null;
  let angka = m[1];
  const satuan = (m[2] || '').toLowerCase();
  if (/^\d{1,3}(\.\d{3})+$/.test(angka)) angka = angka.replace(/\./g, '');
  else angka = angka.replace(/\./g, '').replace(',', '.');
  const n = Number(angka);
  if (!Number.isFinite(n)) return null;
  const kali = satuan.startsWith('mil') || satuan === 'm' ? 1e9 : satuan === 'juta' || satuan === 'jt' ? 1e6 : satuan === 'ribu' || satuan === 'rb' || satuan === 'k' ? 1e3 : 1;
  return Math.round(n * kali);
}

// ------------------------------------------------------------------ unit
export function bacaUnit(t: string, bawaan: UnitTanya = 'semua'): UnitTanya {
  t = t.replace(/\b\d{2,4}\/\d{3}\/[\w/.-]+/gi, ' '); // nomor PK "…/BPD-TLH/…" bukan penanda unit
  if (/\bsemua unit\b|\bseluruh\b/.test(t)) return 'semua';
  if (/\bmeranti\b|\bulm\b/.test(t)) return 'meranti';
  if (/\btelihan\b|\btlh\b/.test(t)) return 'telihan';
  return bawaan;
}

// ------------------------------------------------------------------ periode
const POLA_BULAN: [RegExp, number][] = [
  [/\bjan(uari)?\b/, 0], [/\bfeb(ruari)?\b/, 1], [/\bmar(et)?\b/, 2], [/\bapr(il)?\b/, 3], [/\bmei\b/, 4],
  [/\bjuni?\b/, 5], [/\bjuli?\b|\bjul\b/, 6], [/\bagu(s|st|stus)?\b|\bags\b/, 7], [/\bsep(t|tember)?\b/, 8],
  [/\bokt(ober)?\b|\boct\b/, 9], [/\bnov(ember)?\b/, 10], [/\bdes(ember)?\b|\bdec\b/, 11],
];

/**
 * Baca rentang waktu dari kalimat. `arah` menentukan tahun untuk nama bulan
 * tanpa tahun: "jatuh tempo Maret" berarti Maret mendatang, "lunas Maret"
 * berarti Maret yang sudah lewat.
 */
export function bacaPeriode(t: string, arah: 'depan' | 'lalu', hariIni = new Date()): Periode | null {
  const y = hariIni.getFullYear();
  const m = hariIni.getMonth();
  if (/\bhari ini\b/.test(t)) return { dari: iso(hariIni), sampai: iso(hariIni), label: 'hari ini' };
  if (/\bbesok\b/.test(t)) {
    const b = new Date(y, m, hariIni.getDate() + 1);
    return { dari: iso(b), sampai: iso(b), label: 'besok' };
  }
  const minggu = t.match(/\bminggu (ini|depan|lalu|kemarin)\b/);
  if (minggu) {
    const geser = minggu[1] === 'depan' ? 7 : minggu[1] === 'ini' ? 0 : -7;
    const senin = new Date(y, m, hariIni.getDate() - ((hariIni.getDay() + 6) % 7) + geser);
    const minggu7 = new Date(senin.getFullYear(), senin.getMonth(), senin.getDate() + 6);
    return { dari: iso(senin), sampai: iso(minggu7), label: `minggu ${minggu[1]}` };
  }
  const nBulan = t.match(/\b(\d+|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|dua belas)\s*bulan\s*(ke ?depan|mendatang|terakhir|lalu|belakangan|kebelakang|ke belakang)\b/);
  if (nBulan) {
    const n = Math.min(24, bacaBilangan(nBulan[1]) ?? 3);
    if (/depan|mendatang/.test(nBulan[2])) {
      return { dari: iso(hariIni), sampai: iso(new Date(y, m + n, hariIni.getDate())), label: `${n} bulan ke depan` };
    }
    return { dari: iso(new Date(y, m - n, hariIni.getDate())), sampai: iso(hariIni), label: `${n} bulan terakhir` };
  }
  if (/\bbulan ini\b/.test(t)) return periodeBulan(y, m);
  if (/\bbulan depan\b/.test(t)) {
    const d = new Date(y, m + 1, 1);
    return periodeBulan(d.getFullYear(), d.getMonth());
  }
  if (/\bbulan (lalu|kemarin|kemaren)\b/.test(t)) {
    const d = new Date(y, m - 1, 1);
    return periodeBulan(d.getFullYear(), d.getMonth());
  }
  const tahunEksplisit = t.match(/\b(20\d{2})\b/);
  for (const [pola, b] of POLA_BULAN) {
    if (pola.test(t)) {
      let tahun = tahunEksplisit ? Number(tahunEksplisit[1]) : y;
      if (!tahunEksplisit) {
        if (arah === 'depan' && b < m) tahun = y + 1;
        if (arah === 'lalu' && b > m) tahun = y - 1;
      }
      return periodeBulan(tahun, b);
    }
  }
  if (/\btahun (ini|depan)\b/.test(t) || tahunEksplisit) {
    const tahun = tahunEksplisit ? Number(tahunEksplisit[1]) : /depan/.test(t) ? y + 1 : y;
    return { dari: `${tahun}-01-01`, sampai: `${tahun}-12-31`, label: `tahun ${tahun}` };
  }
  return null;
}

// ------------------------------------------------------------------ nama
const PEMOTONG_NAMA =
  /\s+(?:jadi|menjadi|turun|naik|masuk|ke kol|kol|lunas|melunasi|dilunasi|bayar|membayar|berapa|gimana|bagaimana|dong|donk|ya|yah|sekarang|skrg|di laci|ada di|dimana|di mana|letak|posisi|apa|dan|terus|lalu|tolong|please|pls)\b.*$/;

/** Rapikan potongan kalimat menjadi nama debitur. */
export function rapikanNama(s: string): string {
  const kutip = s.match(/["“”']([^"“”']{2,60})["“”']/);
  if (kutip) return kutip[1].trim();
  return s
    .replace(PEMOTONG_NAMA, '')
    .replace(/^(?:debitur|nasabah|atas nama|a\.?\s?n\.?|an|nama|si|pak|bapak|bu|ibu|sdr\.?|saudara|tentang|kalau|kalo|jika|bila|misal(?:nya)?|andai(?:kan)?|seandainya)\s+/g, '')
    .replace(/^(?:debitur|nasabah|atas nama|a\.?\s?n\.?|an|nama|si|pak|bapak|bu|ibu)\s+/g, '')
    .replace(/[?!.,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ------------------------------------------------------------------ rekening
const BULAN_PENDEK: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, jun: 5, jul: 6, agu: 7, ags: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11,
};
const KATA_PENGANTAR = '(?:(?:yang|yg)\\s+)?(?:(?:akad|akan|cair|pencairan|realisasi|kredit|rekening|rek|pk|fasilitas|pinjaman)\\s+)?(?:(?:tanggal|tgl|tahun|thn|th)\\s+)?';

/**
 * Ambil penanda rekening dari potongan kalimat, mis. "akad 26 Sep 2023",
 * "yang tahun 2023", "plafon 520 jt", atau nomor PK. Kembalikan sisa
 * kalimat (tanpa penanda) supaya nama debitur tetap bersih.
 */
export function ambilRekening(k: string): { sisa: string; rek?: PilihRekening } {
  let sisa = k;
  const rek: PilihRekening = {};
  const buang = (re: RegExp) => {
    sisa = sisa.replace(re, ' ');
  };
  // nomor PK "068/886/89/9990/BPD-TLH/2023" atau nomor rekening 8 digit lebih
  const pk = sisa.match(/\b\d{2,4}\/\d{3}\/[\w/.-]+/i);
  if (pk) {
    rek.nomor = pk[0];
    buang(new RegExp(KATA_PENGANTAR + pk[0].replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'), 'i'));
  } else {
    const no = sisa.match(/\b(?:rekening|rek|no\.?|nomor)\s*(\d{6,})\b/i);
    if (no) {
      rek.nomor = no[1];
      buang(new RegExp(no[0], 'i'));
    }
  }
  // tanggal "26 sep 2023" / "26 september 2023" / "26-09-2023" / "2023-09-26"
  const tglNama = sisa.match(new RegExp(KATA_PENGANTAR + '(\\d{1,2})\\s+([a-z]{3})[a-z]*\\.?\\s+(20\\d{2})\\b', 'i'));
  const tglAngka = sisa.match(new RegExp(KATA_PENGANTAR + '(\\d{1,2})[-/.](\\d{1,2})[-/.](20\\d{2})\\b', 'i'));
  const tglIso = sisa.match(new RegExp(KATA_PENGANTAR + '(20\\d{2})-(\\d{2})-(\\d{2})\\b', 'i'));
  if (tglNama && BULAN_PENDEK[tglNama[2].toLowerCase()] !== undefined) {
    rek.akad = iso(new Date(Number(tglNama[3]), BULAN_PENDEK[tglNama[2].toLowerCase()], Number(tglNama[1])));
    buang(new RegExp(tglNama[0], 'i'));
  } else if (tglAngka) {
    rek.akad = iso(new Date(Number(tglAngka[3]), Number(tglAngka[2]) - 1, Number(tglAngka[1])));
    buang(new RegExp(tglAngka[0].replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'), 'i'));
  } else if (tglIso) {
    rek.akad = `${tglIso[1]}-${tglIso[2]}-${tglIso[3]}`;
    buang(new RegExp(tglIso[0], 'i'));
  } else {
    // hanya tahun: "yang 2023", "akad tahun 2023"
    const th = sisa.match(/(?:(?:yang|yg)\s+)?(?:(?:akad|akan|cair|kredit|rekening|pinjaman)\s+)?(?:(?:tahun|thn|th)\s+)?\b(20\d{2})\b/i);
    if (th && /(?:akad|akan|cair|kredit|rekening|pinjaman|tahun|thn|th|yang|yg)\s+(?:tahun\s+|thn\s+|th\s+)?20\d{2}/i.test(th[0])) {
      rek.tahun = Number(th[1]);
      buang(new RegExp(th[0], 'i'));
    }
  }
  const pl = sisa.match(/(?:(?:yang|yg)\s+)?(?:plafon|plafond|limit)\s+((?:rp\.?\s*)?\d+(?:[.,]\d+)*\s*(?:miliar|milyar|m\b|juta|jt\b|ribu|rb\b)?)/i);
  if (pl) {
    const v = bacaNominal(pl[1]);
    if (v) rek.plafon = v;
    buang(new RegExp(pl[0].replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'), 'i'));
  }
  // "semua rekening", "kedua loannya", "keduanya"
  const semua = sisa.match(/\b(?:(?:semua|seluruh|kedua|dua)\s+(?:rekening|rek|loan|pinjaman|kredit|fasilitas|pk)(?:nya)?|keduanya|semuanya)\b/i);
  if (semua) {
    rek.semua = true;
    buang(new RegExp(semua[0], 'i'));
  }
  // "yang lama/pertama" atau "yang baru/kedua/terakhir"
  const urut = sisa.match(/\b(?:yang|yg)\s+(?:(?:rekening|rek|loan|pinjaman|kredit|pk)\s+)?(lama|pertama|terlama|duluan|lebih lama|baru|terbaru|kedua|terakhir|lebih baru)\b/i);
  if (urut) {
    rek.urutan = /lama|pertama|duluan/i.test(urut[1]) ? 'lama' : 'baru';
    buang(new RegExp(urut[0], 'i'));
  }
  // "yang 520 jt", "baki 489 jt" (plafon atau baki)
  if (!rek.plafon) {
    const nom = sisa.match(/\b(?:(?:yang|yg)\s+)?(?:baki|os|outstanding|sisa)?\s*((?:rp\.?\s*)?\d+(?:[.,]\d+)?\s*(?:miliar|milyar|m\b|juta|jt\b))/i);
    if (nom && /(?:yang|yg|baki|os|outstanding|sisa|rp)/i.test(nom[0])) {
      const v = bacaNominal(nom[1]);
      if (v) {
        rek.nominal = v;
        buang(new RegExp(nom[0].replace(/[.*+?^${}()|[\]\\/]/g, '\\$&'), 'i'));
      }
    }
  }
  sisa = sisa.replace(/\s+/g, ' ').trim();
  return Object.keys(rek).length ? { sisa, rek } : { sisa: k };
}

// ------------------------------------------------------------------ simulasi
const PEMICU_SIMULASI = /\b(simulasi(?:kan)?|andai(?:kan)?|seandainya|misal(?:nya)?|kalau|kalo|klo|jika|bila|apabila|gimana kalau|bagaimana jika)\b/;
const AWAL_LANJUT = /^(terus|trus|lalu|kemudian|tambah(?:kan|in)?|ditambah|plus|sekalian|dan juga|lanjut)\b/;

function bacaSkenario(klausa: string): Skenario | null {
  const k0 = klausa
    .replace(/^(?:terus|trus|lalu|kemudian|tambah(?:kan|in)?|ditambah|plus|sekalian|dan juga|lanjut|coba|tolong|simulasi(?:kan)?|kalau|kalo|klo|jika|bila|apabila|andai(?:kan)?|seandainya|misal(?:nya)?|gimana kalau|bagaimana jika)\s+/g, '')
    .replace(/^(?:terus|trus|lalu|kalau|kalo|klo|jika|bila|misal(?:nya)?)\s+/g, '')
    .trim();
  if (!k0) return null;
  const { sisa: k, rek } = /\b(?:cair|pencairan|realisasi|kredit baru)\b/.test(k0) ? { sisa: k0, rek: undefined } : ambilRekening(k0);
  if (/\bkol(?:ek(?:tibilitas)?)?\s*2\b.*\b(tidak|gak|ga|nggak|enggak|ndak|tdk)\s*bayar|semua (?:debitur )?kol(?:ek)?\s*2\s*(?:turun|jadi|masuk)/.test(k)) {
    return { aksi: 'kol2_turun' };
  }
  const cair = k.match(/\b(?:cair|pencairan|realisasi|kredit baru)\b(?:\s+baru)?(?:\s+(?:bulan ini|sebesar|senilai|lagi))?\s*(.*)$/);
  if (cair) {
    const nominal = bacaNominal(cair[1]);
    if (nominal && nominal >= 1e5) return { aksi: 'cair', nominal };
  }
  const kol = k.match(/^(.*?)\s*(?:(?:jadi|menjadi|turun(?: ke)?|naik(?: ke)?|masuk(?: ke)?|ke|di)\s*)?kol(?:ek(?:tibilitas)?)?\s*([1-5])\b/);
  if (kol) {
    const nama = rapikanNama(kol[1]);
    if (nama) return { aksi: 'kol', nama, kol: Number(kol[2]), rek };
  }
  const bayar = k.match(/^(.*?)\s*(?:bayar|membayar|melunasi tunggakan|lunasi tunggakan|lunas tunggakan|setor)\b/);
  if (bayar && /tunggak|bayar|setor/.test(k)) {
    const nama = rapikanNama(bayar[1]);
    if (nama) return { aksi: 'bayar', nama, rek };
  }
  const lunas = k.match(/^(?:pelunasan\s+)?(.*?)\s*(?:lunas|melunasi|dilunasi|melunasi kreditnya|pelunasan)?\s*$/);
  if (/lunas|pelunasan/.test(k) && lunas) {
    const nama = rapikanNama(k.replace(/\b(?:sudah\s+)?(?:lunas|melunasi|dilunasi|pelunasan|kreditnya|semua)\b/g, ' '));
    if (nama) return { aksi: 'lunas', nama, rek };
  }
  return null;
}

function bacaSimulasi(t: string): Perintah | null {
  const target = t.match(/(?:biar|supaya|agar|target|untuk|sampai|hingga)\b.*\bnpl\b.*?(?:di ?bawah|kurang dari|jadi|<|turun(?: ke)?|ke)\s*(\d+(?:[.,]\d+)?)\s*%?/)
    || t.match(/\bnpl\b.*?(?:di ?bawah|kurang dari|<)\s*(\d+(?:[.,]\d+)?)\s*%/);
  if (target && /(tagih|harus|perlu|butuh|berapa|siapa)/.test(t)) {
    return { jenis: 'target_npl', target: Number(target[1].replace(',', '.')), unit: bacaUnit(t) };
  }
  const lanjut = AWAL_LANJUT.test(t);
  if (!PEMICU_SIMULASI.test(t) && !lanjut) return null;
  if (!/\bkol|lunas|pelunasan|melunasi|bayar|tunggak|cair|pencairan|realisasi/.test(t)) return null;

  // buang ekor pertanyaan ("berapa npl telihan?") sebelum dipecah per langkah
  const inti = t
    .replace(/[,;]?\s*(?:berapa|bagaimana|gimana|jadi berapa|apa)\b[^,]*\bnpl\b.*$/, '')
    .replace(/[,;]?\s*\bnpl\b.*$/, '')
    .replace(/\?+$/, '');
  const langkah = inti
    .split(/\s*(?:,|;|\bdan\b|\bserta\b|\bplus\b|\bditambah\b|\bterus\b|\blalu\b)\s*/)
    .map(bacaSkenario)
    .filter(Boolean) as Skenario[];
  if (!langkah.length) return null;
  return { jenis: 'simulasi', langkah, unit: bacaUnit(t), lanjut };
}

// ------------------------------------------------------------------ utama
/** Bersihkan kalimat: huruf kecil, spasi tunggal. Tanda kutip dipertahankan untuk nama persis. */
export const normalkan = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim();

/**
 * Terjemahkan pertanyaan menjadi perintah. Kembalikan null kalau tidak ada
 * pola yang cocok — pemanggil lalu meminta bantuan Workers AI.
 */
export function pahami(kalimat: string, hariIni = new Date()): Perintah | null {
  const asli = kalimat.trim();
  const t = normalkan(asli);
  if (!t) return null;

  if (/^(bantuan|help|halo|hai|hi|hallo|tolong|menu|contoh|bisa apa|apa saja yang bisa|cara pakai)\b|^\?+$/.test(t) && t.length < 40) {
    return { jenis: 'bantuan' };
  }

  // nama ditulis pakai tanda kutip → ambil dari kalimat asli supaya huruf besar terjaga
  const namaKutip = asli.match(/["“”]([^"“”]{2,60})["“”]/)?.[1];

  const sim = bacaSimulasi(t);
  if (sim) return sim;

  // angsuran / cicilan untuk plafon tertentu
  if (/\b(angsuran|cicilan)\b/.test(t) && /\d/.test(t) && /\b(bulan|bln|tahun|thn|th)\b/.test(t) && !/\btanggal\b|\btgl\b/.test(t)) {
    const plafon = bacaNominal(t.replace(/\b\d+(?:[.,]\d+)?\s*%/g, ' ').replace(/\b\d+\s*(?:bulan|bln|tahun|thn|th)\b/g, ' '));
    const tenor = t.match(/\b(\d+)\s*(bulan|bln|tahun|thn|th)\b/);
    const bunga = t.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (plafon && plafon >= 1e5 && tenor) {
      const bulan = /bul|bln/.test(tenor[2]) ? Number(tenor[1]) : Number(tenor[1]) * 12;
      return { jenis: 'angsuran', plafon, bulan, bunga: bunga ? Number(bunga[1].replace(',', '.')) : 10 };
    }
  }

  // rencana kunjungan / monitoring
  if (/\b(rencana|jadwal|jadwalkan|susun|susunkan|buat(?:kan)?|plan)\b/.test(t) && /\b(kunjung\w*|monitor\w*|visit)\b/.test(t)) {
    const n = t.match(/\b(\d+|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh|sebelas|dua belas)\s*bulan\b/);
    const perHari = t.match(/\b(\d+)\s*(?:debitur|kunjungan|orang|nasabah)?\s*(?:per|\/|se|tiap|setiap)\s*hari\b/);
    return {
      jenis: 'rencana_kunjungan',
      bulan: Math.min(24, (n && bacaBilangan(n[1])) || 3),
      unit: bacaUnit(t, 'telihan'),
      produktif: !/\bkonsumtif\b|\bsemua (?:jenis|kredit)\b/.test(t),
      perHari: perHari ? Math.min(10, Math.max(1, Number(perHari[1]))) : 2,
    };
  }

  // posisi map arsip
  if (/\b(map|berkas|arsip|dokumen)\b/.test(t) && /\b(laci|di ?mana|posisi|letak|simpan|disimpan|ada di)\b/.test(t)) {
    const m = t.match(/\b(?:map|berkas|arsip|dokumen)\s+(?:kredit\s+)?(?:debitur\s+|nasabah\s+|atas nama\s+|a\.?\s?n\.?\s+|milik\s+)?(.+)$/);
    const nama = namaKutip || (m ? rapikanNama(m[1]) : '');
    if (nama && nama.length >= 2) return { jenis: 'posisi_map', nama };
  }

  // profil satu debitur
  const profil =
    t.match(/\b(?:info|informasi|profil|profile|data|detail|detil|riwayat|cek|lihat|cari|tentang)\b.*?\b(?:atas nama|a\.?\s?n\.?|debitur|nasabah|tentang)\s+(.+)$/) ||
    t.match(/^(?:info|profil|cek|cari)\s+(.+)$/) ||
    t.match(/^siapa(?: itu)?\s+(.+)$/);
  if (profil && !/\b(jatuh tempo|lunas|cair|kol\s*\d|npl|tanggal)\b/.test(t)) {
    const nama = namaKutip || rapikanNama(profil[1]);
    if (nama && nama.length >= 2 && !/^(yang|semua|siapa)\b/.test(nama)) return { jenis: 'profil', nama };
  }

  // jatuh tempo (termasuk "akan lunas")
  if (/\b(jatuh tempo|jth tempo|jt tempo|akan lunas|habis kontrak|berakhir|selesai kredit)\b/.test(t)) {
    const periode = bacaPeriode(t, 'depan', hariIni) ?? periodeBulan(hariIni.getFullYear(), hariIni.getMonth());
    return { jenis: 'jatuh_tempo', periode, unit: bacaUnit(t) };
  }

  // sudah lunas / ditutup
  if (/\b(lunas|dilunasi|pelunasan|ditutup|tutup rekening|hilang dari mlf)\b/.test(t)) {
    const periode = bacaPeriode(t, 'lalu', hariIni) ?? periodeBulan(hariIni.getFullYear(), hariIni.getMonth());
    return { jenis: 'lunas', periode, unit: bacaUnit(t) };
  }

  // pencairan / kredit baru
  if (/\b(cair|pencairan|realisasi|kredit baru|akad baru|debitur baru)\b/.test(t)) {
    const periode = bacaPeriode(t, 'lalu', hariIni) ?? periodeBulan(hariIni.getFullYear(), hariIni.getMonth());
    return { jenis: 'pencairan', periode, unit: bacaUnit(t) };
  }

  // jadwal angsuran per tanggal
  const tgl = t.match(/\b(?:bayar|angsuran|cicilan|jatuh|tagih|setor)\w*\b.*?\b(?:tanggal|tgl)\s*(\d{1,2})\b/) || t.match(/\b(?:tanggal|tgl)\s*(\d{1,2})\b.*\b(?:bayar|angsuran|cicilan)\b/);
  if (tgl) {
    const n = Number(tgl[1]);
    if (n >= 1 && n <= 31) return { jenis: 'tanggal_bayar', tanggal: n, unit: bacaUnit(t) };
  }

  // calon top up
  if (/\btop ?-?up\b/.test(t)) {
    const persen = t.match(/(\d{2})\s*%/);
    return { jenis: 'calon_topup', unit: bacaUnit(t), minPersen: persen ? Number(persen[1]) : 50 };
  }

  // NPL sebagai angka
  if (/\bnpl\b|\brasio\b.*\bbermasalah\b/.test(t) && !/\b(daftar|siapa|list|debitur npl|yang npl)\b/.test(t)) {
    return { jenis: 'npl', unit: bacaUnit(t) };
  }

  // daftar kolektibilitas / tunggakan
  const kol = t.match(/\bkol(?:ek(?:tibilitas)?)?\s*([1-5])\b(.*)/);
  if (kol || /\b(nunggak|menunggak|tunggakan|telat bayar|terlambat|bermasalah|npl)\b/.test(t)) {
    if (kol) {
      const naik = /^\s*(ke ?atas|keatas|\+|>|atau lebih|lebih|sampai 5|s\.?d\.? ?5)/.test(kol[2]) || /\b(ke ?atas|keatas)\b/.test(t);
      return { jenis: 'kol', minKol: Number(kol[1]), persis: !naik, nunggak: /tunggak|nunggak/.test(t) && !naik, unit: bacaUnit(t) };
    }
    if (/\b(bermasalah|npl)\b/.test(t)) return { jenis: 'kol', minKol: 3, persis: false, nunggak: false, unit: bacaUnit(t) };
    return { jenis: 'kol', minKol: 1, persis: false, nunggak: true, unit: bacaUnit(t) };
  }

  // ringkasan portofolio
  if (/\b(ringkasan|rekap|portofolio|portfolio|kondisi kredit)\b/.test(t) || /\b(total|jumlah|berapa)\b.*\b(baki|os|outstanding|debitur|plafon|nasabah|kredit|rekening)\b/.test(t)) {
    return { jenis: 'ringkasan', unit: bacaUnit(t), produktif: /\bproduktif\b/.test(t) ? true : /\bkonsumtif\b/.test(t) ? false : null };
  }

  return null;
}

/** Contoh nama bulan untuk saran pertanyaan. */
export const bulanDepanLabel = (d = new Date()) => namaBulan(new Date(d.getFullYear(), d.getMonth() + 1, 1).getMonth());
export const bulanIniLabel = (d = new Date()) => namaBulan(d.getMonth());
