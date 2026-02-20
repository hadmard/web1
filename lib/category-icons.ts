/** 栏目 path 与首页/栏目页用插图路径的映射 */
export const CATEGORY_ICONS: Record<string, string> = {
  "/news": "/images/category-news.svg",
  "/market": "/images/category-market.svg",
  "/dictionary": "/images/category-dictionary.svg",
  "/standards": "/images/category-standards.svg",
  "/data": "/images/category-data.svg",
  "/awards": "/images/category-awards.svg",
  "/gallery": "/images/category-gallery.svg",
  "/membership": "/images/category-membership.svg",
};

export function getCategoryIcon(href: string): string | undefined {
  const base = "/" + (href.split("/").filter(Boolean)[0] ?? "");
  return CATEGORY_ICONS[base];
}
