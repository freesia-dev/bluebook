import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, Instagram, Linkedin, FileText, CreditCard, Users, Shield, Sparkles } from 'lucide-react';
import logoImage from '@/assets/logo_bluebook.png';

const features = [
  {
    icon: FileText,
    title: 'Manajemen Surat',
    description: 'Kelola surat masuk dan keluar dengan mudah dan terorganisir'
  },
  {
    icon: CreditCard,
    title: 'Agenda Kredit',
    description: 'Pantau SPPK, PK, KK/MPAK, dan Nomor Loan dalam satu platform'
  },
  {
    icon: Users,
    title: 'Multi-User',
    description: 'Kolaborasi tim dengan sistem role Admin, User, dan Demo'
  },
  {
    icon: Shield,
    title: 'Aman & Terpercaya',
    description: 'Data tersimpan dengan aman di cloud dengan backup otomatis'
  }
];

const About: React.FC = () => {
  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="relative inline-block">
            <img 
              src={logoImage} 
              alt="Bluebook Logo" 
              className="w-32 h-32 mx-auto mb-6 object-contain drop-shadow-2xl"
            />
            <Sparkles className="absolute -top-2 -right-2 w-6 h-6 text-primary animate-pulse" />
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-4">
            Bluebook Telihan
          </h1>
          <p className="text-xl text-muted-foreground italic mb-6">
            "In Bluebook we Trust!"
          </p>
          <div className="max-w-2xl mx-auto">
            <p className="text-muted-foreground leading-relaxed">
              Bluebook adalah sistem <strong className="text-foreground">Digital Logbook</strong> yang dirancang khusus untuk 
              <strong className="text-foreground"> Bank Kaltimtara KCP Telihan</strong>. Aplikasi ini membantu mengelola 
              administrasi surat-menyurat dan agenda kredit secara digital, efisien, dan terintegrasi.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
          {features.map((feature, index) => (
            <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-muted hover:border-primary/30">
              <CardContent className="p-6 flex gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Creator Section */}
        <Card className="text-center shadow-xl overflow-hidden">
          <div className="h-2 bg-gradient-to-r from-primary via-secondary to-primary" />
          <CardContent className="py-8 px-6">
            <p className="text-muted-foreground flex items-center justify-center gap-2 mb-2">
              Dibuat dengan <Heart className="w-4 h-4 text-destructive fill-destructive animate-pulse" /> oleh
            </p>
            <p className="font-display text-2xl font-bold text-foreground mb-4">Haris Fadilah</p>
            <div className="flex items-center justify-center gap-4 mb-6">
              <a 
                href="https://instagram.com/va.ys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="https://www.linkedin.com/in/harisf/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:bg-primary hover:text-primary-foreground transition-all duration-300"
              >
                <Linkedin className="w-5 h-5" />
              </a>
            </div>
            <div className="h-px bg-border my-4" />
            <p className="text-sm text-muted-foreground">
              © 2025 Bluebook Telihan. All rights reserved.
            </p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default About;