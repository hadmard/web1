export type SeoContentLine = "buying" | "trend" | "tech";

export type SeoTopicTheme = {
  slug: string;
  label: string;
  synonyms?: string[];
};

export type SeoEntityTerm = {
  slug: string;
  label: string;
  synonyms?: string[];
};

export type SeoIntentTerm = {
  slug: string;
  label: string;
  patterns: string[];
  family:
    | "price"
    | "selection"
    | "judgement"
    | "comparison"
    | "risk"
    | "timeline"
    | "method"
    | "trend"
    | "ai";
};

export type SeoInternalLinkTarget = {
  title: string;
  href: string;
  keyword: string;
  prompt: string;
};

export type SeoLineSeedConfig = {
  line: SeoContentLine;
  sectionLabel: string;
  categoryLabel: string;
  subCategoryLabel: string;
  categoryHref: string;
  subHref: string;
  ratioWeight: number;
  themes: SeoTopicTheme[];
  entities: SeoEntityTerm[];
  intents: SeoIntentTerm[];
  phraseSeeds: string[];
  preferredInternalLinks: SeoInternalLinkTarget[];
};

export const SEO_AUTOGEN_SOURCE = "auto_dual_line_seo_generator" as const;
export const SEO_APPROVED_DEFAULT = false;
export const DEFAULT_SEO_GENERATION_COUNT = 3;
export const SEO_BATCH_CANDIDATE_MIN = 10;
export const SEO_BATCH_CANDIDATE_MAX = 20;

export const SEO_ENTITY_TERMS = [
  "整木定制",
  "高定木作",
  "定制家具",
  "整木工厂",
  "整木门店",
  "护墙板",
  "木门",
  "柜体",
  "板材",
  "木皮",
  "五金",
  "收口",
  "安装",
  "交付",
  "预算",
  "官网",
  "案例",
  "询盘",
  "AI",
] as const;

export const SEO_BANNED_TITLE_SUFFIX_PATTERNS = [
  "这3点一定要看",
  "这5点一定要看",
  "问题可能出在这3点",
  "一文看懂",
  "全面解析",
  "深度揭秘",
  "看完就懂",
  "建议收藏",
  "别再踩坑了",
  "内行人才知道",
  "很多人都忽略了",
  "终于有人讲清楚了",
  "很多人第一步就做反了",
  "很多团队都忽略了",
] as const;

export const SEO_DISALLOWED_TOPIC_PATTERNS = [
  /榜单/,
  /排行/,
  /十大/,
  /top/i,
  /品牌专题/,
  /品牌推荐/,
  /品牌盘点/,
  /营销软文/,
  /企业动态/,
  /活动报道/,
  /展会快讯/,
] as const;

export const SEO_CORE_INTERNAL_LINKS: Record<SeoContentLine, SeoInternalLinkTarget[]> = {
  buying: [
    {
      title: "整木定制多少钱一平",
      href: "/brands/buying",
      keyword: "整木定制多少钱一平",
      prompt: "如果你想先看整木定制价格区间，可以接着读",
    },
    {
      title: "整木定制预算怎么控制",
      href: "/brands/buying",
      keyword: "整木定制预算怎么控制",
      prompt: "如果你更关心预算拆分和增项控制，可以再看",
    },
    {
      title: "整木定制怎么选品牌",
      href: "/brands/buying",
      keyword: "整木定制怎么选品牌",
      prompt: "如果你还在比较门店和工厂，也可以参考",
    },
  ],
  trend: [
    {
      title: "整木工厂官网应该具备哪些内容模块",
      href: "/news/zheng-mu-gong-chang-guan-wang-ying-gai-ju-bei-nei-rong-mo-kuai",
      keyword: "整木工厂官网应该具备哪些内容模块",
      prompt: "如果你想继续看官网结构怎么搭，可以接着读",
    },
    {
      title: "整木门店官网内容怎么布局，才能提高咨询转化",
      href: "/news/zheng-mu-men-dian-guan-wang-nei-rong-zen-me-bu-ju-cai-neng-ti-gao-zi-xun-zhuan-hua",
      keyword: "整木门店官网内容怎么布局",
      prompt: "如果你更关注门店侧怎么落地，可以再看",
    },
    {
      title: "整木工厂产品页怎么写，更容易被搜索理解",
      href: "/news/zheng-mu-gong-chang-chan-pin-ye-zen-me-xie-geng-rong-yi-bei-sou-suo-li-jie",
      keyword: "整木工厂产品页怎么写",
      prompt: "如果你在补产品内容页，也可以参考",
    },
  ],
  tech: [
    {
      title: "整木门店案例页怎么写",
      href: "/news/zheng-mu-men-dian-an-li-ye-zen-me-xie",
      keyword: "整木门店案例页怎么写",
      prompt: "如果你准备补案例页，可以顺着看",
    },
    {
      title: "整木工厂案例系统怎么搭建",
      href: "/news/zheng-mu-gong-chang-an-li-xi-tong-zen-me-da-jian",
      keyword: "整木工厂案例系统怎么搭建",
      prompt: "如果你还缺案例系统方法，可以继续看",
    },
    {
      title: "整木工厂如何表达工艺优势",
      href: "/news/zheng-mu-gong-chang-ru-he-biao-da-gong-yi-you-shi",
      keyword: "整木工厂如何表达工艺优势",
      prompt: "如果你还想把工艺优势写得更清楚，可以再看",
    },
  ],
};

const buyingIntents: SeoIntentTerm[] = [
  {
    slug: "price",
    label: "价格预算",
    patterns: ["多少钱", "多少钱一平", "总价怎么算", "费用", "报价差在哪"],
    family: "price",
  },
  {
    slug: "budget",
    label: "预算控制",
    patterns: ["预算怎么做", "预算分配", "哪些钱不能省", "为什么会超预算"],
    family: "price",
  },
  {
    slug: "selection",
    label: "选择判断",
    patterns: ["怎么选", "适合什么人", "不适合什么人", "应该先比较什么"],
    family: "selection",
  },
  {
    slug: "judgement",
    label: "判断识别",
    patterns: ["怎么判断", "怎么看靠不靠谱", "怎么看值不值", "应该看哪些点"],
    family: "judgement",
  },
  {
    slug: "comparison",
    label: "对比决策",
    patterns: ["区别在哪", "哪个好", "报价差在哪"],
    family: "comparison",
  },
  {
    slug: "risk",
    label: "风险避坑",
    patterns: ["避坑", "注意事项", "哪些地方最容易踩坑", "增项一般出在哪里"],
    family: "risk",
  },
  {
    slug: "timeline",
    label: "工期验收",
    patterns: ["工期一般多久", "设计到安装多久", "怎么验收", "怎么签合同"],
    family: "timeline",
  },
];

const trendIntents: SeoIntentTerm[] = [
  {
    slug: "trend-why",
    label: "趋势变化",
    patterns: ["为什么越来越重要", "为什么开始重视", "为什么不能只靠老办法", "为什么没效果"],
    family: "trend",
  },
  {
    slug: "trend-risk",
    label: "经营难点",
    patterns: ["为什么越来越难", "为什么客户不回复", "为什么客户不下单", "为什么询盘不精准"],
    family: "trend",
  },
  {
    slug: "trend-judgement",
    label: "行业判断",
    patterns: ["背后反映了什么变化", "问题可能不在流量", "未必只是客户不精准"],
    family: "judgement",
  },
  {
    slug: "ai-trend",
    label: "AI推广趋势",
    patterns: ["为什么要用AI做内容", "为什么要用AI做官网", "AI会不会改变线上获客", "为什么需要AI提高推广效率"],
    family: "ai",
  },
];

const techIntents: SeoIntentTerm[] = [
  {
    slug: "layout",
    label: "布局搭建",
    patterns: ["应该怎么布局", "哪些模块必须有", "哪些页面最该先补"],
    family: "method",
  },
  {
    slug: "conversion",
    label: "提高转化",
    patterns: ["怎么提高转化", "怎么减少反复沟通", "怎么让客户更容易看懂"],
    family: "method",
  },
  {
    slug: "search",
    label: "搜索理解",
    patterns: ["怎么让搜索更容易理解", "怎么做搜索内容布局", "产品页怎么写"],
    family: "method",
  },
  {
    slug: "ai-method",
    label: "AI内容方法",
    patterns: ["如何用AI做推广", "如何用AI做内容", "如何用AI写官网", "如何用AI做案例展示"],
    family: "ai",
  },
  {
    slug: "ai-risk",
    label: "AI使用边界",
    patterns: ["哪些环节适合用AI", "哪些环节不能只靠AI", "用AI做推广要注意什么", "用AI做内容最容易踩什么坑"],
    family: "ai",
  },
];

export const SEO_LINE_SEEDS: Record<SeoContentLine, SeoLineSeedConfig> = {
  buying: {
    line: "buying",
    sectionLabel: "整木市场",
    categoryLabel: "整木市场",
    subCategoryLabel: "整木选购",
    categoryHref: "/brands/buying",
    subHref: "/brands/buying",
    ratioWeight: 70,
    themes: [
      { slug: "zhengmu", label: "整木定制", synonyms: ["整木", "整木家装"] },
      { slug: "gaoding", label: "高定木作", synonyms: ["高定", "高端木作"] },
      { slug: "dingzhi", label: "定制家具", synonyms: ["木作定制", "定制家居"] },
    ],
    entities: [
      { slug: "price", label: "报价", synonyms: ["报价单", "套餐"] },
      { slug: "budget", label: "预算", synonyms: ["总价", "预算分配"] },
      { slug: "board", label: "板材", synonyms: ["多层板", "实木", "原木"] },
      { slug: "veneer", label: "木皮", synonyms: ["饰面", "贴皮"] },
      { slug: "hardware", label: "五金", synonyms: ["铰链", "拉手"] },
      { slug: "craft", label: "工艺", synonyms: ["拼缝", "收口", "油漆工艺"] },
      { slug: "factory", label: "工厂", synonyms: ["整木工厂"] },
      { slug: "store", label: "门店", synonyms: ["整木门店", "品牌门店"] },
      { slug: "contract", label: "合同", synonyms: ["条款", "增项约定"] },
      { slug: "acceptance", label: "验收", synonyms: ["安装验收", "交付验收"] },
      { slug: "timeline", label: "工期", synonyms: ["交付周期", "安装时间"] },
      { slug: "scene", label: "户型", synonyms: ["小户型", "别墅", "大平层"] },
    ],
    intents: buyingIntents,
    phraseSeeds: [
      "整木定制总价怎么算",
      "整木定制预算怎么做",
      "整木定制预算分配",
      "整木定制超预算怎么办",
      "整木定制报价差异为什么这么大",
      "整木定制报价单怎么看",
      "整木定制怎么选门店",
      "整木定制怎么选工厂",
      "整木定制值不值得做",
      "整木定制适合什么人",
      "整木定制和全屋定制区别在哪",
      "整木定制用实木还是多层板",
      "整木定制木皮怎么选",
      "整木定制五金怎么选",
      "整木定制收口怎么判断",
      "整木定制环保怎么看",
      "整木定制工期一般多久",
      "整木定制合同怎么签",
      "整木定制怎么验收",
      "高定木作为什么贵",
      "高定木作哪些地方最贵",
      "高定木作怎么选工厂",
      "高定木作值不值",
      "高定木作和整木定制哪个好",
      "高定木作用什么板材更稳",
      "定制家具报价为什么差这么多",
      "定制家具哪些项目容易超支",
      "定制家具怎么选板材",
      "定制家具怎么选五金",
      "别墅适合整木定制还是高定木作",
    ],
    preferredInternalLinks: SEO_CORE_INTERNAL_LINKS.buying,
  },
  trend: {
    line: "trend",
    sectionLabel: "整木资讯",
    categoryLabel: "整木资讯",
    subCategoryLabel: "行业趋势",
    categoryHref: "/news",
    subHref: "/news/trends",
    ratioWeight: 15,
    themes: [
      { slug: "store", label: "整木门店", synonyms: ["门店", "经销门店"] },
      { slug: "factory", label: "整木工厂", synonyms: ["工厂", "制造端"] },
      { slug: "industry", label: "整木行业", synonyms: ["高定木作行业", "定制家具行业"] },
    ],
    entities: [
      { slug: "lead", label: "线上获客", synonyms: ["搜索获客", "内容获客"] },
      { slug: "quote", label: "报价后流失", synonyms: ["报价后不回复", "成交率低"] },
      { slug: "case", label: "案例展示", synonyms: ["案例表达", "项目案例"] },
      { slug: "website", label: "官网内容", synonyms: ["官网布局", "官网展示"] },
      { slug: "search", label: "搜索流量", synonyms: ["自然流量", "联网搜索"] },
      { slug: "delivery", label: "交付表达", synonyms: ["交付能力", "安装交付"] },
      { slug: "inquiry", label: "询盘质量", synonyms: ["咨询质量", "高质量询盘"] },
      { slug: "ai-content", label: "AI内容推广", synonyms: ["AI推广", "AI内容营销"] },
      { slug: "ai-website", label: "AI官网布局", synonyms: ["AI官网内容", "AI官网优化"] },
    ],
    intents: trendIntents,
    phraseSeeds: [
      "整木门店线上获客为什么越来越重要",
      "整木门店报价后客户为什么不回复",
      "整木门店为什么越来越重视案例展示",
      "整木门店为什么要做官网内容",
      "整木门店为什么不能只靠朋友圈获客",
      "整木工厂获客方式为什么在变化",
      "整木工厂为什么重视官网布局",
      "整木工厂为什么要做内容展示",
      "整木工厂线上内容为什么越来越重要",
      "整木工厂询盘质量低背后反映了什么问题",
      "整木行业搜索流量为什么越来越值得重视",
      "整木行业内容型获客为什么开始替代部分老办法",
      "整木门店为什么要用AI做内容",
      "整木工厂为什么要用AI做官网",
      "AI会不会改变整木行业的线上获客方式",
      "工厂和门店为什么需要AI提高推广效率",
      "整木行业为什么开始重视AI内容布局",
    ],
    preferredInternalLinks: SEO_CORE_INTERNAL_LINKS.trend,
  },
  tech: {
    line: "tech",
    sectionLabel: "整木资讯",
    categoryLabel: "整木资讯",
    subCategoryLabel: "技术发展",
    categoryHref: "/news",
    subHref: "/news/tech",
    ratioWeight: 15,
    themes: [
      { slug: "store", label: "整木门店", synonyms: ["门店"] },
      { slug: "factory", label: "整木工厂", synonyms: ["工厂"] },
    ],
    entities: [
      { slug: "website", label: "官网内容", synonyms: ["官网结构", "官网页面"] },
      { slug: "case", label: "案例页", synonyms: ["案例系统", "案例展示"] },
      { slug: "product", label: "产品页", synonyms: ["产品介绍", "产品内容"] },
      { slug: "quote", label: "报价页", synonyms: ["报价展示", "报价解释"] },
      { slug: "search", label: "搜索布局", synonyms: ["搜索内容布局", "本地搜索"] },
      { slug: "delivery", label: "交付流程", synonyms: ["交付展示", "安装流程"] },
      { slug: "craft", label: "工艺表达", synonyms: ["工艺优势", "板材表达"] },
      { slug: "faq", label: "客户问答内容", synonyms: ["常见问题内容", "答疑内容"] },
      { slug: "script", label: "短视频脚本", synonyms: ["视频脚本", "内容脚本"] },
      { slug: "inquiry", label: "询盘筛选", synonyms: ["筛掉低质量询盘", "提高询盘质量"] },
      { slug: "ai-case", label: "AI整理案例", synonyms: ["AI案例整理", "AI案例结构化"] },
    ],
    intents: techIntents,
    phraseSeeds: [
      "整木门店官网内容怎么布局",
      "整木门店案例页怎么写",
      "整木门店报价页怎么优化",
      "整木门店本地搜索怎么布局",
      "整木门店如何通过内容提高咨询转化",
      "整木门店如何通过案例减少反复沟通",
      "整木工厂官网应该有哪些内容模块",
      "整木工厂产品页怎么写",
      "整木工厂案例系统怎么搭建",
      "整木工厂如何通过内容筛掉低质量询盘",
      "整木工厂如何表达工艺优势",
      "整木工厂如何做交付流程展示",
      "整木工厂如何做搜索内容布局",
      "整木门店如何用AI做官网内容",
      "整木门店如何用AI做案例页",
      "整木门店如何用AI写客户问答内容",
      "整木门店如何用AI写短视频脚本",
      "整木门店如何用AI优化本地搜索内容",
      "整木工厂如何用AI做官网布局",
      "整木工厂如何用AI整理案例",
      "整木工厂如何用AI写产品页",
      "整木工厂如何用AI表达工艺优势",
      "整木工厂如何用AI做搜索内容布局",
      "整木工厂如何用AI提高内容产出效率",
      "整木工厂如何用AI辅助询盘筛选",
    ],
    preferredInternalLinks: SEO_CORE_INTERNAL_LINKS.tech,
  },
};
