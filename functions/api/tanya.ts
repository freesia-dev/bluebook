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

const MODEL_BAWAAN = "@cf/meta/llama-3.1-8b-instruct";

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

  try {
    const keluar = (await env.AI.run(env.TANYA_MODEL || MODEL_BAWAAN, {
      messages: [
        { role: "system", content: sistem(hariIni) },
        { role: "user", content: teks },
      ],
      max_tokens: 256,
      temperature: 0,
    })) as { response?: unknown };
    const r = keluar?.response;
    const perintah = typeof r === "string" ? ambilJson(r) : r && typeof r === "object" ? r : null;
    if (!perintah) return json({ error: "AI tidak mengembalikan perintah" }, 502);
    return json({ perintah });
  } catch (e) {
    const pesan = e instanceof Error ? e.message : String(e);
    // jatah harian habis atau layanan sibuk
    const habis = /limit|quota|neuron|429/i.test(pesan);
    return json({ error: habis ? "JATAH_HABIS" : "AI gagal", detail: pesan.slice(0, 200) }, habis ? 429 : 502);
  }
};
