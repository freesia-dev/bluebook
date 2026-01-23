import logo from "@/assets/logo_bluebook.png";

const FooterSection = () => {
  return (
    <footer className="py-16 bg-slate-950">
      <div className="container mx-auto px-4">
        <div className="flex flex-col items-center text-center">
          {/* Logo and name */}
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 rounded-xl bg-white/10 p-3 flex items-center justify-center">
              <img 
                src={logo} 
                alt="Bluebook Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-left">
              <span className="text-2xl font-bold text-white block">
                Bluebook Telihan
              </span>
              <span className="text-sm text-slate-400">
                Digital Logbook System
              </span>
            </div>
          </div>

          {/* Tagline */}
          <p className="text-brand-secondary font-medium text-lg mb-6">
            "In Bluebook we Trust!"
          </p>

          {/* Description */}
          <p className="text-slate-400 max-w-md mb-8">
            Aplikasi Internal – Bankaltimtara KCP Telihan. 
            Sistem digital untuk pengelolaan administrasi dan agenda kredit.
          </p>

          {/* Links */}
          <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm">
            <a href="#features" className="text-slate-400 hover:text-white transition-colors">
              Fitur
            </a>
            <a href="/panduan" className="text-slate-400 hover:text-white transition-colors">
              Panduan
            </a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">
              Kebijakan Privasi
            </a>
            <a href="#" className="text-slate-400 hover:text-white transition-colors">
              Hubungi Kami
            </a>
          </div>

          {/* Divider */}
          <div className="w-full max-w-md h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent mb-8" />

          {/* Copyright */}
          <p className="text-sm text-slate-500">
            © {new Date().getFullYear()} Bluebook Telihan. All rights reserved.
          </p>
          <p className="text-xs text-slate-600 mt-2">
            Dibangun dengan ❤️ untuk Bankaltimtara KCP Telihan
          </p>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
