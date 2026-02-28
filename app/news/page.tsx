import { CategoryHome } from "@/components/CategoryHome";
import { PublishedContentPanel } from "@/components/PublishedContentPanel";
import { getCategoryWithMetaByHref } from "@/lib/categories";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";


export default async function NewsPage() {
  const [category, articles] = await Promise.all([
    getCategoryWithMetaByHref("/news"),
    prisma.article.findMany({
      where: {
        status: "approved",
        OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 8,
      select: { id: true, title: true, slug: true, publishedAt: true, updatedAt: true },
    }),
  ]);
  return (
    <CategoryHome basePath="/news" category={category}>
      <PublishedContentPanel
        sectionTitle="资讯发布内容"
        sectionDesc="展示已发布的行业趋势、企业动态、技术发展与行业活动内容。"
        items={articles.map((x) => ({
          id: x.id,
          title: x.title,
          href: `/news/${x.slug}`,
          meta: `发布时间：${(x.publishedAt ?? x.updatedAt).toLocaleDateString("zh-CN")}`,
        }))}
        categoryHref="/news/all"
      />
    </CategoryHome>
  );
}


