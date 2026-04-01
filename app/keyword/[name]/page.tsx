import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { previewText } from "@/lib/text";
import { buildNewsPath } from "@/lib/share-config";
import { buildPageMetadata } from "@/lib/seo";
import { getArticlesByKeyword, isValidKeywordCandidate } from "@/lib/news-keywords-v2";

type Props = {
  params: Promise<{ name: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const keyword = decodeURIComponent(name);
  return buildPageMetadata({
    title: `${keyword} - 关键词`,
    description: `${keyword}相关文章聚合页`,
    path: `/keyword/${keyword}`,
    type: "website",
  });
}

export default async function KeywordPage({ params }: Props) {
  const { name } = await params;
  const keywordName = decodeURIComponent(name).trim();

  if (!keywordName || !isValidKeywordCandidate(keywordName)) {
    notFound();
  }

  const result = await getArticlesByKeyword(keywordName, 50);
  if (!result.keyword || !isValidKeywordCandidate(result.keyword)) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
      <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-muted" aria-label="面包屑">
        <Link href="/" className="hover:text-accent">首页</Link>
        <span>/</span>
        <Link href="/news" className="hover:text-accent">整木资讯</Link>
        <span>/</span>
        <span className="text-primary">关键词：{result.keyword}</span>
      </nav>

      <section className="rounded-[28px] border border-border bg-[rgba(255,255,255,0.92)] px-6 py-8 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.16)]">
        <p className="text-xs uppercase tracking-[0.18em] text-[#9a8560]">Keyword</p>
        <h1 className="mt-3 font-serif text-[2rem] font-semibold text-primary sm:text-[2.5rem]">{result.keyword}</h1>
        <p className="mt-3 text-sm leading-7 text-muted">共 {result.total} 篇相关文章，按发布时间倒序展示。</p>
      </section>

      <section className="mt-8 rounded-[28px] border border-border bg-white px-5 py-5 sm:px-6">
        {result.items.length === 0 ? (
          <p className="text-sm text-muted">当前关键词下还没有已发布文章。</p>
        ) : (
          <ul className="divide-y divide-border">
            {result.items.map((item) => (
              <li key={item.id} className="py-4 first:pt-0 last:pb-0">
                <Link href={buildNewsPath(item.id)} className="block rounded-2xl px-3 py-3 transition hover:bg-[#fafafa]">
                  <p className="text-base font-medium leading-7 text-primary">{item.title}</p>
                  {item.excerpt ? (
                    <p className="mt-2 line-clamp-2 text-sm leading-7 text-muted">
                      {previewText(item.excerpt, 88)}
                    </p>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
