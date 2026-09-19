import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { StudioJobsProvider } from "@/context/StudioJobsContext";
import StudioJobsDock from "@/components/StudioJobsDock";
import { ThemeProvider } from "@/context/ThemeContext";
import { PlatformSiteProvider } from "@/context/PlatformSiteContext";
import PWARegister from "@/components/PWARegister";
import { PwaInstallProvider } from "@/context/PwaInstallContext";
import ViewPreferencesBridge from "@/components/ViewPreferencesBridge";
import MaintenanceOverlay from "@/components/MaintenanceOverlay";
import BrandFaviconSync from "@/components/BrandFaviconSync";
import GlobalAiSimulatorFabHost from "@/components/GlobalAiSimulatorFabHost";
import MobileSplashScreen from "@/components/MobileSplashScreen";
import NavigationProgressBar from "@/components/NavigationProgressBar";
import NavigationScrollTop from "@/components/NavigationScrollTop";
import SessionExpiredDialog from "@/components/SessionExpiredDialog";
import AiTokenShortageAlert from "@/components/AiTokenShortageAlert";
import { fetchPublicSiteSnapshot, resolveMetadataBase } from "@/lib/publicSiteServer";

/** Inter ≈ substitut open-source de TWK Lausanne / Asana Sans (UI produit Asana). */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

/** Display Celebrate — titres landing / réponse à l’invitation / auth. */
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  weight: ["600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
  preload: false,
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#059669' },
    { media: '(prefers-color-scheme: dark)', color: '#10b981' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export async function generateMetadata(): Promise<Metadata> {
  const site = await fetchPublicSiteSnapshot();
  const title = `${site.platformName} — ${site.platformTagline}`;
  const origin = await resolveMetadataBase();

  return {
    metadataBase: origin,
    title,
    description: site.description,
    applicationName: site.platformName,
    openGraph: {
      type: 'website',
      locale: 'fr_FR',
      url: '/',
      siteName: site.platformName,
      title,
      description: site.description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: site.description,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'default',
      title: site.platformName.length > 12 ? site.platformName.slice(0, 12) : site.platformName,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        {/* Critical : splash avant CSS/JS bundle — bloque le flash noir (surtout dark / PWA). */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
#em-native-splash{position:fixed;inset:0;z-index:2147483000;display:none;flex-direction:column;align-items:center;justify-content:center;padding:max(2rem,env(safe-area-inset-top)) 1.5rem max(1.5rem,env(safe-area-inset-bottom));background:#f6f7f8;background-image:radial-gradient(120% 80% at 50% 18%,rgba(5,150,105,.22),transparent 58%);color:#1e1f21;font-family:system-ui,-apple-system,sans-serif;transition:opacity .28s ease}
#em-native-splash.is-on{display:flex!important}
#em-native-splash.is-leaving{opacity:0;pointer-events:none}
#em-native-splash .em-ns-mark{width:4rem;height:4rem;border-radius:1.25rem;overflow:hidden;background:#fff;box-shadow:0 10px 28px rgba(0,0,0,.12)}
#em-native-splash .em-ns-mark img{width:100%;height:100%;display:block}
#em-native-splash .em-ns-title{margin:.9rem 0 0;font-size:1.25rem;font-weight:650;letter-spacing:-.02em;text-align:center}
#em-native-splash .em-ns-spin{margin-top:1rem;width:1.75rem;height:1.75rem;border-radius:999px;border:2px solid rgba(5,150,105,.28);border-top-color:#059669;animation:em-ns-spin .7s linear infinite}
#em-native-splash .em-ns-skip{margin-top:.85rem;min-height:2.75rem;padding:0 1rem;border:0;background:transparent;color:#6d6e6f;font-size:.875rem;font-weight:500;cursor:pointer}
@keyframes em-ns-spin{to{transform:rotate(360deg)}}
@media (prefers-reduced-motion:reduce){#em-native-splash .em-ns-spin{animation:none;border-top-color:rgba(5,150,105,.28)}#em-native-splash{transition:none}}
html.em-splash-boot,html.em-splash-boot body{background:#f6f7f8!important;overflow:hidden}
@media (min-width: 768px){#em-native-splash{display:none!important}html.em-splash-boot,html.em-splash-boot body{overflow:auto!important;background:inherit!important}}
`.replace(/\n/g, ''),
          }}
        />
      </head>
      <body className={`${inter.className} min-h-full flex flex-col font-sans bg-background text-foreground`}>
        <div id="em-native-splash" hidden aria-hidden="true" role="dialog" aria-modal="true" aria-label="EventMaster">
          <span className="em-ns-mark">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" width={64} height={64} />
          </span>
          <p className="em-ns-title">EventMaster</p>
          <span className="em-ns-spin" aria-hidden="true" />
          <button id="em-native-splash-skip" type="button" className="em-ns-skip">
            Passer
          </button>
        </div>
        {/* Inline juste après le shell : le nœud existe déjà (évite getElementById null). */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var isDesktop=window.innerWidth>=768||window.matchMedia('(min-width:768px)').matches;var narrow=window.matchMedia('(max-width:767px)').matches;var standalone=(window.matchMedia('(display-mode:standalone)').matches||!!(navigator&&navigator.standalone))&&!isDesktop;var force=false;var seen=false;try{force=sessionStorage.getItem('em_force_splash')==='1';seen=sessionStorage.getItem('em_mobile_splash_seen_v1')==='1';}catch(e){}var need=!isDesktop&&(narrow||standalone)&&(force||!seen);var splash=document.getElementById('em-native-splash');var skip=document.getElementById('em-native-splash-skip');function dismiss(){try{if(splash){splash.classList.remove('is-on');splash.hidden=true;}document.documentElement.classList.remove('em-splash-boot');sessionStorage.setItem('em_mobile_splash_seen_v1','1');sessionStorage.removeItem('em_force_splash');}catch(e){}}if(skip){skip.onclick=dismiss;}if(need){document.documentElement.classList.add('em-splash-boot');window.__emPendingDark=(t==='dark');if(splash){splash.hidden=false;splash.classList.add('is-on');splash.setAttribute('aria-hidden','false');}setTimeout(dismiss,2200);}else{dismiss();if(t==='dark'){document.documentElement.classList.add('dark');}else{document.documentElement.classList.remove('dark');}}}catch(e){try{document.documentElement.classList.remove('dark');}catch(x){}}})();`,
          }}
        />
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[10000] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary-solid focus:text-primary-foreground focus:text-sm focus:font-medium"
        >
          Aller au contenu
        </a>
        <ThemeProvider>
          <PlatformSiteProvider>
            <AuthProvider>
              <StudioJobsProvider>
              <SessionExpiredDialog />
              <AiTokenShortageAlert />
              <PwaInstallProvider>
                <ViewPreferencesBridge>
                  <BrandFaviconSync />
                  <PWARegister />
                  <MobileSplashScreen />
                  <MaintenanceOverlay />
                  <Suspense fallback={null}>
                    <NavigationProgressBar />
                    <NavigationScrollTop />
                  </Suspense>
                  <Suspense fallback={null}>
                    {children}
                  </Suspense>
                  <Suspense fallback={null}>
                    <GlobalAiSimulatorFabHost />
                  </Suspense>
                  <StudioJobsDock />
                </ViewPreferencesBridge>
              </PwaInstallProvider>
              </StudioJobsProvider>
            </AuthProvider>
          </PlatformSiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
