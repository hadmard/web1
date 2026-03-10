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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-12">
        <nav className="mb-6" aria-label="面包屑">
          <Link href="/" className="text-sm text-muted hover:text-accent transition-colors">
            首页
          </Link>
          <span className="text-muted mx-2">/</span>
          <span className="text-primary font-medium">{displayTitle}</span>
        </nav>

        <section className="glass-panel p-6 sm:p-8">
          <div className="flex flex-wrap gap-4 items-start justify-between">
            <div className="flex gap-4 items-start">
              {iconSrc && (
                <div className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-surface border border-border flex items-center justify-center text-accent">
                  <Image src={iconSrc} alt="" width={42} height={42} className="w-10 h-10 sm:w-11 sm:h-11" />
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-primary">{displayTitle}</h1>
                <p className="mt-2 text-muted text-sm sm:text-base">{displayDesc}</p>
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
              <h2 className="section-label text-primary mb-3">栏目分类</h2>
              <div className="grid sm:grid-cols-2 gap-3">
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
                            <li key={`${sub.href}-${item.href}`} className="flex items-center gap-2 min-w-0">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-black" aria-hidden />
                              <Link href={item.href} className="text-xs text-primary hover:text-accent line-clamp-1">
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
