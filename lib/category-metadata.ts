import type { Metadata } from "next";
import { getCategoryWithMetaByHref } from "@/lib/categories";

export async function buildCategoryMetadata(
  basePath: string,
  fallbackTitle: string,
  fallbackDescription: string
): Promise<Metadata> {
  const category = await getCategoryWithMetaByHref(basePath);
  const title = (category?.title || fallbackTitle).trim();
  const description = (category?.desc || fallbackDescription).trim();

  return {
    title,
    description,
    openGraph: {
      title: `${title} | 中华整木网`,
      description,
      type: "website",
    },
  };
}
