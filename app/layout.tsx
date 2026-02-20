import type { Metadata, Viewport } from "next";
import { Noto_Serif_SC, Noto_Sans_SC } from "next/font/google";
import "./globals.css";

const notoSerifSC = Noto_Serif_SC({
  weight: ["400", "600", "700"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
});

const notoSansSC = Noto_Sans_SC({
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#08090e" },
  ],
};
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { JsonLd } from "@/components/JsonLd";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "中华整木网 | 整木定制行业知识基础设施",
    template: "%s | 中华整木网",
  },
  description:
    "中华整木网是整木定制行业垂直门户与知识基础设施，提供整木词库、整木标准、整木市场、整木数据、整木资讯与整木图库，以定义为中心、以标准为资产、以数据为权威。",
  keywords: ["整木", "整木定制", "整木行业", "知识基础设施", "整木词库", "整木标准", "整木市场", "整木数据", "整木资讯"],
  openGraph: {
    title: "中华整木网 | 整木定制行业知识基础设施",
    description:
      "整木定制行业垂直门户与知识基础设施。词库、标准、市场、数据、资讯、图库。",
    type: "website",
    locale: "zh_CN",
    url: baseUrl,
  },
  alternates: { canonical: baseUrl },
  robots: { index: true, follow: true },
};

const navItems = [
  { href: "/news", label: "整木资讯" },
  { href: "/market", label: "整木市场" },
  { href: "/awards", label: "整木评选" },
  { href: "/dictionary", label: "整木词库" },
  { href: "/standards", label: "整木标准" },
  { href: "/data", label: "整木数据" },
  { href: "/gallery", label: "整木图库" },
  { href: "/membership", label: "会员系统" },
];

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "中华整木网",
  url: baseUrl,
  description: "整木定制行业垂直门户与知识基础设施，提供词库、标准、市场、数据、资讯、图库。",
  inLanguage: "zh-CN",
};

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "中华整木网",
  description: "整木定制行业垂直门户与知识基础设施，以定义为中心、以标准为资产、以数据为权威。",
  url: baseUrl,
  inLanguage: "zh-CN",
  publisher: { "@id": `${baseUrl}/#organization` },
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: `${baseUrl}/?q={search_term}` },
    "query-input": "required name=search_term",
  },
};

const jsonLdGraph = [
  { ...organizationJsonLd, "@id": `${baseUrl}/#organization` },
  websiteJsonLd,
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className={`scroll-smooth ${notoSerifSC.variable} ${notoSansSC.variable}`}>
      <body className="min-h-screen flex flex-col font-sans">
        <JsonLd data={{ "@context": "https://schema.org", "@graph": jsonLdGraph }} />
        <Header navItems={navItems} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
