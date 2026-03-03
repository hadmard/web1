import type { Metadata, Viewport } from "next";
import "./globals.css";

import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { getCategories } from "@/lib/categories";

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f6f3" },
    { media: "(prefers-color-scheme: dark)", color: "#08090e" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "整木网 | 整体木作行业知识共享平台",
    template: "%s | 整木网",
  },
  description:
    "整木网是整体木作行业知识共享平台，覆盖整木资讯、整木市场、整木词库、整木标准与整木评选。",
  keywords: ["整木", "整木市场", "整木品牌", "整木选购", "整木词库", "整木标准", "整木资讯", "整木评选"],
  openGraph: {
    title: "整木网 | 整体木作行业知识共享平台",
    description:
      "覆盖整木资讯、整木市场、整木词库、整木标准与整木评选。",
    type: "website",
    locale: "zh_CN",
    url: baseUrl,
  },
  alternates: { canonical: baseUrl },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  robots: { index: true, follow: true },
};

const navOrder: string[] = [
  "/news",
  "/dictionary",
  "/standards",
  "/awards",
  "/brands",
  "/membership",
];

const jsonLdGraph = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: "整木网",
    url: baseUrl,
    inLanguage: "zh-CN",
    description: "整体木作行业知识共享平台。",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "整木网",
    url: baseUrl,
    inLanguage: "zh-CN",
    publisher: { "@id": `${baseUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${baseUrl}/?q={search_term}` },
      "query-input": "required name=search_term",
    },
  },
];

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const categories = await getCategories();

  const navItems = navOrder.map((href) => {
    const cat = categories.find((c) => c.href === href || (href === "/membership" && c.href === "/membership"));
    return {
      href,
      label: cat?.title ?? (href === "/membership" ? "会员系统" : href),
      isMembership: href === "/membership",
      desc: cat?.desc,
      subcategories: cat?.subcategories?.length ? cat.subcategories : undefined,
    };
  });

  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body className="min-h-screen flex flex-col font-sans">
        <JsonLd data={{ "@context": "https://schema.org", "@graph": jsonLdGraph }} />
        <Header
          navItems={navItems}
          initialMe={null}
        />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}


