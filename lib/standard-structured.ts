export type StandardStructuredSection = {
  id: string;
  title: string;
  body: string;
};

export type StandardStructuredData = {
  standardCode: string;
  standardName: string;
  publishOrg: string;
  effectiveDate: string;
  scope: string;
  normativeReferences: string;
  termsAndDefinitions: string;
  inspectionMethod: string;
  acceptanceRule: string;
  versionNote: string;
  sections: StandardStructuredSection[];
};

export const DEFAULT_STANDARD_SECTION_TEMPLATES: Array<{ title: string; body: string }> = [
  {
    title: "技术要求",
    body: "按材料、结构、尺寸偏差、工艺稳定性等维度逐条列出要求。",
  },
  {
    title: "试验方法",
    body: "明确检测项目、抽样规则、检测流程与判定边界。",
  },
  {
    title: "检验规则",
    body: "规定出厂检验、型式检验、复检流程和不合格处理。",
  },
  {
    title: "标识、包装、运输与贮存",
    body: "规定标识要素、包装方式、运输条件与存储环境要求。",
  },
];

function safeText(input: unknown): string {
  return typeof input === "string" ? input.trim() : "";
}

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function toParagraphHtml(input: string) {
  return escapeHtml(input).replace(/\n/g, "<br />");
}

export function createDefaultStandardStructuredData(): StandardStructuredData {
  return {
    standardCode: "",
    standardName: "",
    publishOrg: "",
    effectiveDate: "",
    scope: "",
    normativeReferences: "",
    termsAndDefinitions: "",
    inspectionMethod: "",
    acceptanceRule: "",
    versionNote: "",
    sections: DEFAULT_STANDARD_SECTION_TEMPLATES.map((tpl, idx) => ({
      id: `std-sec-${idx + 1}`,
      title: tpl.title,
      body: tpl.body,
    })),
  };
}

function normalizeSections(input: unknown): StandardStructuredSection[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, idx) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const title = safeText(row.title);
      const body = safeText(row.body);
      if (!title && !body) return null;
      return {
        id: safeText(row.id) || `std-sec-${idx + 1}`,
        title,
        body,
      } satisfies StandardStructuredSection;
    })
    .filter((x): x is StandardStructuredSection => x !== null);
}

export function normalizeStandardStructuredData(input: unknown): StandardStructuredData {
  const row = (input ?? {}) as Record<string, unknown>;
  const normalized: StandardStructuredData = {
    standardCode: safeText(row.standardCode),
    standardName: safeText(row.standardName),
    publishOrg: safeText(row.publishOrg),
    effectiveDate: safeText(row.effectiveDate),
    scope: safeText(row.scope),
    normativeReferences: safeText(row.normativeReferences),
    termsAndDefinitions: safeText(row.termsAndDefinitions),
    inspectionMethod: safeText(row.inspectionMethod),
    acceptanceRule: safeText(row.acceptanceRule),
    versionNote: safeText(row.versionNote),
    sections: normalizeSections(row.sections),
  };
  if (normalized.sections.length === 0) {
    normalized.sections = createDefaultStandardStructuredData().sections;
  }
  return normalized;
}

export function buildStandardStructuredHtml(input: StandardStructuredData): string {
  const data = normalizeStandardStructuredData(input);
  const payload = encodeURIComponent(JSON.stringify(data));

  const summaryRows = [
    { label: "标准编号", value: data.standardCode },
    { label: "标准名称", value: data.standardName },
    { label: "发布机构", value: data.publishOrg },
    { label: "实施日期", value: data.effectiveDate },
    { label: "版本说明", value: data.versionNote },
  ].filter((x) => x.value);

  const summaryHtml =
    summaryRows.length > 0
      ? `<ul>${summaryRows
          .map((x) => `<li><strong>${escapeHtml(x.label)}：</strong>${escapeHtml(x.value)}</li>`)
          .join("")}</ul>`
      : `<p>标准基础信息以正文内容为准。</p>`;

  const fixedSections = [
    { title: "适用范围", body: data.scope },
    { title: "规范性引用文件", body: data.normativeReferences },
    { title: "术语与定义", body: data.termsAndDefinitions },
    { title: "检测方法", body: data.inspectionMethod },
    { title: "验收规则", body: data.acceptanceRule },
  ]
    .filter((x) => x.body)
    .map(
      (x) =>
        `<section data-standard-fixed="1"><h3>${escapeHtml(x.title)}</h3><p>${toParagraphHtml(x.body)}</p></section>`
    )
    .join("");

  const customSections = data.sections
    .map((s) => {
      const title = escapeHtml(s.title || "未命名条款");
      const body = toParagraphHtml(s.body || "内容整理中");
      return `<section data-standard-custom="1"><h3>${title}</h3><p>${body}</p></section>`;
    })
    .join("");

  return [
    `<article data-standard-structured="1" data-standard-payload="${payload}">`,
    `<section data-standard-summary="1">${summaryHtml}</section>`,
    fixedSections,
    customSections,
    `</article>`,
  ]
    .filter(Boolean)
    .join("");
}

export function parseStandardStructuredHtml(html: string): StandardStructuredData | null {
  if (!html) return null;
  const hit = html.match(/data-standard-payload="([^"]+)"/i);
  if (!hit?.[1]) return null;
  try {
    const decoded = decodeURIComponent(hit[1]);
    const parsed = JSON.parse(decoded);
    return normalizeStandardStructuredData(parsed);
  } catch {
    return null;
  }
}

export function standardStructuredToSearchText(input: StandardStructuredData): string {
  const data = normalizeStandardStructuredData(input);
  return [
    data.standardCode,
    data.standardName,
    data.publishOrg,
    data.effectiveDate,
    data.scope,
    data.normativeReferences,
    data.termsAndDefinitions,
    data.inspectionMethod,
    data.acceptanceRule,
    data.versionNote,
    ...data.sections.flatMap((s) => [s.title, s.body]),
  ]
    .filter(Boolean)
    .join(" ");
}
