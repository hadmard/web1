import type { Metadata } from "next";
import { PUBLIC_SITE_URL } from "@/lib/public-site-config";

const FALLBACK_SITE_URL = PUBLIC_SITE_URL;

export const SITE_NAME = "整木网";
export const SITE_TITLE = `${SITE_NAME} | 整体木作行业知识共享平台`;
export const SITE_DESCRIPTION =
  "整木网是整体木作行业知识共享平台，覆盖整木资讯、整木市场、整木词库、整木标准与整木评选。";

export function getSiteUrl() {
  if (process.env.NODE_ENV === "development") {
    return process.env.NEXT_PUBLIC_SITE_URL?.trim() || FALLBACK_SITE_URL;
  }
  return FALLBACK_SITE_URL;
}

export function absoluteUrl(path = "/") {
  return new URL(path, getSiteUrl()).toString();
}

type PageMetadataOptions = {
  title: string;
  description: string;
  path?: string;
  type?: "website" | "article";
  keywords?: string[];
  siteName?: string;
};

export function buildPageMetadata({
  title,
  description,
  path = "/",
  type = "website",
  keywords,
  siteName = SITE_NAME,
}: PageMetadataOptions): Metadata {
  const url = absoluteUrl(path);

  return {
    title,
    description,
    keywords,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName,
      locale: "zh_CN",
      type,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export function buildNoIndexMetadata(title: string, description?: string): Metadata {
  return {
    title,
    description,
    robots: {
      index: false,
      follow: false,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },
  };
}
