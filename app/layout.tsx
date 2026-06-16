

// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Playfair_Display, DM_Sans } from "next/font/google";
import Script from "next/script";
import Providers from "./components/Providers";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import GoogleAnalytics from "./components/GoogleAnalytics";
import FaqWidget from "./components/FaqWidget";
import "./globals.css";

// ─── Fuentes con preload automático de Next.js ───────────────────────────────
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

// ─── Viewport separado (Next.js 14+ lo exige fuera de metadata) ──────────────
export const viewport: Viewport = {
  themeColor: "#1e3a5f",
  width: "device-width",
  initialScale: 1,
};

// ─── Metadata completo ────────────────────────────────────────────────────────
export const metadata: Metadata = {
  metadataBase: new URL("https://empatiadigital.com.ar"),

  title: {
    default: "Empatía Digital",
    template: "%s | Empatía Digital",
  },
  description:
    "Plataforma de educación en IA, bienestar digital y seguridad tecnológica. Aprendé a usar la tecnología con conciencia.",
  keywords: ["empatía digital", "IA", "inteligencia artificial", "bienestar digital", "educación online", "seguridad digital"],
  authors: [{ name: "Gabriel", url: "https://empatiadigital.com.ar" }],
  creator: "Empatía Digital",
  publisher: "Empatía Digital",
  icons: {
    icon: "./icon.png",
  },

  // ─── Open Graph ─────────────────────────────────────────────────────────────
  openGraph: {
    type: "website",
    locale: "es_AR",
    url: "https://empatiadigital.com.ar",
    siteName: "Empatía Digital",
    title: "Empatía Digital",
    description:
      "Aprendé a usar la IA y la tecnología con conciencia y seguridad.",
    images: [
      {
        url: "./icon.png",
        width: 1200,
        height: 630,
        alt: "Empatía Digital – Educación y tecnología con propósito",
      },
    ],
  },

  // ─── Twitter / X ────────────────────────────────────────────────────────────
  twitter: {
    card: "summary_large_image",
    title: "Empatía Digital",
    description:
      "Aprendé a usar la IA y la tecnología con conciencia y seguridad.",
    images: ["./icon.png"],
  },

  // ─── Manifest PWA ────────────────────────────────────────────────────────────
  manifest: "/manifest.json",

  // ─── Robots ─────────────────────────────────────────────────────────────────
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  // ─── Canonical ───────────────────────────────────────────────────────────────
  alternates: {
    canonical: "https://empatiadigital.com.ar",
  },
};

// ─── Layout ──────────────────────────────────────────────────────────────────
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${playfair.variable} ${dmSans.variable}`}>
      <head>
        {/* Preconnect a dominios externos que uses (ajustá según tu caso) */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* DNS prefetch para tu API si está en otro dominio */}
        {/* <link rel="dns-prefetch" href="https://api.empatiadigital.com.ar" /> */}
      </head>
     <body>
  <Providers>
    <Navbar />
    <main>{children}</main>
    <Footer />
    <FaqWidget />
  </Providers>

  {/* GA4 */}
  <Script
    src="https://www.googletagmanager.com/gtag/js?id=G-1PQVGSKJGE"
    strategy="afterInteractive"
  />
  <Script id="ga4-init" strategy="afterInteractive">
    {`
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-1PQVGSKJGE', { send_page_view: false });
    `}
  </Script>

  <GoogleAnalytics />
</body>
    </html>
  );
}
