import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getCategories } from "@/lib/categories";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/news`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/dictionary`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/standards`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/market`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/data`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/awards`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/gallery`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/membership`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  ];

  let subcategoryUrls: MetadataRoute.Sitemap = [];
  try {
    const categories = await getCategories();
    subcategoryUrls = categories.flatMap((c) =>
      c.subcategories.map((s) => ({
        url: `${BASE}${s.href}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      }))
    );
  } catch {
    // keep empty
  }

  try {
    const [slugs, standardIds, brandIds, dataIds] = await Promise.all([
      prisma.term.findMany({ select: { slug: true } }),
      prisma.standard.findMany({ select: { id: true } }),
      prisma.brand.findMany({ select: { id: true } }),
      prisma.industryData.findMany({ select: { id: true } }),
    ]);

    const termUrls: MetadataRoute.Sitemap = slugs.map(({ slug }) => ({
      url: `${BASE}/dictionary/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

    const standardUrls: MetadataRoute.Sitemap = standardIds.map(({ id }) => ({
      url: `${BASE}/standards/${id}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

    const brandUrls: MetadataRoute.Sitemap = brandIds.map(({ id }) => ({
      url: `${BASE}/market/${id}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

    const dataUrls: MetadataRoute.Sitemap = dataIds.map(({ id }) => ({
      url: `${BASE}/data/${id}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

    return [...staticPages, ...subcategoryUrls, ...termUrls, ...standardUrls, ...brandUrls, ...dataUrls];
  } catch {
    return [...staticPages, ...subcategoryUrls];
  }
}
