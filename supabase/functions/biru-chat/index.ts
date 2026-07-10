// BIRU — Bluebook Intelligent Response Unit
// Streaming chat via Lovable AI Gateway (OpenAI-compatible)
import "https://deno.land/x/xhr@0.1.0/mod.ts";

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

# Peta Menu Bluebook Telihan
- **Dashboard** (\`/dashboard\`) — ringkasan metrik realtime.
- **Surat Masuk / Keluar** (\`/surat-masuk\`, \`/surat-keluar\`) — arsip korespondensi.
- **Agenda Kredit** (\`/agenda-kredit/*\`) — SPPK, PK, KK/MPAK Telihan & Meranti, generator Nomor Loan.
- **Monitoring KKR & NPL** (\`/monitoring/*\`) — Upload MLF, Dashboard, Export PDF, Kontak Debitur, Reminder WA, Call Memo. Deteksi fasilitas baru cair & baru lunas dari perbandingan MLF.
- **Kalkulator Loan** (\`/kalkulator\` konsumtif, \`/kalkulator/produktif\`, \`/kalkulator/riwayat\`) — simulasi angsuran, promo CERDAS (subsidi premi asuransi jiwa), export JPG hasil simulasi.
- **ATM Telihan** (\`/atm-telihan/*\`) — database pengisian, Berita Acara, penyelesaian selisih.
- **Security / Satpam** (\`/security/*\`) — log shift, BA harian, audit publik lewat QR.
- **Customer Service** (\`/cs/*\`) — CIF, Rekening (Simpeda, Simpeda iB, Prama, Simpel, Tabunganku, Giro, Alamin, Taspen), SI, Kartu ATM, Buku Tabungan, Bilyet Deposito.
- **Konfigurasi** (\`/konfigurasi/*\`) — Users, Jenis Kredit/Debitur/Penggunaan, Sektor Ekonomi, Kondisi Kantor, Produk Kalkulator, Usia Pensiun, Program CERDAS, Promo Kalkulator.
- **Lainnya** — Recycle Bin, Activity Log, Panduan (\`/panduan\`), About (\`/about\`), Install PWA (\`/install\`), Global Search (Ctrl+K).

# Rumus Kalkulator Konsumtif (angsuran flat / anuitas)
- **Anuitas bulanan**: \`Angsuran = P × (i × (1+i)^n) / ((1+i)^n − 1)\` — P=plafon, i=bunga bulanan (bunga tahunan / 12), n=tenor bulan.
- **Flat**: \`Angsuran = P/n + P × i_tahunan / 12\`.
- **Premi Asuransi Jiwa** bisa disubsidi lewat Program CERDAS; Asuransi Kredit tidak disubsidi.
- **Take Home Pay minimum** biasanya ≥ Angsuran + kebutuhan hidup; rasio angsuran/penghasilan idealnya ≤ 40–50%.

# Gaya Menjawab
- **Ringkas dulu**, elaborasi kalau ditanya lebih.
- Kalau ditanya tentang **data spesifik debitur / MLF terkini**, jelaskan kamu belum bisa akses database langsung di versi ini — arahkan user ke menu terkait (misal Monitoring Dashboard, Kontak Debitur).
- Kalau ditanya di luar konteks perbankan/aplikasi (misal resep masakan, coding umum), tetap bantu dengan sopan tapi singkat.
- Kalau user minta hitungan, **tampilkan input, rumus, dan hasil** dalam format terstruktur.
- Jangan pernah mengaku sebagai model AI merek tertentu. Kamu adalah **BIRU**.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
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

    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "raw-fetch",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        stream: true,
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text();
      const status = upstream.status === 429 ? 429 : upstream.status === 402 ? 402 : 500;
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

    // Transform OpenAI SSE stream into plain text token stream.
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    let buffer = "";

    const stream = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read();
          if (done) {
            controller.close();
            return;
          }
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
              const json = JSON.parse(payload);
              const delta = json?.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              /* ignore partial */
            }
          }
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
