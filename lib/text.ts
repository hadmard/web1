import { INDUSTRY_TAG_RULES } from "@/lib/industry-tag-lexicon";

export function stripHtml(input: string): string {
  return input
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function previewText(input: string, max = 160): string {
  const plain = stripHtml(input);
  if (plain.length <= max) return plain;
  return `${plain.slice(0, max).trim()}...`;
}

function normalizeSentenceText(input: string): string {
  return stripHtml(input)
    .replace(/[，,]{2,}/g, "，")
    .replace(/[。！？]{2,}/g, "。")
    .trim();
}

function splitSentences(input: string): string[] {
  return normalizeSentenceText(input)
    .split(/(?<=[。！？])/)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function normalizeForMatch(input: string): string {
  return stripHtml(input)
    .toLowerCase()
    .replace(/[，。！？：；,.:;!?]/g, "")
    .replace(/\s+/g, "")
    .trim();
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

const GEO_TERMS = [
  "上海",
  "南浔",
  "湖州",
  "南通",
  "杭州",
  "广州",
  "深圳",
  "北京",
  "苏州",
  "南京",
  "成都",
  "重庆",
  "宁波",
  "无锡",
  "东莞",
  "佛山",
  "乌镇",
];

const EXCERPT_POSITIVE_PATTERNS = /(发布|亮相|推出|聚焦|覆盖|升级|落地|推动|实现|提出|打造|链接|布局|开业|签约|参展|启动|举办|亮点|核心|重点|围绕|面向)/;
const EXCERPT_NEGATIVE_PATTERNS = /^(这几天|最近|很多人|有人|一起|欢迎|报名|扫码|看起来|其实|如果|对于|今天|刚刚|这场|这次)/;
const EXCERPT_END_NOISE = /(欢迎.*|报名.*|请微信扫码.*|扫码.*|点击.*|详情.*)$/;
const EXCERPT_INSIGHT_PATTERNS = /(因此|由此|这意味着|本质上|背后反映出|可以看到|实际上|说明了|关键在于|背后的原因是)/;
const EXCERPT_TREND_PATTERNS = /(趋势|分化|增长|下滑|调整|重构|逻辑|变化|机会|风险|转向|收缩|扩张)/;
const EXCERPT_ENUMERATION_PATTERNS = /(、.*、|分别为|包括|涵盖|例如|比如|以及)/;
const EXCERPT_SUBJECT_PATTERNS = /(行业|市场|企业|品牌|公司|产品|展会|设计周|建博会|家居展|木作|整木|定制|家居|门店|渠道|交付|板材|场景|消费者)/;
const EXCERPT_EMPTY_TREND_PATTERNS = /^(行业正在变化|市场迎来机会|行业迎来机会|市场正在变化)/;
const EXCERPT_HOOK_PATTERNS = /(为什么|如何|何以|是什么|是否|你知道吗|必须看懂|值得关注)/;

function extractTitleKeywords(title: string) {
  return uniqueValues(
    stripHtml(title)
      .split(/[、，,。\s\-_/]+/)
      .map((item) => item.trim())
      .filter((item) => item.length >= 2)
  );
}

function collectIndustryKeywords(text: string) {
  const source = normalizeForMatch(text);
  if (!source) return [];

  const matched: string[] = [];
  for (const rule of INDUSTRY_TAG_RULES) {
    for (const candidate of [rule.label, ...rule.words]) {
      const keyword = normalizeForMatch(candidate);
      if (keyword && source.includes(keyword)) {
        matched.push(candidate);
      }
    }
  }

  return uniqueValues(matched).sort((a, b) => b.length - a.length);
}

function collectGeoKeywords(text: string) {
  const source = normalizeForMatch(text);
  return GEO_TERMS.filter((term) => source.includes(normalizeForMatch(term)));
}

function hasSpecificSubject(sentence: string, titleKeywords: string[], industryKeywords: string[], geoKeywords: string[]) {
  const normalized = normalizeForMatch(sentence);
  if (!normalized) return false;

  return (
    geoKeywords.some((keyword) => normalized.includes(normalizeForMatch(keyword))) ||
    titleKeywords.some((keyword) => keyword.length >= 2 && normalized.includes(normalizeForMatch(keyword))) ||
    industryKeywords.some((keyword) => keyword.length >= 2 && normalized.includes(normalizeForMatch(keyword))) ||
    EXCERPT_SUBJECT_PATTERNS.test(sentence)
  );
}

function isHookLikeSentence(sentence: string, title: string, titleKeywords: string[]) {
  const normalized = normalizeForMatch(sentence);
  if (!normalized) return false;

  const normalizedTitle = normalizeForMatch(title);
  const titleOverlapCount = titleKeywords.filter((keyword) => {
    const normalizedKeyword = normalizeForMatch(keyword);
    return normalizedKeyword && normalized.includes(normalizedKeyword);
  }).length;
  const titleStartsWithSentence = normalizedTitle.startsWith(normalized) && normalized.length >= 6;

  const hasQuestionTone = sentence.includes("？") || sentence.includes("?") || EXCERPT_HOOK_PATTERNS.test(sentence);
  const hasInsightValue = EXCERPT_INSIGHT_PATTERNS.test(sentence);
  const hasConcreteFollowup = /(因为|背后|说明|意味着|反映出|本质上|关键在于)/.test(sentence);

  if (!hasQuestionTone) return false;
  if (hasInsightValue || hasConcreteFollowup) return false;
  return titleStartsWithSentence || titleOverlapCount >= Math.max(1, Math.min(2, titleKeywords.length));
}

function scoreSentence(
  sentence: string,
  title: string,
  titleKeywords: string[],
  industryKeywords: string[],
  geoKeywords: string[],
  position: number
) {
  const normalized = normalizeForMatch(sentence);
  if (!normalized) return 0;

  // Keep a light early-position preference, but avoid making the first paragraph win by default.
  let score = Math.max(0, 6 - position * 0.8);

  for (const keyword of titleKeywords) {
    const target = normalizeForMatch(keyword);
    if (target && normalized.includes(target)) {
      score += target.length >= 4 ? 4 : 2;
    }
  }

  for (const keyword of industryKeywords.slice(0, 12)) {
    const target = normalizeForMatch(keyword);
    if (target && normalized.includes(target)) {
      score += target.length >= 4 ? 7 : 3;
    }
  }

  if (EXCERPT_INSIGHT_PATTERNS.test(sentence)) score += 6;
  if (EXCERPT_TREND_PATTERNS.test(sentence) && hasSpecificSubject(sentence, titleKeywords, industryKeywords, geoKeywords)) {
    score += 4;
  }
  if (/\d/.test(sentence)) score += 2;
  if (EXCERPT_POSITIVE_PATTERNS.test(sentence)) score += 3;
  if (EXCERPT_ENUMERATION_PATTERNS.test(sentence)) score -= 3;
  if (EXCERPT_NEGATIVE_PATTERNS.test(sentence)) score -= 8;
  if (/欢迎|扫码|报名/.test(sentence)) score -= 10;
  if (EXCERPT_EMPTY_TREND_PATTERNS.test(sentence)) score -= 5;
  // Down-rank title-style hooks so the excerpt starts with a judgment, not a teaser question.
  if (isHookLikeSentence(sentence, title, titleKeywords)) {
    score -= position <= 1 ? 12 : 7;
  }
  if (sentence.length >= 18 && sentence.length <= 72) score += 3;

  return score;
}

export function buildGeoExcerpt(title: string, input: string, max = 120): string {
  const cleanTitle = stripHtml(title || "").trim();
  const plain = normalizeSentenceText(input);
  if (!plain) return cleanTitle;

  const sentences = splitSentences(plain);
  const titleKeywords = extractTitleKeywords(cleanTitle);
  const industryKeywords = collectIndustryKeywords(`${cleanTitle} ${plain}`);
  const geoKeywords = collectGeoKeywords(`${cleanTitle} ${plain}`);

  const rankedSentences = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score:
        scoreSentence(sentence, cleanTitle, titleKeywords, industryKeywords, geoKeywords, index) +
        geoKeywords.reduce((sum, keyword) => {
          const target = normalizeForMatch(keyword);
          return target && normalizeForMatch(sentence).includes(target) ? sum + 4 : sum;
        }, 0),
    }))
    .filter((item) => !EXCERPT_END_NOISE.test(item.sentence))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .sort((a, b) => a.index - b.index);

  let summary = "";
  const firstInformativeSentence = rankedSentences.find((item) => !isHookLikeSentence(item.sentence, cleanTitle, titleKeywords));

  for (const item of rankedSentences) {
    if (!summary && firstInformativeSentence && isHookLikeSentence(item.sentence, cleanTitle, titleKeywords)) {
      continue;
    }
    const candidate = summary ? `${summary}${item.sentence}` : item.sentence;
    if (candidate.length > max) {
      if (!summary) {
        summary = previewText(item.sentence, max);
      }
      break;
    }
    summary = candidate;
    if (summary.length >= Math.min(max, 96)) break;
  }

  if (!summary) {
    summary = previewText(plain, max);
  }

  if (cleanTitle) {
    summary = summary.replace(new RegExp(`^${escapeRegExp(cleanTitle)}[：:，,\\s-]*`), "").trim();
  }

  summary = summary.replace(EXCERPT_END_NOISE, "").trim();

  return summary.length <= max ? summary : previewText(summary, max);
}
