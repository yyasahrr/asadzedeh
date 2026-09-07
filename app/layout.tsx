import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { getSettings } from "@/lib/store";
import { jsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://asadzedeh.ir";

const peyda = localFont({
  src: [
    { path: "./fonts/PeydaFaNumWeb-Thin.woff", weight: "100", style: "normal" },
    { path: "./fonts/PeydaFaNumWeb-Regular.woff", weight: "400", style: "normal" },
    { path: "./fonts/PeydaFaNumWeb-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-peyda",
  display: "swap",
});

const neirizi = localFont({
  src: "./fonts/Neirizi.ttf",
  variable: "--font-neirizi",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "اسدزاده | آموزش فرش، گلیم و هنرهای بافت ایرانی",
    template: "%s | اسدزاده",
  },
  description:
    "آموزش تخصصی فرش‌بافی، گلیم‌بافی، گبه‌بافی، رنگرزی، مرمت و طراحی نقشه به‌صورت آنلاین و حضوری؛ هنر ایرانی را از استاد یاد بگیرید.",
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "اسدزاده",
    title: "اسدزاده | آموزش فرش، گلیم و هنرهای بافت ایرانی",
    description: "هنر ایرانی را از استاد یاد بگیرید؛ دوره‌های آنلاین و حضوری فرش، گلیم و بافت.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const settings = getSettings();
  const org = organizationJsonLd(settings);
  const site = websiteJsonLd(settings);
  return (
    <html lang="fa" dir="rtl" className={`${peyda.variable} ${neirizi.variable}`}>
      <body className="flex min-h-screen flex-col">
        {org ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(org) }} /> : null}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(site) }} />
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
