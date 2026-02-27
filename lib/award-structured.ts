export type AwardStep = { id: string; title: string; body: string };

export type AwardStructuredData = {
  organizer: string;
  year: string;
  candidateScope: string;
  applyWindow: string;
  criteria: string;
  reviewMechanism: string;
  publishRule: string;
  steps: AwardStep[];
};

function safeText(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

export function createDefaultAwardStructuredData(): AwardStructuredData {
  return {
    organizer: "",
    year: "",
    candidateScope: "",
    applyWindow: "",
    criteria: "",
    reviewMechanism: "",
    publishRule: "",
    steps: [
      { id: "p1", title: "申报征集", body: "" },
      { id: "p2", title: "资格初审", body: "" },
      { id: "p3", title: "专家评审", body: "" },
      { id: "p4", title: "结果公示", body: "" },
    ],
  };
}

export function normalizeAwardStructuredData(input: unknown): AwardStructuredData {
  const row = (input ?? {}) as Record<string, unknown>;
  const data = createDefaultAwardStructuredData();
  data.organizer = safeText(row.organizer);
  data.year = safeText(row.year);
  data.candidateScope = safeText(row.candidateScope);
  data.applyWindow = safeText(row.applyWindow);
  data.criteria = safeText(row.criteria);
  data.reviewMechanism = safeText(row.reviewMechanism);
  data.publishRule = safeText(row.publishRule);
  if (Array.isArray(row.steps)) {
    data.steps = row.steps
      .map((x, idx) => {
        const r = (x ?? {}) as Record<string, unknown>;
        const title = safeText(r.title);
        const body = safeText(r.body);
        if (!title && !body) return null;
        return { id: safeText(r.id) || `p-${idx + 1}`, title, body };
      })
      .filter((x): x is AwardStep => !!x);
  }
  return data;
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildAwardStructuredHtml(input: AwardStructuredData): string {
  const data = normalizeAwardStructuredData(input);
  const payload = encodeURIComponent(JSON.stringify(data));
  const base = [
    ["主办单位", data.organizer],
    ["评选年度", data.year],
    ["参评对象", data.candidateScope],
    ["申报时间", data.applyWindow],
    ["评审机制", data.reviewMechanism],
    ["结果发布", data.publishRule],
  ]
    .filter((x) => x[1])
    .map((x) => `<li><strong>${esc(x[0])}：</strong>${esc(x[1])}</li>`)
    .join("");
  const criteria = data.criteria ? `<section><h3>评选标准</h3><p>${esc(data.criteria).replace(/\n/g, "<br />")}</p></section>` : "";
  const steps = data.steps
    .map((s, idx) => `<section><h3>${idx + 1}. ${esc(s.title || "流程")}</h3><p>${esc(s.body || "").replace(/\n/g, "<br />")}</p></section>`)
    .join("");
  return `<article data-award-structured="1" data-award-payload="${payload}"><section><ul>${base}</ul></section>${criteria}${steps}</article>`;
}

export function parseAwardStructuredHtml(html: string): AwardStructuredData | null {
  const m = (html || "").match(/data-award-payload="([^"]+)"/i);
  if (!m?.[1]) return null;
  try {
    return normalizeAwardStructuredData(JSON.parse(decodeURIComponent(m[1])));
  } catch {
    return null;
  }
}

export function awardStructuredToSearchText(input: AwardStructuredData): string {
  const data = normalizeAwardStructuredData(input);
  return [
    data.organizer,
    data.year,
    data.candidateScope,
    data.applyWindow,
    data.criteria,
    data.reviewMechanism,
    data.publishRule,
    ...data.steps.flatMap((x) => [x.title, x.body]),
  ]
    .filter(Boolean)
    .join(" ");
}
