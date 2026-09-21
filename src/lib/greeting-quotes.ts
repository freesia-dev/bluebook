// Bank kalimat penyemangat untuk sapaan awal hari (DailyGreetingOverlay).
// Campuran Indonesia & Inggris, singkat, hangat, dan nggak menggurui —
// dipilih satu secara acak (deterministik per hari) setiap kali overlay muncul.

export const GREETING_QUOTES: string[] = [
  "Langkah kecil hari ini, hasil besar nanti.",
  "Small progress is still progress.",
  "Semangat pagi. Satu per satu, pasti selesai.",
  "You don't have to be perfect, just consistent.",
  "Hari baru, kesempatan baru buat jadi lebih baik dari kemarin.",
  "Slow progress is better than no progress.",
  "Kerja baik itu nggak harus terburu-buru, yang penting rapi dan tuntas.",
  "Focus on progress, not perfection.",
  "Setiap data yang kamu rapikan hari ini, nolong orang lain besok.",
  "Great things take time — keep going.",
  "Nggak semua hari harus produktif banget, cukup lebih baik dari kemarin.",
  "Discipline is choosing between what you want now and what you want most.",
  "Selesaikan yang penting dulu, sisanya ikut jalan.",
  "One task at a time. That's enough.",
  "Kamu udah sampai sejauh ini, jangan berhenti sekarang.",
  "Consistency beats intensity.",
  "Hari ini mungkin berat, tapi kamu lebih kuat dari yang kamu kira.",
  "Do the best you can until you know better. Then do better.",
  "Kerja yang jujur dan teliti itu nggak pernah sia-sia.",
  "Success is the sum of small efforts repeated daily.",
  "Nggak apa-apa pelan, asal jangan berhenti.",
  "Well begun is half done — mulai aja dulu.",
  "Tetap teliti, tetap sabar, hasilnya pasti kelihatan.",
  "Your work matters, even on the quiet days.",
  "Satu masalah selesai hari ini, satu beban lebih ringan besok.",
  "Progress, not perfection.",
  "Semangat! Nasabah dan tim kamu mengandalkan kerja rapi kamu hari ini.",
  "Little by little, a little becomes a lot.",
  "Kalau capek, istirahat. Tapi jangan menyerah.",
  "The secret of getting ahead is getting started.",
  "Hari ini kerja yang baik, besok jadi kebiasaan yang baik.",
  "Believe you can, and you're halfway there.",
  "Ketelitian hari ini adalah kepercayaan nasabah besok.",
  "Keep going. Everything you need will come to you.",
  "Kamu nggak harus jadi sempurna, cukup jadi bertanggung jawab.",
  "A little progress each day adds up to big results.",
  "Yuk mulai — satu email, satu berkas, satu langkah dulu.",
  "Good things come to those who hustle.",
  "Hormati waktu kerja hari ini, karena hasilnya untuk masa depan kamu juga.",
  "Stay patient and trust your journey.",
  "Semangat kerja hari ini, biar besok lebih ringan.",
  "It always seems impossible until it's done.",
  "Rapi sedikit demi sedikit, lama-lama jadi rapi semua.",
  "The way to get started is to quit talking and begin doing.",
  "Setiap hari kerja adalah kesempatan buat jadi lebih baik.",
  "You are capable of more than you know.",
  "Kerja keras nggak pernah bohong soal hasilnya.",
  "Push yourself, because no one else is going to do it for you.",
  "Hari ini penuh kemungkinan — manfaatkan sebaik mungkin.",
  "Excellence is not an act, but a habit.",
  "Selamat bekerja, semoga harimu lancar dan berkah.",
];

/**
 * Ambil satu kalimat penyemangat secara deterministik berdasarkan tanggal,
 * supaya kalau overlay perlu re-render di hari yang sama, kalimatnya tetap
 * konsisten (bukan ganti-ganti tiap render).
 */
export function pickGreetingQuote(dateKey: string): string {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return GREETING_QUOTES[hash % GREETING_QUOTES.length];
}
