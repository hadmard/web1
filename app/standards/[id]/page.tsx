import Link from "next/link";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
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
    const description = previewText(article.excerpt ?? article.content, 180);
    return {
      title: `${article.title} | 整木网 · 整木标准`,
      description,
      openGraph: { title: article.title, description, type: "article" },
    };
  }

  const standard = await getStandardById(id);
  if (!standard) return { title: "标准未找到" };
  const description = `${standard.code} ${standard.title}（${standard.year}）`;
  return {
    title: `${standard.code} ${standard.title} | 整木网 · 整木标准`,
    description,
    openGraph: { title: standard.title, description, type: "article" },
  };
}

export default async function StandardPage({ params }: Props) {
  const { id } = await params;
  const segment = normalizeSegment(id);

  const categories = await getCategories();
  const stdCat = categories.find((c) => c.href === "/standards");
  const sub = stdCat?.subcategories.find((x) => x.href === `/standards/${segment}`);
  if (sub) {
    redirect(`/standards/all?sub=${encodeURIComponent(sub.href)}`);
  }

  const article = await findStandardArticleBySegment(id);

  if (article) {
    const structured = parseStandardStructuredHtml(article.content ?? "");
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
    const articleUrl = `${baseUrl}/standards/${article.slug}`;
    const schema = {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: article.title,
      description: previewText(article.excerpt ?? article.content, 200),
      datePublished: article.publishedAt ?? article.updatedAt,
      dateModified: article.updatedAt,
      url: articleUrl,
    };

    return (
      <article className="max-w-4xl mx-auto px-4 py-10">
        <JsonLd data={schema} />

        <nav className="mb-6 text-sm text-muted" aria-label="面包屑">
          <Link href="/" className="hover:text-accent">首页</Link>
          <span className="mx-2">/</span>
          <Link href="/standards" className="hover:text-accent">整木标准</Link>
          <span className="mx-2">/</span>
          <span className="text-primary">{article.title}</span>
        </nav>

        <header className="glass-panel p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              {structured?.standardCode && (
                <p className="text-xs font-mono text-muted mb-2">{structured.standardCode}</p>
              )}
              <h1 className="font-serif text-2xl sm:text-3xl font-semibold text-primary">{article.title}</h1>
              {article.excerpt && <p className="mt-2 text-sm text-muted">{article.excerpt}</p>}
            </div>
            <div className="text-xs text-muted">
              <p>版本：{article.versionLabel || structured?.versionNote || "—"}</p>
              <p className="mt-1">更新：{article.updatedAt.toLocaleDateString("zh-CN")}</p>
            </div>
          </div>
        </header>
        <div className="mt-4 overflow-hidden rounded-2xl border border-border">
          <Image src="/images/seedance2/picture_17.jpg" alt="" width={1600} height={900} className="h-44 sm:h-56 w-full object-cover" />
        </div>

        {structured ? (
          <section className="mt-6 space-y-4">
            <div className="rounded-xl border border-border bg-surface-elevated p-4">
              <h2 className="text-base font-semibold text-primary mb-2">标准基础信息</h2>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {structured.standardName && <div><dt className="text-muted">标准名称</dt><dd className="text-primary">{structured.standardName}</dd></div>}
                {structured.publishOrg && <div><dt className="text-muted">发布机构</dt><dd className="text-primary">{structured.publishOrg}</dd></div>}
                {structured.effectiveDate && <div><dt className="text-muted">实施日期</dt><dd className="text-primary">{structured.effectiveDate}</dd></div>}
              </dl>
            </div>

            {[{
              title: "适用范围",
              value: structured.scope,
            }, {
              title: "规范性引用文件",
              value: structured.normativeReferences,
            }, {
              title: "术语与定义",
              value: structured.termsAndDefinitions,
            }, {
              title: "检测方法",
              value: structured.inspectionMethod,
            }, {
              title: "验收规则",
              value: structured.acceptanceRule,
            }]
              .filter((x) => x.value)
              .map((x) => (
                <section key={x.title} className="rounded-xl border border-border bg-surface-elevated p-4">
                  <h2 className="text-base font-semibold text-primary">{x.title}</h2>
                  <p className="mt-2 text-sm text-muted whitespace-pre-wrap">{x.value}</p>
                </section>
              ))}

            {structured.sections.length > 0 && (
              <section className="rounded-xl border border-border bg-surface-elevated p-4">
                <h2 className="text-base font-semibold text-primary mb-3">扩展条款</h2>
                <div className="space-y-3">
                  {structured.sections.map((sec) => (
                    <article key={sec.id} className="rounded-lg border border-border bg-surface p-3">
                      <h3 className="font-medium text-primary">{sec.title || "未命名条款"}</h3>
                      <p className="mt-1 text-sm text-muted whitespace-pre-wrap">{sec.body || "暂无说明"}</p>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </section>
        ) : (
          <section className="mt-6 rounded-xl border border-border bg-surface-elevated p-5">
            <RichContent html={article.content} className="prose prose-neutral dark:prose-invert max-w-none" />
          </section>
        )}
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
      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--color-border)]">
        <Image src="/images/seedance2/picture_17.jpg" alt="" width={1600} height={900} className="h-44 sm:h-56 w-full object-cover" />
      </div>

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

