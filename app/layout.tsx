import "../styles/globals.css";
import ClientProviders from "../components/ClientProviders";

export const metadata = {
  metadataBase: new URL("https://gabaynegosyo.example"),
  title: {
    default: "GabayNegosyo — Your guide to business compliance",
    template: "%s — GabayNegosyo",
  },
  description:
    "GabayNegosyo helps Philippine micro-entrepreneurs understand and track BIR, SSS, PhilHealth, Pag-IBIG, and LGU compliance requirements.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
  openGraph: {
    title: "GabayNegosyo — Your guide to business compliance",
    description:
      "Turn scattered BIR, SSS, PhilHealth, Pag-IBIG, and LGU requirements into one personalized checklist.",
    url: "https://gabaynegosyo.example",
    siteName: "GabayNegosyo",
    images: [{ url: "/icons/og-image.png", width: 1200, height: 630 }],
    locale: "en_PH",
    type: "website",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <div className="app-shell">
          <ClientProviders>{children}</ClientProviders>
        </div>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js');
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
