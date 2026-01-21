import { Star, Quote, TrendingUp, Users, FileCheck, Clock } from "lucide-react";

const SocialProofSection = () => {
  const testimonials = [
    {
      name: "Ahmad Ridwan",
      role: "Kepala Unit Kredit",
      quote: "Bluebook sangat membantu dalam mengelola agenda kredit. Proses yang dulunya memakan waktu berjam-jam kini bisa selesai dalam hitungan menit.",
      avatar: "AR"
    },
    {
      name: "Siti Rahayu",
      role: "Admin Operasional",
      quote: "Manajemen surat menjadi lebih terorganisir. Tidak ada lagi surat yang tercecer atau terlupakan.",
      avatar: "SR"
    },
    {
      name: "Budi Santoso",
      role: "Marketing",
      quote: "Dashboard yang informatif membantu saya memantau progress SPPK dan PK dengan mudah.",
      avatar: "BS"
    }
  ];

  const stats = [
    { icon: FileCheck, value: "500+", label: "Surat Dikelola", color: "text-blue-500" },
    { icon: Users, value: "15+", label: "Pengguna Aktif", color: "text-brand-secondary" },
    { icon: TrendingUp, value: "98%", label: "Tingkat Efisiensi", color: "text-green-500" },
    { icon: Clock, value: "24/7", label: "Akses Kapanpun", color: "text-purple-500" }
  ];

  return (
    <section className="py-24 lg:py-32 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-primary/5 rounded-full blur-3xl" />

      <div className="container mx-auto px-4 relative">
        {/* Section header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-2 rounded-full bg-brand-secondary/10 text-brand-secondary font-semibold text-sm mb-4">
            TESTIMONI & STATISTIK
          </span>
          <h2 className="text-3xl lg:text-5xl font-bold text-slate-900 mb-6">
            Dipercaya oleh{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-secondary">
              Tim KCP Telihan
            </span>
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            Lihat bagaimana Bluebook telah membantu meningkatkan efisiensi operasional
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 text-center group hover:-translate-y-1"
            >
              <div className={`w-12 h-12 mx-auto mb-4 rounded-xl bg-slate-100 flex items-center justify-center group-hover:scale-110 transition-transform ${stat.color}`}>
                <stat.icon className="w-6 h-6" />
              </div>
              <div className="text-3xl lg:text-4xl font-bold text-slate-900 mb-1">{stat.value}</div>
              <div className="text-sm text-slate-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 relative group hover:-translate-y-1"
            >
              {/* Quote icon */}
              <div className="absolute -top-4 -left-2 w-10 h-10 bg-gradient-to-br from-brand-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Quote className="w-5 h-5 text-white" />
              </div>

              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 fill-brand-secondary text-brand-secondary" />
                ))}
              </div>

              {/* Quote */}
              <p className="text-slate-600 leading-relaxed mb-6 italic">
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-primary to-blue-600 flex items-center justify-center text-white font-bold">
                  {testimonial.avatar}
                </div>
                <div>
                  <div className="font-semibold text-slate-900">{testimonial.name}</div>
                  <div className="text-sm text-slate-500">{testimonial.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Badge */}
        <div className="text-center mt-12">
          <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-brand-primary to-blue-600 text-white shadow-lg">
            <Star className="w-5 h-5 fill-brand-secondary text-brand-secondary" />
            <span className="font-semibold">Rated 5★ oleh pengguna internal</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SocialProofSection;
