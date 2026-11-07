import type { NextConfig } from "next";

const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

// Empêche d'intégrer les pages (connexion, tableau de bord) dans une iframe d'un autre site.
const noFramingHeaders = [{ key: "X-Frame-Options", value: "SAMEORIGIN" }];

// Visionneuse intégrable (/embed/...) : page publique en lecture seule, autorisée dans n'importe quelle iframe.
// Quand deux règles posent la même clé, la dernière l'emporte : X-Frame-Options ne doit donc
// jamais être posé sur /embed, d'où l'exclusion dans la règle générale.
const embedHeaders = [{ key: "Content-Security-Policy", value: "frame-ancestors *" }];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: baseSecurityHeaders },
      { source: "/:path((?!embed(?:/|$)).*)", headers: noFramingHeaders },
      { source: "/embed/:path*", headers: embedHeaders },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.pinimg.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
