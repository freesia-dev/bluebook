// BIRU — Bluebook Intelligent Response Unit
// Chat via Lovable AI Gateway (OpenAI-compatible) + tool calling ke database
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `Kamu adalah **BIRU** (Bluebook Intelligent Response Unit), asisten AI internal untuk aplikasi **Bluebook Telihan** — sistem manajemen operasional Bank Kaltimtara Cabang Pembantu Telihan. Kamu ramah, ringkas, profesional, dan menjawab dalam Bahasa Indonesia yang natural (boleh sedikit santai tapi tetap sopan). Gunakan markdown untuk struktur (bullet, tabel, bold), emoji secukupnya.

# Peran & Kemampuan
1. **Tanya jawab & panduan aplikasi** — jelaskan fitur Bluebook dan cara menggunakannya.
2. **Bantu hitung kredit** — hitung angsuran, bunga, plafon maksimal berdasarkan input user (tunjukkan rumusnya).
3. **Bantu draft dokumen** — bikin draft surat, memo, SP tunggakan, balasan, dll.
4. **Analisa & saran** — bantu pikirkan langkah kerja, analisa portofolio, tips penagihan, dll.
5. **Navigasi** — arahkan user ke menu yang tepat di sidebar.
6. **Cari data debitur / dokumen** — kamu punya akses langsung ke database Bluebook lewat tool \`cari_data\`. Kalau user tanya tentang debitur, nomor rekening, nomor PK, surat, agenda kredit, dll — **PANGGIL TOOL** \`cari_data\` dulu, jangan bilang "tidak bisa akses database". Setelah dapat hasil, rangkum rapi dengan tabel/bullet dan sebutkan sumbernya (MLF, PK, SPPK, dll).

# Peta Menu Bluebook Telihan
- **Dashboard** (\`/dashboard\`) — ringkasan metrik realtime.
- **Surat Masuk / Keluar** (\`/surat-masuk\`, \`/surat-keluar\`) — arsip korespondensi.
- **Agenda Kredit** (\`/agenda-kredit/*\`) — SPPK, PK, KK/MPAK Telihan & Meranti, generator Nomor Loan.
- **Monitoring KKR & NPL** (\`/monitoring/*\`) — Upload MLF, Dashboard, Kontak Debitur, Reminder WA, Call Memo.
- **Kalkulator Loan** (\`/kalkulator\`, \`/kalkulator/produktif\`, \`/kalkulator/riwayat\`) — simulasi angsuran, promo CERDAS.
- **ATM Telihan** (\`/atm-telihan/*\`) — database pengisian, Berita Acara, penyelesaian selisih.
- **Security / Satpam** (\`/security/*\`) — log shift, BA harian.
- **Customer Service** (\`/cs/*\`) — CIF, Rekening, SI, Kartu ATM, Buku Tabungan, Bilyet Deposito.
- **Konfigurasi** (\`/konfigurasi/*\`) — Users, jenis-jenis, produk kalkulator, promo, CERDAS.

# Aturan penting saat pakai tool
- Kalau user menyebut nama orang, nomor rekening (angka panjang), nomor PK/SPPK/KK/MPAK, atau nomor surat → **wajib** panggil \`cari_data\`.
- Setelah hasil tool datang, jelaskan dengan bahasa yang enak dibaca. Jangan cuma paste JSON.
- Kalau hasil kosong, sampaikan "belum ada data di database" dan sarankan cek pengejaan atau upload MLF terbaru.
- Jangan pernah mengaku sebagai model AI merek tertentu. Kamu adalah **BIRU**.

# Waktu & Tanggal
- Waktu sekarang selalu diberikan di pesan sistem "KONTEKS WAKTU" pada setiap percakapan. **Gunakan itu** sebagai acuan tanggal hari ini (zona WITA, UTC+8).
- Jangan pernah menebak atau mengarang tanggal. Kalau user tanya "hari ini tanggal berapa", jawab persis dari KONTEKS WAKTU.
- Hitung "kemarin", "besok", "bulan ini", "akhir bulan", "jatuh tempo x hari lagi", dsb. dari tanggal tersebut, dan sebutkan tanggalnya secara eksplisit (contoh: Kamis, 6 Agustus 2026).`;

const waktuKonteks = (): string => {
  const now = new Date();
  const wita = new Date(now.getTime() + 8 * 3600 * 1000);
  const hari = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"][wita.getUTCDay()];
  const bulanArr = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
  const d = wita.getUTCDate();
  const m = wita.getUTCMonth();
  const y = wita.getUTCFullYear();
  const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const jam = `${String(wita.getUTCHours()).padStart(2, "0")}:${String(wita.getUTCMinutes()).padStart(2, "0")}`;
  const akhirBulan = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return [
    "KONTEKS WAKTU (akurat, wajib dipakai):",
    `- Hari ini: ${hari}, ${d} ${bulanArr[m]} ${y} (${iso}), pukul ${jam} WITA.`,
    `- Bulan berjalan: ${bulanArr[m]} ${y} (1 s/d ${akhirBulan} ${bulanArr[m]} ${y}).`,
    `- Tahun berjalan: ${y}. Kuartal: Q${Math.floor(m / 3) + 1}.`,
    "Abaikan asumsi tanggal apa pun dari pengetahuan internalmu.",
  ].join("\n");
};

const TOOLS = [
  {
    type: "function",
    function: {
      name: "cari_data",
      description:
        "Cari data debitur / dokumen di seluruh database Bluebook Telihan berdasarkan kata kunci (nama debitur, nomor rekening/L0LNNO, nomor PK, nomor SPPK, nomor KK, nomor MPAK, nomor surat, nomor agenda, nomor loan, atau nama pengirim/penerima surat). Melakukan pencarian case-insensitive partial match di tabel MLF, agenda_kredit, SPPK, PK, KK/MPAK, nomor_loan, surat_masuk, surat_keluar, call_memo, kontak_debitur, dan wa_reminder_log.",
      parameters: {
        type: "object",
        properties: {
          keyword: {
            type: "string",
            description: "Kata kunci pencarian (nama, nomor rekening, nomor dokumen, dll)",
          },
        },
        required: ["keyword"],
      },
    },
  },
];

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

async function cariData(keyword: string): Promise<Record<string, unknown>> {
  const kw = keyword.trim();
  if (!kw) return { error: "keyword kosong" };
  const like = `%${kw}%`;
  const LIMIT = 8;

  const [
    mlf,
    agenda,
    sppk,
    pk,
    kkmpak,
    loan,
    sMasuk,
    sKeluar,
    callMemo,
    kontak,
    waLog,
  ] = await Promise.all([
    supabase
      .from("mlf_data")
      .select("l0lnno,l0name,brcd,brname,kol,pla,baki,tungpk,tungbg,jobdate,ecname,date1")
      .or(`l0name.ilike.${like},l0lnno.ilike.${like},ecname.ilike.${like}`)
      .order("jobdate", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("agenda_kredit_entry")
      .select("nomor_agenda,kode_surat,nomor_surat_masuk,nama_pengirim,perihal,status,tanggal_masuk")
      .or(`nama_pengirim.ilike.${like},perihal.ilike.${like},nomor_surat_masuk.ilike.${like},nomor_agenda.ilike.${like}`)
      .order("tanggal_masuk", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("sppk")
      .select("nomor_sppk,nama_debitur,jenis_kredit,plafon,jangka_waktu,type,tanggal,marketing")
      .or(`nama_debitur.ilike.${like},nomor_sppk.ilike.${like}`)
      .order("tanggal", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("pk")
      .select("nomor_pk,nama_debitur,jenis_kredit,plafon,jangka_waktu,type,tanggal")
      .or(`nama_debitur.ilike.${like},nomor_pk.ilike.${like}`)
      .order("tanggal", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("kkmpak")
      .select("nomor_kk,nomor_mpak,nama_debitur,jenis_kredit,plafon,jangka_waktu,type,tanggal")
      .or(`nama_debitur.ilike.${like},nomor_kk.ilike.${like},nomor_mpak.ilike.${like}`)
      .order("tanggal", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("nomor_loan")
      .select("nomor_loan,nama_debitur,nomor_pk,jenis_kredit,produk_kredit,plafon,jangka_waktu,unit_kerja,created_at")
      .or(`nama_debitur.ilike.${like},nomor_loan.ilike.${like},nomor_pk.ilike.${like}`)
      .order("created_at", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("surat_masuk")
      .select("nomor_agenda,kode_surat,nomor_surat_masuk,nama_pengirim,perihal,tanggal_masuk,status")
      .or(`nama_pengirim.ilike.${like},perihal.ilike.${like},nomor_surat_masuk.ilike.${like},nomor_agenda.ilike.${like}`)
      .order("tanggal_masuk", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("surat_keluar")
      .select("nomor_agenda,kode_surat,nama_penerima,perihal,tanggal,status,ojk_status")
      .or(`nama_penerima.ilike.${like},perihal.ilike.${like},nomor_agenda.ilike.${like}`)
      .order("tanggal", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("call_memo_penagihan")
      .select("tanggal,jam,l0lnno,nama_debitur,no_hp,produk,total_tunggakan,jenis_aktivitas,hasil,status_komitmen,petugas_penagih")
      .or(`nama_debitur.ilike.${like},l0lnno.ilike.${like},no_hp.ilike.${like}`)
      .order("tanggal", { ascending: false })
      .limit(LIMIT),
    supabase
      .from("debitur_kontak")
      .select("l0lnno,nama,no_hp,catatan,updated_at,updated_by")
      .or(`nama.ilike.${like},l0lnno.ilike.${like},no_hp.ilike.${like}`)
      .limit(LIMIT),
    supabase
      .from("wa_reminder_log")
      .select("l0lnno,nama,no_hp,metode,status,kol,tunggakan,sent_at")
      .or(`nama.ilike.${like},l0lnno.ilike.${like},no_hp.ilike.${like}`)
      .order("sent_at", { ascending: false })
      .limit(LIMIT),
  ]);

  const pick = (r: { data: unknown; error: unknown }) => (r.error ? { error: String(r.error) } : r.data);

  return {
    keyword: kw,
    hasil: {
      mlf_data: pick(mlf),
      agenda_kredit: pick(agenda),
      sppk: pick(sppk),
      pk: pick(pk),
      kk_mpak: pick(kkmpak),
      nomor_loan: pick(loan),
      surat_masuk: pick(sMasuk),
      surat_keluar: pick(sKeluar),
      call_memo: pick(callMemo),
      kontak_debitur: pick(kontak),
      wa_reminder_log: pick(waLog),
    },
  };
}

async function callGateway(body: unknown): Promise<Response> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY")!;
  return fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "raw-fetch",
    },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!Deno.env.get("LOVABLE_API_KEY")) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "messages must be an array" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const model = "google/gemini-2.5-flash";
    const convo: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "system", content: waktuKonteks() },
      ...messages,
    ];

    // Tool-call loop (non-stream). Max 3 iterations.
    for (let iter = 0; iter < 3; iter++) {
      const res = await callGateway({ model, messages: convo, tools: TOOLS });
      if (!res.ok) {
        const text = await res.text();
        const status = res.status === 429 ? 429 : res.status === 402 ? 402 : 500;
        return new Response(
          JSON.stringify({
            error:
              status === 429
                ? "Terlalu banyak permintaan. Coba lagi sebentar."
                : status === 402
                ? "Kredit AI habis. Silakan top up di workspace settings."
                : text || "Gagal menghubungi AI Gateway",
          }),
          { status, headers: { "Content-Type": "application/json", ...corsHeaders } },
        );
      }
      const json = await res.json();
      const msg = json?.choices?.[0]?.message;
      if (!msg) break;

      const toolCalls = msg.tool_calls;
      if (toolCalls && toolCalls.length > 0) {
        convo.push(msg);
        for (const tc of toolCalls) {
          let result: unknown;
          try {
            const args = JSON.parse(tc.function?.arguments ?? "{}");
            if (tc.function?.name === "cari_data") {
              result = await cariData(args.keyword ?? "");
            } else {
              result = { error: `unknown tool ${tc.function?.name}` };
            }
          } catch (e) {
            result = { error: String(e) };
          }
          convo.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
        continue; // loop for follow-up
      }

      // No tool call → stream final answer.
      break;
    }

    // Final streaming call (no tools — model already decided).
    const upstream = await callGateway({ model, messages: convo, stream: true });
    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      return new Response(JSON.stringify({ error: text || "Gagal streaming" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let idx: number;
            while ((idx = buffer.indexOf("\n")) !== -1) {
              const line = buffer.slice(0, idx).trim();
              buffer = buffer.slice(idx + 1);
              if (!line.startsWith("data:")) continue;
              const payload = line.slice(5).trim();
              if (payload === "[DONE]") {
                controller.close();
                return;
              }
              try {
                const j = JSON.parse(payload);
                const delta = j?.choices?.[0]?.delta?.content;
                if (delta) controller.enqueue(encoder.encode(delta));
              } catch {
                /* ignore */
              }
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
      cancel() {
        reader.cancel().catch(() => {});
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
        ...corsHeaders,
      },
    });
  } catch (err) {
    console.error("biru-chat error", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
