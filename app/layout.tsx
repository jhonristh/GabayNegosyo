import "../styles/globals.css";
// K2: self-hosted via @fontsource (npm-bundled WOFF2 files, no runtime
// fetch to fonts.googleapis.com / fonts.gstatic.com at build or request
// time — more robust than next/font/google, which still makes a live
// network call to Google during `next build`). Only the weights actually
// used in styles/globals.css are imported (D2) — see docs/V0.3_STATUS.md.
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/space-grotesk/500.css";
import "@fontsource/space-grotesk/600.css";
import ClientProviders from "../components/ClientProviders";
import { siteConfig } from "../lib/siteConfig";
import { Analytics } from "@vercel/analytics/react";

export const metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: "GabayNegosyo: Your guide to business compliance",
    template: "%s: GabayNegosyo",
  },
  description:
    "GabayNegosyo helps Philippine micro-entrepreneurs understand and track BIR compliance requirements, with SSS, PhilHealth, Pag-IBIG and LGU coverage as outline content.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: "GabayNegosyo: Your guide to business compliance",
    description: "Turn scattered BIR compliance requirements into one personalized checklist.",
    url: siteConfig.siteUrl,
    siteName: "GabayNegosyo",
    images: [{ url: "/icons/og-image.png", width: 1200, height: 630 }],
    locale: "en_PH",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GabayNegosyo: Your guide to business compliance",
    description: "Turn scattered BIR compliance requirements into one personalized checklist.",
    images: ["/icons/og-image.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  // K1: no maximumScale — pinch-zoom must never be blocked (accessibility).
  viewportFit: "cover",
  themeColor: "#2E5E4E",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </head>
      <body>
        <div className="app-shell">
          <ClientProviders>{children}</ClientProviders>
        </div>
        <Analytics />
      </body>
    </html>
  );
}
