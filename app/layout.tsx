import type { Metadata, Viewport } from "next";
import { Noto_Sans_SC, Noto_Serif_SC } from "next/font/google";
import "./globals.css";
export const dynamic = "force-dynamic";


import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { JsonLd } from "@/components/JsonLd";
import { getCategories } from "@/lib/categories";
import { getSession } from "@/lib/session";

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
    default: "中华整木网 | 整木行业知识基础设施",
    template: "%s | 中华整木网",
  },
  description:
    "中华整木网是整木行业的知识基础设施，覆盖整木资讯、整木品牌、整木词库、整木标准与整木评选。",
  keywords: ["整木", "整木品牌", "整木词库", "整木标准", "整木资讯", "整木评选"],
  openGraph: {
    title: "中华整木网 | 整木行业知识基础设施",
    description:
      "覆盖整木资讯、整木品牌、整木词库、整木标准与整木评选。",
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

const navOrder: { href: string; label: string }[] = [
  { href: "/news", label: "整木资讯" },
  { href: "/brands", label: "整木品牌" },
  { href: "/dictionary", label: "整木词库" },
  { href: "/standards", label: "整木标准" },
  { href: "/awards", label: "整木评选" },
  { href: "/membership", label: "会员系统" },
];

const jsonLdGraph = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${baseUrl}/#organization`,
    name: "中华整木网",
    url: baseUrl,
    inLanguage: "zh-CN",
    description: "整木行业知识基础设施平台。",
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "中华整木网",
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
  let categories: { href: string; title: string; desc: string; subcategories: { href: string; label: string }[] }[] = [];
  try {
    categories = await getCategories();
  } catch {
    categories = [];
  }
  const session = await getSession();

  const navItems = navOrder.map(({ href, label }) => {
    const cat = categories.find((c) => c.href === href || (href === "/membership" && c.href === "/membership"));
    return {
      href,
      label,
      isMembership: href === "/membership",
      desc: cat?.desc,
      subcategories: cat?.subcategories?.length ? cat.subcategories : undefined,
    };
  });

  return (
    <html lang="zh-CN" className={`scroll-smooth ${notoSerifSC.variable} ${notoSansSC.variable}`}>
      <body className="min-h-screen flex flex-col font-sans">
        <JsonLd data={{ "@context": "https://schema.org", "@graph": jsonLdGraph }} />
        <Header
          navItems={navItems}
          initialMe={
            session
              ? {
                  name: session.name?.trim() || session.account,
                  account: session.account,
                  role: session.role ?? null,
                }
              : null
          }
        />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
