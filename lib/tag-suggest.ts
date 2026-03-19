import {
  AUTO_TAG_LIMIT,
  INDUSTRY_CATEGORY_HINTS,
  INDUSTRY_TAG_RULES,
  type TagRule,
} from "@/lib/industry-tag-lexicon";

function normalize(text: string) {
  return text.toLowerCase().replace(/\s+/g, "");
}

function countOccurrences(text: string, needle: string) {
  if (!needle) return 0;
  let count = 0;
  let from = 0;
  while (from < text.length) {
    const idx = text.indexOf(needle, from);
    if (idx < 0) break;
    count += 1;
    from = idx + needle.length;
  }
  return count;
}

function uniq(arr: string[]) {
  return Array.from(new Set(arr.map((x) => x.trim()).filter(Boolean)));
}

function scoreRule(source: string, rule: TagRule, weight = 1) {
  let score = (rule.base ?? 0) * weight;
  for (const word of rule.words) {
    const hit = countOccurrences(source, normalize(word));
    if (hit > 0) {
      score += hit * weight * (word.length >= 4 ? 4 : 2);
    }
  }
  return score;
}

export { AUTO_TAG_LIMIT };

export function suggestTagsFromText(text: string, max = AUTO_TAG_LIMIT): string[] {
  const source = normalize(text);
  if (!source) return [];

  const scoreMap = new Map<string, number>();

  for (const rule of INDUSTRY_TAG_RULES) {
    const score = scoreRule(source, rule);
    if (score > 0) scoreMap.set(rule.label, score);
  }

  for (const hint of INDUSTRY_CATEGORY_HINTS) {
    if (!source.includes(hint.hit)) continue;
    for (const tag of hint.tags) {
      scoreMap.set(tag, (scoreMap.get(tag) ?? 0) + 2);
    }
  }

  return Array.from(scoreMap.entries())
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([label]) => label)
    .filter(Boolean)
    .slice(0, max);
}

export function suggestTagsForGeo(params: {
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
  categoryHref?: string | null;
  subHref?: string | null;
  max?: number;
}): string[] {
  const max = params.max ?? AUTO_TAG_LIMIT;
  const scoreMap = new Map<string, number>();
  const segments = [
    { text: params.title ?? "", weight: 4 },
    { text: params.excerpt ?? "", weight: 3 },
    { text: params.content ?? "", weight: 2 },
    { text: [params.categoryHref, params.subHref].filter(Boolean).join(" "), weight: 2 },
  ];

  for (const segment of segments) {
    const source = normalize(segment.text);
    if (!source) continue;

    for (const rule of INDUSTRY_TAG_RULES) {
      const score = scoreRule(source, rule, segment.weight);
      if (score > 0) {
        scoreMap.set(rule.label, (scoreMap.get(rule.label) ?? 0) + score);
      }
    }
  }

  const hintSource = normalize([params.categoryHref, params.subHref, params.title, params.excerpt].filter(Boolean).join(" "));
  for (const hint of INDUSTRY_CATEGORY_HINTS) {
    if (!hintSource.includes(hint.hit)) continue;
    for (const tag of hint.tags) {
      scoreMap.set(tag, (scoreMap.get(tag) ?? 0) + 6);
    }
  }

  const ranked = Array.from(scoreMap.entries())
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map(([label]) => label);

  return uniq(ranked).slice(0, max);
}

export function parseTagInput(input?: string | null): string[] {
  if (!input) return [];
  return uniq(input.split(/[\uff0c,\n\r\t ]+/g));
}

export function resolveTagSlugs(params: {
  manualTagInput?: string | null;
  title?: string | null;
  excerpt?: string | null;
  content?: string | null;
  categoryHref?: string | null;
  subHref?: string | null;
}): string[] {
  const manual = parseTagInput(params.manualTagInput);
  if (manual.length > 0) return manual;
  return suggestTagsForGeo(params);
}
