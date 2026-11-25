// Ayat untuk sapaan pagi, siang, dan sore di Bluebook.
//
// Al-Qur'an: teks Arab dan terjemahan Kementerian Agama RI (edisi 2019),
// diambil dari equran.id. Untuk ayat panjang hanya penggalan yang relevan
// yang dipakai, dan teks Arabnya dipotong pada penggalan yang sama.
// Alkitab: Terjemahan Baru (LAI), diambil dari alkitab.sabda.org.
//
// `waktu` mengikat ayat ke sapaan tertentu (mis. "selalu baru tiap pagi"
// hanya muncul pagi). Ayat tanpa `waktu` bisa muncul kapan saja.

import type { WaktuSapaan } from '@/lib/sapaan-palet';

export interface Ayat {
  /** terjemahan / teks yang ditampilkan */
  teks: string;
  /** rujukan, mis. "At-Taubah: 105" atau "Kolose 3:23" */
  sumber: string;
  /** teks Arab (khusus Al-Qur'an) */
  arab?: string;
  waktu?: WaktuSapaan[];
}

export const AYAT_QURAN: Ayat[] = [
  {
    sumber: 'At-Taubah: 105',
    arab: 'وَقُلِ اعْمَلُوْا فَسَيَرَى اللّٰهُ عَمَلَكُمْ وَرَسُوْلُهٗ وَالْمُؤْمِنُوْنَۗ',
    teks: 'Katakanlah (Nabi Muhammad), “Bekerjalah! Maka, Allah, rasul-Nya, dan orang-orang mukmin akan melihat pekerjaanmu.”',
    waktu: ['pagi'],
  },
  {
    sumber: 'An-Najm: 39',
    arab: 'وَاَنْ لَّيْسَ لِلْاِنْسَانِ اِلَّا مَا سَعٰىۙ',
    teks: 'Bahwa manusia hanya memperoleh apa yang telah diusahakannya.',
  },
  {
    sumber: 'Al-Insyirah: 5–6',
    arab: 'فَاِنَّ مَعَ الْعُسْرِ يُسْرًاۙ اِنَّ مَعَ الْعُسْرِ يُسْرًاۗ',
    teks: 'Maka, sesungguhnya beserta kesulitan ada kemudahan. Sesungguhnya beserta kesulitan ada kemudahan.',
  },
  {
    sumber: 'Al-Insyirah: 7–8',
    arab: 'فَاِذَا فَرَغْتَ فَانْصَبْۙ وَاِلٰى رَبِّكَ فَارْغَبْ ࣖ',
    teks: 'Apabila engkau telah selesai (dengan suatu kebajikan), teruslah bekerja keras (untuk kebajikan yang lain) dan hanya kepada Tuhanmu berharaplah!',
    waktu: ['siang', 'sore'],
  },
  {
    sumber: 'Al-Baqarah: 286',
    arab: 'لَا يُكَلِّفُ اللّٰهُ نَفْسًا اِلَّا وُسْعَهَا',
    teks: 'Allah tidak membebani seseorang, kecuali menurut kesanggupannya.',
  },
  {
    sumber: 'Al-Baqarah: 153',
    arab: 'يٰٓاَيُّهَا الَّذِيْنَ اٰمَنُوا اسْتَعِيْنُوْا بِالصَّبْرِ وَالصَّلٰوةِ ۗ اِنَّ اللّٰهَ مَعَ الصّٰبِرِيْنَ',
    teks: 'Wahai orang-orang yang beriman, mohonlah pertolongan (kepada Allah) dengan sabar dan salat. Sesungguhnya Allah beserta orang-orang yang sabar.',
  },
  {
    sumber: 'Al-Baqarah: 282',
    arab: 'يٰٓاَيُّهَا الَّذِيْنَ اٰمَنُوْٓا اِذَا تَدَايَنْتُمْ بِدَيْنٍ اِلٰٓى اَجَلٍ مُّسَمًّى فَاكْتُبُوْهُۗ',
    teks: 'Wahai orang-orang yang beriman, apabila kamu berutang piutang untuk waktu yang ditentukan, hendaklah kamu mencatatnya.',
  },
  {
    sumber: 'Al-Baqarah: 280',
    arab: 'وَاِنْ كَانَ ذُوْ عُسْرَةٍ فَنَظِرَةٌ اِلٰى مَيْسَرَةٍ ۗ وَاَنْ تَصَدَّقُوْا خَيْرٌ لَّكُمْ اِنْ كُنْتُمْ تَعْلَمُوْنَ',
    teks: 'Jika dia (orang yang berutang itu) dalam kesulitan, berilah tenggang waktu sampai dia memperoleh kelapangan. Kamu bersedekah (membebaskan utang) itu lebih baik bagimu apabila kamu mengetahui(-nya).',
  },
  {
    sumber: 'Al-Baqarah: 83',
    arab: 'وَقُوْلُوْا لِلنَّاسِ حُسْنًا',
    teks: 'Bertutur katalah yang baik kepada manusia.',
    waktu: ['pagi'],
  },
  {
    sumber: "Ali 'Imran: 159",
    arab: 'فَاِذَا عَزَمْتَ فَتَوَكَّلْ عَلَى اللّٰهِ ۗ اِنَّ اللّٰهَ يُحِبُّ الْمُتَوَكِّلِيْنَ',
    teks: 'Apabila engkau telah membulatkan tekad, bertawakallah kepada Allah. Sesungguhnya Allah mencintai orang-orang yang bertawakal.',
  },
  {
    sumber: "An-Nisa': 58",
    arab: 'اِنَّ اللّٰهَ يَأْمُرُكُمْ اَنْ تُؤَدُّوا الْاَمٰنٰتِ اِلٰٓى اَهْلِهَاۙ',
    teks: 'Sesungguhnya Allah menyuruh kamu menyampaikan amanah kepada pemiliknya.',
  },
  {
    sumber: "Al-Ma'idah: 2",
    arab: 'وَتَعَاوَنُوْا عَلَى الْبِرِّ وَالتَّقْوٰىۖ وَلَا تَعَاوَنُوْا عَلَى الْاِثْمِ وَالْعُدْوَانِ',
    teks: 'Tolong-menolonglah kamu dalam (mengerjakan) kebajikan dan takwa, dan jangan tolong-menolong dalam berbuat dosa dan permusuhan.',
  },
  {
    sumber: 'Al-Anfal: 27',
    arab: 'يٰٓاَيُّهَا الَّذِيْنَ اٰمَنُوْا لَا تَخُوْنُوا اللّٰهَ وَالرَّسُوْلَ وَتَخُوْنُوْٓا اَمٰنٰتِكُمْ وَاَنْتُمْ تَعْلَمُوْنَ',
    teks: 'Wahai orang-orang yang beriman, janganlah kamu mengkhianati Allah dan Rasul serta janganlah kamu mengkhianati amanat yang dipercayakan kepadamu, sedangkan kamu mengetahui.',
  },
  {
    sumber: 'Hud: 85',
    arab: 'وَيٰقَوْمِ اَوْفُوا الْمِكْيَالَ وَالْمِيْزَانَ بِالْقِسْطِ وَلَا تَبْخَسُوا النَّاسَ اَشْيَاۤءَهُمْ وَلَا تَعْثَوْا فِى الْاَرْضِ مُفْسِدِيْنَ',
    teks: 'Wahai kaumku, penuhilah takaran dan timbangan dengan adil! Janganlah kamu merugikan manusia akan hak-hak mereka dan janganlah kamu membuat kejahatan di bumi dengan menjadi perusak!',
  },
  {
    sumber: 'Hud: 115',
    arab: 'وَاصْبِرْ فَاِنَّ اللّٰهَ لَا يُضِيْعُ اَجْرَ الْمُحْسِنِيْنَ',
    teks: 'Bersabarlah, karena sesungguhnya Allah tidak akan menyia-nyiakan pahala orang yang berbuat kebaikan.',
    waktu: ['sore'],
  },
  {
    sumber: "Ar-Ra'd: 11",
    arab: 'اِنَّ اللّٰهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتّٰى يُغَيِّرُوْا مَا بِاَنْفُسِهِمْۗ',
    teks: 'Sesungguhnya Allah tidak mengubah keadaan suatu kaum hingga mereka mengubah apa yang ada pada diri mereka.',
  },
  {
    sumber: 'Ibrahim: 7',
    arab: 'لَىِٕنْ شَكَرْتُمْ لَاَزِيْدَنَّكُمْ',
    teks: 'Sesungguhnya jika kamu bersyukur, niscaya Aku akan menambah (nikmat) kepadamu.',
    waktu: ['sore'],
  },
  {
    sumber: "Al-Isra': 34",
    arab: 'وَاَوْفُوْا بِالْعَهْدِۖ اِنَّ الْعَهْدَ كَانَ مَسْـُٔوْلًا',
    teks: 'Penuhilah janji (karena) sesungguhnya janji itu pasti diminta pertanggungjawabannya.',
  },
  {
    sumber: 'Al-Qasas: 26',
    arab: 'اِنَّ خَيْرَ مَنِ اسْتَأْجَرْتَ الْقَوِيُّ الْاَمِيْنُ',
    teks: 'Sesungguhnya sebaik-baik orang yang engkau pekerjakan adalah orang yang kuat lagi dapat dipercaya.',
  },
  {
    sumber: 'Al-Qasas: 77',
    arab: 'وَابْتَغِ فِيْمَآ اٰتٰىكَ اللّٰهُ الدَّارَ الْاٰخِرَةَ وَلَا تَنْسَ نَصِيْبَكَ مِنَ الدُّنْيَا',
    teks: 'Carilah pada apa yang telah dianugerahkan Allah kepadamu (pahala) negeri akhirat, tetapi janganlah kamu lupakan bagianmu di dunia.',
  },
  {
    sumber: 'Al-Hujurat: 6',
    arab: 'يٰٓاَيُّهَا الَّذِيْنَ اٰمَنُوْٓا اِنْ جَاۤءَكُمْ فَاسِقٌۢ بِنَبَاٍ فَتَبَيَّنُوْٓا اَنْ تُصِيْبُوْا قَوْمًاۢ بِجَهَالَةٍ فَتُصْبِحُوْا عَلٰى مَا فَعَلْتُمْ نٰدِمِيْنَ',
    teks: 'Wahai orang-orang yang beriman, jika seorang fasik datang kepadamu membawa berita penting, maka telitilah kebenarannya agar kamu tidak mencelakakan suatu kaum karena ketidaktahuan(-mu) yang berakibat kamu menyesali perbuatanmu itu.',
  },
  {
    sumber: "Al-Jumu'ah: 10",
    arab: 'فَاِذَا قُضِيَتِ الصَّلٰوةُ فَانْتَشِرُوْا فِى الْاَرْضِ وَابْتَغُوْا مِنْ فَضْلِ اللّٰهِ وَاذْكُرُوا اللّٰهَ كَثِيْرًا لَّعَلَّكُمْ تُفْلِحُوْنَ',
    teks: 'Apabila salat (Jumat) telah dilaksanakan, bertebaranlah kamu di bumi, carilah karunia Allah, dan ingatlah Allah sebanyak-banyaknya agar kamu beruntung.',
    waktu: ['siang'],
  },
  {
    sumber: 'At-Talaq: 2–3',
    arab: 'وَمَنْ يَّتَّقِ اللّٰهَ يَجْعَلْ لَّهٗ مَخْرَجًا وَّيَرْزُقْهُ مِنْ حَيْثُ لَا يَحْتَسِبُۗ',
    teks: 'Siapa yang bertakwa kepada Allah, niscaya Dia akan membukakan jalan keluar baginya dan menganugerahkan kepadanya rezeki dari arah yang tidak dia duga.',
  },
  {
    sumber: 'Al-Mulk: 15',
    arab: 'هُوَ الَّذِيْ جَعَلَ لَكُمُ الْاَرْضَ ذَلُوْلًا فَامْشُوْا فِيْ مَنَاكِبِهَا وَكُلُوْا مِنْ رِّزْقِهٖۗ',
    teks: 'Dialah yang menjadikan bumi untuk kamu dalam keadaan mudah dimanfaatkan. Maka, jelajahilah segala penjurunya dan makanlah sebagian dari rezeki-Nya.',
    waktu: ['pagi', 'siang'],
  },
  {
    sumber: 'Az-Zalzalah: 7',
    arab: 'فَمَنْ يَّعْمَلْ مِثْقَالَ ذَرَّةٍ خَيْرًا يَّرَهٗۚ',
    teks: 'Siapa yang mengerjakan kebaikan seberat zarah, dia akan melihat (balasan)-nya.',
    waktu: ['sore'],
  },
];

export const AYAT_ALKITAB: Ayat[] = [
  { sumber: 'Kolose 3:23', teks: 'Apapun juga yang kamu perbuat, perbuatlah dengan segenap hatimu seperti untuk Tuhan dan bukan untuk manusia.', waktu: ['pagi'] },
  { sumber: 'Amsal 16:3', teks: 'Serahkanlah perbuatanmu kepada TUHAN, maka terlaksanalah segala rencanamu.', waktu: ['pagi'] },
  { sumber: 'Filipi 4:13', teks: 'Segala perkara dapat kutanggung di dalam Dia yang memberi kekuatan kepadaku.' },
  { sumber: 'Amsal 14:23', teks: 'Dalam tiap jerih payah ada keuntungan, tetapi kata-kata belaka mendatangkan kekurangan saja.' },
  { sumber: 'Pengkhotbah 9:10', teks: 'Segala sesuatu yang dijumpai tanganmu untuk dikerjakan, kerjakanlah itu sekuat tenaga.' },
  { sumber: 'Galatia 6:9', teks: 'Janganlah kita jemu-jemu berbuat baik, karena apabila sudah datang waktunya, kita akan menuai, jika kita tidak menjadi lemah.', waktu: ['siang', 'sore'] },
  { sumber: '1 Korintus 15:58', teks: 'Karena itu, saudara-saudaraku yang kekasih, berdirilah teguh, jangan goyah, dan giatlah selalu dalam pekerjaan Tuhan! Sebab kamu tahu, bahwa dalam persekutuan dengan Tuhan jerih payahmu tidak sia-sia.', waktu: ['sore'] },
  { sumber: 'Matius 11:28', teks: 'Marilah kepada-Ku, semua yang letih lesu dan berbeban berat, Aku akan memberi kelegaan kepadamu.', waktu: ['siang', 'sore'] },
  { sumber: 'Ratapan 3:22–23', teks: 'Tak berkesudahan kasih setia TUHAN, tak habis-habisnya rahmat-Nya, selalu baru tiap pagi; besar kesetiaan-Mu!', waktu: ['pagi'] },
  { sumber: 'Mazmur 118:24', teks: 'Inilah hari yang dijadikan TUHAN, marilah kita bersorak-sorak dan bersukacita karenanya!', waktu: ['pagi'] },
  { sumber: 'Mazmur 90:17', teks: 'Kiranya kemurahan Tuhan, Allah kami, atas kami, dan teguhkanlah perbuatan tangan kami, ya, perbuatan tangan kami, teguhkanlah itu.' },
  { sumber: 'Lukas 16:10', teks: 'Barangsiapa setia dalam perkara-perkara kecil, ia setia juga dalam perkara-perkara besar.' },
  { sumber: 'Amsal 22:29', teks: 'Pernahkah engkau melihat orang yang cakap dalam pekerjaannya? Di hadapan raja-raja ia akan berdiri, bukan di hadapan orang-orang yang hina.' },
  { sumber: 'Amsal 11:1', teks: 'Neraca serong adalah kekejian bagi TUHAN, tetapi Ia berkenan akan batu timbangan yang tepat.' },
  { sumber: 'Amsal 10:4', teks: 'Tangan yang lamban membuat miskin, tetapi tangan orang rajin menjadikan kaya.' },
  { sumber: 'Amsal 13:4', teks: 'Hati si pemalas penuh keinginan, tetapi sia-sia, sedangkan hati orang rajin diberi kelimpahan.' },
  { sumber: 'Amsal 3:5', teks: 'Percayalah kepada TUHAN dengan segenap hatimu, dan janganlah bersandar kepada pengertianmu sendiri.' },
  { sumber: 'Filipi 4:6', teks: 'Janganlah hendaknya kamu kuatir tentang apapun juga, tetapi nyatakanlah dalam segala hal keinginanmu kepada Allah dalam doa dan permohonan dengan ucapan syukur.' },
  { sumber: 'Matius 6:34', teks: 'Sebab itu janganlah kamu kuatir akan hari besok, karena hari besok mempunyai kesusahannya sendiri. Kesusahan sehari cukuplah untuk sehari.', waktu: ['sore'] },
  { sumber: '1 Petrus 5:7', teks: 'Serahkanlah segala kekuatiranmu kepada-Nya, sebab Ia yang memelihara kamu.' },
  { sumber: 'Yesaya 40:31', teks: 'Orang-orang yang menanti-nantikan TUHAN mendapat kekuatan baru: mereka seumpama rajawali yang naik terbang dengan kekuatan sayapnya; mereka berlari dan tidak menjadi lesu, mereka berjalan dan tidak menjadi lelah.' },
  { sumber: 'Yosua 1:9', teks: 'Bukankah telah Kuperintahkan kepadamu: kuatkan dan teguhkanlah hatimu? Janganlah kecut dan tawar hati, sebab TUHAN, Allahmu, menyertai engkau, ke manapun engkau pergi.', waktu: ['pagi'] },
  { sumber: 'Mazmur 37:5', teks: 'Serahkanlah hidupmu kepada TUHAN dan percayalah kepada-Nya, dan Ia akan bertindak.' },
  { sumber: 'Ibrani 13:5', teks: 'Janganlah kamu menjadi hamba uang dan cukupkanlah dirimu dengan apa yang ada padamu.' },
  { sumber: 'Mazmur 4:9', teks: 'Dengan tenteram aku mau membaringkan diri, lalu segera tidur, sebab hanya Engkaulah, ya TUHAN, yang membiarkan aku diam dengan aman.', waktu: ['sore'] },
];

/**
 * Pengguna yang mendapat ayat Alkitab. Dicocokkan dengan nama akun
 * (tanpa membedakan huruf besar-kecil). Tambahkan nama di sini kalau ada
 * pegawai baru yang perlu.
 */
export const PENGGUNA_ALKITAB = ['patrisia', 'agustina'];

export const pakaiAlkitab = (nama: string | null | undefined) => {
  const n = (nama || '').toLowerCase();
  return PENGGUNA_ALKITAB.some((x) => n.includes(x));
};

/** Hash sederhana untuk pilihan acak yang tetap sama dalam satu sesi sapaan. */
export const hashKunci = (kunci: string) => {
  let h = 2166136261;
  for (let i = 0; i < kunci.length; i++) h = Math.imul(h ^ kunci.charCodeAt(i), 16777619) >>> 0;
  return h;
};

/**
 * Pilih satu ayat untuk sapaan tertentu. Kuncinya "tanggal|waktu|pengguna",
 * jadi tiap orang dapat ayat berbeda, dan ayatnya tetap sama kalau sapaan
 * waktu itu perlu tampil ulang.
 */
export const pilihAyat = (kunci: string, waktu: WaktuSapaan, alkitab: boolean): Ayat => {
  const daftar = alkitab ? AYAT_ALKITAB : AYAT_QURAN;
  const cocok = daftar.filter((a) => !a.waktu || a.waktu.includes(waktu));
  return cocok[hashKunci(kunci) % cocok.length];
};
