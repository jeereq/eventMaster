import SiteHeader from '@/components/SiteHeader';
import LandingHeroStreamlined from '@/components/landing/LandingHeroStreamlined';
import LandingBelowFold from '@/components/landing/LandingBelowFold';
import LandingMotion from '@/components/landing/LandingMotion';

export default function Home() {
  return (
    <div className="em-home flex flex-col min-h-screen bg-background text-foreground font-sans antialiased em-public-bottom-pad">
      <LandingMotion />
      <SiteHeader variant="landing" />
      <main id="main-content" className="flex-1 flex flex-col">
        <LandingHeroStreamlined />
        <LandingBelowFold />
      </main>
    </div>
  );
}
