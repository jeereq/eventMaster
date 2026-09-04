import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter, Geist_Mono, Fraunces } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { PlatformSiteProvider } from "@/context/PlatformSiteContext";
import PWARegister from "@/components/PWARegister";
import { PwaInstallProvider } from "@/context/PwaInstallContext";
import ViewPreferencesBridge from "@/components/ViewPreferencesBridge";
import MaintenanceOverlay from "@/components/MaintenanceOverlay";
import BrandFaviconSync from "@/components/BrandFaviconSync";
import GlobalAiSimulatorFab from "@/components/GlobalAiSimulatorFab";
import MobileSplashScreen from "@/components/MobileSplashScreen";
import { fetchPublicSiteSnapshot, resolveMetadataBase } from "@/lib/publicSiteServer";

/** Inter ≈ substitut open-source de TWK Lausanne / Asana Sans (UI produit Asana). */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

/** Display Celebrate — titres landing / RSVP / auth. */
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
      statusBarStyle: 'black-translucent',
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
      </head>
      <body className={`${inter.className} min-h-full flex flex-col font-sans bg-background text-foreground`}>
        <Script
          id="theme-boot"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light')document.documentElement.classList.remove('dark');else document.documentElement.classList.add('dark');}catch(e){document.documentElement.classList.add('dark');}})();`,
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
              <PwaInstallProvider>
                <ViewPreferencesBridge>
                  <BrandFaviconSync />
                  <PWARegister />
                  <MobileSplashScreen />
                  <MaintenanceOverlay />
                  <Suspense fallback={null}>
                    {children}
                  </Suspense>
                  <Suspense fallback={null}>
                    <GlobalAiSimulatorFab />
                  </Suspense>
                </ViewPreferencesBridge>
              </PwaInstallProvider>
            </AuthProvider>
          </PlatformSiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
