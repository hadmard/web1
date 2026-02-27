export type CategoryOption = {
  href: string;
  label: string;
  subs: Array<{ href: string; label: string }>;
};

export type ContentTabKey =
  | "articles"
  | "brands"
  | "terms"
  | "standards"
  | "industry-data"
  | "awards"
  | "gallery";

export const NEWS_SUBCATEGORY_OPTIONS = [
  { href: "/news/trends", label: "行业趋势" },
  { href: "/news/enterprise", label: "企业动态" },
  { href: "/news/tech", label: "技术发展" },
  { href: "/news/events", label: "行业活动" },
] as const;

export const MEMBER_PUBLISH_CATEGORY_OPTIONS: CategoryOption[] = [
  {
    href: "/news",
    label: "整木资讯",
    subs: [...NEWS_SUBCATEGORY_OPTIONS],
  },
  {
    href: "/brands",
    label: "整木品牌",
    subs: [],
  },
  {
    href: "/dictionary",
    label: "整木词库",
    subs: [
      { href: "/dictionary/concepts", label: "基础概念" },
      { href: "/dictionary/terms", label: "技术术语" },
      { href: "/dictionary/segments", label: "行业细分" },
    ],
  },
  {
    href: "/standards",
    label: "整木标准",
    subs: [
      { href: "/standards/material", label: "材料标准" },
      { href: "/standards/process", label: "工艺标准" },
      { href: "/standards/service", label: "服务标准" },
      { href: "/standards/co-create", label: "标准共建" },
    ],
  },
  {
    href: "/awards",
    label: "整木评选",
    subs: [
      { href: "/huadianbang", label: "华点榜" },
      { href: "/huadianbang/2025", label: "年度榜单" },
      { href: "/huadianbang/feature", label: "特色奖项" },
      { href: "/huadianbang/partner", label: "配套商推荐" },
    ],
  },
];

export const CONTENT_TAB_DEFS: Array<{ key: ContentTabKey; href: string; label: string }> = [
  { key: "articles", href: "/news", label: "整木资讯" },
  { key: "brands", href: "/brands", label: "整木品牌" },
  { key: "terms", href: "/dictionary", label: "整木词库" },
  { key: "standards", href: "/standards", label: "整木标准" },
  { key: "awards", href: "/awards", label: "整木评选" },
];

export function resolveTabKeyFromHref(
  categoryHref?: string | null,
  subHref?: string | null
): ContentTabKey {
  const source = (categoryHref || subHref || "").trim();
  if (source.startsWith("/news")) return "articles";
  if (source.startsWith("/brands")) return "brands";
  if (source.startsWith("/dictionary")) return "terms";
  if (source.startsWith("/standards")) return "standards";
  if (source.startsWith("/awards") || source.startsWith("/huadianbang")) return "awards";
  return "articles";
}

export const MEMBER_ALLOWED_CATEGORY_HREFS = new Set(
  MEMBER_PUBLISH_CATEGORY_OPTIONS.map((x) => x.href)
);

export const PERSONAL_ALLOWED_CATEGORY_HREFS = new Set([
  "/dictionary",
  "/standards",
]);
