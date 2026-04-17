export type SeoSeedGroupKey =
  | "price"
  | "budget"
  | "selection"
  | "avoidance"
  | "material"
  | "store"
  | "factory"
  | "investment"
  | "design"
  | "timeline"
  | "decision"
  | "scene";

export type SeoKeywordSeed = {
  group: SeoSeedGroupKey;
  intent: "c_end" | "b_end";
  phrase: string;
};

export type SeoTopicIntentTemplate = {
  key: string;
  label: string;
  patterns: string[];
};

export type SeoInternalLinkTarget = {
  title: string;
  slug: string;
  keyword: string;
  prompt: string;
};

export const SEO_REQUIRED_INTENT_TERMS = [
  "多少钱",
  "怎么选",
  "怎么做",
  "怎么判断",
  "有没有必要",
  "为什么",
  "工期多久",
  "值不值",
  "区别",
  "靠不靠谱",
  "避坑",
  "注意事项",
  "报价",
  "预算",
  "获客",
  "成交",
  "询盘",
] as const;

export const SEO_CORE_INTERNAL_LINKS: SeoInternalLinkTarget[] = [
  {
    title: "整木定制多少钱一平？2025最新价格区间+预算避坑指南",
    slug: "zheng-mu-ding-zhi-duo-shao-qian-yi-ping",
    keyword: "整木定制多少钱一平",
    prompt: "如果你还不清楚整木定制的价格区间，可以参考",
  },
  {
    title: "整木定制预算怎么控制？3个方法帮你少花3万",
    slug: "zheng-mu-ding-zhi-yu-suan-zen-me-kong-zhi",
    keyword: "整木定制预算怎么控制",
    prompt: "如果你对预算还没有清晰规划，可以参考",
  },
  {
    title: "整木定制怎么选品牌？5个关键点帮你不踩坑",
    slug: "zheng-mu-ding-zhi-zen-me-xuan-pin-pai",
    keyword: "整木定制怎么选品牌",
    prompt: "如果你不知道如何选择靠谱品牌，可以参考",
  },
];

export const SEO_DISALLOWED_TOPIC_PATTERNS = [
  /排行榜/,
  /榜单/,
  /十大/,
  /Top/i,
  /品牌专题/,
  /品牌盘点/,
  /品牌推荐/,
  /行业评论/,
  /趋势预测/,
  /哪家强/,
  /行业趋势分析/,
  /现状观察/,
  /发展路径研究/,
  /深度思考/,
  /市场洞察/,
  /热点盘点/,
  /未来怎么发展/,
] as const;

export const SEO_INTENT_TEMPLATES: SeoTopicIntentTemplate[] = [
  {
    key: "price",
    label: "价格判断",
    patterns: ["多少钱", "多少钱一平", "报价", "预算", "10万够不够", "工期多久"],
  },
  {
    key: "selection",
    label: "选择决策",
    patterns: ["怎么选", "怎么判断", "靠不靠谱", "哪些坑", "避坑", "注意事项"],
  },
  {
    key: "decision",
    label: "决策判断",
    patterns: ["有没有必要", "值不值", "为什么", "区别", "会不会", "靠不靠谱"],
  },
  {
    key: "factory",
    label: "工厂获客",
    patterns: ["怎么接单", "怎么做", "获客", "询盘", "怎么判断", "为什么没有客户"],
  },
  {
    key: "store",
    label: "门店成交",
    patterns: ["怎么获客", "成交", "怎么做", "询盘", "靠不靠谱", "为什么转化低"],
  },
  {
    key: "material",
    label: "材料判断",
    patterns: ["怎么选", "怎么判断", "值不值", "会不会", "避坑", "注意事项"],
  },
];

export const SEO_KEYWORD_SEEDS: SeoKeywordSeed[] = [
  { group: "price", intent: "c_end", phrase: "整木定制多少钱一平" },
  { group: "price", intent: "c_end", phrase: "整木定制价格" },
  { group: "budget", intent: "c_end", phrase: "整木定制预算" },
  { group: "budget", intent: "c_end", phrase: "整木定制报价" },
  { group: "budget", intent: "c_end", phrase: "整木定制10万够不够" },
  { group: "budget", intent: "c_end", phrase: "整木定制100平多少钱" },
  { group: "selection", intent: "c_end", phrase: "整木定制怎么选" },
  { group: "selection", intent: "c_end", phrase: "整木定制选品牌" },
  { group: "selection", intent: "c_end", phrase: "整木定制选门店" },
  { group: "selection", intent: "c_end", phrase: "整木定制选工厂" },
  { group: "material", intent: "c_end", phrase: "整木定制选材料" },
  { group: "material", intent: "c_end", phrase: "整木定制选板材" },
  { group: "material", intent: "c_end", phrase: "整木定制选实木还是多层板" },
  { group: "avoidance", intent: "c_end", phrase: "整木定制怎么不踩坑" },
  { group: "decision", intent: "c_end", phrase: "整木定制有没有必要" },
  { group: "decision", intent: "c_end", phrase: "整木定制值不值" },
  { group: "decision", intent: "c_end", phrase: "整木定制和全屋定制区别" },
  { group: "decision", intent: "c_end", phrase: "整木定制靠谱吗" },
  { group: "decision", intent: "c_end", phrase: "整木定制环保吗" },
  { group: "timeline", intent: "c_end", phrase: "整木定制工期" },
  { group: "factory", intent: "b_end", phrase: "整木工厂怎么接单" },
  { group: "factory", intent: "b_end", phrase: "整木工厂获客" },
  { group: "factory", intent: "b_end", phrase: "整木工厂怎么做线上" },
  { group: "factory", intent: "b_end", phrase: "整木工厂客户来源" },
  { group: "factory", intent: "b_end", phrase: "整木工厂订单哪里来" },
  { group: "factory", intent: "b_end", phrase: "整木工厂如何提高询盘质量" },
  { group: "store", intent: "b_end", phrase: "整木门店怎么获客" },
  { group: "store", intent: "b_end", phrase: "整木门店怎么成交" },
  { group: "store", intent: "b_end", phrase: "整木门店转化率低怎么办" },
  { group: "store", intent: "b_end", phrase: "整木门店线上获客" },
  { group: "store", intent: "b_end", phrase: "整木门店怎么谈客户" },
  { group: "investment", intent: "b_end", phrase: "整木品牌招商怎么做" },
  { group: "design", intent: "c_end", phrase: "整木设计" },
  { group: "scene", intent: "c_end", phrase: "小户型整木定制" },
  { group: "scene", intent: "c_end", phrase: "别墅整木定制" },
];
