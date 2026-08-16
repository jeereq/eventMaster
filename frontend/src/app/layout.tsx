import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { PlatformSiteProvider } from "@/context/PlatformSiteContext";
import PWARegister from "@/components/PWARegister";
import ViewPreferencesBridge from "@/components/ViewPreferencesBridge";
import MaintenanceOverlay from "@/components/MaintenanceOverlay";
import BrandFaviconSync from "@/components/BrandFaviconSync";

/** Inter ≈ substitut open-source de TWK Lausanne / Asana Sans (UI produit Asana). */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4f46e5' },
    { media: '(prefers-color-scheme: dark)', color: '#4f46e5' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "EventMaster - SaaS de gestion d'événements privés",
  description: "Plateforme SaaS Multi-tenant d'organisation d'événements, RSVP et invitations personnalisées",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "EventMaster",
  },
  icons: {
    icon: [
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      }
    ],
    apple: [
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      }
    ]
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${inter.variable} ${geistMono.variable} h-full antialiased dark`} suppressHydrationWarning>
      <body className={`${inter.className} min-h-full flex flex-col font-sans bg-background text-foreground transition-colors duration-200`}>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[10000] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-primary focus:text-white focus:text-sm focus:font-medium"
        >
          Aller au contenu
        </a>
        <ThemeProvider>
          <PlatformSiteProvider>
            <AuthProvider>
              <ViewPreferencesBridge>
                <BrandFaviconSync />
                <PWARegister />
                <MaintenanceOverlay />
                {children}
              </ViewPreferencesBridge>
            </AuthProvider>
          </PlatformSiteProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
