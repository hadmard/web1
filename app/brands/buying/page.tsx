import type { Metadata } from "next";
import Link from "next/link";
import { getPublishedBuyingArticles } from "@/lib/articles";
import { buildPageMetadata } from "@/lib/seo";
import { resolveUploadedImageUrl } from "@/lib/uploaded-image";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const PAGE_TITLE = "整木定制选购指南";
const PAGE_DESCRIPTION =
  "整合内容管理中已经发布的整木选购内容，围绕预算、材料、工艺、品牌筛选与落地细节，帮助用户更高效地完成选购判断。";

export async function generateMetadata(): Promise<Metadata> {
  return buildPageMetadata({
    title: "整木定制怎么选？预算、品牌、避坑全指南｜整木网",
    description: PAGE_DESCRIPTION,
    path: "/brands/buying",
    type: "website",
    absoluteTitle: true,
  });
}

export default async function BuyingPage() {
  const articles = await getPublishedBuyingArticles(24);
  const [featuredArticle, ...restArticles] = articles;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <section className="overflow-hidden rounded-[34px] border border-[rgba(181,157,121,0.18)] bg-[radial-gradient(circle_at_top_left,rgba(213,183,131,0.16),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,235,0.92))] px-6 py-8 shadow-[0_24px_76px_rgba(34,31,26,0.08)] sm:px-8 sm:py-10">
        <p className="text-xs uppercase tracking-[0.28em] text-[#9d7e4d]">Buying Guide</p>
        <h1 className="mt-4 font-serif text-3xl leading-tight text-primary sm:text-[2.9rem] sm:leading-[1.08]">
          {PAGE_TITLE}
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-8 text-muted sm:text-base">{PAGE_DESCRIPTION}</p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
          当前栏目只展示内容管理里已经发布到“整木选购”的前台内容，不再单独承接选购问答数据。
        </p>
      </section>

      {articles.length === 0 ? (
        <section className="mt-8 rounded-[28px] border border-border bg-white/92 px-6 py-7 text-sm leading-7 text-muted shadow-[0_16px_40px_rgba(15,23,42,0.05)]">
          暂无已发布的整木选购内容。
        </section>
      ) : (
        <>
          {featuredArticle ? (
            <section className="mt-8">
              <Link
                href={`/brands/buying/${encodeURIComponent(featuredArticle.slug)}`}
                className="group block overflow-hidden rounded-[32px] border border-[rgba(15,23,42,0.06)] bg-[rgba(255,255,255,0.95)] shadow-[0_24px_60px_-42px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:border-[rgba(157,126,77,0.28)]"
              >
                {featuredArticle.coverImage ? (
                  <div className="overflow-hidden border-b border-[rgba(15,23,42,0.06)] bg-[rgba(245,240,232,0.55)]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={resolveUploadedImageUrl(featuredArticle.coverImage)}
                      alt={featuredArticle.title}
                      className="aspect-[16/8] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  </div>
                ) : null}
                <article className="px-6 py-7 sm:px-8 sm:py-8">
                  <p className="text-xs uppercase tracking-[0.18em] text-[#9d7e4d]">精选内容</p>
                  <h2 className="mt-3 font-serif text-3xl leading-tight text-primary transition group-hover:text-accent sm:text-[2.2rem]">
                    {featuredArticle.title}
                  </h2>
                  <p className="mt-4 text-sm text-primary/64">
                    {new Date(featuredArticle.publishedAt ?? featuredArticle.updatedAt).toLocaleDateString("zh-CN")}
                  </p>
                  <p className="mt-4 max-w-3xl text-[15px] leading-8 text-primary/78 sm:text-base">
                    {featuredArticle.excerpt?.trim() || "查看这篇整木选购内容的详细解析。"}
                  </p>
                  <p className="mt-5 text-sm text-primary/68 transition group-hover:text-accent">查看详情 →</p>
                </article>
              </Link>
            </section>
          ) : null}

          {restArticles.length > 0 ? (
            <section className="mt-8">
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-[#9d7e4d]">Published Articles</p>
                  <h2 className="mt-3 font-serif text-3xl leading-tight text-primary sm:text-[2.2rem]">
                    已发布的整木选购内容
                  </h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-muted sm:text-base">
                    这里展示内容管理中已发布到“整木选购”的内容，前台与后台发布路径保持一致。
                  </p>
                </div>
              </div>

              <div className="mt-6 grid gap-5 md:grid-cols-2">
                {restArticles.map((article) => (
                  <Link
                    key={article.id}
                    href={`/brands/buying/${encodeURIComponent(article.slug)}`}
                    className="group block overflow-hidden rounded-[28px] border border-[rgba(15,23,42,0.06)] bg-[rgba(255,255,255,0.94)] shadow-[0_22px_44px_-38px_rgba(15,23,42,0.12)] transition hover:-translate-y-0.5 hover:border-[rgba(157,126,77,0.28)]"
                  >
                    {article.coverImage ? (
                      <div className="overflow-hidden border-b border-[rgba(15,23,42,0.06)] bg-[rgba(245,240,232,0.55)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={resolveUploadedImageUrl(article.coverImage)}
                          alt={article.title}
                          className="aspect-[16/9] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                          loading="lazy"
                        />
                      </div>
                    ) : null}
                    <article className="px-6 py-6 sm:px-7">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#9d7e4d]">
                        {new Date(article.publishedAt ?? article.updatedAt).toLocaleDateString("zh-CN")}
                      </p>
                      <h3 className="mt-3 font-serif text-2xl leading-tight text-primary transition group-hover:text-accent">
                        {article.title}
                      </h3>
                      <p className="mt-4 line-clamp-3 text-[15px] leading-8 text-primary/78 sm:text-base">
                        {article.excerpt?.trim() || "查看这篇整木选购内容的详细解析。"}
                      </p>
                      <p className="mt-5 text-sm text-primary/68 transition group-hover:text-accent">查看详情 →</p>
                    </article>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
