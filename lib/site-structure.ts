/**
 * 站点结构：七大栏目 + 会员系统
 */
export interface SubCategory {
  href: string;
  label: string;
  groupLabel?: string | null;
}

export interface Category {
  href: string;
  title: string;
  desc: string;
  subcategories: SubCategory[];
  definitionText?: string | null;
  versionLabel?: string | null;
  versionYear?: number | null;
  relatedTermSlugs?: string[] | null;
  updatedAt?: string | null;
}

export const categories: Category[] = [
  {
    href: "/news",
    title: "整木资讯",
    desc: "行业趋势与企业动态信息中心",
    subcategories: [
      { href: "/news/trends", label: "行业趋势" },
      { href: "/news/enterprise", label: "企业动态" },
      { href: "/news/tech", label: "技术发展" },
      { href: "/news/events", label: "行业活动" },
    ],
  },
  {
    href: "/brands",
    title: "整木市场",
    desc: "整木品牌与整木选购入口",
    subcategories: [
      { href: "/brands/brand", label: "整木品牌" },
      { href: "/brands/buying", label: "整木选购" },
    ],
  },
  {
    href: "/dictionary",
    title: "整木词库",
    desc: "行业概念解释库",
    subcategories: [
      { href: "/dictionary/concepts", label: "基础概念" },
      { href: "/dictionary/terms", label: "技术术语" },
      { href: "/dictionary/segments", label: "行业细分" },
      { href: "/dictionary/brand-baike", label: "品牌百科" },
      { href: "/dictionary/high-end-life", label: "高定生活" },
    ],
  },
  {
    href: "/standards",
    title: "整木标准",
    desc: "材料、工艺、服务标准与标准共建",
    subcategories: [
      { href: "/standards/material", label: "材料标准" },
      { href: "/standards/process", label: "工艺标准" },
      { href: "/standards/service", label: "服务标准" },
      { href: "/standards/co-create", label: "标准共建" },
    ],
  },
  {
    href: "/awards",
    title: "整木评选",
    desc: "行业评选与规则公示",
    subcategories: [
      { href: "/huadianbang", label: "华点榜" },
      { href: "/huadianbang/2025", label: "年度榜单" },
      { href: "/huadianbang/feature", label: "特色奖项" },
      { href: "/huadianbang/partner", label: "配套商推荐" },
    ],
  },
  {
    href: "/youxuan",
    title: "整木优选",
    desc: "行业书籍与木作护理精选频道",
    subcategories: [],
  },
  {
    href: "/membership",
    title: "会员系统",
    desc: "企业自运营后台与内容共建入口",
    subcategories: [
      { href: "/membership", label: "会员权益介绍" },
      { href: "/membership/profile", label: "企业资料管理" },
      { href: "/membership/content/verification", label: "企业认证申请" },
      { href: "/membership/content/publish", label: "内容发布" },
      { href: "/membership/content/status", label: "内容审核状态" },
    ],
  },
];

export function getCategoryByHref(href: string): Category | undefined {
  return categories.find((c) => href === c.href || href.startsWith(c.href + "/"));
}
