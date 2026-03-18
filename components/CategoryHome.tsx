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
  variant?: "default" | "editorial";
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
  variant = "default",
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
  const isEditorial = variant === "editorial";

  const getSubHref = (href: string) => {
    if (basePath === "/news") return `/news/all?sub=${encodeURIComponent(href)}`;
    return href;
  };

  return (
    <div className="min-h-screen">
      <div className={`mx-auto px-4 py-10 sm:px-6 sm:py-12 ${isEditorial ? "max-w-6xl" : "max-w-5xl"}`}>
        <nav className={isEditorial ? "mb-8 text-sm text-muted" : "mb-6 text-sm text-muted"} aria-label="面包屑">
          <Link href="/" className="transition-colors hover:text-accent">
            首页
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-primary">{displayTitle}</span>
        </nav>

        <section className={`glass-panel ${isEditorial ? "p-7 sm:p-9" : "p-6 sm:p-8"}`}>
          <div className={`flex flex-wrap items-start justify-between ${isEditorial ? "gap-5" : "gap-4"}`}>
            <div className="flex items-start gap-4">
              {iconSrc ? (
                <div
                  className={`flex shrink-0 items-center justify-center border border-border bg-surface text-accent ${
                    isEditorial
                      ? "h-16 w-16 rounded-[22px] shadow-[0_16px_32px_-24px_rgba(15,23,42,0.35)] sm:h-[72px] sm:w-[72px]"
                      : "h-14 w-14 rounded-2xl sm:h-16 sm:w-16"
                  }`}
                >
                  <Image src={iconSrc} alt="" width={42} height={42} className="h-10 w-10 sm:h-11 sm:w-11" />
                </div>
              ) : null}

              <div className="min-w-0">
                {isEditorial ? (
                  <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.22em] text-muted">Newsroom</p>
                ) : null}
                <h1
                  className={`font-serif font-semibold tracking-tight text-primary ${
                    isEditorial ? "text-[2rem] sm:text-[2.6rem]" : "text-3xl sm:text-4xl"
                  }`}
                >
                  {displayTitle}
                </h1>
                <p
                  className={`mt-2 text-muted ${
                    isEditorial ? "max-w-2xl text-sm leading-7 sm:text-[15px]" : "text-sm sm:text-base"
                  }`}
                >
                  {displayDesc}
                </p>
              </div>
            </div>

            <Link
              href={finalSearchHref}
              className={`interactive-lift inline-flex items-center border border-border bg-surface text-sm font-medium text-primary hover:border-accent/45 hover:text-accent ${
                isEditorial
                  ? "rounded-full px-5 py-2.5 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.32)]"
                  : "rounded-lg px-4 py-2"
              }`}
            >
              {isEditorial ? "搜索资讯" : "搜索"}
            </Link>
          </div>

          {heroSrc ? (
            <div
              className={`showcase-frame mt-6 overflow-hidden border border-border ${
                isEditorial
                  ? "rounded-[30px] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(243,245,248,0.96))] p-2.5 shadow-[0_28px_60px_-42px_rgba(15,23,42,0.35)]"
                  : "rounded-2xl"
              }`}
            >
              <Image
                src={heroSrc}
                alt=""
                width={1600}
                height={640}
                className={`showcase-image ${
                  isEditorial ? "h-44 rounded-[24px] object-cover object-center p-0 sm:h-52 md:h-64" : "h-36 sm:h-44 md:h-52"
                }`}
              />
            </div>
          ) : null}

          {!hideSubcategories && subcategories.length > 0 ? (
            <div
              className={`mt-6 border border-border bg-surface ${
                isEditorial ? "rounded-[28px] p-5 sm:p-6" : "rounded-2xl p-4 sm:p-5"
              }`}
            >
              <div className="mb-4">
                <h2 className="section-label text-primary">资讯分栏</h2>
                {isEditorial ? (
                  <p className="mt-2 text-sm text-muted">按主题快速进入资讯子栏目，减少层层查找。</p>
                ) : null}
              </div>

              <div className={`grid ${isEditorial ? "gap-4 sm:grid-cols-2 xl:grid-cols-4" : "gap-3 sm:grid-cols-2"}`}>
                {subcategories.map((sub) => {
                  const latest = (subcategoryLatest?.[sub.href] ?? []).slice(0, 3);
                  return (
                    <article
                      key={sub.href}
                      className={`border border-border bg-surface-elevated transition-colors hover:border-accent/45 ${
                        isEditorial
                          ? "rounded-[24px] p-4 shadow-[0_22px_44px_-36px_rgba(15,23,42,0.35)]"
                          : "rounded-xl p-3"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link href={getSubHref(sub.href)} className={`${isEditorial ? "text-base" : "text-sm"} font-semibold text-primary hover:text-accent`}>
                          {sub.label}
                        </Link>
                        <Link href={getSubHref(sub.href)} className="text-xs text-accent hover:underline">
                          进入栏目
                        </Link>
                      </div>

                      {latest.length > 0 ? (
                        <ul className={`mt-3 ${isEditorial ? "space-y-2.5" : "space-y-1.5"}`}>
                          {latest.map((item) => (
                            <li key={`${sub.href}-${item.href}`} className="flex min-w-0 items-start gap-2">
                              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-black/75" aria-hidden />
                              <Link href={item.href} className={`text-primary hover:text-accent ${isEditorial ? "line-clamp-2 text-sm leading-6" : "line-clamp-1 text-xs"}`}>
                                {item.title}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </div>
          ) : null}
        </section>

        {children ? <div className={isEditorial ? "mt-12" : "mt-10"}>{children}</div> : null}
      </div>
    </div>
  );
}
