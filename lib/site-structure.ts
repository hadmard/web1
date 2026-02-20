/**
 * 站点结构：大类 → 小类 → 内容
 * 用户路径：了解行业 → 了解标准 → 对比品牌 → 建立信任 → 产生联系
 */
export interface SubCategory {
  href: string;
  label: string;
  groupLabel?: string | null; // 栏目首页分组展示，如 行业活动、材料标准
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
  faqs?: { question: string; answer: string }[] | null;
}

/** 栏目体系升级版：八大栏目及子栏目（含分组） */
export const categories: Category[] = [
  {
    href: "/news",
    title: "整木资讯",
    desc: "行业趋势与动态信息中心",
    subcategories: [
      { href: "/news/trends", label: "行业趋势" },
      { href: "/news/enterprise", label: "企业动态" },
      { href: "/news/tech", label: "技术更新" },
      { href: "/news/events/exhibitions", label: "展会报道", groupLabel: "行业活动" },
      { href: "/news/events/forum", label: "论坛纪要", groupLabel: "行业活动" },
      { href: "/news/events/association", label: "协会活动", groupLabel: "行业活动" },
    ],
  },
  {
    href: "/market",
    title: "整木市场",
    desc: "行业品牌结构数据库",
    subcategories: [
      { href: "/market/brands", label: "品牌选择" },
      { href: "/market/categories", label: "品类选择" },
      { href: "/market/regions", label: "区域品牌" },
      { href: "/market/price", label: "整木行情" },
    ],
  },
  {
    href: "/dictionary",
    title: "整木词库",
    desc: "行业概念解释库",
    subcategories: [
      { href: "/dictionary/concepts", label: "基础概念" },
      { href: "/dictionary/terms", label: "技术术语" },
      { href: "/dictionary/business", label: "商业模式" },
      { href: "/dictionary/roles", label: "行业角色" },
    ],
  },
  {
    href: "/standards",
    title: "整木标准",
    desc: "行业分级与标准发布平台",
    subcategories: [
      { href: "/standards/material/veneer", label: "木皮等级", groupLabel: "材料标准" },
      { href: "/standards/material/board", label: "板材等级", groupLabel: "材料标准" },
      { href: "/standards/process/coating", label: "涂装等级", groupLabel: "工艺标准" },
      { href: "/standards/process/joint", label: "拼接标准", groupLabel: "工艺标准" },
      { href: "/standards/process/install", label: "安装标准", groupLabel: "工艺标准" },
      { href: "/standards/service/accept", label: "验收流程", groupLabel: "服务标准" },
      { href: "/standards/service/after", label: "售后规范", groupLabel: "服务标准" },
      { href: "/standards/co-create", label: "标准共建" },
    ],
  },
  {
    href: "/data",
    title: "整木数据",
    desc: "行业数字底座",
    subcategories: [
      { href: "/data/scale", label: "行业规模" },
      { href: "/data/regions", label: "区域分布" },
      { href: "/data/survey", label: "行业调研" },
      { href: "/data/annual", label: "年度报告" },
    ],
  },
  {
    href: "/awards",
    title: "整木评选",
    desc: "权威信任入口",
    subcategories: [
      { href: "/awards/top-brands", label: "十大品牌", groupLabel: "行业评选" },
      { href: "/awards/craft", label: "工艺奖项", groupLabel: "行业评选" },
      { href: "/awards/huadian", label: "华点榜", groupLabel: "行业评选" },
      { href: "/awards/regional", label: "区域榜单" },
      { href: "/awards/criteria", label: "评分维度", groupLabel: "评选规则" },
      { href: "/awards/process", label: "审核流程", groupLabel: "评选规则" },
      { href: "/awards/public", label: "公示制度", groupLabel: "评选规则" },
    ],
  },
  {
    href: "/gallery",
    title: "整木图库",
    desc: "行业视觉数据库",
    subcategories: [
      { href: "/gallery/style/modern", label: "现代", groupLabel: "风格分类" },
      { href: "/gallery/style/new-chinese", label: "新中式", groupLabel: "风格分类" },
      { href: "/gallery/style/italian", label: "意式", groupLabel: "风格分类" },
      { href: "/gallery/craft/joint", label: "拼接", groupLabel: "工艺分类" },
      { href: "/gallery/craft/coating", label: "涂装", groupLabel: "工艺分类" },
      { href: "/gallery/craft/node", label: "节点", groupLabel: "工艺分类" },
      { href: "/gallery/space/living", label: "客厅", groupLabel: "空间分类" },
      { href: "/gallery/space/bedroom", label: "卧室", groupLabel: "空间分类" },
      { href: "/gallery/space/club", label: "会所", groupLabel: "空间分类" },
      { href: "/gallery/enterprise", label: "企业专属图库" },
    ],
  },
  {
    href: "/membership",
    title: "会员系统",
    desc: "企业自运营后台与内容共建入口",
    subcategories: [
      { href: "/membership/login", label: "登录" },
      { href: "/membership/profile", label: "企业资料管理" },
      { href: "/membership/content/news", label: "资讯发布" },
      { href: "/membership/content/gallery", label: "图片管理" },
      { href: "/membership/content/status", label: "内容审核状态" },
    ],
  },
];

export function getCategoryByHref(href: string): Category | undefined {
  return categories.find((c) => href === c.href || href.startsWith(c.href + "/"));
}
