import { prisma } from "./prisma";
import {
  SEO_DISALLOWED_TOPIC_PATTERNS,
  SEO_INTENT_TEMPLATES,
  SEO_KEYWORD_SEEDS,
  SEO_REQUIRED_INTENT_TERMS,
  type SeoKeywordSeed,
} from "./seo-keyword-seeds";
import { findSeoDuplicateReason, isDuplicateSeoIntent, normalizeSeoText } from "./seo-dedup";
import { slugify } from "./slug";

export type ExistingSeoReference = {
  id: string;
  title: string;
  slug: string;
  content: string;
  sourceUrl: string | null;
};

export type SeoTopicCandidate = {
  title: string;
  slug: string;
  keywordSeed: string;
  keywordIntent: string;
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
  filterReasonCounts: Record<string, number>;
};

type SiteEntityFrequency = {
  keyword: string;
  count: number;
};

type TitlePreset = {
  seed: string;
  intent: string;
  title: string;
};

const TITLE_PRESETS: TitlePreset[] = [
  { seed: "整木定制多少钱一平", intent: "多少钱", title: "整木定制多少钱一平？不同户型真实预算一次讲清" },
  { seed: "整木定制价格", intent: "报价", title: "整木定制价格怎么算？为什么同样方案报价差这么多" },
  { seed: "整木定制预算", intent: "预算", title: "整木定制预算怎么做？很多家庭超支都卡在这一步" },
  { seed: "整木定制10万够不够", intent: "预算", title: "整木定制10万够不够？100平常见预算分配一次说透" },
  { seed: "整木定制100平多少钱", intent: "多少钱", title: "整木定制100平多少钱？先看预算会花在哪些地方" },
  { seed: "整木定制怎么选", intent: "怎么选", title: "整木定制怎么选？很多人第一步就判断错了" },
  { seed: "整木定制选品牌", intent: "怎么判断", title: "整木定制怎么判断品牌靠不靠谱？先看这几个关键点" },
  { seed: "整木定制选门店", intent: "怎么选", title: "整木定制选门店怎么判断？别只看展厅和折扣" },
  { seed: "整木定制选工厂", intent: "怎么判断", title: "整木定制选工厂怎么判断？交付能力比低价更重要" },
  { seed: "整木定制选实木还是多层板", intent: "怎么选", title: "整木定制选实木还是多层板？很多人一开始就选错了" },
  { seed: "整木定制怎么不踩坑", intent: "避坑", title: "整木定制怎么不踩坑？这5个环节最容易多花冤枉钱" },
  { seed: "整木定制有没有必要", intent: "有没有必要", title: "整木定制有没有必要？先看你家到底适不适合" },
  { seed: "整木定制值不值", intent: "值不值", title: "整木定制值不值？预算和入住体验要一起看" },
  { seed: "整木定制和全屋定制区别", intent: "区别", title: "整木定制和全屋定制区别在哪？很多人预算一开始就算错了" },
  { seed: "整木定制靠谱吗", intent: "靠不靠谱", title: "整木定制靠不靠谱？关键不是风格，而是交付能不能落地" },
  { seed: "整木定制工期", intent: "工期多久", title: "整木定制工期多久？很多项目都拖在这3个环节" },
  { seed: "整木工厂怎么接单", intent: "怎么做", title: "整木工厂怎么接单？很多工厂做了网站却没有客户" },
  { seed: "整木工厂获客", intent: "获客", title: "整木工厂获客怎么做？为什么投了钱还是没询盘" },
  { seed: "整木工厂客户来源", intent: "询盘", title: "整木工厂客户来源怎么找？先把高意图内容做起来" },
  { seed: "整木工厂订单哪里来", intent: "为什么", title: "整木工厂订单为什么越来越难接？问题常在网站内容" },
  { seed: "整木工厂如何提高询盘质量", intent: "询盘", title: "整木工厂怎么提高询盘质量？先别急着投广告" },
  { seed: "整木门店怎么获客", intent: "获客", title: "整木门店怎么获客？很多门店线索少是内容没做对" },
  { seed: "整木门店怎么成交", intent: "成交", title: "整木门店怎么成交？客户常常卡在报价这一步" },
  { seed: "整木门店转化率低怎么办", intent: "成交", title: "整木门店转化率低怎么办？报价和案例常常先丢分" },
  { seed: "整木门店线上获客", intent: "怎么做", title: "整木门店线上获客怎么做？很多门店卡在内容这一步" },
];

function unique<T>(items: T[]) {
  return Array.from(new Set(items));
}

function incrementCounter(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function extractEntitiesFromTitle(title: string) {
  return unique(
    title
      .split(/[？?！!，,。、“”"'（）()\s\-]+/)
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
  return TITLE_PRESETS.find((item) => item.seed === seed.phrase && item.intent === pattern)?.title ?? null;
}

function buildGenericTitle(seed: SeoKeywordSeed, pattern: string, siteEntities: SiteEntityFrequency[]) {
  const entity = siteEntities.find((item) => !normalizeSeoText(seed.phrase).includes(normalizeSeoText(item.keyword)));
  const fallbackEntity = entity?.keyword ?? (seed.intent === "b_end" ? "客户" : "预算");

  if (seed.intent === "b_end") {
    if (pattern.includes("获客")) return `${seed.phrase}怎么做？为什么很多团队做了内容还是没客户`;
    if (pattern.includes("成交")) return `${seed.phrase}怎么办？客户常常卡在报价和案例这一步`;
    if (pattern.includes("询盘")) return `${seed.phrase}怎么提升？先看网站有没有回答关键问题`;
    if (pattern.includes("怎么做")) return `${seed.phrase}怎么做？很多门店和工厂第一步就做反了`;
    return `${seed.phrase}为什么效果差？问题常常不在投放，而在${fallbackEntity}`;
  }

  if (pattern.includes("多少钱")) return `${seed.phrase}多少钱？很多预算都超在这几个地方`;
  if (pattern.includes("报价")) return `${seed.phrase}报价差距为什么这么大？先看清项目边界`;
  if (pattern.includes("预算")) return `${seed.phrase}预算怎么做？很多家庭第一步就没算对`;
  if (pattern.includes("怎么选")) return `${seed.phrase}怎么选？很多人一开始就容易选错`;
  if (pattern.includes("怎么判断")) return `${seed.phrase}怎么判断？别只看展厅和样板间`;
  if (pattern.includes("区别")) return `${seed.phrase}区别在哪？看懂这几点再决定也不晚`;
  if (pattern.includes("工期多久")) return `${seed.phrase}工期多久？最容易拖延的不只是安装`;
  if (pattern.includes("值不值")) return `${seed.phrase}值不值？先看预算和入住体验再下结论`;
  if (pattern.includes("为什么")) return `${seed.phrase}为什么容易翻车？很多问题都出在前期没想清`;
  if (pattern.includes("靠不靠谱")) return `${seed.phrase}靠不靠谱？关键要看交付和售后`;
  if (pattern.includes("避坑")) return `${seed.phrase}怎么避坑？这些细节很多业主装完才发现`;
  if (pattern.includes("注意事项")) return `${seed.phrase}注意事项有哪些？这几条没看清很容易返工`;

  return `${seed.phrase}为什么不好判断？先把${fallbackEntity}和预算逻辑看明白`;
}

function chooseTopicTitle(seed: SeoKeywordSeed, pattern: string, siteEntities: SiteEntityFrequency[]) {
  return getPresetTitle(seed, pattern) ?? buildGenericTitle(seed, pattern, siteEntities);
}

function scoreTopic(seed: SeoKeywordSeed, pattern: string, title: string, siteEntities: SiteEntityFrequency[]) {
  let score = 60;
  if (seed.intent === "b_end") score += 6;
  if (hasRequiredIntent(`${seed.phrase} ${pattern} ${title}`)) score += 15;
  if (title.includes("为什么") || title.includes("很多")) score += 8;
  if (title.includes("预算") || title.includes("报价") || title.includes("询盘") || title.includes("成交")) score += 8;
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
    preferredBCount: 1,
  };
}

export async function loadSeoTopicContext() {
  const existingArticles = await prisma.article.findMany({
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
  });

  const siteEntities = buildSiteEntityFrequencies(existingArticles.map((item) => item.title));
  return { existingArticles, siteEntities };
}

export async function generateSeoTopicCandidates(limit = 30) {
  const { existingArticles, siteEntities } = await loadSeoTopicContext();
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
        const title = chooseTopicTitle(seed, pattern, siteEntities);
        const candidate: SeoTopicCandidate = {
          title,
          slug: slugify(title),
          keywordSeed: seed.phrase,
          keywordIntent: pattern,
          userIntentLine: `${seed.phrase} ${pattern}`.trim(),
          audience: resolveAudience(seed),
          group: seed.group,
          score: scoreTopic(seed, pattern, title, siteEntities),
          dedupReason: null,
        };

        rawCandidates.push(candidate);

        const combinedText = `${seed.phrase} ${pattern} ${title}`;
        if (!hasRequiredIntent(combinedText)) {
          incrementCounter(filterReasonCounts, "missing_required_intent");
          continue;
        }

        if (SEO_DISALLOWED_TOPIC_PATTERNS.some((rule) => rule.test(title))) {
          incrementCounter(filterReasonCounts, "disallowed_pattern");
          continue;
        }

        if (filteredCandidates.some((item) => isDuplicateSeoIntent(candidate, item))) {
          incrementCounter(filterReasonCounts, "duplicate_seed_intent");
          continue;
        }

        const dedupReason = findSeoDuplicateReason(candidate, existingArticles, { similarityThreshold: 0.935 });
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
      picked.push(candidate);
    }
  }

  if (picked.length < plan.minCount && options.ensureBEnd !== false) {
    const forceB = bCandidates.find(
      (candidate) => !picked.some((item) => item.keywordSeed === candidate.keywordSeed && item.keywordIntent === candidate.keywordIntent),
    );
    if (forceB) picked.push(forceB);
  }

  return picked.slice(0, plan.targetCount);
}

export async function pickSeoTopicsForGeneration(count = 3) {
  const { candidates, rawCandidateCount, filteredCandidateCount, filterReasonCounts } = await generateSeoTopicCandidates(30);

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
    filterReasonCounts: {
      ...filterReasonCounts,
      selection_mode_relaxed: selectionMode === "relaxed" ? 1 : 0,
    },
  };

  return { candidates, picked, stats, selectionMode };
}
