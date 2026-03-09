import type { Metadata } from "next";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { buildPageMetadata } from "@/lib/seo";

export async function buildCategoryMetadata(
  basePath: string,
  fallbackTitle: string,
  fallbackDescription: string
): Promise<Metadata> {
  const category = await getCategoryWithMetaByHref(basePath);
  const title = (category?.title || fallbackTitle).trim();
  const description = (category?.desc || fallbackDescription).trim();

  return buildPageMetadata({
    title,
    description,
    path: basePath,
    type: "website",
  });
}
