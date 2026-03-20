import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { ContentHeroImage } from "@/components/ContentHeroImage";
import { prisma } from "@/lib/prisma";
import { articleOrderByPinnedLatest } from "@/lib/articles";
import { getStandardById } from "@/lib/standards";
import { JsonLd } from "@/components/JsonLd";
import { MemberDownloadButton } from "@/components/MemberDownloadButton";
import { getSession } from "@/lib/session";
import { getMemberDownloadSwitches } from "@/lib/app-settings";
import { canDownloadStandard } from "@/lib/member-access";
import { previewText } from "@/lib/text";
import { RichContent } from "@/components/RichContent";
import { parseStandardStructuredHtml } from "@/lib/standard-structured";
import { getCategories } from "@/lib/categories";
import { getSiteVisualSettings } from "@/lib/site-visual-settings";
import { buildPageMetadata } from "@/lib/seo";
import { getSiteUrl } from "@/lib/seo";
import {
  addHeadingAnchors,
  extractHeadingAnchors,
  parseDocumentMetadata,
  splitCommaLikeList,
} from "@/lib/document-metadata";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function normalizeSegment(raw: string) {
  let v = (raw || "").trim();
  for (let i = 0; i < 2; i += 1) {
    try {
      const d = decodeURIComponent(v);
      if (d === v) break;
      v = d;
    } catch {
      break;
    }
  }
  return v.trim();
}

async function findStandardArticleBySegment(segment: string) {
  const s = normalizeSegment(segment);
  return prisma.article.findFirst({
    where: {
      status: "approved",
      OR: [
        { categoryHref: { startsWith: "/standards" } },
        { subHref: { startsWith: "/standards" } },
      ],
      AND: [
        {
          OR: [
            { slug: s },
            { title: s },
            { slug: { contains: s } },
            { title: { contains: s } },
          ],
        },
      ],
    },
    orderBy: articleOrderByPinnedLatest,
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const article = await findStandardArticleBySegment(id);
  if (article) {
    const metadata = parseDocumentMetadata(article.faqJson);
    const description = metadata.seoDescription || previewText(metadata.intro || (article.excerpt ?? article.content), 180);
    return buildPageMetadata({
      title: metadata.seoTitle || `${article.title} | 中华整木网 · 整木标准`,
      description,
      path: `/standards/${article.slug}`,
      type: "article",
    });
  }

  const standard = await getStandardById(id);
  if (!standard) return { title: "标准未找到" };
  const description = `${standard.code} ${standard.title}（${standard.year}）`;
  return buildPageMetadata({
    title: `${standard.code} ${standard.title} | 中华整木网 · 整木标准`,
    description,
    path: `/standards/${standard.id}`,
    type: "article",
  });
}

export default async function StandardPage({ params }: Props) {
  const { id } = await params;
  const segment = normalizeSegment(id);

  const [categories, visualSettings] = await Promise.all([
    getCategories(),
    getSiteVisualSettings(),
  ]);
  const stdCat = categories.find((c) => c.href === "/standards");
  const sub = stdCat?.subcategories.find((x) => x.href === `/standards/${segment}`);
  if (sub) {
    redirect(`/standards/all?sub=${encodeURIComponent(sub.href)}`);
  }

  const article = await findStandardArticleBySegment(id);

  if (article) {
    const metadata = parseDocumentMetadata(article.faqJson);
    const structured = parseStandardStructuredHtml(article.content ?? "");
    const anchoredHtml = addHeadingAnchors(article.content ?? "");
    const headings = extractHeadingAnchors(anchoredHtml);
    const baseUrl = getSiteUrl();
    const articleUrl = `${baseUrl}/standards/${article.slug}`;
    const tagSlugs = splitCommaLikeList(article.tagSlugs);
    const relatedItems = await prisma.article.findMany({
      where: {
        id: { not: article.id },
        status: "approved",
        OR: [{ categoryHref: { startsWith: "/standards" } }, { subHref: { startsWith: "/standards" } }],
        ...(tagSlugs.length > 0
          ? {
              AND: [{
                OR: tagSlugs.slice(0, 4).map((tag) => ({
                tagSlugs: { contains: tag },
                })),
              }],
            }
          : {}),
      },
      take: 6,
      select: { id: true, title: true, slug: true, excerpt: true, versionLabel: true, updatedAt: true },
    }).catch(() => []);
    const schema = {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: article.title,
      description: previewText(metadata.intro || (article.excerpt ?? article.content), 200),
      datePublished: article.publishedAt ?? article.updatedAt,
      dateModified: article.updatedAt,
      url: articleUrl,
    };

    return (
      <article className="max-w-6xl mx-auto px-4 py-10">
        <JsonLd data={schema} />

        <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
          <Link href="/" className="hover:text-accent">首页</Link>
          <span className="mx-2">/</span>
          <Link href="/standards" className="hover:text-accent">整木标准</Link>
          <span className="mx-2">/</span>
          <span className="text-primary">{article.title}</span>
        </nav>

        <header className="glass-panel p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              {(metadata.standardCode || structured?.standardCode) && (
                <p className="text-xs font-mono text-muted mb-2">{metadata.standardCode || structured?.standardCode}</p>
              )}
              <h1 className="font-serif text-2xl sm:text-4xl font-semibold text-primary">{article.title}</h1>
              <p className="mt-3 max-w-3xl text-sm sm:text-base leading-7 text-muted">
                {metadata.intro || article.excerpt || "面向整木行业长期维护的规范文档，适合检索、协作与版本沉淀。"}
              </p>
            </div>
            <div className="text-xs text-muted">
              <p>版本：{article.versionLabel || metadata.versions[0]?.version || structured?.versionNote || "—"}</p>
              <p className="mt-1">更新：{article.updatedAt.toLocaleDateString("zh-CN")}</p>
            </div>
          </div>
        </header>
        <ContentHeroImage src={article.coverImage} alt={article.title} />

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="space-y-6">
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[
                { label: "标准编号", value: metadata.standardCode || structured?.standardCode || "未填写" },
                { label: "适用范围", value: metadata.scope || structured?.scope || article.applicableScenarios || "待补充" },
                { label: "当前版本", value: article.versionLabel || metadata.versions[0]?.version || structured?.versionNote || "未填写" },
                { label: "材料要求", value: metadata.materialRequirements || "待补充" },
                { label: "工艺要求", value: metadata.processRequirements || "待补充" },
                { label: "验收标准", value: metadata.acceptanceCriteria || structured?.acceptanceRule || "待补充" },
              ].map((item) => (
                <section key={item.label} className="rounded-3xl border border-border bg-surface-elevated p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">{item.label}</p>
                  <p className="mt-3 text-sm leading-7 text-primary">{item.value}</p>
                </section>
              ))}
            </section>

            <section className="rounded-3xl border border-border bg-surface-elevated p-6">
              <RichContent html={anchoredHtml} className="prose prose-neutral dark:prose-invert max-w-none" />
            </section>

            {metadata.versions.length > 0 && (
              <section className="rounded-3xl border border-border bg-surface-elevated p-6">
                <h2 className="text-lg font-semibold text-primary">版本记录</h2>
                <div className="mt-4 space-y-3">
                  {metadata.versions.map((item, index) => (
                    <article key={`${item.version}-${index}`} className="rounded-2xl border border-border bg-surface p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-primary">{item.version}</p>
                        <p className="text-xs text-muted">{item.updatedAt || "未记录时间"}</p>
                      </div>
                      {item.note && <p className="mt-2 text-sm leading-7 text-muted">{item.note}</p>}
                    </article>
                  ))}
                </div>
              </section>
            )}

            {relatedItems.length > 0 && (
              <section className="rounded-3xl border border-border bg-surface-elevated p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-primary">相关标准</h2>
                  <Link href="/standards/all" className="apple-inline-link">查看标准库</Link>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {relatedItems.map((item) => (
                    <Link key={item.id} href={`/standards/${item.slug}`} className="rounded-2xl border border-border bg-surface p-4 hover:border-accent/40">
                      <p className="text-sm font-medium text-primary">{item.title}</p>
                      <p className="mt-2 text-xs text-muted">
                        {item.versionLabel || "标准文档"} · {item.updatedAt.toLocaleDateString("zh-CN")}
                      </p>
                      <p className="mt-2 text-xs leading-6 text-muted line-clamp-2">
                        {item.excerpt || "查看该标准的适用范围、执行要求与更新记录。"}
                      </p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {headings.length > 0 && (
              <section className="rounded-3xl border border-border bg-surface-elevated p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">目录</h2>
                <nav className="mt-4 space-y-2">
                  {headings.map((heading) => (
                    <a
                      key={heading.id}
                      href={`#${heading.id}`}
                      className={`block text-sm text-primary hover:text-accent ${heading.level === 3 ? "pl-4" : heading.level === 2 ? "pl-2" : ""}`}
                    >
                      {heading.text}
                    </a>
                  ))}
                </nav>
              </section>
            )}

            {metadata.contributors.length > 0 && (
              <section className="rounded-3xl border border-border bg-surface-elevated p-5">
                <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted">参与单位</h2>
                <div className="mt-4 space-y-3">
                  {metadata.contributors.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="rounded-2xl border border-border bg-surface p-3">
                      <p className="text-sm font-medium text-primary">{item.name}</p>
                      <p className="mt-1 text-xs text-muted">{item.joinedAt || "时间待补充"}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </article>
    );
  }

  const [standard, session, switches] = await Promise.all([
    getStandardById(id),
    getSession(),
    getMemberDownloadSwitches(),
  ]);
  if (!standard) notFound();

  const allowed = !!session && canDownloadStandard(session.memberType, switches.standardEnabled);
  const reason = !session
    ? "请先登录后下载"
    : session.memberType !== "personal"
      ? "仅个人会员可下载标准文件"
      : !switches.standardEnabled
        ? "系统已关闭标准下载"
        : "";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    name: standard.title,
    description: previewText(standard.content ?? standard.title, 200),
    dateModified: standard.updatedAt,
  };

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <JsonLd data={jsonLd} />
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className="text-sm font-mono px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">{standard.code}</span>
        <span className="text-[var(--color-muted)]">{standard.year} 年</span>
      </div>
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 mt-2">{standard.title}</h1>
      <ContentHeroImage fallbackSrc={visualSettings.backgrounds.standardArticleHero} alt={standard.title} />

      <div className="mt-6">
        <MemberDownloadButton resourceType="standard" resourceId={standard.id} allowed={allowed} reason={reason} />
      </div>

      {standard.content && (
        <section className="mt-8">
          <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">内容与等级划分</h2>
          <RichContent html={standard.content} className="prose prose-neutral dark:prose-invert max-w-none text-sm text-[var(--color-muted)]" />
        </section>
      )}

      <section className="mt-8 border-t border-[var(--color-border)] pt-6">
        <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">更新记录</h2>
        <p className="text-sm text-[var(--color-muted)]">版本 {standard.version ?? "—"} · 更新于 {standard.updatedAt.toLocaleDateString("zh-CN")}</p>
      </section>
    </article>
  );
}

