import logo from "@/assets/logo_bluebook.png";

const FooterSection = () => {
  return (
    <footer className="border-t border-white/10 bg-slate-950 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white p-1.5">
                <img src={logo} alt="Logo Bluebook Telihan" className="h-full w-full object-contain" />
              </div>
              <div>
                <div className="text-base font-semibold text-white">Bluebook Telihan</div>
                <div className="text-xs text-slate-500">Digital Logbook System</div>
              </div>
            </div>
            <p className="mt-5 text-sm leading-relaxed text-slate-400">
              Aplikasi internal Bankaltimtara KCP Telihan untuk pengelolaan administrasi, agenda kredit,
              dan pelaporan operasional.
            </p>
          </div>

          <div className="flex flex-col gap-3 text-sm">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Tautan
            </div>
            <a href="#features" className="text-slate-400 transition-colors hover:text-white">
              Fitur
            </a>
            <a href="/panduan" className="text-slate-400 transition-colors hover:text-white">
              Panduan
            </a>
            <a href="/install" className="text-slate-400 transition-colors hover:text-white">
              Install Aplikasi
            </a>
            <a href="/login" className="text-slate-400 transition-colors hover:text-white">
              Login Pegawai
            </a>
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-white/10 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} Bluebook Telihan. All rights reserved.</span>
          <span>Aplikasi internal — Bankaltimtara KCP Telihan</span>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
