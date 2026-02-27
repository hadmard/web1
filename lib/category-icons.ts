export const CATEGORY_ICON_MAP: Record<string, string> = {
  "/news": "/images/category-news.svg",
  "/brands": "/images/category-membership.svg",
  "/dictionary": "/images/category-dictionary.svg",
  "/standards": "/images/category-standards.svg",
  "/awards": "/images/category-awards.svg",
  "/market": "/images/category-market.svg",
  "/membership": "/images/category-membership.svg",
};

export function getCategoryIcon(href?: string | null): string {
  if (!href) return "/images/category-news.svg";
  const found = Object.entries(CATEGORY_ICON_MAP).find(([prefix]) => href === prefix || href.startsWith(`${prefix}/`));
  return found?.[1] ?? "/images/category-news.svg";
}
