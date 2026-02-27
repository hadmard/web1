export type DataMetric = { id: string; name: string; value: string };
export type DataSection = { id: string; title: string; body: string };

export type DataStructuredData = {
  reportPeriod: string;
  sourceOrg: string;
  sampleRange: string;
  methodology: string;
  updateCycle: string;
  metrics: DataMetric[];
  sections: DataSection[];
};

function safeText(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

export function createDefaultDataStructuredData(): DataStructuredData {
  return {
    reportPeriod: "",
    sourceOrg: "",
    sampleRange: "",
    methodology: "",
    updateCycle: "",
    metrics: [
      { id: "m1", name: "样本企业数", value: "" },
      { id: "m2", name: "地区覆盖数", value: "" },
      { id: "m3", name: "同比变化", value: "" },
    ],
    sections: [
      { id: "s1", title: "核心发现", body: "" },
      { id: "s2", title: "趋势解读", body: "" },
    ],
  };
}

export function normalizeDataStructuredData(input: unknown): DataStructuredData {
  const row = (input ?? {}) as Record<string, unknown>;
  const data = createDefaultDataStructuredData();
  data.reportPeriod = safeText(row.reportPeriod);
  data.sourceOrg = safeText(row.sourceOrg);
  data.sampleRange = safeText(row.sampleRange);
  data.methodology = safeText(row.methodology);
  data.updateCycle = safeText(row.updateCycle);
  if (Array.isArray(row.metrics)) {
    data.metrics = row.metrics
      .map((x, idx) => {
        const r = (x ?? {}) as Record<string, unknown>;
        const name = safeText(r.name);
        const value = safeText(r.value);
        if (!name && !value) return null;
        return { id: safeText(r.id) || `m-${idx + 1}`, name, value };
      })
      .filter((x): x is DataMetric => !!x);
  }
  if (Array.isArray(row.sections)) {
    data.sections = row.sections
      .map((x, idx) => {
        const r = (x ?? {}) as Record<string, unknown>;
        const title = safeText(r.title);
        const body = safeText(r.body);
        if (!title && !body) return null;
        return { id: safeText(r.id) || `s-${idx + 1}`, title, body };
      })
      .filter((x): x is DataSection => !!x);
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

export function buildDataStructuredHtml(input: DataStructuredData): string {
  const data = normalizeDataStructuredData(input);
  const payload = encodeURIComponent(JSON.stringify(data));
  const meta = [
    ["统计周期", data.reportPeriod],
    ["数据来源", data.sourceOrg],
    ["样本范围", data.sampleRange],
    ["统计口径", data.methodology],
    ["更新频率", data.updateCycle],
  ]
    .filter((x) => x[1])
    .map((x) => `<li><strong>${esc(x[0])}：</strong>${esc(x[1])}</li>`)
    .join("");
  const metrics = data.metrics
    .map((m) => `<li><strong>${esc(m.name || "指标")}：</strong>${esc(m.value || "-")}</li>`)
    .join("");
  const sections = data.sections
    .map((s) => `<section><h3>${esc(s.title || "未命名模块")}</h3><p>${esc(s.body || "").replace(/\n/g, "<br />")}</p></section>`)
    .join("");
  return `<article data-data-structured="1" data-data-payload="${payload}"><section><ul>${meta}</ul></section><section><h3>关键指标</h3><ul>${metrics}</ul></section>${sections}</article>`;
}

export function parseDataStructuredHtml(html: string): DataStructuredData | null {
  const m = (html || "").match(/data-data-payload="([^"]+)"/i);
  if (!m?.[1]) return null;
  try {
    return normalizeDataStructuredData(JSON.parse(decodeURIComponent(m[1])));
  } catch {
    return null;
  }
}

export function dataStructuredToSearchText(input: DataStructuredData): string {
  const data = normalizeDataStructuredData(input);
  return [
    data.reportPeriod,
    data.sourceOrg,
    data.sampleRange,
    data.methodology,
    data.updateCycle,
    ...data.metrics.flatMap((x) => [x.name, x.value]),
    ...data.sections.flatMap((x) => [x.title, x.body]),
  ]
    .filter(Boolean)
    .join(" ");
}
