import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getCategories } from "@/lib/categories";
import { annualBoards, engineerSuppliers, specialAwards, getTop10ByYear } from "@/lib/huadianbang";
import { absoluteUrl } from "@/lib/seo";
import { buildBuyingPath, buildNewsPath } from "@/lib/share-config";

const now = new Date();

function createEntry(
  path: string,
  lastModified: Date,
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"],
  priority: number
): MetadataRoute.Sitemap[number] {
  return {
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  };
}

function dedupeSitemap(entries: MetadataRoute.Sitemap) {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    createEntry("/", now, "weekly", 1),
    createEntry("/news", now, "weekly", 0.9),
    createEntry("/dictionary", now, "weekly", 0.9),
    createEntry("/standards", now, "weekly", 0.9),
    createEntry("/standards/all", now, "weekly", 0.85),
    createEntry("/brands", now, "weekly", 0.9),
    createEntry("/brands/all", now, "weekly", 0.85),
    createEntry("/enterprise", now, "weekly", 0.85),
    createEntry("/market", now, "weekly", 0.5),
    createEntry("/awards", now, "weekly", 0.8),
    createEntry("/huadianbang", now, "weekly", 0.85),
    createEntry("/huadianbang/feature", now, "weekly", 0.8),
    createEntry("/huadianbang/partner", now, "weekly", 0.8),
    createEntry("/tags", now, "weekly", 0.7),
  ];

  let subcategoryUrls: MetadataRoute.Sitemap = [];
  try {
    const categories = await getCategories();
    subcategoryUrls = categories.flatMap((category) =>
      category.subcategories.map((subcategory) =>
        createEntry(subcategory.href, now, "weekly", 0.7)
      )
    );
  } catch {
    subcategoryUrls = [];
  }

  try {
    const [terms, standards, standardArticles, brandArticles, newsArticles, tags, enterprises] = await Promise.all([
      prisma.term.findMany({ select: { slug: true, updatedAt: true } }),
      prisma.standard.findMany({ select: { id: true, updatedAt: true } }),
      prisma.article.findMany({
        where: {
          status: "approved",
          OR: [{ categoryHref: { startsWith: "/standards" } }, { subHref: { startsWith: "/standards" } }],
        },
        select: { slug: true, updatedAt: true },
      }),
      prisma.article.findMany({
        where: {
          status: "approved",
          OR: [{ categoryHref: { startsWith: "/brands" } }, { subHref: { startsWith: "/brands" } }],
        },
        select: { slug: true, updatedAt: true, categoryHref: true, subHref: true },
      }),
      prisma.article.findMany({
        where: {
          status: "approved",
          publishedAt: { not: null },
          OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
        },
        select: { id: true, slug: true, updatedAt: true, publishedAt: true },
      }),
      prisma.tag.findMany({ select: { type: true, slug: true, updatedAt: true } }),
      prisma.enterprise.findMany({
        where: { verificationStatus: "approved" },
        select: { id: true, updatedAt: true },
      }),
    ]);

    const termUrls = terms.map((term) =>
      createEntry(`/dictionary/${term.slug}`, term.updatedAt, "monthly", 0.8)
    );

    const standardUrls = standards.map((standard) =>
      createEntry(`/standards/${standard.id}`, standard.updatedAt, "monthly", 0.8)
    );

    const standardArticleUrls = standardArticles.map((article) =>
      createEntry(`/standards/${article.slug}`, article.updatedAt, "monthly", 0.8)
    );

    const brandUrls = brandArticles.map((article) =>
      createEntry(
        (article.categoryHref?.startsWith("/brands/buying") || article.subHref?.startsWith("/brands/buying"))
          ? buildBuyingPath(article.slug)
          : `/brands/${article.slug}`,
        article.updatedAt,
        "monthly",
        0.8
      )
    );

    const articleUrls = newsArticles.map((article) =>
      createEntry(buildNewsPath(article.slug || article.id), article.publishedAt ?? article.updatedAt, "weekly", 0.8)
    );

    const tagUrls = tags.map((tag) =>
      createEntry(`/tags/${tag.type}/${tag.slug}`, tag.updatedAt, "monthly", 0.6)
    );

    const enterpriseUrls = enterprises.map((enterprise) =>
      createEntry(`/enterprise/${enterprise.id}`, enterprise.updatedAt, "monthly", 0.78)
    );

    const huadianAnnualUrls = annualBoards.map((board) =>
      createEntry(`/huadianbang/${board.year}`, now, "yearly", 0.8)
    );

    const huadianAnnualBrandUrls = annualBoards.flatMap((board) =>
      getTop10ByYear(board.year).map((brand) =>
        createEntry(`/huadianbang/${board.year}/${brand.slug}`, now, "yearly", 0.75)
      )
    );

    const huadianSpecialUrls = specialAwards.map((award) =>
      createEntry(`/huadianbang/feature/${award.slug}`, now, "yearly", 0.72)
    );

    const huadianEngineerUrls = Array.from(new Set(engineerSuppliers.map((item) => item.category))).map((category) =>
      createEntry(`/huadianbang/partner/${category}`, now, "monthly", 0.72)
    );

    const huadianEngineerDetailUrls = engineerSuppliers.map((item) =>
      createEntry(`/huadianbang/partner/${item.category}/${item.slug}`, now, "monthly", 0.7)
    );

    return dedupeSitemap([
      ...staticPages,
      ...subcategoryUrls,
      ...termUrls,
      ...standardUrls,
      ...standardArticleUrls,
      ...brandUrls,
      ...articleUrls,
      ...tagUrls,
      ...enterpriseUrls,
      ...huadianAnnualUrls,
      ...huadianAnnualBrandUrls,
      ...huadianSpecialUrls,
      ...huadianEngineerUrls,
      ...huadianEngineerDetailUrls,
    ]);
  } catch {
    return dedupeSitemap([...staticPages, ...subcategoryUrls]);
  }
}
