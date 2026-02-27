type TagRule = {
  label: string;
  words: string[];
  base?: number;
};

const TAG_RULES: TagRule[] = [
  { label: "行业趋势", words: ["行业趋势", "趋势", "景气", "市场规模", "增长率", "赛道"] },
  { label: "企业动态", words: ["企业动态", "企业", "品牌", "发布会", "融资", "并购", "开工"] },
  { label: "技术发展", words: ["技术发展", "技术", "工艺", "自动化", "智能制造", "数控", "设备"] },
  { label: "行业活动", words: ["行业活动", "峰会", "论坛", "展会", "大会", "活动", "沙龙"] },
  { label: "材料标准", words: ["材料标准", "板材", "木皮", "五金", "材料", "环保等级", "甲醛"] },
  { label: "工艺标准", words: ["工艺标准", "工艺", "加工", "封边", "涂装", "拼接", "精度"] },
  { label: "服务标准", words: ["服务标准", "服务", "交付", "安装", "售后", "验收"] },
  { label: "标准共建", words: ["标准共建", "共建", "征求意见", "标准化", "团体标准"] },
  { label: "品牌建设", words: ["品牌建设", "品牌定位", "品牌升级", "品牌形象", "品牌战略"] },
  { label: "设计风格", words: ["设计", "风格", "空间", "审美", "现代", "新中式", "轻奢"] },
  { label: "奖项评选", words: ["评选", "榜单", "奖项", "评审", "入围", "公示"] },
];

const CATEGORY_HINTS: Array<{ hit: string; tags: string[] }> = [
  { hit: "/news", tags: ["行业趋势", "企业动态"] },
  { hit: "/brands", tags: ["品牌建设"] },
  { hit: "/dictionary", tags: ["行业术语"] },
  { hit: "/standards", tags: ["材料标准", "工艺标准", "服务标准"] },
  { hit: "/awards", tags: ["奖项评选"] },
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

export function suggestTagsFromText(text: string, max = 8): string[] {
  const source = normalize(text);
  if (!source) return [];

  const scoreMap = new Map<string, number>();

  for (const rule of TAG_RULES) {
    let score = rule.base ?? 0;
    for (const w of rule.words) {
      const hit = countOccurrences(source, normalize(w));
      if (hit > 0) score += hit * (w.length >= 4 ? 3 : 2);
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
    .sort((a, b) => b[1] - a[1])
    .map((x) => x[0]);

  return uniq(ranked).slice(0, max);
}

export function parseTagInput(input?: string | null): string[] {
  if (!input) return [];
  return uniq(input.split(/[，,\n\r\t ]+/g));
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

  return suggestTagsFromText(
    [params.title, params.excerpt, params.content, params.categoryHref, params.subHref]
      .filter(Boolean)
      .join(" ")
  );
}
