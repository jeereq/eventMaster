import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import PWARegister from "@/components/PWARegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
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
    <html lang="fr" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-200">
        <ThemeProvider>
          <AuthProvider>
            <PWARegister />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
