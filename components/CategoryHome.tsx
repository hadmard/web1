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
  const subcategories = category?.subcategories ?? [];
  const heroKey = CATEGORY_HERO_KEY_MAP[basePath];
  const heroSrc = heroKey ? visualSettings.backgrounds[heroKey] : undefined;
  const iconSrc = getCategoryIcon(basePath);
  const defaultSearchHref = basePath === "/awards" ? "/tags" : `${basePath}/all`;
  const finalSearchHref = searchHref ?? defaultSearchHref;
  const isEditorial = variant === "editorial";
  const isNewsEditorial = isEditorial && basePath === "/news";
  const totalLatest = Object.values(subcategoryLatest ?? {}).reduce((sum, entries) => sum + entries.length, 0);

  const getSubHref = (href: string) => {
    if (basePath === "/news") return `/news/all?sub=${encodeURIComponent(href)}`;
    return href;
  };

  return (
    <div className={`min-h-screen ${isNewsEditorial ? "pt-6 sm:pt-8" : ""}`}>
      <div
        className={`mx-auto px-4 py-10 sm:px-6 sm:py-12 ${
          isNewsEditorial ? "max-w-6xl pt-20 sm:pt-24" : isEditorial ? "max-w-6xl" : "max-w-5xl"
        }`}
      >
        <nav className={isNewsEditorial ? "mb-10 text-sm text-muted" : isEditorial ? "mb-8 text-sm text-muted" : "mb-6 text-sm text-muted"} aria-label="面包屑">
          <Link href="/" className="transition-colors hover:text-accent">
            首页
          </Link>
          <span className="mx-2">/</span>
          <span className="font-medium text-primary">{displayTitle}</span>
        </nav>

        <section
          className={`glass-panel ${
            isNewsEditorial
              ? "overflow-visible rounded-[32px] border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,248,250,0.92))] p-6 shadow-[0_30px_80px_-46px_rgba(15,23,42,0.35)] sm:p-8 lg:p-10"
              : isEditorial
                ? "p-7 sm:p-9"
                : "p-6 sm:p-8"
          }`}
        >
          <div className={`${isNewsEditorial ? "grid gap-8 lg:grid-cols-[minmax(0,1.25fr)_320px] lg:items-start" : `flex flex-wrap items-start justify-between ${isEditorial ? "gap-5" : "gap-4"}`}`}>
            <div className={`${isNewsEditorial ? "min-w-0" : "flex items-start gap-4"}`}>
              <div className={`flex items-start gap-4 ${isNewsEditorial ? "sm:gap-5" : ""}`}>
              {iconSrc ? (
                <div
                  className={`flex shrink-0 items-center justify-center border border-border bg-surface text-accent ${
                    isNewsEditorial
                      ? "h-16 w-16 rounded-[24px] border-white/80 bg-white/88 shadow-[0_18px_44px_-28px_rgba(15,23,42,0.28)] backdrop-blur sm:h-20 sm:w-20"
                      : isEditorial
                        ? "h-16 w-16 rounded-[22px] shadow-[0_16px_32px_-24px_rgba(15,23,42,0.35)] sm:h-[72px] sm:w-[72px]"
                        : "h-14 w-14 rounded-2xl sm:h-16 sm:w-16"
                  }`}
                >
                  <Image
                    src={iconSrc}
                    alt=""
                    width={42}
                    height={42}
                    className={isNewsEditorial ? "h-9 w-9 opacity-90 sm:h-10 sm:w-10" : "h-10 w-10 sm:h-11 sm:w-11"}
                  />
                </div>
              ) : null}

              <div className="min-w-0">
                <h1
                  className={`font-serif font-semibold tracking-tight text-primary ${
                    isNewsEditorial
                      ? "mt-4 text-[2.5rem] leading-none sm:text-[3.5rem]"
                      : isEditorial
                        ? "text-[2rem] sm:text-[2.5rem]"
                        : "text-3xl sm:text-4xl"
                  }`}
                >
                  {displayTitle}
                </h1>
                {isNewsEditorial ? (
                  <div className="mt-6 flex flex-wrap gap-3 text-xs text-black/60 sm:text-sm">
                    <span className="rounded-full border border-black/8 bg-white/82 px-4 py-2">行业趋势与企业动态</span>
                    <span className="rounded-full border border-black/8 bg-white/82 px-4 py-2">技术发展与行业活动</span>
                    <span className="rounded-full border border-black/8 bg-white/82 px-4 py-2">更轻、更静、更聚焦的浏览方式</span>
                  </div>
                ) : null}
              </div>
              </div>

              {isNewsEditorial && heroSrc ? (
                <div className="mt-8 overflow-hidden rounded-[30px] border border-white/75 bg-[linear-gradient(135deg,rgba(245,246,248,0.98),rgba(255,255,255,0.9))] shadow-[0_24px_64px_-42px_rgba(15,23,42,0.34)]">
                  <Image
                    src={heroSrc}
                    alt=""
                    width={1600}
                    height={640}
                    className="h-60 w-full object-cover object-center sm:h-72 lg:h-[25rem]"
                  />
                </div>
              ) : null}
            </div>

            {isNewsEditorial ? (
              <div className="grid gap-4 lg:pt-14">
                <div className="rounded-[28px] border border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(250,250,251,0.96))] p-5 shadow-[0_24px_52px_-40px_rgba(15,23,42,0.3)]">
                  <div className="mt-5 space-y-3">
                    <div className="rounded-[22px] bg-black/[0.03] px-4 py-4">
                      <div className="text-[1.8rem] font-semibold leading-none text-primary">{subcategories.length}</div>
                      <div className="mt-2 text-xs text-black/55">资讯分栏</div>
                    </div>
                    <div className="rounded-[22px] bg-black/[0.03] px-4 py-4">
                      <div className="text-[1.8rem] font-semibold leading-none text-primary">{totalLatest}</div>
                      <div className="mt-2 text-xs text-black/55">精选条目</div>
                    </div>
                  </div>
                </div>

                <Link
                  href={finalSearchHref}
                  className="interactive-lift inline-flex items-center justify-center rounded-full border border-black/10 bg-[#111214] px-5 py-3 text-sm font-medium text-white transition hover:border-black/20 hover:bg-black"
                >
                  搜索资讯
                </Link>
              </div>
            ) : (
              <Link
                href={finalSearchHref}
                className={`interactive-lift inline-flex items-center border border-border bg-surface text-sm font-medium text-primary hover:border-accent/45 hover:text-accent ${
                  isEditorial
                    ? "rounded-full px-5 py-2.5"
                    : "rounded-lg px-4 py-2"
                }`}
              >
                {isEditorial ? "搜索资讯" : "搜索"}
              </Link>
            )}
          </div>

          {!isNewsEditorial && heroSrc ? (
            <div
              className={`showcase-frame mt-6 overflow-hidden border border-border ${
                isEditorial
                  ? "rounded-[26px] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(243,245,248,0.96))] p-2"
                  : "rounded-2xl"
              }`}
            >
              <Image
                src={heroSrc}
                alt=""
                width={1600}
                height={640}
                className={`showcase-image ${
                  isEditorial
                    ? "h-44 rounded-[20px] object-cover object-center p-0 sm:h-52 md:h-64"
                    : "h-36 sm:h-44 md:h-52"
                }`}
              />
            </div>
          ) : null}

          {!hideSubcategories && subcategories.length > 0 ? (
            <div
              className={`mt-6 border border-border bg-surface ${
                isNewsEditorial
                  ? "rounded-[28px] border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(247,248,250,0.92))] p-5 sm:p-7"
                  : isEditorial
                    ? "rounded-[24px] p-5 sm:p-6"
                    : "rounded-2xl p-4 sm:p-5"
              }`}
            >
              <div className={isNewsEditorial ? "mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" : "mb-4"}>
                <div>
                  <h2 className="section-label text-primary">资讯分栏</h2>
                </div>
              </div>

              <div className={`grid ${isNewsEditorial ? "gap-5 sm:grid-cols-2 xl:grid-cols-4" : isEditorial ? "gap-4 sm:grid-cols-2 xl:grid-cols-4" : "gap-3 sm:grid-cols-2"}`}>
                {subcategories.map((sub) => {
                  const latest = (subcategoryLatest?.[sub.href] ?? []).slice(0, 3);
                  return (
                    <article
                      key={sub.href}
                      className={`border border-border bg-surface-elevated transition-colors hover:border-accent/45 ${
                        isNewsEditorial
                          ? "rounded-[24px] border-black/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,249,251,0.92))] p-5 shadow-[0_24px_48px_-42px_rgba(15,23,42,0.32)] hover:border-black/15"
                          : isEditorial
                            ? "rounded-[20px] p-4"
                            : "rounded-xl p-3"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <Link href={getSubHref(sub.href)} className={`${isNewsEditorial ? "text-lg" : isEditorial ? "text-base" : "text-sm"} font-semibold text-primary hover:text-accent`}>
                          {sub.label}
                        </Link>
                        <Link
                          href={getSubHref(sub.href)}
                          className={`text-xs ${isNewsEditorial ? "rounded-full border border-black/8 px-3 py-1.5 text-black/58 hover:border-black/14 hover:text-primary" : "text-accent hover:underline"}`}
                        >
                          进入栏目
                        </Link>
                      </div>

                      {latest.length > 0 ? (
                        <ul className={`mt-4 ${isNewsEditorial ? "space-y-3" : isEditorial ? "space-y-2.5" : "space-y-1.5"}`}>
                          {latest.map((item) => (
                            <li key={`${sub.href}-${item.href}`} className="flex min-w-0 items-start gap-2">
                              <span className={`shrink-0 rounded-full ${isNewsEditorial ? "mt-2 h-1.5 w-1.5 bg-black/65" : "mt-2 h-1.5 w-1.5 bg-black/75"}`} aria-hidden />
                              <Link
                                href={item.href}
                                className={`text-primary hover:text-accent ${
                                  isNewsEditorial
                                    ? "line-clamp-1 text-sm leading-6 text-black/82"
                                    : isEditorial
                                      ? "line-clamp-1 text-sm leading-6"
                                      : "line-clamp-1 text-xs"
                                }`}
                              >
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
