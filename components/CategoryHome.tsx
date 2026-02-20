import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/lib/site-structure";
import { getCategoryByHref } from "@/lib/site-structure";
import { getCategoryIcon } from "@/lib/category-icons";
import { JsonLd } from "@/components/JsonLd";

interface CategoryHomeProps {
  basePath: string;
  category?: Category | null;
  title?: string;
  desc?: string;
  /** 相关词条：slug → title，用于底部链接 */
  relatedTerms?: { slug: string; title: string }[];
  children?: React.ReactNode;
}

function groupBy<T>(arr: T[], key: (x: T) => string | null | undefined): Map<string | null, T[]> {
  const map = new Map<string | null, T[]>();
  for (const x of arr) {
    const k = key(x) ?? null;
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(x);
  }
  return map;
}

export function CategoryHome({ basePath, category: categoryFromDb, title, desc, relatedTerms = [], children }: CategoryHomeProps) {
  const category = categoryFromDb ?? getCategoryByHref(basePath);
  const displayTitle = title ?? category?.title ?? "";
  const displayDesc = desc ?? category?.desc ?? "";
  const subcategories = category?.subcategories ?? [];
  const grouped = groupBy(subcategories, (s) => (s as { groupLabel?: string | null }).groupLabel);
  const hasGroups = grouped.size > 1 || (grouped.size === 1 && grouped.has(null) === false);

  const faqs = category?.faqs ?? [];
  const faqJsonLd = faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: { "@type": "Answer", text: f.answer },
    })),
  } : null;

  const iconSrc = getCategoryIcon(basePath);

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <nav className="mb-8" aria-label="面包屑">
          <Link href="/" className="text-sm text-muted hover:text-accent transition-colors">
            首页
          </Link>
          <span className="text-muted mx-2">/</span>
          <span className="text-primary font-medium">{displayTitle}</span>
        </nav>

        <div className="flex gap-4 items-start">
          {iconSrc && (
            <div className="flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-surface-elevated/80 border border-border-warm dark:border-border-cool flex items-center justify-center text-accent">
              <Image src={iconSrc} alt="" width={40} height={40} className="w-10 h-10 sm:w-11 sm:h-11" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-primary">
              {displayTitle}
            </h1>
            <p className="mt-2 text-muted">{displayDesc}</p>
          </div>
        </div>

        {category?.definitionText && (
          <section className="mt-6 rounded-xl border border-border-warm dark:border-border-cool bg-surface-elevated/60 p-5">
            <p className="text-primary leading-relaxed">{category.definitionText}</p>
          </section>
        )}

        {subcategories.length > 0 && (
          <section className="mt-10" aria-label="子栏目">
            <h2 className="section-label text-accent mb-4">子栏目</h2>
            {hasGroups ? (
              <div className="space-y-6">
                {Array.from(grouped.entries()).map(([groupLabel, subs]) => (
                  <div key={groupLabel ?? "_"} className="space-y-2">
                    {groupLabel && (
                      <h3 className="font-serif text-sm font-semibold text-primary">{groupLabel}</h3>
                    )}
                    <ul className="flex flex-wrap gap-3">
                      {subs.map((sub) => (
                        <li key={sub.href}>
                          <Link
                            href={sub.href}
                            className="inline-flex items-center rounded-xl border border-border-warm dark:border-border-cool bg-surface-elevated/80 px-5 py-2.5 text-sm font-medium text-primary hover:border-accent/50 hover:shadow-glow transition-all duration-200"
                          >
                            {sub.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <ul className="flex flex-wrap gap-3">
                {subcategories.map((sub) => (
                  <li key={sub.href}>
                    <Link
                      href={sub.href}
                      className="inline-flex items-center rounded-xl border border-border-warm dark:border-border-cool bg-surface-elevated/80 px-5 py-2.5 text-sm font-medium text-primary hover:border-accent/50 hover:shadow-glow transition-all duration-200"
                    >
                      {sub.label}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {children && <div className="mt-12">{children}</div>}

        {faqs.length > 0 && (
          <section className="mt-12 border-t border-border-warm dark:border-border-cool pt-10">
            {faqJsonLd && <JsonLd data={faqJsonLd} />}
            <h2 className="section-label text-accent mb-4">常见问题</h2>
            <ul className="space-y-4">
              {faqs.map((item, i) => (
                <li key={i}>
                  <h3 className="font-serif text-sm font-semibold text-primary">{item.question}</h3>
                  <p className="text-sm text-muted mt-1">{item.answer}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {relatedTerms.length > 0 && (
          <section className="mt-10 border-t border-border-warm dark:border-border-cool pt-8">
            <h2 className="section-label text-accent mb-3">相关词条</h2>
            <ul className="flex flex-wrap gap-2">
              {relatedTerms.map((t) => (
                <li key={t.slug}>
                  <Link
                    href={`/dictionary/${t.slug}`}
                    className="text-sm font-medium text-accent hover:underline"
                  >
                    {t.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {(category?.versionLabel ?? category?.versionYear) && (
          <footer className="mt-12 pt-6 text-xs text-muted">
            {displayTitle}
            {category?.versionLabel && ` ${category.versionLabel}`}
            {category?.versionYear && !category?.versionLabel && ` ${category.versionYear}年`}
          </footer>
        )}
      </div>
    </div>
  );
}
