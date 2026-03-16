type TagRule = {
  label: string;
  words: string[];
  base?: number;
};

export const AUTO_TAG_LIMIT = 4;

const TAG_RULES: TagRule[] = [
  {
    label: "\u884c\u4e1a\u8d8b\u52bf",
    words: [
      "\u884c\u4e1a\u8d8b\u52bf",
      "\u8d8b\u52bf",
      "\u666f\u6c14",
      "\u5e02\u573a\u89c4\u6a21",
      "\u589e\u957f\u7387",
      "\u8d5b\u9053",
    ],
  },
  {
    label: "\u4f01\u4e1a\u52a8\u6001",
    words: [
      "\u4f01\u4e1a\u52a8\u6001",
      "\u4f01\u4e1a",
      "\u54c1\u724c",
      "\u53d1\u5e03\u4f1a",
      "\u878d\u8d44",
      "\u5e76\u8d2d",
      "\u5f00\u5de5",
    ],
  },
  {
    label: "\u6280\u672f\u53d1\u5c55",
    words: [
      "\u6280\u672f\u53d1\u5c55",
      "\u6280\u672f",
      "\u5de5\u827a",
      "\u81ea\u52a8\u5316",
      "\u667a\u80fd\u5236\u9020",
      "\u6570\u63a7",
      "\u8bbe\u5907",
    ],
  },
  {
    label: "\u884c\u4e1a\u6d3b\u52a8",
    words: [
      "\u884c\u4e1a\u6d3b\u52a8",
      "\u5cf0\u4f1a",
      "\u8bba\u575b",
      "\u5c55\u4f1a",
      "\u5927\u4f1a",
      "\u6d3b\u52a8",
      "\u6c99\u9f99",
    ],
  },
  {
    label: "\u6750\u6599\u6807\u51c6",
    words: [
      "\u6750\u6599\u6807\u51c6",
      "\u677f\u6750",
      "\u6728\u76ae",
      "\u4e94\u91d1",
      "\u6750\u6599",
      "\u73af\u4fdd\u7b49\u7ea7",
      "\u7532\u919b",
    ],
  },
  {
    label: "\u5de5\u827a\u6807\u51c6",
    words: [
      "\u5de5\u827a\u6807\u51c6",
      "\u5de5\u827a",
      "\u52a0\u5de5",
      "\u5c01\u8fb9",
      "\u6d82\u88c5",
      "\u62fc\u63a5",
      "\u7cbe\u5ea6",
    ],
  },
  {
    label: "\u670d\u52a1\u6807\u51c6",
    words: [
      "\u670d\u52a1\u6807\u51c6",
      "\u670d\u52a1",
      "\u4ea4\u4ed8",
      "\u5b89\u88c5",
      "\u552e\u540e",
      "\u9a8c\u6536",
    ],
  },
  {
    label: "\u6807\u51c6\u5171\u5efa",
    words: [
      "\u6807\u51c6\u5171\u5efa",
      "\u5171\u5efa",
      "\u5f81\u6c42\u610f\u89c1",
      "\u6807\u51c6\u5316",
      "\u56e2\u4f53\u6807\u51c6",
    ],
  },
  {
    label: "\u54c1\u724c\u5efa\u8bbe",
    words: [
      "\u54c1\u724c\u5efa\u8bbe",
      "\u54c1\u724c\u5b9a\u4f4d",
      "\u54c1\u724c\u5347\u7ea7",
      "\u54c1\u724c\u5f62\u8c61",
      "\u54c1\u724c\u6218\u7565",
    ],
  },
  {
    label: "\u8bbe\u8ba1\u98ce\u683c",
    words: [
      "\u8bbe\u8ba1",
      "\u98ce\u683c",
      "\u7a7a\u95f4",
      "\u5ba1\u7f8e",
      "\u73b0\u4ee3",
      "\u65b0\u4e2d\u5f0f",
      "\u8f7b\u5962",
    ],
  },
  {
    label: "\u5956\u9879\u8bc4\u9009",
    words: [
      "\u8bc4\u9009",
      "\u699c\u5355",
      "\u5956\u9879",
      "\u8bc4\u5ba1",
      "\u5165\u56f4",
      "\u516c\u793a",
    ],
  },
];

const CATEGORY_HINTS: Array<{ hit: string; tags: string[] }> = [
  { hit: "/news", tags: ["\u884c\u4e1a\u8d8b\u52bf", "\u4f01\u4e1a\u52a8\u6001"] },
  { hit: "/brands", tags: ["\u54c1\u724c\u5efa\u8bbe"] },
  { hit: "/dictionary", tags: ["\u884c\u4e1a\u672f\u8bed"] },
  { hit: "/standards", tags: ["\u6750\u6599\u6807\u51c6", "\u5de5\u827a\u6807\u51c6", "\u670d\u52a1\u6807\u51c6"] },
  { hit: "/awards", tags: ["\u5956\u9879\u8bc4\u9009"] },
];

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

export function suggestTagsFromText(text: string, max = AUTO_TAG_LIMIT): string[] {
  const source = normalize(text);
  if (!source) return [];

  const scoreMap = new Map<string, number>();

  for (const rule of TAG_RULES) {
    let score = rule.base ?? 0;
    for (const w of rule.words) {
      const hit = countOccurrences(source, normalize(w));
      if (hit > 0) score += hit * (w.length >= 4 ? 4 : 2);
    }
    if (score > 0) scoreMap.set(rule.label, score);
  }

  for (const hint of CATEGORY_HINTS) {
    if (!source.includes(hint.hit)) continue;
    for (const t of hint.tags) {
      scoreMap.set(t, (scoreMap.get(t) ?? 0) + 2);
    }
  }

  const ranked = Array.from(scoreMap.entries())
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .map((x) => x[0]);

  return uniq(ranked).slice(0, max);
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

    for (const rule of TAG_RULES) {
      let score = 0;
      for (const word of rule.words) {
        const hit = countOccurrences(source, normalize(word));
        if (hit > 0) {
          score += hit * segment.weight * (word.length >= 4 ? 4 : 2);
        }
      }
      if (score > 0) {
        scoreMap.set(rule.label, (scoreMap.get(rule.label) ?? 0) + score + (rule.base ?? 0));
      }
    }
  }

  const hintSource = normalize([params.categoryHref, params.subHref, params.title, params.excerpt].filter(Boolean).join(" "));
  for (const hint of CATEGORY_HINTS) {
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
