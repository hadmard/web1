import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getCategories } from "@/lib/categories";
import { annualBoards, engineerSuppliers, specialAwards, getTop10ByYear } from "@/lib/huadianbang";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/news`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/dictionary`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/standards`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/standards/all`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/brands`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/brands/all`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/market`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/awards`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/huadianbang`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.85 },
    { url: `${BASE}/huadianbang/feature`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/huadianbang/partner`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/membership`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
    { url: `${BASE}/tags`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
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
    subcategoryUrls = [];
  }

  try {
    const [slugs, standardIds, standardArticleSlugs, brandSlugs, articleSlugs, tagRows] = await Promise.all([
      prisma.term.findMany({ select: { slug: true } }),
      prisma.standard.findMany({ select: { id: true } }),
      prisma.article.findMany({
        where: { status: "approved", OR: [{ categoryHref: { startsWith: "/standards" } }, { subHref: { startsWith: "/standards" } }] },
        select: { slug: true },
      }),
      prisma.article.findMany({
        where: { status: "approved", OR: [{ categoryHref: { startsWith: "/brands" } }, { subHref: { startsWith: "/brands" } }] },
        select: { slug: true },
      }),
      prisma.article.findMany({ where: { publishedAt: { not: null } }, select: { slug: true } }),
      prisma.tag.findMany({ select: { type: true, slug: true } }),
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

    const standardArticleUrls: MetadataRoute.Sitemap = standardArticleSlugs.map(({ slug }) => ({
      url: `${BASE}/standards/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

    const brandUrls: MetadataRoute.Sitemap = brandSlugs.map(({ slug }) => ({
      url: `${BASE}/brands/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    }));

    const articleUrls: MetadataRoute.Sitemap = articleSlugs.map(({ slug }) => ({
      url: `${BASE}/news/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    const tagUrls: MetadataRoute.Sitemap = tagRows.map(({ type, slug }) => ({
      url: `${BASE}/tags/${type}/${slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

    const huadianAnnualUrls: MetadataRoute.Sitemap = annualBoards.map((x) => ({
      url: `${BASE}/huadianbang/${x.year}`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.8,
    }));

    const huadianAnnualBrandUrls: MetadataRoute.Sitemap = annualBoards.flatMap((x) =>
      getTop10ByYear(x.year).map((brand) => ({
        url: `${BASE}/huadianbang/${x.year}/${brand.slug}`,
        lastModified: new Date(),
        changeFrequency: "yearly" as const,
        priority: 0.75,
      }))
    );

    const huadianSpecialUrls: MetadataRoute.Sitemap = specialAwards.map((x) => ({
      url: `${BASE}/huadianbang/feature/${x.slug}`,
      lastModified: new Date(),
      changeFrequency: "yearly" as const,
      priority: 0.72,
    }));

    const huadianEngineerUrls: MetadataRoute.Sitemap = Array.from(new Set(engineerSuppliers.map((x) => x.category))).map((category) => ({
      url: `${BASE}/huadianbang/partner/${category}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.72,
    }));

    const huadianEngineerDetailUrls: MetadataRoute.Sitemap = engineerSuppliers.map((x) => ({
      url: `${BASE}/huadianbang/partner/${x.category}/${x.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    }));

    return [
      ...staticPages,
      ...subcategoryUrls,
      ...termUrls,
      ...standardUrls,
      ...standardArticleUrls,
      ...brandUrls,
      ...articleUrls,
      ...tagUrls,
      ...huadianAnnualUrls,
      ...huadianAnnualBrandUrls,
      ...huadianSpecialUrls,
      ...huadianEngineerUrls,
      ...huadianEngineerDetailUrls,
    ];
  } catch {
    return [...staticPages, ...subcategoryUrls];
  }
}
