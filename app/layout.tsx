import type { Metadata, Viewport } from "next";
import "./globals.css";

import { PageBackButton } from "@/components/PageBackButton";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { RouteHistoryManager } from "@/components/RouteHistoryManager";
import { getCategories } from "@/lib/categories";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, absoluteUrl, getSiteUrl } from "@/lib/seo";

const baseUrl = getSiteUrl();

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
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: ["整木", "整木市场", "整木品牌", "整木选购", "整木词库", "整木标准", "整木资讯", "整木评选"],
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    type: "website",
    locale: "zh_CN",
    url: baseUrl,
    siteName: SITE_NAME,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  alternates: { canonical: absoluteUrl("/") },
  icons: {
    icon: "/icon.png?v=20260316",
    shortcut: "/icon.png?v=20260316",
    apple: "/icon.png?v=20260316",
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
    name: SITE_NAME,
    url: baseUrl,
    inLanguage: "zh-CN",
    description: "整体木作行业知识共享平台。",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: baseUrl,
    inLanguage: "zh-CN",
    publisher: { "@id": `${baseUrl}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${absoluteUrl("/search")}?q={search_term}` },
      "query-input": "required name=search_term",
    },
  },
];

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const categories = await getCategories();

  const navItems = navOrder
    .map((href) => {
      const cat = categories.find((c) => c.href === href || (href === "/membership" && c.href === "/membership"));
      return {
        href,
        label: cat?.title ?? (href === "/membership" ? "会员系统" : href),
        isMembership: href === "/membership",
        desc: cat?.desc,
        subcategories: cat?.subcategories?.length ? cat.subcategories : undefined,
      };
    })
    .flatMap((item) =>
      item.href === "/membership"
        ? [
            {
              href: "https://jiu.cnzhengmu.com",
              label: "整木旧站",
              external: true,
            },
            item,
          ]
        : [item],
    );

  return (
    <html lang="zh-CN" className="scroll-smooth">
      <body className="min-h-screen flex flex-col font-sans">
        <JsonLd data={{ "@context": "https://schema.org", "@graph": jsonLdGraph }} />
        <Header
          navItems={navItems}
          initialMe={null}
        />
        <RouteHistoryManager />
        <main className="flex-1">
          <PageBackButton />
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}


