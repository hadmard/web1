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
    .replace(/\s+/g, "")
    .trim();
}

function uniqueValues(values: string[]) {
  return Array.from(new Set(values.map((item) => item.trim()).filter(Boolean)));
}

function extractTitleKeywords(title: string) {
  return uniqueValues(
    stripHtml(title)
      .split(/[：:｜|、，,\s\-_/]+/)
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

function scoreSentence(sentence: string, titleKeywords: string[], industryKeywords: string[], position: number) {
  const normalized = normalizeForMatch(sentence);
  if (!normalized) return 0;

  let score = Math.max(0, 12 - position * 1.5);

  for (const keyword of titleKeywords) {
    const target = normalizeForMatch(keyword);
    if (target && normalized.includes(target)) {
      score += target.length >= 4 ? 8 : 4;
    }
  }

  for (const keyword of industryKeywords.slice(0, 12)) {
    const target = normalizeForMatch(keyword);
    if (target && normalized.includes(target)) {
      score += target.length >= 4 ? 7 : 3;
    }
  }

  if (/\d/.test(sentence)) score += 2;
  if (/(发布|亮相|推出|聚焦|覆盖|升级|落地|推动|实现|提出|打造|链接|加速|布局)/.test(sentence)) score += 3;
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

  const rankedSentences = sentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: scoreSentence(sentence, titleKeywords, industryKeywords, index),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, 3)
    .sort((a, b) => a.index - b.index);

  let summary = "";

  for (const item of rankedSentences) {
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

  if (cleanTitle && !summary.includes(cleanTitle)) {
    const withTitle = `${cleanTitle}：${summary}`;
    return withTitle.length <= max ? withTitle : previewText(withTitle, max);
  }

  return summary.length <= max ? summary : previewText(summary, max);
}
