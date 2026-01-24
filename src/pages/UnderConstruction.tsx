import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wrench, HardHat } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';

const UnderConstruction = () => {
  const navigate = useNavigate();

  return (
    <MainLayout>
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        {/* 3D Animated Construction Scene */}
        <div className="relative mb-8 perspective-1000">
          {/* Rotating Platform */}
          <div className="relative w-48 h-48 animate-float">
            {/* 3D Cone */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative preserve-3d animate-spin-slow">
                {/* Cone body */}
                <div className="w-24 h-32 relative">
                  {/* Orange stripes */}
                  <div 
                    className="absolute inset-0 rounded-t-full"
                    style={{
                      background: 'linear-gradient(180deg, #f97316 0%, #ea580c 50%, #c2410c 100%)',
                      clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
                      transform: 'rotateX(-10deg)',
                    }}
                  />
                  {/* White stripes */}
                  <div 
                    className="absolute top-[20%] left-[15%] right-[15%] h-3 bg-white/90 rounded-sm"
                    style={{ transform: 'rotateX(-5deg) skewY(-2deg)' }}
                  />
                  <div 
                    className="absolute top-[45%] left-[25%] right-[25%] h-2.5 bg-white/90 rounded-sm"
                    style={{ transform: 'rotateX(-5deg) skewY(-2deg)' }}
                  />
                  <div 
                    className="absolute top-[65%] left-[35%] right-[35%] h-2 bg-white/90 rounded-sm"
                    style={{ transform: 'rotateX(-5deg) skewY(-2deg)' }}
                  />
                </div>
                {/* Base */}
                <div 
                  className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-28 h-4 bg-gradient-to-b from-orange-800 to-orange-900 rounded-sm shadow-lg"
                  style={{ transform: 'rotateX(60deg)' }}
                />
              </div>
            </div>

            {/* Floating Tools */}
            <div className="absolute -left-8 top-8 animate-bounce-slow">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl shadow-lg flex items-center justify-center transform rotate-12 hover:rotate-0 transition-transform">
                <Wrench className="w-6 h-6 text-yellow-900" />
              </div>
            </div>

            <div className="absolute -right-8 top-12 animate-bounce-slower">
              <div className="w-14 h-14 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-xl shadow-lg flex items-center justify-center transform -rotate-12 hover:rotate-0 transition-transform">
                <HardHat className="w-7 h-7 text-yellow-800" />
              </div>
            </div>

            {/* Sparkles */}
            <div className="absolute -top-4 left-1/2 -translate-x-1/2">
              <div className="flex gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-ping" style={{ animationDelay: '0s' }} />
                <span className="w-1.5 h-1.5 bg-warning rounded-full animate-ping" style={{ animationDelay: '0.3s' }} />
                <span className="w-2 h-2 bg-primary rounded-full animate-ping" style={{ animationDelay: '0.6s' }} />
              </div>
            </div>
          </div>

          {/* Shadow */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-32 h-4 bg-black/10 dark:bg-black/30 rounded-full blur-md animate-pulse" />
        </div>

        {/* Text Content */}
        <div className="text-center space-y-4 max-w-md">
          <h1 className="text-4xl font-display font-bold text-foreground">
            🚧 Under Construction
          </h1>
          <p className="text-lg text-muted-foreground">
            Halaman ini sedang dalam pengembangan. Tim kami sedang bekerja keras untuk menghadirkan fitur terbaik untuk Anda!
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground/70">
            <span className="inline-block w-2 h-2 bg-warning rounded-full animate-pulse" />
            <span>Segera hadir...</span>
          </div>
        </div>

        {/* Back Button */}
        <Button 
          onClick={() => navigate(-1)} 
          variant="outline" 
          className="mt-8 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Button>
      </div>

      {/* Custom Styles */}
      <style>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        
        .preserve-3d {
          transform-style: preserve-3d;
        }
        
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotateY(0deg);
          }
          50% {
            transform: translateY(-15px) rotateY(10deg);
          }
        }
        
        @keyframes spin-slow {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(360deg);
          }
        }
        
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0px) rotate(12deg);
          }
          50% {
            transform: translateY(-10px) rotate(12deg);
          }
        }
        
        @keyframes bounce-slower {
          0%, 100% {
            transform: translateY(0px) rotate(-12deg);
          }
          50% {
            transform: translateY(-8px) rotate(-12deg);
          }
        }
        
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        
        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
        
        .animate-bounce-slower {
          animation: bounce-slower 2.5s ease-in-out infinite;
        }
      `}</style>
    </MainLayout>
  );
};

export default UnderConstruction;
