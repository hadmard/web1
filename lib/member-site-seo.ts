import { htmlToPlainText, toSummaryText } from "@/lib/brand-content";

export type MemberSiteSeoSource = {
  companyName?: string | null;
  companyShortName?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  homepageTagline?: string | null;
  intro?: string | null;
  positioning?: string | null;
  productSystem?: string | null;
  city?: string | null;
  region?: string | null;
  area?: string | null;
  contactIntro?: string | null;
};

export type MemberSiteSeoFields = {
  title: string;
  description: string;
};

const FORBIDDEN_SEO_TOKENS = ["Enterprise Showcase", "Zhonghua Zhengmu"];
const HTML_ENTITY_PATTERN = /&(nbsp|amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/i;
const SITE_TITLE_SUFFIX_PATTERN = /(?:\s*[｜|]\s*整木网)+$/i;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeBrandName(value: string) {
  return normalizeWhitespace(value.replace(/woca/gi, "WOCA"));
}

function isPlaceholder(value: string) {
  if (!value) return true;
  return /^[-|/\\·,.，。]+$/.test(value) || value === "暂无" || value === "null" || value === "undefined";
}

function dedupeSegments(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const items: string[] = [];

  for (const value of values) {
    const normalized = normalizeWhitespace(value ?? "");
    if (!normalized || isPlaceholder(normalized)) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    items.push(normalized);
  }

  return items;
}

function clampText(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function stripMemberSiteSeoTitleSuffix(value: string) {
  return normalizeWhitespace(value.replace(SITE_TITLE_SUFFIX_PATTERN, ""));
}

export function cleanSeoText(input: unknown, maxLength = 160) {
  if (typeof input !== "string") return "";
  const normalized = normalizeWhitespace(htmlToPlainText(input)).replace(/[|]+/g, "｜");
  if (!normalized || isPlaceholder(normalized)) return "";
  return clampText(normalizeBrandName(normalized), maxLength);
}

function cleanSeoTitle(input: unknown, maxLength = 60) {
  return clampText(stripMemberSiteSeoTitleSuffix(cleanSeoText(input, maxLength)), maxLength);
}

function containsHtmlLikeContent(input: unknown) {
  if (typeof input !== "string") return false;
  return /<[^>]+>/.test(input) || HTML_ENTITY_PATTERN.test(input);
}

export function containsHistoricalSeoNoise(input: unknown) {
  if (typeof input !== "string") return false;
  if (containsHtmlLikeContent(input)) return true;
  return FORBIDDEN_SEO_TOKENS.some((token) => input.toLowerCase().includes(token.toLowerCase()));
}

function resolveCompanyName(source: MemberSiteSeoSource) {
  const name = cleanSeoText(source.companyShortName || source.companyName || source.heroTitle || "", 24);
  return name || "会员企业主页";
}

function resolveLocation(source: MemberSiteSeoSource) {
  return (
    dedupeSegments([
      cleanSeoText(source.city, 12),
      cleanSeoText(source.area, 12),
      cleanSeoText(source.region, 12),
    ]).join(" ") || ""
  );
}

function resolveFocus(source: MemberSiteSeoSource) {
  return (
    dedupeSegments([
      cleanSeoText(source.positioning, 16),
      cleanSeoText(source.homepageTagline, 16),
      cleanSeoText(source.productSystem, 16),
      cleanSeoText(source.heroSubtitle, 16),
    ])[0] || ""
  );
}

function resolveSummary(source: MemberSiteSeoSource) {
  return cleanSeoText(
    toSummaryText(source.intro || source.positioning || source.productSystem || source.contactIntro || "", 72),
    72,
  );
}

function resolveContactHint(source: MemberSiteSeoSource) {
  return cleanSeoText(source.contactIntro, 32);
}

function isWocaEnterprise(source: MemberSiteSeoSource) {
  const combined = [
    source.companyShortName,
    source.companyName,
    source.heroTitle,
    source.intro,
    source.positioning,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return combined.includes("woca");
}

export function generateMemberSiteSeo(source: MemberSiteSeoSource): MemberSiteSeoFields {
  if (isWocaEnterprise(source)) {
    return {
      title: "丹麦 WOCA 中国区代理｜木作清洁保养",
      description:
        "丹麦 WOCA 木作护理品牌中国区代理，面向整木定制、木地板、护墙板、木门、柜体等木制品场景，提供清洁、保养与护理产品及整木后市场服务方案。",
    };
  }

  const companyName = resolveCompanyName(source);
  const focus = resolveFocus(source);
  const location = resolveLocation(source);
  const summary = resolveSummary(source);
  const contactHint = resolveContactHint(source);

  const title = focus
    ? `${companyName}｜${focus}`
    : companyName === "会员企业主页"
      ? "会员企业主页"
      : `${companyName}｜企业主页`;

  const description = clampText(
    dedupeSegments([
      companyName === "会员企业主页"
        ? "该会员已开通整木网企业主页"
        : location
          ? `${companyName}位于${location}`
          : `${companyName}已开通整木网企业主页`,
      focus ? `主营方向包括${focus}` : "支持企业资料、展示内容与联系信息统一呈现",
      summary,
      contactHint,
    ]).join("，") || "企业主页资料整理中，可查看企业介绍、展示内容与联系信息。",
    160,
  );

  return {
    title: clampText(title, 60),
    description,
  };
}

export function normalizeMemberSiteSeo(
  currentSeo: Partial<MemberSiteSeoFields> | null | undefined,
  source: MemberSiteSeoSource,
): MemberSiteSeoFields {
  const generated = generateMemberSiteSeo(source);
  const rawTitle = typeof currentSeo?.title === "string" ? currentSeo.title : "";
  const rawDescription = typeof currentSeo?.description === "string" ? currentSeo.description : "";
  const cleanTitle = cleanSeoTitle(rawTitle, 60);
  const cleanDescription = cleanSeoText(rawDescription, 160);

  return {
    title: !cleanTitle || containsHistoricalSeoNoise(rawTitle) ? generated.title : cleanTitle,
    description:
      !cleanDescription || containsHistoricalSeoNoise(rawDescription)
        ? generated.description
        : clampText(cleanDescription, 160),
  };
}
