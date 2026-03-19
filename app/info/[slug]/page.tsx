import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { findNewsArticleBySegment, normalizeNewsSegment } from "@/lib/news-sharing";
import { buildNewsPath } from "@/lib/share-config";

type Props = {
  params: Promise<{ slug: string }>;
};

const LEGACY_INFO_TITLE_MAP: Record<string, string> = {
  "64789605-182584416": "FotileStyle2025产品回顾：洞庭、艾尔、班迪系列擘画智慧家居新蓝图",
};

function normalizeLegacyInfoSlug(slug: string) {
  const normalized = normalizeNewsSegment(slug);
  return normalized.replace(/\.html$/i, "").trim();
}

export default async function LegacyInfoPage({ params }: Props) {
  const { slug } = await params;
  const legacySlug = normalizeLegacyInfoSlug(slug);
  if (!legacySlug) notFound();

  const mappedTitle = LEGACY_INFO_TITLE_MAP[legacySlug];
  const lookupValue = mappedTitle ?? legacySlug;
  const article = await findNewsArticleBySegment(lookupValue);
  if (article && article.status === "approved") {
    permanentRedirect(buildNewsPath(article.id));
  }

  if (!mappedTitle) notFound();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <section className="rounded-[28px] border border-border bg-surface-elevated px-6 py-8 shadow-sm sm:px-8 sm:py-10">
        <div className="inline-flex rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          历史内容迁移中
        </div>
        <h1 className="mt-4 font-serif text-2xl font-semibold leading-tight text-primary sm:text-3xl">
          {mappedTitle}
        </h1>
        <p className="mt-4 text-sm leading-7 text-muted sm:text-base">
          这篇文章来自整木旧站，目前原文还没有迁移到新站内容库，所以暂时无法直接展示正文。
          我们已经保留了这个历史链接入口，后续内容迁移完成后会自动接回对应文章页面。
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/news"
            className="inline-flex items-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            去整木资讯看看
          </Link>
          <Link
            href="/search"
            className="inline-flex items-center rounded-full border border-border px-5 py-2.5 text-sm font-medium text-primary transition-colors hover:border-accent hover:text-accent"
          >
            去站内搜索
          </Link>
        </div>
        <p className="mt-6 text-xs text-muted">历史链接：/info/{legacySlug}.html</p>
      </section>
    </main>
  );
}
