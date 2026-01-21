import HeroSection from "@/components/landing/HeroSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import SocialProofSection from "@/components/landing/SocialProofSection";
import ExplainerSection from "@/components/landing/ExplainerSection";
import FinalCTASection from "@/components/landing/FinalCTASection";
import FooterSection from "@/components/landing/FooterSection";

const Index = () => {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <FeaturesSection />
      <SocialProofSection />
      <ExplainerSection />
      <FinalCTASection />
      <FooterSection />
    </div>
  );
};

export default Index;
