import type { Metadata } from "next";
import "@fontsource-variable/vazirmatn";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://asadzedeh.ir";

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
  return (
    <html lang="fa" dir="rtl">
      <body className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
