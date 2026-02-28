import Link from "next/link";
import Image from "next/image";
import type { Category } from "@/lib/site-structure";
import { getCategoryByHref } from "@/lib/site-structure";
import { getCategoryIcon } from "@/lib/category-icons";

const CATEGORY_HERO_MAP: Record<string, string> = {
  "/news": "/images/seedance2/picture_9.jpg",
  "/brands": "/images/seedance2/picture_10.jpg",
  "/dictionary": "/images/seedance2/picture_11.jpg",
  "/standards": "/images/seedance2/picture_12.jpg",
  "/awards": "/images/seedance2/picture_13.jpg",
};

interface CategoryHomeProps {
  basePath: string;
  category?: Category | null;
  title?: string;
  desc?: string;
  hideSubcategories?: boolean;
  children?: React.ReactNode;
}

export function CategoryHome({
  basePath,
  category: categoryFromDb,
  title,
  desc,
  hideSubcategories = false,
  children,
}: CategoryHomeProps) {
  const category = categoryFromDb ?? getCategoryByHref(basePath);
  const displayTitle = title ?? category?.title ?? "";
  const displayDesc = desc ?? category?.desc ?? "";
  const subcategories = category?.subcategories ?? [];
  const heroSrc = CATEGORY_HERO_MAP[basePath];

  const iconSrc = getCategoryIcon(basePath);
  const getSubDesc = (label: string) => `本子栏目用于发布${label}相关内容，帮助用户快速定位该方向信息。`;
  const getSubHref = (href: string) => {
    if (basePath === "/news") return `/news/all?sub=${encodeURIComponent(href)}`;
    if (basePath === "/dictionary") return `/dictionary/all?sub=${encodeURIComponent(href)}`;
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

          {heroSrc && (
            <div className="mt-5 overflow-hidden rounded-2xl border border-border">
              <Image src={heroSrc} alt="" width={1920} height={640} className="h-36 sm:h-44 md:h-52 w-full object-cover" />
            </div>
          )}

          {!hideSubcategories && subcategories.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-border bg-surface p-4 sm:p-5">
              <h2 className="section-label text-primary mb-3">栏目分类</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {subcategories.map((sub) => (
                  <Link
                    key={sub.href}
                    href={getSubHref(sub.href)}
                    className="rounded-xl border border-border bg-surface-elevated p-3 hover:border-accent/45 transition-colors"
                  >
                    <p className="text-sm font-semibold text-primary">{sub.label}</p>
                    <p className="mt-1 text-xs text-muted leading-5">{getSubDesc(sub.label)}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            category?.definitionText && (
              <div className="mt-5 rounded-2xl border border-border bg-surface p-4 sm:p-5">
                <p className="text-primary leading-relaxed">{category.definitionText}</p>
              </div>
            )
          )}

          {(category?.updatedAt || category?.versionLabel) && (
            <p className="mt-4 text-xs text-muted">
              {category.versionLabel && <span>{displayTitle} {category.versionLabel}</span>}
              {category.updatedAt && (
                <span>
                  {category.versionLabel ? " · " : ""}
                  最近更新：{new Date(category.updatedAt).toLocaleDateString("zh-CN")}
                </span>
              )}
            </p>
          )}
        </section>

        {children && <div className="mt-10">{children}</div>}

        {(category?.versionLabel ?? category?.versionYear) && (
          <footer className="mt-10 pt-4 text-xs text-muted">
            {displayTitle}
            {category?.versionLabel && ` ${category.versionLabel}`}
            {category?.versionYear && !category?.versionLabel && ` ${category.versionYear}年`}
          </footer>
        )}
      </div>
    </div>
  );
}

