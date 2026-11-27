// POST /api/tanya
//
// Penerjemah pertanyaan Tanya Bluebook dengan Cloudflare Workers AI.
// Dipanggil HANYA kalau pola di aplikasi tidak mengenali pertanyaannya.
//
// Yang dikirim ke AI hanya kalimat pertanyaan dan tanggal hari ini. AI tidak
// pernah melihat data MLF: ia hanya mengembalikan "perintah" JSON, lalu
// aplikasi sendiri yang menghitung jawabannya dari Supabase.
//
// Butuh binding Workers AI bernama `AI` di pengaturan proyek Pages
// (Settings → Bindings → Add → Workers AI). Tanpa binding, endpoint ini
// mengembalikan 503 dan aplikasi tetap menjawab pertanyaan yang berpola.
import type { Env as EnvDasar } from "../_shared/auth";
import { requireUser, json } from "../_shared/auth";

interface Env extends EnvDasar {
  AI?: { run(model: string, input: unknown): Promise<unknown> };
  /** opsional: ganti model tanpa mengubah kode */
  TANYA_MODEL?: string;
}

/**
 * Dicoba berurutan sampai ada yang berhasil. Kalau satu model dipensiunkan
 * Cloudflare atau sedang sibuk, model berikutnya dipakai.
 */
const DAFTAR_MODEL = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-3.1-8b-instruct-fast",
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/mistralai/mistral-small-3.1-24b-instruct",
];

const sistem = (hariIni: string) => `Kamu penerjemah pertanyaan untuk aplikasi internal bank "Bluebook" (KCP Telihan, Bontang).
Tugasmu HANYA mengubah pertanyaan pengguna menjadi SATU objek JSON perintah. Jangan menjawab pertanyaannya, jangan menambah teks lain.
Hari ini ${hariIni}. Unit kredit: "telihan", "meranti", atau "semua" (bawaan "semua").
Periode ditulis {"dari":"YYYY-MM-DD","sampai":"YYYY-MM-DD","label":"<teks singkat>"}.

Pilihan perintah (field "jenis"):
- {"jenis":"profil","nama":"<nama debitur>"} — info/profil/riwayat satu debitur
- {"jenis":"posisi_map","nama":"<nama>"} — letak map/berkas arsip debitur
- {"jenis":"rencana_kunjungan","bulan":<angka, kredit yang cair N bulan terakhir, bawaan 3>,"unit":"telihan","produktif":true,"perHari":2}
- {"jenis":"jatuh_tempo","periode":{...},"unit":"semua"} — kredit yang akan jatuh tempo / berakhir
- {"jenis":"lunas","periode":{...},"unit":"semua"} — kredit yang sudah lunas / ditutup
- {"jenis":"pencairan","periode":{...},"unit":"semua"} — kredit baru / cair / realisasi
- {"jenis":"kol","minKol":<1-5>,"persis":<true kalau hanya kol itu>,"nunggak":<true kalau tanya yang menunggak>,"unit":"semua"}
- {"jenis":"npl","unit":"semua"} — rasio NPL / kredit bermasalah sebagai angka
- {"jenis":"ringkasan","unit":"semua","produktif":<true|false|null>} — total baki, jumlah debitur, portofolio
- {"jenis":"tanggal_bayar","tanggal":<1-31>,"unit":"semua"} — debitur yang angsurannya tanggal tertentu
- {"jenis":"calon_topup","unit":"semua","minPersen":50}
- {"jenis":"simulasi","langkah":[...],"unit":"semua","lanjut":<true kalau melanjutkan simulasi sebelumnya, mis. diawali "terus"/"lalu">}
  langkah boleh: {"aksi":"kol","nama":"<nama>","kol":<1-5>}, {"aksi":"lunas","nama":"<nama>"}, {"aksi":"bayar","nama":"<nama>"}, {"aksi":"cair","nominal":<rupiah>}, {"aksi":"kol2_turun"}
  Untuk kol/lunas/bayar boleh ditambah "rekening" kalau yang dimaksud hanya satu rekening: {"akad":"YYYY-MM-DD"} atau {"tahun":2023} atau {"plafon":<rupiah>} atau {"nominal":<plafon atau baki>} atau {"urutan":"lama"|"baru"} atau {"nomor":"<nomor PK/rekening>"}, atau {"semua":true} kalau jelas semua rekening.
- {"jenis":"target_npl","target":<persen>,"unit":"semua"} — berapa yang harus ditagih supaya NPL di bawah target
- {"jenis":"angsuran","plafon":<rupiah>,"bulan":<tenor bulan>,"bunga":<persen per tahun>}
- {"jenis":"bantuan"} — sapaan, atau pertanyaan di luar data kredit
Kalau tidak yakin, kembalikan {"jenis":"bantuan"}.`;

/** Ambil objek JSON pertama dari teks keluaran model. */
function ambilJson(teks: string): unknown {
  const mulai = teks.indexOf("{");
  if (mulai < 0) return null;
  let dalam = 0;
  for (let i = mulai; i < teks.length; i++) {
    if (teks[i] === "{") dalam++;
    else if (teks[i] === "}") {
      dalam--;
      if (dalam === 0) {
        try {
          return JSON.parse(teks.slice(mulai, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  const auth = await requireUser(request, env);
  if (!auth) return json({ error: "Unauthorized" }, 401);
  if (!env.AI) return json({ error: "AI_BELUM_DIPASANG" }, 503);

  let body: { teks?: unknown; hariIni?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: "Format salah" }, 400);
  }
  const teks = typeof body.teks === "string" ? body.teks.trim().slice(0, 300) : "";
  if (!teks) return json({ error: "Pertanyaan kosong" }, 400);
  const hariIni = typeof body.hariIni === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.hariIni)
    ? body.hariIni
    : new Date().toISOString().slice(0, 10);

  const daftar = [...new Set([env.TANYA_MODEL, ...DAFTAR_MODEL].filter(Boolean) as string[])];
  const galat: string[] = [];
  for (const model of daftar) {
    try {
      const keluar = (await env.AI.run(model, {
        messages: [
          { role: "system", content: sistem(hariIni) },
          { role: "user", content: teks },
        ],
        max_tokens: 400,
        temperature: 0,
      })) as { response?: unknown };
      const r = keluar?.response;
      const perintah = typeof r === "string" ? ambilJson(r) : r && typeof r === "object" ? r : null;
      if (perintah) return json({ perintah, model });
      const mentah = typeof r === "string" ? r.slice(0, 160) : JSON.stringify(keluar).slice(0, 160);
      galat.push(`${model}: bukan JSON (${mentah})`);
      console.error("tanya: keluaran bukan JSON", model, mentah);
    } catch (e) {
      const pesan = e instanceof Error ? e.message : String(e);
      galat.push(`${model}: ${pesan.slice(0, 160)}`);
      console.error("tanya: model gagal", model, pesan);
      // jatah harian habis: model lain juga akan ditolak
      if (/daily|quota|neuron|limit exceeded|4006/i.test(pesan)) {
        return json({ error: "JATAH_HABIS", detail: galat.join(" | ") }, 429);
      }
    }
  }
  return json({ error: "AI gagal", detail: galat.join(" | ").slice(0, 600) }, 502);
};


/** GET /api/tanya — cek cepat apakah binding Workers AI sudah terpasang. */
export const onRequestGet: PagesFunction<Env> = async ({ env }) => json({ ai: !!env.AI });
