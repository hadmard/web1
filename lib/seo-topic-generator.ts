import { prisma } from "./prisma";
import {
  SEO_DISALLOWED_TOPIC_PATTERNS,
  SEO_INTENT_TEMPLATES,
  SEO_KEYWORD_SEEDS,
  SEO_REQUIRED_INTENT_TERMS,
  type SeoKeywordSeed,
} from "./seo-keyword-seeds";
import { findSeoDuplicateReason, getTitleSimilarity, isDuplicateSeoIntent } from "./seo-dedup";
import { slugify } from "./slug";

export type ExistingSeoReference = {
  id: string;
  title: string;
  slug: string;
  content: string;
  sourceUrl: string | null;
};

export type TitleStyle = "question" | "contrast" | "scene" | "avoidance" | "cognition";
export type BodySkeleton =
  | "budget_breakdown"
  | "pricing_compare"
  | "decision_guide"
  | "scenario_solution"
  | "industry_cognition";

export type SeoTopicCandidate = {
  title: string;
  slug: string;
  keywordSeed: string;
  keywordIntent: string;
  titleStyle: TitleStyle;
  titleFrame: string;
  bodySkeleton: BodySkeleton;
  userIntentLine: string;
  audience: "c_end" | "b_end";
  group: SeoKeywordSeed["group"];
  score: number;
  dedupReason: string | null;
};

export type SeoTopicSelectionStats = {
  rawCandidateCount: number;
  filteredCandidateCount: number;
  finalPickedCount: number;
  historyWindowDays: number;
  filterReasonCounts: Record<string, number>;
};

type SiteEntityFrequency = {
  keyword: string;
  count: number;
};

type TitleBuild = {
  title: string;
  titleStyle: TitleStyle;
  titleFrame: string;
};

type RecentHistoryReference = {
  id: string;
  title: string;
  titleFrame: string | null;
};

const HISTORY_WINDOW_DAYS = 45;
const HISTORY_TITLE_SIMILARITY_THRESHOLD = 0.45;
const TITLE_STYLE_ORDER: TitleStyle[] = ["question", "contrast", "scene", "avoidance", "cognition"];
const SKELETON_ORDER: BodySkeleton[] = [
  "budget_breakdown",
  "pricing_compare",
  "decision_guide",
  "scenario_solution",
  "industry_cognition",
];

const TITLE_PRESETS: Array<{
  seed: string;
  intent: string;
  title: string;
  titleStyle: TitleStyle;
  titleFrame: string;
}> = [
  {
    seed: "整木定制多少钱一平",
    intent: "多少钱",
    title: "整木定制多少钱一平？不同方案的价格差在哪",
    titleStyle: "question",
    titleFrame: "price_per_meter_gap",
  },
  {
    seed: "整木定制价格",
    intent: "报价",
    title: "为什么整木定制价格差这么多？核心成本在这里",
    titleStyle: "contrast",
    titleFrame: "pricing_gap_reason",
  },
  {
    seed: "整木定制预算",
    intent: "预算",
    title: "整木定制预算一般多少？100㎡真实花费拆解",
    titleStyle: "scene",
    titleFrame: "budget_real_cost",
  },
  {
    seed: "整木定制报价",
    intent: "报价",
    title: "整木定制报价怎么看？低价方案为什么容易越做越贵",
    titleStyle: "avoidance",
    titleFrame: "quote_low_price_trap",
  },
  {
    seed: "整木定制10万够不够",
    intent: "预算",
    title: "整木定制10万够吗？哪些地方最容易超预算",
    titleStyle: "scene",
    titleFrame: "ten_wan_budget_gap",
  },
  {
    seed: "整木定制100平多少钱",
    intent: "多少钱",
    title: "整木定制100平多少钱？先看预算会花在哪些地方",
    titleStyle: "scene",
    titleFrame: "hundred_meter_cost_split",
  },
  {
    seed: "整木定制怎么选",
    intent: "怎么选",
    title: "整木定制怎么选？先看设计、报价和交付是否匹配",
    titleStyle: "question",
    titleFrame: "selection_match_delivery",
  },
  {
    seed: "整木定制选品牌",
    intent: "怎么判断",
    title: "整木定制选品牌怎么判断？别只看门店装修和宣传",
    titleStyle: "question",
    titleFrame: "brand_judgement_showroom_bias",
  },
  {
    seed: "整木定制选门店",
    intent: "怎么选",
    title: "整木定制选门店怎么判断？同城案例比展厅更重要",
    titleStyle: "question",
    titleFrame: "store_case_over_showroom",
  },
  {
    seed: "整木定制选工厂",
    intent: "怎么判断",
    title: "整木定制选工厂怎么判断？交付能力比低价更关键",
    titleStyle: "question",
    titleFrame: "factory_delivery_over_low_price",
  },
  {
    seed: "整木定制选实木还是多层板",
    intent: "怎么选",
    title: "整木定制选实木还是多层板？预算和稳定性要一起看",
    titleStyle: "contrast",
    titleFrame: "material_solid_vs_multi",
  },
  {
    seed: "整木定制怎么不踩坑",
    intent: "避坑",
    title: "整木定制怎么不踩坑？先避开最容易加项的环节",
    titleStyle: "avoidance",
    titleFrame: "avoid_extra_items",
  },
  {
    seed: "整木定制有没有必要",
    intent: "有没有必要",
    title: "整木定制有没有必要？先看哪些家庭更适合做",
    titleStyle: "cognition",
    titleFrame: "need_or_not_family_fit",
  },
  {
    seed: "整木定制值不值",
    intent: "值不值",
    title: "整木定制值不值？预算、入住体验和维护成本一起看",
    titleStyle: "cognition",
    titleFrame: "value_judgement_total_cost",
  },
  {
    seed: "整木定制和全屋定制区别",
    intent: "区别",
    title: "整木定制和全屋定制区别在哪？别把预算逻辑算混了",
    titleStyle: "contrast",
    titleFrame: "custom_vs_whole_house_difference",
  },
  {
    seed: "整木定制靠谱吗",
    intent: "靠不靠谱",
    title: "整木定制靠谱吗？关键看报价边界和交付流程",
    titleStyle: "cognition",
    titleFrame: "reliable_or_not_delivery_logic",
  },
  {
    seed: "整木定制工期",
    intent: "工期多久",
    title: "整木定制工期一般多久？哪些环节最容易拖进度",
    titleStyle: "question",
    titleFrame: "timeline_delay_points",
  },
  {
    seed: "整木工厂怎么接单",
    intent: "怎么接单",
    title: "整木工厂怎么接单？先把网站里的高意向问题讲清楚",
    titleStyle: "question",
    titleFrame: "factory_order_high_intent_content",
  },
  {
    seed: "整木工厂获客",
    intent: "获客",
    title: "整木工厂获客为什么总没效果？问题常出在内容入口",
    titleStyle: "contrast",
    titleFrame: "factory_leads_content_entry",
  },
  {
    seed: "整木工厂客户来源",
    intent: "询盘",
    title: "整木工厂客户来源怎么打？先把询盘路径理顺",
    titleStyle: "question",
    titleFrame: "factory_inquiry_path",
  },
  {
    seed: "整木工厂订单哪里来",
    intent: "为什么没有客户",
    title: "整木工厂订单为什么越来越难接？高意向内容没铺开",
    titleStyle: "contrast",
    titleFrame: "factory_order_decline_content_gap",
  },
  {
    seed: "整木工厂如何提高询盘质量",
    intent: "询盘",
    title: "整木工厂如何提高询盘质量？别把流量当成有效客户",
    titleStyle: "avoidance",
    titleFrame: "factory_inquiry_quality_vs_traffic",
  },
  {
    seed: "整木门店怎么获客",
    intent: "怎么获客",
    title: "整木门店怎么获客？同城案例和预算内容要先做起来",
    titleStyle: "question",
    titleFrame: "store_local_case_budget_content",
  },
  {
    seed: "整木门店怎么成交",
    intent: "成交",
    title: "整木门店怎么成交？客户卡点往往不在价格本身",
    titleStyle: "contrast",
    titleFrame: "store_close_customer_block",
  },
  {
    seed: "整木门店转化率低怎么办",
    intent: "成交",
    title: "整木门店转化率低怎么办？先补齐报价前的信任内容",
    titleStyle: "avoidance",
    titleFrame: "store_conversion_trust_before_quote",
  },
  {
    seed: "整木门店线上获客",
    intent: "怎么做",
    title: "整木门店线上获客怎么做？先让网站回答客户最关心的问题",
    titleStyle: "question",
    titleFrame: "store_online_site_answers",
  },
];

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function incrementCounter(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function normalizePattern(pattern: string) {
  return pattern.replace(/\s+/g, "").trim();
}

function buildSeedHash(seed: SeoKeywordSeed, pattern: string) {
  const input = `${seed.group}:${seed.phrase}:${pattern}`;
  return Array.from(input).reduce((sum, char) => sum + char.charCodeAt(0), 0);
}

function extractEntitiesFromTitle(title: string) {
  return unique(
    title
      .split(/[，。、”“‘’？！（）():\s\-]+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2 && /[\u4e00-\u9fa5]/.test(item)),
  );
}

function buildSiteEntityFrequencies(titles: string[]) {
  const counts = new Map<string, number>();
  for (const title of titles) {
    for (const entity of extractEntitiesFromTitle(title)) {
      counts.set(entity, (counts.get(entity) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 24)
    .map(([keyword, count]) => ({ keyword, count })) satisfies SiteEntityFrequency[];
}

function resolveAudience(seed: SeoKeywordSeed) {
  return seed.intent;
}

function hasRequiredIntent(text: string) {
  return SEO_REQUIRED_INTENT_TERMS.some((term) => text.includes(term));
}

function getPresetTitle(seed: SeoKeywordSeed, pattern: string) {
  return TITLE_PRESETS.find((item) => item.seed === seed.phrase && item.intent === pattern) ?? null;
}

function chooseTitleStyle(seed: SeoKeywordSeed, pattern: string): TitleStyle {
  const normalized = normalizePattern(pattern);
  const hash = buildSeedHash(seed, normalized);

  if (normalized.includes("报价") || normalized.includes("为什么") || normalized.includes("区别")) {
    return "contrast";
  }
  if (normalized.includes("避坑") || normalized.includes("注意事项") || normalized.includes("靠不靠谱")) {
    return "avoidance";
  }
  if (normalized.includes("有没有必要") || normalized.includes("值不值")) {
    return "cognition";
  }
  if (normalized.includes("多少钱") || normalized.includes("预算") || normalized.includes("工期多久")) {
    return hash % 2 === 0 ? "scene" : "question";
  }
  if (normalized.includes("获客") || normalized.includes("成交") || normalized.includes("询盘")) {
    return hash % 2 === 0 ? "contrast" : "question";
  }
  if (seed.group === "avoidance") return "avoidance";
  if (seed.group === "decision") return "cognition";
  if (seed.group === "scene" || seed.group === "budget") return "scene";

  return TITLE_STYLE_ORDER[hash % TITLE_STYLE_ORDER.length] ?? "question";
}

function buildQuestionTitle(seed: SeoKeywordSeed) {
  switch (seed.group) {
    case "price":
      return { title: `${seed.phrase}？不同方案的价格差在哪`, titleFrame: "price_question_gap" };
    case "budget":
      return { title: `${seed.phrase}一般多少？先把预算边界算清楚`, titleFrame: "budget_question_boundary" };
    case "timeline":
      return { title: `${seed.phrase}一般多久？哪些环节最容易拖进度`, titleFrame: "timeline_question_delay" };
    case "selection":
      return { title: `${seed.phrase}？先看设计、报价和交付是否匹配`, titleFrame: "selection_question_match" };
    case "material":
      return { title: `${seed.phrase}怎么判断？别只听销售讲材料名词`, titleFrame: "material_question_judge" };
    case "factory":
      return { title: `${seed.phrase}？先把高意向问题讲清楚`, titleFrame: "factory_question_high_intent" };
    case "store":
      return { title: `${seed.phrase}？先把客户最关心的预算讲明白`, titleFrame: "store_question_budget" };
    default:
      return { title: `${seed.phrase}？先把关键判断标准看明白`, titleFrame: "generic_question_standard" };
  }
}

function buildContrastTitle(seed: SeoKeywordSeed) {
  if (seed.group === "price" || seed.group === "budget") {
    return { title: `为什么${seed.phrase.replace(/多少钱一平|多少钱/g, "整木定制价格")}差这么多？核心成本在这里`, titleFrame: "pricing_gap_reason" };
  }
  if (seed.group === "selection" || seed.group === "material") {
    return { title: `${seed.phrase}为什么总选错？真正该比的不是展厅大小`, titleFrame: "selection_compare_wrong_focus" };
  }
  if (seed.group === "factory") {
    return { title: `${seed.phrase}为什么总没效果？问题常出在内容入口`, titleFrame: "factory_compare_content_entry" };
  }
  if (seed.group === "store") {
    return { title: `${seed.phrase}为什么总卡住？客户顾虑往往不在价格`, titleFrame: "store_compare_customer_concern" };
  }
  return { title: `为什么${seed.phrase}差异会这么大？先看真正影响结果的变量`, titleFrame: "generic_compare_variables" };
}

function buildSceneTitle(seed: SeoKeywordSeed) {
  if (seed.group === "price") return { title: `${seed.phrase}？100㎡和别墅方案花费差多少`, titleFrame: "price_scene_house_type" };
  if (seed.group === "budget") return { title: `${seed.phrase}？10万、20万分别能做到什么程度`, titleFrame: "budget_scene_tier" };
  if (seed.group === "timeline") return { title: `${seed.phrase}？装修排期怎么留才不被动`, titleFrame: "timeline_scene_schedule" };
  if (seed.group === "scene") return { title: `${seed.phrase}多少钱？先按空间和功能拆预算`, titleFrame: "scene_solution_space_budget" };
  if (seed.group === "store") return { title: `${seed.phrase}？同城案例怎么讲才更容易留资`, titleFrame: "store_scene_local_case" };
  return { title: `${seed.phrase}？不同户型和方案的差别一次讲清`, titleFrame: "generic_scene_compare" };
}

function buildAvoidanceTitle(seed: SeoKeywordSeed) {
  if (seed.group === "budget" || seed.group === "price") {
    return { title: `${seed.phrase}怎么看？哪些地方最容易超预算`, titleFrame: "budget_avoid_overrun" };
  }
  if (seed.group === "selection" || seed.group === "material") {
    return { title: `${seed.phrase}最容易踩哪些坑？先避开这几种判断误区`, titleFrame: "selection_avoid_pitfall" };
  }
  if (seed.group === "factory") {
    return { title: `${seed.phrase}最容易踩哪些坑？别把流量当成有效询盘`, titleFrame: "factory_avoid_traffic_trap" };
  }
  if (seed.group === "store") {
    return { title: `${seed.phrase}要避开什么问题？很多团队输在报价前`, titleFrame: "store_avoid_before_quote" };
  }
  return { title: `${seed.phrase}要注意什么？先避开最常见的决策误区`, titleFrame: "generic_avoid_notice" };
}

function buildCognitionTitle(seed: SeoKeywordSeed) {
  if (seed.group === "price" || seed.group === "budget") {
    return { title: `为什么${seed.phrase.replace(/多少钱一平|多少钱/g, "整木定制没有统一价格")}？先看报价逻辑`, titleFrame: "cognition_price_no_standard" };
  }
  if (seed.group === "decision") {
    return { title: `${seed.phrase}到底值不值？先看谁更适合做整木`, titleFrame: "decision_cognition_fit" };
  }
  if (seed.group === "factory") {
    if (seed.phrase.includes("怎么办")) {
      return { title: `${seed.phrase}？先把高意向内容入口补齐`, titleFrame: "factory_cognition_fix_entry" };
    }
    return { title: `为什么${seed.phrase.replace(/怎么接单|获客|客户来源|订单哪里来/g, "整木工厂网站没带来客户")}？`, titleFrame: "factory_cognition_site_no_customer" };
  }
  if (seed.group === "store") {
    if (seed.phrase.includes("怎么办")) {
      return { title: `${seed.phrase}？先补齐报价前的信任内容`, titleFrame: "store_cognition_fix_trust" };
    }
    return { title: `为什么${seed.phrase.replace(/怎么成交|怎么获客|线上获客/g, "整木门店内容做了还是没成交")}？`, titleFrame: "store_cognition_content_no_close" };
  }
  return { title: `为什么${seed.phrase}总让人拿不准？先把决策逻辑理顺`, titleFrame: "generic_cognition_logic" };
}

function buildTitleFromStyle(seed: SeoKeywordSeed, style: TitleStyle): TitleBuild {
  if (style === "question") {
    const built = buildQuestionTitle(seed);
    return { title: built.title, titleStyle: style, titleFrame: built.titleFrame };
  }
  if (style === "contrast") {
    const built = buildContrastTitle(seed);
    return { title: built.title, titleStyle: style, titleFrame: built.titleFrame };
  }
  if (style === "scene") {
    const built = buildSceneTitle(seed);
    return { title: built.title, titleStyle: style, titleFrame: built.titleFrame };
  }
  if (style === "avoidance") {
    const built = buildAvoidanceTitle(seed);
    return { title: built.title, titleStyle: style, titleFrame: built.titleFrame };
  }
  const built = buildCognitionTitle(seed);
  return { title: built.title, titleStyle: style, titleFrame: built.titleFrame };
}

function chooseTopicTitle(seed: SeoKeywordSeed, pattern: string): TitleBuild {
  const preset = getPresetTitle(seed, pattern);
  if (preset) {
    return {
      title: preset.title,
      titleStyle: preset.titleStyle,
      titleFrame: preset.titleFrame,
    };
  }

  const titleStyle = chooseTitleStyle(seed, pattern);
  return buildTitleFromStyle(seed, titleStyle);
}

function scoreTopic(
  seed: SeoKeywordSeed,
  pattern: string,
  title: string,
  siteEntities: SiteEntityFrequency[],
  titleStyle: TitleStyle,
) {
  let score = 60;
  if (seed.intent === "b_end") score += 6;
  if (hasRequiredIntent(`${seed.phrase} ${pattern} ${title}`)) score += 15;
  if (title.includes("为什么") || title.includes("区别") || title.includes("超预算")) score += 8;
  if (title.includes("预算") || title.includes("报价") || title.includes("询盘") || title.includes("成交")) score += 8;
  if (titleStyle === "scene" || titleStyle === "contrast") score += 4;
  score += Math.min(12, siteEntities.find((item) => title.includes(item.keyword))?.count ?? 0);
  score -= Math.max(0, title.length - 30);
  return score;
}

function isSeedTemplateCompatible(seed: SeoKeywordSeed, templateKey: string) {
  if (seed.intent === "b_end") return ["factory", "store"].includes(templateKey);
  if (["price", "budget", "timeline"].includes(seed.group)) return ["price"].includes(templateKey);
  if (["selection", "material", "design"].includes(seed.group)) return ["selection", "material"].includes(templateKey);
  if (["avoidance", "decision", "scene"].includes(seed.group)) return ["decision", "selection"].includes(templateKey);
  return false;
}

function buildSelectionPlan(count: number) {
  return {
    targetCount: Math.max(2, Math.min(3, count)),
    minCount: 2,
    preferredCCount: count >= 3 ? 2 : 1,
  };
}

function buildSkeletonOptions(seed: SeoKeywordSeed, titleStyle: TitleStyle, pattern: string): BodySkeleton[] {
  const normalized = normalizePattern(pattern);

  if (seed.intent === "b_end") {
    if (normalized.includes("询盘") || normalized.includes("获客")) {
      return ["decision_guide", "industry_cognition", "pricing_compare"];
    }
    if (normalized.includes("成交")) {
      return ["decision_guide", "scenario_solution", "industry_cognition"];
    }
    return ["industry_cognition", "decision_guide", "pricing_compare"];
  }

  if (titleStyle === "scene") {
    return ["scenario_solution", "budget_breakdown", "decision_guide"];
  }
  if (titleStyle === "contrast") {
    return ["pricing_compare", "industry_cognition", "budget_breakdown"];
  }
  if (titleStyle === "avoidance") {
    return ["budget_breakdown", "decision_guide", "pricing_compare"];
  }
  if (titleStyle === "cognition") {
    return ["industry_cognition", "decision_guide", "scenario_solution"];
  }
  if (seed.group === "budget" || seed.group === "price") {
    return ["budget_breakdown", "pricing_compare", "scenario_solution"];
  }
  return ["decision_guide", "scenario_solution", "industry_cognition"];
}

function chooseBodySkeleton(
  seed: SeoKeywordSeed,
  titleStyle: TitleStyle,
  pattern: string,
  picked: Pick<SeoTopicCandidate, "bodySkeleton">[],
) {
  const preferred = buildSkeletonOptions(seed, titleStyle, pattern);
  const counts = new Map<BodySkeleton, number>();
  for (const item of picked) {
    counts.set(item.bodySkeleton, (counts.get(item.bodySkeleton) ?? 0) + 1);
  }
  const previous = picked[picked.length - 1]?.bodySkeleton ?? null;

  const candidates = unique([...preferred, ...SKELETON_ORDER]);
  const ranked = candidates.sort((left, right) => {
    const leftCount = counts.get(left) ?? 0;
    const rightCount = counts.get(right) ?? 0;
    if (leftCount !== rightCount) return leftCount - rightCount;
    return candidates.indexOf(left) - candidates.indexOf(right);
  });

  const withoutPrevious = ranked.find((item) => item !== previous);
  return withoutPrevious ?? ranked[0] ?? preferred[0] ?? "decision_guide";
}

function isBatchTitleTooSimilar(
  candidate: Pick<SeoTopicCandidate, "title" | "titleFrame">,
  picked: Pick<SeoTopicCandidate, "title" | "titleFrame">[],
) {
  return picked.some((item) => item.titleFrame === candidate.titleFrame || getTitleSimilarity(item.title, candidate.title) > 0.4);
}

function findHistoryDuplicateReason(
  candidate: Pick<SeoTopicCandidate, "title" | "titleFrame">,
  recentHistory: RecentHistoryReference[],
) {
  if (recentHistory.some((item) => item.titleFrame && item.titleFrame === candidate.titleFrame)) {
    return "duplicate_history_frame";
  }
  if (recentHistory.some((item) => getTitleSimilarity(item.title, candidate.title) > HISTORY_TITLE_SIMILARITY_THRESHOLD)) {
    return "similar_history_title";
  }
  return null;
}

export async function loadSeoTopicContext() {
  const historyStartAt = new Date();
  historyStartAt.setDate(historyStartAt.getDate() - HISTORY_WINDOW_DAYS);

  const [existingArticles, recentHistory] = await Promise.all([
    prisma.article.findMany({
      where: {
        OR: [{ categoryHref: { startsWith: "/news" } }, { subHref: { startsWith: "/news" } }],
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 500,
      select: {
        id: true,
        title: true,
        slug: true,
        content: true,
        sourceUrl: true,
      },
    }),
    prisma.article.findMany({
      where: {
        sourceType: "ai_generated",
        createdAt: { gte: historyStartAt },
        status: { in: ["pending", "approved"] },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 120,
      select: {
        id: true,
        title: true,
        reviewNote: true,
      },
    }),
  ]);

  const siteEntities = buildSiteEntityFrequencies(existingArticles.map((item) => item.title));

  return {
    existingArticles,
    siteEntities,
    recentHistory: recentHistory.map((item) => ({
      id: item.id,
      title: item.title,
      titleFrame: item.reviewNote?.match(/titleFrame=([a-z_]+)/)?.[1] ?? null,
    })),
    historyWindowDays: HISTORY_WINDOW_DAYS,
  };
}

export async function generateSeoTopicCandidates(limit = 30) {
  const { existingArticles, siteEntities, recentHistory, historyWindowDays } = await loadSeoTopicContext();
  const rawCandidates: SeoTopicCandidate[] = [];
  const filteredCandidates: SeoTopicCandidate[] = [];
  const filterReasonCounts: Record<string, number> = {};

  for (const seed of SEO_KEYWORD_SEEDS) {
    for (const template of SEO_INTENT_TEMPLATES) {
      if (!isSeedTemplateCompatible(seed, template.key)) {
        incrementCounter(filterReasonCounts, "incompatible_template");
        continue;
      }

      for (const pattern of template.patterns) {
        const built = chooseTopicTitle(seed, pattern);
        const bodySkeleton = chooseBodySkeleton(seed, built.titleStyle, pattern, filteredCandidates);
        const candidate: SeoTopicCandidate = {
          title: built.title,
          slug: slugify(built.title),
          keywordSeed: seed.phrase,
          keywordIntent: pattern,
          titleStyle: built.titleStyle,
          titleFrame: built.titleFrame,
          bodySkeleton,
          userIntentLine: `${seed.phrase} ${pattern}`.trim(),
          audience: resolveAudience(seed),
          group: seed.group,
          score: scoreTopic(seed, pattern, built.title, siteEntities, built.titleStyle),
          dedupReason: null,
        };

        rawCandidates.push(candidate);

        const combinedText = `${seed.phrase} ${pattern} ${candidate.title}`;
        if (!hasRequiredIntent(combinedText)) {
          incrementCounter(filterReasonCounts, "missing_required_intent");
          continue;
        }

        if (SEO_DISALLOWED_TOPIC_PATTERNS.some((rule) => rule.test(candidate.title))) {
          incrementCounter(filterReasonCounts, "disallowed_pattern");
          continue;
        }

        if (filteredCandidates.some((item) => isDuplicateSeoIntent(candidate, item))) {
          incrementCounter(filterReasonCounts, "duplicate_seed_intent");
          continue;
        }

        if (isBatchTitleTooSimilar(candidate, filteredCandidates)) {
          incrementCounter(filterReasonCounts, "similar_batch_title");
          continue;
        }

        const historyReason = findHistoryDuplicateReason(candidate, recentHistory);
        if (historyReason) {
          incrementCounter(filterReasonCounts, historyReason);
          continue;
        }

        const dedupReason = findSeoDuplicateReason(candidate, existingArticles, { similarityThreshold: 0.9 });
        if (dedupReason) {
          candidate.dedupReason = dedupReason;
          incrementCounter(filterReasonCounts, dedupReason.startsWith("similar_title") ? "similar_title" : "duplicate_title_or_slug");
          continue;
        }

        filteredCandidates.push(candidate);
      }
    }
  }

  const sorted = filteredCandidates
    .sort((a, b) => b.score - a.score || a.title.length - b.title.length)
    .slice(0, limit);

  return {
    candidates: sorted,
    rawCandidateCount: rawCandidates.length,
    filteredCandidateCount: filteredCandidates.length,
    filterReasonCounts,
    historyWindowDays,
  };
}

function selectTopicsFromPool(
  candidates: SeoTopicCandidate[],
  count: number,
  options: { allowSameGroup?: boolean; ensureBEnd?: boolean } = {},
) {
  const picked: SeoTopicCandidate[] = [];
  const plan = buildSelectionPlan(count);
  const cCandidates = candidates.filter((item) => item.audience === "c_end");
  const bCandidates = candidates.filter((item) => item.audience === "b_end");

  const canPick = (candidate: SeoTopicCandidate) => {
    if (picked.some((item) => item.keywordSeed === candidate.keywordSeed && item.keywordIntent === candidate.keywordIntent)) {
      return false;
    }
    if (!options.allowSameGroup && picked.some((item) => item.group === candidate.group)) {
      return false;
    }
    if (picked.length > 0 && picked[picked.length - 1]?.titleStyle === candidate.titleStyle) {
      return false;
    }
    if (picked.length > 0 && picked[picked.length - 1]?.bodySkeleton === candidate.bodySkeleton) {
      return false;
    }
    if (isBatchTitleTooSimilar(candidate, picked)) {
      return false;
    }
    return true;
  };

  for (const candidate of cCandidates) {
    if (picked.filter((item) => item.audience === "c_end").length >= plan.preferredCCount) break;
    if (!canPick(candidate)) continue;
    picked.push(candidate);
  }

  if (options.ensureBEnd !== false) {
    const bPick = bCandidates.find((candidate) => canPick(candidate));
    if (bPick) picked.push(bPick);
  }

  for (const candidate of candidates) {
    if (picked.length >= plan.targetCount) break;
    if (!canPick(candidate)) continue;
    picked.push(candidate);
  }

  if (picked.length < plan.minCount) {
    for (const candidate of candidates) {
      if (picked.length >= plan.minCount) break;
      if (picked.some((item) => item.keywordSeed === candidate.keywordSeed && item.keywordIntent === candidate.keywordIntent)) {
        continue;
      }
      if (picked.length > 0 && picked[picked.length - 1]?.bodySkeleton === candidate.bodySkeleton) {
        continue;
      }
      if (isBatchTitleTooSimilar(candidate, picked)) {
        continue;
      }
      picked.push(candidate);
    }
  }

  return picked.slice(0, plan.targetCount);
}

export async function pickSeoTopicsForGeneration(count = 3) {
  const { candidates, rawCandidateCount, filteredCandidateCount, filterReasonCounts, historyWindowDays } =
    await generateSeoTopicCandidates(30);

  let picked = selectTopicsFromPool(candidates, count, { allowSameGroup: false, ensureBEnd: true });
  let selectionMode: "strict" | "relaxed" = "strict";

  if (picked.length < 2) {
    picked = selectTopicsFromPool(candidates, count, { allowSameGroup: true, ensureBEnd: true });
    selectionMode = "relaxed";
  }

  const stats: SeoTopicSelectionStats = {
    rawCandidateCount,
    filteredCandidateCount,
    finalPickedCount: picked.length,
    historyWindowDays,
    filterReasonCounts: {
      ...filterReasonCounts,
      selection_mode_relaxed: selectionMode === "relaxed" ? 1 : 0,
    },
  };

  return { candidates, picked, stats, selectionMode };
}
