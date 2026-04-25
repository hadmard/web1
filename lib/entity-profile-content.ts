import { buildNewsPath, getArticleSegment } from "@/lib/share-config";
import { htmlToPlainText, toSummaryText } from "@/lib/brand-content";

export type EntityArticleLikeItem = {
  id: string;
  title: string;
  slug?: string | null;
  excerpt?: string | null;
  categoryHref?: string | null;
  subHref?: string | null;
  publishedAt?: Date | null;
  createdAt: Date;
};

export type EntityGalleryLikeItem = {
  id: string;
  title?: string | null;
  category?: string | null;
  imageUrl: string;
  createdAt: Date;
};

function formatDate(input: Date | null | undefined) {
  if (!input) return "";
  if (Number.isNaN(input.getTime())) return "";
  return input.toLocaleDateString("zh-CN");
}

function resolveArticleBadge(input: Pick<EntityArticleLikeItem, "categoryHref" | "subHref">) {
  const source = input.subHref || input.categoryHref || "";
  if (source.startsWith("/brands")) return "品牌内容";
  if (source.startsWith("/news/enterprise")) return "企业动态";
  if (source.startsWith("/news")) return "行业资讯";
  return "内容更新";
}

export function mapEntityArticlesToListItems(items: EntityArticleLikeItem[]) {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    excerpt: toSummaryText(item.excerpt || item.title, 78) || item.title,
    meta: formatDate(item.publishedAt || item.createdAt),
    href: buildNewsPath(getArticleSegment(item)),
    badge: resolveArticleBadge(item),
  }));
}

export function mapEntityGalleryToListItems(items: EntityGalleryLikeItem[], fallbackHref: string) {
  return items.map((item) => ({
    id: item.id,
    title: item.title?.trim() || "精选案例",
    excerpt: toSummaryText(htmlToPlainText(item.category || "品牌案例与项目画面"), 72) || "品牌案例与项目画面",
    meta: formatDate(item.createdAt),
    href: fallbackHref,
    badge: "精选案例",
  }));
}
