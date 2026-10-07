import type { Metadata, Viewport } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { clinic } from "@/lib/clinic";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["600"], variable: "--font-source-serif", display: "swap" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.URL || "http://localhost:3000";
const description =
  "Gentle, modern dental care in Umerkote, Nabarangpur. Book an appointment online, see the consultation fee up front, and pay securely by UPI or card.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${clinic.name} | Dentist in Umerkote, Nabarangpur`, template: `%s | ${clinic.name}` },
  description,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName: clinic.name,
    title: `${clinic.name} | ${clinic.tagline}`,
    description,
  },
  twitter: { card: "summary_large_image", title: `${clinic.name} | ${clinic.tagline}`, description },
  formatDetection: { telephone: true },
};

export const viewport: Viewport = {
  themeColor: "#1A5F7A",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body>{children}</body>
    </html>
  );
}
