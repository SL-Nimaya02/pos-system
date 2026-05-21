import type { Metadata } from "next";
import { Inter, Noto_Sans_Sinhala, Noto_Sans_Tamil } from "next/font/google";
import { Providers } from "@/components/providers";
import { Toaster } from "react-hot-toast";
import { PwaInstallPrompt } from "@/components/pwa-install-prompt";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-inter",
  display: "swap",
});

const notoSinhala = Noto_Sans_Sinhala({
  subsets: ["sinhala"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sinhala",
  display: "swap",
});

const notoTamil = Noto_Sans_Tamil({
  subsets: ["tamil"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-tamil",
  display: "swap",
});

export const metadata: Metadata = {
  title: "POS System",
  description: "Modern Point of Sale System",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "POS",
  },
  formatDetection: { telephone: false },
  themeColor: "#4f46e5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${notoSinhala.variable} ${notoTamil.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-180.png" />
      </head>
      <body className={inter.className}>
        <Providers>
          {children}
          <Toaster position="top-right" />
          <PwaInstallPrompt />
        </Providers>
      </body>
    </html>
  );
}
