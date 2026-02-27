export type BrandStructuredModule = {
  id: string;
  title: string;
  body: string;
};

export type BrandStructuredData = {
  logoUrl: string;
  slogan: string;
  foundedYear: string;
  headquarters: string;
  website: string;
  contactPhone: string;
  serviceAreas: string;
  mainProducts: string;
  modules: BrandStructuredModule[];
};

export const DEFAULT_BRAND_MODULE_TEMPLATES: Array<{ title: string; body: string }> = [
  {
    title: "品牌定位",
    body: "说明品牌主打方向、核心人群和价格带定位。",
  },
  {
    title: "材料与工艺",
    body: "说明主要材种、工艺特点、环保标准和稳定性优势。",
  },
  {
    title: "产品体系",
    body: "说明门墙柜、木作配套、风格系列等产品矩阵。",
  },
  {
    title: "服务与交付",
    body: "说明设计、生产、安装、售后及交付周期能力。",
  },
  {
    title: "资质与荣誉",
    body: "说明认证资质、行业奖项、标杆案例等背书信息。",
  },
];

function safeText(input: unknown) {
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

export function createDefaultBrandStructuredData(): BrandStructuredData {
  return {
    logoUrl: "",
    slogan: "",
    foundedYear: "",
    headquarters: "",
    website: "",
    contactPhone: "",
    serviceAreas: "",
    mainProducts: "",
    modules: DEFAULT_BRAND_MODULE_TEMPLATES.map((tpl, idx) => ({
      id: `brand-module-${idx + 1}`,
      title: tpl.title,
      body: tpl.body,
    })),
  };
}

function normalizeModules(input: unknown): BrandStructuredModule[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((item, idx) => {
      const row = (item ?? {}) as Record<string, unknown>;
      const title = safeText(row.title);
      const body = safeText(row.body);
      if (!title && !body) return null;
      return {
        id: safeText(row.id) || `brand-module-${idx + 1}`,
        title,
        body,
      } satisfies BrandStructuredModule;
    })
    .filter((x): x is BrandStructuredModule => x !== null);
}

export function normalizeBrandStructuredData(input: unknown): BrandStructuredData {
  const row = (input ?? {}) as Record<string, unknown>;
  const normalized: BrandStructuredData = {
    logoUrl: safeText(row.logoUrl),
    slogan: safeText(row.slogan),
    foundedYear: safeText(row.foundedYear),
    headquarters: safeText(row.headquarters),
    website: safeText(row.website),
    contactPhone: safeText(row.contactPhone),
    serviceAreas: safeText(row.serviceAreas),
    mainProducts: safeText(row.mainProducts),
    modules: normalizeModules(row.modules),
  };
  if (normalized.modules.length === 0) {
    normalized.modules = createDefaultBrandStructuredData().modules;
  }
  return normalized;
}

export function buildBrandStructuredHtml(input: BrandStructuredData): string {
  const data = normalizeBrandStructuredData(input);
  const payload = encodeURIComponent(JSON.stringify(data));
  const hasLogo = !!data.logoUrl;
  const infoRows: Array<{ label: string; value: string }> = [
    { label: "成立时间", value: data.foundedYear },
    { label: "总部地区", value: data.headquarters },
    { label: "服务区域", value: data.serviceAreas },
    { label: "主营品类", value: data.mainProducts },
    { label: "官网地址", value: data.website },
    { label: "联系热线", value: data.contactPhone },
  ].filter((x) => x.value);

  const infoHtml =
    infoRows.length > 0
      ? `<ul>${infoRows
          .map(
            (x) =>
              `<li><strong>${escapeHtml(x.label)}：</strong>${escapeHtml(x.value)}</li>`
          )
          .join("")}</ul>`
      : `<p>基础信息待补充。</p>`;

  const moduleHtml = data.modules
    .map((m) => {
      const title = escapeHtml(m.title || "未命名模块");
      const body = toParagraphHtml(m.body || "暂无说明");
      return `<section data-brand-module="1"><h3>${title}</h3><p>${body}</p></section>`;
    })
    .join("");

  const logoHtml = hasLogo
    ? `<div><img src="${escapeHtml(data.logoUrl)}" alt="品牌Logo" style="max-width:180px;height:auto;border-radius:12px;" /></div>`
    : "";

  const sloganHtml = data.slogan
    ? `<p><strong>品牌主张：</strong>${escapeHtml(data.slogan)}</p>`
    : "";

  return [
    `<article data-brand-structured="1" data-brand-payload="${payload}">`,
    `<section data-brand-summary="1">`,
    logoHtml,
    sloganHtml,
    infoHtml,
    `</section>`,
    moduleHtml,
    `</article>`,
  ]
    .filter(Boolean)
    .join("");
}

export function parseBrandStructuredHtml(html: string): BrandStructuredData | null {
  if (!html) return null;
  const hit = html.match(/data-brand-payload="([^"]+)"/i);
  if (!hit?.[1]) return null;
  try {
    const raw = decodeURIComponent(hit[1]);
    const parsed = JSON.parse(raw);
    return normalizeBrandStructuredData(parsed);
  } catch {
    return null;
  }
}

export function brandStructuredToSearchText(input: BrandStructuredData): string {
  const data = normalizeBrandStructuredData(input);
  return [
    data.slogan,
    data.foundedYear,
    data.headquarters,
    data.website,
    data.contactPhone,
    data.serviceAreas,
    data.mainProducts,
    ...data.modules.flatMap((m) => [m.title, m.body]),
  ]
    .filter(Boolean)
    .join(" ");
}
