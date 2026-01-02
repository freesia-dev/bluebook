import React from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, Heart, Instagram, Linkedin } from 'lucide-react';

const About: React.FC = () => {
  return (
    <MainLayout>
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="max-w-md text-center shadow-xl">
          <CardContent className="pt-10 pb-8 px-8">
            <div className="w-20 h-20 mx-auto rounded-2xl gradient-primary flex items-center justify-center mb-6 shadow-glow">
              <BookOpen className="w-10 h-10 text-primary-foreground" />
            </div>
            <h1 className="font-display text-3xl font-bold text-foreground mb-2">Bluebook Telihan</h1>
            <p className="text-lg text-muted-foreground mb-6 italic">"Digital Logbook Bankaltimtara KCP Telihan"</p>
            <div className="h-px bg-border my-6" />
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              Dibuat dengan <Heart className="w-4 h-4 text-destructive fill-destructive" /> oleh
            </p>
            <p className="font-display text-xl font-semibold text-foreground mt-2">Haris Fadilah</p>
            <div className="flex items-center justify-center gap-4 mt-4">
              <a 
                href="https://instagram.com/va.ys" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Instagram className="w-6 h-6" />
              </a>
              <a 
                href="https://www.linkedin.com/in/harisf/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Linkedin className="w-6 h-6" />
              </a>
            </div>
            <p className="text-muted-foreground mt-4">© 2025</p>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default About;
