import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBrandById } from "@/lib/brands";
import { getCategories } from "@/lib/categories";

export const dynamic = "force-dynamic";
import { JsonLd } from "@/components/JsonLd";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const brand = await getBrandById(id);
  if (!brand) {
    const categories = await getCategories();
    const sub = categories.find((c) => c.href === "/market")?.subcategories.find((s) => s.href === `/market/${id}`);
    if (sub) return { title: `${sub.label} | 中华整木网 · 整木市场` };
    return { title: "品牌未找到" };
  }
  const description = brand.positioning ?? brand.name;
  return {
    title: `${brand.name} | 中华整木网 · 整木市场`,
    description,
    openGraph: { title: brand.name, description, type: "article" },
  };
}

const row = (label: string, value: string | null) =>
  value ? { label, value } : null;

export default async function BrandPage({ params }: Props) {
  const { id } = await params;
  const brand = await getBrandById(id);
  if (!brand) {
    const categories = await getCategories();
    const sub = categories.find((c) => c.href === "/market")?.subcategories.find((s) => s.href === `/market/${id}`);
    if (sub) {
      return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
          <nav className="mb-6" aria-label="面包屑">
            <Link href="/" className="text-sm text-muted hover:text-accent">首页</Link>
            <span className="text-muted mx-2">/</span>
            <Link href="/market" className="text-sm text-muted hover:text-accent">整木市场</Link>
            <span className="text-muted mx-2">/</span>
            <span className="text-primary font-medium">{sub.label}</span>
          </nav>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-primary">{sub.label}</h1>
          <p className="mt-2 text-muted">本栏目内容列表后续接入。</p>
        </div>
      );
    }
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: brand.name,
    description: brand.positioning ?? undefined,
  };

  const infoRows = [
    row("品牌定位", brand.positioning),
    row("材料体系", brand.materialSystem),
    row("产品结构", brand.productStructure),
    row("价格区间", brand.priceRange),
    row("适合人群", brand.targetAudience),
    row("商业模式", brand.businessModel),
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <article className="max-w-3xl mx-auto px-4 py-10">
      <JsonLd data={jsonLd} />
      <h1 className="font-serif text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
        {brand.name}
      </h1>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
          品牌信息
        </h2>
        <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
          <dl className="divide-y divide-[var(--color-border)]">
            {infoRows.map(({ label, value }) => (
              <div
                key={label}
                className="flex flex-col sm:flex-row sm:gap-4 px-4 py-3"
              >
                <dt className="text-sm font-medium text-[var(--color-muted)] shrink-0 w-28">
                  {label}
                </dt>
                <dd className="text-sm text-gray-900 dark:text-gray-100 mt-0.5 sm:mt-0">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          标签
        </h2>
        <p className="text-sm text-[var(--color-muted)]">待扩展</p>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">
          结构对比
        </h2>
        <p className="text-sm text-[var(--color-muted)]">
          与同类品牌对比模块预留，数据后续接入。
        </p>
      </section>

      <section className="mt-10 pt-8 border-t border-[var(--color-border)] flex flex-wrap gap-3">
        {brand.contactUrl && (
          <a
            href={brand.contactUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-xl bg-accent/90 text-white px-4 py-2 text-sm font-medium hover:opacity-90"
          >
            联系企业
          </a>
        )}
        {brand.certUrl && (
          <a
            href={brand.certUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center rounded-xl border border-[var(--color-border)] px-4 py-2 text-sm font-medium text-primary hover:border-accent/50"
          >
            查看认证资质
          </a>
        )}
        {!brand.contactUrl && !brand.certUrl && (
          <p className="text-sm text-[var(--color-muted)]">联系企业、认证资质信息由企业补充。</p>
        )}
      </section>

      <footer className="mt-10 pt-4 text-xs text-[var(--color-muted)]">
        更新于 {brand.updatedAt.toLocaleDateString("zh-CN")}
      </footer>
    </article>
  );
}
