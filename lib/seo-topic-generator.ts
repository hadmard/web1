import { prisma } from "./prisma";
import {
  SEO_BATCH_CANDIDATE_MAX,
  SEO_BATCH_CANDIDATE_MIN,
  SEO_DISALLOWED_TOPIC_PATTERNS,
  SEO_ENTITY_TERMS,
  SEO_LINE_SEEDS,
  type SeoContentLine,
  type SeoLineSeedConfig,
} from "./seo-keyword-seeds";
import {
  findSeoDuplicateReason,
  getSuffixDupRiskScore,
  getTitlePatternDiversityScore,
  getTitlePatternKey,
  getTitleSimilarity,
  isDuplicateSeoIntent,
  titleSuffixDiversityCheck,
} from "./seo-dedup";
import { slugify } from "./slug";

export type SeoTopicCandidate = {
  title: string;
  slug: string;
  keywordSeed: string;
  keywordIntent: string;
  contentLine: SeoContentLine;
  sectionLabel: string;
  categoryLabel: string;
  subCategoryLabel: string;
  categoryHref: string;
  subHref: string;
  themeLabel: string;
  entityLabel: string;
  patternKey: string;
  intentScore: number;
  businessScore: number;
  extractabilityScore: number;
  entityScore: number;
  dupRiskScore: number;
  titlePatternDiversityScore: number;
  suffixDupRiskScore: number;
  totalScore: number;
  dedupReason: string | null;
};

export type SeoTopicSelectionStats = {
  rawCandidateCount: number;
  filteredCandidateCount: number;
  finalPickedCount: number;
  filterReasonCounts: Record<string, number>;
};

type ExistingSeoReference = {
  id: string;
  title: string;
  slug: string;
  content: string;
  sourceUrl: string | null;
  keywordSeed: string | null;
  keywordIntent: string | null;
  categoryHref: string | null;
  subHref: string | null;
};

const TITLE_NATURALNESS_BANNED_PATTERNS = [
  /怎么做怎么做/,
  /为什么越来越[？?]$/,
  /^[^？?]{0,8}[？?]先看关键判断点$/,
  /报价预算分配/,
  /线上获客[？?]先看/,
  /[？?]很多团队都忽略了$/,
  /[？?]很多人第一步就做反了$/,
] as const;

const GENERIC_TITLE_TAILS = [
  "先看关键判断点",
  "先看真正影响决策的几个点",
  "先看几个关键点",
  "一文看懂",
  "全面解析",
] as const;

function incrementCounter(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function normalizeMainSeed(seed: string) {
  return seed
    .replace(
      /多少钱一平|多少钱|总价怎么算|费用|报价差在哪|预算怎么做|预算分配|为什么会超预算|怎么选|怎么判断|怎么看靠不靠谱|怎么看值不值|应该看哪些点|区别在哪|哪个好|避坑|注意事项|哪些地方最容易踩坑|增项一般出在哪里|工期一般多久|设计到安装多久|怎么验收|怎么签合同|为什么越来越重要|为什么开始重视|为什么不能只靠老办法|为什么没效果|为什么越来越难|为什么客户不回复|为什么客户不下单|为什么询盘不精准|背后反映了什么变化|问题可能不在流量|未必只是客户不精准|应该怎么布局|哪些模块必须有|哪些页面最该先补|怎么提高转化|怎么减少反复沟通|怎么让客户更容易看懂|怎么让搜索更容易理解|怎么做搜索内容布局|产品页怎么写|如何用AI做推广|如何用AI做内容|如何用AI写官网|如何用AI做案例展示|哪些环节适合用AI|哪些环节不能只靠AI|用AI做推广要注意什么|用AI做内容最容易踩什么坑/g,
      "",
    )
    .replace(/AI内容推广|AI官网布局|AI内容协作|AI整理案例/g, "AI")
    .trim();
}

function getThemeRoot(seed: string) {
  if (seed.includes("整木门店")) return "整木门店";
  if (seed.includes("整木工厂")) return "整木工厂";
  if (seed.includes("整木行业")) return "整木行业";
  if (seed.includes("整木定制")) return "整木定制";
  if (seed.includes("高定木作")) return "高定木作";
  if (seed.includes("定制家具")) return "定制家具";
  if (seed.includes("AI")) return "AI";
  return normalizeMainSeed(seed).slice(0, 8);
}

function getTopicCluster(candidate: Pick<SeoTopicCandidate, "contentLine" | "entityLabel" | "keywordIntent" | "keywordSeed">) {
  const seed = `${candidate.entityLabel}${candidate.keywordIntent}${candidate.keywordSeed}`;
  if (candidate.contentLine === "buying") {
    if (/报价|价格|预算|总价|费用|增项/.test(seed)) return "buying-price";
    if (/板材|木皮|五金|工艺|收口|环保/.test(seed)) return "buying-material";
    if (/合同|验收|工期|安装|交付/.test(seed)) return "buying-delivery";
    if (/工厂|门店|品牌/.test(seed)) return "buying-choice";
    return "buying-other";
  }
  if (candidate.contentLine === "trend") {
    if (/AI/.test(seed)) return "trend-ai";
    if (/获客|流量|询盘/.test(seed)) return "trend-lead";
    if (/官网|案例|交付/.test(seed)) return "trend-display";
    return "trend-other";
  }
  if (/AI/.test(seed)) return "tech-ai";
  if (/官网|模块/.test(seed)) return "tech-website";
  if (/案例/.test(seed)) return "tech-case";
  if (/产品|搜索/.test(seed)) return "tech-product-search";
  return "tech-other";
}

function isIncompleteQuestion(title: string) {
  return /为什么越来越[？?]$/.test(title) || /如何用AI[？?]$/.test(title);
}

export function titleNaturalnessCheck(title: string) {
  const normalized = title.trim();
  if (!normalized) return { ok: false as const, reason: "empty_title" };
  if (TITLE_NATURALNESS_BANNED_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return { ok: false as const, reason: "title_naturalness_banned_pattern" };
  }
  if (isIncompleteQuestion(normalized)) {
    return { ok: false as const, reason: "title_incomplete_question" };
  }
  if ((normalized.match(/怎么/g) || []).length >= 2) {
    return { ok: false as const, reason: "title_repeated_intent_word" };
  }
  if ((normalized.match(/[？?]/g) || []).length > 1) {
    return { ok: false as const, reason: "title_multiple_questions" };
  }
  if (normalized.length < 14 || normalized.length > 34) {
    return { ok: false as const, reason: "title_length_unbalanced" };
  }

  const parts = normalized.split(/[？?]/);
  if (parts.length >= 2) {
    const head = parts[0]?.trim() || "";
    const tail = parts.slice(1).join("？").trim();
    if (head.length < 8) return { ok: false as const, reason: "title_question_head_too_short" };
    if (!tail) return { ok: false as const, reason: "title_missing_tail" };
    if (GENERIC_TITLE_TAILS.includes(tail as (typeof GENERIC_TITLE_TAILS)[number])) {
      return { ok: false as const, reason: "title_tail_too_generic" };
    }
    if (/先看关键判断点|先看几个关键点/.test(tail)) {
      return { ok: false as const, reason: "title_too_internal" };
    }
  }

  if (/报价预算|获客为什么越来越|内容怎么布局怎么/.test(normalized)) {
    return { ok: false as const, reason: "title_collocation_awkward" };
  }

  return { ok: true as const, reason: null };
}

export function mainSeedBatchDiversityCheck(candidate: SeoTopicCandidate, accepted: SeoTopicCandidate[]) {
  const root = normalizeMainSeed(candidate.keywordSeed);
  const themeRoot = getThemeRoot(candidate.keywordSeed);
  const cluster = getTopicCluster(candidate);

  if (accepted.filter((item) => normalizeMainSeed(item.keywordSeed) === root).length >= 1) {
    return { ok: false as const, reason: "duplicate_main_seed_root" };
  }

  if (accepted.filter((item) => getTopicCluster(item) === cluster).length >= 1) {
    return { ok: false as const, reason: "duplicate_topic_cluster" };
  }

  if (candidate.contentLine === "buying" && accepted.filter((item) => item.contentLine === "buying" && getThemeRoot(item.keywordSeed) === themeRoot).length >= 1) {
    return { ok: false as const, reason: "duplicate_buying_theme_root" };
  }

  if (accepted.filter((item) => item.contentLine === candidate.contentLine && getThemeRoot(item.keywordSeed) === themeRoot).length >= 2) {
    return { ok: false as const, reason: "duplicate_theme_root" };
  }

  return { ok: true as const, reason: null };
}

function buildBuyingTitle(theme: string, entity: string, intent: string) {
  if (/多少钱|费用|总价怎么算|报价差在哪/.test(intent)) {
    return `${theme}${entity}${intent}？先把影响总价的项目拆开`;
  }
  if (/预算怎么做|预算分配|为什么会超预算|哪些钱不能省/.test(intent)) {
    return `${theme}${intent}？先把最容易失控的几项看清`;
  }
  if (/怎么选|适合什么人|不适合什么人|应该先比较什么/.test(intent)) {
    return `${theme}${entity}${intent}？先看预算、空间和交付边界`;
  }
  if (/怎么判断|怎么看/.test(intent)) {
    return `${theme}${entity}${intent}？别只看展厅和单价`;
  }
  if (/区别在哪|哪个好/.test(intent)) {
    return `${theme}和${entity}${intent}？先看预算和使用场景`;
  }
  if (/避坑|注意事项|踩坑|增项/.test(intent)) {
    return `${theme}${entity}${intent}？很多问题都出在前期没问清`;
  }
  if (/工期|安装|验收|合同/.test(intent)) {
    return `${theme}${intent}？关键要把交付边界写清楚`;
  }
  return `${theme}${entity}${intent}？关键不只看单价`;
}

function buildTrendTitle(theme: string, entity: string, intent: string) {
  if (/AI/.test(intent) || /AI/.test(entity)) {
    if (/官网/.test(entity) || /内容/.test(entity)) {
      return `${theme}为什么要用AI做内容布局？先看哪些环节真的能提效`;
    }
    if (/获客/.test(intent)) {
      return `AI会不会改变${theme}的线上获客方式？关键看内容和展示怎么配合`;
    }
    return `${theme}为什么开始重视AI推广？很多变化都指向内容效率`;
  }
  if (/报价后流失/.test(entity) && /客户不回复/.test(intent)) {
    return `${theme}报价后客户为什么不回复？问题往往不只在流量`;
  }
  if (/线上获客/.test(entity) && /客户不回复/.test(intent)) {
    return `${theme}线上获客有流量却没咨询？很多问题出在前端展示`;
  }
  if (/询盘/.test(intent + entity)) {
    return `${theme}为什么总觉得询盘不精准？很多问题出在内容筛选不够早`;
  }
  if (/客户不下单/.test(intent)) {
    return `${theme}咨询不少却难成交？问题往往不只在流量`;
  }
  if (/官网|案例|交付/.test(entity)) {
    return `${theme}为什么越来越重视${entity}？客户判断方式已经变了`;
  }
  if (/搜索流量|线上获客/.test(entity)) {
    return `${theme}${entity}为什么越来越重要？高意向客户越来越先在线上做判断`;
  }
  return `${theme}${entity}${intent}？背后反映的是获客方式在变化`;
}

function buildTechTitle(theme: string, entity: string, intent: string) {
  if (/AI/.test(intent) || /AI/.test(theme) || /AI/.test(entity)) {
    if (/案例/.test(entity)) {
      return `${theme}如何用AI整理案例，才更容易被客户和搜索看懂`;
    }
    if (/官网/.test(entity)) {
      return `${theme}如何用AI做官网内容，才能提高咨询转化`;
    }
    if (/产品/.test(entity)) {
      return `${theme}如何用AI写产品页，才能提高内容产出效率`;
    }
    if (/问答/.test(entity)) {
      return `${theme}如何用AI写客户问答内容，减少重复沟通`;
    }
    if (/短视频/.test(entity)) {
      return `${theme}如何用AI写短视频脚本，先把案例和工艺资料喂对`;
    }
    if (/搜索/.test(entity)) {
      return `${theme}如何用AI做搜索内容布局，先把页面分层搭清楚`;
    }
    return `${theme}${entity}${intent}，关键是先分清哪些环节适合交给AI`;
  }
  if (/模块/.test(intent)) {
    return `${theme}${entity}${intent}？先补高意向客户最关心的信息`;
  }
  if (/页面/.test(intent)) {
    return `${theme}${entity}${intent}？先做能减少反复沟通的页面`;
  }
  if (/搜索/.test(intent) || /产品页怎么写/.test(intent)) {
    return `${theme}${entity}${intent}，更容易被搜索理解`;
  }
  if (/转化|沟通|看懂/.test(intent)) {
    return `${theme}${entity}${intent}，才能减少反复沟通`;
  }
  return `${theme}${entity}${intent}，先把客户最关心的问题写明白`;
}

function createTitle(theme: string, entity: string, intent: string, line: SeoContentLine) {
  if (line === "buying") return buildBuyingTitle(theme, entity, intent);
  if (line === "trend") return buildTrendTitle(theme, entity, intent);
  return buildTechTitle(theme, entity, intent);
}

function humanizePhraseSeed(phrase: string, line: SeoContentLine) {
  if (line === "buying") {
    if (/报价单怎么看|总价怎么算|为什么差这么大|超预算/.test(phrase)) {
      return `${phrase}？先把影响价格的几项拆开`;
    }
    if (/板材|木皮|五金|收口|环保/.test(phrase)) {
      return `${phrase}？别只看单个材料名词`;
    }
    if (/合同|验收|工期/.test(phrase)) {
      return `${phrase}？关键要把交付边界问清楚`;
    }
    return `${phrase}？先看预算、工艺和交付能不能对上`;
  }

  if (line === "trend") {
    if (/AI/.test(phrase)) {
      if (/获客方式/.test(phrase)) {
        return `${phrase}？关键看内容效率和展示效率`;
      }
      return `${phrase}？很多团队开始补的不是工具，而是内容结构`;
    }
    if (/报价后|询盘质量|成交率低/.test(phrase)) {
      return `${phrase}？问题往往不只在流量`;
    }
    return `${phrase}？客户判断方式已经变了`;
  }

  if (/AI/.test(phrase)) {
    if (/官网/.test(phrase)) return `${phrase}，才能提高咨询转化`;
    if (/案例/.test(phrase)) return `${phrase}，才更容易被客户和搜索理解`;
    if (/问答/.test(phrase)) return `${phrase}，减少重复沟通`;
    if (/搜索/.test(phrase)) return `${phrase}，先把页面结构搭清楚`;
    return `${phrase}，关键是先分清哪些环节适合交给AI`;
  }
  if (/模块/.test(phrase)) return `${phrase}？先补高意向客户最关心的信息`;
  if (/产品页/.test(phrase)) return `${phrase}，更容易被搜索理解`;
  return `${phrase}，才能提高咨询效率`;
}

function buildKeywordSeed(theme: string, entity: string, intent: string) {
  return `${theme}${entity}${intent}`.replace(/\s+/g, "");
}

function calculateIntentScore(title: string, intent: string) {
  let score = 66;
  if (title.includes("？")) score += 8;
  if (/多少钱|预算|怎么|为什么|AI/.test(intent)) score += 12;
  if (title.length >= 18 && title.length <= 30) score += 8;
  return Math.min(100, score);
}

function calculateBusinessScore(line: SeoContentLine, entity: string, intent: string) {
  let score = line === "buying" ? 78 : 72;
  if (/工厂|门店|官网|案例|产品页|询盘|交付|AI/.test(entity)) score += 10;
  if (/转化|询盘|预算|价格|AI/.test(intent)) score += 8;
  return Math.min(100, score);
}

function calculateExtractabilityScore(title: string, intent: string) {
  let score = 68;
  if (title.includes("？")) score += 8;
  if (/为什么|怎么|AI/.test(intent)) score += 10;
  return Math.min(100, score);
}

function calculateEntityScore(title: string) {
  const hitCount = SEO_ENTITY_TERMS.filter((term) => title.includes(term)).length;
  return Math.min(100, 58 + hitCount * 10);
}

function isBuyingArticle(article: ExistingSeoReference) {
  return (article.categoryHref || "").startsWith("/brands/buying") || (article.subHref || "").startsWith("/brands/buying");
}

async function loadExistingSeoReferences() {
  return prisma.article.findMany({
    where: {
      OR: [
        { categoryHref: { startsWith: "/news" } },
        { subHref: { startsWith: "/news" } },
        { categoryHref: { startsWith: "/brands/buying" } },
        { subHref: { startsWith: "/brands/buying" } },
      ],
    },
    orderBy: [{ updatedAt: "desc" }],
    take: 1200,
    select: {
      id: true,
      title: true,
      slug: true,
      content: true,
      sourceUrl: true,
      keywordSeed: true,
      keywordIntent: true,
      categoryHref: true,
      subHref: true,
    },
  });
}

function buildCandidatesForLine(lineConfig: SeoLineSeedConfig) {
  const candidates: SeoTopicCandidate[] = [];

  for (const theme of lineConfig.themes) {
    for (const entity of lineConfig.entities) {
      for (const intent of lineConfig.intents) {
        for (const pattern of intent.patterns) {
          const title = createTitle(theme.label, entity.label, pattern, lineConfig.line);
          const keywordSeed = buildKeywordSeed(theme.label, entity.label, pattern);

          candidates.push({
            title,
            slug: slugify(title),
            keywordSeed,
            keywordIntent: pattern,
            contentLine: lineConfig.line,
            sectionLabel: lineConfig.sectionLabel,
            categoryLabel: lineConfig.categoryLabel,
            subCategoryLabel: lineConfig.subCategoryLabel,
            categoryHref: lineConfig.categoryHref,
            subHref: lineConfig.subHref,
            themeLabel: theme.label,
            entityLabel: entity.label,
            patternKey: getTitlePatternKey(title),
            intentScore: calculateIntentScore(title, pattern),
            businessScore: calculateBusinessScore(lineConfig.line, entity.label, pattern),
            extractabilityScore: calculateExtractabilityScore(title, pattern),
            entityScore: calculateEntityScore(title),
            dupRiskScore: 0,
            titlePatternDiversityScore: 100,
            suffixDupRiskScore: 0,
            totalScore: 0,
            dedupReason: null,
          });
        }
      }
    }
  }

  for (const phrase of lineConfig.phraseSeeds) {
    const title = humanizePhraseSeed(phrase, lineConfig.line);
    candidates.push({
      title,
      slug: slugify(title),
      keywordSeed: phrase,
      keywordIntent: "seed_phrase",
      contentLine: lineConfig.line,
      sectionLabel: lineConfig.sectionLabel,
      categoryLabel: lineConfig.categoryLabel,
      subCategoryLabel: lineConfig.subCategoryLabel,
      categoryHref: lineConfig.categoryHref,
      subHref: lineConfig.subHref,
      themeLabel: lineConfig.themes.find((item) => phrase.includes(item.label))?.label ?? lineConfig.themes[0]?.label ?? phrase,
      entityLabel: lineConfig.entities.find((item) => phrase.includes(item.label))?.label ?? lineConfig.entities[0]?.label ?? phrase,
      patternKey: getTitlePatternKey(title),
      intentScore: 84,
      businessScore: 82,
      extractabilityScore: 80,
      entityScore: calculateEntityScore(title),
      dupRiskScore: 0,
      titlePatternDiversityScore: 100,
      suffixDupRiskScore: 0,
      totalScore: 0,
      dedupReason: null,
    });
  }

  return candidates;
}

function filterCandidate(
  candidate: SeoTopicCandidate,
  existingArticles: ExistingSeoReference[],
  accepted: SeoTopicCandidate[],
  filterReasonCounts: Record<string, number>,
) {
  if (SEO_DISALLOWED_TOPIC_PATTERNS.some((pattern) => pattern.test(candidate.title))) {
    incrementCounter(filterReasonCounts, "disallowed_pattern");
    return false;
  }

  const titleDiversity = titleSuffixDiversityCheck(candidate.title, accepted.map((item) => item.title));
  if (!titleDiversity.ok) {
    incrementCounter(filterReasonCounts, titleDiversity.reason);
    return false;
  }

  const naturalness = titleNaturalnessCheck(candidate.title);
  if (!naturalness.ok) {
    incrementCounter(filterReasonCounts, naturalness.reason);
    return false;
  }

  const mainSeedDiversity = mainSeedBatchDiversityCheck(candidate, accepted);
  if (!mainSeedDiversity.ok) {
    incrementCounter(filterReasonCounts, mainSeedDiversity.reason);
    return false;
  }

  if (accepted.some((item) => isDuplicateSeoIntent(candidate, item))) {
    incrementCounter(filterReasonCounts, "duplicate_seed_intent");
    return false;
  }

  if (accepted.some((item) => getTitleSimilarity(item.title, candidate.title) >= 0.88)) {
    incrementCounter(filterReasonCounts, "similar_batch_title");
    return false;
  }

  const dedupReason = findSeoDuplicateReason(candidate, existingArticles);
  if (dedupReason) {
    candidate.dedupReason = dedupReason;
    incrementCounter(filterReasonCounts, dedupReason.split(":")[0] ?? "dedup_reason");
    return false;
  }

  return true;
}

function scoreCandidate(candidate: SeoTopicCandidate, acceptedTitles: string[]) {
  const suffixDupRiskScore = getSuffixDupRiskScore(candidate.title, acceptedTitles);
  const titlePatternDiversityScore = getTitlePatternDiversityScore(candidate.title, acceptedTitles);
  const dupRiskScore = Math.min(100, suffixDupRiskScore + Math.max(0, 60 - titlePatternDiversityScore));
  const totalScore =
    candidate.intentScore * 0.28 +
    candidate.businessScore * 0.24 +
    candidate.extractabilityScore * 0.2 +
    candidate.entityScore * 0.16 +
    titlePatternDiversityScore * 0.12 -
    dupRiskScore * 0.18;

  return {
    suffixDupRiskScore,
    titlePatternDiversityScore,
    dupRiskScore,
    totalScore: Number(totalScore.toFixed(2)),
  };
}

function getLatestNewsLine(existingReferences: ExistingSeoReference[]): SeoContentLine {
  const latestNews = existingReferences.find(
    (item) => (item.categoryHref || "").startsWith("/news") || (item.subHref || "").startsWith("/news"),
  );

  if ((latestNews?.subHref || "").startsWith("/news/tech")) return "tech";
  return "trend";
}

function buildSelectionPlan(count: number, preferredDailyNewsLine: SeoContentLine) {
  if (count <= 3) return ["buying", "buying", preferredDailyNewsLine] as SeoContentLine[];
  if (count === 4) return ["buying", "buying", "trend", "tech"] as SeoContentLine[];
  return ["buying", "buying", "buying", "trend", "tech"] as SeoContentLine[];
}

function pickByPlan(candidates: SeoTopicCandidate[], count: number, preferredDailyNewsLine: SeoContentLine) {
  const plan = buildSelectionPlan(count, preferredDailyNewsLine);
  const quotas = plan.reduce<Record<string, number>>((acc, line) => {
    acc[line] = (acc[line] || 0) + 1;
    return acc;
  }, {});
  const picked: SeoTopicCandidate[] = [];
  const canUseCandidate = (
    candidate: SeoTopicCandidate,
    strict = true,
    enforceQuota = true,
  ) => {
    if (
      enforceQuota &&
      (picked.filter((item) => item.contentLine === candidate.contentLine).length || 0) >= (quotas[candidate.contentLine] || 0)
    ) {
      return false;
    }
    if (picked.some((item) => item.keywordSeed === candidate.keywordSeed)) return false;
    if (picked.some((item) => getTitleSimilarity(item.title, candidate.title) >= (strict ? 0.84 : 0.92))) return false;
    if (!titleNaturalnessCheck(candidate.title).ok) return false;
    if (strict && !mainSeedBatchDiversityCheck(candidate, picked).ok) return false;
    return titleSuffixDiversityCheck(candidate.title, picked.map((item) => item.title)).ok;
  };

  for (const line of plan) {
    const next = candidates
      .filter((item) => item.contentLine === line)
      .find((item) => canUseCandidate(item, true, true));

    if (next) picked.push(next);
  }

  for (const candidate of candidates) {
    if (picked.length >= count) break;
    if (!canUseCandidate(candidate, true, true)) continue;
    picked.push(candidate);
  }

  for (const line of plan) {
    if (picked.length >= count) break;
    while ((picked.filter((item) => item.contentLine === line).length || 0) < (quotas[line] || 0)) {
      const fallback = candidates
        .filter((item) => item.contentLine === line)
        .find((item) => canUseCandidate(item, false, true));
      if (!fallback) break;
      picked.push(fallback);
      if (picked.length >= count) break;
    }
  }

  if (count >= 4) {
    for (const candidate of candidates) {
      if (picked.length >= count) break;
      if (!canUseCandidate(candidate, false, false)) continue;
      picked.push(candidate);
    }
  }

  return picked.slice(0, count);
}

export async function generateSeoTopicCandidates(limit = SEO_BATCH_CANDIDATE_MAX) {
  const existingArticles = await loadExistingSeoReferences();
  const rawCandidates = [
    ...buildCandidatesForLine(SEO_LINE_SEEDS.buying),
    ...buildCandidatesForLine(SEO_LINE_SEEDS.trend),
    ...buildCandidatesForLine(SEO_LINE_SEEDS.tech),
  ];
  const filteredCandidates: SeoTopicCandidate[] = [];
  const filterReasonCounts: Record<string, number> = {};

  for (const candidate of rawCandidates) {
    if (!filterCandidate(candidate, existingArticles, filteredCandidates, filterReasonCounts)) continue;

    const score = scoreCandidate(candidate, filteredCandidates.map((item) => item.title));
    filteredCandidates.push({
      ...candidate,
      suffixDupRiskScore: score.suffixDupRiskScore,
      titlePatternDiversityScore: score.titlePatternDiversityScore,
      dupRiskScore: score.dupRiskScore,
      totalScore: score.totalScore,
    });
  }

  const sorted = filteredCandidates
    .sort((a, b) => b.totalScore - a.totalScore || a.title.length - b.title.length)
    .slice(0, Math.max(SEO_BATCH_CANDIDATE_MIN, Math.min(limit, SEO_BATCH_CANDIDATE_MAX)));

  return {
    candidates: sorted,
    rawCandidateCount: rawCandidates.length,
    filteredCandidateCount: filteredCandidates.length,
    filterReasonCounts,
  };
}

export async function pickSeoTopicsForGeneration(count = 3) {
  const { candidates, rawCandidateCount, filteredCandidateCount, filterReasonCounts } = await generateSeoTopicCandidates();

  const existingReferences = await loadExistingSeoReferences();
  const buyingExistingCount = existingReferences.filter(isBuyingArticle).length;
  const preferredDailyNewsLine = getLatestNewsLine(existingReferences) === "trend" ? "tech" : "trend";

  const boosted = candidates
    .map((candidate) => ({
      ...candidate,
      totalScore:
        candidate.totalScore +
        (candidate.contentLine === "buying" ? 4 : 0) +
        (/AI/.test(candidate.title) ? 2 : 0) +
        (candidate.contentLine !== "buying" && buyingExistingCount < 30 ? -2 : 0),
    }))
    .sort((a, b) => b.totalScore - a.totalScore);

  let picked = pickByPlan(boosted, count, preferredDailyNewsLine);
  if (count >= 4) {
    const trendAiCandidate = boosted.find(
      (item) => item.contentLine === "trend" && /AI/.test(item.title) && titleNaturalnessCheck(item.title).ok,
    );
    if (trendAiCandidate && !picked.some((item) => item.contentLine === "trend" && /AI/.test(item.title))) {
      const trendIndex = picked.findIndex((item) => item.contentLine === "trend");
      if (trendIndex >= 0) picked[trendIndex] = trendAiCandidate;
    }

    const techAiCandidate = boosted.find(
      (item) => item.contentLine === "tech" && /AI/.test(item.title) && titleNaturalnessCheck(item.title).ok,
    );
    if (techAiCandidate && !picked.some((item) => item.contentLine === "tech" && /AI/.test(item.title))) {
      const techIndex = picked.findIndex((item) => item.contentLine === "tech");
      if (techIndex >= 0) picked[techIndex] = techAiCandidate;
    }
  } else if (count >= 3 && !picked.some((item) => /AI/.test(item.title))) {
    const aiCandidate = boosted.find(
      (item) =>
        item.contentLine === preferredDailyNewsLine && /AI/.test(item.title) && titleNaturalnessCheck(item.title).ok,
    );
    if (aiCandidate) {
      const replacementIndex = picked.findIndex((item) => item.contentLine === preferredDailyNewsLine);
      if (replacementIndex >= 0) picked[replacementIndex] = aiCandidate;
    }
  }

  const stats: SeoTopicSelectionStats = {
    rawCandidateCount,
    filteredCandidateCount,
    finalPickedCount: picked.length,
    filterReasonCounts,
  };

  return { candidates: boosted, picked, stats };
}
