import { Check } from "lucide-react";

const ExplainerSection = () => {
  const steps = [
    {
      number: "01",
      title: "Autentikasi & Otorisasi",
      description:
        "Login dengan akun yang telah disetujui admin. Menu dan hak akses menyesuaikan peran pengguna secara otomatis.",
      highlights: ["Approval workflow", "Hak akses per role", "Auto logout 1 jam"],
    },
    {
      number: "02",
      title: "Operasional Harian",
      description:
        "Registrasi surat, agenda kredit, simulasi, pengisian ATM, monitoring NPL, layanan Customer Service, dan log security dari satu portal.",
      highlights: ["Penomoran otomatis", "Berita acara siap cetak", "Notifikasi per role"],
    },
    {
      number: "03",
      title: "Pelaporan & Audit",
      description:
        "Dashboard real-time, ekspor Excel dan PDF terformat, global search, activity log, serta recycle bin untuk dokumentasi penuh.",
      highlights: ["Statistik realtime", "Audit trail", "Recycle bin"],
    },
  ];

  return (
    <section className="bg-slate-50 py-20 lg:py-28 border-y border-slate-200">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mb-12">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-3">
            Alur Penggunaan
          </div>
          <h2 className="text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">
            Tiga tahap kerja yang terstandar
          </h2>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            Dari otentikasi, operasional harian, hingga pelaporan — seluruh proses terdokumentasi.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {steps.map((step) => (
            <div key={step.number} className="rounded-lg border border-slate-200 bg-white p-7">
              <div className="text-sm font-semibold text-brand-primary mb-4">{step.number}</div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">{step.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-5">{step.description}</p>
              <ul className="space-y-2 border-t border-slate-200 pt-4">
                {step.highlights.map((highlight) => (
                  <li key={highlight} className="flex items-center gap-2 text-sm text-slate-700">
                    <Check className="h-4 w-4 shrink-0 text-brand-primary" />
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExplainerSection;
