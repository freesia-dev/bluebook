import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Mail, Phone } from "lucide-react";

const FinalCTASection = () => {
  const navigate = useNavigate();

  return (
    <section className="bg-slate-950 py-20 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
          <div>
            <h2 className="text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-tight">
              Operasional kantor terdigitalisasi dalam satu portal
            </h2>
            <p className="mt-4 max-w-xl text-base text-slate-400 leading-relaxed">
              Akses Bluebook untuk menjalankan administrasi, agenda kredit, dan pelaporan operasional
              KCP Telihan secara terintegrasi.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="px-7 bg-brand-secondary text-slate-900 hover:bg-brand-secondary/90"
                onClick={() => navigate("/login")}
              >
                Login Pegawai
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <span className="text-sm text-slate-500">
                Akses terbatas untuk pegawai Bankaltimtara
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-6">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 mb-4">
              Kontak
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex items-center gap-3 text-slate-300">
                <Mail className="h-4 w-4 text-slate-500" />
                <span>kcptlh.143@gmail.com</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <Phone className="h-4 w-4 text-slate-500" />
                <span>Hubungi Admin KCP Telihan</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTASection;
