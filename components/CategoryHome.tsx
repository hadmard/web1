import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/lib/site-structure";
import { getCategoryByHref } from "@/lib/site-structure";
import { getCategoryIcon } from "@/lib/category-icons";
import { getSiteVisualSettings } from "@/lib/site-visual-settings";
import type { BackgroundImageKey } from "@/lib/site-visual-config";

const CATEGORY_HERO_KEY_MAP: Record<string, BackgroundImageKey> = {
  "/news": "newsHero",
  "/brands": "brandsHero",
  "/dictionary": "dictionaryHero",
  "/standards": "standardsHero",
  "/awards": "awardsHero",
};

type SubcategoryEntry = { title: string; href: string };

interface CategoryHomeProps {
  basePath: string;
  category?: Category | null;
  title?: string;
  desc?: string;
  hideSubcategories?: boolean;
  searchHref?: string;
  subcategoryLatest?: Record<string, SubcategoryEntry[]>;
  children?: React.ReactNode;
}

export async function CategoryHome({
  basePath,
  category: categoryFromDb,
  title,
  desc,
  hideSubcategories = false,
  searchHref,
  subcategoryLatest,
  children,
}: CategoryHomeProps) {
  const visualSettings = await getSiteVisualSettings();
  const category = categoryFromDb ?? getCategoryByHref(basePath);
  const displayTitle = title ?? category?.title ?? "";
  const displayDesc = desc ?? category?.desc ?? "";
  const subcategories = category?.subcategories ?? [];
  const heroKey = CATEGORY_HERO_KEY_MAP[basePath];
  const heroSrc = heroKey ? visualSettings.backgrounds[heroKey] : undefined;
  const iconSrc = getCategoryIcon(basePath);
  const defaultSearchHref = basePath === "/awards" ? "/tags" : `${basePath}/all`;
  const finalSearchHref = searchHref ?? defaultSearchHref;

  const getSubHref = (href: string) => {
    if (basePath === "/news") return `/news/all?sub=${encodeURIComponent(href)}`;
    return href;
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-12">
        <nav className="mb-6" aria-label="面包屑">
          <Link href="/" className="text-sm text-muted transition-colors hover:text-accent">
            首页
          </Link>
          <span className="mx-2 text-muted">/</span>
          <span className="font-medium text-primary">{displayTitle}</span>
        </nav>

        <section className="glass-panel p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-start gap-4">
              {iconSrc && (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-surface text-accent sm:h-16 sm:w-16">
                  <Image src={iconSrc} alt="" width={42} height={42} className="h-10 w-10 sm:h-11 sm:w-11" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-serif text-3xl font-semibold tracking-tight text-primary sm:text-4xl">{displayTitle}</h1>
                <p className="mt-2 text-sm text-muted sm:text-base">{displayDesc}</p>
              </div>
            </div>

            <Link
              href={finalSearchHref}
              className="interactive-lift inline-flex items-center rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-primary hover:border-accent/45 hover:text-accent"
            >
              搜索
            </Link>
          </div>

          {heroSrc && (
            <div className="showcase-frame mt-5 overflow-hidden rounded-2xl border border-border">
              <Image
                src={heroSrc}
                alt=""
                width={1600}
                height={640}
                className="showcase-image h-36 sm:h-44 md:h-52"
              />
            </div>
          )}

          {!hideSubcategories && subcategories.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <h2 className="section-label mb-3 text-primary">栏目分类</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {subcategories.map((sub) => {
                  const latest = (subcategoryLatest?.[sub.href] ?? []).slice(0, 3);
                  return (
                    <article key={sub.href} className="rounded-xl border border-border bg-surface-elevated p-3 transition-colors hover:border-accent/45">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={getSubHref(sub.href)} className="text-sm font-semibold text-primary hover:text-accent">
                          {sub.label}
                        </Link>
                        <Link href={getSubHref(sub.href)} className="text-xs text-accent hover:underline">
                          进入栏目
                        </Link>
                      </div>
                      {latest.length > 0 && (
                        <ul className="mt-2 space-y-1.5">
                          {latest.map((item) => (
                            <li key={`${sub.href}-${item.href}`} className="flex min-w-0 items-center gap-2">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-black" aria-hidden />
                              <Link href={item.href} className="line-clamp-1 text-xs text-primary hover:text-accent">
                                {item.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        {children && <div className="mt-10">{children}</div>}
      </div>
    </div>
  );
}
